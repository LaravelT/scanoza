import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/admin',
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'http://127.0.0.1:5000/:path*',
      },
    ];
  },
};

export default nextConfig;
