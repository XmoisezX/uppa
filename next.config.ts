import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "static.arboimoveis.com.br" },
      { protocol: "https", hostname: "fotos.infoideias.net" },
      { protocol: "https", hostname: "blog.upimoveis.com.br" },
      { protocol: "https", hostname: "cdn.vistahost.com.br" },
      { protocol: "https", hostname: "app.chavereserva.com" },
      { protocol: "https", hostname: "s01.jetimgs.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
