/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // 静态导出模式（用于 Capacitor 移动端）
    output: "export",
    // 禁用图片优化（静态导出需要）
    images: {
        unoptimized: true,
    },
    // 禁用日志
    logging: {
        fetches: {
            fullUrl: false,
        },
    },
    // 基础路径（如果需要）
    // basePath: '',
    // 资源前缀（如果需要 CDN）
    // assetPrefix: '',
    // 尾部斜杠
    trailingSlash: true,
};

export default nextConfig;
