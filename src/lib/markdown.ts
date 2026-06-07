import hljs from 'highlight.js';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import 'highlight.js/styles/github-dark.css';

// 全局只配置一次
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
}));
marked.use({ breaks: true, gfm: true });

export function simpleMarkdown(md: string): string {
  return marked.parse(md) as string;
}
