// 应用启动时初始化调度器
import { startScheduler } from "./scheduler";
import logger from "./logger";

// 启动调度器
if (
    process.env.NODE_ENV !== "development" ||
    process.env.ENABLE_SCHEDULER === "true"
) {
    logger.info("初始化调度器...");

    // 延迟5秒启动，确保应用完全启动
    setTimeout(() => {
        startScheduler();
    }, 5000);
}

export {};
