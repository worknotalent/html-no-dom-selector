/**
 * Simple playground for the html-no-dom-selector library.
 *
 * Run with:  node test/playground.js
 * (project root must contain package.json with `"type": "module"`)
 */

import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

// --- resolve paths ---------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const htmlPath   = path.join(__dirname, "html-no-dom-selector.test.html");
const libPath    = path.join(__dirname, "..", "src", "html-no-dom-selector.js");

// dynamic import so the script still works if you move things around
const { selectAll, selectFirst } = await import(path.toNamespacedPath(libPath));

// --- load the HTML fixture -------------------------------------------------
const rawHtml = fs.readFileSync(htmlPath, "utf8");

// helper to log results nicely
const pretty = (elt) =>
  elt
    ? {
        tag   : elt.metadata.tagName,
        attrs : elt.metadata.attrs,
        inner : (elt.innerHTML.length > 60
                 ? elt.innerHTML.slice(0, 57) + "..."
                 : elt.innerHTML),
      }
    : null;

// ---------------------------------------------------------------------------
//  playground queries – tweak, add, remove as you like
// ---------------------------------------------------------------------------

console.log("▶︎ Demo 1 – first <nav> with id and class");
console.log(
  pretty(
    selectFirst(
      rawHtml,
      "<nav#main-nav.navigation"
    )
  )
);

console.log("\n▶︎ Demo 2 – all <li> items that carry the .menu-item class");
console.log(
  selectAll(
    rawHtml,
    "<li.menu-item",
    { explorationMode: "flat" }           // try "nested" vs "flat"
  ).map(pretty)
);

console.log("\n▶︎ Demo 3 – any tag having attribute data-section-id=\"features\"");
console.log(
  pretty(
    selectFirst(
      rawHtml,
      '<* [data-section-id="features"]'
    )
  )
);

console.log("\n▶︎ Demo 4 – nameless attribute value match [\"home\"]");
console.log(
  pretty(
    selectFirst(
      rawHtml,
      '["home"]'
    )
  )
);

console.log("\n▶︎ Demo 5 – wildcard tag with specific classes");
console.log(
  pretty(
    selectFirst(
      rawHtml,
      "<* .feature-item.highlighted"
    )
  )
);

console.log("\n✅  End of playground – edit me and rerun to experiment!\n");
