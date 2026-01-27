"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        download_dir: "",
        api_base_url: "",
        api_token: "",
        folderNameFormat: "",
        workFolderNameFormat: "",
        fileNameFormat: "",
        mark: "",
        showImages: "true",
        nfo_format: "jellyfin",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await fetch("/api/settings");
            const data = await response.json();
            if (data.success) {
                setSettings(data.data);
            }
        } catch (e) {
            console.error("加载设置失败:", e);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        setSaving(true);
        setMessage("");

        try {
            const response = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settings }),
            });

            const data = await response.json();
            if (data.success) {
                setMessage("设置保存成功！");
                setTimeout(() => setMessage(""), 3000);
            } else {
                setMessage("保存失败: " + (data.error || "未知错误"));
            }
        } catch (e: any) {
            setMessage("保存失败: " + (e.message || "未知错误"));
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8 pt-16 lg:pt-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-gray-900 dark:text-white">
                        系统设置
                    </h2>

                    {loading ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            加载中...
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    下载目录
                                </label>
                                <input
                                    type="text"
                                    value={settings.download_dir}
                                    onChange={(e) =>
                                        handleChange(
                                            "download_dir",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="/path/to/downloads"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    视频文件将保存到此目录。留空则使用默认目录（项目根目录下的
                                    downloads 文件夹）
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    API 地址
                                </label>
                                <input
                                    type="text"
                                    value={settings.api_base_url}
                                    onChange={(e) =>
                                        handleChange(
                                            "api_base_url",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="http://192.168.60.20:5555"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    TikTokDownloader API 的地址
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    API Token（可选）
                                </label>
                                <input
                                    type="text"
                                    value={settings.api_token}
                                    onChange={(e) =>
                                        handleChange(
                                            "api_token",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="留空表示不使用 token"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    如果 API 需要 token 认证，请在此填写
                                </p>
                            </div>

                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    显示设置
                                </h3>
                            </div>

                            <div>
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.showImages === "true"}
                                        onChange={(e) =>
                                            handleChange(
                                                "showImages",
                                                e.target.checked
                                                    ? "true"
                                                    : "false",
                                            )
                                        }
                                        className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        显示作品封面图片
                                    </span>
                                </label>
                                <p className="mt-2 ml-8 text-sm text-gray-500 dark:text-gray-400">
                                    关闭后，首页和下载管理页面将不显示作品封面图片，可以提升页面加载速度
                                </p>
                            </div>

                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    下载配置
                                </h3>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    账号标识（可选）
                                </label>
                                <input
                                    type="text"
                                    value={settings.mark}
                                    onChange={(e) =>
                                        handleChange("mark", e.target.value)
                                    }
                                    placeholder="例如：我的账号"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    账号备注，用于识别账号作品文件夹。留空则使用账号昵称
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    文件夹命名格式
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {[
                                        {
                                            label: "UID_昵称_类型",
                                            value: "{uid}_{nickname}_{type}",
                                        },
                                        {
                                            label: "UID_标识_类型",
                                            value: "{uid}_{mark}_{type}",
                                        },
                                        {
                                            label: "昵称_类型",
                                            value: "{nickname}_{type}",
                                        },
                                        {
                                            label: "标识_类型",
                                            value: "{mark}_{type}",
                                        },
                                    ].map((template) => (
                                        <button
                                            key={template.value}
                                            type="button"
                                            onClick={() =>
                                                handleChange(
                                                    "folderNameFormat",
                                                    template.value,
                                                )
                                            }
                                            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg border transition-colors ${
                                                settings.folderNameFormat ===
                                                template.value
                                                    ? "bg-blue-600 text-white border-blue-600"
                                                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-500"
                                            }`}
                                        >
                                            {template.label}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={settings.folderNameFormat}
                                    onChange={(e) =>
                                        handleChange(
                                            "folderNameFormat",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="{uid}_{nickname}_{type}"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    可用参数：{"{uid}"}（账号ID）、
                                    {"{nickname}"}（昵称）、{"{mark}"}（标识）、
                                    {"{type}"}（类型）
                                    <br />
                                    示例：{"{uid}_{nickname}_{type}"} →
                                    MS123456_张三_发布作品
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    作品文件夹命名格式
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {[
                                        {
                                            label: "时间_描述",
                                            value: "{create_time}_{desc}",
                                        },
                                        {
                                            label: "描述_ID",
                                            value: "{desc}_{id}",
                                        },
                                        {
                                            label: "ID_描述",
                                            value: "{id}_{desc}",
                                        },
                                        {
                                            label: "时间_ID",
                                            value: "{create_time}_{id}",
                                        },
                                        {
                                            label: "不使用",
                                            value: "",
                                        },
                                    ].map((template) => (
                                        <button
                                            key={template.value}
                                            type="button"
                                            onClick={() =>
                                                handleChange(
                                                    "workFolderNameFormat",
                                                    template.value,
                                                )
                                            }
                                            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg border transition-colors ${
                                                settings.workFolderNameFormat ===
                                                template.value
                                                    ? "bg-blue-600 text-white border-blue-600"
                                                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-500"
                                            }`}
                                        >
                                            {template.label}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={settings.workFolderNameFormat}
                                    onChange={(e) =>
                                        handleChange(
                                            "workFolderNameFormat",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="{create_time}_{desc}"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    可用参数：{"{id}"}（作品ID）、{"{desc}"}
                                    （描述）、{"{create_time}"}（发布时间）
                                    <br />
                                    示例：{"{create_time}_{desc}"} →
                                    2025-01-27_今天天气真好
                                    <br />
                                    留空表示不使用作品文件夹，直接将文件保存在账号文件夹下
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    文件命名格式
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {[
                                        {
                                            label: "描述_ID",
                                            value: "{desc}_{id}",
                                        },
                                        {
                                            label: "ID_描述",
                                            value: "{id}_{desc}",
                                        },
                                        {
                                            label: "时间_描述_ID",
                                            value: "{create_time}_{desc}_{id}",
                                        },
                                        { label: "描述", value: "{desc}" },
                                    ].map((template) => (
                                        <button
                                            key={template.value}
                                            type="button"
                                            onClick={() =>
                                                handleChange(
                                                    "fileNameFormat",
                                                    template.value,
                                                )
                                            }
                                            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg border transition-colors ${
                                                settings.fileNameFormat ===
                                                template.value
                                                    ? "bg-blue-600 text-white border-blue-600"
                                                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-500"
                                            }`}
                                        >
                                            {template.label}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={settings.fileNameFormat}
                                    onChange={(e) =>
                                        handleChange(
                                            "fileNameFormat",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="{desc}_{id}"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    可用参数：{"{id}"}（作品ID）、{"{desc}"}
                                    （描述）、{"{create_time}"}（发布时间）
                                    <br />
                                    示例：{"{desc}_{id}"} →
                                    今天天气真好_7566208722012278051.mp4
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    NFO 元数据格式
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {[
                                        {
                                            label: "Jellyfin",
                                            value: "jellyfin",
                                        },
                                        {
                                            label: "Emby",
                                            value: "emby",
                                        },
                                        {
                                            label: "Plex",
                                            value: "plex",
                                        },
                                    ].map((format) => (
                                        <button
                                            key={format.value}
                                            type="button"
                                            onClick={() =>
                                                handleChange(
                                                    "nfo_format",
                                                    format.value,
                                                )
                                            }
                                            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                                                settings.nfo_format ===
                                                format.value
                                                    ? "bg-blue-600 text-white border-blue-600"
                                                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-500"
                                            }`}
                                        >
                                            {format.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    选择媒体服务器类型，下载视频时会自动生成对应格式的
                                    NFO 元数据文件
                                    <br />
                                    NFO
                                    文件包含视频标题、作者、发布时间、点赞数等信息，方便媒体服务器识别
                                </p>
                            </div>

                            {message && (
                                <div
                                    className={`px-4 py-3 rounded-lg ${
                                        message.includes("成功")
                                            ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                                            : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                                    }`}
                                >
                                    {message}
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                <button
                                    onClick={saveSettings}
                                    disabled={saving}
                                    className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-800"
                                >
                                    {saving ? "保存中..." : "保存设置"}
                                </button>
                                <button
                                    onClick={loadSettings}
                                    className="w-full sm:w-auto px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                                >
                                    重置
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 dark:text-blue-400 mb-2">
                        💡 使用提示
                    </h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                        <li>• 下载目录必须是服务器上的绝对路径</li>
                        <li>• 确保下载目录有写入权限</li>
                        <li>
                            • API 地址格式：http://host:port（不要以 / 结尾）
                        </li>
                        <li>• 修改设置后立即生效，无需重启服务</li>
                        <li>• 文件夹和文件命名支持多种参数组合</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
