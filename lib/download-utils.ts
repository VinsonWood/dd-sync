import fs from 'fs';
import path from 'path';
import { formatFolderName, formatWorkFolderName } from './naming';
import type { NamingParams } from './naming';

/**
 * 创建下载目录
 * @param downloadDir 下载根目录
 * @param folderNameFormat 文件夹名称格式
 * @param workFolderNameFormat 作品文件夹名称格式（可选）
 * @param namingParams 命名参数
 * @returns 目标目录路径
 */
export function createDownloadDirectory(
    downloadDir: string,
    folderNameFormat: string,
    workFolderNameFormat: string | undefined,
    namingParams: NamingParams
): string {
    const folderName = formatFolderName(folderNameFormat, namingParams);
    let targetDir = path.join(downloadDir, folderName);

    // 如果配置了作品文件夹格式，则创建作品子文件夹
    if (workFolderNameFormat) {
        const workFolderName = formatWorkFolderName(
            workFolderNameFormat,
            namingParams,
        );
        targetDir = path.join(targetDir, workFolderName);
    }

    // 确保目标目录存在
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    return targetDir;
}
