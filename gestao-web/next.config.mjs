/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiBase = process.env.API_BACKEND_URL || 'http://127.0.0.1:8001';
    return [
      { source: '/api/:path*', destination: `${apiBase}/api/:path*` },
    ];
  },
};

export default nextConfig;
