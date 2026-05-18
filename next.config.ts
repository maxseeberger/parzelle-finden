import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/warteliste', destination: '/ratgeber/warteliste', permanent: false },
      { source: '/abloese', destination: '/ratgeber/abloese', permanent: false },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/kleingarten-:slug',
        destination: '/city/:slug',
      },
    ]
  },
}

export default nextConfig
