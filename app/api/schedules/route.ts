import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSchedulerStatus } from '@/lib/scheduler';

// 获取所有调度任务（系统固定任务，不支持创建/删除）
export async function GET() {
  try {
    const stmt = db.prepare(`
      SELECT * FROM schedule_tasks
      ORDER BY created_at DESC
    `);
    const tasks = stmt.all();
    const running = getSchedulerStatus();

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        running
      }
    });
  } catch (error: any) {
    console.error('查询调度任务失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
