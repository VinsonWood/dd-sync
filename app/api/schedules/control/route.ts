import { NextRequest, NextResponse } from "next/server";
import { startScheduler, getSchedulerStatus } from "@/lib/scheduler";
import logger from "@/lib/logger";

// 启动调度器
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action } = body;

        if (action === "start") {
            startScheduler();
            return NextResponse.json({
                success: true,
                message: "调度器已启动",
            });
        } else {
            return NextResponse.json({ error: "无效的操作" }, { status: 400 });
        }
    } catch (error: any) {
        logger.error("调度器操作失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 获取调度器状态
export async function GET() {
    const isRunning = getSchedulerStatus();
    return NextResponse.json({
        success: true,
        data: {
            status: isRunning ? "running" : "stopped",
            running: isRunning,
        },
    });
}
