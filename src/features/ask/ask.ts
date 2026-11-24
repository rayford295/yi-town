// Ask Yifan: she writes what she needs, attaches files, and sends. It lands in his inbox with the
// files (worker/), and he takes it from there. One way on purpose: his answer comes over WeChat
// or as the thing done. Not a level and no player needed; it opens from the dashboard.
import './ask.css';
import { t, getLang, type Key } from '../../core/i18n';
import { safeStorage } from '../../core/storage';
import { getPlayer } from '../../core/quest';
import { MAX_BYTES, humanSize, send, totalBytes, type Entry } from './core';
import { createSession, sendsOnKey, takesPaste, type Session } from './session';
import { shrink } from './shrink';

// The state outlives the page (session.ts): the language button redraws everything, and what she
// has typed, attached and sent must still be there afterwards, a send on its way included.
let session: Session | undefined;
const live = (): Session => session ??= createSession({
  store: safeStorage(),
  send: (text, files) => send(text, files, { player: getPlayer(), lang: getLang() }),
  shrink,
});

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
  const s = live();

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
  area.value = s.draft.text;

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
      // After a reload the composer no longer holds this entry's files, and they cannot come back.
      if (e.files.length && !s.draft.files.length) foot.append(el('span', 'ask-refiles', t('ask.refiles')));
      const again = el('button', 'ask-retry', t('ask.retry'));
      again.type = 'button';
      again.disabled = s.busy;
      // Decided at the click, not when the bubble was drawn: the composer changes in between.
      again.addEventListener('click', () => { if (s.retry(e.id) !== 'sending') area.focus(); });
      foot.append(again);
    }
    const li = bubble(e.text, e.files, foot);
    li.dataset.state = e.state;
    return li;
  };
  let drawn = '';
  const drawLog = () => {
    // Redrawn only when what it shows changed: every redraw scrolls to the end of the page.
    const key = JSON.stringify([s.history.map((e) => [e.id, e.state]), s.pending, s.busy, s.draft.files.length > 0]);
    if (key === drawn) return;
    drawn = key;
    log.replaceChildren(...s.history.map(entryBubble));
    if (s.pending) {
      const li = bubble(s.pending.text, s.pending.files, el('p', 'ask-foot sending', t('ask.sending')));
      li.classList.add('fresh');   // only a new bubble rises in
      log.append(li);
    }
    if (!log.children.length) log.append(el('li', 'ask-empty', t('ask.empty')));
    // The newest bubble sits just above the composer, which is pinned over the page's end: going
    // to the very bottom is the one position where the composer covers nothing.
    window.scrollTo(0, document.documentElement.scrollHeight);
  };
  const drawChips = () => {
    chips.replaceChildren(...s.draft.files.map((f, i) => {
      const li = el('li', 'ask-chip');
      li.append(el('span', 'ask-chip-name', f.name), el('small', '', humanSize(f.size)));
      const x = el('button', 'ask-chip-x', '×');
      x.type = 'button';
      x.setAttribute('aria-label', `${t('ask.remove')} ${f.name}`);
      x.addEventListener('click', () => s.removeFile(i));
      li.append(x);
      return li;
    }));
    // Large photos are scaled down before they are attached; until then they show as one chip
    // and nothing can be sent, so no file is left behind.
    if (s.adding) chips.append(el('li', 'ask-chip adding', t('ask.adding', { n: s.adding })));
    if (s.draft.files.length) {
      const total = totalBytes(s.draft.files);
      const sum = el('li', 'ask-total', t('ask.total', { n: humanSize(total) }));
      if (total > MAX_BYTES) sum.classList.add('over');
      chips.append(sum);
    }
    noteEl.hidden = !s.note;
    noteEl.textContent = s.note ? t(`ask.err.${s.note}` as Key) : '';
    sendBtn.disabled = s.busy;
  };
  const draw = () => {
    // The composer shows the draft: emptied after a send, filled again by "send again".
    if (area.value !== s.draft.text) { area.value = s.draft.text; grow(); }
    drawChips();
    drawLog();
  };
  const unsubscribe = s.subscribe(draw);
  const submit = () => { s.setText(area.value); void s.submit(); };

  $<HTMLFormElement>('.ask-box').addEventListener('submit', (e) => { e.preventDefault(); submit(); });
  $<HTMLButtonElement>('.ask-clip').addEventListener('click', () => picker.click());
  picker.addEventListener('change', () => { void s.addFiles([...(picker.files ?? [])]); picker.value = ''; });
  area.addEventListener('input', () => { s.setText(area.value); grow(); });
  area.addEventListener('keydown', (e) => {
    // Enter sends on a keyboard; on a phone it breaks the line, and the button sends.
    if (!sendsOnKey(e, coarse())) return;
    e.preventDefault();
    submit();
  });
  area.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files ?? [])];
    if (!takesPaste([...(e.clipboardData?.types ?? [])], files.length)) return;
    e.preventDefault();
    void s.addFiles(files, true);
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
    void s.addFiles([...(e.dataTransfer?.files ?? [])]);
  };
  window.addEventListener('dragenter', onEnter);
  window.addEventListener('dragover', onOver);
  window.addEventListener('dragleave', onLeave);
  window.addEventListener('drop', onDrop);

  draw();
  grow();
  return () => {
    unsubscribe();
    window.removeEventListener('dragenter', onEnter);
    window.removeEventListener('dragover', onOver);
    window.removeEventListener('dragleave', onLeave);
    window.removeEventListener('drop', onDrop);
  };
}
