import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import logger from "@/lib/logger";
import {
    formatFolderName,
    formatFileName,
    formatWorkFolderName,
} from "@/lib/naming";
import {
    generateVideoNFO,
    shouldGenerateNFO,
    getImageFileNames,
    NfoFormat,
} from "@/lib/nfo-generator";
import axios from "axios";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { finished } from "stream/promises";

// 执行下载
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { task_id } = body;

        if (!task_id) {
            return NextResponse.json(
                { error: "缺少 task_id 参数" },
                { status: 400 },
            );
        }

        // 获取任务信息（所有信息都在 download_tasks 表中）
        const task = db
            .prepare(
                `
      SELECT *
      FROM download_tasks
      WHERE id = ?
    `,
            )
            .get(task_id) as any;

        if (!task) {
            return NextResponse.json({ error: "任务不存在" }, { status: 404 });
        }

        // 图集类型需要下载多个图片
        if (task.type === "图集") {
            logger.debug(`任务 ${task_id} 是图集类型，开始下载多个图片`);

            if (!task.all_download_urls) {
                return NextResponse.json(
                    { error: "图集下载链接不存在" },
                    { status: 400 },
                );
            }

            // 解析所有图片 URL
            const imageUrls = task.all_download_urls
                .split(",")
                .map((url: string) => url.trim())
                .filter(Boolean);

            if (imageUrls.length === 0) {
                return NextResponse.json(
                    { error: "图集没有有效的下载链接" },
                    { status: 400 },
                );
            }

            logger.debug(`图集包含 ${imageUrls.length} 张图片`);

            // 更新任务状态为下载中
            db.prepare(
                "UPDATE download_tasks SET status = ?, progress = ?, error = NULL, file_path = NULL, completed_at = NULL WHERE id = ?",
            ).run("downloading", 0, task_id);

            // 获取所有设置
            const settingsRows = db
                .prepare("SELECT key, value FROM settings")
                .all() as any[];
            const settings: Record<string, string> = {};
            settingsRows.forEach((row) => {
                settings[row.key] = row.value;
            });

            // 获取下载目录
            const downloadDir =
                settings.download_dir || path.join(process.cwd(), "downloads");

            // 获取命名配置
            const folderNameFormat =
                settings.folderNameFormat || "{uid}_{nickname}_{type}";
            const workFolderNameFormat =
                settings.workFolderNameFormat || "{create_time}_{desc}";
            const fileNameFormat = settings.fileNameFormat || "{desc}_{id}";
            const mark = settings.mark || "";

            // 准备命名参数
            const namingParams = {
                uid: task.sec_user_id || task.author_uid || "unknown",
                nickname: task.author_nickname || "unknown",
                mark: mark,
                type: "发布作品",
                id: task.video_id,
                desc: task.desc || "image_album",
                create_time: task.create_time || "",
            };

            // 格式化文件夹名
            const folderName = formatFolderName(folderNameFormat, namingParams);
            let targetDir = path.join(downloadDir, folderName);

            // 如果配置了作品文件夹格式，则创建作品子文件夹
            let workFolderName = "";
            if (workFolderNameFormat) {
                workFolderName = formatWorkFolderName(
                    workFolderNameFormat,
                    namingParams,
                );
                targetDir = path.join(targetDir, workFolderName);
            }

            // 确保目标目录存在
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            // 格式化文件名前缀
            const fileNamePrefix = formatFileName(fileNameFormat, namingParams);

            try {
                const downloadedFiles: string[] = [];
                let totalSize = 0;

                // 下载每张图片
                for (let i = 0; i < imageUrls.length; i++) {
                    const imageUrl = imageUrls[i];
                    const imageIndex = i + 1;

                    // 获取图片扩展名
                    const urlExt = imageUrl.match(/\.(jpg|jpeg|png|webp|gif)/i);
                    const ext = urlExt ? urlExt[1] : "jpg";

                    const imagePath = path.join(
                        targetDir,
                        `${fileNamePrefix}_${imageIndex}.${ext}`,
                    );

                    logger.debug(
                        `下载图片 ${imageIndex}/${imageUrls.length}: ${imageUrl.substring(0, 100)}...`,
                    );

                    // 下载图片
                    const response = await axios({
                        method: "get",
                        url: imageUrl,
                        responseType: "stream",
                    });

                    // 保存图片
                    const writer = fs.createWriteStream(imagePath);
                    response.data.pipe(writer);
                    await finished(writer);

                    // 获取文件大小
                    const stats = fs.statSync(imagePath);
                    totalSize += stats.size;
                    downloadedFiles.push(imagePath);

                    // 更新进度
                    const progress = Math.round(
                        (imageIndex / imageUrls.length) * 100,
                    );
                    db.prepare(
                        "UPDATE download_tasks SET progress = ? WHERE id = ?",
                    ).run(progress, task_id);

                    logger.debug(
                        `图片 ${imageIndex}/${imageUrls.length} 下载完成: ${stats.size} bytes`,
                    );
                }

                // 更新任务状态为完成，保存第一张图片路径
                db.prepare(
                    "UPDATE download_tasks SET status = ?, progress = ?, file_path = ?, file_size = ?, completed_at = ? WHERE id = ?",
                ).run(
                    "completed",
                    100,
                    downloadedFiles[0],
                    totalSize,
                    Date.now(),
                    task_id,
                );

                logger.info(
                    `图集下载完成: ${downloadedFiles.length} 张图片，总大小 ${totalSize} bytes`,
                );

                return NextResponse.json({
                    success: true,
                    message: `图集下载完成，共 ${downloadedFiles.length} 张图片`,
                    data: {
                        task_id,
                        file_paths: downloadedFiles,
                        folder: folderName,
                        total_size: totalSize,
                        image_count: downloadedFiles.length,
                    },
                });
            } catch (downloadError: any) {
                logger.error(`图集下载失败:`, downloadError);
                // 更新任务状态为失败
                db.prepare(
                    "UPDATE download_tasks SET status = ?, error = ? WHERE id = ?",
                ).run("failed", downloadError.message, task_id);

                throw downloadError;
            }
        }

        if (!task.download_url) {
            return NextResponse.json(
                { error: "下载链接不存在" },
                { status: 400 },
            );
        }

        // 更新任务状态为下载中，并清理旧的错误信息和文件路径
        db.prepare(
            "UPDATE download_tasks SET status = ?, progress = ?, error = NULL, file_path = NULL, completed_at = NULL WHERE id = ?",
        ).run("downloading", 0, task_id);

        // 获取所有设置
        const settingsRows = db
            .prepare("SELECT key, value FROM settings")
            .all() as any[];
        const settings: Record<string, string> = {};
        settingsRows.forEach((row) => {
            settings[row.key] = row.value;
        });

        // 获取下载目录
        const downloadDir =
            settings.download_dir || path.join(process.cwd(), "downloads");

        // 获取命名配置
        const folderNameFormat =
            settings.folderNameFormat || "{uid}_{nickname}_{type}";
        const workFolderNameFormat =
            settings.workFolderNameFormat || "{create_time}_{desc}";
        const fileNameFormat = settings.fileNameFormat || "{desc}_{id}";
        const mark = settings.mark || "";

        // 准备命名参数
        const namingParams = {
            uid: task.sec_user_id || task.author_uid || "unknown",
            nickname: task.author_nickname || "unknown",
            mark: mark,
            type: "发布作品", // 默认类型，后续可以根据实际情况调整
            id: task.video_id,
            desc: task.desc || "video",
            create_time: task.create_time || "",
        };

        // 格式化文件夹名
        const folderName = formatFolderName(folderNameFormat, namingParams);
        let targetDir = path.join(downloadDir, folderName);

        // 如果配置了作品文件夹格式，则创建作品子文件夹
        let workFolderName = "";
        if (workFolderNameFormat) {
            workFolderName = formatWorkFolderName(
                workFolderNameFormat,
                namingParams,
            );
            targetDir = path.join(targetDir, workFolderName);
        }

        // 确保目标目录存在
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 格式化文件名
        const fileName = formatFileName(fileNameFormat, namingParams);
        const filePath = path.join(targetDir, `${fileName}.mp4`);

        try {
            let downloadStartedAt = 0;
            let downloadedBytes = 0;
            let totalBytes = 0;

            // 下载文件
            const response = await axios({
                method: "get",
                url: task.download_url,
                responseType: "stream",
                onDownloadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total,
                        );
                        downloadedBytes = progressEvent.loaded;

                        // 计算下载速度
                        if (downloadStartedAt === 0) {
                            downloadStartedAt = Date.now();
                        }

                        const elapsedSeconds =
                            (Date.now() - downloadStartedAt) / 1000;
                        const speed =
                            elapsedSeconds > 0
                                ? downloadedBytes / elapsedSeconds
                                : 0;

                        // 更新进度
                        db.prepare(
                            "UPDATE download_tasks SET progress = ? WHERE id = ?",
                        ).run(percentCompleted, task_id);

                        // 将实时数据存储在全局变量中（通过 API 轮询获取）
                        if (!(globalThis as any).downloadProgress) {
                            (globalThis as any).downloadProgress = {};
                        }
                        (globalThis as any).downloadProgress[task_id] = {
                            progress: percentCompleted,
                            downloadedBytes: progressEvent.loaded,
                            totalBytes: progressEvent.total,
                            speed: speed,
                            updatedAt: Date.now(),
                        };
                    }
                },
            });

            // 保存文件
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            await finished(writer);

            // 获取文件大小
            const stats = fs.statSync(filePath);
            const fileSize = stats.size;

            // 更新任务状态为完成
            db.prepare(
                "UPDATE download_tasks SET status = ?, progress = ?, file_path = ?, file_size = ?, completed_at = ? WHERE id = ?",
            ).run("completed", 100, filePath, fileSize, Date.now(), task_id);

            // 生成 NFO 文件（仅视频类型）
            if (shouldGenerateNFO(task.type)) {
                try {
                    // 获取 NFO 格式设置
                    const nfoFormatSetting = settings.nfo_format || "jellyfin";
                    const nfoFormat = nfoFormatSetting as NfoFormat;

                    const nfoContent = generateVideoNFO(
                        {
                            video_id: task.video_id,
                            type: task.type,
                            desc: task.desc,
                            author_nickname: task.author_nickname,
                            author_uid: task.author_uid,
                            cover_url: task.cover_url,
                            duration: task.duration,
                            digg_count: task.digg_count,
                            comment_count: task.comment_count,
                            share_count: task.share_count,
                            create_time: task.create_time,
                        },
                        nfoFormat,
                    );

                    // NFO 文件与视频文件同名，扩展名为 .nfo
                    const nfoPath = filePath.replace(/\.[^.]+$/, ".nfo");
                    fs.writeFileSync(nfoPath, nfoContent, "utf-8");
                    logger.info(`NFO 文件已生成: ${nfoPath}`);

                    // 下载封面图（多种类型）
                    if (task.cover_url) {
                        const imageNames = getImageFileNames(
                            path.basename(filePath),
                        );
                        const imageTypes = [
                            { name: "poster", label: "海报" },
                            { name: "fanart", label: "背景图" },
                            { name: "thumb", label: "缩略图" },
                        ];

                        for (const imageType of imageTypes) {
                            try {
                                const imagePath = path.join(
                                    path.dirname(filePath),
                                    imageNames[
                                        imageType.name as keyof typeof imageNames
                                    ],
                                );

                                const imageResponse = await axios.get(
                                    task.cover_url,
                                    {
                                        responseType: "stream",
                                        timeout: 30000,
                                    },
                                );

                                const imageWriter =
                                    fs.createWriteStream(imagePath);
                                imageResponse.data.pipe(imageWriter);
                                await finished(imageWriter);

                                logger.info(
                                    `${imageType.label}已下载: ${imagePath}`,
                                );
                            } catch (imageError: any) {
                                logger.error(
                                    `${imageType.label}下载失败: ${imageError.message}`,
                                );
                                // 图片下载失败不影响任务
                            }
                        }
                    }
                } catch (nfoError: any) {
                    logger.error(`NFO 文件生成失败: ${nfoError.message}`);
                    // NFO 生成失败不影响下载任务
                }
            }

            return NextResponse.json({
                success: true,
                message: "下载完成",
                data: {
                    task_id,
                    file_path: filePath,
                    folder: folderName,
                    filename: `${fileName}.mp4`,
                },
            });
        } catch (downloadError: any) {
            // 更新任务状态为失败
            db.prepare(
                "UPDATE download_tasks SET status = ?, error = ? WHERE id = ?",
            ).run("failed", downloadError.message, task_id);

            throw downloadError;
        }
    } catch (error: any) {
        logger.error("下载失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
