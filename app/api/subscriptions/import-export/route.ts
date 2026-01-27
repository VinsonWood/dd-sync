import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// 导出订阅
export async function GET() {
    try {
        const subscriptions = db
            .prepare('SELECT * FROM subscriptions ORDER BY created_at DESC')
            .all();

        // 返回 JSON 文件
        return new NextResponse(JSON.stringify(subscriptions, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="dd-sync-subscriptions-${Date.now()}.json"`,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// 导入订阅
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { subscriptions, mode = 'skip' } = body; // mode: 'skip' | 'overwrite'

        if (!Array.isArray(subscriptions)) {
            return NextResponse.json(
                { success: false, error: '无效的数据格式' },
                { status: 400 }
            );
        }

        const results = {
            total: subscriptions.length,
            success: 0,
            skipped: 0,
            failed: 0,
            errors: [] as string[],
        };

        for (const sub of subscriptions) {
            try {
                // 验证必需字段
                if (!sub.sec_user_id) {
                    results.failed++;
                    results.errors.push(`缺少 sec_user_id`);
                    continue;
                }

                // 检查是否已存在
                const existing = db
                    .prepare('SELECT id FROM subscriptions WHERE sec_user_id = ?')
                    .get(sub.sec_user_id);

                if (existing) {
                    if (mode === 'skip') {
                        results.skipped++;
                        continue;
                    } else if (mode === 'overwrite') {
                        // 更新现有订阅
                        db.prepare(
                            `UPDATE subscriptions SET
                                nickname = ?,
                                avatar = ?,
                                enabled = ?,
                                sync_interval = ?,
                                time_range = ?,
                                min_digg_count = ?,
                                auto_download = ?,
                                updated_at = ?
                            WHERE sec_user_id = ?`
                        ).run(
                            sub.nickname || null,
                            sub.avatar || null,
                            sub.enabled ?? 1,
                            sub.sync_interval || 60,
                            sub.time_range || 'one-month',
                            sub.min_digg_count || null,
                            sub.auto_download ?? 1,
                            Date.now(),
                            sub.sec_user_id
                        );
                        results.success++;
                        continue;
                    }
                }

                // 创建新订阅
                const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const now = Date.now();

                db.prepare(
                    `INSERT INTO subscriptions (
                        id, sec_user_id, nickname, avatar, enabled,
                        sync_interval, time_range, min_digg_count, auto_download,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).run(
                    id,
                    sub.sec_user_id,
                    sub.nickname || null,
                    sub.avatar || null,
                    sub.enabled ?? 1,
                    sub.sync_interval || 60,
                    sub.time_range || 'one-month',
                    sub.min_digg_count || null,
                    sub.auto_download ?? 1,
                    now,
                    now
                );

                results.success++;
            } catch (error: any) {
                results.failed++;
                results.errors.push(`${sub.sec_user_id || '未知'}: ${error.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            data: results,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
