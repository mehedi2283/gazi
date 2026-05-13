/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/auth/login',
        destination: '/login',
        permanent: false
      },
      {
        source: '/auth/register',
        destination: '/register',
        permanent: false
      }
    ]
  }
}

module.exports = nextConfig
