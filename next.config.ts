import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (isProduction && !configuredApiBaseUrl) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is required for production builds.");
}

const apiBaseUrl = configuredApiBaseUrl ?? "http://localhost:4000/api/v1";
const parsedApiUrl = new URL(apiBaseUrl);

if (isProduction && parsedApiUrl.protocol !== "https:") {
  throw new Error("NEXT_PUBLIC_API_BASE_URL must use HTTPS in production.");
}

const apiOrigin = parsedApiUrl.origin;

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}${isProduction ? "" : " ws:"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          ...(isProduction
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
