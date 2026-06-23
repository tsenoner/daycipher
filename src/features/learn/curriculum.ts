export type ExampleCheck =
  | { kind: 'ymd'; year: number; month: number; day: number }
  | { kind: 'yearDoom'; year: number }

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'mnemonic'; text: string }
  | { kind: 'example'; date: string; steps: string[]; answer: string; check?: ExampleCheck }

export interface Stage {
  id: string
  n: number
  title: string
  goal: string
  blocks: Block[]
  /** Mastery threshold K ("K of the last M" correct); defaults to 4 when unset. */
  k?: number
  /** Mastery window M ("K of the last M"); defaults to 5 when unset. */
  m?: number
}

export const CURRICULUM: Stage[] = [
  {
    id: 'mod7',
    n: 1,
    title: 'Think in 7s',
    goal: 'Treat weekdays as numbers 0–6 and add them by casting out sevens.',
    k: 3,
    m: 4,
    blocks: [
      {
        kind: 'p',
        text: 'Doomsday is all arithmetic, so first turn weekdays into numbers: Sunday 0, Monday 1, Tuesday 2, Wednesday 3, Thursday 4, Friday 5, Saturday 6. You compute a number, then read off the day.',
      },
      {
        kind: 'mnemonic',
        text: 'The number IS the name: Noneday 0 · Oneday 1 · Twosday 2 · Treble 3 · Foursday 4 · Fiveday 5 · Six-a-day 6.',
      },
      {
        kind: 'p',
        text: 'Weekdays repeat every 7 days, so adding or removing 7 lands on the exact same day. Whenever a total passes 6, subtract 7 — casting out sevens. 9 → 2, 13 → 6. So 4 days after Friday is 5 + 4 = 9, and 9 is really 2 (cast out sevens) → Tuesday.',
      },
      {
        kind: 'p',
        text: 'Multiples of 7 are invisible: the 7th, 14th, 21st and 28th of a month all share one weekday, and the 27th matches the 6th (27 − 21 = 6).',
      },
    ],
  },
  {
    id: 'leap',
    n: 2,
    title: 'Leap years',
    goal: 'Decide leap-or-not at a glance, and know why it only touches Jan/Feb.',
    blocks: [
      {
        kind: 'p',
        text: 'A leap year adds February 29. Divisible by 4 is a leap year — except divisible by 100, which is not — except divisible by 400, which is.',
      },
      { kind: 'mnemonic', text: '÷4 yes · ÷100 no · ÷400 yes again.' },
      {
        kind: 'list',
        items: ['2024 ✓ (÷4)', '1900 ✗ (÷100, not ÷400)', '2000 ✓ (÷400)', '2100 ✗ (÷100, not ÷400)'],
      },
      {
        kind: 'p',
        text: 'Faster: for any year not ending in 00, only the last two digits matter — divisible by 4 means leap. The hundreds always end in 00, and 100 is a multiple of 4, so they never change the answer. 1968 → 68 ✓, 2008 → 08 ✓.',
      },
      { kind: 'mnemonic', text: 'Last two digits ÷4 — unless they are 00, then ÷400.' },
      {
        kind: 'p',
        text: 'Feb 29 falls before every anchor from March on, so a leap year shifts only the two earliest anchors: Jan 3 → 4, Feb 28 → 29. Every later month is untouched.',
      },
    ],
  },
  {
    id: 'months',
    n: 3,
    title: 'Month anchors',
    goal: 'Memorize one anchor date per month — they all land on the year’s doomsday.',
    k: 3,
    m: 4,
    blocks: [
      {
        kind: 'p',
        text: 'A handful of easy dates every year all land on the SAME weekday — that’s the year’s doomsday. Learn one anchor per month, and every other date is a short count away.',
      },
      { kind: 'p', text: 'Even months are free — the day equals the month:' },
      {
        kind: 'list',
        items: ['4/4 (Apr 4)', '6/6 (Jun 6)', '8/8 (Aug 8)', '10/10 (Oct 10)', '12/12 (Dec 12)'],
      },
      {
        kind: 'mnemonic',
        text: 'Odd months: “I work 9-to-5 at the 7-Eleven.” → 9/5, 5/9, 7/11, 11/7 (Sep 5, May 9, Jul 11, Nov 7).',
      },
      {
        kind: 'list',
        items: [
          'March: Pi Day, 3/14',
          'January: the 3rd in common years, the 4th in leap years',
          'February: the last day — the 28th in common years, the 29th in leap years',
        ],
      },
      {
        kind: 'p',
        text: 'Only Jan and Feb change in leap years — the trap that catches everyone. Every other anchor is the same all years.',
      },
    ],
  },
  {
    id: 'thisyear',
    n: 4,
    title: 'Dates in this year',
    goal: 'Solve any date in the current year from one fact — this year’s doomsday.',
    blocks: [
      {
        kind: 'p',
        text: 'With the month anchors plus one fact — this year’s doomsday — you can solve real dates today. For {thisYear} the doomsday is {thisYearDoomsday}.',
      },
      {
        kind: 'p',
        text: 'Take the nearest month anchor, then step forward to your day, casting out sevens.',
      },
      {
        kind: 'example',
        date: '25 December 2030',
        steps: [
          '2030’s doomsday = Thursday',
          'Nearest December anchor: 12/12 = Thursday',
          'From the 12th to the 25th: 25 − 12 = 13 → cast out 7 → 6',
          'Thursday (4) + 6 = 10 → cast out 7 → 3 = Wednesday',
        ],
        answer: 'Wednesday',
        check: { kind: 'ymd', year: 2030, month: 12, day: 25 },
      },
    ],
  },
  {
    id: 'century',
    n: 5,
    title: 'Century anchors',
    goal: 'Know the anchor weekday — the doomsday of year 00 — for each century.',
    blocks: [
      {
        kind: 'p',
        text: 'Every century has a base weekday: the doomsday of its year 00.',
      },
      {
        kind: 'list',
        items: [
          '1700s → Sunday',
          '1800s → Friday',
          '1900s → Wednesday',
          '2000s → Tuesday',
          '2100s → Sunday',
        ],
      },
      {
        kind: 'mnemonic',
        text: '1900s = “We-in-dis-day” (Wednesday) · 2000s = “Y-Tues-K” (Tuesday).',
      },
      {
        kind: 'p',
        text: 'They cycle every 400 years: Tuesday, Sunday, Friday, Wednesday. If you’d rather compute it: anchor = (5 × (c mod 4) + 2) mod 7, where c = the first two digits (Sunday = 0).',
      },
    ],
  },
  {
    id: 'year',
    n: 6,
    title: 'The year’s doomsday (Odd+11)',
    goal: 'Turn the century anchor into a specific year’s doomsday — with pure addition.',
    blocks: [
      {
        kind: 'p',
        text: 'Odd+11 works the last two digits of the year with no division and no negatives.',
      },
      {
        kind: 'list',
        items: [
          'Last two digits T; if T is odd, +11',
          'Halve it',
          'If the result is odd, +11',
          'Take 7 − (result mod 7)',
          'Count that many days forward from the century anchor',
        ],
      },
      {
        kind: 'p',
        text: 'Free self-check: just before the mod 7, your number should be EVEN. If it’s odd, you slipped somewhere — go back.',
      },
      {
        kind: 'example',
        date: 'Year 2005',
        steps: [
          'T = 05 is odd → +11 = 16',
          'Halve: 16 ÷ 2 = 8',
          '8 is even → leave it',
          '7 − (8 mod 7) = 7 − 1 = 6',
          '2000s anchor is Tuesday; Tuesday (2) + 6 = 8 → cast out 7 → 1 = Monday',
        ],
        answer: 'Monday — every doomsday date in 2005 is a Monday',
        check: { kind: 'yearDoom', year: 2005 },
      },
      {
        kind: 'p',
        text: 'Once Odd+11 is solid, Conway’s classic ⌊y/12⌋ + y mod 12 + ⌊(y mod 12)/4⌋ gives the same answer — just with more division.',
      },
    ],
  },
  {
    id: 'full',
    n: 7,
    title: 'Any date, end to end',
    goal: 'Combine every layer into one fluent solve.',
    blocks: [
      {
        kind: 'p',
        text: 'The full pipeline: (1) century anchor → (2) add the year offset (Odd+11) for the year’s doomsday → (3) jump to the nearest month anchor → (4) step forward to your day, casting out sevens.',
      },
      {
        kind: 'example',
        date: '20 July 1969',
        steps: [
          '1900s anchor = Wednesday',
          '1969 doomsday: Odd+11 on 69 → +2 from Wednesday = Friday',
          'July anchor = 7/11 = Friday',
          'From the 11th to the 20th: 20 − 11 = 9 → cast out 7 → 2',
          'Friday (5) + 2 = 7 → cast out 7 → 0 = Sunday',
        ],
        answer: 'Sunday',
        check: { kind: 'ymd', year: 1969, month: 7, day: 20 },
      },
      {
        kind: 'p',
        text: 'If your date is in January or February of a leap year, slide the anchor one day later (Jan 4, Feb 29) before you step.',
      },
    ],
  },
]

export function getStage(id: string): Stage | undefined {
  return CURRICULUM.find((s) => s.id === id)
}
