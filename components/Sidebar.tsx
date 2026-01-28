"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { useState, useEffect } from "react";

export default function Sidebar() {
    const pathname = usePathname();
    const { theme, setTheme, effectiveTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const navItems = [
        { href: "/subscriptions", label: "订阅管理", icon: "📺" },
        { href: "/schedules", label: "调度管理", icon: "⏰" },
        { href: "/settings", label: "设置", icon: "⚙️" },
    ];

    const themeOptions = [
        { value: "light" as const, label: "浅色模式", icon: "☀️" },
        { value: "dark" as const, label: "深色模式", icon: "🌙" },
        { value: "system" as const, label: "跟随系统", icon: "💻" },
    ];

    const handleThemeChange = () => {
        // 循环切换: system -> light -> dark -> system
        const currentIndex = themeOptions.findIndex(
            (opt) => opt.value === theme,
        );
        const nextIndex = (currentIndex + 1) % themeOptions.length;
        setTheme(themeOptions[nextIndex].value);
    };

    const currentThemeOption =
        themeOptions.find((opt) => opt.value === theme) || themeOptions[2];

    const closeSidebar = () => setIsOpen(false);

    // 路由变化时自动关闭侧边栏
    useEffect(() => {
        closeSidebar();
    }, [pathname]);

    // 阻止侧边栏打开时的背景滚动
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    return (
        <>
            {/* 移动端顶部导航栏 */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-30 flex items-center px-4">
                {/* 汉堡菜单按钮 */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Toggle menu"
                >
                    <svg
                        className="w-6 h-6 text-gray-900 dark:text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    </svg>
                </button>

                {/* 标题 */}
                <h1 className="ml-3 text-lg font-bold text-gray-900 dark:text-white">
                    dd视频同步
                </h1>

                {/* 主题切换按钮 */}
                <button
                    onClick={handleThemeChange}
                    className="ml-auto p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="切换主题"
                    aria-label="切换主题"
                >
                    <span className="text-xl">{currentThemeOption.icon}</span>
                </button>
            </div>

            {/* 移动端遮罩层 */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                    onClick={closeSidebar}
                />
            )}

            {/* 侧边栏 */}
            <aside
                className={`fixed left-0 top-0 h-screen w-72 sm:w-80 lg:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col z-50 lg:z-40 transition-transform duration-300 ease-in-out ${
                    isOpen
                        ? "translate-x-0"
                        : "-translate-x-full lg:translate-x-0"
                }`}
            >
                {/* Logo/Title - 桌面端显示 */}
                <div className="hidden lg:block p-6 border-b border-gray-200 dark:border-gray-700">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        dd视频同步
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        视频同步工具
                    </p>
                </div>

                {/* 移动端头部 */}
                <div className="lg:hidden p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            dd视频同步
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            视频同步工具
                        </p>
                    </div>
                    <button
                        onClick={closeSidebar}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="关闭菜单"
                    >
                        <svg
                            className="w-6 h-6 text-gray-900 dark:text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            pathname?.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeSidebar}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                    isActive
                                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                }`}
                            >
                                <span className="text-2xl lg:text-xl">
                                    {item.icon}
                                </span>
                                <span className="font-medium text-base lg:text-sm">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Theme Toggle - 桌面端显示 */}
                <div className="hidden lg:block p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleThemeChange}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="点击切换主题模式"
                    >
                        <div className="flex flex-col items-start">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                                {currentThemeOption.label}
                            </span>
                            {theme === "system" && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    当前:{" "}
                                    {effectiveTheme === "dark"
                                        ? "深色"
                                        : "浅色"}
                                </span>
                            )}
                        </div>
                        <span className="text-xl">
                            {currentThemeOption.icon}
                        </span>
                    </button>
                </div>

                {/* 移动端底部信息 */}
                <div className="lg:hidden p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        <p>当前主题: {currentThemeOption.label}</p>
                        {theme === "system" && (
                            <p className="mt-1">
                                系统模式:{" "}
                                {effectiveTheme === "dark" ? "深色" : "浅色"}
                            </p>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
