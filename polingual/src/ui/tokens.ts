import tokens from "./tokens.json";

export { tokens };
export type ColorToken = keyof typeof tokens.color;
export type TypeToken = keyof typeof tokens.type;

export const color = (name: ColorToken) => `var(--pl-${name})`;
export const type = (name: TypeToken) => `var(--pl-type-${name})`;
