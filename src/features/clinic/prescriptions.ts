// The infirmary's medicine: what each of us wrote in advance for the other one's bad days. A
// prescription is a letter for one kind of hurt; the cabinet is a stack of one-line notes drawn
// at random. Everything is addressed from one player to the other, so the patient only ever
// reads what the other one wrote. `{d}` becomes the day count since we met. (Both sides are
// drafts written 2026-11-04 in each one's voice, for each of us to rewrite; see README.md.)
import type { L10n } from '../../core/i18n';
import type { PlayerId } from '../../core/quest';

export type HurtId = 'fight' | 'hurt' | 'miss' | 'tired';
/** The four things the check-in desk asks about, in the order they are offered. */
export const HURTS: HurtId[] = ['fight', 'hurt', 'miss', 'tired'];

export interface Prescription { from: PlayerId; hurt: HurtId; paragraphs: { zh: string[]; en: string[] }; signature: L10n }
export interface CabinetNote { from: PlayerId; zh: string; en: string }

const yifan: L10n = { zh: '一帆', en: 'Yifan' };
const jingyi: L10n = { zh: '静仪', en: 'Jingyi' };

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
  {
    from: 'jingyi', hurt: 'fight', signature: jingyi,
    paragraphs: {
      zh: [
        '一帆，',
        '吵架了对吧。我知道你这会儿大概坐在屏幕前面来回刷消息，看我回了没有。先别刷了，看这封信。',
        '我生气的时候会不说话。那不是不要你，是我需要一点时间把话想清楚。你等得住，我就会回来。',
        '我们中间隔着一个太平洋，连吵架都要算时差，所以不要把一次吵架拖成两天。我这边天亮了，就当重新开始。',
        '你不用急着道歉，也不用急着讲道理。先告诉我，你吃饭了没有。',
        '这一剂是：我们可以生气，但不许走远。',
      ],
      en: [
        'Yifan,',
        'We fought, didn\u2019t we. I know you are probably sitting in front of the screen refreshing, checking whether I have replied. Stop refreshing. Read this instead.',
        'When I am angry I go quiet. That is not me leaving; it is me needing a little time to think the words through. If you can wait, I will come back.',
        'There is an ocean between us, and even our fights have a time difference, so let us not stretch one fight into two days. When the sun comes up on my side, we start again.',
        'You do not have to rush to apologise, or to explain. First tell me whether you have eaten.',
        'This dose: we are allowed to be angry, but not to go far.',
      ],
    },
  },
  {
    from: 'jingyi', hurt: 'hurt', signature: jingyi,
    paragraphs: {
      zh: [
        '一帆，',
        '如果是我说了什么让你难受，我现在就说对不起。我嘴快，有时候话比心先出来。',
        '你是那个什么都愿意为我做的人：做蛋糕、画机票、建一整座小镇。这样的人受了委屈，我比谁都心疼。',
        '你可以不用那么坚强。在我面前，你可以说「我也会难过」。',
        '等你愿意的时候，把这件事讲给我听。我会认真听完，不打断。',
        '这一剂是：你也是可以被哄的那一个。',
      ],
      en: [
        'Yifan,',
        'If I said something that hurt you, I am saying sorry right now. I speak fast, and sometimes the words get out before the heart does.',
        'You are the one who would do anything for me: bake the cake, draw the ticket, build a whole town. When someone like that is hurt, it hurts me more than anyone.',
        'You do not have to be that strong. In front of me you are allowed to say \u201cI get sad too.\u201d',
        'When you are ready, tell me what happened. I will listen to the end without interrupting.',
        'This dose: you are the one who gets comforted, too.',
      ],
    },
  },
  {
    from: 'jingyi', hurt: 'miss', signature: jingyi,
    paragraphs: {
      zh: [
        '一帆，',
        '想我了？我也想你。你看，我先说了，这次算我赢。',
        '你那边半夜的时候，我在开会；你起床的时候，我在回家的路上。我们的一天永远对不上，但我每天都会在你醒来之前留一句话，你去找。',
        '想我就打过来，不用挑时间。我在会上也会按一下「稍后回拨」，那是我在说「等我」。',
        '距离是暂时的。你画的那张机票上，写着日期。',
        '这一剂是：想了就说，说了我就在。',
      ],
      en: [
        'Yifan,',
        'Missing me? I miss you too. See, I said it first; this one I win.',
        'When it is the middle of the night for you, I am in a meeting; when you get up, I am on my way home. Our days never line up, but every day I leave you a line before you wake. Go and find it.',
        'If you miss me, call. Do not wait for a good time. Even in a meeting I will tap \u201ccall back later,\u201d and that means \u201cwait for me.\u201d',
        'The distance is temporary. The ticket you drew has a date on it.',
        'This dose: when you miss me, say so; when you say so, I am there.',
      ],
    },
  },
  {
    from: 'jingyi', hurt: 'tired', signature: jingyi,
    paragraphs: {
      zh: [
        '一帆，',
        '论文改到几点了？健身房、游泳馆、Dr. Zou 的办公室、超市，你一天跑这么多地方，累是应该的。',
        '你总说「没事」，可我知道那两个字后面藏着多少事。今天不用撑着，躺下就好。',
        '我替咖啡和哆哆问你好。它们趴在我腿上，听我念你的名字。',
        '等你睡醒，我这边刚好下班，我们视频。你不用说话，我说，你听。',
        '这一剂是：累了不是不够好，是做得太多了。',
      ],
      en: [
        'Yifan,',
        'How late did the paper keep you? The gym, the pool, Dr. Zou\u2019s office, the store; you run around so many places in a day, of course you are tired.',
        'You always say \u201cit\u2019s fine,\u201d and I know how much hides behind those words. Tonight you do not have to hold anything up. Just lie down.',
        'Coffee and Duoduo say hello. They are on my lap, listening to me say your name.',
        'When you wake up I will just be getting off work, and we will call. You do not have to talk; I will, and you listen.',
        'This dose: being tired does not mean you are not enough. It means you did too much.',
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
  { from: 'jingyi', zh: '我说「不跟你说话了」，意思是「过一会儿再说」。', en: 'When I say \u201cI\u2019m not talking to you,\u201d I mean \u201ctalk to me in a bit.\u201d' },
  { from: 'jingyi', zh: '深圳湾的房子可以晚一点，你不可以。', en: 'The house by Shenzhen Bay can wait. You cannot.' },
  { from: 'jingyi', zh: '你画的机票，我存在手机的第一页。', en: 'The ticket you drew is on the first page of my phone.' },
  { from: 'jingyi', zh: '开会的时候看到你的消息，我会偷偷笑。', en: 'When your message comes in during a meeting, I smile without anyone noticing.' },
  { from: 'jingyi', zh: '你那边天黑了，就当我在替你守着白天。', en: 'When it is dark on your side, think of me holding the daytime for you.' },
  { from: 'jingyi', zh: '我不是生你的气，我是舍不得你这么远。', en: 'I am not angry at you. I am sad that you are so far.' },
  { from: 'jingyi', zh: '蛋糕要你亲手做，我等得起。', en: 'The cake has to be baked by you. I can wait.' },
  { from: 'jingyi', zh: '你认真写论文的样子，我在视频里看过很多次了。', en: 'I have watched you write, through the screen, many times.' },
  { from: 'jingyi', zh: '咖啡今天又占了你的位置，我把它赶走了。', en: 'Coffee took your seat again today. I moved her.' },
  { from: 'jingyi', zh: '第一次视频我就知道，这个人会把我的名字记很久。', en: 'On our first call I knew: this one will remember my name for a long time.' },
  { from: 'jingyi', zh: '不要半夜回我消息。睡觉。', en: 'Do not reply at midnight. Sleep.' },
  { from: 'jingyi', zh: '你说「记下了」，我信。', en: 'You said \u201cnoted.\u201d I believe you.' },
  { from: 'jingyi', zh: '我们的时差是十三个小时，不是十三年。', en: 'Our time difference is thirteen hours, not thirteen years.' },
  { from: 'jingyi', zh: '下次吵架，先抱一下，再吵。', en: 'Next fight: hug first, then fight.' },
  { from: 'jingyi', zh: '你是我在深圳湾往那边看的时候，看着的那一边。', en: 'You are the far side of the bay I look toward.' },
  { from: 'jingyi', zh: '纽约见。穿厚一点。', en: 'See you in New York. Dress warm.' },
  { from: 'jingyi', zh: '第 {d} 天了，一天也没少想你。', en: 'Day {d}, and not one day without missing you.' },
  { from: 'jingyi', zh: '我也爱你。这句我不先说，但我一定会说。', en: 'I love you too. I may not say it first, but I will always say it.' },
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
