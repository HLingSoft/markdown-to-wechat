// src/setup-mathjax.ts
import { JSDOM } from 'jsdom'
import { mathjax } from 'mathjax-full/js/mathjax.js'
import { TeX } from 'mathjax-full/js/input/tex.js'
import { CHTML } from 'mathjax-full/js/output/chtml.js'
import { SVG } from 'mathjax-full/js/output/svg.js'
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js'

// ——— 1) 用 JSDOM 模拟浏览器环境 ———
const { window } = new JSDOM(`<!DOCTYPE html><body></body>`, {
    pretendToBeVisual: true,
})
    ; (global as any).window = window
    ; (global as any).document = window.document

// ——— 2) mathjax-full 渲染管线 ———
const adaptor = liteAdaptor()
RegisterHTMLHandler(adaptor)

// 你可以根据需要开更多 TeX 包
const tex = new TeX({ packages: ['base', 'ams', 'amsmath'] })

// HTML（CHTML）输出，用于行内/块公式的 HTML 版本
const chtml = new CHTML({
    fontURL:
        'https://cdn.jsdelivr.net/npm/mathjax-full@3.2.2/es5/output/chtml/fonts/woff-v2',
})
// SVG 输出，用于 MDKatex.js 里 tex2svg 调用
const svg = new SVG({
    fontURL:
        'https://cdn.jsdelivr.net/npm/mathjax-full@3.2.2/es5/output/svg/fonts',
})

// 分别创建两个 MathJax 文档实例
const mjChtml = mathjax.document('', { InputJax: tex, OutputJax: chtml })
const mjSvg = mathjax.document('', { InputJax: tex, OutputJax: svg })

// ——— 3) 挂到 window.MathJax ———
window.MathJax = {
    // 重置状态（MDKatex.js 会在渲染前调用）
    texReset() {
        mjChtml.reset()
        mjSvg.reset()
    },

    // MDKatex.js 里渲染 HTML 的接口
    tex2chtmlPromise(math: string, options: { display: boolean }) {
        const node = mjChtml.convert(math, options)
        return Promise.resolve(adaptor.outerHTML(node))
    },

    // MDKatex.js 里渲染 SVG 的接口，原代码会直接调用 tex2svg(...)
    tex2svg(math: string, options: { display: boolean }) {
        // 1) 生成一个 SVG 字符串
        const svgString = adaptor.outerHTML(mjSvg.convert(math, options))
        // 2) 用 JSDOM 的 document 解析成真实的 DOM 节点，返回 wrapper
        const wrapper = window.document.createElement('div')
        wrapper.innerHTML = svgString
        return wrapper
    },

    // MDKatex.js 有时会 await typesetPromise()
    typesetPromise() {
        return Promise.resolve()
    },
}
