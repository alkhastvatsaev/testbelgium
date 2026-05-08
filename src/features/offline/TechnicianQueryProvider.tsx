"use client";

import { useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { TECHNICIAN_ASSIGNMENTS_QUERY_KEY } from "@/features/offline/technicianQueryKeys";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 1000 * 60 * 60 * 24 * 14,
        retry: 1,
      },
    },
  });
}

export function TechnicianQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  const persister = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createSyncStoragePersister({
      storage: window.localStorage,
      key: "bm_tanstack_technician_v1",
      throttleTime: 1500,
    });
  }, []);

  if (!persister) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        dehydrateOptions: {
          shouldDehydrateQuery: (q) =>
            Array.isArray(q.queryKey) && q.queryKey[0] === TECHNICIAN_ASSIGNMENTS_QUERY_KEY,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
