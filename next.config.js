/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // 启用 standalone 输出模式（用于 Docker 部署）
    output: 'standalone',
    // Turbopack 配置（Next.js 16 默认使用）
    turbopack: {},
    webpack: (config, { isServer }) => {
        // 修复 better-sqlite3 在 Next.js 中的问题
        if (isServer) {
            config.externals.push("better-sqlite3");
        }
        return config;
    },
    // 允许从抖音域名加载图片
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**.douyinpic.com",
            },
            {
                protocol: "https",
                hostname: "**.douyin.com",
            },
        ],
    },
};

export default nextConfig;
