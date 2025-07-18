<<<<<<< HEAD
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour les performances optimales
  experimental: {
    optimizeCss: false,
    optimizePackageImports: [
      'lucide-react',
      '@heroicons/react',
      '@tabler/icons-react',
      'react-icons'
    ],
    serverComponentsExternalPackages: ['@tensorflow/tfjs-node']
  },

  // Optimisation des images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 jours
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  },

  // Optimisation du bundle
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Fix for webpack 5 Node.js polyfills
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        os: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    // Handle Web Workers with Next.js built-in support
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: {
        loader: 'next/dist/build/webpack/loaders/worker-loader',
        options: {
          filename: 'static/[hash].worker.js',
        },
      },
    });

    // Fix for TensorFlow.js
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Handle TensorFlow.js externals
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@tensorflow/tfjs-node': 'commonjs @tensorflow/tfjs-node',
        'canvas': 'commonjs canvas',
        'fs': 'commonjs fs',
        'path': 'commonjs path',
      });
    }

    // Optimize TensorFlow.js bundle
    config.resolve.alias = {
      ...config.resolve.alias,
      '@tensorflow/tfjs$': '@tensorflow/tfjs/dist/tf.min.js',
    };
    // Optimisation pour la production
    if (!dev && !isServer) {
      // Analyse du bundle
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Vendor chunks séparés
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true
          },
          // Icônes dans un chunk séparé
          icons: {
            test: /[\\/]node_modules[\\/](lucide-react|@heroicons|@tabler|react-icons)[\\/]/,
            name: 'icons',
            priority: 20,
            reuseExistingChunk: true
          },
          // Composants UI dans un chunk séparé
          ui: {
            test: /[\\/]components[\\/]ui[\\/]/,
            name: 'ui',
            priority: 15,
            reuseExistingChunk: true
          }
        }
      };

      // Optimisation des modules
      config.optimization.moduleIds = 'deterministic';
      config.optimization.chunkIds = 'deterministic';
    }

    return config;
  },

  // Headers pour la mise en cache
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  },

  // Compression
  compress: true,

  // Optimisation des polyfills
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false
  },

  // Configuration TypeScript et ESLint optimisées pour la production
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production'
  },
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production'
  },

  poweredByHeader: false,
  reactStrictMode: true,

  // Vercel-specific optimizations
  output: 'standalone',

  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  }
};

export default nextConfig;
=======
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour les performances optimales
  experimental: {
    optimizeCss: false, // Changé à false pour la stabilité
    optimizePackageImports: [
      'lucide-react',
      '@heroicons/react',
      '@tabler/icons-react',
      'react-icons'
    ],
    serverActions: true
  },

  // Optimisation des images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 jours
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  },

  // Optimisation du bundle
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle Web Workers for Vercel
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: 'worker-loader' },
    });

    // Handle TensorFlow.js and other Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
      };
    }
    // Optimisation pour la production
    if (!dev && !isServer) {
      // Analyse du bundle
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Vendor chunks séparés
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          // Icônes dans un chunk séparé
          icons: {
            test: /[\\/]node_modules[\\/](lucide-react|@heroicons|@tabler|react-icons)[\\/]/,
            name: 'icons',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Composants UI dans un chunk séparé
          ui: {
            test: /[\\/]components[\\/]ui[\\/]/,
            name: 'ui',
            priority: 15,
            reuseExistingChunk: true,
          }
        }
      }

      // Optimisation des modules
      config.optimization.moduleIds = 'deterministic'
      config.optimization.chunkIds = 'deterministic'
    }

    return config
  },

  // Headers pour la mise en cache
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // Compression
  compress: true,

  // Optimisation des polyfills
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // Configuration TypeScript et ESLint optimisées pour la production
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  
  poweredByHeader: false,
  reactStrictMode: true,

  // Vercel-specific optimizations
  output: 'standalone',

  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  }
};

export default nextConfig;
>>>>>>> ffb12d4 (changement)
