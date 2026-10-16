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
