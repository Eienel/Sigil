import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Walrus blobs are fetched at runtime from the aggregator; no remote image
  // optimization is needed. Keep config minimal.
};

export default nextConfig;
