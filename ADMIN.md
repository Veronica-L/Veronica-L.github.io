# Kiki's Blog 管理后台

- 公开网站：https://veronica-l.github.io/
- 后台入口：https://veronica-l.github.io/admin/
- 后台服务：https://kiki-blog-admin.kiki-blog-admin.workers.dev/admin

## 使用

1. 使用博客所有者的 GitHub 账号登录；其他账号无法读取或修改后台内容。
2. 新建文章或日记，填写标题、日期、正文、分类和标签。
3. 插图上传后仍为后台私有资源。保存草稿会把文字存入 Cloudflare D1，换设备登录后可以继续编辑。
   编辑与公开正文使用同一套 Markdown 渲染，支持 GFM 表格、粗体、行内代码、代码块、列表、引用和链接；宽表格可横向滚动。正文中的原始 HTML 作为文本展示。
   使用以 `mermaid` 标记的围栏代码块，可以显示流程图、时序图等 Mermaid 图表。图表保留源码，解析失败会显示提示。图表在浏览器本地的隔离框架内渲染，无需发送给外部图表服务。
4. 点击「发布到网站」，将当前记录与引用的图片一起提交至 GitHub。页面会区分正在部署、部署成功和部署失败。
5. 日记中的图片会自动出现在公开照片墙的「日记」相册；文章插图显示在正文中。
6. 已有公开版本的内容可继续修改并保存草稿，直到再次发布，访客看到的仍为上一个公开版本。
7. 选中已保存的文章或日记后，点击「删除文章」或「删除日记」，确认后移入回收站。已发布内容会提交网站移除操作，部署完成后不再展示；GitHub 操作失败时保留原记录。
8. 在左侧筛选中选择「回收站」，选中记录后点击「恢复为草稿」。正文和插图保留，恢复后不会自动重新发布。回收站中的记录不能直接编辑或发布。

当前支持最近 500 条记录的后台列表；每篇正文最多 50000 字、12 张插图。上传前将图片缩放至最大宽度 1800 像素并重新编码为 1 MB 以内的 JPG。重新编码的图片不保留原文件名或原图 EXIF 元数据；透明背景会转为白色。原始照片不会上传。

## 数据与隐私

- 草稿、未发布图片和登录会话存放在 Cloudflare D1，数据库内容不进入 Git 仓库。
- GitHub OAuth 使用 `public_repo` 权限；后台仅允许固定仓库，登录后还会核对所有者的数字账号 ID。
- GitHub 访问令牌只在服务器端使用，并通过会话密钥加密存储；浏览器收到的是 Secure、HttpOnly、SameSite=Lax 会话 Cookie。
- 「发布」意味着向公开仓库公开文字与引用图片。撤下仅移除网站内容索引，无法抹去 Git 历史、缓存或已公开的图片。
- 删除采用可恢复的回收站，不永久清除数据库记录和图片，也不清理 GitHub 历史。删除和恢复均检查记录版本，避免覆盖其他窗口的修改。
- 旧版 localStorage / IndexedDB 中的记录不会自动上传；它们仍属于原浏览器和原网址，需要本人选择后手动迁移。
- 页面中的模板示例内容仍保留，新发布内容会加入文章、日记、标签和归档；后台列表只管理从后台新建的内容。
- 后台草稿可作为不公开的写作记录；当前没有单独的「私密日记」阅读页。请勿通过发布按钮提交私密内容。

## 登录配置与部署

运行环境：Node.js 24。网站部署到 GitHub Pages，后台部署到 Cloudflare Workers，私有数据使用 D1。

`backend/wrangler.jsonc` 只包含非秘密设置与 D1 绑定。以下值必须设置为 Cloudflare Worker Secrets，不能写进源码、`.env`、提交或网页：

- `GITHUB_CLIENT_SECRET`：GitHub OAuth App 的密钥。
- `SESSION_SECRET`：至少 32 字符的随机会话加密密钥。更换后已有登录会话失效。

OAuth App 的回调地址：

```text
https://kiki-blog-admin.kiki-blog-admin.workers.dev/auth/callback
```

首次部署：在 `backend` 目录安装锁文件对应依赖，使用 Wrangler 官方登录，再创建 D1 绑定并执行迁移。已配置的账号中更新后台可运行：

```text
npm ci --prefix backend
npm ci --ignore-scripts
npm run check
npm test
npm run build
npm --prefix backend run deploy
```

数据库迁移使用 `wrangler d1 migrations apply kiki-blog-admin-db --remote`；不会在每次请求中修改数据库结构。Secret 在 Cloudflare 控制台设置后，常规 Wrangler 部署会保留它们。后台源代码变更需要单独部署 Worker，GitHub Pages 工作流只部署公开页面。

## 验证

`npm test` 使用真实内存 SQLite 与 GitHub API 仿真检查权限、CSRF、OAuth state/PKCE、草稿冲突、图片访问控制、发布原子性与仓库冲突处理，不会连接生产数据库或公开测试文字。

Markdown 测试使用 jsdom 运行实际预览按钮、文章与日记渲染代码，并检查表格、图片和 HTML 安全过滤。Marked 与 DOMPurify 的浏览器文件及许可证存于 `vendor/`，随站点本地部署；后台部署脚本复制同一份渲染代码与样式，避免前后台显示不一致。

Mermaid 12.2.0 的模块位于 `vendor/mermaid/`，只有含 Mermaid 代码块的页面才会创建图表框架并加载它。框架仅允许脚本运行，不具备父页面的同源访问权限；预览页面的登录和 API 策略保持独立。图表只展示静态结果，不执行图内点击回调。语法以当前 Mermaid 版本为准，自定义外部图标包尚未配置。

上线还应核对 `/health`、实际 GitHub 登录、保存草稿和 GitHub Actions 的最终部署结果。`/health` 只返回是否配置完成，不返回密钥或账号资料。

## 访问统计

公开页面通过 Worker 的 `/public/analytics/visit` 记录页面访问与文章打开次数，`/public/analytics/counts` 仅返回指定页面的累计数字。浏览器只发送规范页面编号，不发送正文、标题、查询词、Cookie 或本地草稿。IP 来自 Cloudflare 请求头，国家、省／州和城市来自 `request.cf`，不调用第三方 IP 查询服务，不记录经纬度。只有正式 GitHub Pages 域名会启用统计，本地预览不计数。

同一 IP 对同一页面在 30 分钟内只计一次，计数与记录插入通过数据库触发器原子更新。IP 共享、代理、自动访问及脚本拦截会影响统计，因此浏览量与 IP 数均不等于实际人数。页面和文章打开分别计数，照片墙只记录栏目访问，不记录单张图片的加载。

后台顶部的「访问统计」展示累计／今日浏览、近 30 天 IP 数、按页面汇总和详细记录，可按近 24 小时／7 天／30 天、完整 IP、页面筛选并分页。`/api/analytics` 使用现有所有者登录保护，未登录不能读取。今日与列表时间均采用北京时间。详细记录仅存 Cloudflare D1，不写入公开仓库；30 天以上记录由每小时的 Worker Cron 清理，列表始终只读取近 30 天。匿名累计计数继续保留，无法补算上线前的访问。

新增数据库迁移 `0003_analytics.sql`，部署 Worker 前需执行上述远程迁移命令。Worker 的 Cron 配置随 `wrangler deploy` 更新；请保留 `SESSION_SECRET`，统计使用它派生 IP 去重键，更换它会让 30 分钟去重重新开始。
