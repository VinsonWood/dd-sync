import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import logger from "@/lib/logger";

// 获取指定订阅的所有视频任务
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    try {
        // 1. 获取订阅信息
        const subscription = db
            .prepare("SELECT * FROM subscriptions WHERE id = ?")
            .get(id) as any;

        if (!subscription) {
            return NextResponse.json({ error: "订阅不存在" }, { status: 404 });
        }

        // 2. 获取该订阅的所有视频任务
        const tasks = db
            .prepare(
                `
      SELECT *
      FROM download_tasks
      WHERE sec_user_id = ?
      ORDER BY created_at DESC
    `,
            )
            .all(subscription.sec_user_id) as any[];

        // 3. 合并实时进度数据
        const globalProgress = (globalThis as any).downloadProgress || {};
        const tasksWithProgress = tasks.map((task: any) => {
            const realtimeData = globalProgress[task.id];
            if (realtimeData && realtimeData.updatedAt > Date.now() - 5000) {
                return {
                    ...task,
                    realtimeProgress: realtimeData,
                };
            }
            return task;
        });

        // 4. 统计各状态数量
        const stats = {
            total: tasks.length,
            pending: tasks.filter((t: any) => t.status === "pending").length,
            downloading: tasks.filter((t: any) => t.status === "downloading")
                .length,
            completed: tasks.filter((t: any) => t.status === "completed")
                .length,
            failed: tasks.filter((t: any) => t.status === "failed").length,
        };

        // 5. 同步订阅的 downloaded_count 与实际的 completed 数量
        if (subscription.downloaded_count !== stats.completed) {
            db.prepare(
                `
        UPDATE subscriptions
        SET downloaded_count = ?,
            updated_at = ?
        WHERE id = ?
      `,
            ).run(stats.completed, Date.now(), id);

            // 更新返回的订阅对象
            subscription.downloaded_count = stats.completed;
        }

        return NextResponse.json({
            success: true,
            data: {
                subscription,
                tasks: tasksWithProgress,
                stats,
            },
        });
    } catch (error: any) {
        logger.error("获取订阅视频失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
