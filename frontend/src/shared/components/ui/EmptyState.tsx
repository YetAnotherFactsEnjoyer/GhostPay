import { CircleAlert } from "lucide-react";

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty">
      <CircleAlert size={20} />
      {text}
    </div>
  );
}
