import { Database } from "bun:sqlite";
const [lib, file] = process.argv.slice(2);
try {
  Database.setCustomSQLite(lib);
  console.log("setCustomSQLite ok");
} catch (e) {
  console.log("setCustomSQLite failed", String(e));
}
const db = new Database(file);
db.run(`PRAGMA key = "x'2DD29CA851E7B56E4697B0E1F08507293D761A05CE4D1B628663F411A8086D99'"`);
console.log("cipher_version", db.query("PRAGMA cipher_version").get());
console.log("sqlite_version", db.query("select sqlite_version() v").get());
db.run("PRAGMA journal_mode=WAL");
db.run("create table if not exists t(a)");
db.run("insert into t values ('secret-plaintext')");
console.log(db.query("select count(*) n from t").get());
db.close();
