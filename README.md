# html-no-dom-selector

> CSS-flavoured element picking **directly from raw HTML strings** – no DOM, no heavy parser, just regex-powered speed (4-5ms max for most uses cases).

---

## ✨ Features
| capability | example selector | notes |
|------------|-----------------|-------|
| **Tag pick** | `<div` or `<*` | start your selector with `<tagName` or `<*` for a wildcard. |
| **ID match** | `#main-nav` | can be chained right after the tag token. |
| **Multiple classes** | `.menu.level-1.active` | each dot adds a required class (order matters). |
| **Attribute presence** | `[data-status]` | any attr name works. |
| **Attribute exact value** | `[data-role="main"]` | double or single quotes required. |
| **Nameless value** | `["home"]` | matches *any* attribute whose value is `"home"`. |
| **Two exploration modes** | `{ explorationMode: "nested" \| "flat" }` | `"nested"` (default) dives into children; `"flat"` stops after the closing tag of the first hit. |

---

## 🚧 Limitations
* Only **mono-selectors** (everything in a single token stream).  
  *No descendant / child / sibling combinators across separate selectors* – `'<nav > li.menu-item'` **won’t work**.
* No pseudo-classes or pseudo-elements (`:nth-child`, `::before`, …).
