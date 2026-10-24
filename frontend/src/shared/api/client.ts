import type { ApiError } from "../types/api";

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
let token: string | null = sessionStorage.getItem("ghostpay_token");
const listeners = new Set<() => void>();
const notifyAuth = () => listeners.forEach((listener) => listener());
export const auth = {
  get: () => token,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  set: (value: string) => {
    token = value;
    sessionStorage.setItem("ghostpay_token", value);
    notifyAuth();
  },
  clear: () => {
    token = null;
    sessionStorage.removeItem("ghostpay_token");
    notifyAuth();
  },
};

export class HttpError extends Error {
  constructor(
    public status: number,
    public body?: ApiError,
  ) {
    super(body?.message ?? messageForStatus(status));
  }
}

function messageForStatus(status: number) {
  if (status === 400) return "Please check the submitted values.";
  if (status === 401) return "Your session or credentials are invalid.";
  if (status === 403) return "You are not allowed to perform this action.";
  if (status === 409) return "This request conflicts with existing data.";
  if (status >= 500) return "The backend encountered an error. Please retry.";
  return status > 0 ? `Request failed with HTTP ${status}.` : "Request failed.";
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const requestToken = token;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const isPublicAuthRequest =
    path === "/api/v1/auth/login" || path === "/api/v1/auth/register";
  if (token && !isPublicAuthRequest) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    headers.delete("Authorization");
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  } catch {
    throw new HttpError(0, {
      code: "NETWORK_ERROR",
      message: "Backend is unreachable. Your offline queue is safe.",
      timestamp: new Date().toISOString(),
    });
  }
  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    if (
      response.status === 401 &&
      !isPublicAuthRequest &&
      token === requestToken
    )
      auth.clear();
    throw new HttpError(response.status, body);
  }
  return body as T;
}
