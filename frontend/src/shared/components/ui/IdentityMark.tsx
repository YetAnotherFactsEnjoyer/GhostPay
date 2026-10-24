import type { ReactNode } from "react";

/** Stable visual identity for records without an uploaded logo. */
export function IdentityMark({
  name,
  identity,
  children,
}: {
  name: string;
  identity: string;
  children?: ReactNode;
}) {
  const color =
    [...identity].reduce(
      (hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0,
      0,
    ) % 5;
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={`identity-mark identity-color-${color}`}
      aria-hidden="true"
    >
      {children ?? (initials || "G")}
    </span>
  );
}
