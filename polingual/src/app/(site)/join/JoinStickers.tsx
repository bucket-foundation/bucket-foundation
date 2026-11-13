import { Sticker } from "@/ui";
import styles from "../live/stoa.module.css";

export default function JoinStickers() {
  return (
    <div className={styles.playStickers} aria-hidden="true">
      <Sticker name="ticket" x="-18px" y="70px" size={120} rotate={-8} />
      <Sticker name="seal" side="right" x="-10px" y="64px" size={64} rotate={10} />
      <Sticker name="kente" side="right" anchor="bottom" x="-30px" y="40px" size={150} rotate={-12} />
      <Sticker name="pebble" anchor="bottom" x="-10px" y="60px" size={60} rotate={14} />
      <div className={styles.wideStickers}>
        <Sticker name="azulejo" x="16%" y="30%" size={150} rotate={-8} />
        <Sticker name="script-ko" side="right" x="20%" y="40%" size={64} shadow={false} />
        <Sticker name="torn-label" x="14%" y="62%" size={170} rotate={6} />
      </div>
    </div>
  );
}
