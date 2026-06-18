export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'mnemonic'; text: string }
  | { kind: 'example'; date: string; steps: string[]; answer: string }

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
  /** Whether the stage's outcome additionally requires a fast timed answer; defaults to false. */
  timed?: boolean
}

export const CURRICULUM: Stage[] = [
  {
    id: 'mod7',
    n: 1,
    title: 'Think in 7s',
    goal: 'Treat weekdays as numbers 0–6 and add them mod 7.',
    k: 3,
    m: 4,
    blocks: [
      {
        kind: 'p',
        text: "Every weekday is a number: Sunday 0, Monday 1, Tuesday 2, Wednesday 3, Thursday 4, Friday 5, Saturday 6. You'll compute a number, then read off the day.",
      },
      {
        kind: 'mnemonic',
        text: 'Noneday 0 · Oneday 1 · Twosday 2 · Treble 3 · Foursday 4 · Fiveday 5 · Six-a-day 6',
      },
      {
        kind: 'p',
        text: "All Doomsday math is mod 7: whenever a total passes 6, subtract 7. This is “casting out sevens.” 9 → 2, 13 → 6, 16 → 2.",
      },
      {
        kind: 'p',
        text: 'Multiples of 7 are invisible. So the 28th, 21st, 14th and 7th of a month all share one weekday — and the 27th lands on the same day as the 6th (27 − 21 = 6).',
      },
    ],
  },
  {
    id: 'months',
    n: 2,
    title: 'Month anchors',
    goal: "Memorize one “doomsday” date in every month — they all share the year's doomsday.",
    k: 3,
    m: 4,
    blocks: [
      {
        kind: 'p',
        text: "Inside any year, a handful of easy dates all fall on the same weekday, called that year's doomsday. Learn one anchor per month.",
      },
      { kind: 'p', text: 'Even months are free — they point at themselves:' },
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
          'January: the 3rd (the 4th in leap years)',
          'February: the last day — 28th (29th in leap years)',
          'March: Pi Day, 3/14 (think “March 0”)',
        ],
      },
      {
        kind: 'p',
        text: 'The #1 beginner mistake: in leap years January and February shift by one (Jan 4, Feb 29). Burn that in now.',
      },
    ],
  },
  {
    id: 'thisyear',
    n: 3,
    title: 'Dates in this year',
    goal: "Solve any date in the current year from one fact — this year's doomsday.",
    blocks: [
      {
        kind: 'p',
        text: "You can start solving real dates today with just the month anchors plus one fact: this year's doomsday. For 2026 it is Saturday.",
      },
      {
        kind: 'p',
        text: 'Take the nearest month anchor and step forward/back to your day, casting out sevens.',
      },
      {
        kind: 'example',
        date: '25 December 2026',
        steps: [
          "2026's doomsday = Saturday",
          'Nearest December anchor: 12/12 = Saturday',
          'From the 12th to the 25th: 25 − 12 = 13 → cast out 7 → 6',
          'Saturday + 6 = Friday',
        ],
        answer: 'Friday',
      },
    ],
  },
  {
    id: 'century',
    n: 4,
    title: 'Century anchors',
    goal: 'Know the anchor weekday for each century.',
    blocks: [
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
        text: 'They repeat every 400 years through Tuesday, Sunday, Friday, Wednesday. For century number c, the anchor = (5 × (c mod 4) + 2) mod 7, with Sunday = 0.',
      },
    ],
  },
  {
    id: 'year',
    n: 5,
    title: "The year's doomsday (Odd+11)",
    goal: 'Turn the century anchor into the specific year — with pure addition.',
    blocks: [
      {
        kind: 'p',
        text: 'Use the Odd+11 method on the last two digits T — no division, no negatives:',
      },
      {
        kind: 'list',
        items: [
          'If T is odd, add 11',
          'Halve it',
          'If the result is odd, add 11',
          'Take 7 − (result mod 7)',
          'Count that many days forward from the century anchor',
        ],
      },
      {
        kind: 'example',
        date: 'Year 2005',
        steps: [
          'Last two digits 05 is odd → +11 = 16',
          'Halve: 16 ÷ 2 = 8',
          '8 is even → leave it',
          '7 − (8 mod 7) = 7 − 1 = 6',
          '2000s anchor is Tuesday; Tuesday + 6 = Monday',
        ],
        answer: 'Monday — every doomsday date in 2005 is a Monday',
      },
      {
        kind: 'p',
        text: 'Once Odd+11 is solid you can also learn Conway’s classic ⌊y/12⌋ + y mod 12 + ⌊(y mod 12)/4⌋ method — same result, more division.',
      },
    ],
  },
  {
    id: 'full',
    n: 6,
    title: 'Any date, end to end',
    goal: 'Combine all the layers into one fluent solve.',
    blocks: [
      {
        kind: 'p',
        text: 'The full pipeline: (1) century anchor → (2) add the year offset (Odd+11) to get the year’s doomsday → (3) take the nearest month anchor → (4) step to your day, mod 7.',
      },
      {
        kind: 'example',
        date: '14 March 1986',
        steps: [
          '1900s anchor = Wednesday',
          '1986: 86 is even → halve to 43 → odd, +11 = 54 → 7 − (54 mod 7) = 2 → Wednesday + 2 = Friday',
          "March's anchor is the 14th (Pi Day) = Friday",
          'Your date is the 14th, so no stepping needed: Friday',
        ],
        answer: 'Friday',
      },
      {
        kind: 'p',
        text: 'If the date is in January or February, remember the leap-year shift before you step.',
      },
    ],
  },
  {
    id: 'speed',
    n: 7,
    title: 'Getting fast',
    goal: 'Move from computing to recalling — toward sub-5-second answers.',
    timed: true,
    blocks: [
      {
        kind: 'p',
        text: 'Accuracy first. Once you are reliably right, speed comes from memorizing rather than recomputing.',
      },
      {
        kind: 'list',
        items: [
          'The 12 month anchors, cold',
          'The 4 century anchors',
          'The year-doomsday for the common years you meet most',
        ],
      },
      {
        kind: 'p',
        text: 'Drill daily — even five problems keeps the streak and the skill alive. Aim for under 5 seconds, then under 2, the way Conway did.',
      },
    ],
  },
]

export function getStage(id: string): Stage | undefined {
  return CURRICULUM.find((s) => s.id === id)
}
