"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

// ============================================================
// FILE: src/components/providers.tsx
// ============================================================
// PURPOSE: Root client-side provider wrapping React Query and devtools.
// HOW IT WORKS: Creates a QueryClient with 30-second stale time, single retry,
//   and disabled refetch-on-focus. Wraps children in QueryClientProvider for
//   useQuery/useMutation access. Includes ReactQueryDevtools for debugging
//   (initially closed). Uses useState to ensure the client is created once
//   per component lifecycle.
// INTEGRATION: TanStack React Query, used by root layout
// ============================================================
