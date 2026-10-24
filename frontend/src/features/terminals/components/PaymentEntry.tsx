import { ArrowRight } from "lucide-react";
import { Button } from "../../../shared/components/ui/Button";
import { InputField } from "../../../shared/components/ui/InputField";
import { TerminalKeypad } from "./TerminalKeypad";

export function PaymentEntry({
  amount,
  reference,
  recording,
  disabled = false,
  onReference,
  onKeypad,
  onRecord,
}: {
  amount: string;
  reference: string;
  recording: boolean;
  disabled?: boolean;
  onReference: (reference: string) => void;
  onKeypad: (digit: string) => void;
  onRecord: () => void;
}) {
  return (
    <section>
      <div className="amount-display">
        <span className="muted">Amount · MYR</span>
        <strong className="terminal-amount">
          RM {amount ? (Number(amount) / 100).toFixed(2) : "0.00"}
        </strong>
      </div>
      <TerminalKeypad onInput={onKeypad} />
      <InputField
        label="Purchase reference"
        maxLength={100}
        value={reference}
        onChange={(event) => onReference(event.target.value)}
        placeholder="e.g. ORDER-1042"
      />
      <Button
        disabled={
          !amount ||
          Number(amount) <= 0 ||
          !reference.trim() ||
          recording ||
          disabled
        }
        onClick={onRecord}
      >
        {recording ? "Saving…" : "Record payment"} <ArrowRight size={17} />
      </Button>
    </section>
  );
}
