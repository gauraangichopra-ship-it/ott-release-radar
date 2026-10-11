// npm run radar            -> preview this week's digest in the terminal (sends nothing)
// npm run radar -- --send  -> run it for real (sends to Telegram)
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

async function main() {
  const { runRadar } = await import("../src/lib/pipeline");
  const { runItems, getRun } = await import("../src/lib/queries");
  const { buildDigest } = await import("../src/lib/digest");
  const t0 = Date.now();
  const r = await runRadar(process.argv.includes("--send") ? "manual" : "preview");
  const run = await getRun(r.runId);
  const items = await runItems(r.runId);
  console.log(`run ${r.runId}: ${r.status} in ${((Date.now() - t0) / 1000).toFixed(1)}s`, r.error ?? "");
  console.log(run);
  for (const c of buildDigest(items, run!.window_start, run!.window_end, ["Netflix", "Prime Video", "JioHotstar"])) {
    console.log("\n──── message (" + c.html.length + " chars) ────\n" + c.html.replace(/<[^>]+>/g, ""));
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
