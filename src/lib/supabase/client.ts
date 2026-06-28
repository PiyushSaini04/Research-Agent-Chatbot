import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // During build/SSR without env vars — return a dummy client that won't be called
    // The Navbar uses ssr: false so this path only hits in unusual circumstances
    console.warn("Supabase env vars not set — client unavailable");
    // Return a minimal stub; actual calls will fail gracefully in the Navbar
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-key"
    );
  }

  return createBrowserClient(url, key);
}
