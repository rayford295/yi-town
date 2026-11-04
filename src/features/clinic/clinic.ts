// The infirmary: where one of us hides after a fight and reads what the other wrote in advance.
// Check in with what hurts, breathe three times, read the prescription, draw a note from the
// cabinet, and write on the chart what you will not say out loud. Nothing here is a task.
import './clinic.css';
import { t, getLang, pick, type Key } from '../../core/i18n';
import { config } from '../../core/config';
import { dayNumberSince } from '../../core/dates';
import { getPlayer, type PlayerId } from '../../core/quest';
import { avatarHtml, playerName, toast } from '../../core/quest-ui';
import { prefersReducedMotion } from '../../core/motion';
import { escapeAttr } from '../../core/html';
import { go as navigate } from '../../core/router';
import { HURTS, cabinetFor, drawNote, fill, prescriptionFor, voiceSrc, type CabinetNote, type HurtId } from './prescriptions';
import { chart, checkIn, eraseChart, visits, writeChart } from './visits';

// Three breaths: in for four seconds, hold four, out for six.
const BREATHS = 3;
const PHASES: { key: Key; ms: number; cls: string }[] = [
  { key: 'clinic.breath.in', ms: 4000, cls: 'in' },
  { key: 'clinic.breath.hold', ms: 4000, cls: 'hold' },
  { key: 'clinic.breath.out', ms: 6000, cls: 'out' },
];

const when = (iso: string): string => {
  const d = new Date(iso);
  return getLang() === 'zh'
    ? `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export function renderClinic(root: HTMLElement): () => void {
  const p = getPlayer()!;
  const doctor: PlayerId = p === 'jingyi' ? 'yifan' : 'jingyi';
  const days = dayNumberSince(config.metOn, new Date(), p === 'jingyi' ? config.her.zone : config.him.zone);
  const seen = visits(p);
  const notes = cabinetFor(p);

  root.innerHTML = `
    <section class="clinic">
      <header class="clinic-head sign">
        ${avatarHtml(doctor, 'big')}
        <p class="eyebrow">${t('clinic.eyebrow')}</p>
        <h1>${t('clinic.title')}</h1>
        <p class="clinic-sub">${t('clinic.subtitle', { doctor: playerName(doctor) })}</p>
      </header>

      <div class="card clinic-desk" id="desk">
        <p class="eyebrow">${t('clinic.desk.eyebrow')}</p>
        <h2>${t('clinic.desk.title')}</h2>
        <div class="clinic-hurts">
          ${HURTS.map((h) => `<button type="button" class="hurt" data-hurt="${h}">${t(`clinic.hurt.${h}` as Key)}</button>`).join('')}
        </div>
        <p class="clinic-fine" id="visits">${seen ? t('clinic.visits', { n: seen }) : t('clinic.visits.first')}</p>
      </div>

      <div class="card clinic-breath" id="breath" hidden>
        <p class="eyebrow">${t('clinic.breath.eyebrow')}</p>
        <div class="breath-ring" id="breath-ring"><span id="breath-word"></span></div>
        <p class="clinic-fine" id="breath-round"></p>
        <button type="button" class="link" id="breath-skip">${t('clinic.breath.skip')}</button>
      </div>

      <article class="letter clinic-rx" id="rx" hidden></article>

      <div class="card clinic-cabinet">
        <p class="eyebrow">${t('clinic.cabinet.eyebrow')}</p>
        <h2>${t('clinic.cabinet.title')}</h2>
        <blockquote class="sticky" id="sticky"></blockquote>
        ${notes.length ? `<button type="button" class="btn" id="draw">${t('clinic.cabinet.more')}</button>` : ''}
      </div>

      <div class="card clinic-chart">
        <p class="eyebrow">${t('clinic.chart.eyebrow')}</p>
        <h2>${t('clinic.chart.title')}</h2>
        <textarea id="chart-text" rows="3" placeholder="${escapeAttr(t('clinic.chart.placeholder'))}"></textarea>
        <button type="button" class="btn" id="chart-save">${t('clinic.chart.save')}</button>
        <ul class="chart-lines" id="chart-lines"></ul>
      </div>

      <a class="cta" href="/town">${t('clinic.back')}</a>
    </section>`;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const desk = $('#desk'), breath = $('#breath'), rx = $('#rx');
  const ring = $('#breath-ring'), word = $('#breath-word'), round = $('#breath-round');
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => { const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
  const audio = new Audio();

  // The cabinet: one note at a time, never the same one twice in a row.
  const sticky = $('#sticky');
  let last: CabinetNote | null = null;
  const draw = () => {
    last = drawNote(notes, last);
    sticky.textContent = last ? fill(pick(last), days) : t('clinic.cabinet.empty', { name: playerName(doctor) });
    sticky.classList.remove('flip'); void sticky.offsetWidth; sticky.classList.add('flip');
  };
  draw();
  root.querySelector('#draw')?.addEventListener('click', draw);

  // The prescription for one hurt, after the breathing (or at once, under reduced motion).
  let hurt: HurtId | null = null;
  function showRx(): void {
    breath.hidden = true; audio.pause(); audio.removeAttribute('src');
    const h = hurt!;
    const title = t(`clinic.hurt.${h}` as Key);
    const rxp = prescriptionFor(p, h);
    rx.innerHTML = `
      <p class="eyebrow">${t('clinic.rx.eyebrow', { hurt: title })}</p>
      ${rxp
        ? `${rxp.paragraphs[getLang()].map((s) => `<p>${fill(s, days)}</p>`).join('')}
           <p class="signature">— ${pick(rxp.signature)}</p>
           <button type="button" class="rx-voice" id="rx-voice" hidden>▶ ${t('clinic.rx.listen')}</button>`
        : `<p class="rx-empty">${t('clinic.rx.empty', { name: playerName(doctor) })}</p>`}
      <div class="rx-actions">
        <button type="button" class="btn" id="rx-better">${t('clinic.rx.better')}</button>
        <button type="button" class="link" id="rx-another">${t('clinic.rx.another')}</button>
      </div>`;
    rx.hidden = false;
    rx.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    $('#rx-another').addEventListener('click', () => { rx.hidden = true; desk.hidden = false; audio.pause(); desk.scrollIntoView({ block: 'start' }); });
    $('#rx-better').addEventListener('click', () => { toast(t('clinic.better.toast')); navigate('/town'); });
    // A recording of the letter read aloud, if the doctor has left one (see public/media/clinic/).
    if (rxp) {
      const btn = $<HTMLButtonElement>('#rx-voice');
      audio.src = `${import.meta.env.BASE_URL}${voiceSrc(h, rxp.from)}`;
      audio.preload = 'metadata';
      audio.addEventListener('canplay', () => { btn.hidden = false; }, { once: true });
      btn.addEventListener('click', () => { audio.currentTime = 0; void audio.play(); });
    }
  }
  function breathe(): void {
    desk.hidden = true; rx.hidden = true; breath.hidden = false;
    breath.scrollIntoView({ behavior: 'smooth', block: 'start' });
    let i = 0, k = 0;   // breath i, phase k
    const step = () => {
      if (i >= BREATHS) { showRx(); return; }
      const ph = PHASES[k];
      ring.className = `breath-ring ${ph.cls}`;
      ring.style.setProperty('--dur', `${ph.ms}ms`);
      word.textContent = t(ph.key);
      round.textContent = t('clinic.breath.round', { i: i + 1, n: BREATHS });
      later(() => { k++; if (k === PHASES.length) { k = 0; i++; } step(); }, ph.ms);
    };
    step();
  }
  $('#breath-skip').addEventListener('click', () => { timers.forEach((id) => clearTimeout(id)); timers.clear(); showRx(); });
  root.querySelectorAll<HTMLButtonElement>('.hurt').forEach((b) => b.addEventListener('click', () => {
    hurt = b.dataset.hurt as HurtId;
    const n = checkIn(p);
    $('#visits').textContent = n === 1 ? t('clinic.visits.first') : t('clinic.visits', { n });
    if (prefersReducedMotion()) { desk.hidden = true; showRx(); } else breathe();
  }));

  // The chart: private lines, newest first, each with a way to tear it out.
  const lines = $('#chart-lines'), text = $<HTMLTextAreaElement>('#chart-text');
  const paint = (entries = chart(p)) => {
    lines.innerHTML = entries.length
      ? entries.map((e) => `<li><time>${when(e.at)}</time><span>${escapeAttr(e.text)}</span><button type="button" class="link" data-at="${escapeAttr(e.at)}">${t('clinic.chart.erase')}</button></li>`).join('')
      : `<li class="chart-empty">${t('clinic.chart.empty')}</li>`;
  };
  paint();
  $('#chart-save').addEventListener('click', () => { if (!text.value.trim()) return; paint(writeChart(p, text.value)); text.value = ''; });
  lines.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-at]');
    if (b) paint(eraseChart(p, b.dataset.at!));
  });

  return () => { timers.forEach((id) => clearTimeout(id)); audio.pause(); };
}
