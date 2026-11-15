import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Modèle de cache classique : les pages publiques se régénèrent toutes les 60 s (export `revalidate`).
  cacheComponents: false,
};

export default nextConfig;
