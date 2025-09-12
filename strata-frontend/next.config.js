// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'igykogntboasdbmpzeca.supabase.co',
                pathname: '/storage/v1/object/**',
            },
        ],
    },
};

module.exports = nextConfig;
