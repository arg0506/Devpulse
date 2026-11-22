import React, { useState } from 'react';
import { Check, Copy, Play, Loader2 } from 'lucide-react';
import { runJavaScript, RunResult } from './runCode';

// ---------- Tiny syntax highlighter ----------

const KEYWORDS = new Set(
  (
    'const let var function return if else for while do switch case break continue new class extends import from export default async await try catch finally throw typeof instanceof in of interface type enum implements public private protected static readonly ' +
    'def lambda pass yield with as elif None True False self print ' +
    'fn mut pub struct impl trait use mod match loop where crate ' +
    'select from where insert into update set delete join on group by order limit and or not null create table values'
  ).split(' '),
);

const TOKEN_RE =
  /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g;

export function highlight(code: string, language: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const hashComments = ['python', 'py', 'bash', 'sh', 'yaml', 'ruby'].includes(language.toLowerCase());
  let last = 0;
  let i = 0;
  for (const match of code.matchAll(TOKEN_RE)) {
    const tok = match[0];
    const idx = match.index ?? 0;
    if (idx > last) out.push(code.slice(last, idx));
    let cls = '';
    if (tok.startsWith('//') || tok.startsWith('/*') || (tok.startsWith('#') && hashComments)) cls = 'text-ink-3 italic';
    else if (tok.startsWith('#')) cls = '';
    else if (/^["'`]/.test(tok)) cls = 'text-ok';
    else if (/^\d/.test(tok)) cls = 'text-warn';
    else if (KEYWORDS.has(tok) || KEYWORDS.has(tok.toLowerCase())) cls = 'text-accent';
    else if (/^[A-Z]/.test(tok)) cls = 'text-ink font-medium';
    out.push(
      cls ? (
        <span key={i++} className={cls}>
          {tok}
        </span>
      ) : (
        tok
      ),
    );
    last = idx + tok.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

// ---------- Code block ----------

export function CodeBlock({ code, language, title }: { code: string; language: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const runnable = ['javascript', 'js'].includes(language.toLowerCase());

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const run = async () => {
    setRunning(true);
    setResult(await runJavaScript(code));
    setRunning(false);
  };

  return (
    <div className="my-2 max-w-full overflow-hidden rounded-lg border border-line bg-canvas">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <span className="truncate font-mono text-[11px] text-ink-3">
          {title ? <span className="text-ink-2">{title}</span> : null}
          {title ? ' · ' : ''}
          {language || 'text'}
        </span>
        <div className="flex items-center gap-0.5">
          {runnable && (
            <button
              type="button"
              onClick={run}
              disabled={running}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-ink-3 hover:bg-subtle hover:text-ink"
            >
              {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
              Run
            </button>
          )}
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-ink-3 hover:bg-subtle hover:text-ink"
          >
            {copied ? <Check size={11} className="text-ok" /> : <Copy size={11} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <pre className="max-h-80 overflow-auto px-3 py-2.5 font-mono text-[12px] leading-[1.65] text-ink-2">
        <code>{highlight(code, language)}</code>
      </pre>
      {result && (
        <div className="border-t border-line bg-surface px-3 py-2 font-mono text-[11.5px]">
          {result.logs.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap text-ink-2">
              {l}
            </div>
          ))}
          {result.ok && result.result !== undefined && <div className="whitespace-pre-wrap text-ink">← {result.result}</div>}
          {!result.ok && <div className="text-err">{result.error}</div>}
          <div className="mt-1 text-[10.5px] text-ink-3">
            {result.ok ? 'Finished' : 'Failed'} in {result.durationMs} ms · ran in an isolated worker
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Inline markdown ----------

// Italics need word boundaries, so snake_case identifiers such as first_name_value stay plain.
const INLINE_RE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|(?<![\w])_[^_\n]+_(?![\w])|https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]|(?<![\w@])@[a-z0-9_]{2,20})/gi;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const tok = m[0];
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const key = `${keyPrefix}-${i++}`;
    if (tok.startsWith('**'))
      out.push(
        <strong key={key} className="font-semibold text-ink">
          {tok.slice(2, -2)}
        </strong>,
      );
    else if (tok.startsWith('`'))
      out.push(
        <code key={key} className="rounded bg-subtle px-1 py-px font-mono text-[0.9em] text-ink">
          {tok.slice(1, -1)}
        </code>,
      );
    else if (tok.startsWith('_')) out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    else if (tok.startsWith('@'))
      out.push(
        <span key={key} className="rounded bg-accent/10 px-0.5 font-medium text-accent">
          {tok}
        </span>,
      );
    else
      out.push(
        <a
          key={key}
          href={tok}
          target="_blank"
          rel="noreferrer noopener"
          className="text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
        >
          {tok}
        </a>,
      );
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderBlocks(text: string, keyPrefix: string): React.ReactNode[] {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (!list.length) return;
    out.push(
      <ul key={`${keyPrefix}-ul-${out.length}`} className="my-1 list-disc space-0.5 pl-5">
        {list.map((item, i) => (
          <li key={i}>{renderInline(item, `${keyPrefix}-li-${out.length}-${i}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  lines.forEach((line, i) => {
    const bullet = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)/);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flushList();
    const heading = line.match(/^#{1,4}\s+(.*)/);
    if (heading) {
      out.push(
        <p key={`${keyPrefix}-h-${i}`} className="mt-1 font-semibold text-ink">
          {renderInline(heading[1], `${keyPrefix}-h-${i}`)}
        </p>,
      );
    } else if (line.trim() === '') {
      out.push(<div key={`${keyPrefix}-br-${i}`} className="h-2" />);
    } else {
      out.push(<p key={`${keyPrefix}-p-${i}`}>{renderInline(line, `${keyPrefix}-p-${i}`)}</p>);
    }
  });
  flushList();
  return out;
}

/** Renders message text: fenced code blocks, lists, headings, bold, italics, inline code, links and @mentions. */
export function Markdown({ text }: { text: string }) {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  const fence = /```([\w+-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(fence)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push(...renderBlocks(text.slice(last, idx).replace(/\n$/, ''), `t${i}`));
    parts.push(<CodeBlock key={`c${i}`} language={m[1] || 'text'} code={m[2].replace(/\n$/, '')} />);
    last = idx + m[0].length;
    i++;
  }
  if (last < text.length) parts.push(...renderBlocks(text.slice(last).replace(/^\n/, ''), `t${i}`));
  return <div className="break-words leading-[1.55] text-ink-2">{parts}</div>;
}
