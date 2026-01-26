import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import axios from "axios";

// 获取视频列表
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const secUserId = searchParams.get("sec_user_id");

    if (!secUserId) {
        return NextResponse.json(
            { error: "缺少 sec_user_id 参数" },
            { status: 400 },
        );
    }

    try {
        // 从下载任务表查询视频
        const stmt = db.prepare(`
      SELECT * FROM download_tasks
      WHERE sec_user_id = ?
      ORDER BY create_time DESC
    `);
        const videos = stmt.all(secUserId);

        return NextResponse.json({ success: true, data: videos });
    } catch (error: any) {
        console.error("查询视频失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 从抖音 API 获取并保存视频
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sec_user_id, earliest, latest } = body;

        if (!sec_user_id) {
            return NextResponse.json(
                { error: "缺少 sec_user_id 参数" },
                { status: 400 },
            );
        }

        // 获取 API 配置
        const apiBaseUrl = db
            .prepare("SELECT value FROM settings WHERE key = ?")
            .get("api_base_url") as any;
        const apiToken = db
            .prepare("SELECT value FROM settings WHERE key = ?")
            .get("api_token") as any;

        // 调用抖音下载器 API - 不使用分页，获取所有作品
        const requestBody: any = {
            sec_user_id,
            cursor: 0,
            count: 999, // 设置一个大数值以获取所有作品
            tab: "post",
            cookie: "",
            source: false,
        };

        if (earliest) requestBody.earliest = earliest;
        if (latest) requestBody.latest = latest;

        const response = await axios.post(
            `${apiBaseUrl?.value || "http://192.168.60.20:5555"}/douyin/account`,
            requestBody,
            {
                headers: {
                    "Content-Type": "application/json",
                    ...(apiToken?.value && { token: apiToken.value }),
                },
            },
        );

        if (!response.data.message?.includes("成功")) {
            return NextResponse.json(
                { error: response.data.message || "获取视频失败" },
                { status: 500 },
            );
        }

        const videos = response.data.data || [];

        // 直接返回 API 数据，不再保存到数据库
        return NextResponse.json({
            success: true,
            data: videos,
            message: "获取数据成功",
        });
    } catch (error: any) {
        console.error("获取视频失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
