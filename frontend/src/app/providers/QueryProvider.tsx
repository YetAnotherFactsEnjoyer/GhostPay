import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { auth, HttpError } from "../../shared/api/client";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (count, error) =>
              !(
                error instanceof HttpError &&
                error.status >= 400 &&
                error.status < 500
              ) && count < 2,
          },
        },
      }),
  );
  useEffect(
    () =>
      auth.subscribe(() => {
        // Clear synchronously on session changes, without remounting the router.
        void queryClient.cancelQueries();
        queryClient.clear();
      }),
    [queryClient],
  );
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
