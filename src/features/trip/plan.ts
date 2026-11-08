// The trip, as a clock reads it: before she leaves, in the air, the days together in New York,
// the flight home, and after. Pure functions over the two legs in `config.trip`; the page and the
// dashboard card draw from `tripState`.
import { config, type Leg } from '../../core/config';
import { dayNumberSince, ymdInZone } from '../../core/dates';
import { t } from '../../core/i18n';

export type Phase = 'before' | 'out' | 'together' | 'back' | 'after';

export interface TripState {
  phase: Phase;
  /** The next moment worth counting down to: boarding, landing, boarding home, landing home. */
  until: Date | null;
  /** During the stay, which day it is by the calendar of the city she landed in (landing day = 1). */
  day?: number;
  /** Days of the stay, landing day to the day she flies home, inclusive. */
  total: number;
}

const ms = (iso: string) => new Date(iso).getTime();
const HOUR = 3_600_000;

/** Length of a flight in hours, from its two local times. */
export const legHours = (leg: Leg): number => (ms(leg.arrives) - ms(leg.departs)) / HOUR;

/** True when the landing date, where it lands, is after the take-off date, where it left. */
export const arrivesNextDay = (leg: Leg): boolean =>
  ymdInZone(new Date(leg.arrives), leg.to.zone) > ymdInZone(new Date(leg.departs), leg.from.zone);

export function tripState(now: Date, trip = config.trip): TripState {
  const { out, back } = trip;
  const landed = ymdInZone(new Date(out.arrives), out.to.zone);
  const total = dayNumberSince(landed, new Date(back.departs), out.to.zone);
  const t = now.getTime();
  if (t < ms(out.departs)) return { phase: 'before', until: new Date(out.departs), total };
  if (t < ms(out.arrives)) return { phase: 'out', until: new Date(out.arrives), total };
  if (t < ms(back.departs)) return { phase: 'together', until: new Date(back.departs), day: dayNumberSince(landed, now, out.to.zone), total };
  if (t < ms(back.arrives)) return { phase: 'back', until: new Date(back.arrives), total };
  return { phase: 'after', until: null, total };
}

/** One short line of live state for the dashboard card. */
export function tripStatus(now: Date): string {
  const s = tripState(now);
  switch (s.phase) {
    case 'before': { const d = Math.ceil((s.until!.getTime() - now.getTime()) / (24 * HOUR)); return t(d === 1 ? 'dash.trip.before.one' : 'dash.trip.before', { d }); }
    case 'out': return t('dash.trip.out');
    case 'together': return t('dash.trip.together', { n: s.day!, total: s.total });
    case 'back': return t('dash.trip.back');
    default: return t('dash.trip.after');
  }
}
