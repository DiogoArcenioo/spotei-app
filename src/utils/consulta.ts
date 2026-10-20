import { QueryClient } from "@tanstack/react-query";
export const consultas = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60000, retry: 1, networkMode: "always" },
    mutations: { retry: false, networkMode: "always" },
  },
});
