/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: {
      "@huggingface/transformers":
        "@huggingface/transformers/dist/transformers.web.js",
    },
  },
  webpack(config) {
    config.resolve.alias["@huggingface/transformers"] =
      "@huggingface/transformers/dist/transformers.web.js";
    return config;
  },
};

export default nextConfig;
