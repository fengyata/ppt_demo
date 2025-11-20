/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        child_process: false,
        tls: false,
        net: false,
      };

      // Fix for "node:fs" imports in client-side bundles (e.g. pptxgenjs)
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
            /^node:/, 
            (resource) => {
                resource.request = resource.request.replace(/^node:/, "");
            }
        )
      );
    }
    return config;
  },
}

module.exports = nextConfig
