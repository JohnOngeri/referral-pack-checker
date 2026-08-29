/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Design-tool artifacts under design/ are not part of the app.
    dirs: ["app", "src"],
  },
};

export default nextConfig;
