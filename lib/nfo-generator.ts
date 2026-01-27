/**
 * NFO 元数据生成工具
 * 为视频文件生成 Jellyfin/Emby/Plex 兼容的 NFO 文件
 */

export type NfoFormat = "jellyfin" | "emby" | "plex";

interface VideoMetadata {
    video_id: string;
    type: string;
    desc: string;
    author_nickname: string;
    author_uid: string;
    cover_url?: string;
    duration?: string;
    digg_count: number;
    comment_count: number;
    share_count: number;
    create_time?: string;
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(text: string): string {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/**
 * 格式化时长（秒转为分钟）
 */
function formatDuration(duration?: string): number {
    if (!duration) return 0;
    const seconds = parseInt(duration);
    return Math.round(seconds / 60); // 转换为分钟
}

/**
 * 格式化日期为 ISO 8601 格式
 */
function formatDate(timestamp?: string): string {
    if (!timestamp) {
        return new Date().toISOString().split("T")[0];
    }
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toISOString().split("T")[0];
}

/**
 * 生成视频的 NFO 内容
 */
export function generateVideoNFO(
    metadata: VideoMetadata,
    format: NfoFormat = "jellyfin",
): string {
    const title = escapeXml(metadata.desc || `视频_${metadata.video_id}`);
    const author = escapeXml(metadata.author_nickname || "未知作者");
    const year = metadata.create_time
        ? new Date(parseInt(metadata.create_time) * 1000).getFullYear()
        : new Date().getFullYear();
    const runtime = formatDuration(metadata.duration);
    const dateAdded = formatDate(metadata.create_time);
    const premiered = formatDate(metadata.create_time);

    // 构建剧情简介（使用视频描述）
    const plot = title;
    const outline = `${author} 发布于 ${premiered}`;

    // 根据不同平台生成不同格式的 NFO
    switch (format) {
        case "jellyfin":
            return generateJellyfinNFO(
                metadata,
                title,
                author,
                year,
                runtime,
                dateAdded,
                premiered,
                plot,
                outline,
            );
        case "emby":
            return generateEmbyNFO(
                metadata,
                title,
                author,
                year,
                runtime,
                dateAdded,
                premiered,
                plot,
                outline,
            );
        case "plex":
            return generatePlexNFO(
                metadata,
                title,
                author,
                year,
                runtime,
                dateAdded,
                premiered,
                plot,
                outline,
            );
        default:
            return generateJellyfinNFO(
                metadata,
                title,
                author,
                year,
                runtime,
                dateAdded,
                premiered,
                plot,
                outline,
            );
    }
}

/**
 * 生成 Jellyfin 格式的 NFO
 */
function generateJellyfinNFO(
    metadata: VideoMetadata,
    title: string,
    author: string,
    year: number,
    runtime: number,
    dateAdded: string,
    premiered: string,
    plot: string,
    outline: string,
): string {
    const nfo = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<movie>
  <title>${title}</title>
  <originaltitle>${title}</originaltitle>
  <sorttitle>${title}</sorttitle>
  <year>${year}</year>
  <plot>${plot}</plot>
  <outline>${outline}</outline>
  <tagline>来自 ${author} 的作品</tagline>
  <runtime>${runtime}</runtime>
  <dateadded>${dateAdded}</dateadded>
  <premiered>${premiered}</premiered>
  <releasedate>${premiered}</releasedate>
  <genre>短视频</genre>
  <genre>用户生成内容</genre>
  <studio>${author}</studio>
  <director>${author}</director>
  <credits>${author}</credits>
  <actor>
    <name>${author}</name>
    <role>创作者</role>
  </actor>
  <uniqueid type="douyin" default="true">${escapeXml(metadata.video_id)}</uniqueid>
  <ratings>
    <rating name="likes" max="10" default="true">
      <value>${Math.min(10, metadata.digg_count / 10000)}</value>
      <votes>${metadata.digg_count}</votes>
    </rating>
  </ratings>
  <userrating>${Math.min(10, Math.round(metadata.digg_count / 10000))}</userrating>
  <criticrating>${Math.min(100, Math.round(metadata.digg_count / 1000))}</criticrating>
  <tag>抖音</tag>
  <tag>短视频</tag>
  <tag>${author}</tag>
  <country>中国</country>
  <language>zh</language>
  <playcount>0</playcount>
  <watched>false</watched>
  <lockdata>false</lockdata>
  <source>抖音 (Douyin)</source>
  <custominfo>
    <video_id>${escapeXml(metadata.video_id)}</video_id>
    <author_uid>${escapeXml(metadata.author_uid)}</author_uid>
    <digg_count>${metadata.digg_count}</digg_count>
    <comment_count>${metadata.comment_count}</comment_count>
    <share_count>${metadata.share_count}</share_count>
  </custominfo>
</movie>
`;

    return nfo;
}

/**
 * 生成 Emby 格式的 NFO
 * Emby 格式与 Jellyfin 基本相同，但有一些细微差异
 */
function generateEmbyNFO(
    metadata: VideoMetadata,
    title: string,
    author: string,
    year: number,
    runtime: number,
    dateAdded: string,
    premiered: string,
    plot: string,
    outline: string,
): string {
    const nfo = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<movie>
  <title>${title}</title>
  <originaltitle>${title}</originaltitle>
  <sorttitle>${title}</sorttitle>
  <year>${year}</year>
  <plot>${plot}</plot>
  <outline>${outline}</outline>
  <tagline>来自 ${author} 的作品</tagline>
  <runtime>${runtime}</runtime>
  <dateadded>${dateAdded}</dateadded>
  <premiered>${premiered}</premiered>
  <releasedate>${premiered}</releasedate>
  <genre>短视频</genre>
  <genre>用户生成内容</genre>
  <studio>${author}</studio>
  <director>${author}</director>
  <credits>${author}</credits>
  <actor>
    <name>${author}</name>
    <role>创作者</role>
    <type>Actor</type>
  </actor>
  <id>${escapeXml(metadata.video_id)}</id>
  <uniqueid type="douyin" default="true">${escapeXml(metadata.video_id)}</uniqueid>
  <ratings>
    <rating name="likes" max="10" default="true">
      <value>${Math.min(10, metadata.digg_count / 10000)}</value>
      <votes>${metadata.digg_count}</votes>
    </rating>
  </ratings>
  <criticrating>${Math.min(100, Math.round(metadata.digg_count / 1000))}</criticrating>
  <tag>抖音</tag>
  <tag>短视频</tag>
  <tag>${author}</tag>
  <country>中国</country>
  <language>zh</language>
  <watched>false</watched>
  <playcount>0</playcount>
  <source>抖音 (Douyin)</source>
</movie>
`;

    return nfo;
}

/**
 * 生成 Plex 格式的 NFO
 * Plex 使用更简化的格式
 */
function generatePlexNFO(
    metadata: VideoMetadata,
    title: string,
    author: string,
    year: number,
    runtime: number,
    dateAdded: string,
    premiered: string,
    plot: string,
    outline: string,
): string {
    const nfo = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <title>${title}</title>
  <originaltitle>${title}</originaltitle>
  <year>${year}</year>
  <plot>${plot}</plot>
  <outline>${outline}</outline>
  <tagline>来自 ${author} 的作品</tagline>
  <runtime>${runtime}</runtime>
  <premiered>${premiered}</premiered>
  <releasedate>${premiered}</releasedate>
  <genre>短视频</genre>
  <studio>${author}</studio>
  <director>${author}</director>
  <writer>${author}</writer>
  <actor>
    <name>${author}</name>
    <role>创作者</role>
  </actor>
  <rating>${Math.min(10, Math.round(metadata.digg_count / 10000))}</rating>
  <votes>${metadata.digg_count}</votes>
  <tag>抖音</tag>
  <tag>短视频</tag>
  <country>中国</country>
  <language>zh</language>
  <source>抖音 (Douyin)</source>
</movie>
`;

    return nfo;
}

/**
 * 判断是否需要生成 NFO（仅视频类型）
 */
export function shouldGenerateNFO(type: string): boolean {
    return type === "视频";
}

/**
 * 获取封面图文件名（主海报）
 */
export function getCoverFileName(videoFileName: string): string {
    // 移除扩展名，添加 -poster.jpg
    return videoFileName.replace(/\.[^.]+$/, "-poster.jpg");
}

/**
 * 获取所有需要下载的图片类型
 * Jellyfin 支持的图片类型：
 * - poster: 海报/封面（主要）
 * - fanart/backdrop: 背景图/横幅
 * - thumb: 缩略图
 * - landscape: 横向缩略图
 */
export function getImageFileNames(videoFileName: string) {
    const baseName = videoFileName.replace(/\.[^.]+$/, "");
    return {
        poster: `${baseName}-poster.jpg`, // 主海报
        fanart: `${baseName}-fanart.jpg`, // 背景图
        backdrop: `${baseName}-backdrop.jpg`, // 背景图（备用）
        thumb: `${baseName}-thumb.jpg`, // 缩略图
        landscape: `${baseName}-landscape.jpg`, // 横向缩略图
    };
}
