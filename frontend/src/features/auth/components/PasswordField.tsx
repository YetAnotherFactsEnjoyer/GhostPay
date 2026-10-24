import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function PasswordField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field">
      <span>Password</span>
      <span className="input-with-action">
        <input
          type={visible ? "text" : "password"}
          minLength={8}
          maxLength={100}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
        />
        <button
          type="button"
          className="input-action"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );
}
