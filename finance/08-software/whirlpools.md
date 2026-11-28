# whirlpools

https://github.com/orca-so/whirlpools. License Orca License (Apache-2.0 until 2025-02-26, then non-commercial terms with a consent requirement for commercial use). Stars 570. Last push 2026-11-03. TypeScript, Rust. Checked 2026-11-27.

## Architecture
Monorepo. `programs/whirlpool` is the on-chain Solana program (Anchor, with a `pinocchio` entrypoint). Clients: `rust-sdk` (`client`, `core`, `whirlpool`), `ts-sdk`, `legacy-sdk` with a `cli`, plus `examples/`.

## Data Layer
On-chain account state: pools, tick arrays, positions, fee tiers, reward vaults. Read through RPC and the generated client from `idl/`.

## Event Loop
None in the program. The example `whirlpool_repositioning_bot` polls the RPC in a tokio loop.

## Execution
Concentrated liquidity AMM. Instructions in `instructions/`: `swap`, `two_hop_swap`, open and close position, increase and decrease liquidity, collect fees and rewards, adaptive fee, lock position.

## Risk
Program-side checks in `auth/` and `security.rs`. The repositioning bot closes and reopens a position when price leaves its range.

## Strategies Shipped
`examples/rust-sdk/whirlpool_repositioning_bot`: keeps an LP position centered on the current price using `open_position_instructions` and `close_position_instructions`.

## AI Components
None.

## Connectors
Solana RPC. Whirlpool pools of Orca.

## Fit
Reference for on-chain concentrated liquidity and LP range management on Solana. Commercial use needs Orca consent, so treat it as read-only study material.
