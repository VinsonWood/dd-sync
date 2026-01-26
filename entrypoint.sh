#!/bin/sh
set -e

# 获取环境变量中的 UID 和 GID，默认为 1001
USER_UID=${USER_UID:-1001}
USER_GID=${USER_GID:-1001}

# 如果当前用户不是目标 UID，则切换用户
if [ "$(id -u)" != "$USER_UID" ]; then
    echo "Switching to user $USER_UID:$USER_GID"

    # 删除默认用户和组
    deluser nextjs 2>/dev/null || true
    delgroup nodejs 2>/dev/null || true

    # 检查目标 GID 是否已存在
    if getent group "$USER_GID" >/dev/null 2>&1; then
        # GID 已存在，使用现有组
        GROUP_NAME=$(getent group "$USER_GID" | cut -d: -f1)
        echo "Using existing group: $GROUP_NAME (GID: $USER_GID)"
    else
        # GID 不存在，创建新组
        addgroup -g "$USER_GID" nodejs
        GROUP_NAME="nodejs"
    fi

    # 检查目标 UID 是否已存在
    if getent passwd "$USER_UID" >/dev/null 2>&1; then
        # UID 已存在，使用现有用户
        USER_NAME=$(getent passwd "$USER_UID" | cut -d: -f1)
        echo "Using existing user: $USER_NAME (UID: $USER_UID)"

        # 确保用户在目标组中
        addgroup "$USER_NAME" "$GROUP_NAME" 2>/dev/null || true
    else
        # UID 不存在，创建新用户
        adduser -u "$USER_UID" -G "$GROUP_NAME" -s /bin/sh -D nextjs
        USER_NAME="nextjs"
    fi

    # 修改文件所有权
    chown -R "$USER_NAME":"$GROUP_NAME" /app/data /app/downloads 2>/dev/null || true

    # 以目标用户身份执行命令
    exec su-exec "$USER_NAME" "$@"
else
    # 已经是正确的用户，直接执行
    exec "$@"
fi
