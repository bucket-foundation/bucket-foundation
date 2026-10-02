import { directBackend } from "../../src/core/backend";
import { DailyQuizStore } from "../../src/daily-quiz";
import { Store } from "../../src/store";
import { LEARN_ITEMS } from "./learn-items";

const [path, keyHex, count, label] = process.argv.slice(2);
const store = new Store(path, Buffer.from(keyHex, "hex"));
store.importPack("fixture", LEARN_ITEMS);
const b = directBackend({ store, content: {}, daily: new DailyQuizStore(store, Buffer.from(keyHex, "hex")), record: () => {}, seed: () => label });
let written = 0;
while (written < Number(count)) {
  for (const q of await b.quiz(4)) {
    if (written >= Number(count)) break;
    await b.answerQuiz(q.itemId, 0, 500);
    written++;
  }
}
store.close();
console.log(written);
