export interface RunResult {
  ok: boolean;
  logs: string[];
  result?: string;
  error?: string;
  durationMs: number;
}

const WORKER_SOURCE = `
self.onmessage = async (e) => {
  const { code, input } = e.data;
  const logs = [];
  const fmt = (v) => typeof v === 'string' ? v : (() => { try { return JSON.stringify(v, null, 2); } catch { return String(v); } })();
  const console = {
    log: (...a) => logs.push(a.map(fmt).join(' ')),
    info: (...a) => logs.push(a.map(fmt).join(' ')),
    warn: (...a) => logs.push('warn: ' + a.map(fmt).join(' ')),
    error: (...a) => logs.push('error: ' + a.map(fmt).join(' ')),
  };
  try {
    const fn = new Function('input', 'console', '"use strict"; return (async () => {\\n' + code + '\\n})();');
    const value = await fn(input, console);
    self.postMessage({ ok: true, logs, result: value === undefined ? undefined : fmt(value) });
  } catch (err) {
    self.postMessage({ ok: false, logs, error: (err && err.message) || String(err) });
  }
};`;

let workerUrl: string | null = null;

/**
 * Runs JavaScript in a throwaway Web Worker: no DOM, no access to the page or your session,
 * and it is terminated after `timeoutMs`. `input` is available as a variable inside the code.
 */
export function runJavaScript(code: string, input: unknown = null, timeoutMs = 3000): Promise<RunResult> {
  if (!workerUrl) workerUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
  const started = performance.now();
  return new Promise((resolve) => {
    const worker = new Worker(workerUrl!);
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ ok: false, logs: [], error: `Stopped after ${timeoutMs / 1000}s. Check for an infinite loop.`, durationMs: timeoutMs });
    }, timeoutMs);
    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ...e.data, durationMs: Math.round(performance.now() - started) });
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ok: false, logs: [], error: e.message || 'Script error', durationMs: Math.round(performance.now() - started) });
    };
    worker.postMessage({ code, input });
  });
}
