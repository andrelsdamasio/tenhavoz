/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // As imagens de compartilhamento leem a fonte Archivo do disco.
    outputFileTracingIncludes: {
      "/opengraph-image": ["./assets/fonts/**"],
      "/[slug]/opengraph-image": ["./assets/fonts/**"],
    },
  },
};

export default nextConfig;
