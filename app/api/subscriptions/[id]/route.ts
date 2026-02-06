import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import logger from "@/lib/logger";

// 更新订阅
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { enabled, timeRange, minDiggCount, autoDownload } = body;

        const updates: string[] = [];
        const values: any[] = [];

        if (enabled !== undefined) {
            updates.push("enabled = ?");
            values.push(enabled ? 1 : 0);
        }
        if (timeRange !== undefined) {
            updates.push("time_range = ?");
            values.push(timeRange);
        }
        if (minDiggCount !== undefined) {
            updates.push("min_digg_count = ?");
            values.push(minDiggCount);
        }
        if (autoDownload !== undefined) {
            updates.push("auto_download = ?");
            values.push(autoDownload ? 1 : 0);
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { error: "没有可更新的字段" },
                { status: 400 },
            );
        }

        updates.push("updated_at = ?");
        values.push(Date.now());
        values.push(id);

        const sql = `UPDATE subscriptions SET ${updates.join(", ")} WHERE id = ?`;
        db.prepare(sql).run(...values);

        const subscription = db
            .prepare("SELECT * FROM subscriptions WHERE id = ?")
            .get(id);

        return NextResponse.json({
            success: true,
            data: subscription,
            message: "订阅更新成功",
        });
    } catch (error: any) {
        logger.error("更新订阅失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
