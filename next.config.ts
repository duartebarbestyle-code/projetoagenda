import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Upload do portfólio sem Vercel Blob (local). Com Blob, o navegador envia direto e não passa por aqui.
  experimental: { serverActions: { bodySizeLimit: "55mb" } },
};

export default nextConfig;
