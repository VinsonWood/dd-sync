import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import logger from "@/lib/logger";

// 获取所有设置
export async function GET() {
    try {
        const stmt = db.prepare("SELECT * FROM settings");
        const settings = stmt.all();

        // 转换为对象格式
        const settingsObj: Record<string, any> = {};
        for (const setting of settings as any[]) {
            settingsObj[setting.key] = setting.value;
        }

        return NextResponse.json({ success: true, data: settingsObj });
    } catch (error: any) {
        logger.error("查询设置失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 更新设置
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { key, value } = body;

        if (!key) {
            return NextResponse.json(
                { error: "缺少 key 参数" },
                { status: 400 },
            );
        }

        const stmt = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);

        stmt.run(key, value, Date.now());

        return NextResponse.json({ success: true, message: "设置更新成功" });
    } catch (error: any) {
        logger.error("更新设置失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 批量更新设置
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const settings = body.settings;

        if (!settings || typeof settings !== "object") {
            return NextResponse.json(
                { error: "无效的设置数据" },
                { status: 400 },
            );
        }

        const stmt = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);

        const updateMany = db.transaction((settings: Record<string, any>) => {
            for (const [key, value] of Object.entries(settings)) {
                stmt.run(key, value, Date.now());
            }
        });

        updateMany(settings);

        return NextResponse.json({ success: true, message: "设置更新成功" });
    } catch (error: any) {
        logger.error("批量更新设置失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
