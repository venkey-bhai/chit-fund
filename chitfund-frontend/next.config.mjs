/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/chit-groups',
        destination: '/chits',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
