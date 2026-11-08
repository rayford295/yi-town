// See You in New York: her ticket, both legs as boarding passes, the eleven days, and a clock
// that knows where in the trip we are. Not a level and no player needed: it opens from the
// dashboard for whoever is looking.
import './trip.css';
import { t, getLang, pick, type Key } from '../../core/i18n';
import { config, type Leg } from '../../core/config';
import { clockIn, countdownTo, formatDate, ymdInZone } from '../../core/dates';
import { escapeAttr } from '../../core/html';
import { arrivesNextDay, legHours, tripState } from './plan';
import { ITINERARY, type TripDay } from './itinerary';

const { out, back } = config.trip;

const hhmm = (iso: string, zone: string): string => clockIn(zone, new Date(iso), 'en').time;
const ymdAt = (iso: string, zone: string): string => ymdInZone(new Date(iso), zone);
const dateOf = (iso: string, zone: string): string => formatDate(ymdAt(iso, zone), getLang());
const duration = (leg: Leg): string => { const h = legHours(leg); return t('trip.duration', { h: Math.floor(h), m: Math.round((h % 1) * 60) }); };
const shortDate = (ymd: string): string => getLang() === 'zh' ? `${Number(ymd.slice(5, 7))} 月 ${Number(ymd.slice(8))} 日` : formatDate(ymd, 'en').replace(/, \d{4}$/, '');

/** One leg as a boarding pass: the two ends with their local times, the flight between. */
const passHtml = (leg: Leg, kind: 'out' | 'back'): string => `
  <article class="card pass pass-${kind}">
    <header class="pass-head">
      <span class="eyebrow">${t(`trip.leg.${kind}` as Key)}</span>
      <span class="pass-flight">${leg.flight}</span>
      <span class="pass-date">${dateOf(leg.departs, leg.from.zone)}</span>
    </header>
    <div class="pass-route">
      <div class="pass-end">
        <strong>${hhmm(leg.departs, leg.from.zone)}</strong>
        <b>${leg.from.code}</b>
        <span>${pick(leg.from.city)} · ${leg.from.terminal}</span>
      </div>
      <div class="pass-mid"><i class="pass-plane" aria-hidden="true">✈</i><span>${duration(leg)}</span></div>
      <div class="pass-end">
        <strong>${hhmm(leg.arrives, leg.to.zone)}${arrivesNextDay(leg) ? `<sup>${t('trip.nextday')}</sup>` : ''}</strong>
        <b>${leg.to.code}</b>
        <span>${pick(leg.to.city)} · ${leg.to.terminal}</span>
      </div>
    </div>
    <p class="pass-fine">${t('trip.local')}</p>
  </article>`;

/** One day of the trip: the date, what we did (or "still growing"), and its photos if any. */
const dayHtml = (d: TripDay, n: number, today: string): string => {
  const state = d.ymd < today ? 'past' : d.ymd === today ? 'today' : '';
  const photos = d.media.length ? `<div class="day-photos${d.media.length > 1 ? ' multi' : ''}">${d.media.map((m) => m.type === 'video'
    ? `<video src="${import.meta.env.BASE_URL}${m.src}" controls playsinline preload="metadata"></video>`
    : `<img src="${import.meta.env.BASE_URL}${m.src}" alt="${escapeAttr(pick(m.alt))}" loading="lazy" />`).join('')}</div>` : '';
  return `<li class="${state}${d.title ? '' : ' empty'}">
    <time datetime="${d.ymd}">${shortDate(d.ymd)}<small>${t('trip.day.n', { n })}</small></time>
    <div class="day-body">
      <h3>${d.title ? pick(d.title) : t('trip.day.empty')}</h3>
      ${d.note ? `<p>${pick(d.note)}</p>` : ''}
      ${photos}
    </div>
  </li>`;
};

export function renderTrip(root: HTMLElement): () => void {
  const today = ymdInZone(new Date(), out.to.zone);
  root.innerHTML = `
    <section class="trip">
      <header class="trip-head sign">
        <p class="eyebrow">${t('trip.eyebrow')}</p>
        <h1>${t('trip.title')}</h1>
        <p class="trip-sub">${t('trip.subtitle')}</p>
      </header>
      <section class="card trip-now" id="trip-now" aria-live="polite"></section>
      ${passHtml(out, 'out')}
      ${passHtml(back, 'back')}
      <section class="card trip-plan">
        <p class="eyebrow">${t('trip.plan.eyebrow')}</p>
        <h2>${t('trip.plan.title')}</h2>
        <ol class="plan">${ITINERARY.map((d, i) => dayHtml(d, i + 1, today)).join('')}</ol>
      </section>
      <a class="cta" href="/">${t('trip.back')}</a>
    </section>`;

  const now$ = root.querySelector<HTMLElement>('#trip-now')!;
  const grid = (until: Date, now: Date): string => {
    const cd = countdownTo(until, now);
    return `<div class="countdown-grid">${(['days', 'hours', 'minutes'] as const)
      .map((u) => `<div><strong>${cd[u]}</strong><span>${t(`home.countdown.${u}` as Key)}</span></div>`).join('')}</div>`;
  };
  const tick = () => {
    const now = new Date();
    const s = tripState(now);
    now$.dataset.phase = s.phase;
    switch (s.phase) {
      case 'before': now$.innerHTML = `<p class="countdown-title">${t('trip.now.before', { flight: out.flight })}</p>${grid(s.until!, now)}`; break;
      case 'out': now$.innerHTML = `<p class="countdown-title">${t('trip.now.out')}</p>${grid(s.until!, now)}`; break;
      case 'together': now$.innerHTML = `<p class="trip-day">${t('trip.now.together', { n: s.day!, total: s.total })}</p>
        <p class="countdown-title">${t('trip.now.together.left')}</p>${grid(s.until!, now)}`; break;
      case 'back': now$.innerHTML = `<p class="countdown-title">${t('trip.now.back')}</p>${grid(s.until!, now)}`; break;
      default: now$.innerHTML = `<p class="together">${t('trip.now.after')}</p>`;
    }
  };
  tick();
  const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);
}
