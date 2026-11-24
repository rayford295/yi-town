// Ask Yifan, the server half: one POST /send from the /ask page becomes one email in Yifan's
// inbox, files attached. Nothing is stored. The only checks are the caller's origin and the size
// caps (Yifan, 2026-11-23: keep it simple); the binding can write to his inbox and nowhere else.
import { MAX_BYTES, MAX_FILES, humanSize, totalBytes, type Reason } from '../../src/features/ask/core';

/** What env.EMAIL.send takes: the structured message of Cloudflare's send_email binding. */
export type Mail = {
  to: string;
  from: { email: string; name: string };
  subject: string;
  text: string;
  attachments?: { filename: string; type: string; disposition: 'attachment'; content: ArrayBuffer }[];
};
export type Env = {
  EMAIL: { send(message: Mail): Promise<unknown> };
  /** Secret: the inbox. Never in the repository. */
  ASK_TO: string;
  /** Var: an address on the sending domain, ask@jingyifan.love. */
  ASK_FROM: string;
};

const ORIGINS = ['https://jingyifan.love', 'http://localhost:5173'];
const NAMES: Record<string, string> = { jingyi: '静仪', yifan: '一帆' };
const TAG = '[仪见小镇]';

/** A file name safe to put in a header: the last path part, no control characters (C0, C1, the
 * Unicode line and paragraph separators) or quotes. */
export function cleanName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  return base.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029"]/g, '').trim() || 'file';
}

/** One line: who, then the first 30 characters of what she wrote (or the first file's name). */
export function subjectFor(player: string | null, text: string, firstFile?: string): string {
  const who = player && Object.hasOwn(NAMES, player) ? `${NAMES[player]}：` : '';
  const chars = [...text.replace(/\s+/g, ' ').trim()];
  const gist = chars.length > 30 ? `${chars.slice(0, 30).join('')}…` : chars.join('');
  return `${TAG} ${who}${gist || firstFile || ''}`.trim();
}

const clock = (now: Date, zone: string): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: zone, dateStyle: 'short', timeStyle: 'short' }).format(now);

export async function handle(req: Request, env: Env, now: Date = new Date()): Promise<Response> {
  const origin = req.headers.get('Origin');
  if (!origin || !ORIGINS.includes(origin)) return Response.json({ ok: false, reason: 'server' }, { status: 403 });
  const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
  const no = (status: number, reason: Reason) => Response.json({ ok: false, reason }, { status, headers: cors });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST' || new URL(req.url).pathname !== '/send') return no(404, 'server');

  let form: FormData;
  try { form = await req.formData(); } catch { return no(400, 'empty'); }
  const field = (k: string): string => { const v = form.get(k); return typeof v === 'string' ? v : ''; };
  const text = field('text').trim();
  const files = form.getAll('files').filter((v): v is File => typeof v !== 'string');
  if (!text && !files.length) return no(400, 'empty');
  if (files.length > MAX_FILES) return no(413, 'too-many');
  if (totalBytes(files) > MAX_BYTES) return no(413, 'too-big');

  const names = files.map((f) => cleanName(f.name));
  const lines = [
    text || '（没有文字，只有文件）',
    '',
    '——',
    `深圳 ${clock(now, 'Asia/Shanghai')} · 德州 ${clock(now, 'America/Chicago')}`,
    `页面语言 ${field('lang') === 'en' ? 'en' : 'zh'}`,
    ...(files.length ? [`附件 ${files.length} 个：${files.map((f, i) => `${names[i]} (${humanSize(f.size)})`).join('、')}`] : []),
  ];
  const mail: Mail = {
    to: env.ASK_TO,
    from: { email: env.ASK_FROM, name: '仪见小镇' },
    subject: subjectFor(field('player') || null, text, names[0]),
    text: lines.join('\n'),
  };
  if (files.length) {
    mail.attachments = await Promise.all(files.map(async (f, i) => ({
      filename: names[i], type: f.type || 'application/octet-stream', disposition: 'attachment' as const, content: await f.arrayBuffer(),
    })));
  }
  try { await env.EMAIL.send(mail); }
  catch (err) {
    console.error('ask: send failed', (err as { code?: string }).code, (err as Error).message);
    return no(502, 'server');
  }
  return Response.json({ ok: true }, { headers: cors });
}
