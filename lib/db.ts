import Database from "better-sqlite3";
import logger from "./logger";
import path from "path";
import fs from "fs";

// 数据库文件路径
const DB_PATH = path.join(process.cwd(), "data", "dd-sync.db");

// 确保数据目录存在
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 创建数据库连接
const db = new Database(DB_PATH);

// 启用 WAL 模式以提高并发性能
db.pragma("journal_mode = WAL");

// 初始化数据库表
function initDatabase() {
    // 下载任务表（包含所有视频信息）
    db.exec(`
    CREATE TABLE IF NOT EXISTS download_tasks (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL UNIQUE,
      sec_user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      desc TEXT,
      author_nickname TEXT,
      author_uid TEXT,
      cover_url TEXT,
      download_url TEXT,
      all_download_urls TEXT,
      duration TEXT,
      digg_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      share_count INTEGER DEFAULT 0,
      create_time TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      progress INTEGER DEFAULT 0,
      error TEXT,
      file_path TEXT,
      file_size INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );
  `);

    // 订阅表
    db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      sec_user_id TEXT NOT NULL UNIQUE,
      nickname TEXT,
      avatar TEXT,
      enabled INTEGER DEFAULT 1,
      sync_interval INTEGER DEFAULT 60,
      time_range TEXT DEFAULT 'one-month',
      min_digg_count INTEGER,
      auto_download INTEGER DEFAULT 1,
      last_sync_time INTEGER,
      last_video_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      total_videos INTEGER DEFAULT 0,
      downloaded_count INTEGER DEFAULT 0
    );
  `);

    // 同步历史表
    db.exec(`
    CREATE TABLE IF NOT EXISTS sync_histories (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL,
      sync_time INTEGER NOT NULL,
      status TEXT NOT NULL,
      new_videos_count INTEGER DEFAULT 0,
      downloaded_count INTEGER DEFAULT 0,
      error TEXT,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
    );
  `);

    // 调度任务表
    db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      cron_expression TEXT,
      enabled INTEGER DEFAULT 1,
      last_run_time INTEGER,
      next_run_time INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

    // 调度日志表
    db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      status TEXT NOT NULL,
      message TEXT,
      details TEXT,
      FOREIGN KEY (task_id) REFERENCES schedule_tasks(id) ON DELETE CASCADE
    );
  `);

    // 设置表
    db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

    // 创建索引以提升查询性能
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_download_tasks_sec_user_id
    ON download_tasks(sec_user_id);
  `);

    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_download_tasks_status
    ON download_tasks(status);
  `);

    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_download_tasks_created_at
    ON download_tasks(created_at DESC);
  `);

    // 插入默认设置
    const defaultSettings = [
        { key: "download_dir", value: path.join(process.cwd(), "downloads") },
        { key: "api_base_url", value: "http://192.168.60.20:5555" },
        { key: "api_token", value: "" },
        { key: "folderNameFormat", value: "{nickname}_{type}" },
        { key: "fileNameFormat", value: "{desc}" },
        { key: "mark", value: "" },
        { key: "showImages", value: "true" },
    ];

    const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `);

    for (const setting of defaultSettings) {
        insertSetting.run(setting.key, setting.value, Date.now());
    }

    logger.info("数据库初始化完成");
}

// 初始化数据库
initDatabase();

// 启动调度器（仅在服务端）
if (typeof window === "undefined") {
    import("./scheduler").then(({ startScheduler }) => {
        // 延迟5秒启动调度器，确保数据库初始化完成
        setTimeout(() => {
            logger.info("启动订阅同步调度器...");
            startScheduler();
        }, 5000);
    });
}

export default db;
