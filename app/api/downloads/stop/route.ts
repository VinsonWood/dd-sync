import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import logger from "@/lib/logger";

// 停止下载任务
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { task_id } = body;

        if (!task_id) {
            return NextResponse.json(
                { error: "缺少 task_id 参数" },
                { status: 400 },
            );
        }

        // 更新任务状态为 pending（停止下载）
        db.prepare(
            `
      UPDATE download_tasks
      SET status = 'pending'
      WHERE id = ? AND status = 'downloading'
    `,
        ).run(task_id);

        return NextResponse.json({ success: true, message: "任务已停止" });
    } catch (error: any) {
        logger.error("停止下载任务失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
