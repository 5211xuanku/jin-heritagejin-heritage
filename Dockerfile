# ═══════════════════════════════════════════════
#  晋梆智绎 - Docker 构建文件
# ═══════════════════════════════════════════════
#  多阶段构建：构建阶段 + 生产阶段
#  优化镜像大小，仅包含必要的生产文件

# ─── 阶段1: 构建 ───────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --legacy-peer-deps

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# ─── 阶段2: 生产 ───────────────────────────────
FROM nginx:alpine AS production

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
