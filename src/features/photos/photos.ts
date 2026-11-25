// Our Album (/photos): the two of us put photos in, a vision model says what is in each, and the
// page finds them by words, by dates and by who added them, as a grid by month or on a travel map.
// Not a level and no player needed; it opens from the dashboard. The pictures live behind the
// album key (api.ts), never at a public address.
import './photos.css';
import type * as Leaflet from 'leaflet';
import { t, getLang, type Key } from '../../core/i18n';
import { escapeAttr } from '../../core/html';
import { safeStorage } from '../../core/storage';
import { getPlayer } from '../../core/quest';
import { playerName, toast } from '../../core/quest-ui';
import {
  NO_FILTER, WHO, applyFilter, byMonth, groupTrips, oldestFirst, topTags,
  type Filter, type Photo, type Trip,
} from './core';
import {
  deletePhoto, describeAgain, dropImages, getKey, forgetKey, imageUrl, listPhotos, patchPhoto, setKey,
  takeKeyFromHash, uploadPhoto, type Fail,
} from './api';
import { prepare } from './prepare';

// ── State that outlives one render (the language button redraws the whole page) ──────────────
type UpState = 'preparing' | 'sending' | 'done' | 'dup' | 'decode' | 'fail';
type Up = { key: string; file: File; name: string; state: UpState };
const S = {
  photos: null as Photo[] | null,
  error: null as Fail | null,
  filter: { ...NO_FILTER } as Filter,
  view: 'grid' as 'grid' | 'map',
  ups: [] as Up[],
};
const store = safeStorage();
const WHO_KEY = 'yi.photos.who';
export const COUNT_KEY = 'yi.photos.count';
const uploader = (): string => getPlayer() ?? store.getItem(WHO_KEY) ?? '';
const nameOf = (who: string): string => (who === 'jingyi' || who === 'yifan' ? playerName(who) : who);
const caption = (p: Photo): string | null => (getLang() === 'zh' ? p.captionZh ?? p.captionEn : p.captionEn ?? p.captionZh);
const when = (p: Photo): string => `${p.takenAt.slice(0, 10)} ${p.takenAt.slice(11, 16)}`;
const monthLabel = (ym: string): string => {
  const [y, m] = ym.split('-').map(Number);
  return getLang() === 'zh' ? `${y} 年 ${m} 月` : new Date(y, m - 1, 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
};
const failText = (f: Fail): string => t(f === 'network' ? 'photos.err.network' : f === 'key' ? 'photos.pair.bad' : f === 'full' ? 'photos.err.full' : 'photos.err.server');

let redraw: (() => void) | null = null;   // the current render's way to draw the results again

async function load(): Promise<void> {
  const r = await listPhotos();
  if (r.ok) { S.photos = r.photos; S.error = null; store.setItem(COUNT_KEY, String(r.photos.length)); }
  else { S.error = r.reason; if (r.reason === 'key') S.photos = null; }
  redraw?.();
}

// ── Uploads run one at a time, whatever happens to the page ────────────────────────────────
let pumping = false;
async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    for (let up = S.ups.find((u) => u.state === 'preparing'); up; up = S.ups.find((u) => u.state === 'preparing')) {
      redraw?.();
      const ready = await prepare(up.file).catch(() => null);
      if (!ready) { up.state = 'decode'; continue; }
      up.state = 'sending'; redraw?.();
      const r = await uploadPhoto({ ...ready.meta, who: uploader() }, ready.full, ready.thumb);
      if (!r.ok) { up.state = 'fail'; if (r.reason === 'key') S.error = 'key'; if (r.reason === 'full') toast(t('photos.err.full')); continue; }
      up.state = r.duplicate ? 'dup' : 'done';
      if (S.photos && !S.photos.some((p) => p.id === r.photo.id)) S.photos = [r.photo, ...S.photos];
      store.setItem(COUNT_KEY, String(S.photos?.length ?? 0));
    }
  } finally {
    pumping = false;
    redraw?.();
  }
  // Finished rows leave after a moment; failed ones stay with a button.
  setTimeout(() => { S.ups = S.ups.filter((u) => u.state !== 'done' && u.state !== 'dup'); redraw?.(); }, 4000);
}
function addFiles(files: Iterable<File>): void {
  for (const file of files) {
    if (!file.type.startsWith('image/') && !/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)) continue;
    S.ups.push({ key: `${Date.now()}-${Math.random()}`, file, name: file.name, state: 'preparing' });
  }
  void pump();
}

// ── The page ────────────────────────────────────────────────────────────────────────────────
export function renderPhotos(root: HTMLElement): () => void {
  const fromLink = takeKeyFromHash();
  if (fromLink) { S.photos = null; S.error = null; }

  root.innerHTML = `
    <section class="album">
      <header class="sign album-head">
        <p class="eyebrow">${t('dash.eyebrow')}</p>
        <h1>${t('dash.photos.title')}</h1>
        <p class="album-sub">${t('photos.sub')}</p>
      </header>
      <div class="album-body"></div>
    </section>
    <dialog class="album-view" aria-label="${t('dash.photos.title')}"></dialog>`;
  const body = root.querySelector<HTMLElement>('.album-body')!;
  const dialog = root.querySelector<HTMLDialogElement>('.album-view')!;
  let map: Leaflet.Map | null = null;
  let lastList: Photo[] = [];
  let alive = true;
  const observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const img = e.target as HTMLImageElement;
      observer.unobserve(img);
      void imageUrl(img.dataset.id!, 'thumb').then((u) => { if (u) img.src = u; else img.classList.add('broken'); });
    }
  }, { rootMargin: '400px' });

  // The key panel, when this device has none (or the one it has stopped working).
  const pairPanel = (): string => `
    <form class="card album-pair">
      <h2>🔑 ${t('photos.pair.title')}</h2>
      <p>${t('photos.pair.body')}</p>
      ${S.error === 'key' && getKey() ? `<p class="album-warn">${t('photos.pair.bad')}</p>` : ''}
      <div class="album-pair-row">
        <input type="password" autocomplete="off" spellcheck="false" placeholder="${t('photos.pair.input')}" aria-label="${t('photos.pair.input')}" />
        <button class="btn" type="submit">${t('photos.pair.save')}</button>
      </div>
    </form>`;

  const toolbar = (): string => {
    const f = S.filter;
    const who = uploader();
    const tags = topTags(S.photos ?? []);
    return `
      <div class="card album-tools">
        <div class="album-tabs" role="tablist">
          <button type="button" role="tab" data-view="grid" aria-selected="${S.view === 'grid'}">🖼 ${t('photos.tab.grid')}</button>
          <button type="button" role="tab" data-view="map" aria-selected="${S.view === 'map'}">🗺 ${t('photos.tab.map')}</button>
          <label class="btn album-up">＋ ${t('photos.upload')}<input type="file" accept="image/*,.heic,.heif" multiple hidden /></label>
        </div>
        ${getPlayer() ? '' : `<div class="album-as">${t('photos.as')}
          ${WHO.map((w) => `<button type="button" data-as="${w}" aria-pressed="${who === w}">${nameOf(w)}</button>`).join('')}</div>`}
        <div class="album-filters">
          <input class="album-q" type="search" value="${escapeAttr(f.text)}" placeholder="${t('photos.search')}" aria-label="${t('photos.search')}" />
          <label>${t('photos.from')} <input class="album-from" type="date" value="${f.from}" /></label>
          <label>${t('photos.to')} <input class="album-to" type="date" value="${f.to}" /></label>
          <select class="album-who" aria-label="${t('photos.who.all')}">
            <option value="">${t('photos.who.all')}</option>
            ${WHO.map((w) => `<option value="${w}"${f.who === w ? ' selected' : ''}>${t('photos.who.mine', { name: nameOf(w) })}</option>`).join('')}
          </select>
          <button type="button" class="album-clear"${f.text || f.from || f.to || f.who ? '' : ' hidden'}>${t('photos.clear')}</button>
        </div>
        ${tags.length ? `<div class="album-tags">${tags.map((tg) => `<button type="button" data-tag="${escapeAttr(tg)}">#${escapeAttr(tg)}</button>`).join('')}</div>` : ''}
      </div>`;
  };

  const upList = (): string => !S.ups.length ? '' : `
    <ul class="album-ups">${S.ups.map((u) => `
      <li data-state="${u.state}"><span class="album-up-name">${escapeAttr(u.name)}</span>
        <span>${t(`photos.up.${u.state}` as Key)}</span>
        ${u.state === 'fail' ? `<button type="button" data-retry="${u.key}">${t('photos.up.retry')}</button>` : ''}</li>`).join('')}
    </ul>`;

  const thumb = (p: Photo): string => `
    <button type="button" class="album-thumb" data-open="${p.id}" style="aspect-ratio:${p.w} / ${p.h}" title="${escapeAttr(caption(p) ?? when(p))}">
      <img data-id="${p.id}" alt="${escapeAttr(caption(p) ?? '')}" />
    </button>`;

  const gridHtml = (list: Photo[]): string => byMonth(list).map((g) => `
    <section class="album-month">
      <h2>${monthLabel(g.month)} <small>${t('photos.count', { n: g.photos.length })}</small></h2>
      <div class="album-grid">${g.photos.map(thumb).join('')}</div>
    </section>`).join('');

  const tripLine = (tr: Trip, i: number): string => {
    const span = tr.from === tr.to ? tr.from : `${tr.from} → ${tr.to.slice(tr.from.slice(0, 4) === tr.to.slice(0, 4) ? 5 : 0)}`;
    return `<li><button type="button" data-trip="${i}">
      <b>${span}</b> <span>${(tr.places.length ? tr.places : [t('photos.unknown')]).map(escapeAttr).join(' → ')}</span>
      <small>${t('photos.trip.n', { n: tr.photos.length })} · ${t('photos.trip.show')}</small></button></li>`;
  };

  function drawMap(list: Photo[]): void {
    const host = body.querySelector<HTMLElement>('.album-map');
    if (!host) return;
    const trips = groupTrips(list);
    const tripsEl = body.querySelector<HTMLElement>('.album-trips')!;
    tripsEl.innerHTML = trips.length
      ? `<h2>${t('photos.trips')}</h2><ol>${trips.map(tripLine).reverse().join('')}</ol>`
      : `<p class="album-note">${t('photos.map.none')}</p>`;
    tripsEl.querySelectorAll<HTMLButtonElement>('[data-trip]').forEach((b) => b.addEventListener('click', () => {
      const tr = trips[Number(b.dataset.trip)];
      S.filter = { ...S.filter, from: tr.from, to: tr.to };
      draw();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }));
    void import('leaflet').then(async ({ default: L }) => {
      await import('leaflet/dist/leaflet.css');
      if (!alive || !host.isConnected) return;
      map?.remove();
      map = L.map(host, { zoomControl: true, worldCopyJump: true }).setView([30, 150], 2);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
      // Photos within about a kilometre share one pin; the pin shows the newest of them.
      const pins = new Map<string, Photo[]>();
      for (const p of list) {
        if (p.lat === null || p.lng === null) continue;
        const k = `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`;
        (pins.get(k) ?? pins.set(k, []).get(k)!).push(p);
      }
      const colours = ['#d4506d', '#3a7bbf', '#c39a5c', '#5b9a4a', '#8a5ab8'];
      trips.forEach((tr, i) => {
        const line = tr.photos.map((p) => [p.lat!, p.lng!] as [number, number]);
        if (line.length > 1) L.polyline(line, { color: colours[i % colours.length], weight: 3, opacity: 0.75, dashArray: '6 8' }).addTo(map!);
      });
      const bounds: [number, number][] = [];
      for (const group of pins.values()) {
        const p = group[0];
        bounds.push([p.lat!, p.lng!]);
        const icon = L.divIcon({
          className: 'album-pin', iconSize: [52, 52], iconAnchor: [26, 52],
          html: `<span class="album-pin-img"><img data-id="${p.id}" alt="" /></span>${group.length > 1 ? `<b>${group.length}</b>` : ''}`,
        });
        const m = L.marker([p.lat!, p.lng!], { icon, title: `${p.place ?? ''} ${when(p)}`, keyboard: true }).addTo(map!);
        m.on('click', () => openViewer(group.sort(oldestFirst), 0));
        const img = m.getElement()?.querySelector<HTMLImageElement>('img');
        if (img) void imageUrl(p.id, 'thumb').then((u) => { if (u) img.src = u; });
      }
      if (bounds.length === 1) map.setView(bounds[0], 11);
      else if (bounds.length) map.fitBounds(L.latLngBounds(bounds).pad(0.2), { maxZoom: 12 });
    });
  }

  function draw(): void {
    if (!alive) return;
    observer.disconnect();
    map?.remove(); map = null;
    if (!getKey() || (S.error === 'key' && !S.photos)) {
      body.innerHTML = pairPanel();
      const form = body.querySelector<HTMLFormElement>('.album-pair')!;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = form.querySelector('input')!.value.trim();
        if (!v) return;
        setKey(v); S.error = null; S.photos = null;
        body.innerHTML = `<p class="album-note">${t('photos.loading')}</p>`;
        void load();
      });
      return;
    }
    if (!S.photos) {
      body.innerHTML = `<p class="album-note">${S.error ? failText(S.error) : t('photos.loading')}</p>`;
      return;
    }
    const all = S.photos;
    const list = applyFilter(all, S.filter);
    lastList = list;
    const filtered = list.length !== all.length;
    body.innerHTML = `${toolbar()}${upList()}
      <p class="album-count">${filtered ? t('photos.count.of', { n: list.length, total: all.length }) : t('photos.count', { n: all.length })}</p>
      ${!all.length ? `<p class="album-note">${t('photos.empty')}</p>`
        : !list.length ? `<p class="album-note">${t('photos.none')}</p>`
        : S.view === 'grid' ? gridHtml(list)
        : `<div class="album-map card"></div><div class="album-trips"></div>`}
      <p class="album-foot"><button type="button" class="link album-forget">${t('photos.pair.forget')}</button></p>`;
    wire();
    if (S.view === 'grid') body.querySelectorAll<HTMLImageElement>('.album-grid img').forEach((img) => observer.observe(img));
    else if (list.length) drawMap(list);
  }
  redraw = draw;

  function wire(): void {
    const $ = <T extends HTMLElement>(sel: string) => body.querySelector<T>(sel);
    body.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.addEventListener('click', () => { S.view = b.dataset.view as 'grid' | 'map'; draw(); }));
    body.querySelectorAll<HTMLButtonElement>('[data-as]').forEach((b) => b.addEventListener('click', () => { store.setItem(WHO_KEY, b.dataset.as!); draw(); }));
    const picker = $<HTMLInputElement>('.album-up input');
    picker?.addEventListener('change', () => {
      if (!uploader()) { toast(t('photos.as') + ' …?'); picker.value = ''; return; }
      addFiles(Array.from(picker.files ?? []));
      picker.value = '';
    });
    // Typing filters as you go; the box keeps its focus and caret across the redraw.
    let typing: ReturnType<typeof setTimeout> | undefined;
    const q = $<HTMLInputElement>('.album-q');
    q?.addEventListener('input', () => {
      clearTimeout(typing);
      typing = setTimeout(() => {
        S.filter = { ...S.filter, text: q.value };
        const at = q.selectionStart;
        draw();
        const again = $<HTMLInputElement>('.album-q');
        again?.focus(); if (at !== null) again?.setSelectionRange(at, at);
      }, 250);
    });
    $<HTMLInputElement>('.album-from')?.addEventListener('change', (e) => { S.filter = { ...S.filter, from: (e.target as HTMLInputElement).value }; draw(); });
    $<HTMLInputElement>('.album-to')?.addEventListener('change', (e) => { S.filter = { ...S.filter, to: (e.target as HTMLInputElement).value }; draw(); });
    $<HTMLSelectElement>('.album-who')?.addEventListener('change', (e) => { S.filter = { ...S.filter, who: (e.target as HTMLSelectElement).value }; draw(); });
    $<HTMLButtonElement>('.album-clear')?.addEventListener('click', () => { S.filter = { ...NO_FILTER }; draw(); });
    body.querySelectorAll<HTMLButtonElement>('[data-tag]').forEach((b) => b.addEventListener('click', () => { S.filter = { ...S.filter, text: b.dataset.tag! }; draw(); }));
    body.querySelectorAll<HTMLButtonElement>('[data-retry]').forEach((b) => b.addEventListener('click', () => {
      const up = S.ups.find((u) => u.key === b.dataset.retry);
      if (up) { up.state = 'preparing'; void pump(); }
    }));
    body.querySelectorAll<HTMLButtonElement>('[data-open]').forEach((b) => b.addEventListener('click', () => {
      openViewer(lastList, lastList.findIndex((p) => p.id === b.dataset.open));
    }));
    $<HTMLButtonElement>('.album-forget')?.addEventListener('click', () => { forgetKey(); S.photos = null; S.error = null; draw(); });
  }

  // ── The viewer: one photo large, its words, its date and place, and what can be done to it ──
  function openViewer(list: Photo[], index: number): void {
    if (index < 0 || !list.length) return;
    let i = index;
    const show = (): void => {
      const p = list[i];
      const cap = caption(p);
      dialog.innerHTML = `
        <div class="album-view-inner">
          <div class="album-view-pic"><img alt="${escapeAttr(cap ?? '')}" /></div>
          <div class="album-view-text">
            <p class="album-view-cap">${cap ? escapeAttr(cap) : `<i>${t('photos.nocaption')}</i>`}</p>
            ${p.tags.length ? `<p class="album-view-tags">${p.tags.map((tg) => `<button type="button" data-tag="${escapeAttr(tg)}">#${escapeAttr(tg)}</button>`).join('')}</p>` : ''}
            <p class="album-view-meta">📅 ${when(p)}${p.dateSource === 'file' ? ` <small>(${t('photos.date.file')})</small>` : ''}
              ${p.place ? `<br/>📍 ${escapeAttr(p.place)}` : ''}<br/>👤 ${t('photos.by', { name: nameOf(p.who) })}</p>
            <form class="album-view-date" hidden>
              <input type="datetime-local" step="1" value="${p.takenAt}" required />
              <button class="btn" type="submit">${t('photos.save')}</button>
            </form>
            <div class="album-view-actions">
              <button type="button" data-act="date">${t('photos.date.edit')}</button>
              <button type="button" data-act="again">${t('photos.redescribe')}</button>
              <button type="button" data-act="delete" class="danger">${t('photos.delete')}</button>
            </div>
          </div>
          <button type="button" class="album-view-close" aria-label="${t('photos.close')}">✕</button>
          ${list.length > 1 ? `<button type="button" class="album-view-prev" aria-label="${t('photos.prev')}">‹</button>
            <button type="button" class="album-view-next" aria-label="${t('photos.next')}">›</button>` : ''}
        </div>`;
      const img = dialog.querySelector<HTMLImageElement>('.album-view-pic img')!;
      void imageUrl(p.id, 'thumb').then((u) => { if (u && !img.src) img.src = u; });
      void imageUrl(p.id, 'full').then((u) => { if (u) img.src = u; });
      const $ = <T extends HTMLElement>(sel: string) => dialog.querySelector<T>(sel);
      $('.album-view-close')!.addEventListener('click', () => dialog.close());
      $('.album-view-prev')?.addEventListener('click', () => { i = (i - 1 + list.length) % list.length; show(); });
      $('.album-view-next')?.addEventListener('click', () => { i = (i + 1) % list.length; show(); });
      dialog.querySelectorAll<HTMLButtonElement>('[data-tag]').forEach((b) => b.addEventListener('click', () => {
        dialog.close(); S.filter = { ...S.filter, text: b.dataset.tag! }; S.view = 'grid'; draw();
      }));
      const replace = (np: Photo) => {
        list[i] = np;
        if (S.photos) S.photos = S.photos.map((x) => (x.id === np.id ? np : x));
      };
      $('[data-act="date"]')!.addEventListener('click', () => { $<HTMLFormElement>('.album-view-date')!.hidden = false; });
      $<HTMLFormElement>('.album-view-date')!.addEventListener('submit', async (e) => {
        e.preventDefault();
        let v = $<HTMLInputElement>('.album-view-date input')!.value;
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) v += ':00';
        const r = await patchPhoto(p.id, { takenAt: v });
        if (r.ok) { replace(r.photo); show(); draw(); } else toast(failText(r.reason));
      });
      $('[data-act="again"]')!.addEventListener('click', async (e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.disabled = true; b.textContent = t('photos.reading');
        const r = await describeAgain(p.id);
        if (r.ok) { replace(r.photo); show(); draw(); }
        else { toast(failText(r.reason)); b.disabled = false; b.textContent = t('photos.redescribe'); }
      });
      $('[data-act="delete"]')!.addEventListener('click', async () => {
        if (!confirm(t('photos.delete.confirm'))) return;
        const r = await deletePhoto(p.id);
        if (!r.ok) { toast(failText(r.reason)); return; }
        dropImages(p.id);
        if (S.photos) S.photos = S.photos.filter((x) => x.id !== p.id);
        store.setItem(COUNT_KEY, String(S.photos?.length ?? 0));
        list.splice(i, 1);
        draw();
        if (!list.length) { dialog.close(); return; }
        i %= list.length; show();
      });
    };
    show();
    if (!dialog.open) dialog.showModal();
  }
  const keys = (e: KeyboardEvent) => {
    if (!dialog.open) return;
    if (e.key === 'ArrowLeft') dialog.querySelector<HTMLButtonElement>('.album-view-prev')?.click();
    if (e.key === 'ArrowRight') dialog.querySelector<HTMLButtonElement>('.album-view-next')?.click();
  };
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });   // a tap outside the photo
  document.addEventListener('keydown', keys);

  // Drag photos anywhere onto the page.
  const over = (e: DragEvent) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); };
  const dropped = (e: DragEvent) => {
    if (!e.dataTransfer?.files.length || !getKey()) return;
    e.preventDefault();
    if (!uploader()) { toast(t('photos.as') + ' …?'); return; }
    addFiles(Array.from(e.dataTransfer.files));
  };
  root.addEventListener('dragover', over);
  root.addEventListener('drop', dropped);

  draw();
  if (getKey()) void load();   // what is in memory shows at once, then is brought up to date

  return () => {
    alive = false;
    redraw = null;
    observer.disconnect();
    map?.remove();
    document.removeEventListener('keydown', keys);
    if (dialog.open) dialog.close();
  };
}
