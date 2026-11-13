<div align="center">

# 🫥 Stop Ask Popups

**Highlight text while you read, without an AI bubble jumping in your face.**

Tampermonkey userscripts that hide the "Ask Gemini", "Reply" (Claude) and "Ask ChatGPT" popups that appear whenever you select text, with a native-looking toggle in each site's own menu so you can bring the popup back whenever you want it.

![Tampermonkey](https://img.shields.io/badge/Tampermonkey-userscript-00485B?logo=tampermonkey&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)
![Sites](https://img.shields.io/badge/sites-Gemini%20·%20Claude%20·%20ChatGPT-8A63D2)

</div>

---

## Why this exists

Lots of people highlight text with the cursor as they read. It keeps their place, helps them focus, and makes dense text easier to follow. This is especially true for many neurodivergent readers (ADHD, dyslexia and others).

Gemini, Claude and ChatGPT all pop up a small bubble the moment you select something. Every highlight triggers a flicker right next to the words you are trying to read.

These scripts remove that distraction. **Highlighting just highlights.**

## Install

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Click the script you want. Tampermonkey will offer to install it.

| Site | Popup it hides | Install |
| --- | --- | --- |
| **Gemini** (`gemini.google.com`) | "Ask Gemini" | [**Install**](https://raw.githubusercontent.com/YOUR_USERNAME/stop-ask-popups/main/gemini-no-ask-popup.user.js) |
| **Claude** (`claude.ai`) | "Reply" | [**Install**](https://raw.githubusercontent.com/YOUR_USERNAME/stop-ask-popups/main/claude-no-reply-popup.user.js) |
| **ChatGPT** (`chatgpt.com`) | "Ask ChatGPT" | [**Install**](https://raw.githubusercontent.com/YOUR_USERNAME/stop-ask-popups/main/chatgpt-no-ask-popup.user.js) |

Each one is independent, so install only the sites you use. After installing, reload the site.

## How to use it

The popup is **hidden by default**. Each site gets one extra item in the menu you already use for conversation actions:

| Site | Where to find the toggle |
| --- | --- |
| Gemini | the **⋮** menu on a conversation, next to "Delete" |
| Claude | the chevron menu beside the session title, below "Share session" |
| ChatGPT | the **…** "Chat actions" menu, at the end of the first group |

The toggle is styled like the other items in that menu, and it shows a **✓ when the popup is allowed to appear**. No tick means it stays hidden. Your choice is remembered between visits.

There is also a backup toggle in the Tampermonkey toolbar menu, in case a site update ever moves things around.

> **Note:** hiding the popup also hides the feature it opens (for example Claude's "Reply to this selection"). Flip the toggle back on whenever you want to use it.

## How it works

- A CSS rule hides the popup. The rule is switched on and off by the toggle. Nothing is deleted from the page, so turning the popup back on is instant and safe.
- A small `MutationObserver` adds the toggle item to the menu when it opens. It copies an existing menu item, so fonts, spacing and hover colours match.
- Each script only runs on its own site and does nothing else. No data is collected or sent anywhere. The only thing stored is your on/off choice, in Tampermonkey's own storage.

## Heads up

These scripts depend on each site's page structure, which the sites change from time to time. If a popup comes back or the toggle disappears after a site update, it probably needs a small fix.

- The **ChatGPT** script finds the popup by its English text ("Ask ChatGPT"), so it works with ChatGPT's interface language set to English.
- Only the first menu that contains both "Archive" and "Delete" gets the toggle. If a menu is missing the toggle, use the Tampermonkey toolbar entry.

## Something broke?

[Open an issue](https://github.com/YOUR_USERNAME/stop-ask-popups/issues) and include:

1. Which site and browser.
2. The HTML of the popup or menu. Right-click it, choose **Inspect**, then right-click the highlighted element and choose **Copy → Copy outerHTML**.

A screenshot helps too.

## Contributing

Pull requests are welcome, especially fixes after a site redesign or support for other sites that show a selection popup.

## License

[MIT](LICENSE)

---

<sub>Not affiliated with Google, Anthropic or OpenAI. Gemini, Claude and ChatGPT are trademarks of their respective owners.</sub>
