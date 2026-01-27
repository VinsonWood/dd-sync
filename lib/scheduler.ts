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

    // 从数据库读取调度任务配置
    let cronExpression = "*/10 * * * *"; // 默认值
    try {
        const existingTask = db
            .prepare("SELECT * FROM schedule_tasks WHERE id = ?")
            .get(SCHEDULER_TASK_ID) as any;
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
                cronExpression,
                1,
                now,
                now,
            );
            logger.info("已创建调度任务记录");
        } else {
            // 使用数据库中的 cron 表达式
            cronExpression = existingTask.cron_expression || cronExpression;
            // 更新现有记录
            db.prepare(
                `
        UPDATE schedule_tasks
        SET enabled = 1, updated_at = ?
        WHERE id = ?
      `,
            ).run(now, SCHEDULER_TASK_ID);
            logger.info(
                `已更新调度任务记录，使用 cron 表达式: ${cronExpression}`,
            );
        }
    } catch (error: any) {
        logger.error("创建/更新调度任务记录失败:", error);
    }

    // 使用从数据库读取的 cron 表达式
    globalThis.schedulerTask = cron.schedule(cronExpression, async () => {
        const executionStartTime = Date.now();
        logger.info(`[${new Date().toISOString()}] 执行订阅同步检查...`);

        // 更新调度任务的上次运行时间
        try {
            db.prepare(
                `UPDATE schedule_tasks SET last_run_time = ? WHERE id = ?`,
            ).run(executionStartTime, SCHEDULER_TASK_ID);
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

    logger.info(`调度器已启动，cron 表达式: ${cronExpression}`);
}

// 重启调度器（用于应用新的 cron 表达式）
export function restartScheduler() {
    logger.info("重启调度器以应用新配置...");

    // 停止现有调度器
    if (globalThis.schedulerTask) {
        globalThis.schedulerTask.stop();
        globalThis.schedulerTask = undefined;
        logger.info("已停止旧的调度器实例");
    }

    // 启动新的调度器
    startScheduler();
}

// 获取调度器状态
export function getSchedulerStatus(): boolean {
    return globalThis.schedulerTask !== undefined;
}

// 计算下次运行时间
export function calculateNextRunTime(
    cronExpression: string,
    lastRunTime?: number,
): number | null {
    try {
        const baseTime = lastRunTime ? new Date(lastRunTime) : new Date();
        const interval = cronParser.CronExpressionParser.parse(cronExpression, {
            currentDate: baseTime,
        });
        return interval.next().getTime();
    } catch (error: any) {
        logger.error("计算下次运行时间失败:", error);
        return null;
    }
}
