import type { MarkedExtension } from 'marked'
import { tex2svg } from './tex2svg'

const inlineRule = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\1(?=[\s?!.,:？！。，：]|$)/
const inlineRuleNonStandard = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\1/
// 改成这样，就能匹配列表里常见的 4 个空格、8 个空格……所有缩进
// 原：^\s{0,3}...
// 新：
const blockRule = /^\s*(\${1,2})[ \t]*\n([\s\S]+?)\n\s*\1[ \t]*(?:\n|$)/



function createRenderer(inlineStyle: string, blockStyle: string) {
  return (token: { text: string; displayMode: boolean }) => {
    // 1) 用 tex2svg 代替 window.MathJax
    const svg = tex2svg(token.text, token.displayMode)

    // 2) 行内
    if (!token.displayMode) {
      return `<span ${inlineStyle}>${svg}</span>`
    }

    // 3) 块级
    return `<section ${blockStyle}>${svg}</section>\n`
  }
}

export function MDKatex(
  options: { nonStandard?: boolean } = {},
  inlineStyle = '',
  blockStyle = ''
): MarkedExtension {
  const nonStd = Boolean(options.nonStandard)

  // —— 块级（$$…$$），先于行内
  const blockExt = {
    name: 'blockKatex',
    level: 'block' as const,
    start(src: string) {
      return src.indexOf('$$')
    },
    tokenizer(src: string) {
      const m = src.match(blockRule)
      if (!m) return
      return {
        type: 'blockKatex',
        raw: m[0],
        text: m[2].trim(),
        displayMode: true
      }
    },
    renderer: createRenderer(inlineStyle, blockStyle)
  }

  // —— 行内 ($…$ 或 $$…$$)
  const inlineExt = {
    name: 'inlineKatex',
    level: 'inline' as const,
    start(src: string) {
      return src.indexOf('$')
    },
    tokenizer(src: string) {
      const rule = nonStd ? inlineRuleNonStandard : inlineRule
      const m = src.match(rule)
      if (!m) return
      return {
        type: 'inlineKatex',
        raw: m[0],
        text: m[2].trim(),
        displayMode: m[1].length === 2
      }
    },
    renderer: createRenderer(inlineStyle, blockStyle)
  }

  return {
    extensions: [
      blockExt,   // 一定先块级
      inlineExt,  // 再行内
    ]
  }
}
