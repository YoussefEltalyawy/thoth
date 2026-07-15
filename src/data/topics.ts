import { Topic } from "@/types";

// Seed content for Phase 1 (English only). Real content should be
// written natively, not translated, when MSA/Egyptian tracks are added
// in Phase 2 — see the plan doc.
export const topics: Topic[] = [
  {
    id: "on-patience-and-time",
    category: "Philosophy",
    tier: "intermediate",
    languageTrack: "en",
    contentType: "reading",
    title: "On Patience and Time",
    subtitle: "After Seneca",
    text:
      "We live in an age that has declared war on waiting. Every delay is a problem to be solved, every pause an inefficiency to be optimized away. But patience was never passivity — it was the discipline of the mind that refuses to be ruled by urgency. To wait well is to trust that some things simply take the time they take, and that rushing them costs more than it saves.",
    estimatedMinutes: 2,
    imageQuery: "green leaves forest canopy",
  },
  {
    id: "on-the-examined-life",
    category: "Philosophy",
    tier: "beginner",
    languageTrack: "en",
    contentType: "reading",
    title: "On the Examined Life",
    text:
      "Socrates claimed the unexamined life is not worth living. He didn't mean constant self-criticism — he meant the habit of asking why you believe what you believe, before the world hands you an answer and you accept it without noticing. Examination is not doubt for its own sake. It is the refusal to live on borrowed conclusions.",
    estimatedMinutes: 2,
  },
  {
    id: "the-discipline-of-attention",
    category: "Discipline",
    tier: "intermediate",
    languageTrack: "en",
    contentType: "reading",
    title: "The Discipline of Attention",
    text:
      "Attention is not something you have. It is something you spend, and most of it is spent before you notice you've chosen to. The discipline isn't forcing focus through willpower — it's building a life with fewer places for your attention to leak out of. What you attend to, over years, becomes who you are.",
    estimatedMinutes: 2,
  },
  {
    id: "on-choosing-your-battles",
    category: "Human Nature",
    tier: "beginner",
    languageTrack: "en",
    contentType: "prompt",
    title: "On Choosing Your Battles",
    text:
      "In your own words: explain why some disagreements are worth having in full, and others are better left alone. Speak for about two minutes as though explaining it to a close friend.",
    estimatedMinutes: 2,
  },
  {
    id: "on-ethics-of-small-decisions",
    category: "Ethics",
    tier: "dense",
    languageTrack: "en",
    contentType: "reading",
    title: "The Ethics of Small Decisions",
    text:
      "Moral character is rarely tested by the dramatic choice — it is built, slowly, by the thousand small decisions no one is watching. Whether you finish the task properly when no one would notice if you didn't. Whether you tell the small truth when a small lie would be easier. Ethics lives mostly in rooms with no audience.",
    estimatedMinutes: 2,
  },
];

export function getTopicsByTrack(track: Topic["languageTrack"]): Topic[] {
  return topics.filter((t) => t.languageTrack === track);
}

export function getTopicById(id: string): Topic | undefined {
  return topics.find((t) => t.id === id);
}
