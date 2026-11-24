// Ask Yifan: she writes what she needs, attaches files, and sends. It lands in his inbox with the
// files (worker/), and he takes it from there. One way on purpose: his answer comes over WeChat
// or as the thing done. Not a level and no player needed; it opens from the dashboard.
import './ask.css';
import { t, getLang, type Key } from '../../core/i18n';
import { safeStorage } from '../../core/storage';
import { getPlayer } from '../../core/quest';
import { MAX_BYTES, check, humanSize, loadHistory, saveHistory, send, totalBytes, type Entry, type Reason } from './core';
import { shrink } from './shrink';

// The draft outlives a re-render: the language button redraws the whole page, and what she has
// typed and attached must still be there afterwards.
const draft: { text: string; files: File[] } = { text: '', files: [] };
let sending = false;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
};
const two = (n: number): string => String(n).padStart(2, '0');
const when = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${two(d.getHours())}:${two(d.getMinutes())}`;
};
const coarse = (): boolean => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

export function renderAsk(root: HTMLElement): () => void {
  const store = safeStorage();
  let history = loadHistory(store);
  let note: Reason | null = null;   // why the composer's draft cannot go, shown under the chips

  root.innerHTML = `
    <section class="ask">
      <header class="sign ask-head">
        <p class="eyebrow">${t('dash.eyebrow')}</p>
        <h1>${t('dash.ask.title')}</h1>
        <p class="ask-sub">${t('ask.sub')}</p>
      </header>
      <ol class="ask-log" aria-live="polite"></ol>
      <form class="ask-box card" novalidate>
        <ul class="ask-chips"></ul>
        <p class="ask-note" hidden></p>
        <div class="ask-row">
          <button class="ask-clip" type="button" aria-label="${t('ask.attach')}" title="${t('ask.attach')}">📎</button>
          <textarea rows="1" placeholder="${t('ask.placeholder')}" aria-label="${t('ask.placeholder')}"></textarea>
          <button class="ask-send" type="submit">${t('ask.send')}</button>
        </div>
        <input class="ask-file" type="file" multiple hidden />
      </form>
      <div class="ask-drop" hidden><span>${t('ask.drop')}</span></div>
    </section>`;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const log = $<HTMLOListElement>('.ask-log');
  const chips = $<HTMLUListElement>('.ask-chips');
  const noteEl = $<HTMLParagraphElement>('.ask-note');
  const area = $<HTMLTextAreaElement>('textarea');
  const sendBtn = $<HTMLButtonElement>('.ask-send');
  const picker = $<HTMLInputElement>('.ask-file');
  const drop = $<HTMLDivElement>('.ask-drop');
  area.value = draft.text;

  const grow = () => { area.style.height = 'auto'; area.style.height = `${Math.min(area.scrollHeight, 6 * 24 + 16)}px`; };

  const bubble = (text: string, files: { name: string; size: number }[], foot: HTMLElement): HTMLLIElement => {
    const li = el('li', 'ask-msg');
    if (text) li.append(el('p', 'ask-text', text));
    if (files.length) {
      const ul = el('ul', 'ask-files');
      for (const f of files) ul.append(el('li', '', `📄 ${f.name} · ${humanSize(f.size)}`));
      li.append(ul);
    }
    li.append(foot);
    return li;
  };
  const entryBubble = (e: Entry): HTMLLIElement => {
    const foot = el('p', 'ask-foot');
    if (e.state === 'sent') foot.textContent = `${when(e.at)} · ✓ ${t('ask.sent')}`;
    else {
      foot.classList.add('failed');
      foot.append(el('span', '', t(`ask.err.${e.reason ?? 'server'}` as Key)));
      // After a reload the composer no longer holds this draft: its text comes back, its files cannot.
      const lost = !draft.text && !draft.files.length;
      if (lost && e.files.length) foot.append(el('span', 'ask-refiles', t('ask.refiles')));
      const again = el('button', 'ask-retry', t('ask.retry'));
      again.type = 'button';
      again.addEventListener('click', () => {
        if (lost) { draft.text = e.text; area.value = e.text; grow(); }
        if (lost && e.files.length) { area.focus(); return; }
        void submit();
      });
      foot.append(again);
    }
    const li = bubble(e.text, e.files, foot);
    li.dataset.state = e.state;
    return li;
  };
  const drawLog = (pending?: HTMLLIElement) => {
    log.replaceChildren(...history.map(entryBubble));
    if (pending) { pending.classList.add('fresh'); log.append(pending); }   // only a new bubble rises in
    if (!log.children.length) log.append(el('li', 'ask-empty', t('ask.empty')));
    // The newest bubble sits just above the composer, which is pinned over the page's end: going
    // to the very bottom is the one position where the composer covers nothing.
    window.scrollTo(0, document.documentElement.scrollHeight);
  };
  const drawChips = () => {
    chips.replaceChildren(...draft.files.map((f, i) => {
      const li = el('li', 'ask-chip');
      li.append(el('span', 'ask-chip-name', f.name), el('small', '', humanSize(f.size)));
      const x = el('button', 'ask-chip-x', '×');
      x.type = 'button';
      x.setAttribute('aria-label', `${t('ask.remove')} ${f.name}`);
      x.addEventListener('click', () => { draft.files.splice(i, 1); note = null; drawChips(); });
      li.append(x);
      return li;
    }));
    if (draft.files.length) {
      const total = totalBytes(draft.files);
      const sum = el('li', 'ask-total', t('ask.total', { n: humanSize(total) }));
      if (total > MAX_BYTES) sum.classList.add('over');
      chips.append(sum);
    }
    noteEl.hidden = !note;
    noteEl.textContent = note ? t(`ask.err.${note}` as Key) : '';
    sendBtn.disabled = sending;
  };

  const addFiles = async (list: Iterable<File>, pasted = false) => {
    const now = new Date();
    for (const raw of list) {
      // A pasted screenshot arrives as "image.png"; a name with the time tells them apart.
      const named = pasted && /^image\.\w+$/.test(raw.name)
        ? new File([raw], `截图-${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}-${draft.files.length + 1}.png`, { type: raw.type })
        : raw;
      draft.files.push(await shrink(named));
    }
    note = null;
    drawChips();
  };

  async function submit(): Promise<void> {
    if (sending) return;   // a second tap while one is on its way sends nothing
    draft.text = area.value;
    const text = draft.text.trim();
    const files = [...draft.files];
    note = check(text, files);
    if (note) { drawChips(); return; }
    sending = true;
    // This attempt replaces any failed one: the composer was still holding that draft.
    history = history.filter((e) => e.state !== 'failed');
    drawChips();
    drawLog(bubble(text, files, el('p', 'ask-foot sending', t('ask.sending'))));
    const lang = getLang();
    const result = await send(text, files, { player: getPlayer(), lang });
    sending = false;
    const entry: Entry = {
      id: `${Date.now()}`, at: new Date().toISOString(), text,
      files: files.map((f) => ({ name: f.name, size: f.size })),
      state: result.ok ? 'sent' : 'failed', ...(result.ok ? {} : { reason: result.reason }),
    };
    history.push(entry);
    saveHistory(store, history);
    if (result.ok) { draft.text = ''; draft.files = []; }
    // The page may have been redrawn (language button) or left while the request was out.
    if (!root.isConnected || !root.contains(area)) return;
    if (result.ok) { area.value = ''; grow(); }
    drawChips();
    drawLog();
  }

  $<HTMLFormElement>('.ask-box').addEventListener('submit', (e) => { e.preventDefault(); void submit(); });
  $<HTMLButtonElement>('.ask-clip').addEventListener('click', () => picker.click());
  picker.addEventListener('change', () => { void addFiles([...(picker.files ?? [])]); picker.value = ''; });
  area.addEventListener('input', () => { draft.text = area.value; if (note) { note = null; drawChips(); } grow(); });
  area.addEventListener('keydown', (e) => {
    // Enter sends on a keyboard; on a phone it breaks the line, and the button sends. Enter that
    // confirms a pinyin candidate (isComposing) is never a send.
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || coarse()) return;
    e.preventDefault();
    void submit();
  });
  area.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files ?? [])];
    if (!files.length) return;
    e.preventDefault();
    void addFiles(files, true);
  });
  // Files dragged anywhere onto the page are attached; a dragged link or text is left alone.
  const carriesFiles = (e: DragEvent): boolean => [...(e.dataTransfer?.types ?? [])].includes('Files');
  let depth = 0;
  const onEnter = (e: DragEvent) => { if (!carriesFiles(e)) return; e.preventDefault(); depth++; drop.hidden = false; };
  const onOver = (e: DragEvent) => { if (carriesFiles(e)) e.preventDefault(); };
  const onLeave = (e: DragEvent) => { if (!carriesFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) drop.hidden = true; };
  const onDrop = (e: DragEvent) => {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    depth = 0; drop.hidden = true;
    void addFiles([...(e.dataTransfer?.files ?? [])]);
  };
  window.addEventListener('dragenter', onEnter);
  window.addEventListener('dragover', onOver);
  window.addEventListener('dragleave', onLeave);
  window.addEventListener('drop', onDrop);

  drawChips();
  drawLog(sending ? bubble(draft.text.trim(), draft.files, el('p', 'ask-foot sending', t('ask.sending'))) : undefined);
  grow();
  return () => {
    window.removeEventListener('dragenter', onEnter);
    window.removeEventListener('dragover', onOver);
    window.removeEventListener('dragleave', onLeave);
    window.removeEventListener('drop', onDrop);
  };
}
