import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "libsodium-wrappers-sumo/dist/modules-sumo/libsodium-wrappers.js":
        "libsodium-wrappers-sumo",
      "libsodium-wrappers-sumo/dist/modules-sumo-esm/libsodium-wrappers.mjs":
        "libsodium-wrappers-sumo",
      "libsodium-sumo/dist/modules-sumo/libsodium-sumo.js": "libsodium-sumo",
      "libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs": "libsodium-sumo",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "libsodium-wrappers-sumo/dist/modules-sumo/libsodium-wrappers.js":
        "libsodium-wrappers-sumo",
      "libsodium-wrappers-sumo/dist/modules-sumo-esm/libsodium-wrappers.mjs":
        "libsodium-wrappers-sumo",
      "libsodium-sumo/dist/modules-sumo/libsodium-sumo.js": "libsodium-sumo",
      "libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs": "libsodium-sumo",
    };

    return config;
  },
};

export default nextConfig;
