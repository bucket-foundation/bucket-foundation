# Polingual Desktop

Tauri 2 shell for polingual.com. Menu: Play, Watch, Learn, Reload, Quit. Links: `polingual://learn`, `polingual://play/video`.

Builds are unsigned and ship no updater. Install new versions by hand.

## Linux

```bash
sudo dnf install webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel openssl-devel libxdo-devel rpm-build
bun install
NO_STRIP=true bunx tauri build --bundles deb,rpm,appimage
```

## Windows

On a Windows host with the Rust MSVC toolchain and WiX 3:

```powershell
bun install
bunx tauri build --bundles msi
```

From Linux, `cargo-xwin` cross-compiles the exe and an NSIS installer. WiX runs on Windows only, so the .msi needs a Windows host.

```bash
rustup target add x86_64-pc-windows-msvc
cargo install --locked cargo-xwin
sudo dnf install clang lld llvm nsis
bunx tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc --bundles nsis
```

## macOS

```bash
bun install
bunx tauri build --bundles app,dmg
```

## Icons

`bun run icons` regenerates `src-tauri/icons` from `polingual/public/brand/kit/app-icon-1024.png`.
