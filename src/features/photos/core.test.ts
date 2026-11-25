import { describe, expect, it } from 'vitest';
import { applyFilter, byMonth, groupTrips, parseReading, stampFromExif, topTags, validLatLng, NO_FILTER, type Photo } from './core';

let n = 0;
const photo = (o: Partial<Photo> = {}): Photo => ({
  id: (++n).toString(16).padStart(32, '0'), takenAt: '2027-02-05T10:00:00', dateSource: 'exif', lat: null, lng: null, place: null,
  captionZh: null, captionEn: null, tags: [], who: 'yifan', name: 'IMG.jpg', w: 4, h: 3, uploadedAt: '2027-02-06T00:00:00Z', ...o,
});

describe('stampFromExif', () => {
  it('reads the EXIF string form', () => expect(stampFromExif('2026:10:31 18:42:07')).toBe('2026-10-31T18:42:07'));
  it('reads a Date as local wall-clock time', () => expect(stampFromExif(new Date(2026, 9, 31, 18, 42, 7))).toBe('2026-10-31T18:42:07'));
  it('refuses the zero date and junk', () => {
    expect(stampFromExif('0000:00:00 00:00:00')).toBeNull();
    expect(stampFromExif('yesterday')).toBeNull();
    expect(stampFromExif(undefined)).toBeNull();
  });
});

describe('validLatLng', () => {
  it('keeps a real place and drops 0,0 and out-of-range values', () => {
    expect(validLatLng(40.7, -74)).toBe(true);
    expect(validLatLng(0, 0)).toBe(false);
    expect(validLatLng(91, 0)).toBe(false);
    expect(validLatLng(NaN, 3)).toBe(false);
    expect(validLatLng('40', -74)).toBe(false);
  });
});

describe('applyFilter', () => {
  const a = photo({ takenAt: '2027-02-04T12:00:00', captionZh: '海边的日落', tags: ['beach', '海边'], who: 'jingyi', place: '纽约' });
  const b = photo({ takenAt: '2027-02-10T20:00:00', captionEn: 'A cat on the sofa', tags: ['cat', '猫'] });
  const c = photo({ takenAt: '2026-12-25T09:00:00', captionZh: '火锅', tags: ['hotpot'] });
  const all = [c, a, b];
  it('with nothing set, returns everything newest first', () => expect(applyFilter(all, NO_FILTER)).toEqual([b, a, c]));
  it('matches words in either language, any case, in captions, tags and place', () => {
    expect(applyFilter(all, { ...NO_FILTER, text: 'CAT' })).toEqual([b]);
    expect(applyFilter(all, { ...NO_FILTER, text: '海边' })).toEqual([a]);
    expect(applyFilter(all, { ...NO_FILTER, text: '纽约' })).toEqual([a]);
  });
  it('needs every word', () => expect(applyFilter(all, { ...NO_FILTER, text: 'beach cat' })).toEqual([]));
  it('includes both ends of a date range', () => {
    expect(applyFilter(all, { ...NO_FILTER, from: '2027-02-04', to: '2027-02-10' })).toEqual([b, a]);
    expect(applyFilter(all, { ...NO_FILTER, to: '2027-01-01' })).toEqual([c]);
  });
  it('filters by who added it', () => expect(applyFilter(all, { ...NO_FILTER, who: 'jingyi' })).toEqual([a]));
});

describe('byMonth and topTags', () => {
  it('splits a newest-first list into months', () => {
    const list = [photo({ takenAt: '2027-02-10T00:00:00' }), photo({ takenAt: '2027-02-01T00:00:00' }), photo({ takenAt: '2026-12-31T23:00:00' })];
    expect(byMonth(list).map((g) => [g.month, g.photos.length])).toEqual([['2027-02', 2], ['2026-12', 1]]);
  });
  it('counts a tag once per photo and ranks by count', () => {
    const list = [photo({ tags: ['cat', 'cat', 'sofa'] }), photo({ tags: ['cat'] }), photo({ tags: ['beach'] })];
    expect(topTags(list, 2)).toEqual(['cat', 'beach']);
  });
});

describe('groupTrips', () => {
  const at = (takenAt: string, lat: number, lng: number, place: string) => photo({ takenAt, lat, lng, place });
  it('cuts at a gap of more than three days and keeps places in the order seen', () => {
    const trips = groupTrips([
      at('2027-02-04T12:00:00', 40.7, -74, '纽约'),
      at('2027-02-07T09:00:00', 42.36, -71.06, '波士顿'),   // 69 hours later: same trip
      at('2027-02-07T18:00:00', 40.7, -74, '纽约'),
      at('2027-03-20T10:00:00', 22.5, 114.06, '深圳'),     // weeks later: a new trip
      photo({ takenAt: '2027-02-05T00:00:00' }),           // no place: not on the map
    ]);
    expect(trips.map((t) => [t.from, t.to, t.places, t.photos.length])).toEqual([
      ['2027-02-04', '2027-02-07', ['纽约', '波士顿'], 3],
      ['2027-03-20', '2027-03-20', ['深圳'], 1],
    ]);
  });
});

describe('parseReading', () => {
  it('takes JSON out of a fenced reply and cleans the tags', () => {
    const r = parseReading('Sure!\n```json\n{"zh":"海边的日落","en":"Sunset by the sea","tags":["Beach","beach","海边",3,""]}\n```');
    expect(r).toEqual({ zh: '海边的日落', en: 'Sunset by the sea', tags: ['beach', '海边'] });
  });
  it('accepts an object as is', () => expect(parseReading({ zh: '猫', tags: ['cat'] })).toEqual({ zh: '猫', en: null, tags: ['cat'] }));
  it('gives an empty reading for nonsense', () => expect(parseReading('no idea')).toEqual({ zh: null, en: null, tags: [] }));
});
