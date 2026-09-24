import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite는 WASM 파일을 런타임에 읽으므로 번들링하지 않는다.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
