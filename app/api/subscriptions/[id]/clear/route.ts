import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import logger from '@/lib/logger';
import fs from 'fs';
import path from 'path';

// 清除订阅下的所有下载记录
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { deleteFiles = false } = body;

    logger.info(`开始清除订阅 ${id} 的下载记录，deleteFiles: ${deleteFiles}`);

    // 获取订阅信息
    const subscription = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as any;

    if (!subscription) {
      return NextResponse.json({ error: '订阅不存在' }, { status: 404 });
    }

    // 获取该订阅下的所有下载任务
    const tasks = db.prepare(
      'SELECT * FROM download_tasks WHERE sec_user_id = ?'
    ).all(subscription.sec_user_id) as any[];

    logger.info(`找到 ${tasks.length} 个下载任务`);

    let deletedFiles = 0;
    let failedFiles = 0;
    const deletedFilePaths: string[] = [];

    // 如果需要删除文件
    if (deleteFiles) {
      for (const task of tasks) {
        if (task.file_path) {
          const fileDir = path.dirname(task.file_path);

          if (task.type === '图集') {
            // 图集类型：删除所有相关图片
            const fileName = path.basename(task.file_path);
            const match = fileName.match(/^(.+)_\d+\.(\w+)$/);

            if (match) {
              const [, prefix, ext] = match;
              const imageCount = task.all_download_urls ? task.all_download_urls.split(',').length : 1;

              // 删除所有图片文件
              for (let i = 1; i <= imageCount; i++) {
                const imagePath = path.join(fileDir, `${prefix}_${i}.${ext}`);

                if (fs.existsSync(imagePath)) {
                  try {
                    fs.unlinkSync(imagePath);
                    deletedFiles++;
                    deletedFilePaths.push(imagePath);
                  } catch (err) {
                    logger.error(`删除图片失败: ${imagePath}`, err);
                    failedFiles++;
                  }
                }
              }
            } else {
              // 如果无法解析文件名，尝试删除 file_path 指向的文件
              if (fs.existsSync(task.file_path)) {
                try {
                  fs.unlinkSync(task.file_path);
                  deletedFiles++;
                  deletedFilePaths.push(task.file_path);
                } catch (err) {
                  logger.error(`删除文件失败: ${task.file_path}`, err);
                  failedFiles++;
                }
              }
            }
          } else {
            // 视频类型：删除单个文件
            if (fs.existsSync(task.file_path)) {
              try {
                fs.unlinkSync(task.file_path);
                deletedFiles++;
                deletedFilePaths.push(task.file_path);
              } catch (err) {
                logger.error(`删除文件失败: ${task.file_path}`, err);
                failedFiles++;
              }
            }
          }

          // 检查并删除空目录
          try {
            if (fs.existsSync(fileDir)) {
              const remainingFiles = fs.readdirSync(fileDir);
              if (remainingFiles.length === 0) {
                fs.rmdirSync(fileDir);
                logger.debug(`已删除空目录: ${fileDir}`);
              }
            }
          } catch (err) {
            logger.error(`删除目录失败: ${fileDir}`, err);
          }
        }
      }
    }

    // 从数据库删除所有任务记录
    const result = db.prepare(
      'DELETE FROM download_tasks WHERE sec_user_id = ?'
    ).run(subscription.sec_user_id);

    // 更新订阅的统计信息
    db.prepare(`
      UPDATE subscriptions
      SET downloaded_count = 0,
          updated_at = ?
      WHERE id = ?
    `).run(Date.now(), id);

    logger.info(`✓ 清除完成！删除了 ${result.changes} 条记录，${deletedFiles} 个文件`);

    return NextResponse.json({
      success: true,
      message: '清除完成',
      data: {
        deletedRecords: result.changes,
        deletedFiles,
        failedFiles,
      },
    });
  } catch (error: any) {
    logger.error(`✗ 清除订阅记录失败:`, error.message);
    logger.error(error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

