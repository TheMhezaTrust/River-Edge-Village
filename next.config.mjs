/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Allows a production build to run into a separate dir (e.g. NEXT_DIST_DIR=.next-prod)
  // so it never collides with a running `next dev` on the default .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
