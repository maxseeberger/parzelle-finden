import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
