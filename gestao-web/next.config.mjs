/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiBase = process.env.API_BACKEND_URL || 'http://localhost:8000';
    return [
      { source: '/api/:path*', destination: `${apiBase}/api/:path*` },
    ];
  },
};

export default nextConfig;
