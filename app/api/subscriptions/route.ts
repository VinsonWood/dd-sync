import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import axios from "axios";

// 获取所有订阅
export async function GET() {
    try {
        const stmt = db.prepare(`
      SELECT * FROM subscriptions
      ORDER BY created_at DESC
    `);
        const subscriptions = stmt.all();

        return NextResponse.json({ success: true, data: subscriptions });
    } catch (error: any) {
        console.error("查询订阅列表失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 创建订阅
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            sec_user_id,
            timeRange = "one-month",
            minDiggCount,
            autoDownload = true,
        } = body;

        if (!sec_user_id) {
            return NextResponse.json(
                { error: "缺少 sec_user_id 参数" },
                { status: 400 },
            );
        }

        // 检查是否已存在
        const existing = db
            .prepare("SELECT * FROM subscriptions WHERE sec_user_id = ?")
            .get(sec_user_id);
        if (existing) {
            return NextResponse.json(
                { error: "该账号已添加订阅" },
                { status: 400 },
            );
        }

        // 获取账号信息
        const apiBaseUrl =
            (
                db
                    .prepare("SELECT value FROM settings WHERE key = ?")
                    .get("api_base_url") as any
            )?.value || "http://192.168.60.20:5555";

        // 计算时间范围参数
        const dateParams = getDateRangeParams(timeRange);

        const apiParams = {
            sec_user_id,
            cursor: 0,
            count: 1, // 只获取 1 个视频即可，减少数据传输
            ...dateParams, // 添加时间范围参数
        };

        console.log(`正在获取账号信息: ${sec_user_id}...`);
        console.log(`API 请求地址: ${apiBaseUrl}/douyin/account`);
        console.log(`API 请求参数:`, JSON.stringify(apiParams, null, 2));
        const startTime = Date.now();

        const response = await axios.post(
            `${apiBaseUrl}/douyin/account`,
            apiParams,
            {
                timeout: 60000, // 增加到 60秒超时
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );

        const elapsed = Date.now() - startTime;
        console.log(`账号信息获取完成，耗时: ${elapsed}ms`);
        console.log(`API 响应数据:`, JSON.stringify(response.data, null, 2));

        // 如果响应时间超过 5 秒，给出警告
        if (elapsed > 5000) {
            console.warn(
                `⚠️  TikTokDownloader API 响应较慢 (${elapsed}ms)，建议检查 API 服务状态`,
            );
        }

        if (
            !response.data?.message?.includes("成功") ||
            !response.data?.data ||
            response.data.data.length === 0
        ) {
            return NextResponse.json(
                { error: "获取账号信息失败或账号无作品" },
                { status: 400 },
            );
        }

        const firstVideo = response.data.data[0];
        const now = Date.now();
        const subscriptionId = `sub_${now}_${Math.random().toString(36).substr(2, 9)}`;

        // 插入订阅
        const insertStmt = db.prepare(`
      INSERT INTO subscriptions (
        id, sec_user_id, nickname, avatar, enabled,
        time_range, min_digg_count, auto_download, last_video_id,
        created_at, updated_at, total_videos, downloaded_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        insertStmt.run(
            subscriptionId,
            sec_user_id,
            firstVideo.nickname || "未知用户",
            firstVideo.static_cover || null,
            1, // enabled
            timeRange,
            minDiggCount || null,
            autoDownload ? 1 : 0,
            null, // last_video_id - 初始为 NULL，首次同步时会获取所有视频
            now,
            now,
            0, // total_videos
            0, // downloaded_count
        );

        const subscription = db
            .prepare("SELECT * FROM subscriptions WHERE id = ?")
            .get(subscriptionId);

        return NextResponse.json({
            success: true,
            data: subscription,
            message: "订阅添加成功",
        });
    } catch (error: any) {
        console.error("创建订阅失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 删除订阅
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "缺少订阅 ID" }, { status: 400 });
        }

        db.prepare("DELETE FROM subscriptions WHERE id = ?").run(id);
        // 同步历史会通过外键级联删除

        return NextResponse.json({ success: true, message: "订阅删除成功" });
    } catch (error: any) {
        console.error("删除订阅失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 辅助函数：根据时间范围生成日期参数
function getDateRangeParams(timeRange: string) {
    if (timeRange === "all") {
        return {};
    }

    const now = new Date();
    const latest = formatDateForApi(now);

    let earliest: string;
    if (timeRange === "one-month") {
        const oneMonthAgo = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            now.getDate(),
        );
        earliest = formatDateForApi(oneMonthAgo);
    } else {
        const sixMonthsAgo = new Date(
            now.getFullYear(),
            now.getMonth() - 6,
            now.getDate(),
        );
        earliest = formatDateForApi(sixMonthsAgo);
    }

    return { earliest, latest };
}

function formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
}
