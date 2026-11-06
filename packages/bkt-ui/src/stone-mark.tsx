export const STONE_MARK_PATH = "M15 19H25C16 25 16 45 32 49C48 45 48 25 39 19H49";
const SLAB = "M10 5C24 2 44 3 55 7C61 15 62 40 58 54C47 61 20 62 8 57C2 44 2 18 10 5Z";

export function StoneMark() {
  return (
    <svg className="mark" viewBox="0 0 64 64" aria-hidden focusable="false">
      <defs>
        <radialGradient id="stone-mark-face" cx="0.3" cy="0.22" r="0.85">
          <stop offset="0" stopColor="#b3a796" />
          <stop offset="0.55" stopColor="#756b5f" />
          <stop offset="1" stopColor="#3f3932" />
        </radialGradient>
      </defs>
      <path d={SLAB} fill="#2a2622" transform="translate(0 3)" />
      <path d={SLAB} fill="url(#stone-mark-face)" />
      <path d="M12 8C24 5 42 6 52 9" fill="none" stroke="#ffffff55" strokeWidth="2" strokeLinecap="round" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6">
        <path d={STONE_MARK_PATH} stroke="#e8dfcd" strokeOpacity="0.55" transform="translate(1 1.6)" />
        <path d={STONE_MARK_PATH} stroke="#1a1714" />
        <path d={STONE_MARK_PATH} stroke="#f2bd47" strokeWidth="1.6" strokeOpacity="0.85" transform="translate(0.4 0.6)" />
      </g>
    </svg>
  );
}
