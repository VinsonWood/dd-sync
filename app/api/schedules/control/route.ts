import { NextRequest, NextResponse } from 'next/server';
import { startScheduler, stopScheduler } from '@/lib/scheduler';

// 启动调度器
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      startScheduler();
      return NextResponse.json({ success: true, message: '调度器已启动' });
    } else if (action === 'stop') {
      stopScheduler();
      return NextResponse.json({ success: true, message: '调度器已停止' });
    } else {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('调度器操作失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 获取调度器状态
export async function GET() {
  // 这里可以添加获取调度器状态的逻辑
  return NextResponse.json({
    success: true,
    data: {
      status: 'running', // 可以从某个状态管理中获取
      lastCheck: Date.now(),
    }
  });
}
