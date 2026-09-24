export const PRIVACY_DRAFT = true;

export const COLLECTED: { what: string; detail: string; why: string }[] = [
  {
    what: "Email",
    detail: "The address you sign in with, plus what you typed on the waitlist form if you used it.",
    why: "To send your sign-in code and your invite, and to answer you when you write to us.",
  },
  {
    what: "Age band",
    detail: "Your answer to the age question: under 13, 13 to 17, or 18 and over. We never ask for a birth date.",
    why: "To decide what you may use. At launch, accounts under 18 can read and cannot save work, and an under-13 answer deletes the account's learning data.",
  },
  {
    what: "Progress",
    detail: "The decks you open, your placement result, each graded answer, your review schedule and your assessment scores.",
    why: "To schedule your next reviews and show your level on your profile.",
  },
  {
    what: "Public Mastery Profile",
    detail: "Only if you turn it on: the handle and display name you choose, and for each branch you study, how many concepts you started and mastered, your deepest level and your last study date. Anyone can read it at bucket.foundation/m/ followed by your handle.",
    why: "To let you show your progress to others. Turn it off and the page goes away.",
  },
  {
    what: "Product events",
    detail: "A short record, tied to your account, each time one of the events below happens.",
    why: "To learn whether Learn works: how many people finish a first session and how many come back.",
  },
];

export const EVENTS: { name: string; when: string }[] = [
  { name: "age_band_set", when: "you answer the age question" },
  { name: "placement_done", when: "you finish placement: the branch, how many questions, how many you knew" },
  { name: "study_session_done", when: "you finish a study session: items studied, items right, seconds spent" },
  { name: "assess_done", when: "you finish an assessment: each item and whether it was right" },
  { name: "tutor_turn", when: "you ask the tutor a question, once the tutor is on: the atom, the study arm, and the tokens and cost of the reply" },
];

export const PROCESSORS: { name: string; role: string }[] = [
  { name: "Supabase", role: "stores your account and the records above" },
  { name: "Vercel", role: "hosts the site and counts page views without cookies" },
  { name: "Email provider", role: "will send sign-in codes and invites from a bucket.foundation address; we name it here before the first wave of invites" },
  { name: "Anthropic", role: "receives the text of a tutor question and the lesson it is about, once the tutor is on" },
];
