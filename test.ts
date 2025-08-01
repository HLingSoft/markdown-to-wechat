// test.ts
import { writeFileSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { markdownToHtml, type RenderOptions } from './src/markdown-to-wechat'

// 1) 读入 markdown
const sampleMd = readFileSync(resolve(__dirname, 'test.md'), 'utf-8')

// 2) 渲染参数 —— 这里配置：主题、主色、代码高亮主题
const opts: RenderOptions = {
  // 业务开关
  citeStatus: true,
  legend: 'alt-only',
  isUseIndent: false,
  countStatus: true,
  isMacCodeBlock: false,

  // 字体
  fontFamily: `Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, 'PingFang SC', Cambria, Cochin, Georgia, Times, 'Times New Roman', serif`,
  fontSize: '15px',

  // === 三件事 ===
  // 主题：用我们内置的 key（default | grace | simple），或直接传 Theme 对象：theme: {...}
  themeName: 'default',
  // 主色（写入 --md-primary-color，影响 h2 背景、h3 左线、blockquote 竖条等）
  primaryColor: '#F6C344',
  // 代码高亮主题（highlight.js 的 CSS 地址）
  codeThemeHref: 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/kimbie-light.min.css',
}

const { html, headings, readingTime } = markdownToHtml(sampleMd, opts)

// 3) 生成预览页面
const fullPage = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8"/>
  <title>Markdown 预览（官方样式）</title>

  <!-- Mermaid（需要前端激活） -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>

  <!-- 基础排版（可选，非主题色/hljs，不会与我们注入的冲突） -->
  <style>
    body {
      margin: 0 auto;
      padding: 20px;
      max-width: 720px;
      font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
      line-height: 1.75;
      color: #333;
      background: #fff;
    }
    h1,h2,h3,h4 { margin-top: 2em; margin-bottom: .5em; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; }
    th,td { border: 1px solid #e5e5e5; padding: .5em .75em; }
  </style>
</head>
<body>
  

  <!-- 真正的渲染内容：内部已经注入了
       1) :root { --md-primary-color: ... }
       2) <link id="hljs" rel="stylesheet" href="...">  -->
  <div class="md-container">
    ${html}
  </div>

  <script>
    // 前端激活 Mermaid（若文中含 mermaid 代码块）
    mermaid.initialize({ startOnLoad: true });
  </script>
</body>
</html>`

writeFileSync('preview.html', fullPage, 'utf-8')
console.log('✅ preview.html 已生成 —— 打开查看主题/主色/代码高亮是否生效')
