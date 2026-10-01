import { parentGone } from "../../src/parent";

console.log(`ready ${process.pid}`);
const timer = setInterval(() => {}, 1000);
await parentGone(process.env, () => Bun.stdin.stream());
clearInterval(timer);
console.log("parent gone");
process.exit(0);
