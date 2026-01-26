import cron, { ScheduledTask } from "node-cron";
import * as cronParser from "cron-parser";
import db from "./db";
import logger from "./logger";
import axios from "axios";

// 使用全局变量存储调度器实例，防止热重载时重复创建
declare global {
    var schedulerTask: ScheduledTask | undefined;
}

const SCHEDULER_TASK_ID = "subscription_sync_scheduler";

// 启动调度器
export function startScheduler() {
    if (globalThis.schedulerTask) {
        logger.info("调度器已在运行（全局实例）");
        return;
    }

    logger.info("启动订阅同步调度器...");

    // 在数据库中创建或更新调度任务记录
    try {
        const existingTask = db
            .prepare("SELECT * FROM schedule_tasks WHERE id = ?")
            .get(SCHEDULER_TASK_ID);
        const now = Date.now();

        if (!existingTask) {
            // 创建新的调度任务记录
            db.prepare(
                `
        INSERT INTO schedule_tasks (
          id, name, type, cron_expression, enabled,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
            ).run(
                SCHEDULER_TASK_ID,
                "订阅同步调度器",
                "subscription_sync",
                "*/10 * * * *",
                1,
                now,
                now,
            );
            logger.info("已创建调度任务记录");
        } else {
            // 更新现有记录
            db.prepare(
                `
        UPDATE schedule_tasks
        SET enabled = 1, updated_at = ?
        WHERE id = ?
      `,
            ).run(now, SCHEDULER_TASK_ID);
            logger.info("已更新调度任务记录");
        }
    } catch (error: any) {
        logger.error("创建/更新调度任务记录失败:", error);
    }

    // 每10分钟检查一次
    globalThis.schedulerTask = cron.schedule("*/10 * * * *", async () => {
        const executionStartTime = Date.now();
        logger.info(`[${new Date().toISOString()}] 执行订阅同步检查...`);

        // 更新调度任务的运行时间和下次运行时间
        try {
            // 计算下次运行时间
            const interval = cronParser.CronExpressionParser.parse(
                "*/10 * * * *",
                {
                    currentDate: new Date(executionStartTime),
                },
            );
            const nextRunTime = interval.next().getTime();

            db.prepare(
                `
        UPDATE schedule_tasks
        SET last_run_time = ?, next_run_time = ?
        WHERE id = ?
      `,
            ).run(executionStartTime, nextRunTime, SCHEDULER_TASK_ID);
        } catch (error: any) {
            logger.error("更新调度任务运行时间失败:", error);
        }

        try {
            const now = Date.now();

            // 获取所有启用的订阅
            const subscriptions = db
                .prepare("SELECT * FROM subscriptions WHERE enabled = 1")
                .all() as any[];

            logger.info(`找到 ${subscriptions.length} 个启用的订阅`);

            for (const sub of subscriptions) {
                try {
                    logger.info(
                        `开始同步订阅: ${sub.nickname} (${sub.sec_user_id})`,
                    );

                    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const startTime = Date.now();

                    try {
                        // 调用同步 API
                        const response = await axios.post(
                            `http://localhost:3000/api/subscriptions/${sub.id}/sync`,
                            {},
                            { timeout: 120000 }, // 2分钟超时
                        );

                        const endTime = Date.now();
                        const duration = endTime - startTime;

                        if (response.data.success) {
                            const { newVideos, totalFetched, downloadedCount } =
                                response.data.data;

                            logger.info(
                                `同步完成: ${sub.nickname} - 发现 ${newVideos.length} 个新视频，下载 ${downloadedCount} 个`,
                            );

                            // 记录成功日志
                            db.prepare(
                                `
                  INSERT INTO schedule_logs (
                    id, task_id, start_time, end_time, status, message, details
                  ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                            ).run(
                                logId,
                                SCHEDULER_TASK_ID,
                                startTime,
                                endTime,
                                "success",
                                `同步 ${sub.nickname}: 发现 ${newVideos.length} 个新视频`,
                                JSON.stringify({
                                    subscription_id: sub.id,
                                    nickname: sub.nickname,
                                    newVideos: newVideos.length,
                                    totalFetched,
                                    downloadedCount,
                                    duration: `${duration}ms`,
                                }),
                            );
                        } else {
                            throw new Error(response.data.error || "同步失败");
                        }
                    } catch (error: any) {
                        const endTime = Date.now();

                        logger.error(
                            `同步失败: ${sub.nickname}`,
                            error.message,
                        );

                        // 记录失败日志
                        db.prepare(
                            `
                INSERT INTO schedule_logs (
                  id, task_id, start_time, end_time, status, message, details
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
              `,
                        ).run(
                            logId,
                            SCHEDULER_TASK_ID,
                            startTime,
                            endTime,
                            "failed",
                            `同步 ${sub.nickname} 失败: ${error.message}`,
                            JSON.stringify({
                                subscription_id: sub.id,
                                nickname: sub.nickname,
                                error: error.message,
                                stack: error.stack,
                            }),
                        );
                    }

                    // 延迟2秒，避免API限流
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                } catch (error: any) {
                    logger.error(`处理订阅 ${sub.nickname} 时出错:`, error);
                }
            }

            logger.info("订阅同步检查完成");

            // 记录成功的调度日志
            const executionEndTime = Date.now();
            const logId = `log_${executionEndTime}_${Math.random().toString(36).slice(2, 11)}`;
            try {
                db.prepare(
                    `
          INSERT INTO schedule_logs (
            id, task_id, start_time, end_time, status, message, details
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
                ).run(
                    logId,
                    SCHEDULER_TASK_ID,
                    executionStartTime,
                    executionEndTime,
                    "success",
                    `检查了 ${subscriptions.length} 个订阅`,
                    JSON.stringify({
                        subscriptions_count: subscriptions.length,
                        duration: `${executionEndTime - executionStartTime}ms`,
                    }),
                );
            } catch (error: any) {
                logger.error("记录调度日志失败:", error);
            }
        } catch (error: any) {
            logger.error("调度器执行出错:", error);

            // 记录失败的调度日志
            const executionEndTime = Date.now();
            const logId = `log_${executionEndTime}_${Math.random().toString(36).slice(2, 11)}`;
            try {
                db.prepare(
                    `
          INSERT INTO schedule_logs (
            id, task_id, start_time, end_time, status, message, details
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
                ).run(
                    logId,
                    SCHEDULER_TASK_ID,
                    executionStartTime,
                    executionEndTime,
                    "failed",
                    `调度器执行出错: ${error.message}`,
                    JSON.stringify({
                        error: error.message,
                        stack: error.stack,
                    }),
                );
            } catch (logError: any) {
                logger.error("记录失败日志失败:", logError);
            }
        }
    });

    logger.info("调度器已启动，每10分钟检查一次");
}

// 停止调度器
export function stopScheduler() {
    if (globalThis.schedulerTask) {
        globalThis.schedulerTask.stop();
        globalThis.schedulerTask = undefined;
        logger.info("调度器已停止");
    }
}

// 获取调度器状态
export function getSchedulerStatus(): boolean {
    return globalThis.schedulerTask !== undefined;
}

// 手动触发同步检查
export async function triggerSync() {
    logger.info("手动触发同步检查...");
    // 调用调度逻辑（与 cron 中相同）
    // 这里可以复用上面的逻辑或调用 API
}
