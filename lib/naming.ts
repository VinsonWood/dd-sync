/**
 * 命名工具函数
 * 用于根据配置格式化文件夹名和文件名
 */

export interface NamingParams {
    uid?: string; // 账号 UID
    nickname?: string; // 账号昵称
    mark?: string; // 账号标识（备注）
    type?: string; // 作品类型（发布/喜欢/收藏）
    id?: string; // 作品 ID
    desc?: string; // 作品描述
    create_time?: string; // 发布时间
}

/**
 * 清理文件名中的非法字符
 */
export function cleanFileName(name: string): string {
    return name
        .replace(/[/\\?%*:|"<>\n\r\t]/g, "_") // 替换非法字符
        .replace(/\s+/g, " ") // 多个空格合并为一个
        .trim() // 去除首尾空格
        .substring(0, 200); // 限制长度
}

/**
 * 格式化命名模板
 * @param template 命名模板，如 "{uid}_{nickname}_{type}"
 * @param params 参数对象
 * @returns 格式化后的名称
 */
export function formatName(template: string, params: NamingParams): string {
    let result = template;

    // 替换所有参数
    Object.entries(params).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        const cleanValue = cleanFileName(value || "");
        result = result.replace(new RegExp(placeholder, "g"), cleanValue);
    });

    // 移除未替换的占位符（参数不存在的情况）
    result = result.replace(/\{[^}]+\}/g, "");

    // 清理多余的分隔符
    result = result
        .replace(/_{2,}/g, "_") // 多个下划线合并为一个
        .replace(/^_+|_+$/g, "") // 去除首尾下划线
        .replace(/-{2,}/g, "-") // 多个连字符合并为一个
        .replace(/^-+|-+$/g, ""); // 去除首尾连字符

    return result || "unnamed";
}

/**
 * 格式化文件夹名称
 */
export function formatFolderName(
    template: string,
    params: NamingParams,
): string {
    return cleanFileName(formatName(template, params));
}

/**
 * 格式化作品文件夹名称
 */
export function formatWorkFolderName(
    template: string,
    params: NamingParams,
): string {
    return cleanFileName(formatName(template, params));
}

/**
 * 格式化文件名称（不包含扩展名）
 */
export function formatFileName(template: string, params: NamingParams): string {
    return cleanFileName(formatName(template, params));
}
