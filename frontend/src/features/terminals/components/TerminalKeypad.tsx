export function TerminalKeypad({
  onInput,
}: {
  onInput: (digit: string) => void;
}) {
  return (
    <div className="keypad">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "←", "0", "C"].map(
        (digit) => (
          <button
            type="button"
            className={digit === "C" || digit === "←" ? "keypad-action" : ""}
            aria-label={
              digit === "←"
                ? "Delete last digit"
                : digit === "C"
                  ? "Clear amount"
                  : digit
            }
            key={digit}
            onClick={() => onInput(digit)}
          >
            {digit}
          </button>
        ),
      )}
    </div>
  );
}
