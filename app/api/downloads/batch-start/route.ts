import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import axios from "axios";
import logger from "@/lib/logger";

// 批量启动下载任务
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { status = "downloading" } = body;

        // 查询指定状态的所有任务
        const tasks = db
            .prepare(
                `
      SELECT id FROM download_tasks WHERE status = ?
    `,
            )
            .all(status) as any[];

        logger.info(`找到 ${tasks.length} 个状态为 ${status} 的任务`);

        const results = {
            total: tasks.length,
            success: 0,
            failed: 0,
            errors: [] as string[],
        };

        // 逐个触发下载
        for (const task of tasks) {
            try {
                await axios.post(
                    "http://localhost:3000/api/downloads/start",
                    {
                        task_id: task.id,
                    },
                    { timeout: 120000 },
                );

                results.success++;
                logger.info(`✓ 已触发任务: ${task.id}`);
            } catch (error: any) {
                results.failed++;
                results.errors.push(`${task.id}: ${error.message}`);
                logger.error(`✗ 触发失败: ${task.id}`, error.message);
            }

            // 延迟避免并发过多
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        return NextResponse.json({
            success: true,
            data: results,
            message: `已触发 ${results.success} 个任务，失败 ${results.failed} 个`,
        });
    } catch (error: any) {
        logger.error("批量启动下载失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
