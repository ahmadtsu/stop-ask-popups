// ==UserScript==
// @name         Gemini – Toggle "Ask Gemini" highlight popup
// @namespace    https://github.com/YOUR_USERNAME/stop-ask-popups
// @version      2.3
// @description  Adds a toggle to the conversation (⋮) menu that blocks the "Ask Gemini" bubble shown when highlighting text.
// @author       YOUR_NAME
// @license      MIT
// @homepageURL  https://github.com/YOUR_USERNAME/stop-ask-popups
// @supportURL   https://github.com/YOUR_USERNAME/stop-ask-popups/issues
// @downloadURL  https://raw.githubusercontent.com/YOUR_USERNAME/stop-ask-popups/main/gemini-no-ask-popup.user.js
// @updateURL    https://raw.githubusercontent.com/YOUR_USERNAME/stop-ask-popups/main/gemini-no-ask-popup.user.js
// @match        https://gemini.google.com/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  const KEY = 'blockAskGeminiPopup';
  const TRIGGER_SELECTOR = '[aria-label^="Open menu for conversation actions"]';
  const MARK = 'data-tm-ask-toggle';

  // ---------- state (persisted by Tampermonkey; default = blocked) ----------
  function load() {
    try { return GM_getValue(KEY, true); } catch (e) { return true; }
  }
  function save(v) {
    try { GM_setValue(KEY, v); } catch (e) { /* ignore */ }
  }
  let blocked = load();

  // ---------- the actual blocking: a CSS rule we can switch on/off ----------
  const style = document.createElement('style');
  style.id = 'tm-hide-ask-gemini';
  style.textContent = `
    highlight-to-ask-menu,
    .cdk-overlay-pane:has(> highlight-to-ask-menu),
    .ask-gemini-button[aria-label="Ask Gemini about highlighted text"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  function applyState() {
    style.disabled = !blocked; // disabled <style> = rule not applied
  }
  (document.head || document.documentElement).appendChild(style);
  applyState();

  function setBlocked(v) {
    blocked = v;
    save(v);
    applyState();
  }

  // Fallback entry in the Tampermonkey toolbar menu
  try {
    GM_registerMenuCommand('Toggle "Ask Gemini" popup blocking', () => {
      setBlocked(!blocked);
    });
  } catch (e) { /* ignore */ }

  // ---------- menu item injection ----------
  function labelText() {
    return blocked ? 'Ask Gemini' : 'Ask Gemini ✓';
  }

  function setLabel(item) {
    // Replace the first non-empty text node, blank out any others
    const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
    let done = false;
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      if (!n.nodeValue.trim()) continue;
      // Skip text that belongs to the icon (ligature-style icons)
      if (n.parentElement && n.parentElement.closest('mat-icon, .mat-icon')) continue;
      if (!done) { n.nodeValue = labelText(); done = true; }
      else n.nodeValue = '';
    }
    item.setAttribute('aria-checked', String(!blocked));
  }

  function setIcon(item) {
    const icon = item.querySelector('mat-icon, .mat-icon');
    if (!icon) return;
    const name = 'prompt_suggestion'; // icon already used by Gemini's own "Ask Gemini" button
    icon.setAttribute('fonticon', name);
    icon.setAttribute('data-mat-icon-name', name);
    if (icon.textContent.trim()) icon.textContent = name;
  }

  function buildItem(template) {
    const item = template.cloneNode(true);
    item.setAttribute(MARK, '1');
    item.removeAttribute('id');
    item.removeAttribute('jslog');
    item.removeAttribute('disabled');
    item.removeAttribute('aria-disabled');
    item.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    item.querySelectorAll('[jslog]').forEach((el) => el.removeAttribute('jslog'));
    item.setAttribute('role', 'menuitemcheckbox');
    setIcon(item);
    setLabel(item);

    // Cloned nodes have no Angular listeners, so this is the only handler.
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setBlocked(!blocked);
      setLabel(item);
      closeMenu(item);
    }, true);
    return item;
  }

  function closeMenu(from) {
    const backdrop = document.querySelector('.cdk-overlay-backdrop');
    if (backdrop) { backdrop.click(); return; }
    const panel = from.closest('.mat-mdc-menu-panel') || document.body;
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
  }

  function itemText(el) { return (el.textContent || '').trim().toLowerCase(); }

  function tryInject() {
    const panels = document.querySelectorAll('.mat-mdc-menu-panel, [role="menu"]');
    for (const panel of panels) {
      if (panel.querySelector('[' + MARK + ']')) continue;
      const items = Array.from(panel.querySelectorAll('[role="menuitem"], button.mat-mdc-menu-item, .mat-mdc-menu-item'))
        .filter((el, i, arr) => arr.indexOf(el) === i);
      if (items.length < 2) continue;

      // Only touch the conversation-actions menu (it has Rename / Delete etc.)
      const texts = items.map(itemText);
      const isConvoMenu = texts.some((t) => t.includes('rename')) && texts.some((t) => t.includes('delete'));
      if (!isConvoMenu) continue;

      const template = items.find((el) => itemText(el).includes('rename')) || items[0];
      const deleteItem = items.find((el) => itemText(el).includes('delete'));
      const newItem = buildItem(template);
      if (deleteItem && deleteItem.parentNode) deleteItem.parentNode.insertBefore(newItem, deleteItem);
      else template.parentNode.appendChild(newItem);
      return true;
    }
    return false;
  }

  // After the ⋮ button is clicked, watch briefly for the menu to render.
  let watchUntil = 0;
  const observer = new MutationObserver(() => {
    if (Date.now() > watchUntil) return;
    tryInject();
  });

  function start() {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.closest && t.closest(TRIGGER_SELECTOR)) {
      watchUntil = Date.now() + 2000;
      // In case the menu is already in the DOM by the time we look
      setTimeout(tryInject, 0);
      setTimeout(tryInject, 150);
    }
  }, true);

  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
