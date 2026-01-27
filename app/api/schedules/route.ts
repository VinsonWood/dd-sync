import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSchedulerStatus, calculateNextRunTime } from "@/lib/scheduler";
import logger from "@/lib/logger";

// 获取所有调度任务（系统固定任务，不支持创建/删除）
export async function GET() {
    try {
        const stmt = db.prepare(`
      SELECT * FROM schedule_tasks
      ORDER BY created_at DESC
    `);
        const tasks = stmt.all() as any[];
        const running = getSchedulerStatus();

        // 实时计算每个任务的下次运行时间
        const tasksWithNextRun = tasks.map((task) => {
            const nextRunTime = calculateNextRunTime(
                task.cron_expression,
                task.last_run_time,
            );
            return {
                ...task,
                next_run_time: nextRunTime,
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                tasks: tasksWithNextRun,
                running,
            },
        });
    } catch (error: any) {
        logger.error("查询调度任务失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
