// WebSocket 功能已移除，改用轮询方式获取下载进度
export const dynamic = "force-static";

export async function GET() {
    return new Response("WebSocket 功能已移除", { status: 410 });
}
