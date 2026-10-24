import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyMerchantId({
  id,
  full = false,
}: {
  id: string;
  full?: boolean;
}) {
  const [message, setMessage] = useState("");
  return (
    <span className="merchant-id">
      <span title={id}>
        {full ? id : `${id.slice(0, 18)}${id.length > 18 ? "…" : ""}`}
      </span>
      <button
        type="button"
        aria-label={`Copy merchant ID ${id}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(id);
            setMessage("Copied");
          } catch {
            setMessage("Unable to copy. Select the ID to copy manually.");
          }
        }}
      >
        {message === "Copied" ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <span className="copy-feedback" role="status">
        {message}
      </span>
    </span>
  );
}
