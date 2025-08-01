# markdown-to-wechat

将 Markdown 内容转换为适配微信公众号后台排版的 HTML，可直接复制粘贴到公众号草稿箱中使用。

本项目参考自优秀的开源项目 [doocs/md](https://github.com/doocs/md)，并在此基础上提取其核心排版逻辑，重构为 TypeScript 模块，便于在现代前端项目中直接调用使用。

---

## ✨ 特性

- 支持 Markdown → 微信 HTML 一键转换
- 可自定义字体、代码高亮、主题样式等参数
- 输出格式贴合微信公众号编辑器规范
- 支持输出阅读时间、目录等结构信息

---

## 📦 安装

```bash
npm install markdown-to-wechat
```
## 🛠 使用示例

```typescript
import { markdownToHtml, type RenderOptions } from 'markdown-to-wechat'

const markdown = `
# 示例标题

这是内容段落。

\`\`\`ts
const a = 123
\`\`\`
`

const opts: RenderOptions = {
  // 功能开关
  citeStatus: true,
  legend: 'alt-only',
  isUseIndent: false,
  countStatus: true,
  isMacCodeBlock: false,

  // 字体设置
  fontFamily: `Optima-Regular, Optima, PingFangSC-light, 'PingFang SC', Cambria, Georgia, serif`,
  fontSize: '15px',

  // 样式主题配置
  themeName: 'default',
  primaryColor: '#F6C344',
  codeThemeHref: 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/kimbie-light.min.css'
}

const { html, headings, readingTime } = markdownToHtml(markdown, opts)

console.log(html)

```