import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mode standalone pour Docker (optimise la taille de l'image)
  output: 'standalone',
  
  // Désactiver la vérification TypeScript pendant le build Docker
  // (en production, on suppose que le code a déjà été vérifié localement)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Désactiver aussi ESLint pendant le build pour gagner du temps
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
