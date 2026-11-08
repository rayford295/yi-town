// The eleven days in New York, one entry a day from her landing to her landing back home, and
// what we did on each. Written as we go: a day with no title shows "still growing" on the page.
// To add a day's story: fill in `title` and `note` (both languages); to add photos: drop the
// JPEGs into public/media/trip/ and list them under that day. The test fails on a missing file.
import type { L10n } from '../../core/i18n';
import type { Media } from '../moments/memories';

export interface TripDay {
  /** Calendar date in New York (the last entry: in Hong Kong). */
  ymd: string;
  title?: L10n;
  note?: L10n;
  media: Media[];
}

const day = (ymd: string, title?: L10n, note?: L10n, media: Media[] = []): TripDay => ({ ymd, title, note, media });

export const ITINERARY: TripDay[] = [
  day('2027-02-04', { zh: '落地', en: 'Landing' }, { zh: 'CX830，中午 12:00 落地肯尼迪机场 8 号航站楼。', en: 'CX830 lands at JFK, Terminal 8, at noon.' }),
  day('2027-02-05'),
  day('2027-02-06'),
  day('2027-02-07'),
  day('2027-02-08', { zh: 'AAG 年会，第一天', en: 'AAG Annual Meeting, day one' }, { zh: '白天开会，晚上是我们的。', en: 'Days for the conference, evenings for us.' }),
  day('2027-02-09'),
  day('2027-02-10'),
  day('2027-02-11'),
  day('2027-02-12', { zh: 'AAG 年会，最后一天', en: 'AAG Annual Meeting, last day' }),
  day('2027-02-13'),
  day('2027-02-14', { zh: '情人节 · 回程', en: 'Valentine’s Day · the flight home' }, { zh: '先过节，再去机场。CX831，13:40 起飞。', en: 'The day first, then the airport. CX831 leaves at 13:40.' }),
  day('2027-02-15', { zh: '到家', en: 'Home' }, { zh: '傍晚 18:55 落地香港。到了给我发条消息。', en: 'Lands in Hong Kong at 18:55. Send me a line when you do.' }),
];
