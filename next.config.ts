// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use built-in source maps in development
  reactStrictMode: true,
  
  // Only add minimal webpack changes if absolutely necessary
  webpack: (config, { dev }) => {
    if (dev) {
      // Only add source maps, don't modify CSS Module behavior
      const cssRule = config.module?.rules?.find(
        (rule) => rule.test instanceof RegExp && rule.test.test('.css')
      );
      
      if (cssRule?.use) {
        cssRule.use.push({
          loader: 'postcss-loader',
          options: { sourceMap: true }
        });
      }
    }
    return config;
  }
};

export default nextConfig;