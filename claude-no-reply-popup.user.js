// ==UserScript==
// @name         Claude – Toggle "Reply" text-selection popup
// @namespace    https://github.com/YOUR_USERNAME/stop-ask-popups
// @version      1.0
// @description  Adds a toggle to the session (chevron) menu that blocks the "Reply" bubble shown when you highlight text.
// @author       YOUR_NAME
// @license      MIT
// @homepageURL  https://github.com/YOUR_USERNAME/stop-ask-popups
// @supportURL   https://github.com/YOUR_USERNAME/stop-ask-popups/issues
// @downloadURL  https://raw.githubusercontent.com/YOUR_USERNAME/stop-ask-popups/main/claude-no-reply-popup.user.js
// @updateURL    https://raw.githubusercontent.com/YOUR_USERNAME/stop-ask-popups/main/claude-no-reply-popup.user.js
// @match        https://claude.ai/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  const KEY = 'blockReplyPopup';
  const MARK = 'data-tm-reply-toggle';

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
  style.id = 'tm-hide-reply-popup';
  style.textContent = `
    [data-selection-tooltip="true"] {
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

  // Fallback entry in the Tampermonkey toolbar menu
  try {
    GM_registerMenuCommand('Toggle "Reply" popup blocking', () => setBlocked(!blocked));
  } catch (e) { /* ignore */ }

  // ---------- menu item ----------
  // Tick = the popup is allowed to appear (same convention as the Gemini script).
  function tickText() { return blocked ? '' : '✓'; }

  function refresh(item) {
    const kbd = item.querySelector('kbd');
    if (kbd) kbd.textContent = tickText();
    item.setAttribute('aria-checked', String(!blocked));
  }

  // Outline "reply" arrow, drawn to match the 20px / ~1.5px-stroke icons in the menu.
  const REPLY_SVG =
    '<svg viewBox="0 0 20 20" width="1em" height="1em" fill="none" stroke="currentColor" ' +
    'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M8 4 3.5 8.5 8 13"/><path d="M3.5 8.5H11a5.5 5.5 0 0 1 5.5 5.5v1.5"/></svg>';

  function buildItem(template) {
    const item = template.cloneNode(true);
    item.setAttribute(MARK, '1');
    item.removeAttribute('id');
    item.removeAttribute('data-testid');
    item.removeAttribute('aria-keyshortcuts');
    item.removeAttribute('data-highlighted');
    item.setAttribute('role', 'menuitemcheckbox');

    // Label
    const label = item.querySelector('.truncate');
    if (label) label.textContent = 'Reply';

    // Icon: swap the glyph for an inline SVG, keep the original wrapper/sizing
    const icon = item.querySelector('[data-cds="Icon"]');
    if (icon) {
      icon.textContent = '';
      icon.insertAdjacentHTML('afterbegin', REPLY_SVG);
      icon.style.display = 'inline-flex';
    }

    refresh(item);

    // Base UI toggles data-highlighted from React; a cloned node needs it done by hand.
    item.addEventListener('pointerenter', () => {
      const menu = item.closest('[role="menu"]');
      if (menu) menu.querySelectorAll('[data-highlighted]').forEach((el) => el.removeAttribute('data-highlighted'));
      item.setAttribute('data-highlighted', '');
    });
    item.addEventListener('pointerleave', () => item.removeAttribute('data-highlighted'));

    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setBlocked(!blocked);
      refresh(item);
      closeMenu(item);
    }, true);
    return item;
  }

  function closeMenu(item) {
    const menu = item.closest('[role="menu"]');
    const fire = (target, type, init) => target.dispatchEvent(new KeyboardEvent(type, init));
    const esc = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true };
    fire(menu || document.body, 'keydown', esc);
    fire(menu || document.body, 'keyup', esc);

    // If the menu is still open shortly after, fall back to an "outside press".
    setTimeout(() => {
      if (!document.contains(menu)) return;
      for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
        const Ctor = type.startsWith('pointer') ? PointerEvent : MouseEvent;
        document.body.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }));
      }
    }, 120);
  }

  function tryInject() {
    // The session menu is the one containing "Share session".
    const share = document.querySelector('[data-testid="share-chat-trigger"][role="menuitem"]');
    if (!share || !share.parentNode) return;
    const menu = share.closest('[role="menu"]');
    if (!menu || menu.querySelector('[' + MARK + ']')) return;

    // Clone "Rename" (it has the right-hand shortcut slot we reuse for the tick).
    const template = menu.querySelector('[data-testid="rename-session-trigger"]') || share;
    const item = buildItem(template);
    share.after(item);
  }

  // Throttle to one check per frame so streaming responses don't make this costly.
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; tryInject(); });
  });

  function start() {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
