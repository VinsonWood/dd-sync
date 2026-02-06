import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import axios from "axios";
import fs from "fs";
import path from "path";
import logger from "@/lib/logger";

// 更新已下载文件的文件大小
async function updateDownloadedFilesSize() {
    try {
        const tasks = db
            .prepare(
                `
      SELECT id, file_path
      FROM download_tasks
      WHERE status = 'completed' AND file_size = 0 AND file_path IS NOT NULL
    `,
            )
            .all() as any[];

        for (const task of tasks) {
            if (task.file_path && fs.existsSync(task.file_path)) {
                try {
                    const stats = fs.statSync(task.file_path);
                    const size = stats.size;

                    db.prepare(
                        `UPDATE download_tasks SET file_size = ? WHERE id = ?`,
                    ).run(size, task.id);
                } catch (err) {
                    logger.error(`获取文件大小失败: ${task.file_path}`, err);
                }
            }
        }
    } catch (err) {
        logger.error("更新已下载文件大小失败:", err);
    }
}

// 获取所有下载任务
export async function GET(request: NextRequest) {
    try {
        // 先更新已下载文件的文件大小
        await updateDownloadedFilesSize();

        const searchParams = request.nextUrl.searchParams;
        const statusFilter = searchParams.get("status");
        const authorFilter = searchParams.get("author");

        let whereClause = "";
        let params: any[] = [];

        if (statusFilter) {
            whereClause += " WHERE dt.status = ?";
            params.push(statusFilter);
        }

        if (authorFilter) {
            if (whereClause) {
                whereClause += " AND dt.author_nickname = ?";
            } else {
                whereClause = " WHERE dt.author_nickname = ?";
            }
            params.push(authorFilter);
        }

        const stmt = db.prepare(`
      SELECT dt.*
      FROM download_tasks dt
      ${whereClause}
      ORDER BY dt.created_at DESC
    `);
        const tasks = params.length > 0 ? stmt.all(...params) : stmt.all();

        // 获取所有作者列表用于筛选
        const authorsStmt = db.prepare(`
      SELECT DISTINCT dt.author_nickname
      FROM download_tasks dt
      WHERE dt.status != 'deleted' AND dt.author_nickname IS NOT NULL
      ORDER BY dt.author_nickname
    `);
        const authors = authorsStmt
            .all()
            .map((row: any) => row.author_nickname)
            .filter(Boolean);

        // 添加实时进度数据
        const globalProgress = (globalThis as any).downloadProgress || {};
        const tasksWithProgress = tasks.map((task: any) => {
            const realtimeData = globalProgress[task.id];
            if (realtimeData && realtimeData.updatedAt > Date.now() - 5000) {
                // 5秒内的实时数据才有效
                return {
                    ...task,
                    progress: realtimeData.progress,
                    file_size_formatted: formatFileSize(
                        realtimeData.downloadedBytes,
                    ),
                    download_speed_formatted: `${formatFileSize(realtimeData.speed)}/s`,
                    realtimeProgress: realtimeData,
                    content_type: task.type || "未知",
                };
            } else {
                // 使用数据库中的数据
                return {
                    ...task,
                    file_size_formatted: task.file_size
                        ? formatFileSize(task.file_size)
                        : null,
                    content_type: task.type || "未知",
                };
            }
        });

        return NextResponse.json({
            success: true,
            data: tasksWithProgress,
            filters: {
                authors,
                statusFilter: statusFilter || null,
                authorFilter: authorFilter || null,
            },
        });
    } catch (error: any) {
        logger.error("查询下载任务失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// 创建下载任务（已废弃 - 现在直接在同步时创建）
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { video_id } = body;

        if (!video_id) {
            return NextResponse.json(
                { error: "缺少 video_id 参数" },
                { status: 400 },
            );
        }

        // 检查是否已存在下载任务
        const existingTask = db
            .prepare("SELECT * FROM download_tasks WHERE video_id = ?")
            .get(video_id);
        if (existingTask) {
            return NextResponse.json({
                success: true,
                data: existingTask,
                message: "任务已存在",
            });
        }

        return NextResponse.json(
            { error: "请通过订阅同步创建下载任务" },
            { status: 400 },
        );
    } catch (error: any) {
        logger.error("创建下载任务失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 删除下载任务（物理删除，同时删除文件）
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const taskId = searchParams.get("id");

        if (!taskId) {
            return NextResponse.json({ error: "缺少任务 ID" }, { status: 400 });
        }

        // 获取任务完整信息（用于删除文件）
        const task = db
            .prepare("SELECT * FROM download_tasks WHERE id = ?")
            .get(taskId) as any;

        if (!task) {
            return NextResponse.json({ error: "任务不存在" }, { status: 404 });
        }

        const deletedFiles: string[] = [];
        const failedFiles: string[] = [];

        // 删除文件
        if (task.file_path) {
            const fileDir = path.dirname(task.file_path);

            if (task.type === "图集") {
                // 图集类型：删除所有相关图片
                logger.info(`删除图集任务 ${taskId} 的所有图片文件`);

                // 从 file_path 推断文件名前缀和扩展名
                // 例如：/path/to/folder/filename_1.jpg -> filename
                const fileName = path.basename(task.file_path);
                const match = fileName.match(/^(.+)_\d+\.(\w+)$/);

                if (match) {
                    const [, prefix, ext] = match;

                    // 计算图片数量
                    const imageCount = task.all_download_urls
                        ? task.all_download_urls.split(",").length
                        : 1;

                    // 删除所有图片文件
                    for (let i = 1; i <= imageCount; i++) {
                        const imagePath = path.join(
                            fileDir,
                            `${prefix}_${i}.${ext}`,
                        );

                        if (fs.existsSync(imagePath)) {
                            try {
                                fs.unlinkSync(imagePath);
                                deletedFiles.push(imagePath);
                                logger.info(`已删除图片: ${imagePath}`);
                            } catch (err) {
                                logger.error(`删除图片失败: ${imagePath}`, err);
                                failedFiles.push(imagePath);
                            }
                        }
                    }
                } else {
                    // 如果无法解析文件名，尝试删除 file_path 指向的文件
                    if (fs.existsSync(task.file_path)) {
                        try {
                            fs.unlinkSync(task.file_path);
                            deletedFiles.push(task.file_path);
                            logger.info(`已删除文件: ${task.file_path}`);
                        } catch (err) {
                            logger.error(
                                `删除文件失败: ${task.file_path}`,
                                err,
                            );
                            failedFiles.push(task.file_path);
                        }
                    }
                }
            } else {
                // 视频类型：删除单个文件
                logger.info(`删除视频任务 ${taskId} 的文件: ${task.file_path}`);

                if (fs.existsSync(task.file_path)) {
                    try {
                        fs.unlinkSync(task.file_path);
                        deletedFiles.push(task.file_path);
                        logger.info(`已删除文件: ${task.file_path}`);
                    } catch (err) {
                        logger.error(`删除文件失败: ${task.file_path}`, err);
                        failedFiles.push(task.file_path);
                    }
                }
            }

            // 检查并删除空目录
            try {
                if (fs.existsSync(fileDir)) {
                    const remainingFiles = fs.readdirSync(fileDir);
                    if (remainingFiles.length === 0) {
                        fs.rmdirSync(fileDir);
                        logger.info(`已删除空目录: ${fileDir}`);
                    }
                }
            } catch (err) {
                logger.error(`删除目录失败: ${fileDir}`, err);
            }
        }

        // 从数据库删除记录
        db.prepare("DELETE FROM download_tasks WHERE id = ?").run(taskId);

        return NextResponse.json({
            success: true,
            message: "任务和文件已删除",
            data: {
                deletedFiles: deletedFiles.length,
                failedFiles: failedFiles.length,
                files: deletedFiles,
            },
        });
    } catch (error: any) {
        logger.error("删除下载任务失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
