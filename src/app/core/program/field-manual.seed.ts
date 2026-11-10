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
  /** Campaign week: 1–4 for Chapter I, 5–8 for Chapter II, 9–12 for Chapter III. */
  week: number;
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
  /** A sentence before the list, such as “Remember STOP:”. */
  intro?: string;
  /** Numbered steps rather than bullets. */
  ordered?: boolean;
  items: readonly string[];
  /** A sentence after the list. */
  outro?: string;
}

/** A short card for one practical skill (READING_AND_FIELDCRAFT.md, Field Card Shape). */
/** Which kind of practical skill a card teaches, so screens can pick a fitting pictogram. */
export type FieldSkill = 'tool' | 'knot' | 'navigation';

export interface FieldCard {
  id: string;
  title: string;
  skill: FieldSkill;
  week: number;
  /** The last week a card spans, when it is learned across several weeks. */
  lastWeek?: number;
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
   * Checked step pictures, one panel per written step, two per row at 1004px wide.
   * `height` is 1548 for four steps (the default) and 2316 for six.
   */
  sequence?: { src: string; alt: string; height?: number };
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
  {
    id: 'stop-hurrying',
    week: 5,
    title: 'Stop hurrying',
    principleIds: ['stable-under-fatigue', 'lead-yourself-first'],
    scripture: [
      { reference: 'Psalm 46:1–11', day: 'Monday' },
      { reference: 'Luke 10:38–42', day: 'Thursday' },
    ],
    paragraphs: [
      'Chapter II builds the engine with longer walks and steadier breathing. It also asks you to slow down.',
      'Psalm 46 says, “Be still, and know that I am God.” On Thursday you read about Martha, busy with much serving, and Mary, sitting at Jesus’ feet and listening. Jesus tells Martha she is anxious and troubled about many things.',
      'Hurry makes you a poor listener. When you’re rushing, the people around you turn into interruptions. A child’s question or a spouse’s long story feels like something in the way.',
      'Start with yourself. Read for ten minutes three times this week, with the phone in another room. Notice how long it takes before the urge to check something fades. That urge is hurry, and sitting through it is practice for listening.',
      'Then take hurry off the family. Sunday is the day for rest and worship, and it often starts with the most rushing of the week. On Saturday night, set out clothes, decide breakfast and pick a time to leave that gives everyone room. Carry those details yourself, so on Sunday morning no one has to be hurried out the door.',
    ],
    fromReading:
      'If you’ve finished Habits of the Household, begin The Ruthless Elimination of Hurry by John Mark Comer. If not, keep going; there’s no deadline. Comer builds the book around one piece of advice from Dallas Willard: ruthlessly eliminate hurry from your life. Notice where you agree with him and where you push back.',
    forLater: {
      title: 'Celebration of Discipline',
      author: 'Richard J. Foster',
      note: 'A classic on the spiritual disciplines, including solitude and simplicity.',
    },
  },
  {
    id: 'hear-the-whole-thing',
    week: 6,
    title: 'Hear the whole thing',
    principleIds: ['listen-before-solving', 'model-what-you-ask'],
    scripture: [
      { reference: 'James 1:19–20', day: 'Monday' },
      { reference: 'Proverbs 18:2, 13', day: 'Tuesday' },
    ],
    paragraphs: [
      'James puts it plainly: be quick to hear, slow to speak, slow to anger. Proverbs is sharper. Answering before you’ve heard the whole thing is folly.',
      'Most of us listen with a reply half-built. We catch the problem in the first sentence and start fixing it before the other person has finished, and they come away feeling unheard.',
      'The Hearth mission slows that down. Ask your spouse how she is doing, and mean the question. Then, before you offer anything, ask what she wants from you: someone to listen, someone to think it through with, or someone to act. Do what she asks, even if a solution is on the tip of your tongue.',
      'The same goes for your daughter. If you want your family to listen to you, they need to see you listen first.',
    ],
    fromReading:
      'As you read, notice how hurry shows up in conversations, such as finishing someone’s sentence or checking the time while they talk.',
    forLater: {
      title: 'The Lost Art of Listening',
      author: 'Michael P. Nichols',
      note: 'A family therapist on why listening breaks down and how to repair it.',
    },
  },
  {
    id: 'be-where-you-are',
    week: 7,
    title: 'Be where you are',
    principleIds: ['protect-family-time', 'teach-without-humiliating'],
    scripture: [
      { reference: 'Deuteronomy 6:4–9', day: 'Monday' },
      { reference: 'Mark 10:13–16', day: 'Saturday' },
    ],
    paragraphs: [
      'Deuteronomy 6 tells parents to talk about God’s words “when you sit in your house, and when you walk by the way, and when you lie down, and when you rise.” Faith gets passed on in ordinary hours like these, and you can spend all of them in the room without paying attention.',
      'In Mark 10 the disciples try to keep the children away, as if Jesus had more important things to do. He takes the children in his arms and blesses them.',
      'The Hearth mission is one full hour at home with your phone put away, in another room if you can. Let the hour be ordinary. Play what your daughter wants to play, or help with dinner. If she asks for help with something, show her once, calmly, and hand it back.',
      'Watch for the moment you want to reach for the phone. Then stay where you are.',
    ],
    fromReading:
      'Look for one habit or practice in the book that would protect an hour like this every week.',
    forLater: {
      title: 'The Tech-Wise Family',
      author: 'Andy Crouch',
      note: 'On putting technology in its proper place in family life.',
    },
  },
  {
    id: 'keep-showing-up',
    week: 8,
    title: 'Keep showing up',
    principleIds: ['keep-promises', 'own-responsibilities'],
    scripture: [
      { reference: 'Micah 6:8', day: 'Monday' },
      { reference: 'Hebrews 10:23–25', day: 'Friday' },
    ],
    paragraphs: [
      'Chapter II closes this week. Training eases off so you come to the Three-Mile Trial rested. On Saturday you choose the route, set out the carry weight, and find your stairs.',
      'Hebrews 10:23 says to hold fast “without wavering, for he who promised is faithful.” Most faithfulness is unremarkable: the walk you took on a gray Tuesday, the reading you did when you’d rather have scrolled, the question you asked your spouse before waiting for the whole answer.',
      'The trial ends with a leadership question: when someone in your family speaks, do they experience you as attentive? Your spouse knows the answer better than you do, so the Hearth mission starts by asking. Take what you hear without arguing. It’s the most honest material you’ll have for Monday’s reflection.',
      'Hebrews goes on to say “let us consider how to stir up one another to love and good works.” Faithfulness runs both ways in a family. Tell your spouse and your daughter what you’ve seen them keep doing this month, and be specific. On Saturday, let your daughter help you get ready for the trial, and ask the family to pray for you. Then choose one thing from this chapter to keep, and give it a place on the calendar so it lasts past Week 8.',
    ],
    fromReading: 'Pick one practice from the book to keep after this chapter ends.',
    forLater: {
      title: 'Just Do Something',
      author: 'Kevin DeYoung',
      note: 'On making decisions and seeking God’s will without freezing. It leads into Chapter III.',
    },
  },
  {
    id: 'stop-before-you-quit',
    week: 9,
    title: 'Stop before you quit',
    principleIds: ['stable-under-fatigue', 'own-responsibilities'],
    scripture: [
      { reference: 'Romans 5:1–5', day: 'Monday' },
      { reference: 'James 1:2–4', day: 'Tuesday' },
    ],
    paragraphs: [
      'Chapter III climbs. The Tuesday step-ups get longer each week, the Saturday walks find hills and stairs, and the chapter ends with a hike up a real mountain trail. For four weeks the lessons follow one way of making decisions, called Calm Decisions: Stop, Observe, Prioritize, Decide, Communicate, Reassess. It works on a trail when the weather turns, and it works at home when the evening goes sideways.',
      'This week covers the first two steps. Stop means you don’t act on your first impulse. Observe means you look at what’s actually in front of you before you decide what it means.',
      'Most quitting skips both. Progress slows, a set feels as heavy as it did last week, and the thought shows up that this isn’t working. Romans 5 describes a slower chain, where hard things build endurance, endurance builds character, and character gives hope. James says testing produces steadfastness. Neither passage says it will feel like progress while it’s happening.',
      'So when you feel the pull to quit, stop and look. Are you hurt, or bored? Is the plan wrong, or only slow? Pain changes the plan, and the readiness check handles that. A slow week doesn’t.',
      'The Hearth mission practices the same habit at home. When your spouse tells you what feels stuck, hear all of it before you decide what it means, then carry one piece. The daily task is the kind that’s easy to drop when nobody’s checking. Your daughter will hit her own slow stretch someday, and your story gives her something to remember when she does. The family prayer at meals keeps one unanswered thing in front of all of you while you wait together.',
    ],
    fromReading:
      'If you’ve finished The Ruthless Elimination of Hurry, begin Just Do Something by Kevin DeYoung. If not, keep going; there’s no deadline. Wednesday’s reading is chapter 4, “Our Magic 8-Ball God.” DeYoung argues that many Christians wait for a sign before they decide, when God has already given them his Word, wisdom and counsel to decide with. Notice where you’ve been waiting for a certainty you weren’t promised.',
    forLater: {
      title: 'Decisive',
      author: 'Chip Heath and Dan Heath',
      note: 'On the common traps in how people make choices and a simple process for getting around them.',
    },
  },
  {
    id: 'choose-then-go',
    week: 10,
    title: 'Choose, then go',
    principleIds: ['repair-quickly', 'listen-before-solving'],
    scripture: [
      { reference: 'Joshua 1:6–9', day: 'Monday' },
      { reference: '2 Timothy 1:6–7', day: 'Wednesday' },
    ],
    paragraphs: [
      'Joshua takes over from Moses with a hard job ahead, and God tells him three times to be strong and courageous. The reason comes with the command: God will be with him wherever he goes. Paul reminds Timothy that God gave him power, love and self-control, and that fear doesn’t come from the same place.',
      'Last week was Stop and Observe. This week adds Prioritize and Decide. Once you can see the situation, ask what matters most right now, and then choose. On a trail the order is simple: everyone’s safety first, then getting home, then the summit. At home it’s less tidy, but the question is the same.',
      'Courage often just looks like deciding. Most avoided conversations stay avoided because we keep observing. We wait for a better time, more information or a calmer mood, and the waiting turns into the decision.',
      'The Hearth mission is to have one of those conversations this week. Prioritize what has to be said, ideally one thing. Decide when you’ll say it, and put it on a day. Then say it clearly and calmly, without turning it into a fight, and listen to the reply all the way through. If it goes badly, go back soon and repair it.',
      'You can’t control how the other person responds. You can choose to start.',
    ],
    fromReading:
      'Wednesday’s reading is chapter 5 of Just Do Something, “A Better Way.” DeYoung separates the things God has already made plain, like how to treat people and what’s right, from the choices he leaves to your wisdom. Which kind is the conversation you’ve been putting off?',
    forLater: {
      title: 'Crucial Conversations',
      author: 'Kerry Patterson, Joseph Grenny, Ron McMillan and Al Switzler',
      note: 'On talking through high-stakes disagreements without going silent or getting angry.',
    },
  },
  {
    id: 'say-the-plan-out-loud',
    week: 11,
    title: 'Say the plan out loud',
    principleIds: ['reduce-friction', 'teach-without-humiliating'],
    scripture: [
      { reference: 'Philippians 2:1–8', day: 'Monday' },
      { reference: '1 Peter 5:5–7', day: 'Saturday' },
    ],
    paragraphs: [
      'Communicate is the step that pride skips. Once you’ve thought a decision through, explaining it can feel slow, so you just act. But your family can’t help with a plan they don’t know about, and they can’t plan around it either.',
      'Philippians 2 asks you to look to other people’s interests as well as your own, and points to Jesus, who set aside what was his by right in order to serve. Peter tells the church to put on humility toward one another, and to hand their worries to God because he cares for them.',
      'The Hearth mission is a plan that needs other people. Work out the outing’s destination, timing, weather, travel, food and gear, then share it early and ask what you’ve missed. Your spouse may know the snack situation better than you do. Your daughter may have opinions about the trail. Change the plan when they’re right.',
      'On Saturday, hand your daughter one piece of the navigation, like calling the turn at a junction or watching for blazes. If she gets it wrong, let her notice, show her once, and give the job back. Trusting her with part of the decision is communication too.',
    ],
    fromReading:
      'Wednesday’s reading is chapter 8 of Just Do Something, “The Way of Wisdom.” DeYoung puts weight on asking wise people before you decide. Notice who you go to for counsel, and whether your spouse is one of them.',
    forLater: {
      title: 'The Freedom of Self-Forgetfulness',
      author: 'Timothy Keller',
      note: 'A very short book on humility.',
    },
  },
  {
    id: 'look-again',
    week: 12,
    title: 'Look again',
    principleIds: ['keep-promises', 'protect-family-time'],
    scripture: [
      { reference: 'Psalm 121', day: 'Monday' },
      { reference: 'Isaiah 40:28–31', day: 'Tuesday' },
    ],
    paragraphs: [
      'Training eases off this week so you come to the High Country Trial rested. On Saturday you choose the trail, check the forecast and pack.',
      'The last step is Reassess. Once you act, the situation changes, so you look again. On the mountain this is the turnaround. You set a turnaround point and a turnaround time before you start, and on the trail you keep checking the weather, the daylight, your knees and back, and the clock. If it’s time to turn back, you turn back. In the trial, a turnaround for weather or time is a postponement, not a failure, and you try again on another day.',
      'Psalm 121 is a song for travelers on their way up to Jerusalem. Their help comes from the Lord, who doesn’t sleep and keeps watch over their going out and coming in. Isaiah 40 promises new strength to the weary who wait for the Lord, which fits a week of lighter training.',
      'The Hearth mission starts with a promise. Tell your spouse where you’re going, where you’ll turn around and when you’ll be home, then keep that time, and call if the plan changes. Invite the family, and if your daughter comes, give her one real job. Pray together for the climb and the weather. When it’s done, tell your spouse what you wrote at the high point.',
      'If Christmas falls this week, the seasonal readings add a family evening on Christmas Eve. Protect it.',
    ],
    fromReading:
      'Wednesday’s reading is chapter 10 of Just Do Something, “The End of the Matter.” The book’s title is its advice: once you’ve prayed and sought wisdom, make the choice and go. Pick one idea from it that you’ll keep using after this chapter.',
    forLater: {
      title: 'The Motive',
      author: 'Patrick Lencioni',
      note: 'First suggested in Week 3, a short story about the two reasons people lead: for the reward, or out of responsibility. It leads into Chapter IV.',
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
    sequence: {
      src: 'images/field-manual/bowline/sequence.webp',
      alt: 'Bowline in four steps: form a small loop, bring the end up through it, pass the end behind the standing part, then bring it back down through the loop to leave a short tail inside the large fixed loop.',
    },
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
      'Take the end over the standing part and around behind it.',
      'Bring it out through the loop you just made, crossing over its own rope. That’s the first half hitch.',
      'Tie a second one a little farther along the standing part, in the same direction: over the standing part and around behind it.',
      'Bring the end out through the new loop the same way, over its own rope. That’s the second half hitch.',
      'Slide both hitches snug against the post and pull the standing part tight.',
    ],
    check:
      'The two hitches sit side by side and look like a small clove hitch around the standing part. If they twist away from each other, the second went the opposite direction. Leave a few inches of tail.',
    sequence: {
      src: 'images/field-manual/two-half-hitches/sequence.webp',
      alt: 'Two half hitches in six steps: pass the rope around the post, take the end over and around the standing part, bring it out through its loop over its own rope, repeat a little lower in the same direction, then slide both hitches snug against the post.',
      height: 2316,
    },
    relatedSkills: ['Square knot', 'Bowline'],
  },
  {
    id: 'navigation-one',
    title: 'Navigation I',
    skill: 'navigation',
    week: 5,
    lastWeek: 8,
    when: 'Weeks 5–8: learn it across the month. Week 6: Saturday’s field mission and daughter quest.',
    summary:
      'Find your way on a marked trail with a map, the sun and your own pace before you reach for GPS. Keep your phone charged and with you as a backup.',
    sections: [
      {
        heading: 'Before you go',
        items: [
          'Tell someone where you’re going, which trail, when you’ll be back and where you’ll park.',
          'Carry water, a charged phone and, if you might finish near dusk, a light.',
          'Your phone’s GPS usually works without cell signal, but the map may not load. Download the area’s map before you leave.',
        ],
      },
      {
        heading: 'Directions',
        items: [
          'The sun rises in the east and sets in the west. It’s exactly east and west only around the spring and fall equinoxes. In fall and winter it rises and sets toward the south, and in summer toward the north.',
          'In the Northern Hemisphere, the midday sun is to the south.',
          'A compass needle points to magnetic north, which can differ from the map’s north by a few degrees or more depending on where you live. On a marked trail that difference won’t lead you astray. Navigation II covers it.',
          'Practice at home: stand in your yard, point north, then check with a compass or your phone’s compass app.',
        ],
      },
      {
        heading: 'Trail maps',
        items: [
          'Find the legend, the scale bar and the north arrow first. Most maps put north at the top, but check.',
          'Match each trail’s name, number or color on the map to the blazes or signs on the ground.',
          'Many maps mark the distance between junctions. Add them up to get your route’s length.',
          'Find the trailhead, the parking and every junction you’ll pass.',
          'Turn the map so its north points north. Then the trail on the map runs the same way as the trail in front of you. This is called orienting the map.',
          'The lines that show hills and valleys come in Navigation II.',
        ],
      },
      {
        heading: 'Trail blazes',
        items: [
          'Blazes are painted marks, usually on trees, posts or rocks, that show the trail continues. On the Appalachian Trail they are white rectangles about 2 inches wide and 6 inches high. Other trails use other colors and shapes.',
          'One blaze means keep going.',
          'Two blazes, one above the other, mean pay attention: a turn, a junction or a change in route. On some trails the top blaze is offset toward the direction of the turn.',
          'Side trails often use a different color. Check the trailhead sign or map for what each color means.',
          'If you’ve gone a few hundred yards without seeing a blaze, stop. Go back until you find one, then look for a turn you missed.',
        ],
      },
      {
        heading: 'Distance',
        items: [
          'Count paces. A pace is two steps: count each time your right foot lands.',
          'Measure yours once. Walk one lap of a 400-meter track in the inside lane, which is about a quarter mile, and count paces. Multiply by four for your paces per mile. Most adults land somewhere around 1,000 to 1,300 on flat ground.',
          'Use time too. Your logged walks tell you your minutes per mile. Hills, roots and rocks slow you down, and so does fatigue on the way back.',
        ],
      },
      {
        heading: 'Landmarks',
        items: [
          'Choose landmarks that won’t change: a junction sign, a bridge, a stream crossing, a power line or a distinctive rock.',
          'Don’t count on things that move or change, like a parked vehicle or a pile of cut logs.',
          'A stream, fence or road that runs beside your route is a handrail. Follow it and you stay on course.',
          'Pick something that tells you you’ve gone too far, such as “If I reach the road, I’ve passed the turn.”',
        ],
      },
      {
        heading: 'Turnaround points',
        items: [
          'Decide before you start where you’ll turn around and by what time. Turn at whichever comes first.',
          'Leave more time for the way back than the way out. You’ll be more tired, and the return may climb.',
          'Plan to be back before dark.',
          'Also turn around if the weather turns, if you lose the trail, or if pain changes how you move.',
        ],
      },
      {
        heading: 'If you’re unsure where you are',
        intro: 'Remember STOP:',
        items: [
          'Stop: stay calm and stay put.',
          'Think: go back over how you got here. Where was the last blaze or landmark you’re sure of?',
          'Observe: find north, and look at the map and your surroundings.',
          'Plan: come up with a plan, often going back to the last place you were sure of.',
        ],
        outro:
          'If you aren’t confident of the way, stay where you are and call for help. Staying put makes you easier to find. Stay in place if it’s getting dark, or if you’re hurt or near exhaustion.',
      },
      {
        heading: 'Field mission (Week 6 Saturday)',
        intro: 'Before the walk, study the trail map and write down four predictions:',
        ordered: true,
        items: [
          'The direction you’ll head from the trailhead.',
          'One landmark you’ll pass.',
          'The distance to your first turn.',
          'Where the start will be from your farthest point: point toward it before you look.',
        ],
        outro: 'Afterward, check each one. What did you get right, and what was off?',
      },
      {
        heading: 'Daughter quest (Week 6 Saturday)',
        intro:
          'On the same walk, let your daughter lead along one simple marked stretch, such as between two junctions. She watches for the blazes and says which way to go at the junction. Stay right beside her. If she misses a turn, let her notice, then show her once and let her find the next one.',
        items: [],
      },
    ],
    relatedSkills: ['Navigation II (Chapter III)'],
  },
  {
    id: 'navigation-two',
    title: 'Navigation II',
    skill: 'navigation',
    week: 9,
    lastWeek: 12,
    when: 'Weeks 9–12: learn it across the month. Week 11: Saturday’s field mission and daughter quest. Use it for the High Country Trial’s pre-start plan.',
    summary:
      'Read the shape of the land on a map: how high the trail climbs, where it gets steep, and how long it will take. Then decide before you start when you’ll turn back. Keep your phone charged and with you as a backup.',
    sections: [
      {
        heading: 'Contour lines',
        items: [
          'A contour line joins points at the same height. If you walked along one, you would neither climb nor drop.',
          'The contour interval is the height between one line and the next. It’s printed near the scale bar or in the legend, and it differs from map to map, so check it every time.',
          'On most topographic maps every fifth line is thicker and labeled with its elevation. Count up or down from those.',
          'Lines close together mean steep ground. Lines far apart mean gentle ground.',
          'A small closed loop is a hilltop.',
          'If your trail map has no contour lines, find a printed topographic map of the area or turn on the topo layer in your map app.',
        ],
      },
      {
        heading: 'Elevation gain',
        items: [
          'Elevation gain is every climb on the route added together. It’s usually more than the difference between the trailhead and the high point, because most trails go up and down along the way.',
          'To estimate it, count the contour lines your route crosses going uphill and multiply by the interval. Do that for each climb, then add them up. Fifteen lines at a 40-foot interval is 600 feet.',
          'On an out-and-back trail, the dips on the way out become climbs on the way back. Count both directions.',
          'Many trail guides and apps list the gain. Use your count to check theirs, and theirs to check yours.',
        ],
      },
      {
        heading: 'Ridges, valleys and saddles',
        items: [
          'On a ridge, the contour lines bend into U or V shapes that point downhill, away from the high ground.',
          'In a valley, they bend into V shapes that point uphill. Where a stream runs through, the V points upstream.',
          'A saddle is the low point on a ridge between two higher points. On the map it looks like an hourglass: two sets of closed loops with the lines pinched together between them. Trails often cross a ridge at a saddle.',
          'A ridgeline has more wind and sun and no shelter from lightning. A valley holds streams and colder air, and in winter it often loses the sun early in the afternoon.',
        ],
      },
      {
        heading: 'Switchbacks',
        items: [
          'A switchback is a turn where the trail doubles back on itself to climb a steep slope at a walkable grade. A climb often has many in a row.',
          'On the map, they show as a trail zigzagging across contour lines that are close together.',
          'Stay on the trail through each turn. Cutting a switchback erodes the slope and damages the trail.',
          'Count the turns as you climb. If the map shows eight and you’ve done five, you know where you are.',
        ],
      },
      {
        heading: 'Trail intersections',
        items: [
          'Before you start, list every junction on your route in order, with the trail name, number or color you’ll take at each.',
          'At each junction, stop. Read the sign, check the map, and say which way you’re going before you go.',
          'Look back at each junction before you leave it. It will look different on the way home, and one look now makes it easier to recognize later.',
          'Note the time at each junction. It tells you how your pace compares with your estimate.',
          'If a junction has no sign or doesn’t match the map, use STOP from Navigation I.',
        ],
      },
      {
        heading: 'Hiking-time estimates',
        items: [
          'Start with your own pace on flat ground, from your logged walks, in minutes per mile.',
          'Add about 30 minutes for every 1,000 feet of gain. This comes from Naismith’s rule, an old hill walkers’ rule of thumb that assumes about 3 miles an hour on easy ground plus an hour for every 2,000 feet of climb.',
          'Add time for steep downhill, rough footing, cold, breaks, and the 5 quiet minutes at the high point. Treat the total as the least time the hike will take.',
          'Example: 5 miles at 20 minutes a mile is 100 minutes. 1,200 feet of gain adds about 36 minutes. With breaks, plan for about 2½ hours.',
          'Check your times at each junction. If you’re well behind at the first ones, expect to stay behind for the rest of the day.',
        ],
      },
      {
        heading: 'Turnaround criteria',
        intro:
          'Before you start, set a turnaround point and a turnaround time. Turn back at whichever comes first, even if the top is close. Set the time so you finish with daylight to spare. Winter days are short, and a valley or a north-facing slope loses the light early. Also turn back if:',
        items: [
          'the weather turns, or you hear thunder',
          'you lose the trail and can’t find it again',
          'pain reaches 4 or more, or changes how you move',
          'you’re running low on water',
          'you’re far behind your time estimate',
          'anyone with you is struggling',
        ],
        outro:
          'Once you’ve decided to turn back, go. Don’t reopen the decision on the way down. In the High Country Trial, turning back for weather, daylight, time or a lost trail is a postponement, and you try again another day. Turning back for pain is a stopped attempt, kept in history like any trial. Either way, turning back was the right call.',
      },
      {
        heading: 'Weather awareness',
        items: [
          'Check the forecast the night before and again in the morning, for the trailhead and for the high point if you can. Higher ground is usually colder and windier than the parking lot.',
          'Look for thunderstorms, high wind, freezing rain, snow or ice, and note when the sun sets.',
          'Pick another day if the forecast shows storms or ice. Postponing for weather doesn’t count as a failed attempt.',
          'On the trail, watch the sky to the west. In most of the US, weather usually moves in from that direction.',
          'If you hear thunder, you’re close enough to be struck. Get off ridges and peaks and head down right away, without waiting for rain. Stay away from lone trees, open ground, metal fences and water. Wait 30 minutes after the last thunder before going back up.',
          'Dress in layers you can add and take off. Carry a warm layer, a hat and gloves even if it’s mild at the trailhead. Wind and wet clothes make you cold much faster.',
          'Ice on a steep trail is a reason to turn back.',
        ],
      },
      {
        heading: 'Map north and compass north',
        items: [
          'Navigation I noted that a compass points to magnetic north, which differs from the map’s north. The difference is called declination. Many maps print it near the north arrow, and NOAA’s online calculator gives it for any location.',
          'On a marked trail, a few degrees won’t lead you astray. Declination matters when you follow a compass bearing across open ground, which this card doesn’t cover.',
        ],
      },
      {
        heading: 'Field mission (Week 11 Saturday)',
        intro: 'Before the trail rehearsal, study the trail map and write down two predictions:',
        ordered: true,
        items: [
          'The route’s total elevation gain, from counting contour lines.',
          'Where your turnaround point would be, and the time you’d turn at it.',
        ],
        outro:
          'Afterward, check both. Compare your gain with your phone’s record or the trail guide. Would your turnaround point have left enough time and daylight? On a gentle local trail the gain may be small. Count it anyway, because the method is the same on a mountain.',
      },
      {
        heading: 'Daughter quest (Week 11 Saturday)',
        intro:
          'Optional. On the same walk, give your daughter one navigation job on a marked trail and let her own it the whole way. She might call the turn at each junction, count the switchbacks, or say when she hasn’t seen a blaze for a while. Stay beside her. If she misses something, let her notice, show her once, and give the job back.',
        items: [],
      },
    ],
    relatedSkills: ['Navigation I'],
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
  // Navigation I is learned across Chapter II; Week 6's Saturday walk carries its field mission.
  ...[5, 6, 7, 8].map((week): WeeklyFieldcraft => ({
    week,
    title: 'Navigation I',
    skill: 'navigation',
    days: week === 6 ? 'Saturday’s field mission' : 'learn it this month',
    cardIds: ['navigation-one'],
  })),
  // Navigation II is learned across Chapter III; Week 11's Saturday rehearsal carries its field mission.
  ...[9, 10, 11, 12].map((week): WeeklyFieldcraft => ({
    week,
    title: 'Navigation II',
    skill: 'navigation',
    days: week === 11 ? 'Saturday’s field mission' : 'learn it this month',
    cardIds: ['navigation-two'],
  })),
];

/** Books the weekly lessons suggest that are not on the reading plan. */
export const EXTRA_BOOK_SUGGESTIONS: readonly string[] = [
  'The Common Rule',
  'Extreme Ownership',
  'Celebration of Discipline',
  'The Lost Art of Listening',
  'The Tech-Wise Family',
  'Decisive',
  'Crucial Conversations',
  'The Freedom of Self-Forgetfulness',
];

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
