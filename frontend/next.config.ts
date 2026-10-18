import type { NextConfig } from "next";
import { networkInterfaces } from "os";

// Let other devices open the dev server via this machine's IP or an HTTPS tunnel
// (Next blocks dev assets for hostnames other than localhost by default).
const lanIps = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";

const nextConfig: NextConfig = {
  allowedDevOrigins: [...lanIps, "*.trycloudflare.com"],
  // The browser only talks to this server; it forwards API and Supabase calls. That way a
  // phone needs just one address (port 3000), which can then be served over HTTPS by a tunnel.
  async rewrites() {
    return [
      { source: "/backend/:path*", destination: `${BACKEND_URL}/:path*` },
      // Only what the browser needs from Supabase: password sign-in/up, session refresh, sign-out,
      // and public listing photos. Everything else (database API, admin routes) is not forwarded.
      { source: "/supabase/auth/v1/:endpoint(token|signup|user|logout)", destination: `${SUPABASE_URL}/auth/v1/:endpoint` },
      {
        source: "/supabase/storage/v1/object/public/listing-photos/:path*",
        destination: `${SUPABASE_URL}/storage/v1/object/public/listing-photos/:path*`,
      },
    ];
  },
  experimental: {
    proxyTimeout: 300_000, // photo analysis on a local model can take a while
    proxyClientMaxBodySize: "45mb", // up to 4 phone photos of 10 MB each
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
