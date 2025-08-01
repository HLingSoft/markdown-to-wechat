// src/index.ts
import './setup-dom'
import { JSDOM } from 'jsdom'

import { initRenderer } from './utils/renderer'
import { renderMarkdown, postProcessHtml, processClipboardContent } from './utils'
import { defaultTheme, themeMap } from './utils/theme'
import { customizeTheme } from './utils/customizeTheme'

import type { Theme } from './types'

export interface RenderResult {
    html: string
    headings: { url: string; title: string; level: number }[]
    readingTime: { chars: number; words: number; minutes: number }
}

export interface RenderOptions {
    // 业务开关
    citeStatus: boolean
    legend: string
    isUseIndent: boolean
    countStatus: boolean
    isMacCodeBlock: boolean

    // 字体
    fontFamily?: string
    fontSize?: string

    // === 三个可配置点 ===
    /** 主题：传 key（'default'|'grace'|'simple'）或直接传 Theme 对象（二选一） */
    themeName?: keyof typeof themeMap
    theme?: Theme
    /** 主色（写入 --md-primary-color） */
    primaryColor?: string
    /** 代码高亮主题（hljs 的 CSS 地址） */
    codeThemeHref?: string
}

/** 按传入选项生成最终主题（把字号/主色写进来） */
function resolveTheme(opts: RenderOptions): Theme {
    const base =
        opts.theme ??
        (opts.themeName ? themeMap[opts.themeName] : undefined) ??
        defaultTheme

    const fontSizeNum = Number((opts.fontSize ?? '16px').replace('px', ''))
    const color =
        opts.primaryColor ||
        (base.base?.['--md-primary-color'] as string) ||
        '#000'

    return customizeTheme(base, { fontSize: fontSizeNum, color })
}

export function markdownToHtml(raw: string, options: RenderOptions): RenderResult {
    // 1) 解析主题（样式主题 + 主色 + 字号）
    const resolvedTheme = resolveTheme(options)

    // 2) 初始化 renderer（renderer 只接收主题/字体/缩进等）
    const renderer = initRenderer({
        theme: resolvedTheme,
        fonts: options.fontFamily,
        size: options.fontSize,
        isUseIndent: options.isUseIndent,
        isMacCodeBlock: options.isMacCodeBlock,
    })

    // 3) 应用可切换开关
    renderer.reset({
        citeStatus: options.citeStatus,
        legend: options.legend,
        isUseIndent: options.isUseIndent,
        countStatus: options.countStatus,
        isMacCodeBlock: options.isMacCodeBlock,
    })

    // 4) 渲染 Markdown
    const { html: baseHtml, readingTime: rt } = renderMarkdown(raw, renderer)

    // 5) 统一收尾：把主色和代码主题 CSS 注入到最终 HTML
    const finalHtml = postProcessHtml(baseHtml, rt, renderer, {
        primaryColor: options.primaryColor,
        codeThemeHref: options.codeThemeHref,
    })

    // 6) 用 jsdom 提取目录
    const dom = new JSDOM(`<body><div id="output">${finalHtml}</div></body>`)

    const doc = dom.window.document

    processClipboardContent(options.primaryColor || '', doc)

    const headings = Array.from(doc.querySelectorAll<HTMLElement>('[data-heading]')).map((el, i) => {
        el.id = String(i)
        return {
            url: `#${i}`,
            title: el.textContent || '',
            level: Number(el.tagName.slice(1)),
        }
    })
    console.log('innerHTML', doc.getElementById('output')!.innerHTML)

    return {
        html: doc.getElementById('output')!.innerHTML,
        headings,
        readingTime: {
            chars: raw.length,
            words: rt.words,
            minutes: Math.ceil(rt.minutes),
        },
    }
}
