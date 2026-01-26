import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// 调试端点：查看数据库中的任务状态
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sec_user_id = searchParams.get('sec_user_id');

    if (!sec_user_id) {
      // 显示所有任务的状态分布
      const allStatus = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM download_tasks
        GROUP BY status
      `).all();

      const allTasks = db.prepare(`
        SELECT dt.*, v.desc, v.author_nickname, v.sec_user_id
        FROM download_tasks dt
        LEFT JOIN videos v ON dt.video_id = v.id
        ORDER BY dt.created_at DESC
        LIMIT 50
      `).all();

      return NextResponse.json({
        success: true,
        data: {
          statusDistribution: allStatus,
          recentTasks: allTasks
        }
      });
    } else {
      // 显示特定用户的任务
      const statusDistribution = db.prepare(`
        SELECT dt.status, COUNT(*) as count
        FROM download_tasks dt
        LEFT JOIN videos v ON dt.video_id = v.id
        WHERE v.sec_user_id = ?
        GROUP BY dt.status
      `).all(sec_user_id);

      const tasks = db.prepare(`
        SELECT dt.*, v.desc, v.author_nickname
        FROM download_tasks dt
        LEFT JOIN videos v ON dt.video_id = v.id
        WHERE v.sec_user_id = ?
        ORDER BY dt.created_at DESC
      `).all(sec_user_id);

      return NextResponse.json({
        success: true,
        data: {
          sec_user_id,
          statusDistribution,
          tasks
        }
      });
    }
  } catch (error: any) {
    console.error('查询调试信息失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
