import styles from "./play.module.css";
import spy from "./ispy/ispy.module.css";

export function TilesHold() {
  return (
    <div className={styles.tilesWrap} aria-busy="true" data-testid="tiles-loading">
      <div className={styles.tilesPrompt} />
      <div className={styles.lanes} />
    </div>
  );
}

export function SceneHold() {
  return <div className={spy.scene} aria-busy="true" data-testid="scene-loading" />;
}
