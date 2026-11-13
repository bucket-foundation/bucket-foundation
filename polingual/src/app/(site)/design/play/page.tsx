import { SCREENS } from "./screens";
import { FRIENDS, ME } from "./mock";
import { Avatar } from "../../play-kit/parts";
import s from "./design.module.css";

const LOOKS = [ME.look, ...FRIENDS.map((f) => f.look)];

export default function DesignIndex() {
  return (
    <main className={s.main}>
      <p className={s.label}>Design mockups, dev only</p>
      <h1 className={s.title}>Polingual Play</h1>
      <p className={s.muted}>Spec: docs/internal/polingual/PLAY-DESIGN.md. Mock data throughout.</p>
      <div className={s.index}>
        {SCREENS.map((x, i) => (
          <a key={x.href} href={x.href} className={`${s.card} ${s.pop}`}>
            <div className={s.row}>
              <Avatar look={LOOKS[i % LOOKS.length]} size={56} />
              <div>
                <h2>{x.name}</h2>
                <p className={s.muted}>{x.blurb}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
