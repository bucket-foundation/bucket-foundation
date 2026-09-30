import type { CameraPose } from "../explore/frame";

export interface SharedCamera {
  pose: CameraPose | null;
  locked: boolean;
}

const shared: SharedCamera = { pose: null, locked: true };

export function readSharedCamera(): SharedCamera {
  return { pose: shared.pose ? { position: [...shared.pose.position], target: [...shared.pose.target], fov: shared.pose.fov } : null, locked: shared.locked };
}

export function writeSharedCamera(pose: CameraPose, locked: boolean): void {
  shared.pose = { position: [...pose.position], target: [...pose.target], fov: pose.fov };
  shared.locked = locked;
}

export function resetSharedCamera(): void {
  shared.pose = null;
  shared.locked = true;
}
