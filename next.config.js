/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /node_modules\/@mlc-ai\/web-llm\/.*\.js$/,
      type: 'javascript/auto',
    });

    if (isServer) {
      config.externals = [
        ...config.externals,
        '@mlc-ai/web-llm',
      ];
    }

    return config;
  },
}

module.exports = nextConfig
