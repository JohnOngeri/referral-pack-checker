/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Design-tool artifacts under design/ are not part of the app.
    dirs: ["app", "src"],
  },
  // The dashboard page and the /api/rerun route read committed fixtures and run
  // evidence at request time. Make sure those files ship with the serverless
  // bundle (needed on Netlify / Vercel).
  experimental: {
    outputFileTracingIncludes: {
      "/": ["./src/data/**", "./fixtures/**", "./results/reports/**"],
      "/api/rerun/[caseId]": [
        "./fixtures/**",
        "./results/raw/**",
        "./results/reports/**",
        "./src/data/**",
        "./src/memory/**",
      ],
    },
  },
};

export default nextConfig;
