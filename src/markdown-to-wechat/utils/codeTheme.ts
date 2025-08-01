import { readFileSync } from 'node:fs'

/**
 * 读取 highlight.js 的主题 CSS，并返回字符串。
 * 兼容 `<name>.css` 与 `<name>.min.css`。
 * 找不到时退回 github 主题。
 */
export function loadHljsThemeCss(name: string): string {
    const tryNames = [name, `${name}.min`, 'github']
    for (const n of tryNames) {
        try {
            const p = require.resolve(`highlight.js/styles/${n}.css`)
            return readFileSync(p, 'utf8')
        } catch { }
    }
    // 极端情况下的兜底
    try {
        const p = require.resolve('highlight.js/styles/github.css')
        return readFileSync(p, 'utf8')
    } catch {
        return '' // 最差也不阻塞渲染
    }
}
