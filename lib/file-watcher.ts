import fs from 'fs';
import path from 'path';
import db from './db';

// 文件监听器实例
const watchers = new Map<string, fs.FSWatcher>();

// 检查文件是否存在
function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// 更新任务状态为已删除
function markTaskAsDeleted(filePath: string) {
  try {
    console.log(`\n[文件监听] 尝试标记文件为已删除: ${filePath}`);

    // 查找该文件路径对应的任务
    const task = db.prepare('SELECT * FROM download_tasks WHERE file_path = ?').get(filePath) as any;

    if (task) {
      console.log(`[文件监听] 找到任务: ${task.id}, 当前状态: ${task.status}`);

      if (task.status === 'completed') {
        console.log(`[文件监听] 更新任务状态为 deleted: ${task.id}`);

        db.prepare(`
          UPDATE download_tasks
          SET status = 'deleted', updated_at = ?
          WHERE id = ?
        `).run(Date.now(), task.id);

        console.log(`[文件监听] ✓ 任务状态已更新为 deleted`);
      } else {
        console.log(`[文件监听] 任务状态不是 completed，跳过: ${task.status}`);
      }
    } else {
      console.log(`[文件监听] 未找到对应的任务记录`);
    }
  } catch (error) {
    console.error('[文件监听] 更新任务状态失败:', error);
  }
}

// 监听单个文件
export function watchFile(filePath: string) {
  if (!filePath || watchers.has(filePath)) {
    return; // 已经在监听
  }

  try {
    const watcher = fs.watch(filePath, (eventType, filename) => {
      if (eventType === 'rename') {
        // 文件被重命名或删除
        if (!fileExists(filePath)) {
          console.log(`检测到文件删除: ${filePath}`);
          markTaskAsDeleted(filePath);

          // 停止监听
          watcher.close();
          watchers.delete(filePath);
        }
      }
    });

    watchers.set(filePath, watcher);
    console.log(`开始监听文件: ${filePath}`);
  } catch (error) {
    console.error(`监听文件失败: ${filePath}`, error);
  }
}

// 监听下载目录
export function watchDownloadDirectory(downloadDir: string) {
  if (!downloadDir || !fs.existsSync(downloadDir)) {
    console.warn(`下载目录不存在: ${downloadDir}`);
    return;
  }

  try {
    // 扫描现有的已完成任务
    const completedTasks = db.prepare(`
      SELECT * FROM download_tasks
      WHERE status = 'completed' AND file_path IS NOT NULL
    `).all() as any[];

    // 为每个已完成的任务添加文件监听
    for (const task of completedTasks) {
      if (task.file_path && !watchers.has(task.file_path)) {
        watchFile(task.file_path);
      }
    }

    console.log(`已为 ${completedTasks.length} 个已完成任务添加文件监听`);
  } catch (error) {
    console.error('监听下载目录失败:', error);
  }
}

// 停止监听所有文件
export function stopAllWatchers() {
  for (const [filePath, watcher] of watchers.entries()) {
    watcher.close();
    console.log(`停止监听文件: ${filePath}`);
  }
  watchers.clear();
}

// 定期检查文件是否存在（备用方案）
export function startPeriodicCheck(intervalMs: number = 60000) {
  return setInterval(() => {
    try {
      const completedTasks = db.prepare(`
        SELECT * FROM download_tasks
        WHERE status = 'completed' AND file_path IS NOT NULL
      `).all() as any[];

      for (const task of completedTasks) {
        if (task.file_path && !fileExists(task.file_path)) {
          console.log(`定期检查发现文件已删除: ${task.file_path}`);
          markTaskAsDeleted(task.file_path);
        }
      }
    } catch (error) {
      console.error('定期检查文件失败:', error);
    }
  }, intervalMs);
}
