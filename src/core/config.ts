import type { L10n } from './i18n';

export interface Person { name: L10n; zone: string; birthday: string }
export interface Airport { code: string; city: L10n; terminal: string; zone: string; lat: number; lng: number }
/** One flight: when it leaves and lands, each in that airport's local time (ISO with offset). */
export interface Leg { flight: string; from: Airport; to: Airport; departs: string; arrives: string }

const AIRPORTS = {
  hkg: { code: 'HKG', city: { zh: '香港', en: 'Hong Kong' }, terminal: 'T1', zone: 'Asia/Hong_Kong', lat: 22.3080, lng: 113.9185 },
  jfk: { code: 'JFK', city: { zh: '纽约', en: 'New York' }, terminal: 'T8', zone: 'America/New_York', lat: 40.6413, lng: -73.7781 },
} satisfies Record<string, Airport>;

export const config = {
  metOn: '2026-09-20',
  her: { name: { zh: '静仪', en: 'Jingyi' }, zone: 'Asia/Shanghai', birthday: '10-31' } satisfies Person,
  him: { name: { zh: '一帆', en: 'Yifan' }, zone: 'America/Chicago', birthday: '09-25' } satisfies Person,
  // Her ticket, booked 2026-11-08: Cathay Pacific, Hong Kong ⇄ New York. Times are local to each
  // airport. The hand-drawn CYF925 from our first Zoom stays in the Moments and the quiz as a memory.
  trip: {
    out: { flight: 'CX830', from: AIRPORTS.hkg, to: AIRPORTS.jfk, departs: '2027-02-04T09:30:00+08:00', arrives: '2027-02-04T12:00:00-05:00' } satisfies Leg,
    back: { flight: 'CX831', from: AIRPORTS.jfk, to: AIRPORTS.hkg, departs: '2027-02-14T13:40:00-05:00', arrives: '2027-02-15T18:55:00+08:00' } satisfies Leg,
    /** The AAG 2027 Annual Meeting, New York: the days Yifan is in sessions. */
    aag: { from: '2027-02-08', to: '2027-02-12' },
  },
  // The next time we meet: the outbound leg above, as the countdown and the map read it.
  // We meet in New York around the AAG 2027 Annual Meeting (8–12 Feb 2027).
  nextMeeting: {
    flight: 'CX830',
    at: '2027-02-04T09:30:00+08:00',
    date: '2027-02-04',
    from: { zh: '香港', en: 'Hong Kong' } satisfies L10n,
    place: { zh: '纽约', en: 'New York' } satisfies L10n,
    lat: 40.6413,
    lng: -73.7781,
  },
};
