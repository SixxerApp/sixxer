import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const publicDir = path.resolve(".output/public");
const ssrEntry = path.resolve(".output/server/_ssr/index.mjs");

async function renderRoute(routePath) {
  const ssrModule = await import(pathToFileURL(ssrEntry).href);
  const response = await ssrModule.default.fetch(new Request(`http://sixxer.local${routePath}`));

  if (!response.ok) {
    throw new Error(`Could not render ${routePath}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function writeCapacitorEntry() {
  const [indexHtml, notFoundHtml] = await Promise.all([renderRoute("/"), renderRoute("/")]);

  await Promise.all([
    fs.writeFile(path.join(publicDir, "index.html"), indexHtml, "utf8"),
    fs.writeFile(path.join(publicDir, "404.html"), notFoundHtml, "utf8"),
  ]);

  console.log("Wrote Capacitor SSR entry: .output/public/index.html");
}

await writeCapacitorEntry();
