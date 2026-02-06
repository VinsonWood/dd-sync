import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import logger from "@/lib/logger";

// 获取调度日志
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const taskId = searchParams.get("task_id");
        const limit = parseInt(searchParams.get("limit") || "100");
        const offset = parseInt(searchParams.get("offset") || "0");

        let sql = `
      SELECT l.*, t.name as task_name, t.type as task_type
      FROM schedule_logs l
      LEFT JOIN schedule_tasks t ON l.task_id = t.id
    `;
        const params: any[] = [];

        if (taskId) {
            sql += " WHERE l.task_id = ?";
            params.push(taskId);
        }

        sql += " ORDER BY l.start_time DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const stmt = db.prepare(sql);
        const logs = stmt.all(...params);

        // 获取总数
        let countSql = "SELECT COUNT(*) as total FROM schedule_logs";
        if (taskId) {
            countSql += " WHERE task_id = ?";
        }
        const countStmt = db.prepare(countSql);
        const { total } = (
            taskId ? countStmt.get(taskId) : countStmt.get()
        ) as any;

        return NextResponse.json({
            success: true,
            data: {
                logs,
                total,
                limit,
                offset,
            },
        });
    } catch (error: any) {
        logger.error("查询调度日志失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 创建调度日志
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { taskId, status, message, details } = body;

        if (!taskId || !status) {
            return NextResponse.json(
                { error: "缺少必要参数" },
                { status: 400 },
            );
        }

        const now = Date.now();
        const logId = `log_${now}_${Math.random().toString(36).substr(2, 9)}`;

        const insertStmt = db.prepare(`
      INSERT INTO schedule_logs (
        id, task_id, start_time, end_time, status, message, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        insertStmt.run(
            logId,
            taskId,
            now,
            now,
            status,
            message || "",
            details || null,
        );

        const log = db
            .prepare("SELECT * FROM schedule_logs WHERE id = ?")
            .get(logId);

        return NextResponse.json({ success: true, data: log });
    } catch (error: any) {
        logger.error("创建调度日志失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
