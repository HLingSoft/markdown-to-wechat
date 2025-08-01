// src/utils/tex2svg.ts
import { mathjax } from 'mathjax-full/js/mathjax.js'
import { TeX } from 'mathjax-full/js/input/tex.js'
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js'
import { SVG } from 'mathjax-full/js/output/svg.js'
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js'

const adaptor = liteAdaptor()
RegisterHTMLHandler(adaptor)

const tex = new TeX({
    packages: AllPackages,
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
})

const svg = new SVG({ fontCache: 'none' })
const mjDocument = mathjax.document('', { InputJax: tex, OutputJax: svg })

export function tex2svg(texString: string, display = false): string {
    const container = mjDocument.convert(texString, { display })

    // firstChild 的类型是 LiteNode，需判断并转成元素
    const child = adaptor.firstChild(container)
    if (!child || adaptor.kind(child) !== 'element') {
        return adaptor.outerHTML(container)
    }
    const el = child as any // 缩小到元素；mathjax-full 未导出 LiteElement 类型，这里用 any

    const minWidth = (adaptor.getStyle(el, 'min-width') as string) || ''
    const attrWidth = (adaptor.getAttribute(el, 'width') as string) || ''

    if (attrWidth) adaptor.removeAttribute(el, 'width')
    adaptor.setStyle(el, 'max-width', '300vw')
    adaptor.setStyle(el, 'display', 'initial')
    adaptor.setStyle(el, 'flex-shrink', '0')

    const finalWidth = minWidth || attrWidth
    if (finalWidth) adaptor.setStyle(el, 'width', finalWidth)

    return adaptor.outerHTML(container)
}
