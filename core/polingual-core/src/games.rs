use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use unicode_segmentation::UnicodeSegmentation;

use crate::rng::{daily_seed, mixed, Rng};

pub const MISSED_RANK: i32 = 0;
pub const DUE_RANK: i32 = 1;
pub const HELD_RANK: i32 = 2;
pub const STARTER_RANK: i32 = 3;
pub const DAILY_LENGTH: usize = 6;
pub const QUIZ_LENGTH: usize = 10;
pub const SAME_WORD_MEANINGS: i32 = 4;
pub const SAME_WORD_LANGS: usize = 3;
pub const DAILY_POOL: usize = 400;

pub const LANG_CODES: [&str; 29] = [
    "en", "es", "fr", "it", "pt", "de", "nl", "sv", "pl", "fi", "ru", "el", "ar", "hi", "ja", "zh", "ko", "he", "fa", "tr",
    "cs", "id", "vi", "th", "ta", "la", "grc", "sa", "ang",
];

const FAMILIES: [&[&str]; 5] = [
    &["es", "pt", "it", "fr", "en", "de", "nl", "sv", "pl", "cs", "fi", "tr", "id", "vi", "la", "ang"],
    &["ru", "el", "grc"],
    &["ar", "fa", "he"],
    &["hi", "sa", "ta", "th"],
    &["ja", "zh", "ko"],
];
const CLASSICAL: [&str; 4] = ["la", "ang", "grc", "sa"];

pub fn graphemes(s: &str) -> usize {
    s.graphemes(true).count()
}

pub fn first_grapheme(s: &str) -> Option<&str> {
    s.graphemes(true).next()
}

#[derive(uniffi::Record, Clone, Debug, PartialEq, Eq, Hash)]
pub struct GameWord {
    pub item_id: String,
    pub lang: String,
    pub form: String,
    pub gloss: String,
    pub root: String,
    pub rank: i32,
}

impl GameWord {
    pub fn id(&self) -> String {
        format!("{}:{}", self.lang, self.item_id)
    }
}

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct DeckEntry {
    pub item_id: String,
    pub form: String,
    pub gloss: String,
    pub category: String,
}

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct LangPool {
    pub lang: String,
    pub entries: Vec<DeckEntry>,
}

#[derive(uniffi::Enum, Clone, Copy, Debug, PartialEq, Eq)]
pub enum PromptMode {
    Form,
    Flag,
    Voice,
}

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct GamePrompt {
    pub id: i32,
    pub mode: PromptMode,
    pub word: GameWord,
    pub choices: Vec<String>,
    pub answer: String,
    pub group: i32,
}

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct Strings {
    pub values: Vec<String>,
    pub rng: u64,
}

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct Words {
    pub values: Vec<GameWord>,
    pub rng: u64,
}

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct Prompts {
    pub values: Vec<GamePrompt>,
    pub rng: u64,
}

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct FlagWord {
    pub word: GameWord,
    pub clash: Vec<String>,
}

#[uniffi::export]
pub fn balanced(words: Vec<GameWord>) -> Vec<GameWord> {
    let mut langs: Vec<String> = Vec::new();
    let mut queues: HashMap<String, std::collections::VecDeque<GameWord>> = HashMap::new();
    for w in &words {
        if !queues.contains_key(&w.lang) {
            langs.push(w.lang.clone());
        }
        queues.entry(w.lang.clone()).or_default().push_back(w.clone());
    }
    let mut turns = Vec::with_capacity(words.len());
    while turns.len() < words.len() {
        for l in &langs {
            if let Some(w) = queues.get_mut(l).and_then(|q| q.pop_front()) {
                turns.push(w);
            }
        }
    }
    let mut indexed: Vec<(usize, GameWord)> = turns.into_iter().enumerate().collect();
    indexed.sort_by_key(|(i, w)| (w.rank.min(HELD_RANK), *i));
    indexed.into_iter().map(|(_, w)| w).collect()
}

#[derive(uniffi::Object, Debug)]
pub struct Deck {
    root: String,
    targets: Vec<String>,
    pools: HashMap<String, Vec<DeckEntry>>,
    index: HashMap<String, HashMap<String, usize>>,
}

#[uniffi::export]
impl Deck {
    #[uniffi::constructor]
    pub fn new(root: String, targets: Vec<String>, pools: Vec<LangPool>) -> Arc<Self> {
        Arc::new(Self::build(root, targets, pools))
    }

    pub fn word(&self, item_id: String, lang: String) -> Option<GameWord> {
        self.find(&item_id, &lang)
    }

    pub fn foils(&self, word: GameWord, also: Vec<String>, count: u32, rng: u64) -> Strings {
        let mut r = Rng::resume(rng);
        let values = self.foils_with(&word, &also, count as usize, &mut r);
        Strings { values, rng: r.state }
    }

    pub fn daily_words(&self, count: u32, rng: u64) -> Words {
        let mut r = Rng::resume(rng);
        let values = self.daily_with(count as usize, &mut r);
        Words { values, rng: r.state }
    }

    pub fn shared(&self) -> Vec<String> {
        self.shared_ids()
    }

    pub fn daily_round(&self, day: String) -> Vec<GamePrompt> {
        round_daily(self, &day)
    }

    pub fn same_word_round(&self, words: Vec<GameWord>, rng: u64) -> Prompts {
        let mut r = Rng::resume(rng);
        let values = round_same_word(self, &words, &mut r);
        Prompts { values, rng: r.state }
    }
}

impl Deck {
    pub fn build(root: String, targets: Vec<String>, pools: Vec<LangPool>) -> Self {
        let mut p = HashMap::new();
        let mut ix = HashMap::new();
        for pool in pools {
            let mut m: HashMap<String, usize> = HashMap::new();
            for (i, e) in pool.entries.iter().enumerate() {
                m.entry(e.item_id.clone()).or_insert(i);
            }
            ix.insert(pool.lang.clone(), m);
            p.insert(pool.lang, pool.entries);
        }
        Deck { root, targets, pools: p, index: ix }
    }

    pub fn root(&self) -> &str {
        &self.root
    }

    pub fn targets(&self) -> &[String] {
        &self.targets
    }

    fn entry(&self, item_id: &str, lang: &str) -> Option<&DeckEntry> {
        let i = *self.index.get(lang)?.get(item_id)?;
        self.pools.get(lang).map(|p| &p[i])
    }

    pub fn find(&self, item_id: &str, lang: &str) -> Option<GameWord> {
        self.entry(item_id, lang).map(|e| GameWord {
            item_id: e.item_id.clone(),
            lang: lang.to_string(),
            form: e.form.clone(),
            gloss: e.gloss.clone(),
            root: self.root.clone(),
            rank: HELD_RANK,
        })
    }

    pub fn foils_with(&self, word: &GameWord, also: &[String], count: usize, rng: &mut Rng) -> Vec<String> {
        let empty = Vec::new();
        let pool = self.pools.get(&word.lang).unwrap_or(&empty);
        let category = self.entry(&word.item_id, &word.lang).map(|e| e.category.as_str());
        let form = word.form.to_lowercase();
        let gloss = word.gloss.to_lowercase();
        let size = graphemes(&word.form) as i64;
        let first = first_grapheme(&word.form);
        let mut ranked: Vec<(i64, &DeckEntry)> = pool
            .iter()
            .filter(|e| e.gloss.to_lowercase() != gloss && e.form.to_lowercase() != form)
            .map(|e| {
                let cat = if Some(e.category.as_str()) == category { 0 } else { 4 };
                let len = (graphemes(&e.form) as i64 - size).abs().min(3);
                let lead = if first_grapheme(&e.form) == first { 0 } else { 1 };
                (cat + len + lead, e)
            })
            .collect();
        ranked.sort_by(|a, b| a.0.cmp(&b.0).then_with(|| a.1.item_id.cmp(&b.1.item_id)));
        let close: Vec<&DeckEntry> = ranked.into_iter().take(16).map(|(_, e)| e).collect();
        let mut taken: HashSet<String> = HashSet::new();
        taken.insert(form.clone());
        for a in also {
            taken.insert(a.to_lowercase());
        }
        let mut out: Vec<String> = also.iter().filter(|a| a.to_lowercase() != form).cloned().collect();
        for e in mixed(&close, rng) {
            if out.len() >= count {
                break;
            }
            if taken.insert(e.form.to_lowercase()) {
                out.push(e.form.clone());
            }
        }
        out.truncate(count);
        out
    }

    pub fn daily_with(&self, count: usize, rng: &mut Rng) -> Vec<GameWord> {
        let mut langs = self.targets.clone();
        langs.sort();
        if langs.is_empty() {
            return Vec::new();
        }
        let empty = Vec::new();
        let common: Vec<Vec<DeckEntry>> = langs
            .iter()
            .map(|l| {
                let p = self.pools.get(l).unwrap_or(&empty);
                mixed(&p[..p.len().min(DAILY_POOL)], rng)
            })
            .collect();
        let mut used = HashSet::new();
        let mut out = Vec::new();
        let mut cursors = vec![0usize; langs.len()];
        let mut i = 0;
        while out.len() < count && (0..langs.len()).any(|k| cursors[k] < common[k].len()) {
            let k = i % langs.len();
            i += 1;
            while cursors[k] < common[k].len() {
                let e = &common[k][cursors[k]];
                cursors[k] += 1;
                if used.insert(e.item_id.clone()) {
                    out.push(GameWord {
                        item_id: e.item_id.clone(),
                        lang: langs[k].clone(),
                        form: e.form.clone(),
                        gloss: e.gloss.clone(),
                        root: self.root.clone(),
                        rank: HELD_RANK,
                    });
                    break;
                }
            }
        }
        out
    }

    pub fn shared_ids(&self) -> Vec<String> {
        self.targets
            .first()
            .and_then(|t| self.pools.get(t))
            .map(|p| p.iter().map(|e| e.item_id.clone()).collect())
            .unwrap_or_default()
    }
}

pub fn family(lang: &str) -> Vec<String> {
    FAMILIES
        .iter()
        .find(|g| g.contains(&lang))
        .map(|g| g.iter().map(|s| s.to_string()).collect())
        .unwrap_or_else(|| vec![lang.to_string()])
}

pub fn distractors_with(lang: &str, own: &[String], excluding: &[String], count: usize, rng: &mut Rng) -> Vec<String> {
    let mut blocked: HashSet<String> = excluding.iter().cloned().collect();
    blocked.insert(lang.to_string());
    for c in CLASSICAL {
        if !own.iter().any(|o| o == c) {
            blocked.insert(c.to_string());
        }
    }
    let kin: Vec<String> = family(lang).into_iter().filter(|l| !blocked.contains(l)).collect();
    let inside: Vec<String> = kin.iter().filter(|l| own.contains(l)).cloned().collect();
    let outside: Vec<String> = kin.iter().filter(|l| !own.contains(l)).cloned().collect();
    let mut near = mixed(&inside, rng);
    near.extend(mixed(&outside, rng));
    if near.len() >= 2 {
        near.truncate(count);
        return near;
    }
    let own_far: Vec<String> = own.iter().filter(|l| !blocked.contains(*l) && !near.contains(l)).cloned().collect();
    let rest: Vec<String> = LANG_CODES
        .iter()
        .map(|s| s.to_string())
        .filter(|l| !blocked.contains(l) && !near.contains(l) && !own.contains(l))
        .collect();
    let mut all = near;
    all.extend(mixed(&own_far, rng));
    all.extend(mixed(&rest, rng));
    all.truncate(count);
    all
}

#[uniffi::export]
pub fn distractors(lang: String, own: Vec<String>, excluding: Vec<String>, count: u32, rng: u64) -> Strings {
    let mut r = Rng::resume(rng);
    let values = distractors_with(&lang, &own, &excluding, count as usize, &mut r);
    Strings { values, rng: r.state }
}

fn form_prompt(id: usize, word: &GameWord, deck: &Deck, also: &[String], group: i32, rng: &mut Rng) -> GamePrompt {
    let foils = deck.foils_with(word, also, 3, rng);
    let mut options = vec![word.form.clone()];
    options.extend(foils);
    GamePrompt {
        id: id as i32,
        mode: PromptMode::Form,
        word: word.clone(),
        choices: mixed(&options, rng),
        answer: word.form.clone(),
        group,
    }
}

pub fn round_daily(deck: &Deck, day: &str) -> Vec<GamePrompt> {
    let mut rng = Rng::new(daily_seed(day, &deck.root, &deck.targets));
    let words = deck.daily_with(DAILY_LENGTH, &mut rng);
    words.iter().enumerate().map(|(i, w)| form_prompt(i, w, deck, &[], 0, &mut rng)).collect()
}

pub fn round_same_word(deck: &Deck, words: &[GameWord], rng: &mut Rng) -> Vec<GamePrompt> {
    let mut ids: Vec<String> = Vec::new();
    let mut seen = HashSet::new();
    for id in words.iter().filter(|w| w.root == deck.root).map(|w| w.item_id.clone()).chain(deck.shared_ids()) {
        if seen.insert(id.clone()) {
            ids.push(id);
        }
    }
    let mut out = Vec::new();
    let mut group = 0;
    for id in ids {
        if group >= SAME_WORD_MEANINGS {
            break;
        }
        let fam: Vec<GameWord> = deck.targets.iter().filter_map(|t| deck.find(&id, t)).take(SAME_WORD_LANGS).collect();
        let forms: HashSet<&String> = fam.iter().map(|w| &w.form).collect();
        if fam.len() < 2 || forms.len() != fam.len() {
            continue;
        }
        for w in &fam {
            let other: Vec<String> = fam.iter().find(|o| o.lang != w.lang).map(|o| o.form.clone()).into_iter().collect();
            let p = form_prompt(out.len(), w, deck, &other, group, rng);
            out.push(p);
        }
        group += 1;
    }
    out
}

pub fn round_flags(words: &[FlagWord], own: &[String], mode: PromptMode, count: usize, rng: &mut Rng) -> Vec<GamePrompt> {
    let clashes: HashMap<String, &Vec<String>> = words.iter().map(|f| (f.word.id(), &f.clash)).collect();
    let mut seen = HashSet::new();
    let unique: Vec<GameWord> = balanced(words.iter().map(|f| f.word.clone()).collect())
        .into_iter()
        .filter(|w| seen.insert(w.form.to_lowercase()))
        .take(count)
        .collect();
    let empty = Vec::new();
    unique
        .into_iter()
        .enumerate()
        .map(|(i, w)| {
            let clash = clashes.get(&w.id()).copied().unwrap_or(&empty);
            let wrong = distractors_with(&w.lang, own, clash, 3, rng);
            let mut options = vec![w.lang.clone()];
            options.extend(wrong);
            GamePrompt { id: i as i32, mode, choices: mixed(&options, rng), answer: w.lang.clone(), word: w, group: 0 }
        })
        .collect()
}

#[uniffi::export]
pub fn flags_round(words: Vec<FlagWord>, own: Vec<String>, mode: PromptMode, count: u32, rng: u64) -> Prompts {
    let mut r = Rng::resume(rng);
    let values = round_flags(&words, &own, mode, count as usize, &mut r);
    Prompts { values, rng: r.state }
}
