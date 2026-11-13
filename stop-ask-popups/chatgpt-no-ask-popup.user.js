// ==UserScript==
// @name         ChatGPT – Toggle "Ask ChatGPT" text-selection popup
// @namespace    https://github.com/YOUR_USERNAME/stop-ask-popups
// @version      1.2
// @description  Adds a toggle to the "Chat actions" (…) menu that blocks the "Ask ChatGPT" bubble shown when you highlight text.
// @author       YOUR_NAME
// @license      MIT
// @homepageURL  https://github.com/YOUR_USERNAME/stop-ask-popups
// @supportURL   https://github.com/YOUR_USERNAME/stop-ask-popups/issues
// @downloadURL  https://raw.githubusercontent.com/YOUR_USERNAME/stop-ask-popups/main/chatgpt-no-ask-popup.user.js
// @updateURL    https://raw.githubusercontent.com/YOUR_USERNAME/stop-ask-popups/main/chatgpt-no-ask-popup.user.js
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  const KEY = 'blockAskChatGPTPopup';
  const MARK = 'data-tm-ask-toggle';
  const POPUP_MARK = 'data-tm-ask-popup';
  const POPUP_TEXT = 'ask chatgpt';

  // ---------- state (persisted by Tampermonkey; default = blocked) ----------
  function load() {
    try { return GM_getValue(KEY, true); } catch (e) { return true; }
  }
  function save(v) {
    try { GM_setValue(KEY, v); } catch (e) { /* ignore */ }
  }
  let blocked = load();

  // ---------- blocking: a CSS rule on the popup wrapper, switched on/off ----------
  const style = document.createElement('style');
  style.id = 'tm-hide-ask-chatgpt';
  style.textContent = `
    [${POPUP_MARK}] {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;
  function applyState() {
    style.disabled = !blocked; // a disabled <style> applies no rules
  }
  (document.head || document.documentElement).appendChild(style);
  applyState();

  function setBlocked(v) {
    blocked = v;
    save(v);
    applyState();
  }

  try {
    GM_registerMenuCommand('Toggle "Ask ChatGPT" popup blocking', () => setBlocked(!blocked));
  } catch (e) { /* ignore */ }

  // ---------- finding the popup ----------
  // The popup is a fixed-position wrapper holding one button whose text is "Ask ChatGPT".
  // (The composer is a div with that aria-label, not a button, so it isn't matched.)
  function markPopups(root) {
    if (!root || root.nodeType !== 1) return;
    const candidates = [];
    if (root.matches && root.matches('div.fixed')) candidates.push(root);
    if (root.querySelectorAll) root.querySelectorAll('div.fixed').forEach((el) => candidates.push(el));
    // Also handle a node added *inside* an already-present wrapper
    const up = root.closest && root.closest('div.fixed');
    if (up && !candidates.includes(up)) candidates.push(up);

    for (const el of candidates) {
      if (el.hasAttribute(POPUP_MARK)) continue;
      const btn = el.querySelector('button');
      if (!btn) continue;
      if (el.querySelectorAll('button').length > 3) continue; // not our tiny popup
      if (btn.textContent.trim().toLowerCase() === POPUP_TEXT) {
        el.setAttribute(POPUP_MARK, '');
      }
    }
  }

  // ---------- menu item ----------
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STROKE = 'fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round';

  function makeSvg(size, inner) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.flex = 'none';
    svg.innerHTML = inner;
    return svg;
  }

  // Speech-bubble outline, drawn to match the 20px light icons in the menu.
  const BUBBLE =
    '<path d="M5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H10l-3.5 3v-3h-1A1.5 1.5 0 0 1 4 11.5v-6A1.5 1.5 0 0 1 5.5 4Z" style="' + STROKE + '"/>';
  const CHECK = '<path d="M4.5 10.5 8.25 14.25 15.5 6" style="' + STROKE + ';stroke-width:1.6"/>';

  // Size (px) of the icon that is actually visible in an existing item.
  function iconSize(template) {
    for (const svg of template.querySelectorAll('svg')) {
      const r = svg.getBoundingClientRect();
      if (r.width > 0) return Math.round(r.width);
    }
    return 20;
  }

  function setLabel(item) {
    const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let done = false;
    for (const n of nodes) {
      if (!n.nodeValue.trim()) continue;
      if (!done) { n.nodeValue = 'Ask ChatGPT'; done = true; }
      else n.nodeValue = '';
    }
    if (!done) item.appendChild(document.createTextNode('Ask ChatGPT'));
  }

  // Runs once the clone is in the DOM.
  // ChatGPT's item structure (from the inspector):
  //   div[role=menuitem] > div[data-menu-row-content].flex > span.flex-1.truncate > span.flex.items-center.gap-1.5 > [icon][label]
  function finalize(item, iconPx) {
    // --- Icon: swap every svg for one of ours, in the position of the first one ---
    const mine = makeSvg(iconPx, BUBBLE);
    const svgs = Array.from(item.querySelectorAll('svg'));
    if (svgs.length) {
      svgs[0].replaceWith(mine);
      svgs.slice(1).forEach((el) => el.remove());
    } else {
      // Icon isn't an <svg>: find the element sitting just before the label text.
      const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
      let textNode = null;
      while (walker.nextNode()) {
        if (walker.currentNode.nodeValue.trim()) { textNode = walker.currentNode; break; }
      }
      const holder = textNode && textNode.parentElement;
      const old = holder && (holder.firstElementChild || holder.previousElementSibling);
      if (old && !old.contains(textNode)) old.replaceWith(mine);
      else if (holder) holder.insertBefore(mine, holder.firstChild);
    }

    // --- Tick: right edge of the row that holds the label ---
    const row = item.querySelector('[data-menu-row-content]') || item;
    const tick = document.createElement('span');
    tick.setAttribute('data-tm-tick', '');
    tick.setAttribute('aria-hidden', 'true');
    tick.style.cssText = 'margin-inline-start:auto;display:inline-flex;align-items:center;flex:none;padding-inline-start:12px;opacity:.75;line-height:0;';
    tick.appendChild(makeSvg(16, CHECK));
    row.appendChild(tick);
    refresh(item);
  }

  function refresh(item) {
    const tick = item.querySelector('[data-tm-tick]');
    if (tick) tick.style.visibility = blocked ? 'hidden' : 'visible';
    item.setAttribute('aria-checked', String(!blocked));
  }

  function text(el) { return (el.textContent || '').trim().toLowerCase(); }

  function buildItem(template) {
    const item = template.cloneNode(true);
    item.setAttribute(MARK, '1');
    item.removeAttribute('id');
    item.removeAttribute('data-highlighted');
    item.removeAttribute('data-disabled');
    item.removeAttribute('aria-disabled');
    item.removeAttribute('aria-haspopup');
    item.removeAttribute('aria-expanded');
    item.removeAttribute('data-state');
    item.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    item.setAttribute('role', 'menuitemcheckbox');
    item.tabIndex = -1;

    setLabel(item);

    // Radix highlights items from React handlers; a cloned node needs it done by hand.
    item.addEventListener('pointerenter', () => {
      const menu = item.closest('[role="menu"]');
      if (menu) menu.querySelectorAll('[data-highlighted]').forEach((el) => el.removeAttribute('data-highlighted'));
      item.setAttribute('data-highlighted', '');
    });
    item.addEventListener('pointerleave', () => item.removeAttribute('data-highlighted'));

    const activate = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setBlocked(!blocked);
      refresh(item);
      closeMenu(item);
    };
    item.addEventListener('click', activate, true);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') activate(e);
    }, true);
    return item;
  }

  function closeMenu(item) {
    const menu = item.closest('[role="menu"]');
    const esc = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true };
    const target = menu || document.body;
    target.dispatchEvent(new KeyboardEvent('keydown', esc));
    target.dispatchEvent(new KeyboardEvent('keyup', esc));

    // If the menu is still open shortly after, fall back to an "outside press".
    setTimeout(() => {
      if (!menu || !document.contains(menu)) return;
      for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
        const Ctor = type.startsWith('pointer') ? PointerEvent : MouseEvent;
        document.body.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }));
      }
    }, 120);
  }

  function tryInject() {
    for (const menu of document.querySelectorAll('[role="menu"]')) {
      if (menu.querySelector('[' + MARK + ']')) continue;
      const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
      if (items.length < 3) continue;

      // Only the conversation menu: it has both Archive and Delete.
      const texts = items.map(text);
      if (!texts.some((t) => t === 'archive') || !texts.some((t) => t === 'delete')) continue;

      // Template: a plain item (no submenu, not the red Delete). Prefer Pin / Rename / Lock chat.
      const plain = items.filter((el) => !el.hasAttribute('aria-haspopup') && text(el) !== 'delete');
      const template =
        plain.find((el) => /^(pin|unpin)$/.test(text(el))) ||
        plain.find((el) => text(el) === 'rename') ||
        plain[0];
      if (!template) continue;

      const iconPx = iconSize(template);
      const item = buildItem(template);

      // Place it at the end of the first group (just before the first divider).
      const sep = menu.querySelector('[role="separator"]');
      const prev = sep && sep.previousElementSibling;
      if (sep && prev && sep.parentNode) sep.parentNode.insertBefore(item, sep);
      else template.after(item);
      finalize(item, iconPx);
    }
  }

  // ---------- one observer: mark popups immediately, inject menu item once per frame ----------
  let queued = false;
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) markPopups(node);
    }
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; tryInject(); });
  });

  function start() {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    markPopups(document.documentElement);
  }
  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
