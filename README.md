# html-no-dom-selector

> CSS-flavoured element picking **directly from raw HTML strings** – no DOM, no heavy parser, just regex-powered speed (4–5ms for most use cases).

---

## ✨ Features
| Capability | Example selector | Notes |
|------------|------------------|-------|
| **Tag pick** | `<div` or `<*` | Can be anywhere in the selector, not necessarily at the start. |
| **ID match** | `#main-nav` | Selects elements by `id` attribute. |
| **Multiple classes** | `.menu.level-1.active` | Selects elements containing the `class`. |
| **Attribute presence** | `[data-status]` | Checks if attribute exists. |
| **Attribute exact value** | `[data-role="main"]` | Checks if attribute exists with specified value. |
| **Nameless value** | `["home"]` | Matches *any* attribute with value `"home"`. |
| **Two exploration modes** | `{ explorationMode: "nested" | "flat" }` | `"nested"` (default) dives into children; `"flat"` starts again after the previous element's closing tag. |

---

## 🧠 How it works (and why order matters)

html-no-dom-selector is **not a DOM parser** — it works directly on raw strings. It does this by scanning for an element **whose opening tag textually matches your selector**, left to right.

This means:
- The selector is interpreted **sequentially**: if it says `#main-nav.navigation`, it will look for `id="main-nav"` *before* checking for `class="navigation"`.
- The selector must match the element's attributes in the **same order as they appear in the source HTML**. If the tag is:
```html
<nav class="navigation">
```
Then a selector like `#main-nav.navigation` **will not match**, because it checks for `id="main-nav"` before encountering it in the actual HTML tag.  
To match successfully, the selector must follow the same order:

```js
selectFirst(html, '.navigation#main-nav');
```

This design is **intentional**, because it allows the engine to stream and bail fast on the first mismatch — keeping it very performant even on large raw fragments.

---

## ✅ Flexibility: `<tagName` doesn’t have to be first

You can place the `<div`, `<a`, or `<*` tag name match **anywhere** in the selector — not necessarily at the start.

For example:
```js
selectFirst(html, '[data-section-id="intro"]<section');
selectFirst(html, '.sticky<header');
selectFirst(html, '#main-nav<nav');
```

This is especially useful when targeting elements by class/ID and only using `<tagName` to narrow ambiguity.

---

## 🚧 Limitations
* Only **mono-selectors** (everything in a single token stream).  
  *No descendant / child / sibling combinators across separate selectors* – `'<nav > li.menu-item'` **won’t work**.
* No pseudo-classes or pseudo-elements (`:nth-child`, `::before`, …).
