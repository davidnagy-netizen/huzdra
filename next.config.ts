import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    // A húzdrá.hu IDN változat (punycode: xn--hzdr-8na0m.hu) 301-gyel a huzdra.hu-ra irányít.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "(?:www\\.)?xn--hzdr-8na0m\\.hu" }],
        destination: "https://huzdra.hu/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www\\.huzdra\\.hu" }],
        destination: "https://huzdra.hu/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
