import type { NextConfig } from "next";

<<<<<<< HEAD
const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
=======
/**
 * Baseline security headers for every response:
 *  - nosniff: browsers must trust our Content-Type (no MIME sniffing).
 *  - DENY framing: nobody can embed the app in an iframe (clickjacking).
 *  - strict referrer: don't leak internal URLs (ids, filters) to other sites.
 *  - Permissions-Policy: the app needs no camera / mic / location.
 * HSTS is added by Vercel on its domains.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The app's home is the dashboard. A config-level redirect is a clean 307
  // before any rendering (a redirect() inside a page would stream first).
  async redirects() {
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
>>>>>>> 0591416c68fbcee960e3d70906ac4f197bafc26b
};

export default nextConfig;
