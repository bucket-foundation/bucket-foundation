import { Art } from "@/ui/art";
import styles from "../live/stoa.module.css";

export default function JoinStickers() {
  return (
    <div className={styles.playStickers} aria-hidden="true">
      <span style={{ left: "-18px", top: "70px", rotate: "-8deg" }}><Art name="ticket" size={120} shadow /></span>
      <span style={{ right: "-10px", top: "64px", rotate: "10deg" }}><Art name="seal" size={64} shadow /></span>
      <span style={{ right: "-30px", bottom: "40px", rotate: "-18deg" }}><Art name="kente" size={150} shadow /></span>
      <span style={{ left: "-10px", bottom: "60px", rotate: "14deg" }}><Art name="pebble" size={60} shadow /></span>
    </div>
  );
}
