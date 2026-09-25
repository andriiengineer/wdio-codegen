// src/locator-engine.js
var TEST_ID_ATTRS = ["data-testid", "data-test", "data-cy", "data-pw", "test-id"];
var INTERACTIVE_TAGS = /* @__PURE__ */ new Set(["button", "a", "h1", "h2", "h3", "h4", "h5", "h6", "th", "label", "option", "li"]);
var DYNAMIC_TEXT_RE = /^[\d\s$€£¥,.%+\-()\/:]+$|(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/;
var GENERATED_ID_PREFIX_RE = /^(mui-|radix-|headlessui-|react-select-|floating-ui-|popper-|rc-|ant-|el-|ember|__next-|__relay-)/i;
function cssAttr(value) {
  return String(value).replace(/["\\]/g, "\\$&").replace(/[\n\r\f]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `);
}
function idSelector(id) {
  return /^-?[A-Za-z_][\w-]*$/.test(id) ? `#${id}` : `[id="${cssAttr(id)}"]`;
}
function isWdioImageSelector(selector) {
  return /\.(jpe?g|gif|png|bmp|svg)$/i.test(selector);
}
function isWdioSafeValue(value) {
  return !value.includes('"') && !isWdioImageSelector(value);
}
function wdioXPathBranches(locator) {
  if (locator.startsWith("aria/")) {
    const l = locator.slice("aria/".length);
    return [
      `.//*[@aria-labelledby=(//*[normalize-space(text()) = "${l}"]/@id)]`,
      `.//*[@aria-describedby=(//*[normalize-space(text()) = "${l}"]/@id)]`,
      `.//*[@aria-label = "${l}"]`,
      `.//input[@id = (//label[normalize-space() = "${l}"]/@for)]`,
      `.//textarea[@id = (//label[normalize-space() = "${l}"]/@for)]`,
      `.//input[ancestor::label[normalize-space(text()) = "${l}"]]`,
      `.//textarea[ancestor::label[normalize-space(text()) = "${l}"]]`,
      `.//input[@placeholder="${l}"]`,
      `.//textarea[@placeholder="${l}"]`,
      `.//input[@aria-placeholder="${l}"]`,
      `.//textarea[@aria-placeholder="${l}"]`,
      `.//*[not(self::label)][@title="${l}"]`,
      `.//img[@alt="${l}"]`,
      `.//*[not(self::label)][normalize-space(text()) = "${l}"]`
    ];
  }
  const m = locator.match(/^(\w+)=(.+)$/);
  if (!m) return null;
  const [, tag, text] = m;
  const own = `.//${tag}[normalize-space(text()) = "${text}"]`;
  return [own, `.//${tag}[not(${own}) and normalize-space() = "${text}"]`];
}
function isGeneratedId(id) {
  if (!id) return false;
  if (id.includes(":")) return true;
  if (GENERATED_ID_PREFIX_RE.test(id)) return true;
  if (/^\d+$/.test(id)) return true;
  if (/[-_]\d{3,}$/.test(id)) return true;
  return false;
}
function getLocatorCandidates(info, testIdAttrs = TEST_ID_ATTRS) {
  const { tag, text, ariaLabel, id, idUnique, attrs = {}, xpath } = info;
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  function add(locator, warn, label) {
    if (!locator || seen.has(locator)) return;
    seen.add(locator);
    candidates.push({ locator, warn, label });
  }
  for (const attr of testIdAttrs) {
    if (attrs[attr]) add(`[${attr}="${cssAttr(attrs[attr])}"]`, false, `test-id (${attr})`);
  }
  if (id && idUnique && !isGeneratedId(id)) add(idSelector(id), false, "#id");
  if (ariaLabel && isWdioSafeValue(ariaLabel)) add(`aria/${ariaLabel}`, false, "aria-label");
  if (attrs.placeholder) add(`${tag}[placeholder="${cssAttr(attrs.placeholder)}"]`, false, "placeholder");
  if (tag === "img" && attrs.alt) add(`img[alt="${cssAttr(attrs.alt)}"]`, false, "alt");
  if (attrs.name) {
    if (tag === "input" && attrs.type === "radio" && attrs.value) {
      add(`input[name="${cssAttr(attrs.name)}"][value="${cssAttr(attrs.value)}"]`, false, "name+value");
    } else {
      add(`${tag}[name="${cssAttr(attrs.name)}"]`, false, "name");
    }
  }
  if (tag === "input" && ["submit", "button", "reset"].includes(attrs.type) && attrs.value) {
    add(`input[type="${attrs.type}"][value="${cssAttr(attrs.value)}"]`, false, "value");
  }
  const trimmed = (text || "").trim();
  if (trimmed.length > 0 && trimmed.length <= 40 && INTERACTIVE_TAGS.has(tag) && !DYNAMIC_TEXT_RE.test(trimmed) && !/[\\\x00-\x1F<>]/.test(trimmed) && isWdioSafeValue(trimmed)) {
    add(`${tag}=${trimmed}`, false, "text");
  }
  if (attrs.role) add(`[role="${cssAttr(attrs.role)}"]`, true, "role");
  if (attrs.type) add(`${tag}[type="${cssAttr(attrs.type)}"]`, true, "type");
  if (attrs.href) add(`a[href="${cssAttr(attrs.href)}"]`, true, "href (fragile)");
  if (xpath) add(xpath, true, "xpath");
  return candidates;
}

// src/class-filter.js
var TAILWIND_SINGLES = /* @__PURE__ */ new Set([
  // Display
  "flex",
  "grid",
  "block",
  "inline",
  "hidden",
  "contents",
  "table",
  "list-item",
  "inline-block",
  "inline-flex",
  "inline-grid",
  "inline-table",
  "flow-root",
  // Position
  "relative",
  "absolute",
  "fixed",
  "sticky",
  "static",
  // Visibility
  "visible",
  "invisible",
  "collapse",
  // Typography
  "container",
  "truncate",
  "antialiased",
  "subpixel-antialiased",
  "italic",
  "not-italic",
  "underline",
  "no-underline",
  "line-through",
  "overline",
  "uppercase",
  "lowercase",
  "capitalize",
  "normal-case",
  // Accessibility
  "sr-only",
  "not-sr-only",
  // Interactivity
  "pointer-events-none",
  "pointer-events-auto",
  "resize",
  "resize-none",
  "resize-y",
  "resize-x",
  "appearance-none",
  "appearance-auto",
  "select-none",
  "select-all",
  "select-text",
  "select-auto",
  "cursor-pointer",
  "cursor-default",
  "cursor-text",
  "cursor-move",
  "cursor-not-allowed",
  "cursor-wait",
  "cursor-grab",
  "cursor-grabbing",
  // Object fit
  "object-cover",
  "object-contain",
  "object-fill",
  "object-none",
  "object-scale-down",
  // Float / Clear
  "float-right",
  "float-left",
  "float-none",
  "clear-left",
  "clear-right",
  "clear-both",
  "clear-none",
  "clearfix",
  // Misc
  "isolate",
  "isolation-auto",
  "whitespace-nowrap",
  "whitespace-pre",
  "whitespace-normal",
  "break-words",
  "break-all",
  "break-keep",
  "break-normal",
  "transform",
  "transform-none"
]);
function isUnstableClass(cls) {
  if (/^Mui[A-Z]/.test(cls)) return true;
  if (/^css-[a-z0-9]{3,}$/.test(cls)) return true;
  if (/^sc-[a-zA-Z0-9]+$/.test(cls)) return true;
  if (cls.startsWith("chakra-")) return true;
  if (/^mat-[a-z]/.test(cls)) return true;
  if (cls.includes(":")) return true;
  if (cls.includes("[")) return true;
  if (/^-?[mp][xytblr]?-/.test(cls)) return true;
  if (/^(min-|max-)?(w|h|size)-/.test(cls)) return true;
  if (/^(gap|space)(-[xy])?-/.test(cls)) return true;
  if (/^(bg|text|border|ring|from|to|via|fill|stroke|shadow|decoration|accent|caret|placeholder)-[a-z]+-\d{2,3}$/.test(cls)) return true;
  if (/^text-(xs|sm|base|lg|xl|\d+xl)$/.test(cls)) return true;
  if (/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|mono|sans|serif)$/.test(cls)) return true;
  if (/^flex-(row|col|wrap|nowrap|none|auto|initial|\d+)(-reverse)?$/.test(cls)) return true;
  if (/^grid-(cols|rows|flow|span)-/.test(cls)) return true;
  if (/^(col|row)-(span|start|end)-/.test(cls)) return true;
  if (/^(order|grow|shrink|basis)-/.test(cls)) return true;
  if (/^(inset|top|right|bottom|left|z)(-[a-z0-9]+)?-\d/.test(cls)) return true;
  if (/^overflow(-[xy])?-/.test(cls)) return true;
  if (/^rounded(-[a-z0-9]+)*$/.test(cls) && cls !== "rounded") return true;
  if (cls === "rounded") return true;
  if (/^shadow(-[a-z0-9]+)?$/.test(cls)) return true;
  if (/^ring(-[a-z0-9]+)?$/.test(cls)) return true;
  if (/^outline(-[a-z0-9]+)?$/.test(cls)) return true;
  if (cls === "border") return true;
  if (/^border-\d+$/.test(cls)) return true;
  if (/^border-(solid|dashed|dotted|double|hidden|none|collapse|separate)$/.test(cls)) return true;
  if (/^border-[tblrxy](-\d+)?$/.test(cls)) return true;
  if (/^(transition|duration|ease|delay|animate|scale|rotate|translate|skew|origin)(-[a-z0-9]+)?$/.test(cls)) return true;
  if (/^opacity-\d+$/.test(cls)) return true;
  if (/^(columns|aspect|scroll|snap|touch|will|place|self|justify|items|content)-/.test(cls)) return true;
  if (TAILWIND_SINGLES.has(cls)) return true;
  return false;
}

// src/recorder-modules/recorder-locator.js
var _SKIP_CLASS_RE = /^(active|selected|hover|focus|focused|disabled|hidden|visible|open|closed|loading|error|success|is-|has-|js-|ng-|v-|_)/;
function _bestCSSSegment(node) {
  const tag = node.tagName.toLowerCase();
  const stableCls = [...node.classList].filter(
    (c) => c.length > 2 && !_SKIP_CLASS_RE.test(c) && !/^\d/.test(c) && !isUnstableClass(c) && !isWdioImageSelector(`.${c}`)
  );
  if (stableCls.length > 0) return `${tag}.${CSS.escape(stableCls[0])}`;
  for (const a of TEST_ID_ATTRS) {
    const v = node.getAttribute(a);
    if (v) return `[${a}="${cssAttr(v)}"]`;
  }
  const al = node.getAttribute("aria-label");
  if (al) return `${tag}[aria-label="${cssAttr(al)}"]`;
  const parent = node.parentElement;
  if (parent) {
    const sameTag = [...parent.children].filter((c) => c.tagName === node.tagName);
    if (sameTag.length === 1) return tag;
    const pos = [...parent.children].indexOf(node) + 1;
    return `${tag}:nth-child(${pos})`;
  }
  return tag;
}
function _queryRoot(el) {
  const root = el.getRootNode();
  return root instanceof ShadowRoot ? root : document;
}
function _searchRoots() {
  const roots = [document];
  for (let i = 0; i < roots.length; i++) {
    for (const node of roots[i].querySelectorAll("*")) if (node.shadowRoot) roots.push(node.shadowRoot);
  }
  return roots;
}
var _roots = null;
var _LABEL_REF_RE = /^\.\/\/(\*|input|textarea)\[@([\w-]+) ?= ?\((.+)\/@(id|for)\)\]$/;
function _wdioXPath(locator) {
  const branches = wdioXPathBranches(locator);
  if (!branches) return null;
  return branches.flatMap((branch) => {
    const m = branch.match(_LABEL_REF_RE);
    if (!m) return [branch];
    const [, tag, attr, subQuery, refAttr] = m;
    const r = document.evaluate(`${subQuery}/@${refAttr}`, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const ids = Array.from({ length: r.snapshotLength }, (_, i) => r.snapshotItem(i).value);
    if (ids.some((id) => id.includes('"'))) return [branch];
    return ids.length ? [`.//${tag}[${ids.map((id) => `@${attr}="${id}"`).join(" or ")}]`] : [];
  }).join(" | ");
}
function _deepMatches(locator) {
  if (isWdioImageSelector(locator)) return [];
  const xpath = _wdioXPath(locator);
  const hits = [];
  for (const root of _roots ?? _searchRoots()) {
    if (!xpath) {
      hits.push(...root.querySelectorAll(locator));
      continue;
    }
    if (root !== document) continue;
    const r = document.evaluate(xpath, root, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < r.snapshotLength; i++) hits.push(r.snapshotItem(i));
  }
  return hits;
}
function _isUnique(locator) {
  try {
    return _deepMatches(locator).length === 1;
  } catch {
    return false;
  }
}
function _resolvesOnlyTo(locator, el) {
  try {
    const hits = _deepMatches(locator);
    return hits.length === 1 && hits[0] === el;
  } catch {
    return false;
  }
}
function _buildScopedCSS(anchorSelector, anchorEl, targetEl) {
  const segs = [];
  let node = targetEl;
  while (node && node !== anchorEl) {
    segs.unshift(_bestCSSSegment(node));
    node = node.parentElement;
  }
  if (!segs.length) return null;
  const candidates = [
    `${anchorSelector} ${segs.join(" > ")}`,
    // exact chain with >
    `${anchorSelector} ${segs.slice(-2).join(" > ")}`,
    // last 2 segments
    `${anchorSelector} ${segs[segs.length - 1]}`
    // just the leaf segment
  ];
  for (const c of candidates) {
    try {
      if (_isUnique(c)) return c;
    } catch {
    }
  }
  return `${anchorSelector} ${segs.join(" > ")}`;
}
function buildFallbackSelector(el) {
  const qRoot = _queryRoot(el);
  if (el.id && _isUnique(`#${CSS.escape(el.id)}`))
    return `#${CSS.escape(el.id)}`;
  let anchor = el.parentElement;
  let depth = 0;
  const docRoot = qRoot === document ? document.documentElement : qRoot;
  while (anchor && anchor !== docRoot && depth < 8) {
    let anchorSel = null;
    if (anchor.id && _isUnique(`#${CSS.escape(anchor.id)}`)) {
      anchorSel = `#${CSS.escape(anchor.id)}`;
    } else {
      for (const a of TEST_ID_ATTRS) {
        const v = anchor.getAttribute(a);
        if (v) {
          anchorSel = `[${a}="${cssAttr(v)}"]`;
          break;
        }
      }
    }
    if (anchorSel) {
      const css = _buildScopedCSS(anchorSel, anchor, el);
      if (css) return css;
    }
    anchor = anchor.parentElement;
    depth++;
  }
  const segs = [];
  let node = el;
  while (node && node.nodeType === Node.ELEMENT_NODE && node !== docRoot) {
    segs.unshift(_bestCSSSegment(node));
    node = node.parentElement;
  }
  return segs.join(" > ");
}
function extractInfo(el) {
  const tag = el.tagName.toLowerCase();
  const text = (el.innerText || el.textContent || "").trim().split("\n")[0].trim();
  let ariaLabel = el.getAttribute("aria-label") || "";
  if (!ariaLabel) {
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const root = _queryRoot(el);
      ariaLabel = labelledBy.trim().split(/\s+/).map((refId) => {
        const labelEl = root.querySelector(`#${CSS.escape(refId)}`);
        return labelEl ? labelEl.textContent.replace(/\s+/g, " ").trim() : "";
      }).filter(Boolean).join(" ");
    }
  }
  const id = el.id || "";
  const idUnique = id ? _isUnique(`[id="${cssAttr(id)}"]`) : false;
  const attrs = {};
  for (const attr of [...TEST_ID_ATTRS, "type", "name", "role", "href", "placeholder", "value"])
    if (el.hasAttribute(attr)) attrs[attr] = el.getAttribute(attr);
  if (tag === "img") attrs.alt = el.getAttribute("alt") || "";
  if (attrs.href) {
    if (attrs.href.startsWith("#")) {
      delete attrs.href;
    } else {
      try {
        const url = new URL(attrs.href, location.href);
        if (url.origin === location.origin) {
          attrs.href = url.pathname;
        } else {
          delete attrs.href;
        }
      } catch {
        delete attrs.href;
      }
    }
  }
  if (!ariaLabel && el.getAttribute("title")) ariaLabel = el.getAttribute("title").trim();
  if (["input", "textarea", "select"].includes(tag) && !ariaLabel) {
    let labelEl = el.labels && el.labels[0];
    if (!labelEl && el.id) labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (labelEl) ariaLabel = ariaLabel || labelEl.textContent.trim().replace(/\s+/g, " ");
  }
  const xpath = buildFallbackSelector(el);
  return { tag, text, ariaLabel, id, idUnique, attrs, xpath };
}
function getUniqueLocator(el, info) {
  _roots = _searchRoots();
  try {
    info ??= extractInfo(el);
    const candidates = getLocatorCandidates(info);
    const stable = candidates.filter((c) => !c.warn);
    for (const { locator } of stable) {
      if (_resolvesOnlyTo(locator, el)) return { locator, warn: false };
    }
    const cssBase = stable.find((c) => !wdioXPathBranches(c.locator))?.locator;
    const narrowed = cssBase && _narrow(cssBase, el);
    if (narrowed) return { locator: narrowed, warn: false };
    const weak = candidates.find((c) => c.warn && _resolvesOnlyTo(c.locator, el));
    return { locator: weak?.locator ?? info.xpath, warn: true };
  } finally {
    _roots = null;
  }
}
function _narrow(locator, el) {
  const classes = [...el.classList].filter((c) => !_SKIP_CLASS_RE.test(c) && c.length > 2 && !isUnstableClass(c));
  for (const cls of classes.slice(0, 4)) {
    const candidate = `${locator}.${CSS.escape(cls)}`;
    if (_resolvesOnlyTo(candidate, el)) return candidate;
  }
  if (classes.length >= 2) {
    const candidate = `${locator}${classes.slice(0, 2).map((c) => `.${CSS.escape(c)}`).join("")}`;
    if (_resolvesOnlyTo(candidate, el)) return candidate;
  }
  const ariaAttr = el.getAttribute("aria-label");
  if (ariaAttr) {
    const candidate = `[aria-label="${cssAttr(ariaAttr)}"]`;
    if (_resolvesOnlyTo(candidate, el)) return candidate;
  }
  let ancestor = el.parentElement;
  for (let depth = 0; ancestor && depth < 5; depth++, ancestor = ancestor.parentElement) {
    let ancLoc = null;
    if (ancestor.id && _isUnique(`#${CSS.escape(ancestor.id)}`)) {
      ancLoc = `#${CSS.escape(ancestor.id)}`;
    } else {
      for (const attr of TEST_ID_ATTRS) {
        const val = ancestor.getAttribute(attr);
        if (val) {
          ancLoc = `[${attr}="${cssAttr(val)}"]`;
          break;
        }
      }
    }
    if (ancLoc) {
      const candidate = `${ancLoc} ${locator}`;
      if (_resolvesOnlyTo(candidate, el)) return candidate;
    }
  }
  return null;
}

// src/recorder-modules/recorder-helpers.js
function getFrameSelector() {
  if (window === window.top) return "";
  const iframe = window.frameElement;
  if (!iframe) return "";
  if (iframe.id) return `#${CSS.escape(iframe.id)}`;
  if (iframe.name) return `iframe[name="${CSS.escape(iframe.name)}"]`;
  try {
    const rawSrc = iframe.getAttribute("src") || "";
    const url = new URL(rawSrc, window.parent.location.href);
    if (url.origin === window.parent.location.origin) {
      const normSrc = url.pathname + url.search;
      const allIframes = window.parent.document.querySelectorAll("iframe");
      const sameUrl = [...allIframes].filter((f) => {
        try {
          const fu = new URL(f.getAttribute("src") || "", window.parent.location.href);
          return fu.pathname + fu.search === normSrc;
        } catch {
          return false;
        }
      });
      if (sameUrl.length === 1) return `iframe[src="${normSrc}"]`;
    }
  } catch {
  }
  try {
    const parent = iframe.parentElement;
    if (parent) {
      const iframeSiblings = [...parent.children].filter((c) => c.tagName === "IFRAME");
      const pos = iframeSiblings.indexOf(iframe) + 1;
      if (pos > 0) return `iframe:nth-of-type(${pos})`;
    }
  } catch {
  }
  return "";
}
function resolveTextAssertLocator(el, locator, warn, text) {
  const textSelMatch = locator.match(/^(\w+)=(.+)$/);
  if (textSelMatch && textSelMatch[2] === text) {
    const infoNoText = extractInfo(el);
    infoNoText.text = "";
    return getUniqueLocator(el, infoNoText);
  }
  return { locator, warn };
}

// src/recorder-modules/recorder-controls.js
function attachDialogOverrides(send) {
  const _origAlert = window.alert;
  window.alert = function(msg) {
    send({ type: "dialog:alert", message: String(msg ?? ""), _warn: true });
    return _origAlert.call(this, msg);
  };
  const _origConfirm = window.confirm;
  window.confirm = function(msg) {
    const result = _origConfirm.call(this, msg);
    send({ type: result ? "dialog:accept" : "dialog:dismiss", message: String(msg ?? ""), _warn: true });
    return result;
  };
  const _origPrompt = window.prompt;
  window.prompt = function(msg, defaultValue) {
    if (window.__wdioRecorderInternal) return _origPrompt.call(this, msg, defaultValue);
    const result = _origPrompt.call(this, msg, defaultValue);
    if (result !== null) {
      send({ type: "dialog:prompt", message: String(msg ?? ""), value: result });
    } else {
      send({ type: "dialog:dismiss", message: String(msg ?? ""), _warn: false });
    }
    return result;
  };
}
function attachSPANavigation(send, flushInput, flushClick) {
  if (window !== window.top) return;
  const _origPushState = history.pushState.bind(history);
  history.pushState = function(...args) {
    flushInput();
    flushClick();
    _origPushState(...args);
    window.__wdioRecord?.(JSON.stringify({ type: "navigate", url: location.href }));
  };
  window.addEventListener("popstate", () => {
    flushInput();
    flushClick();
    window.__wdioRecord?.(JSON.stringify({ type: "navigate", url: location.href }));
  });
}

// src/recorder-modules/toolbar.js
function _btnStyle(bg, color) {
  return [
    `background:${bg}`,
    `color:${color}`,
    "border:none",
    "border-radius:4px",
    "padding:2px 6px",
    "cursor:pointer",
    "font:inherit",
    "font-size:11px",
    "line-height:1.4"
  ].join(";");
}
function createToolbar({ onPause, onResume, onClear, onPick, onAssertMode }) {
  if (window !== window.top) return _noopAPI();
  if (document.getElementById("__wdio_toolbar__")) return _noopAPI();
  const toolbar = document.createElement("div");
  toolbar.id = "__wdio_toolbar__";
  toolbar.style.cssText = [
    "position:fixed",
    "top:12px",
    "left:50%",
    "transform:translateX(-50%)",
    "z-index:2147483647",
    "display:flex",
    "align-items:center",
    "gap:6px",
    "padding:4px 10px",
    "background:rgba(15,15,25,0.85)",
    "border:1px solid rgba(255,255,255,0.12)",
    "border-radius:999px",
    "box-shadow:0 2px 12px rgba(0,0,0,.50)",
    'font:500 10px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    "color:#e2e8f0",
    "user-select:none",
    "pointer-events:all",
    "cursor:grab",
    "backdrop-filter:blur(8px)",
    "-webkit-backdrop-filter:blur(8px)"
  ].join(";");
  toolbar.onmouseenter = () => {
    toolbar.style.opacity = "1";
  };
  toolbar.onmouseleave = () => {
    toolbar.style.opacity = "0.85";
  };
  let _dragging = false;
  let _dragOffsetX = 0;
  let _dragOffsetY = 0;
  toolbar.addEventListener("mousedown", (e) => {
    if (e.target !== toolbar) return;
    _dragging = true;
    const rect = toolbar.getBoundingClientRect();
    _dragOffsetX = e.clientX - rect.left;
    _dragOffsetY = e.clientY - rect.top;
    toolbar.style.cursor = "grabbing";
    toolbar.style.transform = "";
    toolbar.style.left = rect.left + "px";
    toolbar.style.top = rect.top + "px";
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!_dragging) return;
    toolbar.style.left = e.clientX - _dragOffsetX + "px";
    toolbar.style.top = e.clientY - _dragOffsetY + "px";
  });
  document.addEventListener("mouseup", () => {
    if (!_dragging) return;
    _dragging = false;
    toolbar.style.cursor = "grab";
  });
  const dot = document.createElement("span");
  dot.id = "__wdio_toolbar_dot__";
  dot.style.cssText = "width:6px;height:6px;border-radius:50%;background:#ef4444;flex-shrink:0";
  toolbar.appendChild(dot);
  const counter = document.createElement("span");
  counter.id = "__wdio_toolbar_counter__";
  counter.style.cssText = "color:#94a3b8;font-size:10px;min-width:40px;text-align:center";
  counter.textContent = "0 steps";
  toolbar.appendChild(counter);
  const pauseBtn = document.createElement("button");
  pauseBtn.id = "__wdio_toolbar_pause__";
  pauseBtn.type = "button";
  pauseBtn.style.cssText = _btnStyle("transparent", "#e2e8f0");
  pauseBtn.textContent = "\u23F8";
  pauseBtn.onclick = (e) => {
    e.stopPropagation();
    const nowPaused = pauseBtn.textContent === "\u23F8";
    if (nowPaused) onPause();
    else onResume();
  };
  toolbar.appendChild(pauseBtn);
  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.style.cssText = _btnStyle("transparent", "#e2e8f0");
  clearBtn.textContent = "\u2715";
  clearBtn.onclick = (e) => {
    e.stopPropagation();
    onClear();
  };
  toolbar.appendChild(clearBtn);
  const hoverLocator = document.createElement("span");
  hoverLocator.id = "__wdio_hover_locator__";
  hoverLocator.style.cssText = [
    "font:10px monospace",
    "color:#38bdf8",
    "max-width:280px",
    "overflow:hidden",
    "text-overflow:ellipsis",
    "white-space:nowrap",
    "opacity:0.85",
    "padding:0 4px"
  ].join(";");
  hoverLocator.title = "Hovered element locator";
  toolbar.appendChild(hoverLocator);
  const sepLoc = document.createElement("span");
  sepLoc.style.cssText = "width:1px;height:12px;background:rgba(255,255,255,0.15);margin:0 2px;flex-shrink:0";
  toolbar.appendChild(sepLoc);
  const pickBtn = document.createElement("button");
  pickBtn.id = "__wdio_pick__";
  pickBtn.type = "button";
  pickBtn.title = "Pick locator";
  pickBtn.textContent = "\u{1F3AF}";
  pickBtn.style.cssText = "background:transparent;border:none;cursor:pointer;font:11px sans-serif;color:#94a3b8;padding:2px 4px;border-radius:3px";
  pickBtn.onclick = (e) => {
    e.stopPropagation();
    onPick();
  };
  toolbar.appendChild(pickBtn);
  const sep3 = document.createElement("span");
  sep3.style.cssText = "width:1px;height:12px;background:rgba(255,255,255,0.15);margin:0 2px;flex-shrink:0";
  toolbar.appendChild(sep3);
  const assertTextBtn = document.createElement("button");
  assertTextBtn.id = "__wdio_assert_text__";
  assertTextBtn.type = "button";
  assertTextBtn.title = "Assert text";
  assertTextBtn.textContent = "T";
  assertTextBtn.style.cssText = "background:transparent;border:none;cursor:pointer;font:700 10px monospace;color:#94a3b8;padding:2px 4px;border-radius:3px";
  assertTextBtn.onclick = (e) => {
    e.stopPropagation();
    onAssertMode("text");
  };
  toolbar.appendChild(assertTextBtn);
  const assertVisibleBtn = document.createElement("button");
  assertVisibleBtn.id = "__wdio_assert_visible__";
  assertVisibleBtn.type = "button";
  assertVisibleBtn.title = "Assert visible";
  assertVisibleBtn.textContent = "\u{1F441}";
  assertVisibleBtn.style.cssText = "background:transparent;border:none;cursor:pointer;font:10px sans-serif;color:#94a3b8;padding:2px 4px;border-radius:3px";
  assertVisibleBtn.onclick = (e) => {
    e.stopPropagation();
    onAssertMode("visible");
  };
  toolbar.appendChild(assertVisibleBtn);
  const assertValueBtn = document.createElement("button");
  assertValueBtn.id = "__wdio_assert_value__";
  assertValueBtn.type = "button";
  assertValueBtn.title = "Assert value";
  assertValueBtn.textContent = "=";
  assertValueBtn.style.cssText = "background:transparent;border:none;cursor:pointer;font:700 10px monospace;color:#94a3b8;padding:2px 4px;border-radius:3px";
  assertValueBtn.onclick = (e) => {
    e.stopPropagation();
    onAssertMode("value");
  };
  toolbar.appendChild(assertValueBtn);
  document.body.appendChild(toolbar);
  return {
    updateCounter(n) {
      counter.textContent = `${n} step${n === 1 ? "" : "s"}`;
    },
    syncPauseState(paused) {
      pauseBtn.textContent = paused ? "\u25B6" : "\u23F8";
      dot.style.background = paused ? "#64748b" : "#ef4444";
    },
    setPickActive(active) {
      pickBtn.style.color = active ? "#38bdf8" : "#94a3b8";
    },
    setAssertActive(mode) {
      assertTextBtn.style.color = mode === "text" ? "#f59e0b" : "#94a3b8";
      assertVisibleBtn.style.color = mode === "visible" ? "#f59e0b" : "#94a3b8";
      assertValueBtn.style.color = mode === "value" ? "#f59e0b" : "#94a3b8";
    }
  };
}
function _noopAPI() {
  return { updateCounter() {
  }, syncPauseState() {
  }, setPickActive() {
  }, setAssertActive() {
  } };
}

// src/recorder-modules/highlight.js
function createHighlight() {
  if (document.getElementById("__wdio_highlight_overlay__")) return _noopHandles();
  const overlay = document.createElement("div");
  overlay.id = "__wdio_highlight_overlay__";
  overlay.style.cssText = [
    "position:fixed",
    "pointer-events:none",
    "box-sizing:border-box",
    "border:2px solid #3b82f6",
    "border-radius:2px",
    "background:rgba(59,130,246,.08)",
    "z-index:2147483646",
    "display:none",
    "transition:none"
  ].join(";");
  document.body.appendChild(overlay);
  const label = document.createElement("div");
  label.id = "__wdio_highlight_label__";
  label.style.cssText = [
    "position:fixed",
    "pointer-events:none",
    "background:#1e293b",
    "color:#f1f5f9",
    'font:500 11px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",monospace',
    "padding:3px 7px",
    "border-radius:4px",
    "white-space:nowrap",
    "max-width:400px",
    "overflow:hidden",
    "text-overflow:ellipsis",
    "z-index:2147483646",
    "display:none",
    "box-shadow:0 2px 8px rgba(0,0,0,.35)"
  ].join(";");
  document.body.appendChild(label);
  let _queryHighlightEls = [];
  return {
    showHover(el, locatorText) {
      const rect = el.getBoundingClientRect();
      overlay.style.top = rect.top + "px";
      overlay.style.left = rect.left + "px";
      overlay.style.width = rect.width + "px";
      overlay.style.height = rect.height + "px";
      overlay.style.display = "block";
      label.textContent = locatorText || "";
      const labelHeight = 22;
      const topAbove = rect.top - labelHeight - 4;
      label.style.left = Math.max(0, rect.left) + "px";
      label.style.top = (topAbove >= 0 ? topAbove : rect.bottom + 4) + "px";
      label.style.display = "block";
    },
    clearHover() {
      overlay.style.display = "none";
      label.style.display = "none";
    },
    showQuery(selector) {
      this.clearQuery();
      let elements;
      try {
        elements = [...document.querySelectorAll(selector)];
      } catch {
        return;
      }
      elements.slice(0, 50).forEach((el) => {
        const rect = el.getBoundingClientRect();
        const div = document.createElement("div");
        div.style.cssText = [
          "position:fixed",
          `top:${rect.top}px`,
          `left:${rect.left}px`,
          `width:${rect.width}px`,
          `height:${rect.height}px`,
          "border:2px solid #22c55e",
          "border-radius:2px",
          "background:rgba(34,197,94,.15)",
          "pointer-events:none",
          "z-index:2147483645",
          "transition:none"
        ].join(";");
        document.body.appendChild(div);
        _queryHighlightEls.push(div);
      });
    },
    clearQuery() {
      for (const el of _queryHighlightEls) el.remove();
      _queryHighlightEls = [];
    },
    updateHoverLocator(text) {
      const el = document.getElementById("__wdio_hover_locator__");
      if (el) el.textContent = text || "";
    }
  };
}
function _noopHandles() {
  return { showHover() {
  }, clearHover() {
  }, showQuery() {
  }, clearQuery() {
  }, updateHoverLocator() {
  } };
}

// src/recorder-modules/context-menu.js
function _removeMenu() {
  document.getElementById("__wdio_assert_menu__")?.remove();
}
function showContextMenu({
  x,
  y,
  locator,
  warn,
  text,
  isFormEl,
  isCheckable,
  currentValue,
  currentUrl,
  pageTitle,
  send,
  showTextAssertForm: showTextAssertForm2,
  showAttrAssertForm: showAttrAssertForm2
}) {
  _removeMenu();
  const menu = document.createElement("div");
  menu.id = "__wdio_assert_menu__";
  menu.style.cssText = `position:fixed;top:${y}px;left:${x}px;
    background:white;border:1px solid #e2e8f0;border-radius:8px;
    box-shadow:0 4px 20px rgba(0,0,0,.10);font:12px -apple-system,sans-serif;
    min-width:230px;z-index:2147483647;overflow:hidden`;
  const header = document.createElement("div");
  header.style.cssText = "padding:7px 12px;color:#94a3b8;font-size:10px;font-weight:600;background:#f8fafc;border-bottom:1px solid #f1f5f9;letter-spacing:.05em";
  header.textContent = "ADD ASSERTION";
  menu.appendChild(header);
  const items = [
    ["Record right-click here", () => send({ type: "rightClick", locator, _warn: warn })],
    ["Hover over element", () => send({ type: "moveTo", locator, _warn: warn })],
    ["Element is visible", () => send({ type: "assert:toBeDisplayed", locator, _warn: warn })],
    ["Element is NOT visible", () => send({ type: "assert:not:toBeDisplayed", locator, _warn: warn })],
    ["Text equals\u2026", () => {
      _removeMenu();
      showTextAssertForm2({ locator, text, warn, eventType: "assert:toHaveText" });
    }],
    ["Text contains\u2026", () => {
      _removeMenu();
      showTextAssertForm2({ locator, text, warn, eventType: "assert:toHaveTextContaining" });
    }],
    ["Text is NOT\u2026", () => {
      _removeMenu();
      showTextAssertForm2({ locator, text, warn, eventType: "assert:not:toHaveText" });
    }],
    ...isFormEl ? [
      ["Value equals\u2026", () => {
        _removeMenu();
        showTextAssertForm2({ locator, text: currentValue, warn, eventType: "assert:toHaveValue", title: "Assert Value" });
      }]
    ] : [],
    ["Attribute equals\u2026", () => {
      _removeMenu();
      showAttrAssertForm2({ locator, warn });
    }],
    ["Element is in viewport", () => send({ type: "assert:toBeInViewport", locator, _warn: warn })],
    ["Element is enabled", () => send({ type: "assert:toBeEnabled", locator, _warn: warn })],
    ["Element is NOT enabled", () => send({ type: "assert:not:toBeEnabled", locator, _warn: warn })],
    ...isCheckable ? [
      ["Element is checked", () => send({ type: "assert:toBeChecked", locator, _warn: warn })],
      ["Element is NOT checked", () => send({ type: "assert:not:toBeChecked", locator, _warn: warn })]
    ] : []
  ];
  items.forEach(([label, handler], i) => {
    const row = document.createElement("div");
    row.style.cssText = `padding:8px 12px;cursor:pointer;${i % 2 ? "background:#f8fafc" : ""}`;
    row.textContent = label;
    row.onmouseenter = () => row.style.background = "#eff6ff";
    row.onmouseleave = () => row.style.background = i % 2 ? "#f8fafc" : "";
    row.onclick = () => {
      handler();
      _removeMenu();
    };
    menu.appendChild(row);
  });
  const footer = document.createElement("div");
  footer.style.cssText = "padding:6px 12px;border-top:1px solid #f1f5f9;background:#f8fafc;display:flex;gap:12px;font-size:10px;color:#94a3b8";
  const urlBtn = document.createElement("span");
  urlBtn.style.cursor = "pointer";
  urlBtn.textContent = "\u{1F310} Assert URL";
  urlBtn.onclick = () => {
    send({ type: "assert:toHaveUrl", url: currentUrl });
    _removeMenu();
  };
  const titleBtn = document.createElement("span");
  titleBtn.style.cursor = "pointer";
  titleBtn.textContent = "\u{1F4C4} Assert Title";
  titleBtn.onclick = () => {
    send({ type: "assert:toHaveTitle", value: pageTitle });
    _removeMenu();
  };
  footer.appendChild(urlBtn);
  footer.appendChild(titleBtn);
  menu.appendChild(footer);
  document.body.appendChild(menu);
  document.addEventListener("click", _removeMenu, { once: true });
}

// src/recorder-modules/assert-forms.js
function _makeField(placeholder) {
  const inp = document.createElement("input");
  inp.type = "text";
  inp.placeholder = placeholder;
  inp.style.cssText = [
    "background:#0f172a",
    "border:1px solid #334155",
    "border-radius:6px",
    "color:#e2e8f0",
    "font:13px monospace",
    "padding:7px 10px",
    "outline:none",
    "width:100%",
    "box-sizing:border-box"
  ].join(";");
  inp.addEventListener("focus", () => {
    inp.style.borderColor = "#3b82f6";
  });
  inp.addEventListener("blur", () => {
    inp.style.borderColor = "#334155";
  });
  inp.addEventListener("keydown", (e) => e.stopPropagation(), true);
  return inp;
}
function _overlayBase(id) {
  document.getElementById(id)?.remove();
  const overlay = document.createElement("div");
  overlay.id = id;
  overlay.style.cssText = [
    "position:fixed",
    "top:50%",
    "left:50%",
    "transform:translate(-50%,-50%)",
    "background:#1e293b",
    "border:1px solid #334155",
    "border-radius:10px",
    "padding:18px 20px",
    'font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    "color:#e2e8f0",
    "z-index:2147483647",
    "box-shadow:0 8px 32px rgba(0,0,0,.6)",
    "min-width:280px",
    "display:flex",
    "flex-direction:column",
    "gap:10px"
  ].join(";");
  return overlay;
}
function _cancelBtn() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Cancel";
  btn.style.cssText = "background:transparent;border:1px solid #334155;border-radius:5px;color:#94a3b8;font:12px sans-serif;padding:5px 12px;cursor:pointer";
  return btn;
}
function _okBtn() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Add Assertion";
  btn.style.cssText = "background:#3b82f6;border:none;border-radius:5px;color:#fff;font:600 12px sans-serif;padding:5px 14px;cursor:pointer";
  return btn;
}
function showTextAssertForm({ locator, text, warn, eventType, title, send }) {
  const overlay = _overlayBase("__wdio_text_form__");
  overlay.style.minWidth = "320px";
  const titleEl = document.createElement("div");
  titleEl.style.cssText = "font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em";
  titleEl.textContent = title || "Assert Text";
  overlay.appendChild(titleEl);
  const locLabel = document.createElement("div");
  locLabel.style.cssText = "font-size:11px;color:#64748b;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
  locLabel.textContent = locator;
  overlay.appendChild(locLabel);
  const inp = document.createElement("input");
  inp.type = "text";
  inp.placeholder = "Expected text\u2026";
  inp.style.cssText = [
    "background:#0f172a",
    "border:1px solid #3b82f6",
    "border-radius:6px",
    "color:#e2e8f0",
    "font:13px monospace",
    "padding:7px 10px",
    "outline:none",
    "width:100%",
    "box-sizing:border-box"
  ].join(";");
  inp.value = text;
  inp.addEventListener("keydown", (e) => e.stopPropagation(), true);
  inp.addEventListener("focus", () => {
    inp.style.borderColor = "#60a5fa";
  });
  inp.addEventListener("blur", () => {
    inp.style.borderColor = "#3b82f6";
  });
  overlay.appendChild(inp);
  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:2px";
  const cancel = _cancelBtn();
  cancel.onclick = () => overlay.remove();
  const ok = _okBtn();
  ok.onclick = () => {
    send({ type: eventType, locator, value: inp.value, _warn: warn });
    overlay.remove();
  };
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ok.click();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      overlay.remove();
    }
  });
  btnRow.appendChild(cancel);
  btnRow.appendChild(ok);
  overlay.appendChild(btnRow);
  document.body.appendChild(overlay);
  inp.focus();
  inp.select();
}
function showAttrAssertForm({ locator, warn, send }) {
  const overlay = _overlayBase("__wdio_attr_form__");
  const titleEl = document.createElement("div");
  titleEl.style.cssText = "font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em";
  titleEl.textContent = "Assert Attribute";
  overlay.appendChild(titleEl);
  const attrInput = _makeField("Attribute name (e.g. href)");
  const valInput = _makeField("Expected value");
  overlay.appendChild(attrInput);
  overlay.appendChild(valInput);
  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:2px";
  const cancel = _cancelBtn();
  cancel.onclick = () => overlay.remove();
  const ok = _okBtn();
  ok.onclick = () => {
    const attr = attrInput.value.trim();
    const val = valInput.value;
    if (attr) send({ type: "assert:toHaveAttr", locator, attr, value: val, _warn: warn });
    overlay.remove();
  };
  [attrInput, valInput].forEach((inp) => {
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        ok.click();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        overlay.remove();
      }
    });
  });
  btnRow.appendChild(cancel);
  btnRow.appendChild(ok);
  overlay.appendChild(btnRow);
  document.body.appendChild(overlay);
  attrInput.focus();
}

// src/recorder-modules/event-listeners.js
function _isRecordableInput(el) {
  if (el.closest('[id^="__wdio_"]')) return false;
  if (["INPUT", "TEXTAREA"].includes(el.tagName)) {
    return !["submit", "button", "checkbox", "radio"].includes(el.type);
  }
  return el.isContentEditable && el.tagName !== "BODY";
}
function targetOf(e) {
  return e.composedPath().find((n) => n instanceof Element) ?? e.target;
}
var CLICKABLE = 'button, a, [role="button"], input[type="submit"], input[type="button"]';
function clickTargetOf(e) {
  const start = targetOf(e);
  for (let n = start; n; n = n.parentElement ?? n.getRootNode().host) {
    if (n.matches(CLICKABLE)) return n;
  }
  return start;
}
function attachEventListeners({
  send,
  getPickMode,
  setPickMode,
  getAssertMode,
  setAssertMode,
  getHighlight,
  getUniqueLocator: getUniqueLocator2,
  showTextAssertForm: showTextAssertForm2,
  showContextMenu: showContextMenu2,
  onFlushInput,
  onCancelClick,
  getInputBuf,
  setInputBuf,
  getFocusValues,
  setClickBuf,
  resolveTextAssertLocator: resolveTextAssertLocator2
}) {
  let hoverTimer = null;
  let dragSourceEl = null;
  function clickLocator(el) {
    const own = getUniqueLocator2(el);
    const r = el.getBoundingClientRect();
    for (let n = el; own.warn && n.getRootNode() instanceof ShadowRoot; ) {
      n = n.getRootNode().host;
      const h = n.getBoundingClientRect();
      const cx = h.left + h.width / 2, cy = h.top + h.height / 2;
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) continue;
      const host = getUniqueLocator2(n);
      if (!host.warn) return host;
    }
    return own;
  }
  document.addEventListener("click", (e) => {
    const el = clickTargetOf(e);
    if (!el || el === document.body) return;
    if (el.closest('[id^="__wdio_"]')) return;
    if (el.tagName === "INPUT" && (el.type === "checkbox" || el.type === "radio") && el.getRootNode() === document) return;
    if (getPickMode()) {
      const { locator: locator2, warn: warn2 } = getUniqueLocator2(el);
      window.__wdioRecord?.(JSON.stringify({ type: "pick", locator: locator2, _warn: warn2 }));
      setPickMode(false);
      return;
    }
    if (getAssertMode()) {
      const { locator: locator2, warn: warn2 } = getUniqueLocator2(el);
      if (getAssertMode() === "text") {
        const text = (el.innerText || "").trim().split("\n")[0].trim().slice(0, 100);
        const { locator: assertLocator, warn: assertWarn } = resolveTextAssertLocator2(el, locator2, warn2, text);
        setAssertMode(null);
        showTextAssertForm2({ locator: assertLocator, text, warn: assertWarn, eventType: "assert:toHaveTextContaining" });
        return;
      } else if (getAssertMode() === "visible") {
        send({ type: "assert:toBeDisplayed", locator: locator2, _warn: warn2 });
      } else if (getAssertMode() === "value") {
        const isFormEl = ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName);
        if (!isFormEl) {
          const tip = document.createElement("div");
          tip.style.cssText = "position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#333;color:#fc9;font-size:11px;padding:4px 10px;border-radius:4px;pointer-events:none;z-index:2147483647";
          tip.textContent = "Assert Value: only works on input / select / textarea";
          document.body.appendChild(tip);
          setTimeout(() => tip.remove(), 2e3);
          return;
        }
        const value = el.value ?? (el.getAttribute("value") || "");
        setAssertMode(null);
        showTextAssertForm2({ locator: locator2, text: value, warn: warn2, eventType: "assert:toHaveValue", title: "Assert Value" });
        return;
      }
      setAssertMode(null);
      return;
    }
    if (el.tagName === "A" && (el.hasAttribute("download") || /\.(pdf|zip|docx?|xlsx?|csv|png|jpe?g|gif|mp4|mp3|exe|dmg|pkg|deb|rpm)\b/i.test(el.href || ""))) {
      const filename = el.getAttribute("download") || el.href.split("/").pop().split("?")[0] || "";
      const { locator: locator2, warn: warn2 } = getUniqueLocator2(el);
      send({ type: "download", locator: locator2, filename, _warn: warn2 });
      return;
    }
    const { locator, warn } = clickLocator(el);
    const payload = { type: "click", locator, _warn: warn };
    onCancelClick();
    setClickBuf({
      payload,
      timer: setTimeout(() => {
        setClickBuf(null);
        send(payload);
      }, 300)
    });
  }, true);
  document.addEventListener("dblclick", (e) => {
    if (targetOf(e).closest('[id^="__wdio_"]')) return;
    const el = clickTargetOf(e);
    if (!el || el === document.body) return;
    onCancelClick();
    const { locator, warn } = clickLocator(el);
    send({ type: "dblclick", locator, _warn: warn });
  }, true);
  document.addEventListener("change", (e) => {
    const el = targetOf(e);
    if (el.closest('[id^="__wdio_"]')) return;
    if (el.tagName === "SELECT") {
      const { locator, warn } = getUniqueLocator2(el);
      const opt = el.options[el.selectedIndex];
      const optText = (opt?.text ?? "").replace(/\s+/g, " ").trim();
      const optValue = (opt?.value ?? "").trim();
      send({ type: "select", locator, value: optText, optValue, _warn: warn });
    }
    if (el.tagName === "INPUT" && el.type === "checkbox") {
      const { locator, warn } = getUniqueLocator2(el);
      send({ type: el.checked ? "check" : "uncheck", locator, _warn: warn });
    }
    if (el.tagName === "INPUT" && el.type === "radio" && el.checked) {
      const { locator, warn } = getUniqueLocator2(el);
      send({ type: "click", locator, _warn: warn });
    }
    if (el.tagName === "INPUT" && el.type === "file" && el.files?.length > 0) {
      const { locator, warn } = getUniqueLocator2(el);
      send({ type: "uploadFile", locator, value: el.files[0].name, _warn: warn });
    }
  }, true);
  document.addEventListener("focusin", (e) => {
    const el = targetOf(e);
    if (!_isRecordableInput(el)) return;
    getFocusValues().set(el, el.isContentEditable ? el.innerText.replace(/\n$/, "") : el.value);
  }, true);
  document.addEventListener("input", (e) => {
    const el = targetOf(e);
    if (!_isRecordableInput(el)) return;
    if (el.tagName === "INPUT" && el.type === "file") return;
    const { locator, warn } = getUniqueLocator2(el);
    setInputBuf({ el, locator, warn });
  }, true);
  document.addEventListener("blur", (e) => {
    const el = targetOf(e);
    if (!_isRecordableInput(el)) return;
    if (getInputBuf()?.el === el) onFlushInput();
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && (getAssertMode() || getPickMode())) {
      setAssertMode(null);
      setPickMode(false);
      e.stopPropagation();
      return;
    }
    if (targetOf(e).closest('[id^="__wdio_"]')) return;
    if (["Shift", "Control", "Meta", "Alt"].includes(e.key)) return;
    const isMac = navigator.platform.includes("Mac");
    if (e.key === "v" && (isMac ? e.metaKey : e.ctrlKey)) return;
    if (e.key === "Insert" && e.shiftKey) return;
    const hasPrimary = e.ctrlKey || e.altKey || e.metaKey;
    const isPrintable = e.key.length === 1;
    const hasShift = e.shiftKey && !isPrintable;
    const isCombo = hasPrimary || hasShift;
    if (isCombo) {
      onFlushInput();
      const keys = [];
      if (e.ctrlKey) keys.push("Control");
      if (e.altKey) keys.push("Alt");
      if (e.metaKey) keys.push("Meta");
      if (hasShift) keys.push("Shift");
      keys.push(e.key);
      send({ type: "keys", keys });
      return;
    }
    const SPECIAL = [
      "Enter",
      "Tab",
      "Escape",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Backspace",
      "Delete",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      "F1",
      "F2",
      "F3",
      "F4",
      "F5",
      "F6",
      "F7",
      "F8",
      "F9",
      "F10",
      "F11",
      "F12"
    ];
    if (SPECIAL.includes(e.key)) {
      if (["Tab", "Enter", "Escape"].includes(e.key)) onFlushInput();
      send({ type: "keys", key: e.key });
    }
  }, true);
  document.addEventListener("dragstart", (e) => {
    dragSourceEl = targetOf(e);
  }, true);
  document.addEventListener("drop", (e) => {
    if (!dragSourceEl) return;
    const target = targetOf(e);
    if (!target || target === dragSourceEl || target === document.body) return;
    if (target.closest('[id^="__wdio_"]')) return;
    const { locator: srcLoc, warn: srcWarn } = getUniqueLocator2(dragSourceEl);
    const { locator: tgtLoc, warn: tgtWarn } = getUniqueLocator2(target);
    send({
      type: "dragAndDrop",
      locator: srcLoc,
      targetLocator: tgtLoc,
      _warn: srcWarn || tgtWarn
    });
    dragSourceEl = null;
  }, true);
  document.addEventListener("dragend", () => {
    dragSourceEl = null;
  }, true);
  window.addEventListener("scroll", () => {
    getHighlight()?.clearQuery();
  }, { capture: true, passive: true });
  document.addEventListener("mouseover", (e) => {
    if (targetOf(e).closest('[id^="__wdio_"]')) {
      getHighlight()?.clearHover();
      getHighlight()?.updateHoverLocator("");
      return;
    }
    if (targetOf(e) === document.body || targetOf(e) === document.documentElement) {
      getHighlight()?.clearHover();
      getHighlight()?.updateHoverLocator("");
      return;
    }
    clearTimeout(hoverTimer);
    const target = targetOf(e);
    hoverTimer = setTimeout(() => {
      const { locator } = getUniqueLocator2(target);
      getHighlight()?.showHover(target, locator);
      getHighlight()?.updateHoverLocator(locator);
    }, 50);
  }, true);
  document.addEventListener("mouseout", (e) => {
    clearTimeout(hoverTimer);
    if (targetOf(e).closest('[id^="__wdio_"]')) return;
    getHighlight()?.clearHover();
    getHighlight()?.updateHoverLocator("");
  }, true);
  document.addEventListener("contextmenu", (e) => {
    if (targetOf(e).closest('[id^="__wdio_"]')) return;
    e.preventDefault();
    const el = targetOf(e);
    const { locator, warn } = getUniqueLocator2(el);
    const text = (el.innerText || "").trim().split("\n")[0].trim().slice(0, 60);
    const isCheckable = el.type === "checkbox" || el.type === "radio";
    const isFormEl = ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName);
    const currentValue = isFormEl ? el.value ?? "" : "";
    showContextMenu2({
      x: e.clientX,
      y: e.clientY,
      locator,
      warn,
      text,
      isFormEl,
      isCheckable,
      currentValue,
      currentUrl: location.pathname,
      pageTitle: document.title
    });
  }, true);
}

// src/recorder.source.js
(function() {
  if (window.__wdioRecorderActive) return;
  window.__wdioRecorderActive = true;
  const FRAME_SEL = getFrameSelector();
  let paused = false;
  let assertMode = null;
  let pickMode = false;
  let stepCount = 0;
  let _toolbar = null;
  let _highlight = null;
  const focusValues = /* @__PURE__ */ new WeakMap();
  let _clickBuf = null;
  function _flushClick() {
    if (!_clickBuf) return;
    clearTimeout(_clickBuf.timer);
    send(_clickBuf.payload);
    _clickBuf = null;
  }
  function _cancelClick() {
    if (!_clickBuf) return;
    clearTimeout(_clickBuf.timer);
    _clickBuf = null;
  }
  let _inputBuf = null;
  function _elValue(el) {
    return el.isContentEditable ? el.innerText.replace(/\n$/, "") : el.value;
  }
  function _flushInput() {
    if (!_inputBuf) return;
    const { el, locator, warn } = _inputBuf;
    _inputBuf = null;
    const currentValue = _elValue(el);
    const previousValue = focusValues.get(el) ?? "";
    if (currentValue === previousValue) return;
    if (previousValue !== "") {
      send({ type: "clearValue", locator, _warn: warn });
    }
    send({ type: "setValue", locator, value: currentValue, _warn: warn });
  }
  window.__wdioHighlight = function(selector) {
    _highlight?.clearQuery();
    if (selector) _highlight?.showQuery(selector);
  };
  window.__wdioControl = function(cmd) {
    if (cmd === "pause") {
      paused = true;
      setPick(false);
      setAssertMode(null);
      syncPauseButton();
    }
    if (cmd === "resume") {
      paused = false;
      setPick(false);
      setAssertMode(null);
      syncPauseButton();
    }
    if (cmd === "assertText") {
      setAssertMode("text");
      setPick(false);
    }
    if (cmd === "assertVisible") {
      setAssertMode("visible");
      setPick(false);
    }
    if (cmd === "assertValue") {
      setAssertMode("value");
      setPick(false);
    }
    if (cmd === "pick") {
      setPick(!pickMode);
      setAssertMode(null);
    }
    if (cmd === "recording") {
      setAssertMode(null);
      setPick(false);
    }
  };
  function send(event) {
    if (paused) return;
    if (event.type !== "navigate") {
      stepCount++;
      updateToolbarCounter();
    }
    const payload = FRAME_SEL ? { ...event, _frame: FRAME_SEL } : event;
    window.__wdioRecord?.(JSON.stringify(payload));
  }
  attachSPANavigation(send, _flushInput, _flushClick);
  attachDialogOverrides(send);
  function setAssertMode(mode) {
    assertMode = mode;
    document.body.style.cursor = mode ? "crosshair" : pickMode ? "crosshair" : "";
    _toolbar?.setAssertActive(mode);
  }
  function setPick(active) {
    pickMode = active;
    document.body.style.cursor = active ? "crosshair" : assertMode ? "crosshair" : "";
    _toolbar?.setPickActive(active);
  }
  function syncPauseButton() {
    _toolbar?.syncPauseState(paused);
  }
  function updateToolbarCounter() {
    _toolbar?.updateCounter(stepCount);
  }
  function injectUI() {
    _toolbar = createToolbar({
      onPause: () => {
        paused = true;
        syncPauseButton();
        window.__wdioRecord?.(JSON.stringify({ type: "control:pause" }));
      },
      onResume: () => {
        paused = false;
        syncPauseButton();
        window.__wdioRecord?.(JSON.stringify({ type: "control:resume" }));
      },
      onClear: () => {
        stepCount = 0;
        updateToolbarCounter();
        window.__wdioRecord?.(JSON.stringify({ type: "clear" }));
      },
      onPick: () => {
        setPick(!pickMode);
      },
      onAssertMode: (mode) => {
        setAssertMode(assertMode === mode ? null : mode);
      }
    });
    _highlight = createHighlight();
  }
  if (document.body) {
    injectUI();
  } else {
    document.addEventListener("DOMContentLoaded", injectUI);
  }
  attachEventListeners({
    send,
    getPickMode: () => pickMode,
    setPickMode: (v) => setPick(v),
    getAssertMode: () => assertMode,
    setAssertMode,
    getHighlight: () => _highlight,
    getUniqueLocator,
    showTextAssertForm: (opts) => showTextAssertForm({ ...opts, send }),
    showContextMenu: (opts) => showContextMenu({
      ...opts,
      send,
      showTextAssertForm: (o) => showTextAssertForm({ ...o, send }),
      showAttrAssertForm: (o) => showAttrAssertForm({ ...o, send })
    }),
    onFlushInput: _flushInput,
    onCancelClick: _cancelClick,
    getInputBuf: () => _inputBuf,
    setInputBuf: (v) => {
      _inputBuf = v;
    },
    getFocusValues: () => focusValues,
    setClickBuf: (v) => {
      _clickBuf = v;
    },
    resolveTextAssertLocator
  });
  if (window === window.top && /^https?:/.test(location.href)) {
    send({ type: "navigate", url: location.href });
  }
})();
