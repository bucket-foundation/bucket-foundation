pub const ZERO_SEED: u64 = 0x9E37_79B9_7F4A_7C15;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Rng {
    pub state: u64,
}

impl Rng {
    pub fn new(seed: u64) -> Self {
        Rng { state: if seed == 0 { ZERO_SEED } else { seed } }
    }

    pub fn resume(state: u64) -> Self {
        Rng { state }
    }

    pub fn next_u64(&mut self) -> u64 {
        self.state ^= self.state << 13;
        self.state ^= self.state >> 7;
        self.state ^= self.state << 17;
        self.state
    }

    pub fn below(&mut self, upper: usize) -> usize {
        let bound = upper as u64;
        let mut m = (self.next_u64() as u128) * (bound as u128);
        if (m as u64) < bound {
            let threshold = bound.wrapping_neg() % bound;
            while (m as u64) < threshold {
                m = (self.next_u64() as u128) * (bound as u128);
            }
        }
        (m >> 64) as usize
    }

    pub fn element<'a, T>(&mut self, xs: &'a [T]) -> Option<&'a T> {
        if xs.is_empty() {
            None
        } else {
            Some(&xs[self.below(xs.len())])
        }
    }

    pub fn shuffled<T: Clone>(&mut self, xs: &[T]) -> Vec<T> {
        let mut a = xs.to_vec();
        let mut amount = a.len();
        let mut current = 0;
        while amount > 1 {
            let r = self.below(amount);
            amount -= 1;
            a.swap(current, current + r);
            current += 1;
        }
        a
    }
}

pub fn mixed<T: Clone>(xs: &[T], rng: &mut Rng) -> Vec<T> {
    let mut a = xs.to_vec();
    let mut i = a.len();
    while i > 1 {
        i -= 1;
        let j = (rng.next_u64() % (i as u64 + 1)) as usize;
        a.swap(i, j);
    }
    a
}

pub fn hash(text: &str) -> u64 {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for b in text.bytes() {
        h ^= b as u64;
        h = h.wrapping_mul(0x0000_0100_0000_01b3);
    }
    h
}

pub fn sorted_join(targets: &[String]) -> String {
    let mut t = targets.to_vec();
    t.sort();
    t.join(",")
}

pub fn daily_seed(day: &str, root: &str, targets: &[String]) -> u64 {
    hash(&format!("{day}|{root}|{}", sorted_join(targets)))
}
