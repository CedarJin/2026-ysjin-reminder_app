/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@sendgrid/mail'],
  },
};

module.exports = nextConfig;
