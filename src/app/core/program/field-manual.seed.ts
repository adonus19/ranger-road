/** Written Field Manual content. Scripture is stored as references only. */
export const FIELD_MANUAL_SOURCE = 'docs/rangers-road-full-program-content/FIELD_MANUAL.md';

export interface LeadershipPrinciple {
  id: string;
  title: string;
  meaning: string;
  scripture: readonly string[];
  practice: string;
}

export interface BookSuggestion {
  title: string;
  author: string;
  note: string;
}

/**
 * One lesson per week, read in Monday's Morning Watch. The week's Hearth mission and
 * Sunday question come from the daily seed so they are written in one place.
 */
export interface LeadershipLesson {
  id: string;
  week: 1 | 2 | 3 | 4;
  title: string;
  principleIds: readonly string[];
  scripture: readonly { reference: string; day: string }[];
  paragraphs: readonly string[];
  fromReading: string;
  forLater: BookSuggestion;
}

export interface ReadingPlanEntry {
  chapter: number;
  chapterName: string;
  theme: string;
  title: string;
  author: string;
}

export interface FieldCardSection {
  heading: string;
  items: readonly string[];
}

/** A short card for one practical skill (READING_AND_FIELDCRAFT.md, Field Card Shape). */
/** Which kind of practical skill a card teaches, so screens can pick a fitting pictogram. */
export type FieldSkill = 'tool' | 'knot';

export interface FieldCard {
  id: string;
  title: string;
  skill: FieldSkill;
  week: number;
  /** When the week's orders call for it. */
  when: string;
  summary: string;
  mission?: string;
  /** What the knot or skill is for, and where not to rely on it. */
  useFor?: string;
  avoid?: string;
  steps?: readonly string[];
  memoryAid?: string;
  check?: string;
  sections?: readonly FieldCardSection[];
  closing?: string;
  /**
   * A generated step strip in the exercise-guide style, when one has been approved.
   * `grid` holds the same four steps as a 2x2 grid for phones.
   */
  sequence?: { src: string; grid?: string; alt: string };
  relatedSkills: readonly string[];
}

/** The fieldcraft a week's orders call for, and the cards that teach it. */
export interface WeeklyFieldcraft {
  week: number;
  title: string;
  skill: FieldSkill;
  days: string;
  cardIds: readonly string[];
  practice?: string;
  /** What to have on hand, as a phrase: “a 6-foot piece of rope…”. */
  equipment?: string;
  safety?: string;
}

const principles: readonly LeadershipPrinciple[] = [
  {
    id: 'lead-yourself-first',
    title: 'Lead yourself first',
    meaning:
      'You can’t hand your family a discipline you don’t practice. Start with how you sleep and how you speak.',
    scripture: ['Proverbs 25:28'],
    practice:
      'Get your own morning in order (the Watch, the readiness check, the day’s orders) before you direct anyone else’s.',
  },
  {
    id: 'listen-before-solving',
    title: 'Listen before solving',
    meaning:
      'Most of the time the person talking needs to be understood before they need a fix. Hear the whole thing, then ask whether help is wanted.',
    scripture: ['James 1:19', 'Proverbs 18:13'],
    practice: 'Ask, “Do you want help with this, or do you want me to listen?”',
  },
  {
    id: 'serve-without-praise',
    title: 'Serve without requiring praise',
    meaning:
      'If you need the work to be noticed, you’re still doing it partly for yourself. Do it because it needs doing and the people are worth it.',
    scripture: ['Matthew 6:1–4', 'Mark 10:45'],
    practice: 'Do one job this week that no one sees you do, and don’t mention it.',
  },
  {
    id: 'own-responsibilities',
    title: 'Own responsibilities fully',
    meaning:
      'Owning a job includes remembering it and following through. Otherwise it becomes someone else’s worry.',
    scripture: ['Colossians 3:23', 'Luke 16:10'],
    practice: 'Take one recurring task completely off everyone else’s mind.',
  },
  {
    id: 'admit-mistakes',
    title: 'Admit mistakes',
    meaning:
      'Name what you did wrong plainly, with no excuse attached. When your family sees you face a failure, they learn they can face theirs.',
    scripture: ['Proverbs 28:13', '1 John 1:9'],
    practice: '“I was wrong to speak to you that way.” Stop there, with no “but.”',
  },
  {
    id: 'repair-quickly',
    title: 'Repair quickly',
    meaning:
      'Don’t let a hard moment settle into a hard week. Go back soon, own your part and reconnect.',
    scripture: ['Ephesians 4:26', 'Matthew 5:23–24'],
    practice: 'Before bed, close anything you left open that day.',
  },
  {
    id: 'keep-promises',
    title: 'Keep promises',
    meaning: 'People measure you by the small promises. Make fewer, and keep every one.',
    scripture: ['Matthew 5:37', 'Psalm 15:4'],
    practice: 'Replace “later” with a day and a time, then show up at it.',
  },
  {
    id: 'reduce-friction',
    title: 'Reduce household friction',
    meaning:
      'Notice where the house snags, like the unclear plan or the thing everyone forgets, and smooth it before someone else trips on it.',
    scripture: ['Proverbs 24:3–4', 'Philippians 2:4'],
    practice: 'Fix one small recurring annoyance at home without being asked.',
  },
  {
    id: 'teach-without-humiliating',
    title: 'Teach without humiliating',
    meaning:
      'Correct the action and protect the person. Leave your daughter’s dignity intact, especially in front of others.',
    scripture: ['Ephesians 6:4', 'Colossians 3:21'],
    practice: 'Show the right way once, calmly, then hand it back for another try.',
  },
  {
    id: 'stable-under-fatigue',
    title: 'Remain stable under fatigue',
    meaning:
      'Tempers slip and patience runs short when you’re tired. The training gives you practice at staying steady when you’re spent.',
    scripture: ['Galatians 6:9', 'Isaiah 40:31'],
    practice: 'After a long day, take one quiet minute before you walk in the door.',
  },
  {
    id: 'protect-family-time',
    title: 'Protect family time',
    meaning:
      'Put family time on the calendar first and fit other things around it. Guard it from screens and from your own restlessness.',
    scripture: ['Psalm 90:12', 'Ephesians 5:15–16'],
    practice: 'Put your phone in another room for one hour of family time this week.',
  },
  {
    id: 'model-what-you-ask',
    title: 'Model what you ask of others',
    meaning:
      'Your family copies what you do long before they obey what you say. Only ask for what you already practice.',
    scripture: ['John 13:15', '1 Corinthians 11:1'],
    practice: 'If you want a calmer house, lower your own voice first.',
  },
];

const lessons: readonly LeadershipLesson[] = [
  {
    id: 'lead-yourself-first',
    week: 1,
    title: 'Lead yourself first',
    principleIds: ['lead-yourself-first', 'listen-before-solving'],
    scripture: [
      { reference: 'Proverbs 4:20–27', day: 'Monday' },
      { reference: 'James 1:19–25', day: 'Wednesday' },
    ],
    paragraphs: [
      'Before this campaign asks you to lead anyone at home, it asks you to keep your own appointments: the readiness check, the Watch, the training you said you’d do. If you can’t keep your word to yourself, keeping it to anyone else gets harder.',
      'Proverbs 4 walks through the whole person in order: guard your heart, watch your mouth, keep your eyes ahead, mind your feet. This week, aim to be dependable.',
      'Leading yourself also means listening. James says to be quick to hear and slow to speak, and the Hearth mission puts that to work. Ask your spouse what one thing would make this week easier. Listen to the end of the answer without fixing anything yet, then take that one thing off your spouse’s plate.',
    ],
    fromReading:
      'This week you begin Habits of the Household, in three 10-minute sessions. It is about the everyday routines that shape a family. For now, notice which routines already run your home, and which of them you lead.',
    forLater: {
      title: 'The Common Rule',
      author: 'Justin Whitmel Earley',
      note: 'The same author’s short book on daily and weekly habits.',
    },
  },
  {
    id: 'keep-small-promises',
    week: 2,
    title: 'Keep small promises',
    principleIds: ['keep-promises', 'own-responsibilities'],
    scripture: [
      { reference: 'Matthew 5:33–37', day: 'Monday' },
      { reference: 'Psalm 15', day: 'Friday' },
    ],
    paragraphs: [
      'Your family measures you by the small promises, like “I’ll be home at six” and “I’ll fix that this weekend.” Each kept promise makes your word worth a little more. Each one that slides teaches them to plan around you.',
      'Jesus says to let your yes be yes, and Psalm 15 praises the one who keeps an oath even when it hurts. Both are about meaning what you say.',
      'Two habits help. Make fewer promises, and put a day and a time on the ones you make, like Saturday morning. If you can’t keep one, say so before it’s due.',
      'The Hearth mission applies the same rule to the house. Choose one recurring job, such as the trash, the dishes, the bills or Saturday breakfast, and own it completely. Owning it includes remembering it, so no one has to remind you.',
    ],
    fromReading:
      'As you read this week, look for one routine in your home that would run better if one person owned it. Ask whether that person should be you.',
    forLater: {
      title: 'Extreme Ownership',
      author: 'Jocko Willink and Leif Babin',
      note: 'Two former Navy SEAL officers on taking responsibility for everything in your world.',
    },
  },
  {
    id: 'serve-without-an-audience',
    week: 3,
    title: 'Serve without an audience',
    principleIds: ['serve-without-praise', 'model-what-you-ask'],
    scripture: [
      { reference: 'Mark 10:42–45', day: 'Monday' },
      { reference: 'John 13:12–17', day: 'Thursday' },
    ],
    paragraphs: [
      'Jesus told his disciples that among them, the great would be the ones who serve. Later, in John 13, he picked up a towel and washed their feet, taking the lowest job in the room on purpose.',
      'The Forge is building your strength, and this week asks what it’s for. If you need thanks for every chore, you’re still keeping score. Serving without an audience means doing the job because it needs doing and because the people are worth it.',
      'The Hearth mission is simple: do one meaningful household job before anyone asks. Pick something that would otherwise land on someone else, do it well, and don’t announce it. If someone notices, fine. If no one does, it still counted.',
      'Watch your reaction if no one notices. A flash of resentment is useful, because it shows you where you were still serving for credit.',
    ],
    fromReading:
      'As you read, notice the small, unseen jobs that keep your home running, and who does them now.',
    forLater: {
      title: 'The Motive',
      author: 'Patrick Lencioni',
      note: 'A short story about the two reasons people lead: for the reward, or out of responsibility.',
    },
  },
  {
    id: 'carry-the-details',
    week: 4,
    title: 'Carry the details',
    principleIds: ['reduce-friction', 'protect-family-time'],
    scripture: [{ reference: 'Micah 6:8', day: 'Thursday' }],
    paragraphs: [
      'Chapter I closes this week, and the Gate Trial comes next. Training eases off so you arrive rested. At home, the week asks you to carry the details so everyone else can simply enjoy the day.',
      'Plan one simple family activity, like a walk or a game night. Then take on the parts that usually make an outing harder than it should be: the time, the food, the gear, and a plan B if it rains. Keep it modest. The win is an afternoon when nobody else has to manage anything.',
      'Micah 6:8 asks you to do justice, love mercy and walk humbly. Planning humbly means you don’t need credit for the logistics, and you stay relaxed when the plan changes. If the day goes sideways, your steadiness matters more than the schedule.',
    ],
    fromReading:
      'Look back over what you’ve read so far. Pick one routine from it that you’ll keep leading after this chapter ends.',
    forLater: {
      title: 'The Ruthless Elimination of Hurry',
      author: 'John Mark Comer',
      note: 'On slowing down enough to be present. It leads into Chapter II.',
    },
  },
];

const readingPlan: readonly ReadingPlanEntry[] = [
  {
    chapter: 1,
    chapterName: 'The Muster',
    theme: 'Responsibility',
    title: 'Habits of the Household',
    author: 'Justin Whitmel Earley',
  },
  {
    chapter: 2,
    chapterName: 'The Road',
    theme: 'Listening',
    title: 'The Ruthless Elimination of Hurry',
    author: 'John Mark Comer',
  },
  {
    chapter: 3,
    chapterName: 'The High Country',
    theme: 'Decision-making',
    title: 'Just Do Something',
    author: 'Kevin DeYoung',
  },
  {
    chapter: 4,
    chapterName: 'Bearing the Load',
    theme: 'Ownership without martyrdom',
    title: 'The Motive',
    author: 'Patrick Lencioni',
  },
  {
    chapter: 5,
    chapterName: 'The Forge',
    theme: 'Emotional regulation',
    title: 'Emotionally Healthy Spirituality',
    author: 'Peter Scazzero',
  },
  {
    chapter: 6,
    chapterName: 'The Long Patrol',
    theme: 'Consistency',
    title: 'A Long Obedience in the Same Direction',
    author: 'Eugene H. Peterson',
  },
  {
    chapter: 7,
    chapterName: 'Fieldcraft',
    theme: 'Teaching',
    title: 'Parenting: 14 Gospel Principles That Can Radically Change Your Family',
    author: 'Paul David Tripp',
  },
  {
    chapter: 8,
    chapterName: 'The Watch',
    theme: 'Stability',
    title: 'Tender Warrior',
    author: 'Stu Weber',
  },
  {
    chapter: 9,
    chapterName: 'The Ranger’s Trial',
    theme: 'Integration and legacy',
    title: 'Spiritual Leadership',
    author: 'J. Oswald Sanders',
  },
];

const fieldCards: readonly FieldCard[] = [
  {
    id: 'tool-inspection',
    title: 'Tool inspection',
    skill: 'tool',
    week: 2,
    when: 'Week 2: Wednesday’s skill choice and Saturday’s fieldcraft practice.',
    summary:
      'Look over your axe or maul, your pickaxe and the tools you use most, and deal with the damage that causes accidents.',
    mission:
      'On Wednesday, inspect each tool and set aside anything that fails a check. On Saturday, fix one thing you found that is within your skill: clean and oil a rusty head, fit an edge guard, or touch up an edge if you know how.',
    sections: [
      {
        heading: 'Before you start',
        items: [
          'Work in good light, at a bench or table if you have one.',
          'Wear gloves when you handle edges.',
          'Keep children and pets out of the work area.',
          'Set edged tools down with the edge turned away from you.',
        ],
      },
      {
        heading: 'Handle',
        items: [
          'Run your eyes and hand along the whole handle. Look for cracks, splits, splinters, and soft or rotten spots, especially just below the head, where missed strikes land.',
          'A fiberglass handle should have no frayed fibers, deep cuts or cracked coating.',
          'Replace a cracked or split handle. Tape won’t make it safe.',
        ],
      },
      {
        heading: 'Head',
        items: [
          'Hold the handle and try to move the head. Any wobble or gap means the head can come off, so don’t use the tool until it’s fixed.',
          'On an axe, maul or hammer, check that the wedge in the top of the head is seated and hasn’t backed out.',
          'A slip-on pickaxe head is held by the handle’s taper rather than a wedge. Check that it sits tight against the thick end of the handle. If yours is built differently, follow its maker’s instructions.',
          'Look over every striking face, such as a hammer face, a maul’s poll or the top of a splitting wedge, for mushroomed edges, cracks or chips. Those edges can break off and fly when struck.',
          'Check the whole head for cracks, especially around the eye, the hole the handle passes through.',
        ],
      },
      {
        heading: 'Edge',
        items: [
          'Sight along the edge in good light. Look for nicks, chips, and a rolled or flattened edge.',
          'Maintain an edge with a file, then a sharpening stone or puck, following the edge’s existing bevel. Clamp or brace the head so it can’t move, wear gloves, and keep your hand behind the edge.',
          'Deep chips, or an edge that has lost its shape, are a job for someone experienced.',
          'Grinding can overheat the steel and damage its temper. Leave machine grinding to someone trained to do it.',
        ],
      },
      {
        heading: 'Storage',
        items: [
          'Cover edges with a sheath or edge guard.',
          'Store tools dry, off the ground, and out of children’s reach.',
          'Don’t leave an axe stuck in a block or lying in the grass. Moisture loosens heads, and a tool left out is a tool someone steps on.',
          'Wipe metal dry and oil it lightly. Wooden handles can take a coat of boiled linseed oil once or twice a year. Oily rags can catch fire as they dry. Spread them flat outdoors, away from buildings, then dispose of them according to local fire guidance; never leave them in a pile.',
        ],
      },
      {
        heading: 'Retire or repair',
        items: [
          'Loose head: stop using it until it’s reseated or rehandled.',
          'Cracked or split handle: replace it.',
          'Cracked head, or a chipped or mushroomed striking face: retire it, or have it dressed by someone who knows how.',
          'Deep edge damage: have it repaired, or replace the tool.',
        ],
      },
    ],
    closing:
      'The same checks work on shovels, rakes, hammers and hand saws: a sound handle, a tight head, and a clean, whole working edge.',
    relatedSkills: ['Tool competence (Chapter V)'],
  },
  {
    id: 'square-knot',
    title: 'Square knot',
    skill: 'knot',
    week: 3,
    when: 'Week 3: Wednesday’s knot practice.',
    summary: 'Ties the two ends of one cord together around something.',
    useFor:
      'Use it to tie the two ends of one cord together around something, such as a bundle or a bandage. It lies flat and unties easily.',
    avoid:
      'Don’t use it to join two separate ropes that will take a load, or for anything critical. It can slip or pull apart when it is loaded unevenly or the ropes differ in size.',
    steps: [
      'Hold one end in each hand. Cross the right end over the left.',
      'Tuck it under and back up. That’s the first half, the same start as tying a shoe.',
      'Cross the end now in your left hand over the one in your right, then tuck it under and up through the middle.',
      'Pull both ends evenly to snug it.',
    ],
    check:
      'Each end lies alongside its own standing part, and both ends leave the knot on the same side. If they leave crosswise, you tied a granny knot. Untie it and remember: right over left, then left over right.',
    sequence: {
      src: 'images/field-manual/square-knot/sequence.webp',
      grid: 'images/field-manual/square-knot/grid.webp',
      alt: 'Square knot in four steps: the right end crosses over the left and tucks under and back up, then the left end crosses over the right and tucks through the middle, and both ends pull snug into two interlocked loops.',
    },
    relatedSkills: ['Bowline', 'Two half hitches'],
  },
  {
    id: 'bowline',
    title: 'Bowline',
    skill: 'knot',
    week: 3,
    when: 'Week 3: Wednesday’s knot practice.',
    summary: 'A fixed loop at the end of a rope that won’t slip smaller or jam.',
    useFor:
      'Use it for a fixed loop at the end of a rope that won’t slip smaller or jam, such as a line around a tree or post, or a loop to drop over a stake. It unties easily even after a hard pull.',
    steps: [
      'Leave enough tail for the loop you want. Make a small loop in the standing part, with the tail side crossing on top.',
      'Bring the end up through the small loop from underneath.',
      'Take the end around behind the standing part.',
      'Bring the end back down through the small loop. Hold the end against the side of the big loop and pull the standing part to set it.',
    ],
    memoryAid:
      'The rabbit comes up out of the hole, runs around the tree, and goes back down the hole.',
    check:
      'The end sits inside the big loop, beside the loop’s leg, held by a collar around the standing part. Leave a tail of several inches. A bowline can shake loose when it isn’t under load, so check it before you trust it.',
    relatedSkills: ['Square knot', 'Two half hitches'],
  },
  {
    id: 'two-half-hitches',
    title: 'Two half hitches',
    skill: 'knot',
    week: 3,
    when: 'Week 3: Wednesday’s knot practice.',
    summary: 'Ties a rope to a post, rail, ring or tree that will hold steady tension.',
    useFor:
      'Use it to tie a rope to a post, rail, ring or tree that will hold steady tension, such as a tarp line or a clothesline. It ties and unties quickly.',
    steps: [
      'Pass the end around the post and bring it back alongside the standing part.',
      'Take the end over the standing part, around it, and out through the loop you just made. That’s the first half hitch.',
      'Tie a second one the same way, in the same direction, a little farther along the standing part.',
      'Slide both hitches snug against the post and pull the standing part tight.',
    ],
    check:
      'The two hitches sit side by side and look like a small clove hitch around the standing part. If they twist away from each other, the second went the opposite direction. Leave a few inches of tail.',
    relatedSkills: ['Square knot', 'Bowline'],
  },
];

const weeklyFieldcraft: readonly WeeklyFieldcraft[] = [
  {
    week: 2,
    title: 'Tool inspection',
    skill: 'tool',
    days: 'Wednesday or Saturday',
    cardIds: ['tool-inspection'],
  },
  {
    week: 3,
    title: 'Knot practice',
    skill: 'knot',
    days: 'Wednesday',
    cardIds: ['square-knot', 'bowline', 'two-half-hitches'],
    practice:
      'Tie each knot five times following the steps, then three times without looking. Then use each one on something real: the square knot around a bundle, the bowline around a post, and two half hitches to a rail or ring.',
    equipment: 'a 6-foot piece of rope about 3/8 inch thick',
    safety: 'None of these knots is for climbing or for lifting people.',
  },
];

/** Books the weekly lessons suggest that are not on the reading plan. */
export const EXTRA_BOOK_SUGGESTIONS: readonly string[] = ['The Common Rule', 'Extreme Ownership'];

export function listLeadershipPrinciples(): LeadershipPrinciple[] {
  return structuredClone([...principles]);
}

export function getLeadershipPrinciple(id: string): LeadershipPrinciple | undefined {
  const principle = principles.find((item) => item.id === id);
  return principle ? structuredClone(principle) : undefined;
}

export function listLeadershipLessons(): LeadershipLesson[] {
  return structuredClone([...lessons]);
}

export function getLeadershipLesson(id: string): LeadershipLesson | undefined {
  const lesson = lessons.find((item) => item.id === id);
  return lesson ? structuredClone(lesson) : undefined;
}

export function getLeadershipLessonForWeek(week: number): LeadershipLesson | undefined {
  const lesson = lessons.find((item) => item.week === week);
  return lesson ? structuredClone(lesson) : undefined;
}

export function listReadingPlan(): ReadingPlanEntry[] {
  return structuredClone([...readingPlan]);
}

export function listFieldCards(): FieldCard[] {
  return structuredClone([...fieldCards]);
}

export function getFieldCard(id: string): FieldCard | undefined {
  const card = fieldCards.find((item) => item.id === id);
  return card ? structuredClone(card) : undefined;
}

export function getWeeklyFieldcraft(week: number): WeeklyFieldcraft | undefined {
  const fieldcraft = weeklyFieldcraft.find((item) => item.week === week);
  return fieldcraft ? structuredClone(fieldcraft) : undefined;
}
