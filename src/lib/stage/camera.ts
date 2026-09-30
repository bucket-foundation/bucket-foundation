import { homeCamera, type CameraPose } from "../explore/frame";

export interface LockState {
  locked: boolean;
}

export type LockEvent = "orbit" | "home" | "mode";

export const INITIAL_LOCK: LockState = { locked: true };

export function lockReducer(state: LockState, event: LockEvent): LockState {
  if (event === "orbit") return state.locked ? { locked: false } : state;
  if (event === "home") return state.locked ? state : { locked: true };
  return state;
}

export function poseFor(state: LockState, current: CameraPose): CameraPose {
  return state.locked ? homeCamera() : current;
}
