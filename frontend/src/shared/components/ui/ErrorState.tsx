import { CircleAlert } from "lucide-react";

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="error" role="alert">
      <CircleAlert size={16} />
      {message}
    </div>
  );
}
