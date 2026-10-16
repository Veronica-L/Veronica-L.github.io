# GitHub Pages 部署

项目已配置 GitHub Pages 自动发布。部署状态可在仓库的 Actions 页面查看。

## 仓库与网址

- 网站：[Kiki's Blog](https://veronica-l.github.io/)
- 源码：[Veronica-L/Veronica-L.github.io](https://github.com/Veronica-L/Veronica-L.github.io)

页面资源均采用相对路径，也支持普通项目仓库的子路径网址。

## 部署步骤

1. 创建目标仓库，并先确定仓库的公开范围。
2. 上传项目源码到 `main` 分支，不要上传本地数据、草稿、密钥或备份。
3. 在仓库 Settings → Pages → Build and deployment 中选择 GitHub Actions。
4. 推送后，查看 Actions 中的 Publish Kiki's Blog，成功后访问部署输出的网址。

工作流先验证脚本，再将明确允许发布的文件放入 `dist/`，最后部署。它不需要把个人访问令牌写入网站。

## 本地验证

```text
npm run check
npm run build
```

构建文件仅包含页面、当前样式、前端脚本和示例素材；不包含预览截图、本地服务程序、旧版样式、说明文档或浏览器保存的数据。

## 内容管理

管理入口：[管理后台](https://veronica-l.github.io/admin/)。后台使用 GitHub 登录，草稿和未发布插图保存到 Cloudflare D1；发布时才提交公开内容与图片，随后由 GitHub Actions 部署。使用方法、权限和部署配置见 [ADMIN.md](ADMIN.md)。

## 当前功能边界

- 公开网站通过静态文件展示；写作与登录由独立的 Cloudflare 后台提供。
- 旧版浏览器本地保存的记录不会自动进入仓库；后台新建的草稿可以在登录后跨设备编辑，发布后所有访客可见。
- 私密内容不能放进公开仓库或 Pages 发布目录；仅在界面中隐藏内容不构成访问控制。
- 当前示例图片与参考图片会随网页发布；请在正式上线前确认希望保留的素材。
- 网易云目前仅保存歌单链接，歌曲同步尚未接入。
- 公开部署时，GitHub 账号名可能从仓库和默认网址中被看到；提交前还应检查 Git 提交作者和邮箱的公开设置。

官方说明：[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)、[自定义部署工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
## 独立文章网页

每次构建都会从 `content/feed.json` 中的已发布文章生成 `/posts/<固定文章编号>/index.html`，标题、完整正文、表格和图片地址直接写入 HTML。页面不依赖后台 API 或 JavaScript 来读取正文；Mermaid 图和浏览量为附加增强，图表源码在原始页面中保留。修改文章标题不会改变网址。

首页原始 HTML 包含已发布文章的链接与摘要；首页、文章列表、搜索和归档的公开文章入口使用普通链接。`sitemap.xml` 仅列出首页及真正发布的文章，`robots.txt` 提供站点地图地址。示例文章也有独立页面，但标记为不收录。本地浏览器里的私有草稿仍在本地阅读，不参与静态构建。

后台发布或更新文章后，现有 GitHub Actions 自动重新生成网页；撤下／删除后，下一次成功部署会移除对应 HTML 和站点地图项。旧的公开 Git 历史不因此清除。生成网页位于忽略提交的 `dist/`，不会重复写入源码仓库。

本地预览独立页面：先执行 `npm run build`，再设置 `KIKI_PREVIEW_DIST=1` 并运行 `npm run dev`。静态页面使用当前用户站点根路径，部署目标仍为 `https://veronica-l.github.io/`。
