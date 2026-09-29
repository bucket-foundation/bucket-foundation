#!/usr/bin/env bun
import React from "react";
import { render } from "ink";
import pack from "../content/pack.json" with { type: "json" };
import { App } from "./app";
import type { Pack } from "./pack/export";
import { dataDir, ensureDataDir, openSession, parseArgs, pickKeyring } from "./setup";

async function main(argv: string[]) {
  const { cmd, opts } = parseArgs(argv);
  const dir = ensureDataDir(dataDir());
  const session = await openSession(await pickKeyring(opts, dir), dir);
  const content = pack as Pack;
  const imported = session.store.importPack(content.version, content.items);
  try {
    if (cmd === "init" || cmd === "whoami") {
      console.log(
        JSON.stringify(
          {
            device: session.device.id,
            publicKey: session.device.publicKey,
            newDevice: session.device.created,
            keyring: session.keyring.kind,
            pack: content.version,
            imported,
            journal: session.store.journalMode(),
          },
          null,
          2,
        ),
      );
      return;
    }
    if (cmd === "stats") {
      console.log(JSON.stringify(session.store.stats(Date.now())));
      return;
    }
    if (cmd !== "tui") throw new Error(`unknown command ${cmd}; try tui, init, whoami, stats`);
    const ink = render(<App session={session} />);
    await ink.waitUntilExit();
  } finally {
    session.store.close();
  }
}

main(process.argv.slice(2)).catch((e) => {
  console.error(`bkt: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
