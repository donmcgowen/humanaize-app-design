import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";

// The backend URL — same API as the web app
const API_URL = "https://humanaize.life";

// Create the tRPC React hooks
// We use `any` for the router type here since we don't import the server router
// (it would pull in Node.js-only deps). Type safety is handled by shared Zod schemas.
export const trpc = createTRPCReact<any>();

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_URL}/trpc`,
        // Include credentials (session cookie) with every request
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000, // 30 seconds
    },
  },
});
