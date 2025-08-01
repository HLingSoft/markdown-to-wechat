// src/utils/customizeTheme.ts
import { cloneDeep } from 'es-toolkit'
import type { Theme } from '../types'

/**
 * 把「主色 & 字号」写进 theme.base，
 * 并派生出 blockquote/code 的默认背景色变量，供 buildAddition() 使用。
 *
 * @param baseTheme   原始 Theme（default / grace / simple …）
 * @param opts        { fontSize(px), color(hex|rgb|hsl) }
 * @returns           新 Theme（已带 base 变量）
 */
export function customizeTheme(
    baseTheme: Theme,
    opts: { fontSize: number; color: string },
): Theme {
    // 深拷贝，避免污染原 Theme
    const t = cloneDeep(baseTheme)

    /** 主色 */
    const primary = opts.color


    const codeBg = `color-mix(in srgb, ${primary} 6%,  #fff)`  // 6% 主色

    t.base = {
        ...t.base,
        '--md-primary-color': primary,

        '--code-background': codeBg,
        'font-size': `${opts.fontSize}px`,
    }

    t.block.blockquote!.background = 'var(--blockquote-background)'
    t.block.code_pre!.background = 'var(--code-background)'

    return t
}
