/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'durdle-vehicle-images-dev.s3.eu-west-2.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
