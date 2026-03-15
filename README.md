# BookLens — Character Companion

A spoiler-free character lookup app for readers of epic fantasy and long-form fiction. Enter a book, character name, and the page you're on — BookLens gives you a spoiler-safe bio, appearance description, key relationships, and an AI-generated portrait.

Built as an MBA group project for **Big Data, AI & Machine Learning** at Imperial College Business School, 2026.

---

## Quick Start

### 1. Install dependencies

```bash
cd booklens
npm install
```

### 2. Run the app

```bash
npm start
```

The app will open at **http://localhost:3000**.

### 3. Try the built-in demo (no API key needed!)

The app ships with a hardcoded example so your whole team can run it immediately:

1. Type **Harry Potter** in the book field and select "Harry Potter and the Philosopher's Stone"
2. Enter **Hagrid** as the character
3. Enter **155** as the page number
4. Hit **Look up character →**
5. Tap **Paint their portrait** to see the demo portrait

This works without any API key or internet connection to Anthropic.

### 4. (Optional) Enable live AI lookups

To look up **any** character in **any** book, you'll need an Anthropic API key:

1. Go to [console.anthropic.com](https://console.anthropic.com/) and create an account
2. Generate an API key
3. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Open `.env` and replace `your-api-key-here` with your key
5. Restart the app (`npm start`)

---

## Try It Out

1. Type a book title (e.g. **A Game of Thrones — George R.R. Martin**)
2. Enter a character name (e.g. **Tyrion Lannister**)
3. Enter the page you're currently on (e.g. **150**)
4. Hit **Look up character →**
5. Optionally tap **Paint their portrait** to generate an AI illustration

---

## Installing as a PWA (Phone Demo)

To demo on a phone during your presentation:

1. Run `npm start` on your laptop
2. Find your laptop's local IP (e.g. `192.168.1.42`)
3. On your phone, open `http://192.168.1.42:3000`
4. In your phone's browser menu, tap **Add to Home Screen**
5. The app will appear on your home screen with its own icon and full-screen experience

---

## Tech Stack

- **Frontend**: React (single-page app)
- **AI (Bio generation)**: Claude API (Sonnet 4) with spoiler-aware prompt engineering
- **AI (Portrait)**: Claude API generating SVG illustrations from character descriptions
- **Design**: Heritage green + parchment + gold colour palette, mobile-first responsive layout
- **Fonts**: Source Serif 4, DM Mono, Instrument Sans (loaded from Google Fonts)

---

## Project Structure

```
booklens/
├── public/
│   ├── index.html          # HTML entry point with PWA meta tags
│   └── manifest.json       # PWA manifest for installability
├── src/
│   ├── index.js            # React entry point
│   └── BookLens.jsx        # The entire app (single component)
├── .env.example            # API key template
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

---

## Group Project Context

This is **Option 2: AI Product Prototyping** for the MBA elective module.

**Evaluation criteria:**
1. **Product vision** — Real pain point for readers of complex fiction
2. **Technical execution** — Functional MVP using Claude API with spoiler-aware prompt engineering
3. **Presentation** — Live demo on mobile device
4. **Insights** — Prompt engineering challenges around spoiler avoidance, "vibe coding" learnings

---

## Licence

Academic project — Imperial College Business School, MBA 2026.
