import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { execFileSync } from "node:child_process";

const password = "release-audit-password";
async function account(api: APIRequestContext) {
  const email = `audit-${crypto.randomUUID()}@example.com`;
  expect(
    (
      await api.post("/api/v1/auth/register", { data: { email, password } })
    ).status(),
  ).toBe(201);
  const login = await api.post("/api/v1/auth/login", {
    data: { email, password },
  });
  expect(login.status()).toBe(200);
  const { accessToken: token } = await login.json();
  return { email, token, headers: { Authorization: `Bearer ${token}` } };
}
async function fixture(api: APIRequestContext) {
  const user = await account(api);
  const merchantResponse = await api.post("/api/v1/merchants", {
    headers: user.headers,
    data: { name: "Audit merchant" },
  });
  expect(merchantResponse.status()).toBe(201);
  const merchant = await merchantResponse.json();
  const terminalResponse = await api.post("/api/v1/terminals", {
    headers: user.headers,
    data: { name: "Audit counter", merchantId: merchant.id },
  });
  expect(terminalResponse.status()).toBe(201);
  return { ...user, merchant, terminal: await terminalResponse.json() };
}
async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
}
async function record(page: Page, reference: string) {
  await page.getByLabel("Purchase reference").fill(reference);
  for (const digit of ["1", "2", "0"])
    await page.getByRole("button", { name: digit, exact: true }).click();
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Payment recorded locally",
  );
  await expect(page.getByLabel("Purchase reference")).toHaveValue("");
}
async function localRows(page: Page, store: "payments" | "batches") {
  return page.evaluate(async (storeName) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open("ghostpay");
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    try {
      return await new Promise<Array<Record<string, unknown>>>(
        (resolve, reject) => {
          const reading = database
            .transaction(storeName)
            .objectStore(storeName)
            .getAll();
          reading.onsuccess = () => resolve(reading.result);
          reading.onerror = () => reject(reading.error);
        },
      );
    } finally {
      database.close();
    }
  }, store);
}

test("register, validate, create merchant and terminal, navigate all pages, logout", async ({
  page,
}) => {
  const email = `ui-${crypto.randomUUID()}@example.com`;
  await page.goto("/register");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/register$/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/login$/);
  await signIn(page, email);
  await page.goto("/app/merchants");
  await expect(
    page.getByText("No merchants yet.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add merchant", exact: true }).click();
  await page.getByLabel("Merchant name").fill("Browser merchant");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add merchant" })
    .click();
  await expect(
    page.getByRole("button", { name: "Inspect Browser merchant" }),
  ).toBeVisible();
  await page
    .getByRole("complementary", { name: "Selected merchant" })
    .getByRole("link", { name: "View terminals", exact: true })
    .click();
  await page.getByRole("button", { name: "New terminal", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Terminal name" })
    .fill("Browser counter");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Browser counter" }),
  ).toBeVisible();
  for (const [path, heading] of [
    ["/app", "Overview"],
    ["/app/payments", "Payments"],
    ["/app/sync", "Synchronization"],
    ["/app/settings", "Settings"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }).first(),
    ).toBeVisible();
  }
  await page.reload();
  await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
  await page
    .getByRole("button", { name: "Log out", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/login$/);
  await page.goto("/app");
  await expect(page).toHaveURL(/login$/);
});

test("offline queue survives refresh, sync accepts, identical batch replays without duplicates", async ({
  page,
  request,
}) => {
  const f = await fixture(request);
  await signIn(page, f.email);
  await page.goto(`/terminal/${f.terminal.id}`);
  await expect(
    page.getByRole("heading", { name: "Audit counter", exact: true }),
  ).toBeVisible();
  // Keep frontend available for reload; disconnect only the API transport.
  // The audit runner can additionally stop its isolated backend container.
  const container = process.env.E2E_BACKEND_CONTAINER;
  if (container && !/^ghostpay-release-audit-backend-1$/.test(container))
    throw new Error("Only the isolated audit backend may be stopped");
  if (container) execFileSync("docker", ["stop", container]);
  await page.route("**/api/v1/**", (route) => route.abort("connectionrefused"));
  try {
    await record(page, "offline-first");
    await record(page, "offline-second");
    expect(await localRows(page, "payments")).toHaveLength(2);
    await page.reload();
    await expect(
      page.getByText("2 pending payments", { exact: true }),
    ).toBeVisible();
    expect((await localRows(page, "payments")).map((p) => p.state)).toEqual([
      "PENDING",
      "PENDING",
    ]);
    await page.getByRole("button", { name: "Sync now", exact: true }).click();
    await expect
      .poll(async () => (await localRows(page, "batches")).length)
      .toBe(1);
    await expect(
      page.getByRole("button", { name: "Sync now", exact: true }),
    ).toBeEnabled();
  } finally {
    if (container) execFileSync("docker", ["start", container]);
  }
  await page.unroute("**/api/v1/**");
  await expect
    .poll(
      async () =>
        (
          await request.get("/api/v1/account/me", { headers: f.headers })
        ).status(),
      { timeout: 60000 },
    )
    .toBe(200);
  const batch = (await localRows(page, "batches"))[0];
  const originalPayments = await localRows(page, "payments");
  const responsePromise = page.waitForResponse(
    (r) => r.url().endsWith("/sync") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sync now", exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const sent = response.request().postDataJSON();
  expect(sent.batchId).toBe(batch.batchId);
  expect(
    sent.payments.map((p: { localPaymentId: string }) => p.localPaymentId),
  ).toEqual(originalPayments.map((p) => p.localPaymentId));
  const originalResult = await response.json();
  expect(
    originalResult.results.map((r: { status: string }) => r.status),
  ).toEqual(["ACCEPTED", "ACCEPTED"]);
  await expect
    .poll(async () => (await localRows(page, "payments")).map((p) => p.state))
    .toEqual(["ACCEPTED", "ACCEPTED"]);
  const replay = await request.post(`/api/v1/terminals/${f.terminal.id}/sync`, {
    headers: f.headers,
    data: sent,
  });
  expect(replay.status()).toBe(200);
  expect(await replay.json()).toEqual(originalResult);
  const stored = await request.get(
    `/api/v1/payments?terminalId=${f.terminal.id}`,
    { headers: f.headers },
  );
  expect(await stored.json()).toHaveLength(2);
});

test("real HTTP duplicate, conflict, changed batch, validation and cross-account authorization", async ({
  request,
}) => {
  const f = await fixture(request);
  const other = await account(request);
  const path = `/api/v1/terminals/${f.terminal.id}/sync`;
  const payment = {
    localPaymentId: crypto.randomUUID(),
    purchaseReference: "http-audit",
    amountMinor: 100,
    currency: "MYR",
  };
  const data = { batchId: crypto.randomUUID(), payments: [payment] };
  const send = (body: unknown) =>
    request.post(path, { headers: f.headers, data: body });
  expect((await send(data)).status()).toBe(200);
  expect(
    (await (await send({ ...data, batchId: crypto.randomUUID() })).json())
      .results[0].status,
  ).toBe("DUPLICATE");
  expect(
    (
      await (
        await send({
          batchId: crypto.randomUUID(),
          payments: [{ ...payment, amountMinor: 200 }],
        })
      ).json()
    ).results[0].status,
  ).toBe("CONFLICT");
  expect(
    (
      await send({ ...data, payments: [{ ...payment, amountMinor: 200 }] })
    ).status(),
  ).toBe(409);
  expect(
    (
      await send({
        batchId: crypto.randomUUID(),
        payments: [{ ...payment, amountMinor: -1 }],
      })
    ).status(),
  ).toBe(400);
  expect((await request.post(path, { data })).status()).toBe(401);
  expect(
    (
      await request.get("/api/v1/payments?terminalId=not-a-uuid", {
        headers: f.headers,
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post(path, {
        headers: { ...f.headers, "Content-Type": "application/json" },
        data: "{",
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post(
        `${process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:8080"}${path}`,
        {
          headers: { ...f.headers, Origin: "https://untrusted.example" },
          data,
        },
      )
    ).status(),
  ).toBe(403);

  expect(
    (await request.post(path, { headers: other.headers, data })).status(),
  ).toBe(404);
  for (const path of [
    `/api/v1/terminals?merchantId=${f.merchant.id}`,
    `/api/v1/payments?terminalId=${f.terminal.id}`,
  ])
    expect((await request.get(path, { headers: other.headers })).status()).toBe(
      404,
    );
  expect(
    await (
      await request.get(`/api/v1/payments?terminalId=${f.terminal.id}`, {
        headers: f.headers,
      })
    ).json(),
  ).toHaveLength(1);
});

test("sync selected submits only the selected payment", async ({
  page,
  request,
}) => {
  const f = await fixture(request);
  await signIn(page, f.email);
  await page.goto(`/terminal/${f.terminal.id}`);
  await record(page, "selected-one");
  await record(page, "leave-pending");
  await page.goto("/app/sync");
  await page
    .getByRole("button", { name: "Select selected-one", exact: true })
    .click();
  const responsePromise = page.waitForResponse(
    (r) => r.url().endsWith("/sync") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Sync selected", exact: true })
    .click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(
    response
      .request()
      .postDataJSON()
      .payments.map((p: { purchaseReference: string }) => p.purchaseReference),
  ).toEqual(["selected-one"]);
  await expect
    .poll(async () => (await localRows(page, "payments")).map((p) => p.state))
    .toEqual(["ACCEPTED", "PENDING"]);
});

test("server error and browser interruption preserve batch identity and ordered retry", async ({
  page,
  request,
}) => {
  const f = await fixture(request);
  await signIn(page, f.email);
  await page.goto(`/terminal/${f.terminal.id}`);
  await record(page, "retry-first");
  await record(page, "retry-second");
  let original: unknown;
  await page.route("**/sync", async (route) => {
    original = route.request().postDataJSON();
    // Commit on the real server, then lose the response in transit.
    expect((await route.fetch()).status()).toBe(200);
    await route.abort("connectionreset");
  });
  await page.getByRole("button", { name: "Sync now", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("unreachable");
  expect(
    (await localRows(page, "payments")).every((p) => p.state === "SYNCING"),
  ).toBe(true);
  await page.reload();
  await page.unroute("**/sync");
  const responsePromise = page.waitForResponse((r) =>
    r.url().endsWith("/sync"),
  );
  await page.getByRole("button", { name: "Sync now", exact: true }).click();
  const retry = await responsePromise;
  expect(retry.request().postDataJSON()).toEqual(original);
  expect(
    (await retry.json()).results.map((r: { status: string }) => r.status),
  ).toEqual(["ACCEPTED", "ACCEPTED"]);
  await expect
    .poll(async () => (await localRows(page, "batches"))[0].state)
    .toBe("COMPLETE");
  expect(
    await (
      await request.get(`/api/v1/payments?terminalId=${f.terminal.id}`, {
        headers: f.headers,
      })
    ).json(),
  ).toHaveLength(2);
});

test("untrusted success response cannot silently complete a pending batch", async ({
  page,
  request,
}) => {
  const f = await fixture(request);
  await signIn(page, f.email);
  await page.goto(`/terminal/${f.terminal.id}`);
  await record(page, "retain-me");
  await page.route("**/sync", (route) =>
    route.fulfill({
      json: { batchId: route.request().postDataJSON().batchId, results: [] },
    }),
  );
  await page.getByRole("button", { name: "Sync now", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Queue retained");
  expect((await localRows(page, "payments"))[0].state).toBe("SYNCING");
  expect((await localRows(page, "batches"))[0].state).toBe("SYNCING");
});

test("logout and account switch isolate IndexedDB views and server caches", async ({
  page,
  request,
}) => {
  const first = await fixture(request);
  const second = await account(request);
  await signIn(page, first.email);
  await page.goto(`/terminal/${first.terminal.id}`);
  await record(page, "private-local-payment");
  await page.goto("/app/settings");
  await page
    .getByRole("button", { name: "Log out", exact: true })
    .last()
    .click();
  await signIn(page, second.email);
  await page.goto("/app/merchants");
  await expect(
    page.getByText("No merchants yet.", { exact: false }),
  ).toBeVisible();
  await page.goto("/app/sync");
  await expect(
    page.getByText("private-local-payment", { exact: true }),
  ).toHaveCount(0);
  expect(await localRows(page, "payments")).toHaveLength(1);
  await page.goto("/app/settings");
  await page
    .getByRole("button", { name: "Log out", exact: true })
    .last()
    .click();
  await signIn(page, first.email);
  await page.goto(`/terminal/${first.terminal.id}`);
  await expect(
    page.getByText("1 pending payments", { exact: true }),
  ).toBeVisible();
});

test("401 clears session, redirects to login, and retains offline payments", async ({
  page,
  request,
}) => {
  const f = await fixture(request);
  await signIn(page, f.email);
  await page.goto(`/terminal/${f.terminal.id}`);
  await record(page, "expired-session");
  await page.route("**/sync", (route) =>
    route.fulfill({
      status: 401,
      json: { code: "UNAUTHORIZED", message: "Authentication required" },
    }),
  );
  await page.getByRole("button", { name: "Sync now", exact: true }).click();
  await expect(page).toHaveURL(/login$/);
  expect(
    await page.evaluate(() => sessionStorage.getItem("ghostpay_token")),
  ).toBeNull();
  expect(await localRows(page, "payments")).toHaveLength(1);
});

test("two tabs synchronize a shared queue without duplicates", async ({
  page,
  context,
  request,
}) => {
  const f = await fixture(request);
  await signIn(page, f.email);
  await page.goto(`/terminal/${f.terminal.id}`);
  await record(page, "two-tabs");
  const second = await context.newPage();
  await signIn(second, f.email);
  await second.goto(`/terminal/${f.terminal.id}`);
  await expect(
    second.getByText("1 pending payments", { exact: true }),
  ).toBeVisible();
  await Promise.all(
    [page, second].map((p) =>
      p.getByRole("button", { name: "Sync now", exact: true }).click(),
    ),
  );
  await expect
    .poll(async () => (await localRows(page, "payments"))[0].state)
    .toBe("ACCEPTED");
  expect(await localRows(page, "batches")).toHaveLength(1);
  expect(
    await (
      await request.get(`/api/v1/payments?terminalId=${f.terminal.id}`, {
        headers: f.headers,
      })
    ).json(),
  ).toHaveLength(1);
});

test("mobile navigation and keyboard form access", async ({
  page,
  request,
}) => {
  const f = await fixture(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, f.email);
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Merchants" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Merchants", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add merchant", exact: true }).click();
  await expect(page.getByLabel("Merchant name")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("all application pages fit desktop, tablet, and mobile viewports", async ({
  page,
  request,
}) => {
  const f = await fixture(request);
  await signIn(page, f.email);
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [path, heading] of [
      ["/app", "Overview"],
      ["/app/merchants", "Merchants"],
      ["/app/terminals", "Terminals"],
      ["/app/payments", "Payments"],
      ["/app/sync", "Synchronization"],
      ["/app/settings", "Settings"],
      [`/terminal/${f.terminal.id}`, "Audit counter"],
    ]) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { name: heading, exact: true }).first(),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${path} at ${width}px`,
      ).toBe(true);
      if (
        width === 390 &&
        (heading === "Overview" || heading === "Audit counter")
      )
        await page.screenshot({
          path: test.info().outputPath(`mobile-${heading}.png`),
          fullPage: true,
        });
    }
  }
});

test("server 500 retains the queue and retries the same batch", async ({
  page,
  request,
}) => {
  const f = await fixture(request);
  await signIn(page, f.email);
  await page.goto(`/terminal/${f.terminal.id}`);
  await record(page, "server-failure");
  await page.route("**/sync", (route) =>
    route.fulfill({
      status: 500,
      json: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    }),
  );
  await page.getByRole("button", { name: "Sync now", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "An unexpected error occurred",
  );
  const batchId = (await localRows(page, "batches"))[0].batchId;
  expect((await localRows(page, "payments"))[0].state).toBe("SYNCING");
  await page.unroute("**/sync");
  const responsePromise = page.waitForResponse((r) =>
    r.url().endsWith("/sync"),
  );
  await page.getByRole("button", { name: "Sync now", exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON().batchId).toBe(batchId);
  await expect
    .poll(async () => (await localRows(page, "payments"))[0].state)
    .toBe("ACCEPTED");
});

test("refresh during an in-flight response preserves a committed batch for replay", async ({
  page,
  request,
}) => {
  const f = await fixture(request);
  await signIn(page, f.email);
  await page.goto(`/terminal/${f.terminal.id}`);
  await record(page, "interrupted-browser");
  let releaseResponse!: () => void;
  let markCommitted!: () => void;
  const release = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  const committed = new Promise<void>((resolve) => {
    markCommitted = resolve;
  });
  let sent: unknown;
  await page.route("**/sync", async (route) => {
    sent = route.request().postDataJSON();
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    markCommitted();
    await release;
    await route.fulfill({ response }).catch(() => {
      /* Old document disconnected. */
    });
  });
  try {
    await page.getByRole("button", { name: "Sync now", exact: true }).click();
    await committed;
    expect((await localRows(page, "batches"))[0].state).toBe("SYNCING");
    await page.reload();
  } finally {
    releaseResponse();
  }
  await page.unroute("**/sync");
  const replayPromise = page.waitForResponse((r) => r.url().endsWith("/sync"));
  await page.getByRole("button", { name: "Sync now", exact: true }).click();
  const replay = await replayPromise;
  expect(replay.request().postDataJSON()).toEqual(sent);
  expect((await replay.json()).results[0].status).toBe("ACCEPTED");
  await expect
    .poll(async () => (await localRows(page, "batches"))[0].state)
    .toBe("COMPLETE");
  expect(
    await (
      await request.get(`/api/v1/payments?terminalId=${f.terminal.id}`, {
        headers: f.headers,
      })
    ).json(),
  ).toHaveLength(1);
});

test("wrong credentials show an error and a later valid login succeeds", async ({
  page,
  request,
}) => {
  const f = await account(request);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(f.email);
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText("Invalid email or password", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("ghostpay_token")),
  ).toBeNull();
  await signIn(page, f.email);
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
});

test("merchant loading and API error states remain visible and recover on reload", async ({
  page,
  request,
}) => {
  const f = await fixture(request);
  await signIn(page, f.email);
  let releaseResponse!: () => void;
  const release = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route("**/api/v1/merchants", async (route) => {
    await release;
    await route.fulfill({
      status: 400,
      json: { code: "INVALID_REQUEST", message: "Audit API error" },
    });
  });
  try {
    await page.goto("/app/merchants");
    await expect(page.getByRole("status")).toContainText("Loading merchants");
  } finally {
    releaseResponse();
  }
  await expect(
    page.getByText("Audit API error", { exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/v1/merchants");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Inspect Audit merchant" }),
  ).toBeVisible();
});
