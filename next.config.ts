import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // PGlite는 WASM 파일을 런타임에 읽으므로 번들링하지 않는다.
  serverExternalPackages: ["@electric-sql/pglite"],
  poweredByHeader: false,
  // 데모 모드에서 PGlite(WASM) 파일이 Vercel 함수에 포함되도록 한다.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@electric-sql/pglite/dist/*.wasm", "./node_modules/@electric-sql/pglite/dist/*.data"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
