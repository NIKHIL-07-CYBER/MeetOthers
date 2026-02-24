/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disabled to prevent PeerJS/Socket.IO double-mount issues in development
  reactStrictMode: false,

  async headers() {
    return [
      {
        // Prevent caching on the Socket.IO handshake endpoint
        source: '/api/socket',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
}

module.exports = nextConfig
