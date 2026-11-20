#!/usr/bin/env node
/**
 * One-off helper: downloads the CURRENT shop-item icons from deadlock.gs into
 * public/item-icons/.
 *
 * Run it once, and again only after a game update:   npm run icons:sync
 * It makes 1 page request + at most ~170 small image requests, spaced out.
 * Please keep it that way (https://deadlock.gs/terms/ asks not to scrape at high volume).
 * Item artwork belongs to Valve; credit is shown in the site footer.
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "item-icons");
const sourcesFile = join(root, "scripts", "item-icons.sources.json");
const USER_AGENT = "deadlocktracker-icon-sync (small personal project; one-off sync)";
const DELAY_MS = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const exists = (path) => access(path).then(() => true, () => false);

/** Extracts { slug -> image url } from the deadlock.gs items page HTML. */
export function parseItems(html) {
  const found = new Map();
  for (const match of html.matchAll(/<a\b[^>]*href="\/items\/([a-z0-9-]+)\/"[^>]*>([\s\S]*?)<\/a>/g)) {
    const image = match[2].match(/https:\/\/cdn\.source\.gs\/deadlock\/img\/item-upgrade-[^"'\s)<>]+?\.webp/);
    if (image && !found.has(match[1])) found.set(match[1], image[0]);
  }
  return found;
}

async function main() {
  const page = await fetch("https://deadlock.gs/items/", { headers: { "User-Agent": USER_AGENT } });
  if (!page.ok) throw new Error(`deadlock.gs answered ${page.status}`);
  const found = parseItems(await page.text());
  if (found.size < 100) throw new Error(`Only ${found.size} icons found - the page layout probably changed. Aborting.`);

  await mkdir(outDir, { recursive: true });
  const sources = (await exists(sourcesFile)) ? JSON.parse(await readFile(sourcesFile, "utf8")) : {};
  let downloaded = 0;
  const ok = [];

  for (const [slug, url] of found) {
    const file = join(outDir, `${slug}.webp`);
    if (sources[slug] === url && (await exists(file))) {
      ok.push(slug);
      continue; // unchanged since the last sync
    }
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) {
      console.warn(`skipped ${slug}: HTTP ${response.status}`);
      continue;
    }
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
    sources[slug] = url;
    ok.push(slug);
    downloaded++;
    await sleep(DELAY_MS);
  }

  ok.sort();
  await writeFile(sourcesFile, JSON.stringify(sources, null, 2) + "\n");
  console.log(`Done. ${ok.length} icons available (${downloaded} downloaded this run).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
