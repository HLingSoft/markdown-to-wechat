import type { PropertiesHyphen } from 'csstype'
import type { RendererObject, Tokens } from 'marked'
import type { ReadTimeResults } from 'reading-time'
import { cloneDeep, toMerged } from 'es-toolkit'
import frontMatter from 'front-matter'
import hljs from 'highlight.js'
import { marked } from 'marked'
import mermaid from 'mermaid'
import readingTime from 'reading-time'

import type { ExtendedProperties, IOpts, ThemeStyles } from '../types'
import type { RendererAPI } from '../types/renderer-types'

import { getStyleString } from '.'
import markedAlert from './MDAlert'
import markedFootnotes from './MDFootnotes'
import { MDKatex } from './MDKatex'
import markedSlider from './MDSlider'
import { loadHljsThemeCss } from './codeTheme'

marked.setOptions({ breaks: true })
marked.use(markedSlider())

function buildTheme({ theme: _theme, fonts, size, isUseIndent }: IOpts): ThemeStyles {
  const theme = cloneDeep(_theme)
  const base = toMerged(theme.base, {
    'font-family': fonts,
    'font-size': size,
  })

  if (isUseIndent) {
    theme.block.p = { 'text-indent': '2em', ...theme.block.p }
  }

  const merge = (styles: Record<string, PropertiesHyphen>): Record<string, ExtendedProperties> =>
    Object.fromEntries(Object.entries(styles).map(([k, v]) => [k, toMerged(base, v)]))

  return { ...merge(theme.inline), ...merge(theme.block) } as ThemeStyles
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;')
}
/**
 * renderer.buildAddition()
 * ------------------------
 * 统一注入：代码块、引用块的附加样式  
 * 依赖两个 CSS 变量：
 *   --md-primary-color        （主色，由顶层选色器控制）
 *   --blockquote-background   （各 theme 自己定义的默认灰）
  */
function buildAddition(): string {
  return /* html */`
  <style id="md-addition">
    :root {
        --blockquote-background: #f7f7f7;
       
      }
        .dark{
         --blockquote-background: #212121;
        }
    /* ========== 代码块 ========== */
     pre.code__pre{
      margin:16px 0!important;
      padding:16px 20px!important;
      border-radius:10px!important;
      background:var(--code-background,#f5f5f5)!important;   /* 变量兜底 */
    }
    pre.code__pre code.hljs{
      background:transparent!important;
      padding:0!important;
      display:block;
      line-height:1.65;
    }
    pre.code__pre .mac-sign{ display:inline-block;margin-bottom:8px; }

    /* ========== 一级引用块 ========== */
   blockquote{
      margin:16px 0!important;
      padding:10px 10px!important;
     
      border-left:6px solid var(--md-primary-color)!important;
      border-radius:8px!important;
    }
   
  </style>`
}



function getStyles(styleMapping: ThemeStyles, tokenName: string, addition = ''): string {
  const dict = styleMapping[tokenName as keyof ThemeStyles]
  if (!dict) return ''
  const styles = getStyleString(dict)
  return `style="${styles}${addition}"`
}

function buildFootnoteArray(footnotes: [number, string, string][]): string {
  return footnotes
    .map(([i, title, link]) =>
      link === title
        ? `<code style="font-size:90%;opacity:.6;">[${i}]</code>: <i style="word-break:break-all">${title}</i><br/>`
        : `<code style="font-size:90%;opacity:.6;">[${i}]</code> ${title}: <i style="word-break:break-all">${link}</i><br/>`,
    )
    .join('\n')
}

function transform(legend: string, text: string | null, title: string | null): string {
  const options = legend.split('-')
  for (const o of options) {
    if (o === 'alt' && text) return text
    if (o === 'title' && title) return title
  }
  return ''
}

const macCodeSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0" y="0" width="45" height="13" viewBox="0 0 450 130">
    <ellipse cx="50" cy="65" rx="50" ry="52" stroke="rgb(220,60,54)" stroke-width="2" fill="rgb(237,108,96)"/>
    <ellipse cx="225" cy="65" rx="50" ry="52" stroke="rgb(218,151,33)" stroke-width="2" fill="rgb(247,193,81)"/>
    <ellipse cx="400" cy="65" rx="50" ry="52" stroke="rgb(27,161,37)" stroke-width="2" fill="rgb(100,200,86)"/>
  </svg>
`.trim()

interface ParseResult {
  yamlData: Record<string, any>
  markdownContent: string
  readingTime: ReadTimeResults
}

function parseFrontMatterAndContent(markdownText: string): ParseResult {
  try {
    const parsed = frontMatter(markdownText)
    const yamlData = parsed.attributes
    const markdownContent = parsed.body
    const rt = readingTime(markdownContent)
    return { yamlData: yamlData as Record<string, any>, markdownContent, readingTime: rt }
  } catch {
    return { yamlData: {}, markdownContent: markdownText, readingTime: readingTime(markdownText) }
  }
}

export function initRenderer(opts: IOpts): RendererAPI {
  const footnotes: [number, string, string][] = []
  let footnoteIndex = 0
  let styleMapping: ThemeStyles = buildTheme(opts)
  let codeIndex = 0
  const listOrderedStack: boolean[] = []
  const listCounters: number[] = []

  // 代码高亮主题（初始加载一次）
  let hljsCss = loadHljsThemeCss((opts as any).codeTheme || 'github')

  function getOpts(): IOpts {
    return opts
  }
  function styles(tag: string, addition = ''): string {
    return getStyles(styleMapping, tag, addition)
  }
  function styledContent(styleLabel: string, content: string, tagName?: string): string {
    const tag = tagName ?? styleLabel
    return `<${tag} ${/^h\d$/.test(tag) ? 'data-heading="true"' : ''} ${styles(styleLabel)}>${content}</${tag}>`
  }
  function addFootnote(title: string, link: string): number {
    footnotes.push([++footnoteIndex, title, link])
    return footnoteIndex
  }

  function reset(newOpts: Partial<IOpts>): void {
    footnotes.length = 0
    footnoteIndex = 0
    setOptions(newOpts)
  }

  function setOptions(newOpts: Partial<IOpts>): void {
    opts = { ...opts, ...newOpts }
    if ((newOpts as any).codeTheme) {
      hljsCss = loadHljsThemeCss((newOpts as any).codeTheme as string)
    }
    const oldStyle = JSON.stringify(styleMapping)
    styleMapping = buildTheme(opts)
    const newStyle = JSON.stringify(styleMapping)
    if (oldStyle !== newStyle) {
      marked.use(markedAlert({ styles: styleMapping }))
      marked.use(
        MDKatex(
          { nonStandard: true },
          styles('inline_katex', ';vertical-align:middle;line-height:1'),
          styles('block_katex', ';text-align:center'),
        ),
      )
    }
  }

  function buildReadingTime(rt: ReadTimeResults): string {
    if (!opts.countStatus || !rt.words) return ''
    return `
      <blockquote ${styles('blockquote')}>
        <p ${styles('blockquote_p')}>字数 ${rt.words}，阅读大约需 ${Math.ceil(rt.minutes)} 分钟</p>
      </blockquote>
    `
  }

  const buildFootnotes = () => {
    if (!footnotes.length) return ''
    return styledContent('h4', '引用链接') + styledContent('footnotes', buildFootnoteArray(footnotes), 'p')
  }

  const renderer: RendererObject = {
    heading({ tokens, depth }: Tokens.Heading) {
      const text = this.parser.parseInline(tokens)
      return styledContent(`h${depth}`, text)
    },

    paragraph({ tokens }: Tokens.Paragraph): string {
      const text = this.parser.parseInline(tokens)
      const isFigureImage = text.includes('<figure') && text.includes('<img')
      const isEmpty = text.trim() === ''
      if (isFigureImage || isEmpty) return text
      return styledContent('p', text)
    },

    blockquote({ tokens }: Tokens.Blockquote): string {
      let text = this.parser.parse(tokens)
      text = text.replace(/<p .*?>/g, `<p ${styles('blockquote_p')}>`)
      return styledContent('blockquote', text)
    },

    code({ text, lang = '' }: Tokens.Code): string {
      if (lang.startsWith('mermaid')) {
        clearTimeout(codeIndex as any)
        codeIndex = setTimeout(() => mermaid.run(), 0) as any as number
        return `<pre class="mermaid">${text}</pre>`
      }
      const langText = lang.split(` `)[0]
      const language = hljs.getLanguage(langText) ? langText : `plaintext`
      let highlighted = hljs.highlight(text, { language }).value
      highlighted = highlighted.replace(/\t/g, `    `)
        .replace(/\r\n/g, `<br/>`).replace(/\n/g, `<br/>`)
        .replace(/(>[^<]+)|(^[^<]+)/g, s => s.replace(/\s/g, `&nbsp;`))

      const span = `<span class="mac-sign" style="padding:10px 14px 0;" hidden>${macCodeSvg}</span>`
      const code = `<code class="language-${lang}" ${styles(`code`)}>${highlighted}</code>`

      // 组装 class：默认 wx-code；开了“Mac 代码块”就再加 with-mac；
      // 如果语言是 md-sample（你可以自己定名），给 no-bg 以去掉背景
      const preClasses = ['hljs', 'code__pre', 'wx-code']
      if (opts.isMacCodeBlock) preClasses.push('with-mac')
      if (language === 'md-sample') preClasses.push('no-bg')

      return `<pre class="${preClasses.join(' ')}" ${styles(`code_pre`)}>${span}${code}</pre>`
      // return `<pre class="hljs code__pre" ${styles('code_pre')}>${span}${code}</pre>`
    },

    codespan({ text }: Tokens.Codespan): string {
      return styledContent('codespan', escapeHtml(text), 'code')
    },

    list({ ordered, items, start = 1 }: Tokens.List) {
      listOrderedStack.push(ordered)
      listCounters.push(Number(start))
      const html = items.map(item => this.listitem(item)).join('')
      listOrderedStack.pop()
      listCounters.pop()
      return styledContent(ordered ? 'ol' : 'ul', html)
    },

    listitem(token: Tokens.ListItem) {
      const ordered = listOrderedStack[listOrderedStack.length - 1]
      const idx = listCounters[listCounters.length - 1]!
      listCounters[listCounters.length - 1] = idx + 1
      const prefix = ordered ? `${idx}. ` : '• '

      let content: string
      try {
        content = this.parser.parseInline(token.tokens)
      } catch {
        content = this.parser.parse(token.tokens).replace(/^<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/, '$1')
      }
      return styledContent('listitem', `${prefix}${content}`, 'li')
    },

    image({ href, title, text }: Tokens.Image): string {
      const sub = styledContent('figcaption', transform((opts as any).legend!, text, title))
      return `<figure ${styles('figure')}><img ${styles('image')} src="${href}" title="${title}" alt="${text}"/>${sub}</figure>`
    },

    link({ href, title, text, tokens }: Tokens.Link): string {
      const parsedText = this.parser.parseInline(tokens)
      if (href.startsWith('https://mp.weixin.qq.com')) {
        return `<a href="${href}" title="${title || text}" ${styles('wx_link')}>${parsedText}</a>`
      }
      if (href === text) return parsedText
      if ((opts as any).citeStatus) {
        const ref = addFootnote(title || text, href)
        return `<span ${styles('link')}>${parsedText}<sup>[${ref}]</sup></span>`
      }
      return styledContent('link', parsedText, 'span')
    },

    strong({ tokens }: Tokens.Strong): string {
      return styledContent('strong', this.parser.parseInline(tokens))
    },

    em({ tokens }: Tokens.Em): string {
      return styledContent('em', this.parser.parseInline(tokens), 'span')
    },

    table({ header, rows }: Tokens.Table): string {
      const headerRow = header.map(c => this.tablecell(c)).join('')
      const body = rows
        .map(row => styledContent('tr', row.map(c => this.tablecell(c)).join('')))
        .join('')
      return `
        <section style="padding:0 8px; max-width:100%; overflow:auto">
          <table class="preview-table">
            <thead ${styles('thead')}>${headerRow}</thead>
            <tbody>${body}</tbody>
          </table>
        </section>
      `
    },

    tablecell(token: Tokens.TableCell): string {
      return styledContent('td', this.parser.parseInline(token.tokens))
    },

    hr(): string {
      return styledContent('hr', '')
    },
  }

  marked.use({ renderer })
  marked.use(markedSlider({ styles: styleMapping }))
  marked.use(markedAlert({ styles: styleMapping }))
  marked.use(
    MDKatex(
      { nonStandard: true },
      styles('inline_katex', ';vertical-align:middle;line-height:1'),
      styles('block_katex', ';text-align:center'),
    ),
  )
  marked.use(markedFootnotes())

  return {
    buildAddition: () => buildAddition(),
    buildFootnotes,
    setOptions,
    reset,
    parseFrontMatterAndContent,
    buildReadingTime,
    createContainer(content: string) {
      return styledContent('container', content, 'section')
    },
    getOpts,
  }
}
