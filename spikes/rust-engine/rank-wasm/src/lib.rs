use bucket_rank_spike::{cosine_rank, cosine_rank_f32, lower, token_rank_lowered, Hit};
use std::cell::RefCell;

#[derive(Default)]
struct State {
    texts: Vec<String>,
    vecs: Vec<Vec<f32>>,
    ids: Vec<u32>,
    scores: Vec<f64>,
}

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
}

fn text_at(ptr: *const u8, len: usize) -> String {
    let bytes = unsafe { std::slice::from_raw_parts(ptr, len) };
    String::from_utf8_lossy(bytes).into_owned()
}

fn floats_at(ptr: *const u8, count: usize) -> Vec<f32> {
    let bytes = unsafe { std::slice::from_raw_parts(ptr, count * 4) };
    bytes.chunks_exact(4).map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]])).collect()
}

fn keep(hits: Vec<Hit>) -> u32 {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        s.ids = hits.iter().map(|h| h.0).collect();
        s.scores = hits.iter().map(|h| h.1).collect();
        hits.len() as u32
    })
}

#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    let mut buf = Vec::<u8>::with_capacity(len.max(1));
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

#[no_mangle]
pub extern "C" fn release(ptr: *mut u8, len: usize) {
    unsafe { drop(Vec::from_raw_parts(ptr, 0, len.max(1))) }
}

#[no_mangle]
pub extern "C" fn index_reset() {
    STATE.with(|s| *s.borrow_mut() = State::default());
}

#[no_mangle]
pub extern "C" fn index_push(text: *const u8, text_len: usize, vec: *const u8, vec_count: usize) {
    let lowered = lower(&text_at(text, text_len));
    let floats = floats_at(vec, vec_count);
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        s.texts.push(lowered);
        s.vecs.push(floats);
    });
}

#[no_mangle]
pub extern "C" fn token_rank(query: *const u8, query_len: usize, top_k: usize) -> u32 {
    let q = text_at(query, query_len);
    let hits = STATE.with(|s| token_rank_lowered(&s.borrow().texts, &q, top_k));
    keep(hits)
}

#[no_mangle]
pub extern "C" fn cosine_rank_q(query: *const u8, count: usize, top_k: usize, single: u32) -> u32 {
    let q = floats_at(query, count);
    let hits = STATE.with(|s| {
        let s = s.borrow();
        if single == 1 {
            cosine_rank_f32(&s.vecs, &q, top_k)
        } else {
            cosine_rank(&s.vecs, &q, top_k)
        }
    });
    keep(hits)
}

#[no_mangle]
pub extern "C" fn result_ids() -> *const u32 {
    STATE.with(|s| s.borrow().ids.as_ptr())
}

#[no_mangle]
pub extern "C" fn result_scores() -> *const f64 {
    STATE.with(|s| s.borrow().scores.as_ptr())
}
