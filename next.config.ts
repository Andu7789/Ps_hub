import type { NextConfig } from "next";

// Applied to every response: the headers that can't break a working page.
// A full Content-Security-Policy can follow once the app's final set of
// third-party scripts is known.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  // File uploads go through a Server Action. Vercel caps a request at
  // 4.5MB, so files are limited to 4MB (MAX_FILE_BYTES in actions/files.ts).
  experimental: {
    serverActions: { bodySizeLimit: "4.4mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
