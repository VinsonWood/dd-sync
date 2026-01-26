"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useToast, ToastContainer } from "@/components/Toast";

interface ScheduleTask {
    id: string;
    name: string;
    type: string;
    cron_expression: string;
    enabled: number;
    last_run_time?: number;
    next_run_time?: number;
    created_at: number;
    updated_at: number;
}

interface ScheduleLog {
    id: string;
    task_id: string;
    start_time: number;
    end_time?: number;
    status: string;
    message?: string;
    details?: string;
}

export default function SchedulesPage() {
    const { toasts, toast, removeToast } = useToast();
    const [tasks, setTasks] = useState<ScheduleTask[]>([]);
    const [logs, setLogs] = useState<ScheduleLog[]>([]);
    const [schedulerRunning, setSchedulerRunning] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showTaskDialog, setShowTaskDialog] = useState(false);
    const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        type: "subscription_sync",
        cron_expression: "*/10 * * * *",
        enabled: true,
    });

    useEffect(() => {
        loadData();
        const interval = setInterval(loadLogs, 10000); // 每10秒刷新日志
        return () => clearInterval(interval);
    }, []);

    async function loadData() {
        try {
            await Promise.all([loadTasks(), loadLogs()]);
        } catch (error) {
            console.error("加载数据失败:", error);
        } finally {
            setLoading(false);
        }
    }

    async function loadTasks() {
        try {
            const response = await axios.get("/api/schedules");
            if (response.data.success) {
                setTasks(response.data.data.tasks || []);
                setSchedulerRunning(response.data.data.running || false);
            }
        } catch (error) {
            console.error("加载调度任务失败:", error);
        }
    }

    async function loadLogs() {
        try {
            const response = await axios.get("/api/schedules/logs?limit=50");
            if (response.data.success) {
                setLogs(
                    Array.isArray(response.data.data.logs)
                        ? response.data.data.logs
                        : [],
                );
            }
        } catch (error) {
            console.error("加载日志失败:", error);
        }
    }

    async function toggleScheduler(action: "start" | "stop") {
        try {
            await axios.post("/api/schedules/control", { action });
            setSchedulerRunning(action === "start");
            toast.success(`调度器已${action === "start" ? "启动" : "停止"}`);
        } catch (error: any) {
            toast.error(
                `操作失败：${error.response?.data?.error || error.message}`,
            );
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingTask) {
                // 更新任务
                await axios.patch(`/api/schedules/${editingTask.id}`, formData);
                toast.success("任务更新成功");
                setShowTaskDialog(false);
                resetForm();
                loadTasks();
            }
        } catch (error: any) {
            toast.error(
                `操作失败：${error.response?.data?.error || error.message}`,
            );
        }
    }

    function resetForm() {
        setFormData({
            name: "",
            type: "subscription_sync",
            cron_expression: "*/10 * * * *",
            enabled: true,
        });
        setEditingTask(null);
    }

    function openEditDialog(task: ScheduleTask) {
        setFormData({
            name: task.name,
            type: task.type,
            cron_expression: task.cron_expression,
            enabled: task.enabled === 1,
        });
        setEditingTask(task);
        setShowTaskDialog(true);
    }

    async function toggleTask(id: string, enabled: boolean) {
        try {
            await axios.patch(`/api/schedules/${id}`, { enabled: !enabled });
            loadTasks();
        } catch (error) {
            toast.error("操作失败");
        }
    }

    async function deleteTask(id: string, name: string) {
        if (!confirm(`确定要删除调度任务「${name}」吗？`)) return;
        try {
            await axios.delete(`/api/schedules?id=${id}`);
            loadTasks();
        } catch (error) {
            toast.error("删除失败");
        }
    }

    function formatTime(timestamp: number): string {
        return new Date(timestamp).toLocaleString("zh-CN");
    }

    function formatDuration(start: number, end?: number): string {
        if (!end) return "-";
        const duration = end - start;
        if (duration < 1000) return `${duration}ms`;
        return `${(duration / 1000).toFixed(1)}s`;
    }

    function getCronDescription(cron: string): string {
        const presets: Record<string, string> = {
            "*/10 * * * *": "每 10 分钟",
            "*/30 * * * *": "每 30 分钟",
            "0 * * * *": "每小时",
            "0 */6 * * *": "每 6 小时",
            "0 0 * * *": "每天 00:00",
        };
        return presets[cron] || cron;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
                <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-900 dark:text-white">
                    加载中...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* 调度器状态卡片 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                调度器状态
                            </h2>
                            <div className="flex items-center gap-3">
                                <span
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                        schedulerRunning
                                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                            : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                    }`}
                                >
                                    {schedulerRunning ? "● 运行中" : "○ 已停止"}
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {tasks.filter((t) => t.enabled).length}{" "}
                                    个任务已启用
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            {schedulerRunning ? (
                                <button
                                    onClick={() => toggleScheduler("stop")}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    停止调度器
                                </button>
                            ) : (
                                <button
                                    onClick={() => toggleScheduler("start")}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    启动调度器
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 调度任务列表 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            调度任务
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        任务名称
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Cron 表达式
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        状态
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        上次运行
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        下次运行
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        操作
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {tasks.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                                        >
                                            暂无调度任务
                                        </td>
                                    </tr>
                                ) : (
                                    tasks.map((task) => (
                                        <tr
                                            key={task.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {task.name}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {task.type}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 dark:text-white">
                                                    {task.cron_expression}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {getCronDescription(
                                                        task.cron_expression,
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                        task.enabled
                                                            ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200"
                                                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                                    }`}
                                                >
                                                    {task.enabled
                                                        ? "启用"
                                                        : "禁用"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                {task.last_run_time
                                                    ? formatTime(
                                                          task.last_run_time,
                                                      )
                                                    : "从未运行"}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                {task.next_run_time
                                                    ? formatTime(
                                                          task.next_run_time,
                                                      )
                                                    : "-"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() =>
                                                            openEditDialog(task)
                                                        }
                                                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                                    >
                                                        编辑
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            toggleTask(
                                                                task.id,
                                                                task.enabled ===
                                                                    1,
                                                            )
                                                        }
                                                        className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300"
                                                    >
                                                        {task.enabled
                                                            ? "禁用"
                                                            : "启用"}
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            deleteTask(
                                                                task.id,
                                                                task.name,
                                                            )
                                                        }
                                                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                                    >
                                                        删除
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 调度日志 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            调度日志
                        </h2>
                        <button
                            onClick={loadLogs}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                            刷新
                        </button>
                    </div>
                    <div
                        className="overflow-x-auto"
                        style={{ maxHeight: "500px" }}
                    >
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        任务 ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        开始时间
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        耗时
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        状态
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        消息
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                                        >
                                            暂无日志记录
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr
                                            key={log.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">
                                                {log.task_id.substring(0, 12)}
                                                ...
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                {formatTime(log.start_time)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                {formatDuration(
                                                    log.start_time,
                                                    log.end_time,
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                        log.status === "success"
                                                            ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200"
                                                            : log.status ===
                                                                "failed"
                                                              ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200"
                                                              : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200"
                                                    }`}
                                                >
                                                    {log.status === "success"
                                                        ? "成功"
                                                        : log.status ===
                                                            "failed"
                                                          ? "失败"
                                                          : "运行中"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                {log.message || "-"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* 任务对话框 */}
            {showTaskDialog && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50"
                    onClick={() => {
                        setShowTaskDialog(false);
                        resetForm();
                    }}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                            编辑任务
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    任务名称
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            name: e.target.value,
                                        })
                                    }
                                    required
                                    placeholder="订阅自动同步"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Cron 表达式
                                </label>
                                <select
                                    value={formData.cron_expression}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            cron_expression: e.target.value,
                                        })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="*/10 * * * *">
                                        每 10 分钟
                                    </option>
                                    <option value="*/30 * * * *">
                                        每 30 分钟
                                    </option>
                                    <option value="0 * * * *">每小时</option>
                                    <option value="0 */6 * * *">
                                        每 6 小时
                                    </option>
                                    <option value="0 0 * * *">
                                        每天 00:00
                                    </option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="enabled"
                                    checked={formData.enabled}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            enabled: e.target.checked,
                                        })
                                    }
                                    className="w-4 h-4"
                                />
                                <label
                                    htmlFor="enabled"
                                    className="text-sm text-gray-700 dark:text-gray-300"
                                >
                                    启用任务
                                </label>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    确定
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowTaskDialog(false);
                                        resetForm();
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                    取消
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
