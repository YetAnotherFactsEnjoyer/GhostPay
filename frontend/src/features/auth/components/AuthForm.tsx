import { ArrowRight, CircleAlert } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { login, register } from "../auth";
import { AuthLayout } from "../../../app/layouts/AuthLayout";
import { auth } from "../../../shared/api/client";
import { Button } from "../../../shared/components/ui/Button";
import { InputField } from "../../../shared/components/ui/InputField";
import { PasswordField } from "./PasswordField";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation<unknown, Error>({
    mutationFn: () =>
      mode === "login" ? login(email, password) : register(email, password),
    onSuccess: () => navigate(mode === "login" ? "/app" : "/login"),
    onError: (failure: Error) => setError(failure.message),
  });
  return (
    <AuthLayout>
      <div className="brand-row">
        <div className="brand-mark small">G</div>
        <span>GhostPay</span>
      </div>
      <h2>{mode === "login" ? "Welcome back" : "Create your workspace"}</h2>
      <p className="muted">
        {mode === "login"
          ? "Sign in to access your payment operations."
          : "Start simulating payments securely."}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          auth.clear();
          mutation.mutate();
        }}
      >
        <InputField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <PasswordField value={password} onChange={setPassword} />
        <small className="hint">
          Use at least 8 characters (maximum 72 UTF-8 bytes).
        </small>
        {error && (
          <div className="error">
            <CircleAlert size={16} />
            {error}
          </div>
        )}
        <Button disabled={mutation.isPending}>
          {mutation.isPending
            ? "Working…"
            : mode === "login"
              ? "Sign in"
              : "Create account"}{" "}
          <ArrowRight size={17} />
        </Button>
      </form>
      <p className="switch">
        {mode === "login" ? "New to GhostPay?" : "Already have an account?"}{" "}
        <Link to={mode === "login" ? "/register" : "/login"}>
          {mode === "login" ? "Create account" : "Sign in"}
        </Link>
      </p>
    </AuthLayout>
  );
}
