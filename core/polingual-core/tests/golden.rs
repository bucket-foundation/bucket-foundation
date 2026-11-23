use polingual_core::games::{self, DeckEntry, FlagWord, GamePrompt, GameWord, LangPool, PromptMode};
use polingual_core::puzzles::{self, GroupLink, GroupWord};
use polingual_core::rng::{self, Rng};
use polingual_core::study::{self, CardState};
use serde_json::Value;

fn fixture() -> Value {
    let text = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/kotlin-golden.json")).unwrap();
    serde_json::from_str(&text).unwrap()
}

fn st(v: &Value) -> String {
    v.as_str().unwrap().to_string()
}

fn u(v: &Value) -> u64 {
    v.as_str().unwrap().parse().unwrap()
}

fn i(v: &Value) -> i64 {
    v.as_i64().unwrap()
}

fn strs(v: &Value) -> Vec<String> {
    v.as_array().unwrap().iter().map(st).collect()
}

fn word(v: &Value) -> GameWord {
    GameWord {
        item_id: st(&v["item_id"]),
        lang: st(&v["lang"]),
        form: st(&v["form"]),
        gloss: st(&v["gloss"]),
        root: st(&v["root"]),
        rank: i(&v["rank"]) as i32,
    }
}

fn words(v: &Value) -> Vec<GameWord> {
    v.as_array().unwrap().iter().map(word).collect()
}

fn mode(v: &Value) -> PromptMode {
    match v.as_str().unwrap() {
        "Form" => PromptMode::Form,
        "Flag" => PromptMode::Flag,
        _ => PromptMode::Voice,
    }
}

fn prompts(v: &Value) -> Vec<GamePrompt> {
    v.as_array()
        .unwrap()
        .iter()
        .map(|p| GamePrompt {
            id: i(&p["id"]) as i32,
            mode: mode(&p["mode"]),
            word: word(&p["word"]),
            choices: strs(&p["choices"]),
            answer: st(&p["answer"]),
            group: i(&p["group"]) as i32,
        })
        .collect()
}

fn card(v: &Value) -> CardState {
    CardState {
        reps: i(&v["reps"]) as i32,
        lapses: i(&v["lapses"]) as i32,
        interval_days: v["interval_days"].as_f64().unwrap(),
        due: i(&v["due"]),
        last: i(&v["last"]),
    }
}

fn deck(f: &Value) -> games::Deck {
    let d = &f["deck"];
    let pools = d["pools"]
        .as_array()
        .unwrap()
        .iter()
        .map(|p| LangPool {
            lang: st(&p["lang"]),
            entries: p["entries"]
                .as_array()
                .unwrap()
                .iter()
                .map(|e| DeckEntry { item_id: st(&e["item_id"]), form: st(&e["form"]), gloss: st(&e["gloss"]), category: st(&e["category"]) })
                .collect(),
        })
        .collect();
    games::Deck::build(st(&d["root"]), strs(&d["targets"]), pools)
}

#[test]
fn seeded_random_matches_kotlin() {
    for c in fixture()["rng"].as_array().unwrap() {
        let mut r = Rng::new(u(&c["seed"]));
        let next: Vec<u64> = (0..8).map(|_| r.next_u64()).collect();
        assert_eq!(next, c["next"].as_array().unwrap().iter().map(u).collect::<Vec<_>>());
        let below: Vec<i64> = c["bounds"].as_array().unwrap().iter().map(|b| r.below(i(b) as usize) as i64).collect();
        assert_eq!(below, c["below"].as_array().unwrap().iter().map(i).collect::<Vec<_>>());
        let xs: Vec<i64> = (0..10).collect();
        assert_eq!(r.shuffled(&xs), c["shuffled"].as_array().unwrap().iter().map(i).collect::<Vec<_>>());
        assert_eq!(rng::mixed(&xs, &mut r), c["mixed"].as_array().unwrap().iter().map(i).collect::<Vec<_>>());
        assert_eq!(r.next_u64(), u(&c["state"]));
    }
}

#[test]
fn seed_hashes_match_kotlin() {
    let f = fixture();
    for c in f["hash"].as_array().unwrap() {
        assert_eq!(rng::hash(&st(&c["text"])), u(&c["hash"]));
    }
    let targets = strs(&f["deck"]["targets"]);
    for c in f["daily_seed"].as_array().unwrap() {
        assert_eq!(rng::daily_seed(&st(&c["day"]), "en", &targets), u(&c["out"]));
    }
}

#[test]
fn grading_matches_kotlin() {
    for c in fixture()["grade"].as_array().unwrap() {
        assert_eq!(study::grade(card(&c["state"]), c["correct"].as_bool().unwrap(), i(&c["now"])), card(&c["out"]));
    }
}

#[test]
fn streaks_match_kotlin() {
    for c in fixture()["streak"].as_array().unwrap() {
        let today = c["today"].as_str().map(str::to_string);
        assert_eq!(study::streak_count(strs(&c["days"]), today) as i64, i(&c["out"]));
    }
}

#[test]
fn balanced_matches_kotlin() {
    let f = fixture();
    assert_eq!(games::balanced(words(&f["balanced"]["in"])), words(&f["balanced"]["out"]));
}

#[test]
fn foils_match_kotlin() {
    let f = fixture();
    let d = deck(&f);
    for c in f["foils"].as_array().unwrap() {
        let mut r = Rng::new(u(&c["seed"]));
        assert_eq!(d.foils_with(&word(&c["word"]), &strs(&c["also"]), 3, &mut r), strs(&c["out"]));
        assert_eq!(r.next_u64(), u(&c["state"]));
    }
}

#[test]
fn daily_words_and_rounds_match_kotlin() {
    let f = fixture();
    let d = deck(&f);
    for c in f["daily_words"].as_array().unwrap() {
        let mut r = Rng::new(u(&c["seed"]));
        assert_eq!(d.daily_with(i(&c["count"]) as usize, &mut r), words(&c["out"]));
        assert_eq!(r.next_u64(), u(&c["state"]));
    }
    for c in f["daily_rounds"].as_array().unwrap() {
        assert_eq!(games::round_daily(&d, &st(&c["day"])), prompts(&c["out"]));
    }
}

#[test]
fn same_word_matches_kotlin() {
    let f = fixture();
    let d = deck(&f);
    for c in f["same_word"].as_array().unwrap() {
        let mut r = Rng::new(u(&c["seed"]));
        assert_eq!(games::round_same_word(&d, &words(&c["words"]), &mut r), prompts(&c["out"]));
        assert_eq!(r.next_u64(), u(&c["state"]));
    }
}

#[test]
fn distractors_match_kotlin() {
    for c in fixture()["distractors"].as_array().unwrap() {
        let mut r = Rng::new(u(&c["seed"]));
        assert_eq!(games::distractors_with(&st(&c["lang"]), &strs(&c["own"]), &strs(&c["excluding"]), 3, &mut r), strs(&c["out"]));
        assert_eq!(r.next_u64(), u(&c["state"]));
    }
}

#[test]
fn flags_match_kotlin() {
    let f = fixture();
    let fl = &f["flags"];
    let input: Vec<FlagWord> = words(&fl["words"])
        .into_iter()
        .zip(fl["clash"].as_array().unwrap())
        .map(|(word, c)| FlagWord { word, clash: strs(c) })
        .collect();
    for c in fl["cases"].as_array().unwrap() {
        let mut r = Rng::new(u(&c["seed"]));
        assert_eq!(games::round_flags(&input, &strs(&fl["own"]), mode(&c["mode"]), 10, &mut r), prompts(&c["out"]));
        assert_eq!(r.next_u64(), u(&c["state"]));
    }
}

fn link(v: &Value) -> GroupLink {
    match v["kind"].as_str().unwrap() {
        "Language" => GroupLink::Language { lang: st(&v["lang"]) },
        "Theme" => GroupLink::Theme { theme: st(&v["theme"]) },
        _ => GroupLink::LanguageTheme { lang: st(&v["lang"]), theme: st(&v["theme"]) },
    }
}

#[test]
fn word_groups_match_kotlin() {
    let f = fixture();
    let wg = &f["word_groups"];
    let input: Vec<GroupWord> = wg["words"]
        .as_array()
        .unwrap()
        .iter()
        .map(|g| GroupWord { word: word(&g["word"]), theme: g["theme"].as_str().map(str::to_string), same_form: strs(&g["same_form"]) })
        .collect();
    let targets = strs(&f["deck"]["targets"]);
    for c in wg["cases"].as_array().unwrap() {
        let got = puzzles::word_groups_daily(input.clone(), st(&c["day"]), "en".into(), targets.clone()).unwrap();
        let want = &c["out"];
        let groups: Vec<(GroupLink, Vec<GameWord>)> = want["groups"].as_array().unwrap().iter().map(|g| (link(&g["link"]), words(&g["words"]))).collect();
        assert_eq!(got.groups.into_iter().map(|g| (g.link, g.words)).collect::<Vec<_>>(), groups);
        assert_eq!(got.tiles, words(&want["tiles"]));
    }
}

#[test]
fn mini_puzzles_match_kotlin() {
    let f = fixture();
    let m = &f["mini"];
    let all = words(&m["words"]);
    let targets = strs(&f["deck"]["targets"]);
    for c in m["cases"].as_array().unwrap() {
        let got = puzzles::mini_daily(all.clone(), st(&c["day"]), "en".into(), targets.clone()).unwrap();
        let want = &c["out"];
        assert_eq!(got.lang, st(&want["lang"]));
        assert_eq!(got.keys, strs(&want["keys"]));
        let entries: Vec<(GameWord, Vec<String>, i64, i64, bool, i64)> = want["entries"]
            .as_array()
            .unwrap()
            .iter()
            .map(|e| (word(&e["word"]), strs(&e["letters"]), i(&e["row"]), i(&e["col"]), e["across"].as_bool().unwrap(), i(&e["number"])))
            .collect();
        let got_entries: Vec<_> = got.entries.into_iter().map(|e| (e.word, e.letters, e.row as i64, e.col as i64, e.across, e.number as i64)).collect();
        assert_eq!(got_entries, entries);
    }
}
