"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

export default function Sidebar() {
    const pathname = usePathname();
    const { theme, setTheme, effectiveTheme } = useTheme();

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

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Logo/Title */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    dd视频同步
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    视频同步工具
                </p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        pathname?.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                isActive
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Theme Toggle */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
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
                                {effectiveTheme === "dark" ? "深色" : "浅色"}
                            </span>
                        )}
                    </div>
                    <span className="text-xl">{currentThemeOption.icon}</span>
                </button>
            </div>
        </aside>
    );
}
