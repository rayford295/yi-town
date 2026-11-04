// The infirmary's medicine: what each of us wrote in advance for the other one's bad days. A
// prescription is a letter for one kind of hurt; the cabinet is a stack of one-line notes drawn
// at random. Everything is addressed from one player to the other, so the patient only ever
// reads what the other one wrote. `{d}` becomes the day count since we met. (Drafts in Yifan's
// words, 2026-11-04; Jingyi's side is empty until she writes it, see README.md.)
import type { L10n } from '../../core/i18n';
import type { PlayerId } from '../../core/quest';

export type HurtId = 'fight' | 'hurt' | 'miss' | 'tired';
/** The four things the check-in desk asks about, in the order they are offered. */
export const HURTS: HurtId[] = ['fight', 'hurt', 'miss', 'tired'];

export interface Prescription { from: PlayerId; hurt: HurtId; paragraphs: { zh: string[]; en: string[] }; signature: L10n }
export interface CabinetNote { from: PlayerId; zh: string; en: string }

const yifan: L10n = { zh: '一帆', en: 'Yifan' };

export const PRESCRIPTIONS: Prescription[] = [
  {
    from: 'yifan', hurt: 'fight', signature: yifan,
    paragraphs: {
      zh: [
        '静仪，',
        '如果你是吵完架直接来的，先别急着看完。先喝一口水。',
        '我们吵架的时候，我说话会快、会冲，那是我最不像我的时候。你刚才看到的那个人不是全部的我，这封信才是。',
        '我从来不想赢你。赢了你，输的是我们两个人。所以你不用先低头，我也不用，我们只是都先停一停。',
        '等你从这里出去的时候，不管你想不想说话，我都在。你不发消息也没关系，我会发。',
        '这一剂是：先不解决问题，先解决心疼。',
      ],
      en: [
        'Jingyi,',
        'If you came here straight from a fight, do not rush to the end. Drink some water first.',
        'When we fight I talk fast and sharp; that is the moment I am least myself. The person you just saw is not all of me. This letter is.',
        'I have never wanted to win against you. If I win, we both lose. So you do not have to give in first, and neither do I; we just both stop for a while.',
        'When you walk out of here, whether or not you feel like talking, I am there. You do not have to message me; I will message you.',
        'This dose: do not fix the problem yet. Fix the ache first.',
      ],
    },
  },
  {
    from: 'yifan', hurt: 'hurt', signature: yifan,
    paragraphs: {
      zh: [
        '静仪，',
        '如果是我让你受伤了，对不起。不是「如果」，就是我。',
        '你受委屈的时候不想跟我说话，这我懂，这间屋子就是为这个盖的。你不用跟我说，但请让我在这里跟你说。',
        '你是我的宝贝，是我爱的人，是我未来的老婆。这几个字是我在生日卡上写的，每一个字今天都算数。',
        '我会自己去想我错在哪，不等你来告诉我。等你愿意出来的时候，我已经想好了。',
        '这一剂是：被我弄疼的地方，由我来负责。',
      ],
      en: [
        'Jingyi,',
        'If I hurt you, I am sorry. Not "if": it was me.',
        'When you are hurt you do not want to talk to me; I understand, and this room was built for exactly that. You do not have to talk to me. Please let me talk to you here.',
        'You are my treasure, the one I love, my future wife. I wrote those words on your birthday card, and every one of them counts today.',
        'I will go and find where I went wrong, without waiting for you to tell me. By the time you want to come out, I will have found it.',
        'This dose: whatever I made sore, I am the one responsible for.',
      ],
    },
  },
  {
    from: 'yifan', hurt: 'miss', signature: yifan,
    paragraphs: {
      zh: [
        '静仪，',
        '想我了又不想先开口，这件事我太熟了，我在这边也经常这样。',
        '所以我们定个规矩：谁先想，谁先说，不丢人。你看，这封信就是我先说的。',
        '我这边现在大概是你那边的昨天或者明天，但不管是哪一天，我都在想你。你打开这一页的时候，可以当作我刚刚发了一条「在吗」。',
        '想我就去喷泉边的信箱听我的声音，或者直接打视频。我永远接。',
        '这一剂是：先开口的那个人，是更勇敢的那个。',
      ],
      en: [
        'Jingyi,',
        'Missing me but not wanting to go first: I know that one well. I do it on my side all the time.',
        'So here is a rule: whoever misses first, says it first, and no one loses face. See, this letter is me saying it first.',
        'On my side it is roughly your yesterday or your tomorrow, but whichever day it is, I am missing you. When you open this page, take it as a "you there?" I just sent.',
        'If you miss me, go to the mailbox by the fountain and hear my voice, or just call. I always pick up.',
        'This dose: the one who speaks first is the braver one.',
      ],
    },
  },
  {
    from: 'yifan', hurt: 'tired', signature: yifan,
    paragraphs: {
      zh: [
        '静仪，',
        '什么都没发生，就是累了。这也是一种疼，而且是最容易被忽略的那种。',
        '腾讯的会一个接一个，需求改了又改，回到家还有两只猫要喂。你已经做得很好了。这句话今天要是没人跟你说，我来说。',
        '这间屋子没有任务，没有关卡，不用通关。你可以在这里什么都不做。',
        '睡一觉吧。明天的太阳从深圳湾升起来，比我这边早十三个小时。替我先看一眼。',
        '这一剂是：累了就躲，躲进来不丢人，我把门守着。',
      ],
      en: [
        'Jingyi,',
        'Nothing happened; you are just tired. That is a kind of hurt too, and the easiest one to overlook.',
        'Meeting after meeting at Tencent, requirements rewritten again, and two cats to feed when you get home. You are doing well. If no one told you that today, I am telling you now.',
        'This room has no task, no level, nothing to clear. You can do nothing at all here.',
        'Sleep. Tomorrow’s sun rises over Shenzhen Bay thirteen hours before it reaches me. Have a look at it for me first.',
        'This dose: when you are tired, hide. Hiding here is nothing to be ashamed of; I am keeping the door.',
      ],
    },
  },
];

// One line per note, drawn at random from the cabinet. Short enough to read in one breath.
export const CABINET: CabinetNote[] = [
  { from: 'yifan', zh: '我们吵的每一架，都是两个人站在同一边，问题在对面。', en: 'In every fight we have, we are on the same side; the problem is across the table.' },
  { from: 'yifan', zh: '十三个小时的时差，我一次都没嫌远。', en: 'Thirteen hours apart, and not once have I thought it far.' },
  { from: 'yifan', zh: '你是我选的那块巧克力。选了，就不换。', en: 'You are the chocolate I picked. Picked, and not putting back.' },
  { from: 'yifan', zh: '生气也可以，先把饭吃了。', en: 'Be angry if you want. Eat first.' },
  { from: 'yifan', zh: '咖啡和哆哆都站你这边。我也是。', en: 'Coffee and Duoduo are on your side. So am I.' },
  { from: 'yifan', zh: '我说错话的时候，心里想的不是那样。', en: 'When I say the wrong thing, it is not what my heart thinks.' },
  { from: 'yifan', zh: 'CYF925 还在飞，终点一直是你。', en: 'CYF925 is still in the air, and the destination has always been you.' },
  { from: 'yifan', zh: '深圳湾的房子，我记着呢。', en: 'The house by Shenzhen Bay: I have not forgotten.' },
  { from: 'yifan', zh: '你不理我的时候，我在等你，不是在生气。', en: 'When you are not talking to me, I am waiting, not sulking.' },
  { from: 'yifan', zh: '第一盘棋下在 Zoom 的白板上。从那天起，我们一直在同一块棋盘上。', en: 'Our first game was on a Zoom whiteboard. We have been on the same board ever since.' },
  { from: 'yifan', zh: '今天辛苦了。这句话我每天都想说。', en: 'You worked hard today. I want to say that every day.' },
  { from: 'yifan', zh: '纽约的二月很冷，我带着厚外套，和你。', en: 'February in New York is cold. I am bringing a thick coat, and you.' },
  { from: 'yifan', zh: '吵完架记得睡觉。醒来我还在。', en: 'After a fight, go to sleep. I will still be here when you wake.' },
  { from: 'yifan', zh: '你哭的时候，我这边的太阳都暗一点。', en: 'When you cry, the sun on my side dims a little.' },
  { from: 'yifan', zh: '什么都不用说，躲在这里就好。我在门口。', en: 'You do not have to say anything. Hide here. I am at the door.' },
  { from: 'yifan', zh: '戒指叫子午线，因为不管在哪条经线上，都是同一个你。', en: 'The ring is called Meridian: on whichever meridian, it is the same you.' },
  { from: 'yifan', zh: '今天是我们的第 {d} 天。还早，后面都是你。', en: 'Day {d} of us. Still early; the rest is all you.' },
  { from: 'yifan', zh: '「对不起」和「我爱你」，我都会先说。', en: '"Sorry" and "I love you": I will always say both first.' },
];

/** The letter the other one wrote for `patient` about `hurt`, if they have written it. */
export const prescriptionFor = (patient: PlayerId, hurt: HurtId): Prescription | undefined =>
  PRESCRIPTIONS.find((p) => p.from !== patient && p.hurt === hurt);

/** The notes the other one left for `patient`. */
export const cabinetFor = (patient: PlayerId): CabinetNote[] => CABINET.filter((n) => n.from !== patient);

/** A note from `notes` other than the one shown last, chosen by `rand` (0 ≤ rand < 1). */
export function drawNote(notes: CabinetNote[], last: CabinetNote | null, rand = Math.random()): CabinetNote | null {
  if (!notes.length) return null;
  const pool = notes.length > 1 && last ? notes.filter((n) => n !== last) : notes;
  return pool[Math.min(pool.length - 1, Math.floor(rand * pool.length))];
}

/** `{d}` filled in with the day count. */
export const fill = (s: string, days: number): string => s.replace('{d}', String(days));

/** An optional recording of a prescription read aloud: public/media/clinic/<hurt>-<from>.m4a. */
export const voiceSrc = (hurt: HurtId, from: PlayerId): string => `media/clinic/${hurt}-${from}.m4a`;
