"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { useToast, ToastContainer } from "@/components/Toast";

// 图集轮播组件
function ImageCarousel({ urls, alt }: { urls: string[]; alt: string }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);

    const goToPrevious = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? urls.length - 1 : prev - 1));
    };

    const goToNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === urls.length - 1 ? 0 : prev + 1));
    };

    // 触摸滑动支持
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        if (isLeftSwipe) {
            setCurrentIndex((prev) =>
                prev === urls.length - 1 ? 0 : prev + 1,
            );
        }
        if (isRightSwipe) {
            setCurrentIndex((prev) =>
                prev === 0 ? urls.length - 1 : prev - 1,
            );
        }

        setTouchStart(0);
        setTouchEnd(0);
    };

    if (urls.length === 0) return null;

    return (
        <div
            className="relative w-full sm:w-32 h-48 sm:h-24 group"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <img
                src={urls[currentIndex]}
                alt={`${alt} - ${currentIndex + 1}`}
                className="w-full h-full object-cover rounded select-none"
                draggable={false}
            />

            {/* 左右切换按钮 */}
            {urls.length > 1 && (
                <>
                    <button
                        onClick={goToPrevious}
                        className="absolute left-2 sm:left-1 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 sm:w-6 sm:h-6 flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-all text-xl sm:text-base z-10 shadow-lg active:scale-95"
                        aria-label="上一张"
                    >
                        ‹
                    </button>
                    <button
                        onClick={goToNext}
                        className="absolute right-2 sm:right-1 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 sm:w-6 sm:h-6 flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-all text-xl sm:text-base z-10 shadow-lg active:scale-95"
                        aria-label="下一张"
                    >
                        ›
                    </button>

                    {/* 指示器 - 移动端可点击切换 */}
                    <div className="absolute bottom-2 sm:bottom-1 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10 bg-black/30 px-2 py-1 rounded-full">
                        {urls.map((_, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentIndex(index);
                                }}
                                className={`w-2 h-2 sm:w-1.5 sm:h-1.5 rounded-full transition-all ${
                                    index === currentIndex
                                        ? "bg-white scale-125"
                                        : "bg-white/50 hover:bg-white/70"
                                }`}
                                aria-label={`切换到第 ${index + 1} 张`}
                            />
                        ))}
                    </div>

                    {/* 图片计数 */}
                    <div className="absolute top-2 sm:top-1 right-2 sm:right-1 bg-black/60 text-white text-xs font-medium px-2 py-1 sm:px-1.5 sm:py-0.5 rounded shadow-lg">
                        {currentIndex + 1}/{urls.length}
                    </div>
                </>
            )}
        </div>
    );
}

interface Subscription {
    id: string;
    sec_user_id: string;
    nickname: string;
    avatar?: string;
    enabled: boolean;
    sync_interval: number;
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

interface VideoTask {
    id: string;
    video_id: string;
    sec_user_id: string;
    type: string;
    desc: string;
    author_nickname: string;
    author_uid: string;
    cover_url: string;
    download_url: string;
    all_download_urls: string;
    duration: string;
    digg_count: number;
    comment_count: number;
    share_count: number;
    create_time: string;
    status: string;
    progress: number;
    error?: string;
    file_path?: string;
    file_size: number;
    created_at: number;
    completed_at?: number;
    realtimeProgress?: {
        progress: number;
        downloadedBytes: number;
        totalBytes: number;
        speed: number;
        updatedAt: number;
    };
}

interface Stats {
    total: number;
    pending: number;
    downloading: number;
    completed: number;
    failed: number;
}

export default function SubscriptionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { toasts, toast, removeToast } = useToast();

    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [tasks, setTasks] = useState<VideoTask[]>([]);
    const [stats, setStats] = useState<Stats>({
        total: 0,
        pending: 0,
        downloading: 0,
        completed: 0,
        failed: 0,
    });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [deleteFiles, setDeleteFiles] = useState(false);
    const [showImages, setShowImages] = useState(true);

    useEffect(() => {
        loadData();
        loadSettings();
        const interval = setInterval(loadData, 3000);
        return () => clearInterval(interval);
    }, [id]);

    async function loadSettings() {
        try {
            const response = await axios.get("/api/settings");
            if (response.data.success) {
                setShowImages(response.data.data.showImages === "true");
            }
        } catch (error) {
            console.error("加载设置失败:", error);
        }
    }

    async function loadData() {
        try {
            const response = await axios.get(`/api/subscriptions/${id}/videos`);
            if (response.data.success) {
                setSubscription(response.data.data.subscription);
                setTasks(response.data.data.tasks);
                setStats(response.data.data.stats);
            }
        } catch (error: any) {
            console.error("加载数据失败:", error);
            if (error.response?.status === 404) {
                toast.error("订阅不存在");
                router.push("/subscriptions");
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleSync() {
        if (syncing) return;

        setSyncing(true);
        try {
            const response = await axios.post(`/api/subscriptions/${id}/sync`);
            if (response.data.success) {
                toast.success(
                    `同步完成！新增 ${response.data.data.downloadedCount} 个下载任务`,
                );
                await loadData();
            }
        } catch (error: any) {
            console.error("同步失败:", error);
            toast.error(
                `同步失败: ${error.response?.data?.error || error.message}`,
            );
        } finally {
            setSyncing(false);
        }
    }

    async function handleClear() {
        if (clearing) return;

        setClearing(true);
        try {
            const response = await axios.post(
                `/api/subscriptions/${id}/clear`,
                {
                    deleteFiles,
                },
            );
            if (response.data.success) {
                const { deletedRecords, deletedFiles } = response.data.data;
                toast.success(
                    `清除完成！删除了 ${deletedRecords} 条记录${deleteFiles ? `，${deletedFiles} 个文件` : ""}`,
                );
                setShowClearDialog(false);
                setDeleteFiles(false);
                await loadData();
            }
        } catch (error: any) {
            console.error("清除失败:", error);
            toast.error(
                `清除失败: ${error.response?.data?.error || error.message}`,
            );
        } finally {
            setClearing(false);
        }
    }

    function formatFileSize(bytes: number): string {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }

    function formatDate(timestamp: number): string {
        return new Date(timestamp).toLocaleString("zh-CN");
    }

    function getStatusBadge(status: string) {
        const badges: Record<string, { text: string; color: string }> = {
            pending: { text: "等待中", color: "bg-gray-500" },
            downloading: { text: "下载中", color: "bg-blue-500" },
            completed: { text: "已完成", color: "bg-green-500" },
            failed: { text: "失败", color: "bg-red-500" },
        };
        const badge = badges[status] || { text: status, color: "bg-gray-500" };
        return (
            <span
                className={`px-2 py-1 text-xs rounded ${badge.color} text-white`}
            >
                {badge.text}
            </span>
        );
    }

    const filteredTasks =
        statusFilter === "all"
            ? tasks
            : tasks.filter((t) => t.status === statusFilter);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <div className="text-gray-600 dark:text-gray-400">
                            加载中...
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <div className="text-red-600 dark:text-red-400">
                            订阅不存在
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pt-20 sm:pt-8">
                {/* 返回按钮 */}
                <div className="mb-6">
                    <Link
                        href="/subscriptions"
                        className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                        ← 返回订阅列表
                    </Link>
                </div>
                {/* 订阅信息卡片 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6">
                    <div className="flex flex-col space-y-4">
                        {/* 统计信息 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
                                    同步间隔
                                </div>
                                <div className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                                    {subscription.sync_interval} 分钟
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
                                    时间范围
                                </div>
                                <div className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                                    {subscription.time_range === "all" &&
                                        "全部"}
                                    {subscription.time_range === "half-year" &&
                                        "最近半年"}
                                    {subscription.time_range === "one-month" &&
                                        "最近一月"}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
                                    发现视频
                                </div>
                                <div className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                                    {subscription.total_videos}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
                                    已下载
                                </div>
                                <div className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                                    {subscription.downloaded_count}
                                </div>
                            </div>
                        </div>

                        {/* 上次同步时间 */}
                        {subscription.last_sync_time && (
                            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                <span className="mr-1">🕐</span>
                                上次同步:{" "}
                                {formatDate(subscription.last_sync_time)}
                            </div>
                        )}

                        {/* 操作按钮 */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className="flex-1 px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base font-medium transition-colors shadow-sm active:scale-[0.98]"
                            >
                                {syncing ? "同步中..." : "立即同步"}
                            </button>
                            <button
                                onClick={() => setShowClearDialog(true)}
                                className="flex-1 px-4 sm:px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm sm:text-base font-medium transition-colors shadow-sm active:scale-[0.98]"
                            >
                                清除记录
                            </button>
                        </div>
                    </div>
                </div>

                {/* 统计卡片 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
                    <button
                        onClick={() => setStatusFilter("all")}
                        className={`bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 text-center hover:shadow-md transition-all active:scale-95 ${
                            statusFilter === "all"
                                ? "ring-2 ring-blue-500 shadow-md"
                                : ""
                        }`}
                    >
                        <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.total}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            全部
                        </div>
                    </button>
                    <button
                        onClick={() => setStatusFilter("pending")}
                        className={`bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 text-center hover:shadow-md transition-all active:scale-95 ${
                            statusFilter === "pending"
                                ? "ring-2 ring-blue-500 shadow-md"
                                : ""
                        }`}
                    >
                        <div className="text-xl sm:text-2xl font-bold text-gray-500 dark:text-gray-400">
                            {stats.pending}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            等待中
                        </div>
                    </button>
                    <button
                        onClick={() => setStatusFilter("downloading")}
                        className={`bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 text-center hover:shadow-md transition-all active:scale-95 ${
                            statusFilter === "downloading"
                                ? "ring-2 ring-blue-500 shadow-md"
                                : ""
                        }`}
                    >
                        <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {stats.downloading}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            下载中
                        </div>
                    </button>
                    <button
                        onClick={() => setStatusFilter("completed")}
                        className={`bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 text-center hover:shadow-md transition-all active:scale-95 ${
                            statusFilter === "completed"
                                ? "ring-2 ring-blue-500 shadow-md"
                                : ""
                        }`}
                    >
                        <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                            {stats.completed}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            已完成
                        </div>
                    </button>
                    <button
                        onClick={() => setStatusFilter("failed")}
                        className={`bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 text-center hover:shadow-md transition-all active:scale-95 col-span-2 sm:col-span-1 ${
                            statusFilter === "failed"
                                ? "ring-2 ring-blue-500 shadow-md"
                                : ""
                        }`}
                    >
                        <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                            {stats.failed}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            失败
                        </div>
                    </button>
                </div>

                {/* 视频列表 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            视频列表 ({filteredTasks.length})
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredTasks.length === 0 ? (
                            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                暂无视频
                            </div>
                        ) : (
                            filteredTasks.map((task) => {
                                // 解析图集的所有图片 URL
                                const imageUrls =
                                    task.type === "图集" &&
                                    task.all_download_urls
                                        ? task.all_download_urls
                                              .split(",")
                                              .map((url) => url.trim())
                                              .filter(Boolean)
                                        : [];

                                return (
                                    <div
                                        key={task.id}
                                        className="px-3 sm:px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
                                            {/* 封面/轮播 - 根据设置显示 */}
                                            {showImages && (
                                                <>
                                                    {task.type === "图集" &&
                                                    imageUrls.length > 0 ? (
                                                        <ImageCarousel
                                                            urls={imageUrls}
                                                            alt={
                                                                task.desc ||
                                                                "图集"
                                                            }
                                                        />
                                                    ) : task.cover_url ? (
                                                        <img
                                                            src={task.cover_url}
                                                            alt={
                                                                task.desc ||
                                                                "视频封面"
                                                            }
                                                            className="w-full sm:w-32 h-48 sm:h-24 object-cover rounded flex-shrink-0"
                                                            onError={(e) => {
                                                                const target =
                                                                    e.target as HTMLImageElement;
                                                                target.style.display =
                                                                    "none";
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full sm:w-32 h-48 sm:h-24 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                                                            <span className="text-gray-400 dark:text-gray-500 text-xs">
                                                                无封面
                                                            </span>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* 信息 */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 sm:truncate">
                                                            {task.desc ||
                                                                "无标题"}
                                                        </h3>
                                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                                            <span>
                                                                {task.type}
                                                            </span>
                                                            {task.type ===
                                                                "图集" &&
                                                                imageUrls.length >
                                                                    0 && (
                                                                    <span>
                                                                        📷{" "}
                                                                        {
                                                                            imageUrls.length
                                                                        }{" "}
                                                                        张
                                                                    </span>
                                                                )}
                                                            {task.duration && (
                                                                <span>
                                                                    {
                                                                        task.duration
                                                                    }
                                                                </span>
                                                            )}
                                                            <span>
                                                                👍{" "}
                                                                {
                                                                    task.digg_count
                                                                }
                                                            </span>
                                                            <span>
                                                                💬{" "}
                                                                {
                                                                    task.comment_count
                                                                }
                                                            </span>
                                                            <span className="hidden sm:inline">
                                                                {
                                                                    task.create_time
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="sm:ml-4 self-start">
                                                        {getStatusBadge(
                                                            task.status,
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 进度条 */}
                                                {task.status ===
                                                    "downloading" && (
                                                    <div className="mt-2">
                                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                            <span>
                                                                {task.realtimeProgress
                                                                    ? `${formatFileSize(task.realtimeProgress.downloadedBytes)} / ${formatFileSize(task.realtimeProgress.totalBytes)}`
                                                                    : `${task.progress}%`}
                                                            </span>
                                                            {task.realtimeProgress && (
                                                                <span>
                                                                    {formatFileSize(
                                                                        task
                                                                            .realtimeProgress
                                                                            .speed,
                                                                    )}
                                                                    /s
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                            <div
                                                                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                                                                style={{
                                                                    width: `${task.realtimeProgress?.progress || task.progress}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 已完成信息 */}
                                                {task.status === "completed" &&
                                                    task.file_size > 0 && (
                                                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                            文件大小:{" "}
                                                            {formatFileSize(
                                                                task.file_size,
                                                            )}
                                                        </div>
                                                    )}

                                                {/* 错误信息 */}
                                                {task.status === "failed" &&
                                                    task.error && (
                                                        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                                                            错误: {task.error}
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* 清除记录确认对话框 */}
            {showClearDialog && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={() => {
                        if (!clearing) {
                            setShowClearDialog(false);
                            setDeleteFiles(false);
                        }
                    }}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            清除下载记录
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            确定要清除该订阅下的所有下载记录吗？此操作不可恢复。
                        </p>

                        {/* 删除文件选项 */}
                        <div className="mb-6">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={deleteFiles}
                                    onChange={(e) =>
                                        setDeleteFiles(e.target.checked)
                                    }
                                    disabled={clearing}
                                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    同时删除已下载的文件
                                </span>
                            </label>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 ml-6">
                                勾选此项将永久删除所有已下载的视频和图片文件
                            </p>
                        </div>

                        {/* 统计信息 */}
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded">
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                <div>
                                    将删除{" "}
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {stats.total}
                                    </span>{" "}
                                    条记录
                                </div>
                                {deleteFiles && stats.completed > 0 && (
                                    <div className="text-red-600 dark:text-red-400">
                                        将删除{" "}
                                        <span className="font-semibold">
                                            {stats.completed}
                                        </span>{" "}
                                        个已完成任务的文件
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 按钮 */}
                        <div className="flex gap-4">
                            <button
                                onClick={handleClear}
                                disabled={clearing}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {clearing ? "清除中..." : "确认清除"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowClearDialog(false);
                                    setDeleteFiles(false);
                                }}
                                disabled={clearing}
                                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
