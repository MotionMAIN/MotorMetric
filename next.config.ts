import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/fahrzeuge/:slug",
        destination: "/vehicles/:slug",
        permanent: true,
      },
      {
        source: "/datenquellen",
        destination: "/data-sources",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
