import { request, auth } from "../../shared/api/client";
import type { User } from "../../shared/types/api";
export const login = (email: string, password: string) =>
  request<{ accessToken: string }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then((result) => {
    auth.set(result.accessToken);
    return result;
  });
export const register = (email: string, password: string) =>
  request<{ id: string; email: string }>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
export const me = () => request<User>("/api/v1/account/me");
