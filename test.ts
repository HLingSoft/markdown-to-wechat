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
const fullPage = ` 
<body>
  
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
