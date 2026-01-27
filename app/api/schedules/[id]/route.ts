import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { restartScheduler } from "@/lib/scheduler";
import logger from "@/lib/logger";

// 更新调度任务
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    try {
        const body = await request.json();
        const { name, cron_expression, enabled } = body;

        const updates: string[] = [];
        const values: any[] = [];
        let cronChanged = false;

        if (name !== undefined) {
            updates.push("name = ?");
            values.push(name);
        }
        if (cron_expression !== undefined) {
            updates.push("cron_expression = ?");
            values.push(cron_expression);
            cronChanged = true;
        }
        if (enabled !== undefined) {
            updates.push("enabled = ?");
            values.push(enabled ? 1 : 0);
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { error: "没有要更新的字段" },
                { status: 400 },
            );
        }

        updates.push("updated_at = ?");
        values.push(Date.now());
        values.push(id);

        db.prepare(
            `
      UPDATE schedule_tasks
      SET ${updates.join(", ")}
      WHERE id = ?
    `,
        ).run(...values);

        const task = db
            .prepare("SELECT * FROM schedule_tasks WHERE id = ?")
            .get(id);

        // 如果修改了 cron 表达式，重启调度器以应用新配置
        if (cronChanged) {
            logger.info(
                `Cron 表达式已更新为: ${cron_expression}，重启调度器...`,
            );
            restartScheduler();
        }

        return NextResponse.json({
            success: true,
            data: task,
            message: "任务更新成功",
        });
    } catch (error: any) {
        logger.error("更新调度任务失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
