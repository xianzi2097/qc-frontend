import { useState, useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, rectangularSelection } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap, HighlightStyle } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { lintKeymap } from '@codemirror/lint';
import { tags } from '@lezer/highlight';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { html as htmlLang } from '@codemirror/lang-html';
import type { Language } from './compilerApi';
import { LANGUAGE_CONFIG, submitCode, checkJudgeStatus } from './compilerApi';
import type { JudgeStatus, CompileResult } from './compilerApi';
import { CheckCircle, XCircle, Clock, HardDrive } from 'lucide-react';
import { CODE_TEMPLATES } from './compilerTemplates';

// ── 浅色语法高亮 ─────────────────────────────────────────
const lightHighlighting = HighlightStyle.define([
  { tag: tags.keyword, color: '#d73a49' },
  { tag: tags.string, color: '#032f62' },
  { tag: tags.number, color: '#005cc5' },
  { tag: tags.comment, color: '#6a737d', fontStyle: 'italic' },
  { tag: tags.function(tags.variableName), color: '#6f42c1' },
  { tag: tags.typeName, color: '#e36209' },
  { tag: tags.operator, color: '#d73a49' },
  { tag: tags.punctuation, color: '#24292e' },
  { tag: tags.variableName, color: '#24292e' },
]);

// ── 状态灯组件 ───────────────────────────────────────────
function StatusIndicator({ status }: { status: JudgeStatus }) {
  const config = {
    online:      { color: 'bg-green-500', text: 'Judge0 在线', ring: 'ring-green-500/30' },
    busy:        { color: 'bg-yellow-500', text: 'Judge0 繁忙', ring: 'ring-yellow-500/30' },
    offline:     { color: 'bg-red-500', text: 'Judge0 离线', ring: 'ring-red-500/30' },
    unconfigured:{ color: 'bg-gray-400', text: '待接入', ring: 'ring-gray-400/30' },
  }[status];

  return (
    <div className="flex items-center gap-2 text-xs text-ed-muted">
      <span className={`w-2 h-2 rounded-full ${config.color} ring-4 ${config.ring}`} />
      {config.text}
    </div>
  );
}



// ── localStorage 持久化 ─────────────────────────────────
const STORAGE_PREFIX = 'codePlayground_';
function loadState(lang: Language) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${lang}`);
    return raw ? JSON.parse(raw) as { code: string; stdin: string } : null;
  } catch { return null; }
}
function saveState(lang: Language, code: string, stdin: string) {
  try { localStorage.setItem(`${STORAGE_PREFIX}${lang}`, JSON.stringify({ code, stdin })); }
  catch { /* quota exceeded, ignore */ }
}

interface Props {
  language: Language;
}

/**
 * 在线编译器 — 左侧代码编辑，右侧输入输出
 */
export default function CodePlayground({ language }: Props) {
  const langConf = LANGUAGE_CONFIG[language];
  const saved = loadState(language);
  const [code, setCode] = useState(saved?.code ?? CODE_TEMPLATES[language]);
  const [stdin, setStdin] = useState(saved?.stdin ?? '');
  const [result, setResult] = useState<CompileResult | null>(null);
  const [running, setRunning] = useState(false);
  const [judgeStatus, setJudgeStatus] = useState<JudgeStatus>('unconfigured');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [fontSize, setFontSize] = useState(() => {
    try { return parseInt(localStorage.getItem('codePlayground_fontSize') || '16', 10); }
    catch { return 16; }
  });
  const MIN_FONT = 12, MAX_FONT = 28, DEFAULT_FONT = 16;
  const updateFontSize = (size: number) => {
    const clamped = Math.max(MIN_FONT, Math.min(MAX_FONT, size));
    setFontSize(clamped);
    localStorage.setItem('codePlayground_fontSize', String(clamped));
  };

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // ── 检查 Judge0 状态 ────────────────────────────────────
  useEffect(() => {
    checkJudgeStatus().then(setJudgeStatus);
  }, []);

  // ── 自动保存到 localStorage（防抖 500ms） ────────────
  useEffect(() => {
    const timer = setTimeout(() => saveState(language, code, stdin), 500);
    return () => clearTimeout(timer);
  }, [code, stdin, language]);

  // ── 初始化 CodeMirror ─────────────────────────────────
  useEffect(() => {
    if (!editorRef.current) return;

    const langExtension = language === 'python' ? python() : language === 'cpp' ? cpp() : htmlLang();

    const state = EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(lightHighlighting, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap,
          indentWithTab,
        ]),
        langExtension,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setCode(update.state.doc.toString());
          }
          // 更新光标位置
          const pos = update.state.selection.main.head;
          const line = update.state.doc.lineAt(pos);
          setCursorPos({ line: line.number, col: pos - line.from + 1 });
        }),
        EditorView.theme({
          '&': { height: '100%', backgroundColor: '#ffffff' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { fontFamily: "'Consolas', 'Monaco', monospace", fontSize: fontSize + 'px', color: '#24292e' },
          '.cm-gutters': { backgroundColor: '#f6f8fa', borderRight: '1px solid #e1e4e8', color: '#6a737d' },
          '.cm-cursor': { borderLeftColor: '#24292e' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, fontSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLocal = language === 'html';

  // ── 运行代码 ─────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (running || isLocal) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await submitCode({
        source_code: code,
        language_id: langConf.id!,
        stdin: stdin || undefined,
      });
      setResult(res);
    } catch (err) {
      setResult({
        stdout: null,
        stderr: err instanceof Error ? err.message : '执行失败',
        compile_output: null,
        time: null,
        memory: null,
        status: { id: 13, description: 'Internal Error' },
      });
    } finally {
      setRunning(false);
    }
  }, [code, stdin, langConf.id, running, isLocal]);

  // ── 快捷键 Ctrl+Enter 运行 ───────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleRun]);

  // ── 输出文本拼接 ─────────────────────────────────────
  const outputText = result
    ? [result.compile_output && `[编译输出]\n${result.compile_output}`,
       result.stderr && `[错误]\n${result.stderr}`,
       result.stdout].filter(Boolean).join('\n')
    : '';

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* ── Header ── */}
      <header className="ed-header flex items-center justify-between px-8 pt-2 pb-2 border-b border-ed-line">
        <h2 className="text-base font-semibold text-ed-ink">{isLocal ? 'HTML 演示' : '在线编译器'}</h2>
        <div className="flex items-center gap-4">
          {!isLocal && <StatusIndicator status={judgeStatus} />}
          {/* 字体大小调节 */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => updateFontSize(fontSize - 2)}
              disabled={fontSize <= MIN_FONT}
              className="w-6 h-6 rounded flex items-center justify-center text-ed-muted hover:bg-black/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
            >
              A-
            </button>
            <span className="w-8 text-center text-ed-body font-medium tabular-nums">{fontSize}</span>
            <button
              onClick={() => updateFontSize(fontSize + 2)}
              disabled={fontSize >= MAX_FONT}
              className="w-6 h-6 rounded flex items-center justify-center text-ed-muted hover:bg-black/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
            >
              A+
            </button>
            {fontSize !== DEFAULT_FONT && (
              <button
                onClick={() => updateFontSize(DEFAULT_FONT)}
                className="ml-1 text-ed-muted hover:text-brand transition-colors cursor-pointer"
                title="恢复默认"
              >
                ↺
              </button>
            )}
          </div>
          {!isLocal && (
          <button
            onClick={handleRun}
            disabled={running}
            className="text-xs px-4 py-1.5 rounded-lg bg-brand text-white hover:bg-brand/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {running ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                运行中
              </>
            ) : (
              '▶ 运行'
            )}
          </button>
          )}
        </div>
      </header>

      {/* ── 主体：左代码，右输入输出 ── */}
      <div className="flex-1 flex min-h-0">
        {/* 左：代码编辑器 */}
        <div className="w-1/2 min-h-0 border-r border-ed-line flex flex-col relative">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-ed-line ed-toolbar">
            <span className="text-xs font-medium text-ed-muted">{langConf.name} 代码</span>
            {!isLocal && <span className="text-xs text-ed-muted/60 ml-auto">Ctrl+Enter 运行</span>}
          </div>
          <div ref={editorRef} className="flex-1 min-h-0 overflow-auto" />
        </div>

        {/* 右侧：根据语言切换 */}
        {isLocal ? (
          /* HTML：实时预览 */
          <div className="w-1/2 min-h-0 flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-ed-line ed-toolbar">
              <span className="text-xs font-medium text-ed-muted">实时预览</span>
            </div>
            <iframe
              srcDoc={code}
              className="flex-1 w-full border-0 bg-white"
              title="HTML 预览"
              sandbox="allow-scripts"
            />
          </div>
        ) : (
          /* Python/C++：输入 + 输出 */
          <div className="w-1/2 min-h-0 flex flex-col">
            <div className="h-2/5 min-h-0 flex flex-col border-b border-ed-line">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-ed-line ed-toolbar">
                <span className="text-xs font-medium text-ed-muted">输入</span>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                spellCheck={false}
                placeholder="程序的标准输入 (stdin)..."
                className="flex-1 w-full p-4 font-mono text-sm leading-relaxed text-ed-ink bg-white resize-none focus:outline-none border-0 placeholder:text-ed-muted/40"
              />
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-ed-line ed-toolbar">
                <span className="text-xs font-medium text-ed-muted">输出</span>
              </div>
              <pre className="flex-1 w-full p-4 font-mono text-sm leading-relaxed text-ed-ink bg-white overflow-auto whitespace-pre-wrap">
                {running ? (
                  <span className="text-ed-muted animate-pulse">执行中...</span>
                ) : outputText ? (
                  outputText
                ) : (
                  <span className="text-ed-muted/40">运行结果将显示在这里</span>
                )}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* ── 底部状态栏 ── */}
      <footer className="flex items-center gap-3 px-4 py-1.5 border-t border-ed-line ed-toolbar text-[11px] text-ed-muted">
        <span>{langConf.name} {langConf.version}</span>
        <span>·</span>
        <span>UTF-8</span>
        <span>·</span>
        <span>行 {cursorPos.line}, 列 {cursorPos.col}</span>
        {result?.status && (
          <>
            <span className="ml-auto" />
            <span className={`flex items-center gap-1 font-medium ${result.status.id === 3 ? 'text-green-600' : 'text-red-500'}`}>
              {result.status.id === 3 ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {result.status.description}
            </span>
            {result.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {result.time}s</span>}
            {result.memory && <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> {(result.memory / 1024).toFixed(1)}MB</span>}
          </>
        )}
      </footer>
    </div>
  );
}
