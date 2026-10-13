use core::cmp::Ordering;

pub type Hit = (u32, f64);

pub fn lower(s: &str) -> String {
    s.to_lowercase()
}

fn is_query_byte(b: u8) -> bool {
    b.is_ascii_lowercase() || b.is_ascii_digit()
}

fn is_word_byte(b: u8) -> bool {
    b.is_ascii_alphanumeric() || b == b'_'
}

pub fn query_words(query: &str) -> Vec<String> {
    let lowered = lower(query);
    let mut words: Vec<String> = Vec::new();
    for part in lowered.as_bytes().split(|b| !is_query_byte(*b)) {
        if part.len() < 3 {
            continue;
        }
        let word = String::from_utf8_lossy(part).into_owned();
        if !words.contains(&word) {
            words.push(word);
        }
    }
    words
}

pub fn count_word(text: &[u8], word: &[u8]) -> u32 {
    if word.is_empty() || text.len() < word.len() {
        return 0;
    }
    let mut count = 0;
    let last = text.len() - word.len();
    let mut i = 0;
    while i <= last {
        if &text[i..i + word.len()] == word {
            let before = i == 0 || !is_word_byte(text[i - 1]);
            let end = i + word.len();
            let after = end == text.len() || !is_word_byte(text[end]);
            if before && after {
                count += 1;
                i = end;
                continue;
            }
        }
        i += 1;
    }
    count
}

fn descending(a: f64, b: f64) -> Ordering {
    let d = b - a;
    if d < 0.0 {
        Ordering::Less
    } else if d > 0.0 {
        Ordering::Greater
    } else {
        Ordering::Equal
    }
}

fn top(mut hits: Vec<Hit>, top_k: usize) -> Vec<Hit> {
    hits.sort_by(|a, b| descending(a.1, b.1));
    hits.truncate(top_k);
    hits
}

pub fn token_rank_lowered<T: AsRef<str>>(lowered_texts: &[T], query: &str, top_k: usize) -> Vec<Hit> {
    let words = query_words(query);
    if words.is_empty() {
        return Vec::new();
    }
    let hits = lowered_texts
        .iter()
        .enumerate()
        .map(|(i, text)| {
            let bytes = text.as_ref().as_bytes();
            let score: u32 = words.iter().map(|w| count_word(bytes, w.as_bytes())).sum();
            (i as u32, score as f64)
        })
        .collect();
    top(hits, top_k)
}

pub fn token_rank<T: AsRef<str>>(texts: &[T], query: &str, top_k: usize) -> Vec<Hit> {
    let lowered: Vec<String> = texts.iter().map(|t| lower(t.as_ref())).collect();
    token_rank_lowered(&lowered, query, top_k)
}

pub fn dot_f64(q: &[f32], v: &[f32]) -> f64 {
    let mut s = 0.0f64;
    for (j, x) in q.iter().enumerate() {
        let y = v.get(j).map(|y| *y as f64).unwrap_or(f64::NAN);
        s += (*x as f64) * y;
    }
    s
}

pub fn dot_f32(q: &[f32], v: &[f32]) -> f32 {
    let mut s = 0.0f32;
    for (j, x) in q.iter().enumerate() {
        let y = v.get(j).copied().unwrap_or(f32::NAN);
        s += *x * y;
    }
    s
}

pub fn cosine_rank<V: AsRef<[f32]>>(vecs: &[V], q: &[f32], top_k: usize) -> Vec<Hit> {
    let hits = vecs.iter().enumerate().map(|(i, v)| (i as u32, dot_f64(q, v.as_ref()))).collect();
    top(hits, top_k)
}

pub fn cosine_rank_f32<V: AsRef<[f32]>>(vecs: &[V], q: &[f32], top_k: usize) -> Vec<Hit> {
    let hits = vecs.iter().enumerate().map(|(i, v)| (i as u32, dot_f32(q, v.as_ref()) as f64)).collect();
    top(hits, top_k)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_ascii_bounded_words() {
        assert_eq!(count_word(b"light, light_x light", b"light"), 2);
        assert_eq!(count_word("\u{e9}nergie nergie".as_bytes(), b"nergie"), 2);
    }

    #[test]
    fn query_words_dedupe_and_drop_short() {
        assert_eq!(query_words("The of LIGHT light x1 dna"), vec!["the", "light", "dna"]);
    }

    #[test]
    fn ties_keep_index_order() {
        let hits = token_rank(&["zzz", "abc abc", "abc", "abc"], "abc", 4);
        assert_eq!(hits, vec![(1, 2.0), (2, 1.0), (3, 1.0), (0, 0.0)]);
    }
}
