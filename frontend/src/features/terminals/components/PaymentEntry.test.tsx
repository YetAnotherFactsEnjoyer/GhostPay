import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PaymentEntry } from "./PaymentEntry";
afterEach(cleanup);
it("prevents invalid and disabled-terminal submissions and supports keyboard buttons", () => {
  const onRecord = vi.fn();
  const props = {
    amount: "100",
    reference: "order",
    recording: false,
    onReference: vi.fn(),
    onKeypad: vi.fn(),
    onRecord,
  };
  const { rerender } = render(<PaymentEntry {...props} reference=" " />);
  expect(screen.getByRole("button", { name: /Record payment/ })).toBeDisabled();
  rerender(<PaymentEntry {...props} disabled />);
  expect(screen.getByRole("button", { name: /Record payment/ })).toBeDisabled();
  rerender(<PaymentEntry {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /Record payment/ }));
  expect(onRecord).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Purchase reference")).toHaveAttribute(
    "maxlength",
    "100",
  );
});
