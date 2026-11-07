/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Allows a production build to run into a separate dir (e.g. NEXT_DIST_DIR=.next-prod)
  // so it never collides with a running `next dev` on the default .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The Mheza assistant reads ai-context.txt at request time. Next's file tracer
  // can't detect a runtime fs.readFile, so include it explicitly in the /api/chat
  // function bundle — otherwise the file is missing in the Vercel deployment.
  outputFileTracingIncludes: {
    "/api/chat": ["./ai-context.txt"],
  },
};

export default nextConfig;
