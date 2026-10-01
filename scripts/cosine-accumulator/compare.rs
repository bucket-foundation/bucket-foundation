use std::env;
use std::fs;
use std::process::exit;

fn main() {
    let path = env::args().nth(1).unwrap_or_else(|| "pairs.bin".to_string());
    let bytes = fs::read(&path).expect("read pairs file");
    let pairs = u32::from_le_bytes(bytes[0..4].try_into().unwrap()) as usize;
    let dim = u32::from_le_bytes(bytes[4..8].try_into().unwrap()) as usize;
    let vectors: Vec<f32> = bytes[8..8 + pairs * dim * 2 * 4]
        .chunks_exact(4)
        .map(|c| f32::from_le_bytes(c.try_into().unwrap()))
        .collect();
    let dots: Vec<f64> = bytes[8 + pairs * dim * 2 * 4..]
        .chunks_exact(8)
        .map(|c| f64::from_le_bytes(c.try_into().unwrap()))
        .collect();
    assert_eq!(dots.len(), pairs);

    let mut f64_equal = 0usize;
    let mut f32_equal = 0usize;
    for p in 0..pairs {
        let q = &vectors[p * 2 * dim..p * 2 * dim + dim];
        let v = &vectors[p * 2 * dim + dim..(p + 1) * 2 * dim];
        let mut wide = 0f64;
        let mut narrow = 0f32;
        for j in 0..dim {
            wide += q[j] as f64 * v[j] as f64;
            narrow += q[j] * v[j];
        }
        if wide.to_bits() == dots[p].to_bits() {
            f64_equal += 1;
        }
        if (narrow as f64).to_bits() == dots[p].to_bits() {
            f32_equal += 1;
        }
    }
    println!("pairs={pairs} dim={dim} f64_bit_equal={f64_equal} f32_bit_equal={f32_equal}");
    if f64_equal != pairs {
        exit(1);
    }
}
