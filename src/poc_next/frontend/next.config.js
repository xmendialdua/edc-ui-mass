/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Configure for development with backend on different port
  async rewrites() {
    return [
      // Optional: proxy API calls to backend if needed
      // {
      //   source: '/api/:path*',
      //   destination: 'http://localhost:5001/api/:path*',
      // },
    ]
  },
  
  // Ignore build errors for now (due to Node version)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
