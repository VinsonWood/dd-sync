import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import logger from '@/lib/logger';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// 辅助函数：安全转换为字符串
function safeString(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

// 辅助函数：安全转换为数字
function safeNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

// 同步单个订阅
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    logger.info(`开始同步订阅: ${id}`);

    // 获取订阅信息
    const subscription = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as any;
    logger.debug(`查询订阅结果:`, subscription);

    if (!subscription) {
      return NextResponse.json({ error: '订阅不存在' }, { status: 404 });
    }

    // 获取 API 配置
    const apiBaseUrl = (db.prepare('SELECT value FROM settings WHERE key = ?').get('api_base_url') as any)?.value || 'http://192.168.60.20:5555';
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

    // 计算时间范围
    const dateParams = getDateRangeParams(subscription.time_range);

    // 一次性获取所有视频（不使用分页）
    logger.debug(`开始获取视频，时间范围:`, dateParams);

    const apiParams = {
      sec_user_id: subscription.sec_user_id,
      ...dateParams,
    };

    logger.debug(`\n=== API 请求 ===`);
    logger.debug(`API 请求地址: ${apiBaseUrl}/douyin/account`);
    logger.debug(`API 请求参数:`, JSON.stringify(apiParams, null, 2));
    const requestStartTime = Date.now();

    const response = await axios.post(`${apiBaseUrl}/douyin/account`, apiParams, {
      timeout: 120000, // 增加到 120秒超时（因为可能返回大量数据）
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const requestElapsed = Date.now() - requestStartTime;
    logger.debug(`API 响应耗时: ${requestElapsed}ms`);
    logger.debug(`API 响应消息: ${response.data?.message}`);
    logger.debug(`返回视频数量: ${response.data?.data?.length || 0}`);

    if (!response.data?.message?.includes('成功')) {
      logger.error(`API 返回失败:`, JSON.stringify(response.data, null, 2));
      throw new Error(response.data?.message || '获取作品列表失败');
    }

    const videos = response.data.data || [];

    // 处理所有返回的视频（不使用 last_video_id 作为停止标记）
    // 通过检查数据库来判断是否已下载
    logger.info(`\n=== 同步完成 ===`);
    logger.debug(`API 返回视频总数: ${videos.length}`);

    // 过滤视频（点赞数）
    let filteredVideos = videos;
    let filteredCount = 0;

    if (subscription.min_digg_count) {
      filteredVideos = videos.filter((v: any) => v.digg_count >= subscription.min_digg_count);
      filteredCount = videos.length - filteredVideos.length;
      logger.debug(`点赞数过滤: 最低要求 ${subscription.min_digg_count}，过滤掉 ${filteredCount} 个视频`);
    }

    // 如果自动下载，添加到下载任务
    let downloadedCount = 0;
    if (subscription.auto_download && filteredVideos.length > 0) {
      logger.debug(`自动下载已启用，准备添加 ${filteredVideos.length} 个下载任务...`);

      const insertTask = db.prepare(`
        INSERT INTO download_tasks (
          id, video_id, sec_user_id, type, desc, author_nickname, author_uid,
          cover_url, download_url, all_download_urls, duration, digg_count,
          comment_count, share_count, create_time, status, progress, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(video_id) DO UPDATE SET
          type = excluded.type,
          all_download_urls = excluded.all_download_urls,
          download_url = excluded.download_url,
          digg_count = excluded.digg_count,
          comment_count = excluded.comment_count,
          share_count = excluded.share_count
      `);

      // 反向遍历，从旧到新添加
      const resetTasks: string[] = []; // 记录需要重新下载的任务ID

      for (let i = filteredVideos.length - 1; i >= 0; i--) {
        const video = filteredVideos[i];

        // 检查是否已经下载完成且文件存在
        const existingTask = db.prepare('SELECT id, status, file_path, type, all_download_urls FROM download_tasks WHERE video_id = ?').get(video.id) as any;

        // 跳过正在下载的任务，避免重置进度
        if (existingTask && existingTask.status === 'downloading') {
          logger.debug(`跳过正在下载的任务: ${video.id} (${video.type}) - ${video.desc || '无描述'}`);
          continue;
        }

        if (existingTask && existingTask.status === 'completed' && existingTask.file_path) {
          // 对于图集，需要检查所有图片文件是否都存在
          if (existingTask.type === '图集') {
            let allFilesExist = true;

            // 从 file_path 推断文件名前缀和扩展名
            const fileDir = path.dirname(existingTask.file_path);
            const fileName = path.basename(existingTask.file_path);
            const match = fileName.match(/^(.+)_\d+\.(\w+)$/);

            if (match && existingTask.all_download_urls) {
              const [, prefix, ext] = match;
              const imageCount = existingTask.all_download_urls.split(',').length;

              // 检查所有图片文件是否都存在
              for (let j = 1; j <= imageCount; j++) {
                const imagePath = path.join(fileDir, `${prefix}_${j}.${ext}`);
                if (!fs.existsSync(imagePath)) {
                  allFilesExist = false;
                  logger.debug(`图集文件缺失: ${imagePath}`);
                  break;
                }
              }

              if (allFilesExist) {
                logger.debug(`跳过已下载的图集: ${video.id} - ${video.desc || '无描述'} (${imageCount} 张图片)`);
                continue;
              } else {
                logger.debug(`图集文件不完整，需要重新下载: ${video.id}`);
              }
            } else {
              // 无法解析文件名，检查第一张图片
              if (fs.existsSync(existingTask.file_path)) {
                logger.debug(`跳过已下载的图集: ${video.id} - ${video.desc || '无描述'} (无法验证所有文件)`);
                continue;
              }
            }
          } else {
            // 对于视频，只检查单个文件
            if (fs.existsSync(existingTask.file_path)) {
              logger.debug(`跳过已下载的视频: ${video.id} (${video.type}) - ${video.desc || '无描述'}`);
              continue;
            }
          }
        }

        // 处理 downloads 字段 - 可能是数组或逗号分隔的字符串
        let downloadUrls = [];
        if (video.downloads) {
          if (Array.isArray(video.downloads)) {
            // 如果是数组
            downloadUrls = video.downloads.filter(Boolean);
          } else if (typeof video.downloads === 'string') {
            // 如果是逗号分隔的字符串
            downloadUrls = video.downloads.split(',').map((url: string) => url.trim()).filter(Boolean);
          }
        }

        // 存储所有下载链接（逗号分隔）
        const allDownloadUrls = downloadUrls.join(',');

        // 选择第一个有效的下载链接
        const selectedDownloadUrl = downloadUrls[0] || '';

        // 创建任务 ID
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
          // 插入或更新下载任务
          insertTask.run(
            taskId,
            safeString(video.id),
            safeString(subscription.sec_user_id),
            safeString(video.type),
            safeString(video.desc),
            safeString(video.nickname),
            safeString(video.uid),
            safeString(video.static_cover || video.dynamic_cover),
            safeString(selectedDownloadUrl),
            safeString(allDownloadUrls),
            safeString(video.duration),
            safeNumber(video.digg_count),
            safeNumber(video.comment_count),
            safeNumber(video.share_count),
            safeString(video.create_time),
            'downloading',
            0,
            Date.now()
          );

          // 获取任务ID（可能是新创建的或已存在的）
          const currentTask = db.prepare('SELECT id FROM download_tasks WHERE video_id = ?').get(video.id) as any;
          if (currentTask) {
            resetTasks.push(currentTask.id);
            downloadedCount++;
            logger.debug(`创建/重置任务: ${video.id} (${video.type}) - ${video.desc || '无描述'}`);
          }
        } catch (e) {
          logger.error(`创建下载任务失败: ${video.id}`, e);
        }

        // 小延迟避免ID冲突
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      logger.debug(`成功添加 ${downloadedCount} 个下载任务`);

      // 异步触发已重置任务的下载
      if (resetTasks.length > 0) {
        logger.debug(`触发 ${resetTasks.length} 个已重置任务的下载...`);
        setImmediate(async () => {
          for (const taskId of resetTasks) {
            try {
              await axios.post(`${appBaseUrl}/api/downloads/start`, {
                task_id: taskId
              }, { timeout: 120000 });
              logger.debug(`已触发任务下载: ${taskId}`);
            } catch (error: any) {
              logger.error(`触发任务下载失败: ${taskId}`, error.message);
            }
            // 延迟避免并发过多
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        });
      }
    } else if (!subscription.auto_download) {
      logger.debug(`自动下载未启用，跳过添加下载任务`);
    }

    // 检查已完成任务的文件是否存在，不存在则重新下载
    // 但只对仍然存在于 API 返回结果中的视频进行重新下载
    logger.info(`\\n=== 检查已完成任务的文件 ===`);
    const completedTasks = db.prepare(`
      SELECT id, video_id, file_path, type
      FROM download_tasks
      WHERE sec_user_id = ? AND status = 'completed' AND file_path IS NOT NULL
    `).all(subscription.sec_user_id) as any[];

    logger.debug(`找到 ${completedTasks.length} 个已完成的任务`);

    // 创建 API 返回的视频 ID 集合
    const apiVideoIds = new Set(videos.map((v: any) => v.id));
    logger.debug(`API 返回的视频 ID 数量: ${apiVideoIds.size}`);

    const missingFileTasks: string[] = [];
    for (const task of completedTasks) {
      if (!fs.existsSync(task.file_path)) {
        // 检查视频是否还在 API 返回结果中
        if (apiVideoIds.has(task.video_id)) {
          logger.debug(`文件不存在且视频仍存在于 API: ${task.file_path}，任务 ${task.video_id} 需要重新下载`);

          // 重置任务状态
          db.prepare(`
            UPDATE download_tasks
            SET status = 'downloading', progress = 0, error = NULL,
                file_path = NULL, file_size = 0, completed_at = NULL
            WHERE id = ?
          `).run(task.id);

          missingFileTasks.push(task.id);
        } else {
          logger.debug(`文件不存在但视频已从 API 中删除: ${task.file_path}，任务 ${task.video_id} 不重新下载`);
        }
      }
    }

    if (missingFileTasks.length > 0) {
      logger.debug(`发现 ${missingFileTasks.length} 个文件丢失的任务，准备重新下载...`);

      // 异步触发重新下载
      setImmediate(async () => {
        for (const taskId of missingFileTasks) {
          try {
            await axios.post(`${appBaseUrl}/api/downloads/start`, {
              task_id: taskId
            }, { timeout: 120000 });
            logger.debug(`已触发文件丢失任务的重新下载: ${taskId}`);
          } catch (error: any) {
            logger.error(`触发重新下载失败: ${taskId}`, error.message);
          }
          // 延迟避免并发过多
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      });
    } else {
      logger.debug(`所有已完成任务的文件都存在`);
    }

    // 更新订阅状态
    const now = Date.now();
    const newLastVideoId = videos.length > 0 ? videos[0].id : subscription.last_video_id;

    // 统计该订阅的真实数据
    const totalVideosCount = db.prepare('SELECT COUNT(*) as count FROM download_tasks WHERE sec_user_id = ?').get(subscription.sec_user_id) as any;
    const completedCount = db.prepare('SELECT COUNT(*) as count FROM download_tasks WHERE sec_user_id = ? AND status = ?').get(subscription.sec_user_id, 'completed') as any;

    logger.info(`\n=== 更新订阅状态 ===`);
    logger.debug(`更新 last_video_id: ${newLastVideoId}`);
    logger.debug(`API 返回视频总数: ${videos.length}`);
    logger.debug(`数据库中任务总数: ${totalVideosCount.count}`);
    logger.debug(`已完成任务数: ${completedCount.count}`);
    logger.debug(`本次新增下载任务: ${downloadedCount}`);

    db.prepare(`
      UPDATE subscriptions
      SET last_sync_time = ?,
          last_video_id = ?,
          total_videos = ?,
          downloaded_count = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      now,
      newLastVideoId,
      videos.length,  // 使用 API 返回的视频数量
      completedCount.count,
      now,
      id
    );

    // 记录同步历史
    const historyId = `hist_${now}_${Math.random().toString(36).substr(2, 9)}`;
    db.prepare(`
      INSERT INTO sync_histories (
        id, subscription_id, sync_time, status,
        new_videos_count, downloaded_count
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      historyId,
      id,
      now,
      'success',
      downloadedCount,
      downloadedCount
    );

    logger.info(`✓ 同步成功完成！`);

    return NextResponse.json({
      success: true,
      data: {
        newVideos: filteredVideos,
        totalFetched: videos.length,
        filteredByLikes: filteredCount,
        downloadedCount,
      },
      message: '同步完成'
    });
  } catch (error: any) {
    logger.error(`✗ 同步订阅失败:`, error.message);
    logger.error(error.stack);

    // 记录失败历史
    try {
      const now = Date.now();
      const historyId = `hist_${now}_${Math.random().toString(36).substr(2, 9)}`;
      db.prepare(`
        INSERT INTO sync_histories (
          id, subscription_id, sync_time, status,
          new_videos_count, downloaded_count, error
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        historyId,
        id,
        now,
        'failed',
        0,
        0,
        error.message
      );
    } catch (e) {
      logger.error('记录失败历史失败:', e);
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 辅助函数：根据时间范围生成日期参数
function getDateRangeParams(timeRange: string) {
  if (timeRange === 'all') {
    return {};
  }

  const now = new Date();
  const latest = formatDateForApi(now);

  let earliest: string;
  if (timeRange === 'one-month') {
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    earliest = formatDateForApi(oneMonthAgo);
  } else {
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    earliest = formatDateForApi(sixMonthsAgo);
  }

  return { earliest, latest };
}

function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}
