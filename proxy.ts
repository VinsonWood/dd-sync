import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 抑制 Next.js 默认的请求日志
export function proxy(request: NextRequest) {
  // 直接返回，不做任何处理
  return NextResponse.next();
}

// 匹配所有路由
export const config = {
  matcher: '/:path*',
};
