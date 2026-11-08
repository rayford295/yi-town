// Everything we build under jingyifan.love, newest last. The dashboard shows one card per entry;
// adding a product means a folder in src/features/, its routes in main.ts, and a line here.
import { t, type Key } from '../../core/i18n';
import { LEVELS, getPlayer, getProgress } from '../../core/quest';
import { playerName } from '../../core/quest-ui';
import { tripStatus } from '../trip/plan';

export type Product = {
  id: string;
  /** Where the card leads. */
  route: string;
  title: Key;
  blurb: Key;
  /** Picture under public/, or none for a plain card. */
  image?: string;
  /** A short line of live state for the card, if the product has any. */
  status?: () => string | null;
};

export const PRODUCTS: Product[] = [
  {
    id: 'town',
    route: '/town',
    title: 'dash.town.title',
    blurb: 'dash.town.blurb',
    image: 'media/dashboard/town.png',
    // Levels cleared by whoever plays on this device, e.g. "静仪 4/9". The other one's count is not
    // shown: how far Yifan has got would give away that there is an end worth reaching.
    status: () => {
      const p = getPlayer();
      if (!p) return null;
      const n = getProgress(p).cleared.length;
      return n ? `${playerName(p)} ${n}/${LEVELS.length}` : null;
    },
  },
  {
    // The infirmary: where one of us hides after a fight and reads what the other wrote in
    // advance. No status line on purpose: how often someone has hidden is theirs alone.
    id: 'clinic',
    route: '/clinic',
    title: 'dash.clinic.title',
    blurb: 'dash.clinic.blurb',
    image: 'media/dashboard/clinic.png',
    // Always open, straight from here: no level to clear, no door to find first.
    status: () => t('dash.clinic.open'),
  },
  {
    // Her ticket to New York: both legs and a clock that knows where in the trip we are. The
    // status line counts down to boarding, then counts the days together.
    id: 'trip',
    route: '/trip',
    title: 'dash.trip.title',
    blurb: 'dash.trip.blurb',
    image: 'media/dashboard/trip.png',
    status: () => tripStatus(new Date()),
  },
];
