use std::collections::{HashMap, HashSet};

use unicode_segmentation::UnicodeSegmentation;

use crate::games::{graphemes, GameWord};
use crate::rng::{hash, mixed, sorted_join, Rng};

pub const GROUP_COUNT: usize = 4;
pub const GROUP_SIZE: usize = 4;
pub const MISTAKES: i32 = 4;
pub const LONGEST_FORM: usize = 14;
pub const THEMES: [&str; 11] = ["adjective", "animal", "body", "color", "family", "food", "nature", "number", "object", "time", "verb"];
pub const SIDE: i32 = 6;
pub const WANTED: usize = 5;

#[derive(uniffi::Enum, Clone, Debug, PartialEq, Eq, Hash)]
pub enum GroupLink {
    Language { lang: String },
    Theme { theme: String },
    LanguageTheme { lang: String, theme: String },
}

impl GroupLink {
    pub fn key(&self) -> String {
        match self {
            GroupLink::Language { lang } => format!("l:{lang}"),
            GroupLink::Theme { theme } => format!("t:{theme}"),
            GroupLink::LanguageTheme { lang, theme } => format!("c:{lang}:{theme}"),
        }
    }
}

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct WordGroup {
    pub link: GroupLink,
    pub words: Vec<GameWord>,
}

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct WordGroupsPuzzle {
    pub groups: Vec<WordGroup>,
    pub tiles: Vec<GameWord>,
}

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct GroupWord {
    pub word: GameWord,
    pub theme: Option<String>,
    pub same_form: Vec<String>,
}

#[derive(Clone, Copy, PartialEq)]
enum Partition {
    Language,
    Theme,
    LanguageTheme,
}

pub fn board_key(day: &str, root: &str, targets: &[String]) -> String {
    let set: HashSet<&String> = targets.iter().collect();
    let unique: Vec<String> = set.into_iter().cloned().collect();
    format!("{day}|{root}|{}", sorted_join(&unique))
}

fn fits_group(w: &GameWord) -> bool {
    graphemes(&w.form) <= LONGEST_FORM && !w.form.contains(' ')
}

fn link(g: &GroupWord, partition: Partition) -> Option<GroupLink> {
    if partition == Partition::Language {
        return Some(GroupLink::Language { lang: g.word.lang.clone() });
    }
    let name = g.theme.clone().filter(|t| THEMES.contains(&t.as_str()))?;
    Some(if partition == Partition::Theme {
        GroupLink::Theme { theme: name }
    } else {
        GroupLink::LanguageTheme { lang: g.word.lang.clone(), theme: name }
    })
}

fn pick(words: &[&GroupWord], partition: Partition, rng: &mut Rng) -> Option<Vec<WordGroup>> {
    let mut order: Vec<GroupLink> = Vec::new();
    let mut buckets: HashMap<GroupLink, Vec<GameWord>> = HashMap::new();
    for g in words {
        if let Some(l) = link(g, partition) {
            if !buckets.contains_key(&l) {
                order.push(l.clone());
            }
            buckets.entry(l).or_default().push(g.word.clone());
        }
    }
    let mut links: Vec<GroupLink> = order.into_iter().filter(|l| buckets[l].len() >= GROUP_SIZE).collect();
    links.sort_by_key(|l| l.key());
    let mut forms: HashSet<String> = HashSet::new();
    let mut groups = Vec::new();
    for l in mixed(&links, rng) {
        if groups.len() >= GROUP_COUNT {
            break;
        }
        let mut taken = Vec::new();
        let mut meanings: HashSet<String> = HashSet::new();
        let mut spelled = forms.clone();
        for w in &buckets[&l] {
            if taken.len() >= GROUP_SIZE {
                break;
            }
            let gloss = w.gloss.to_lowercase();
            let form = w.form.to_lowercase();
            if meanings.contains(&w.item_id) || meanings.contains(&gloss) || spelled.contains(&form) {
                continue;
            }
            meanings.insert(w.item_id.clone());
            meanings.insert(gloss);
            spelled.insert(form);
            taken.push(w.clone());
        }
        if taken.len() != GROUP_SIZE {
            continue;
        }
        forms = spelled;
        groups.push(WordGroup { link: l, words: taken });
    }
    (groups.len() == GROUP_COUNT).then_some(groups)
}

#[uniffi::export]
pub fn word_groups_daily(words: Vec<GroupWord>, day: String, root: String, targets: Vec<String>) -> Option<WordGroupsPuzzle> {
    let seed = format!("groups|{}", board_key(&day, &root, &targets));
    let mut rng = Rng::new(hash(&seed));
    let mut keyed: Vec<(u64, String, &GroupWord)> = words
        .iter()
        .filter(|g| targets.contains(&g.word.lang) && fits_group(&g.word))
        .map(|g| {
            let id = g.word.id();
            (hash(&format!("{seed}|{id}")), id, g)
        })
        .collect();
    keyed.sort_by(|a, b| a.0.cmp(&b.0).then_with(|| a.1.cmp(&b.1)));
    let pool: Vec<&GroupWord> = keyed.into_iter().map(|(_, _, g)| g).collect();
    let distinct: Vec<&GroupWord> = pool
        .iter()
        .copied()
        .filter(|g| !targets.iter().any(|t| *t != g.word.lang && g.same_form.contains(t)))
        .collect();
    for partition in mixed(&[Partition::Language, Partition::Theme, Partition::LanguageTheme], &mut rng) {
        let source = if partition == Partition::Theme { &pool } else { &distinct };
        if let Some(groups) = pick(source, partition, &mut rng) {
            let all: Vec<GameWord> = groups.iter().flat_map(|g| g.words.clone()).collect();
            let tiles = mixed(&all, &mut rng);
            return Some(WordGroupsPuzzle { groups, tiles });
        }
    }
    None
}

#[derive(uniffi::Record, Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct MiniCell {
    pub row: i32,
    pub col: i32,
}

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct MiniEntry {
    pub word: GameWord,
    pub letters: Vec<String>,
    pub row: i32,
    pub col: i32,
    pub across: bool,
    pub number: i32,
}

impl MiniEntry {
    pub fn cells(&self) -> Vec<MiniCell> {
        (0..self.letters.len() as i32)
            .map(|i| if self.across { MiniCell { row: self.row, col: self.col + i } } else { MiniCell { row: self.row + i, col: self.col } })
            .collect()
    }
}

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct MiniPuzzle {
    pub lang: String,
    pub entries: Vec<MiniEntry>,
    pub keys: Vec<String>,
}

#[uniffi::export]
pub fn mini_letters(form: String) -> Option<Vec<String>> {
    let gs: Vec<&str> = form.graphemes(true).collect();
    if !gs.iter().all(|g| g.chars().next().is_some_and(char::is_alphabetic)) || !(3..=SIDE as usize).contains(&gs.len()) {
        return None;
    }
    Some(
        gs.into_iter()
            .map(|g| {
                let up = g.to_uppercase();
                if graphemes(&up) == 1 { up } else { g.to_string() }
            })
            .collect(),
    )
}

#[uniffi::export]
pub fn mini_daily(words: Vec<GameWord>, day: String, root: String, targets: Vec<String>) -> Option<MiniPuzzle> {
    let mut rng = Rng::new(hash(&format!("mini|{day}|{root}|{}", sorted_join(&targets))));
    let mut sorted = targets.clone();
    sorted.sort();
    let eligible: Vec<String> = sorted
        .into_iter()
        .filter(|l| words.iter().filter(|w| &w.lang == l && mini_letters(w.form.clone()).is_some()).count() >= 8)
        .collect();
    for lang in rng.shuffled(&eligible) {
        let own: Vec<GameWord> = words.iter().filter(|w| w.lang == lang).cloned().collect();
        if let Some(p) = build(own, &lang, &mut rng) {
            return Some(p);
        }
    }
    None
}

fn build(mut words: Vec<GameWord>, lang: &str, rng: &mut Rng) -> Option<MiniPuzzle> {
    words.sort_by_key(|w| w.id());
    let mut seen = HashSet::new();
    let pool: Vec<(GameWord, Vec<String>)> = words
        .into_iter()
        .filter_map(|w| {
            let l = mini_letters(w.form.clone())?;
            seen.insert(l.concat()).then_some((w, l))
        })
        .collect();
    let mut best: Vec<MiniEntry> = Vec::new();
    for _ in 0..30 {
        let placed = attempt(&rng.shuffled(&pool), rng);
        if placed.len() > best.len() {
            best = placed;
        }
        if best.len() >= WANTED {
            break;
        }
    }
    if best.len() < 3 {
        return None;
    }
    let top = best.iter().map(|e| e.row).min().unwrap_or(0);
    let left = best.iter().map(|e| e.col).min().unwrap_or(0);
    let mut shifted: Vec<MiniEntry> = best.into_iter().map(|e| MiniEntry { row: e.row - top, col: e.col - left, ..e }).collect();
    let mut starts: Vec<MiniCell> = shifted.iter().map(|e| MiniCell { row: e.row, col: e.col }).collect::<HashSet<_>>().into_iter().collect();
    starts.sort();
    for e in shifted.iter_mut() {
        e.number = starts.iter().position(|c| *c == MiniCell { row: e.row, col: e.col }).map_or(0, |i| i as i32) + 1;
    }
    shifted.sort_by_key(|e| (e.number, if e.across { 0 } else { 1 }));
    let mut keys: HashSet<String> = shifted.iter().flat_map(|e| e.letters.clone()).collect();
    let all: Vec<String> = pool.iter().flat_map(|(_, l)| l.clone()).collect();
    for l in rng.shuffled(&all) {
        if keys.len() < 18 {
            keys.insert(l);
        }
    }
    let mut keys: Vec<String> = keys.into_iter().collect();
    keys.sort();
    Some(MiniPuzzle { lang: lang.to_string(), entries: shifted, keys })
}

fn attempt(pool: &[(GameWord, Vec<String>)], rng: &mut Rng) -> Vec<MiniEntry> {
    let Some(first) = pool.first() else { return Vec::new() };
    let mut placed = vec![MiniEntry { word: first.0.clone(), letters: first.1.clone(), row: 0, col: 0, across: true, number: 0 }];
    for (word, letters) in &pool[1..] {
        if placed.len() >= WANTED {
            break;
        }
        let mut spots = Vec::new();
        for e in &placed {
            let cells = e.cells();
            for (i, a) in e.letters.iter().enumerate() {
                for (j, b) in letters.iter().enumerate() {
                    if a != b {
                        continue;
                    }
                    let cross = cells[i];
                    let j = j as i32;
                    let spot = MiniEntry {
                        word: word.clone(),
                        letters: letters.clone(),
                        row: if e.across { cross.row - j } else { cross.row },
                        col: if e.across { cross.col } else { cross.col - j },
                        across: !e.across,
                        number: 0,
                    };
                    if fits(&spot, &placed) {
                        spots.push(spot);
                    }
                }
            }
        }
        if let Some(s) = rng.element(&spots) {
            placed.push(s.clone());
        }
    }
    placed
}

fn fits(e: &MiniEntry, placed: &[MiniEntry]) -> bool {
    let mine = e.cells();
    let cells: Vec<MiniCell> = placed.iter().flat_map(|p| p.cells()).chain(mine.iter().copied()).collect();
    let rows = cells.iter().map(|c| c.row);
    let cols = cells.iter().map(|c| c.col);
    if rows.clone().max().unwrap() - rows.min().unwrap() >= SIDE || cols.clone().max().unwrap() - cols.min().unwrap() >= SIDE {
        return false;
    }
    let mut letter: HashMap<MiniCell, &String> = HashMap::new();
    let mut same_way: HashSet<MiniCell> = HashSet::new();
    for p in placed {
        for (c, l) in p.cells().into_iter().zip(&p.letters) {
            letter.insert(c, l);
            if p.across == e.across {
                same_way.insert(c);
            }
        }
    }
    let end = *mine.last().unwrap();
    let (before, after) = if e.across {
        (MiniCell { row: e.row, col: e.col - 1 }, MiniCell { row: end.row, col: end.col + 1 })
    } else {
        (MiniCell { row: e.row - 1, col: e.col }, MiniCell { row: end.row + 1, col: end.col })
    };
    if letter.contains_key(&before) || letter.contains_key(&after) {
        return false;
    }
    for (c, l) in mine.iter().zip(&e.letters) {
        if same_way.contains(c) {
            return false;
        }
        if let Some(there) = letter.get(c) {
            if *there != l {
                return false;
            }
            continue;
        }
        let sides = if e.across {
            [MiniCell { row: c.row - 1, col: c.col }, MiniCell { row: c.row + 1, col: c.col }]
        } else {
            [MiniCell { row: c.row, col: c.col - 1 }, MiniCell { row: c.row, col: c.col + 1 }]
        };
        if sides.iter().any(|s| letter.contains_key(s)) {
            return false;
        }
    }
    true
}
