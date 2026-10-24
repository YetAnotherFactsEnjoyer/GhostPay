import { useState } from "react";
import { queuePayment } from "../../sync/service";

export function useTerminalPayments(terminalId: string | undefined) {
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error">(
    "success",
  );
  const record = async (reference: string, amount: string) => {
    const minor = Number(amount);
    if (
      !terminalId ||
      !reference.trim() ||
      !Number.isInteger(minor) ||
      minor <= 0
    ) {
      setMessageKind("error");
      setMessage("Enter a positive whole amount and a purchase reference.");
      return null;
    }
    if (recording) return null;
    setRecording(true);
    try {
      const payment = await queuePayment(terminalId, reference.trim(), minor);
      setMessageKind("success");
      setMessage("Payment recorded locally. It is ready to synchronize.");
      return payment;
    } catch (error) {
      setMessageKind("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Payment could not be saved on this device.",
      );
      return null;
    } finally {
      setRecording(false);
    }
  };
  return {
    recording,
    message,
    messageKind,
    setMessageKind,
    setMessage,
    record,
  };
}
