import { FROZEN_AT } from "./frozen-at";

const started = Date.now();
const real = Date.now.bind(Date);
Date.now = () => FROZEN_AT.getTime() + (real() - started);
