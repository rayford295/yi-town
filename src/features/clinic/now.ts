// What the infirmary says about the doctor's side of the world right now: the letter was written
// long ago, but the patient should know whether the one who wrote it is asleep or at work.
import type { Key } from '../../core/i18n';
import { phaseAt } from '../world/daylight';

/** The i18n key of the opening line for the doctor's local `hour` (0–23, fractions allowed). */
export const doctorNowKey = (hour: number): Key => `clinic.rx.now.${phaseAt(hour)}` as Key;

/** Whole minutes since `since`, never less than one: a visit counts even when it is short. */
export const minutesSince = (since: number, now = Date.now()): number => Math.max(1, Math.round((now - since) / 60_000));
