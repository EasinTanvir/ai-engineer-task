/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: {
      "@huggingface/transformers":
        "@huggingface/transformers/dist/transformers.web.js",
    },
  },
  webpack: (config) => {
    // Ignore native Node/C++ bindings in the browser/server bundle
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
};

export default nextConfig;
