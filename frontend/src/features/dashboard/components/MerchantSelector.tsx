import { IdentityMark } from "../../../shared/components/ui/IdentityMark";
import type { Merchant } from "../../../shared/types/api";
import { Link } from "react-router-dom";

export function MerchantSelector({
  merchants,
  selected,
  onSelect,
}: {
  merchants?: Merchant[];
  selected?: Merchant;
  onSelect: (merchant: Merchant) => void;
}) {
  if (merchants?.length === 0)
    return (
      <Link className="text-link" to="/app/merchants">
        Create your first merchant
      </Link>
    );
  return (
    <label className="merchant-picker">
      {selected && <IdentityMark name={selected.name} identity={selected.id} />}
      Merchant workspace
      <select
        aria-label="Merchant workspace"
        value={selected?.id ?? ""}
        disabled={!merchants?.length}
        onChange={(event) => {
          const merchant = merchants?.find((m) => m.id === event.target.value);
          if (merchant) onSelect(merchant);
        }}
      >
        {!merchants?.length && <option value="">Loading merchants…</option>}
        {merchants?.map((merchant) => (
          <option key={merchant.id} value={merchant.id}>
            {merchant.name}
          </option>
        ))}
      </select>
    </label>
  );
}
