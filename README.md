# 晋梆智绎

晋梆智绎是面向晋剧与三晋非遗场景的数字化展示与互动平台，覆盖文化展示、剧目导览、课程学习、汉服租赁、文创商品、脸谱体验、AI 问答和云端同步等能力。项目同时支持 Web、Windows 桌面端和 Android 端，适合用于非遗文化传播、场馆展示、研学课程和运营管理。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| Web 前端 | React 18、TypeScript、Vite、Tailwind CSS、Framer Motion |
| 互动渲染 | Three.js、Canvas、响应式移动端适配 |
| 本地数据 | Dexie / IndexedDB |
| 云端能力 | 腾讯云 CloudBase、云函数、云数据库、云存储 |
| 桌面端 | Electron、electron-builder、NSIS、MSIX/AppX |
| 移动端 | Capacitor Android |
| 服务端 | Node.js / Express 独立服务 |
| 部署 | IIS、CloudBase 静态托管、Docker / Nginx 配置 |

## 访问地址

| 用途 | 地址 | 当前说明 |
| --- | --- | --- |
| 公网 IP 入口 | `http://118.178.109.63/` | 2026-05-12 探测返回 `200 OK`，IIS 可访问 |
| 正式域名 | `https://jinbangzhiyi.online/` | 当前 HTTPS 探测连接被重置，需要检查证书、IIS 绑定和域名备案/接入 |
| 域名 HTTP | `http://jinbangzhiyi.online/` | 当前探测返回 `403 Forbidden`，DNS 已指向 `118.178.109.63` |
| 项目展示页 | `http://118.178.109.63/showcase.html` | 部署本仓库静态资源后可访问 |
| 支持信息 | `https://jinbangzhiyi.online/support.html` | 正式域名恢复后使用 |
| 隐私政策 | `https://jinbangzhiyi.online/privacy.html` | 正式域名恢复后使用 |

> 中国内地服务器绑定域名时，若域名未完成 ICP 备案、接入备案或 Web 服务器 Host Header / HTTPS 证书绑定异常，可能出现域名 403、HTTPS 连接重置或无法访问。当前 IP 能打开，优先排查域名备案接入、IIS 站点绑定、443 端口证书和防火墙规则。

## 项目展示页

展示页源码位于 `public/showcase.html`，包含项目介绍、功能截图、下载按钮、GitHub 链接和联系方式。部署到 IIS 或 CloudBase 静态托管后，可直接访问：

```text
/showcase.html
```

## 功能截图

截图源文件位于 `public/screenshots/`，展示页会直接引用这些静态资源。

| 页面 | 图片 |
| --- | --- |
| 登录与入口 | `public/screenshots/01-login.png` |
| 晋剧演艺 | `public/screenshots/02-performing-arts.png` |
| 汉服租赁 | `public/screenshots/03-hanfu-rental.png` |
| 文创商品 | `public/screenshots/04-cultural-shop.png` |
| 脸谱工坊 | `public/screenshots/05-face-workshop.png` |
| 课程学习 | `public/screenshots/06-learning.png` |

## 安装包下载

| 类型 | 地址 |
| --- | --- |
| Windows 安装包 | `https://jinbangzhiyi.online/downloads/v1.0.0/jin-bang-zhi-yi-setup-1.0.0.exe` |
| 本地静态文件 | `public/downloads/v1.0.0/jin-bang-zhi-yi-setup-1.0.0.exe` |
| MSIX/AppX 本地产物 | `release/晋梆智绎 1.0.0.appx` |

正式域名 HTTPS 恢复前，可先通过 IIS 公网 IP 验证静态站点和下载目录是否可用。若对外分发安装包，建议使用已备案域名、CloudBase 静态托管自定义域名或对象存储/CDN。

## 常用命令

```bash
npm run dev              # 启动 Web 开发服务
npm run build            # TypeScript 检查并构建 dist
npm run preview          # 预览 dist
npm run build:electron   # 构建 Windows 桌面安装包
npm run build:msix       # 构建 Windows MSIX/AppX 应用包
npm run build:android    # 构建/同步 Android 工程
npm run check:encoding   # 检查文本编码
```

## 部署方式

### IIS 静态部署

1. 执行 `npm run build` 生成 `dist/`。
2. 将 `dist/` 发布到 IIS 站点物理目录。
3. 确认站点绑定：
   - IP 访问：`118.178.109.63:80`
   - 域名访问：`jinbangzhiyi.online:80`
   - HTTPS：`jinbangzhiyi.online:443`，需要有效证书
4. 验证首页、展示页、隐私页、支持页和安装包直链。

### CloudBase 静态托管

1. 确认 `cloudbaserc.json` 中环境 ID 为 `sjy-d0gxtaklr8e1be761`。
2. 执行 `npm run build`。
3. 执行 `npx tcb hosting deploy dist -e sjy-d0gxtaklr8e1be761`。
4. 绑定自定义域名时，按腾讯云要求完成 ICP 备案和域名接入。

### 桌面端发布

```bash
npm run build:electron
npm run build:msix
```

NSIS 安装包和 MSIX/AppX 包会输出到 `release/` 目录。MSIX/AppX 对外分发前需要使用有效证书签名；提交 Microsoft Store 时，需要把 AppX Publisher Identity 替换为商店后台分配的值。

## GitHub

仓库地址：`https://github.com/QH-lym/Jin-Bang-Zhi-Yi.git`

## 联系方式

| 项目 | 内容 |
| --- | --- |
| 项目名称 | 晋梆智绎 |
| 服务地址 | `https://jinbangzhiyi.online/` |
| 支持页面 | `https://jinbangzhiyi.online/support.html` |
| 技术支持 | 腾讯云 CloudBase |

## 安全说明

本 README 只记录部署流程、访问地址和公开链接，不记录密钥、证书密码或其他敏感凭据。需要敏感配置时，请使用本地 `.env`、服务器环境变量或云平台密钥管理能力。
