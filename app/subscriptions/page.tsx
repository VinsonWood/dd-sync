"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import Tooltip from "@/components/Tooltip";
import { useToast, ToastContainer } from "@/components/Toast";

interface Subscription {
    id: string;
    sec_user_id: string;
    nickname: string;
    avatar?: string;
    enabled: boolean;
    time_range: "all" | "half-year" | "one-month";
    min_digg_count?: number;
    auto_download: boolean;
    last_sync_time?: number;
    last_video_id?: string;
    created_at: number;
    updated_at: number;
    total_videos: number;
    downloaded_count: number;
}

export default function SubscriptionsPage() {
    const { toasts, toast, removeToast } = useToast();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [syncing, setSyncing] = useState<Set<string>>(new Set());
    const [showDialog, setShowDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [importing, setImporting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        sec_user_id: "",
        timeRange: "one-month" as "all" | "half-year" | "one-month",
        minDiggCount: undefined as number | undefined,
        autoDownload: true,
    });

    useEffect(() => {
        loadSubscriptions();
    }, []);

    async function loadSubscriptions() {
        try {
            const response = await axios.get("/api/subscriptions");
            if (response.data.success) {
                setSubscriptions(response.data.data);
            }
        } catch (error) {
            console.error("加载订阅失败:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                // 更新订阅
                await axios.patch(`/api/subscriptions/${editingId}`, {
                    timeRange: formData.timeRange,
                    minDiggCount: formData.minDiggCount,
                    autoDownload: formData.autoDownload,
                });
                toast.success("订阅配置已更新");
            } else {
                // 添加订阅
                console.log("开始添加订阅...");
                await axios.post(
                    "/api/subscriptions",
                    {
                        sec_user_id: formData.sec_user_id,
                        timeRange: formData.timeRange,
                        minDiggCount: formData.minDiggCount,
                        autoDownload: formData.autoDownload,
                    },
                    {
                        timeout: 60000, // 60秒超时
                    },
                );
                toast.success("订阅添加成功！");
            }
            setShowDialog(false);
            resetForm();
            loadSubscriptions();
        } catch (error: any) {
            console.error("操作失败:", error);
            toast.error(
                error.response?.data?.error || error.message || "操作失败",
            );
        } finally {
            setSubmitting(false);
        }
    }

    function resetForm() {
        setFormData({
            sec_user_id: "",
            timeRange: "one-month",
            minDiggCount: undefined,
            autoDownload: true,
        });
        setEditingId(null);
    }

    function openEditDialog(sub: Subscription) {
        setFormData({
            sec_user_id: sub.sec_user_id,
            timeRange: sub.time_range,
            minDiggCount: sub.min_digg_count,
            autoDownload: sub.auto_download,
        });
        setEditingId(sub.id);
        setShowDialog(true);
    }

    async function syncSubscription(id: string) {
        setSyncing(new Set(syncing).add(id));
        try {
            const response = await axios.post(`/api/subscriptions/${id}/sync`);
            toast.success(
                `同步完成！发现 ${response.data.data.newVideos?.length || 0} 个新视频`,
            );
            loadSubscriptions();
        } catch (error: any) {
            toast.error(
                `同步失败：${error.response?.data?.error || error.message}`,
            );
        } finally {
            setSyncing((prev) => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    }

    async function toggleSubscription(id: string, enabled: boolean) {
        try {
            await axios.patch(`/api/subscriptions/${id}`, {
                enabled: !enabled,
            });
            loadSubscriptions();
        } catch (error) {
            toast.error("操作失败");
        }
    }

    async function deleteSubscription(id: string, nickname: string) {
        if (!confirm(`确定要删除订阅「${nickname}」吗？`)) return;
        try {
            await axios.delete(`/api/subscriptions?id=${id}`);
            loadSubscriptions();
        } catch (error) {
            toast.error("删除失败");
        }
    }

    function formatTimeRange(range: string): string {
        const map = {
            "one-month": "最近 1 个月",
            "half-year": "最近半年",
            all: "全部",
        };
        return map[range as keyof typeof map] || range;
    }

    function formatTime(timestamp: number): string {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes} 分钟前`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} 小时前`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} 天前`;
        return new Date(timestamp).toLocaleString("zh-CN");
    }

    // 导出订阅
    async function handleExport() {
        try {
            const response = await axios.get(
                "/api/subscriptions/import-export",
                {
                    responseType: "blob",
                },
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute(
                "download",
                `dd-sync-subscriptions-${Date.now()}.json`,
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("订阅导出成功！");
        } catch (error: any) {
            toast.error(`导出失败：${error.message}`);
        }
    }

    // 导入订阅
    async function handleImport(file: File, mode: "skip" | "overwrite") {
        setImporting(true);
        try {
            const text = await file.text();
            const subscriptions = JSON.parse(text);

            if (!Array.isArray(subscriptions)) {
                throw new Error("无效的 JSON 格式");
            }

            const response = await axios.post(
                "/api/subscriptions/import-export",
                {
                    subscriptions,
                    mode,
                },
            );

            if (response.data.success) {
                const { total, success, skipped, failed, errors } =
                    response.data.data;

                let message = `导入完成！总计 ${total} 条`;
                if (success > 0) message += `，成功 ${success} 条`;
                if (skipped > 0) message += `，跳过 ${skipped} 条`;
                if (failed > 0) message += `，失败 ${failed} 条`;

                if (failed > 0 && errors.length > 0) {
                    console.error("导入错误:", errors);
                    toast.warning(message + "\n部分导入失败，请查看控制台");
                } else {
                    toast.success(message);
                }

                setShowImportDialog(false);
                loadSubscriptions();
            }
        } catch (error: any) {
            toast.error(`导入失败：${error.message}`);
        } finally {
            setImporting(false);
        }
    }

    const stats = {
        total: subscriptions.length,
        active: subscriptions.filter((s) => s.enabled).length,
        inactive: subscriptions.filter((s) => !s.enabled).length,
    };

    if (loading) {
        return (
            <div className="min-h-screen p-8">
                <div className="text-center text-gray-600 dark:text-gray-400">
                    加载中...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8">
                    订阅管理
                </h1>
                {/* 操作栏 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex flex-wrap gap-3 sm:gap-6 text-sm text-gray-600 dark:text-gray-400">
                            <span>订阅总数: {stats.total}</span>
                            <span>启用: {stats.active}</span>
                            <span>禁用: {stats.inactive}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                            <button
                                onClick={handleExport}
                                disabled={subscriptions.length === 0}
                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                导出
                            </button>
                            <button
                                onClick={() => setShowImportDialog(true)}
                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                导入
                            </button>
                            <button
                                onClick={() => setShowDialog(true)}
                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                添加
                            </button>
                        </div>
                    </div>
                </div>

                {/* 订阅列表 */}
                {subscriptions.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 sm:p-12 text-center">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            暂无订阅
                        </p>
                        <button
                            onClick={() => setShowDialog(true)}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            添加第一个订阅
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {subscriptions.map((sub) => (
                            <div
                                key={sub.id}
                                className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 ${
                                    !sub.enabled ? "opacity-60" : ""
                                }`}
                            >
                                {/* 头部 */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-3 items-center flex-1 min-w-0">
                                        {sub.avatar && (
                                            <img
                                                src={sub.avatar}
                                                alt={sub.nickname}
                                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover flex-shrink-0"
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white truncate">
                                                {sub.nickname}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {sub.sec_user_id}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`px-2 py-1 rounded text-xs flex-shrink-0 ${
                                            sub.enabled
                                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                                        }`}
                                    >
                                        {sub.enabled ? "启用" : "禁用"}
                                    </span>
                                </div>

                                {/* 统计 */}
                                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="text-center">
                                        <Tooltip content="累计通过点赞数过滤后发现的新视频总数。如果设置了最低点赞数，只统计满足条件的视频。">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 cursor-help border-b border-dotted border-gray-400 dark:border-gray-500 inline-block">
                                                发现视频
                                            </div>
                                        </Tooltip>
                                        <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                                            {sub.total_videos}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <Tooltip content="累计已创建下载任务的视频数量（不含重复）。注意：这是已添加到下载队列的数量，不代表已下载完成。">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 cursor-help border-b border-dotted border-gray-400 dark:border-gray-500 inline-block">
                                                已下载
                                            </div>
                                        </Tooltip>
                                        <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                                            {sub.downloaded_count}
                                        </div>
                                    </div>
                                </div>

                                {/* 配置 */}
                                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 mb-4">
                                    <div className="flex items-center">
                                        <span className="text-gray-500 dark:text-gray-500 mr-2">
                                            📅
                                        </span>
                                        <span>
                                            时间范围:{" "}
                                            {formatTimeRange(sub.time_range)}
                                        </span>
                                    </div>
                                    {sub.min_digg_count && (
                                        <div className="flex items-center">
                                            <span className="text-gray-500 dark:text-gray-500 mr-2">
                                                👍
                                            </span>
                                            <span>
                                                最低点赞: {sub.min_digg_count}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center">
                                        <span className="text-gray-500 dark:text-gray-500 mr-2">
                                            ⬇️
                                        </span>
                                        <span>
                                            自动下载:{" "}
                                            {sub.auto_download
                                                ? "开启"
                                                : "关闭"}
                                        </span>
                                    </div>
                                </div>

                                {/* 上次同步 */}
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 flex items-center">
                                    <span className="mr-1">🕐</span>
                                    {sub.last_sync_time
                                        ? `上次同步: ${formatTime(sub.last_sync_time)}`
                                        : "从未同步"}
                                </div>

                                {/* 操作按钮 - 移动端优化 */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Link
                                            href={`/subscriptions/${sub.id}`}
                                            className="px-3 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 text-center transition-colors"
                                        >
                                            详情
                                        </Link>
                                        <button
                                            onClick={() =>
                                                syncSubscription(sub.id)
                                            }
                                            disabled={syncing.has(sub.id)}
                                            className="px-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {syncing.has(sub.id)
                                                ? "同步中..."
                                                : "同步"}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => openEditDialog(sub)}
                                            className="px-3 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                        >
                                            编辑
                                        </button>
                                        <button
                                            onClick={() =>
                                                toggleSubscription(
                                                    sub.id,
                                                    sub.enabled,
                                                )
                                            }
                                            className="px-3 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                                        >
                                            {sub.enabled ? "禁用" : "启用"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 对话框 */}
            {showDialog ? (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={() => {
                        setShowDialog(false);
                        resetForm();
                    }}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                            {editingId ? "编辑订阅" : "添加订阅"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    账号 sec_user_id
                                </label>
                                <input
                                    type="text"
                                    value={formData.sec_user_id}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            sec_user_id: e.target.value,
                                        })
                                    }
                                    disabled={!!editingId}
                                    placeholder="MS4wLjABAAAA..."
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    时间范围
                                </label>
                                <select
                                    value={formData.timeRange}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            timeRange: e.target.value as any,
                                        })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="one-month">
                                        最近 1 个月
                                    </option>
                                    <option value="half-year">最近半年</option>
                                    <option value="all">全部</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    最低点赞数（可选）
                                </label>
                                <input
                                    type="number"
                                    value={formData.minDiggCount || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            minDiggCount: e.target.value
                                                ? Number(e.target.value)
                                                : undefined,
                                        })
                                    }
                                    min="0"
                                    placeholder="不限制"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="autoDownload"
                                    checked={formData.autoDownload}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            autoDownload: e.target.checked,
                                        })
                                    }
                                    className="w-4 h-4"
                                />
                                <label
                                    htmlFor="autoDownload"
                                    className="text-sm text-gray-700 dark:text-gray-300"
                                >
                                    自动下载新视频
                                </label>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {submitting
                                        ? editingId
                                            ? "更新中..."
                                            : "正在验证账号..."
                                        : "确定"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDialog(false);
                                        resetForm();
                                    }}
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                >
                                    取消
                                </button>
                            </div>

                            {submitting && !editingId && (
                                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                                    <div className="flex items-center gap-2">
                                        <svg
                                            className="animate-spin h-4 w-4"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        <span>
                                            正在获取账号信息，请稍候（约需 5-10
                                            秒）...
                                        </span>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            ) : null}

            {/* 导入对话框 */}
            {showImportDialog ? (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={() => !importing && setShowImportDialog(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                            导入订阅
                        </h2>

                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                                <p className="font-medium mb-2">导入说明：</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>支持导入 JSON 格式的订阅文件</li>
                                    <li>可选择跳过或覆盖已存在的订阅</li>
                                    <li>导入过程中请勿关闭页面</li>
                                </ul>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    选择文件
                                </label>
                                <input
                                    type="file"
                                    accept=".json"
                                    id="import-file"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    disabled={importing}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    导入模式
                                </label>
                                <select
                                    id="import-mode"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    disabled={importing}
                                >
                                    <option value="skip">
                                        跳过已存在的订阅
                                    </option>
                                    <option value="overwrite">
                                        覆盖已存在的订阅
                                    </option>
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => {
                                        const fileInput =
                                            document.getElementById(
                                                "import-file",
                                            ) as HTMLInputElement;
                                        const modeSelect =
                                            document.getElementById(
                                                "import-mode",
                                            ) as HTMLSelectElement;
                                        const file = fileInput.files?.[0];
                                        const mode = modeSelect.value as
                                            | "skip"
                                            | "overwrite";

                                        if (!file) {
                                            toast.error("请选择文件");
                                            return;
                                        }

                                        handleImport(file, mode);
                                    }}
                                    disabled={importing}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {importing ? "导入中..." : "开始导入"}
                                </button>
                                <button
                                    onClick={() => setShowImportDialog(false)}
                                    disabled={importing}
                                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                >
                                    取消
                                </button>
                            </div>

                            {importing && (
                                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                                    <div className="flex items-center gap-2">
                                        <svg
                                            className="animate-spin h-4 w-4"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        <span>正在导入订阅，请稍候...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
