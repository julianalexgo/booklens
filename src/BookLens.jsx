import { useState, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const APP_NAME = "BookLens";

const POPULAR_BOOKS = [
  "A Game of Thrones — George R.R. Martin",
  "The Fellowship of the Ring — J.R.R. Tolkien",
  "The Two Towers — J.R.R. Tolkien",
  "The Return of the King — J.R.R. Tolkien",
  "Harry Potter and the Philosopher's Stone — J.K. Rowling",
  "Harry Potter and the Goblet of Fire — J.K. Rowling",
  "The Eye of the World — Robert Jordan",
  "The Name of the Wind — Patrick Rothfuss",
  "Dune — Frank Herbert",
  "The Way of Kings — Brandon Sanderson",
  "Gardens of the Moon — Steven Erikson",
  "The Blade Itself — Joe Abercrombie",
  "Assassin's Apprentice — Robin Hobb",
  "The Lies of Locke Lamora — Scott Lynch",
  "The Fifth Season — N.K. Jemisin",
];

// ─── Utility: Parse Claude API JSON ─────────────────────────────────────────
function parseClaudeJSON(text) {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔑 API KEY SETUP — TEAM MEMBERS: READ THIS!
// ═══════════════════════════════════════════════════════════════════════════════
//
// To use the app with LIVE AI lookups, you need an Anthropic API key:
//
//   1. Go to https://console.anthropic.com/ and create an account
//   2. Generate an API key
//   3. Create a file called ".env" in the project root (same folder as package.json)
//   4. Add this line to .env:    REACT_APP_CLAUDE_API_KEY=sk-ant-xxxxx-your-key-here
//   5. Restart the app (npm start)
//
// WITHOUT an API key, the app still works! It will show a hardcoded demo
// response when you search for "Hagrid" in "Harry Potter and the Philosopher's
// Stone" at page 155. Any other search will show a friendly "no API key" message.
//
// ═══════════════════════════════════════════════════════════════════════════════

const API_KEY = process.env.REACT_APP_CLAUDE_API_KEY;
const HAS_API_KEY = API_KEY && API_KEY !== "your-api-key-here" && API_KEY.length > 10;

// ─── Hardcoded demo data (works without API key) ────────────────────────────
const DEMO_EXAMPLE = {
  book: "Harry Potter and the Philosopher's Stone — J.K. Rowling",
  character: "Hagrid",
  page: "155",
  data: {
    name: "Rubeus Hagrid",
    aliases: ["Hagrid", "Keeper of Keys and Grounds at Hogwarts"],
    bio: "Hagrid is the enormous, warm-hearted Keeper of Keys and Grounds at Hogwarts School of Witchcraft and Wizardry. He was the one who delivered Harry's Hogwarts acceptance letter and introduced him to the wizarding world, taking him to Diagon Alley to buy his school supplies. He is fiercely loyal to Dumbledore and has a well-known soft spot for dangerous magical creatures.",
    appearance: "An absolute giant of a man, nearly twice the height of a normal person with a long, wild tangle of bushy black hair and a thick, shaggy beard that covers most of his face. He has kind, dark eyes that crinkle when he smiles, and wears a massive moleskin overcoat with an extraordinary number of pockets.",
    affiliation: "Hogwarts School of Witchcraft and Wizardry",
    lastEncounter: "Hagrid recently invited Harry, Ron, and Hermione to his hut for tea, where they noticed a newspaper clipping about a break-in at Gringotts vault 713 — the very vault Hagrid had emptied on the day he took Harry to Diagon Alley.",
    relationships: [
      "Loyal servant of Albus Dumbledore",
      "Close friend and protector of Harry Potter",
      "Friendly with Ron Weasley and Hermione Granger",
      "Owns a boarhound named Fang"
    ],
    status: "alive",
    imagePrompt: "A towering giant of a man in his 50s or 60s, standing nearly twelve feet tall with an enormous barrel-shaped body. Wild, long bushy black hair streaked with grey and a thick tangled black beard covering most of his weathered, ruddy face. Small dark eyes that are warm and kind. Wearing a heavy brown moleskin overcoat with many bulging pockets over rough clothing. Massive hands like dustbin lids. Holding a pink umbrella. Standing in front of a small wooden hut with smoke coming from the chimney. Painterly fantasy storybook illustration style, warm golden lighting."
  }
};

const DEMO_PORTRAIT_SVG = `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%"><stop offset="0%" stop-color="#4a6040"/><stop offset="100%" stop-color="#1a2a14"/></radialGradient>
    <radialGradient id="skin" cx="45%" cy="35%"><stop offset="0%" stop-color="#d4a878"/><stop offset="100%" stop-color="#b8845c"/></radialGradient>
  </defs>
  <rect width="300" height="400" fill="url(#bg)"/>
  <ellipse cx="150" cy="380" rx="120" ry="60" fill="#3a2820"/>
  <rect x="70" y="160" width="160" height="200" rx="20" fill="#5a3e28"/>
  <rect x="60" y="180" width="180" height="180" rx="10" fill="#6b4e34" opacity="0.8"/>
  <circle cx="150" cy="140" r="70" fill="url(#skin)"/>
  <ellipse cx="150" cy="120" rx="80" ry="60" fill="#2a1a10"/>
  <ellipse cx="150" cy="180" rx="60" ry="40" fill="#2a1a10"/>
  <circle cx="130" cy="135" r="8" fill="#1a1008"/>
  <circle cx="170" cy="135" r="8" fill="#1a1008"/>
  <circle cx="132" cy="133" r="3" fill="#f0e8d4"/>
  <circle cx="172" cy="133" r="3" fill="#f0e8d4"/>
  <ellipse cx="150" cy="148" rx="6" ry="4" fill="#c47848"/>
  <path d="M130 160 Q150 172 170 160" stroke="#f0e8d4" stroke-width="2" fill="none"/>
  <rect x="200" y="200" width="8" height="120" rx="4" fill="#d4a0b0" transform="rotate(10, 204, 260)"/>
  <text x="150" y="390" text-anchor="middle" font-family="Georgia" font-size="11" fill="#d4b445" opacity="0.6">Demo Portrait</text>
</svg>`;

// ─── Claude API caller ──────────────────────────────────────────────────────
async function callClaude(systemPrompt, userPrompt) {
  if (!HAS_API_KEY) {
    throw new Error("NO_API_KEY");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error: ${response.status} — ${err}`);
  }
  const data = await response.json();
  return data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

// ─── Check if a search matches the hardcoded demo ───────────────────────────
function isDemoMatch(book, character, page) {
  const b = book.toLowerCase();
  const c = character.toLowerCase();
  return (
    (b.includes("philosopher") || b.includes("sorcerer") || b.includes("harry potter")) &&
    c.includes("hagrid") &&
    page === "155"
  );
}

// ─── Generate character data (with demo fallback) ───────────────────────────
async function generateCharacterData(book, character, page) {
  // Check if this matches our hardcoded demo
  if (!HAS_API_KEY && isDemoMatch(book, character, page)) {
    // Simulate a brief loading delay for realism
    await new Promise((r) => setTimeout(r, 2000));
    return DEMO_EXAMPLE.data;
  }

  if (!HAS_API_KEY) {
    throw new Error(
      'No API key configured. To try the demo, search for "Hagrid" in "Harry Potter and the Philosopher\'s Stone" at page 155. Or add your API key to the .env file for live lookups.'
    );
  }

  const systemPrompt = `You are BookLens, an expert literary companion. Your CRITICAL rule: you must NEVER reveal any plot events, character developments, deaths, betrayals, revelations, or any story information that occurs AFTER page ${page} of "${book}". Treat page ${page} as an absolute wall — nothing beyond it exists. If the character has not appeared by page ${page}, say so clearly.`;
  const userPrompt = `The reader is on page ${page} of "${book}" and wants to remember the character "${character}".

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "name": "Character's full name",
  "aliases": ["any nicknames or titles known by page ${page}"],
  "bio": "A 2-4 sentence spoiler-free summary of who this character is, their role, and what the reader knows about them up to page ${page}. Written in present tense. Do NOT reveal anything that happens after page ${page}.",
  "appearance": "A vivid 1-2 sentence physical description based on how the author describes them in the book up to page ${page}. Include hair, eyes, build, notable features, clothing style. If appearance details haven't been given yet, make reasonable inferences from context.",
  "affiliation": "House, faction, group, or organisation they belong to by page ${page}",
  "lastEncounter": "A 1-2 sentence reminder of the most recent scene or moment this character appeared in, up to page ${page}. Describe what was happening and where, so the reader remembers when they last saw this character. Do NOT reveal anything after page ${page}.",
  "relationships": ["Key relationships known by page ${page}, e.g. 'Father of X', 'Sworn enemy of Y'"],
  "status": "alive / unknown / deceased — ONLY based on information up to page ${page}",
  "imagePrompt": "A detailed visual portrait prompt: describe the character's physical appearance in a painterly fantasy illustration style. Include age, ethnicity if described, hair colour and style, eye colour, facial features, build, clothing, and any signature items. Make it vivid enough to generate a portrait. Do NOT include the character name."
}`;
  const text = await callClaude(systemPrompt, userPrompt);
  return parseClaudeJSON(text);
}

// ─── Generate portrait SVG (with demo fallback) ─────────────────────────────
async function generatePortrait(imagePrompt) {
  // If no API key, return the hardcoded demo SVG portrait
  if (!HAS_API_KEY) {
    await new Promise((r) => setTimeout(r, 1500));
    const blob = new Blob([DEMO_PORTRAIT_SVG], { type: "image/svg+xml" });
    return URL.createObjectURL(blob);
  }

  const systemPrompt = `You are an expert SVG illustrator specialising in fantasy character portraits. You create beautiful, detailed SVG portraits in a painterly, storybook illustration style. Use rich gradients, layered shapes, and warm tones. The SVG should be 300x400 pixels. Return ONLY the raw SVG code, no markdown, no explanation, no backticks. Start directly with <svg>.`;
  const userPrompt = `Create a portrait illustration based on this description:\n\n${imagePrompt}\n\nStyle: Painterly fantasy book illustration. Rich warm colours, dramatic lighting, detailed facial features. Background should be a subtle dark vignette. Return ONLY the SVG code.`;
  const svgText = await callClaude(systemPrompt, userPrompt);
  const cleaned = svgText.replace(/```svg\n?/g, "").replace(/```xml\n?/g, "").replace(/```\n?/g, "").trim();
  const blob = new Blob([cleaned], { type: "image/svg+xml" });
  return URL.createObjectURL(blob);
}

// ─── Stamp divider ──────────────────────────────────────────────────────────
const StampDivider = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 24px", margin: "4px 0" }}>
    <div style={{ flex: 1, height: 1, background: "#5a7a4a" }} />
    <div style={{ color: "#d4b445", fontSize: 10, letterSpacing: 4, fontFamily: "'DM Mono', monospace" }}>✦ ✦ ✦</div>
    <div style={{ flex: 1, height: 1, background: "#5a7a4a" }} />
  </div>
);

// ─── Main App ───────────────────────────────────────────────────────────────
export default function BookLens() {
  const [book, setBook] = useState("");
  const [character, setCharacter] = useState("");
  const [page, setPage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [portraitUrl, setPortraitUrl] = useState(null);
  const [portraitLoading, setPortraitLoading] = useState(false);
  const [portraitError, setPortraitError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [view, setView] = useState("search"); // "search" or "result"

  const filteredBooks = POPULAR_BOOKS.filter((b) => b.toLowerCase().includes(book.toLowerCase()));

  const phases = [
    "Pulling the book from the shelf…",
    "Flipping through the pages…",
    "Cross-referencing the index…",
    "Writing up the card…",
  ];

  const handleSubmit = useCallback(async () => {
    if (!book.trim() || !character.trim() || !page.trim()) { setError("Please fill in all three fields."); return; }
    setError(null); setResult(null); setPortraitUrl(null); setPortraitError(null);
    setLoading(true); setLoadingPhase(0); setView("result");
    const phaseInterval = setInterval(() => { setLoadingPhase((p) => (p < 3 ? p + 1 : p)); }, 2800);
    try {
      const data = await generateCharacterData(book.trim(), character.trim(), page.trim());
      setResult(data);
      setHistory((prev) => [{ book: book.trim(), character: character.trim(), page: page.trim(), data, ts: Date.now() }, ...prev.slice(0, 9)]);
    } catch (e) { setError(e.message || "Something went wrong. Please try again."); setView("search"); }
    finally { clearInterval(phaseInterval); setLoading(false); }
  }, [book, character, page]);

  const loadFromHistory = (entry) => {
    setBook(entry.book); setCharacter(entry.character); setPage(entry.page);
    setResult(entry.data); setPortraitUrl(null); setPortraitError(null); setShowHistory(false); setView("result");
  };

  const handleGeneratePortrait = useCallback(async () => {
    if (!result?.imagePrompt) return;
    setPortraitLoading(true); setPortraitError(null);
    try { const url = await generatePortrait(result.imagePrompt); setPortraitUrl(url); }
    catch (e) { setPortraitError("Could not generate portrait. Try again."); }
    finally { setPortraitLoading(false); }
  }, [result]);

  const handleBack = () => {
    setView("search"); setResult(null); setPortraitUrl(null); setPortraitError(null);
  };

  const getStatusStyle = (status) => {
    if (!status) return { bg: "#3a5832", color: "#e0d0ae", border: "#5a7a4a" };
    const s = status.toLowerCase();
    if (s.includes("alive")) return { bg: "#1e3a22", color: "#4a8a5a", border: "#2a4a30" };
    if (s.includes("deceased") || s.includes("dead")) return { bg: "#3a2220", color: "#d48070", border: "#4a2a22" };
    return { bg: "#3a5832", color: "#e0d0ae", border: "#5a7a4a" };
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#1e3318",
      fontFamily: "'Source Serif 4', 'Georgia', serif",
      color: "#f0e8d4",
      maxWidth: 480,
      margin: "0 auto",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;0,400;0,600;0,700;1,400&family=DM+Mono:wght@300;400;500&family=Instrument+Sans:wght@400;500;600;700&display=swap');

        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes gentleSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes dotPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }

        input::placeholder { color: #8a7e62; }
        input:focus { border-color: #d4b445 !important; box-shadow: 0 0 0 3px rgba(212,180,69,0.15) !important; }
        .hipster-btn:hover { background: #c4a438 !important; }
        .hipster-btn:active { transform: scale(0.97); }
        .hipster-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .suggestion-hover:hover { background: #2e4828 !important; }
        .hist-item:hover { border-color: #d4b445 !important; background: #2a4224 !important; }
        .portrait-btn:hover { background: #d4b445 !important; color: #1a2816 !important; }
        .back-btn:hover { background: rgba(212,180,69,0.1) !important; }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #5a7a4a; border-radius: 3px; }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 24px 12px",
        borderBottom: "1px solid #4a6840",
      }}>
        {view === "result" ? (
          <button className="back-btn" onClick={handleBack} style={{
            background: "none", border: "none", padding: "4px 8px",
            fontFamily: "'DM Mono', monospace", fontSize: 12,
            color: "#d4b445", cursor: "pointer", display: "flex",
            alignItems: "center", gap: 6, letterSpacing: 0.5,
            borderRadius: 4, transition: "background 0.15s",
          }}>
            ← Back
          </button>
        ) : (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 3, color: "#c4b48e", textTransform: "uppercase" }}>
            Est. 2026
          </div>
        )}
        {history.length > 0 ? (
          <button onClick={() => setShowHistory(true)} style={{
            background: "none", border: "1px solid #5a7a4a", borderRadius: 4,
            padding: "4px 12px", fontFamily: "'DM Mono', monospace", fontSize: 10,
            letterSpacing: 2, color: "#e0d0ae", cursor: "pointer", textTransform: "uppercase",
          }}>
            History ({history.length})
          </button>
        ) : (
          <button disabled style={{
            background: "none", border: "1px solid #4a6840", borderRadius: 4,
            padding: "4px 12px", fontFamily: "'DM Mono', monospace", fontSize: 10,
            letterSpacing: 2, color: "#a8997a", cursor: "default", textTransform: "uppercase",
            opacity: 0.5,
          }}>
            History (0)
          </button>
        )}
      </div>

      {/* ═══════════════════ SEARCH VIEW ═══════════════════ */}
      {view === "search" && (
        <>

      {/* ── Header ── */}
      <div style={{ padding: "32px 24px 8px", textAlign: "center" }}>
        <div style={{
          display: "inline-block", border: "2px solid #d4b445", borderRadius: 50,
          padding: "6px 20px", marginBottom: 16,
        }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 4, color: "#d4b445", textTransform: "uppercase", fontWeight: 500 }}>
            {APP_NAME}
          </span>
        </div>

        <h1 style={{
          fontFamily: "'Instrument Sans', sans-serif", fontSize: 28, fontWeight: 700,
          color: "#f5eed8", margin: "0 0 6px", lineHeight: 1.15, letterSpacing: -0.5,
        }}>
          Character<br />Companion
        </h1>
        <p style={{
          fontFamily: "'Source Serif 4', serif", fontSize: 14, fontStyle: "italic",
          color: "#d4c4a0", margin: "0 0 4px",
        }}>
          Your spoiler-free reading sidekick
        </p>
      </div>

      <StampDivider />

      {/* ── Form ── */}
      <div style={{ padding: "20px 24px 16px" }}>
        <div style={{ marginBottom: 16, position: "relative" }}>
          <label style={{
            display: "block", fontFamily: "'DM Mono', monospace", fontSize: 10,
            letterSpacing: 2, textTransform: "uppercase", color: "#d4c4a0", marginBottom: 6,
          }}>
            What are you reading?
          </label>
          <input
            type="text" placeholder="e.g. A Game of Thrones" value={book}
            onChange={(e) => { setBook(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
            style={{
              width: "100%", padding: "12px 14px", background: "#243e1e",
              border: "1px solid #4a6840", borderRadius: 6, color: "#f0e8d4",
              fontSize: 16, fontFamily: "'Source Serif 4', serif", outline: "none",
              transition: "all 0.2s", boxSizing: "border-box",
            }}
          />
          {showSuggestions && book.length > 0 && filteredBooks.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0,
              background: "#223a1e", border: "1px solid #4a6840", borderRadius: 6,
              marginTop: 4, maxHeight: 200, overflowY: "auto", zIndex: 50,
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            }}>
              {filteredBooks.map((b, i) => (
                <div key={i} className="suggestion-hover"
                  onPointerDown={(e) => { e.preventDefault(); setBook(b); setShowSuggestions(false); }}
                  style={{
                    padding: "10px 14px", cursor: "pointer", fontSize: 14,
                    borderBottom: "1px solid #3e5a35", color: "#f0e8d4",
                    fontFamily: "'Source Serif 4', serif", transition: "background 0.15s",
                  }}>
                  {b}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: "block", fontFamily: "'DM Mono', monospace", fontSize: 10,
            letterSpacing: 2, textTransform: "uppercase", color: "#d4c4a0", marginBottom: 6,
          }}>
            Who are you looking for?
          </label>
          <input
            type="text" placeholder="e.g. Tyrion Lannister" value={character}
            onChange={(e) => setCharacter(e.target.value)}
            style={{
              width: "100%", padding: "12px 14px", background: "#243e1e",
              border: "1px solid #4a6840", borderRadius: 6, color: "#f0e8d4",
              fontSize: 16, fontFamily: "'Source Serif 4', serif", outline: "none",
              transition: "all 0.2s", boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: "0 0 90px" }}>
            <label style={{
              display: "block", fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: 2, textTransform: "uppercase", color: "#d4c4a0", marginBottom: 6,
            }}>
              Page
            </label>
            <input
              type="number" placeholder="150" value={page} min="1"
              onChange={(e) => setPage(e.target.value)}
              style={{
                width: "100%", padding: "12px 14px", background: "#243e1e",
                border: "1px solid #4a6840", borderRadius: 6, color: "#f0e8d4",
                fontSize: 16, fontFamily: "'DM Mono', monospace", outline: "none",
                transition: "all 0.2s", boxSizing: "border-box", textAlign: "center",
              }}
            />
          </div>
          <button className="hipster-btn" onClick={handleSubmit} disabled={loading} style={{
            flex: 1, padding: "12px 20px", background: "#d4b445", border: "none",
            borderRadius: 6, color: "#1a2816", fontSize: 14, fontFamily: "'Instrument Sans', sans-serif",
            fontWeight: 600, letterSpacing: 0.5, cursor: "pointer", transition: "all 0.2s",
          }}>
            {loading ? "Searching…" : "Look up character →"}
          </button>
        </div>
      </div>

      <StampDivider />

      {/* ── Error ── */}
      {error && (
        <div style={{
          margin: "8px 24px", padding: "12px 14px", background: "#3a2020",
          border: "1px solid #5a3028", borderRadius: 6, color: "#d48070",
          fontSize: 14, fontFamily: "'Source Serif 4', serif",
          animation: "fadeUp 0.3s ease-out",
        }}>
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {!result && !loading && !error && (
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#c4b48e", fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 12 }}>
            ↑
          </div>
          <div style={{
            fontSize: 15, color: "#d4c4a0", lineHeight: 1.7, maxWidth: 260,
            margin: "0 auto", fontFamily: "'Source Serif 4', serif", fontStyle: "italic",
          }}>
            Enter a book, a character, and the page you're on — we'll write you a spoiler-free card.
          </div>
        </div>
      )}

        </>
      )}

      {/* ═══════════════════ RESULT VIEW ═══════════════════ */}
      {view === "result" && (
        <div style={{ animation: "slideInRight 0.35s ease-out" }}>

      {/* ── Context bar ── */}
      <div style={{
        padding: "12px 24px", textAlign: "center",
        borderBottom: "1px solid #2a4224",
      }}>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1,
          color: "#8a9478",
        }}>
          Looking up <span style={{ color: "#d4b445" }}>{character}</span> in <span style={{ color: "#d4c4a0", fontStyle: "italic" }}>{book}</span> · p.{page}
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ padding: "48px 24px", textAlign: "center", animation: "fadeUp 0.3s ease-out" }}>
          <div style={{
            width: 56, height: 56, margin: "0 auto 20px", borderRadius: "50%",
            border: "2px solid #5a7a4a", borderTopColor: "#d4b445",
            animation: "gentleSpin 1.2s linear infinite",
          }} />
          <div style={{
            fontFamily: "'Source Serif 4', serif", fontSize: 16, fontStyle: "italic",
            color: "#e0d0ae", marginBottom: 6,
          }}>
            {phases[loadingPhase]}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 4, height: 4, borderRadius: "50%", background: "#d4b445",
                animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {result && !loading && (
        <div style={{ animation: "fadeUp 0.4s ease-out" }}>
          <div style={{
            margin: "8px 24px 16px", padding: "8px 14px",
            background: "#2a4225", border: "1px dashed #5a7a4a", borderRadius: 4,
            fontSize: 12, color: "#d4c4a0", textAlign: "center",
            fontFamily: "'DM Mono', monospace", letterSpacing: 0.5,
          }}>
            ⚠ Safe up to page {page}  ·  No spoilers beyond this point
          </div>

          <div style={{
            margin: "0 24px 20px", background: "#263d22",
            border: "1px solid #5a7a4a", borderRadius: 8,
            overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}>
            {/* Card header */}
            <div style={{
              padding: "20px 20px 16px", borderBottom: "1px solid #3e5a35",
              background: "linear-gradient(180deg, #263d22 0%, #223a1e 100%)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{
                    fontFamily: "'Instrument Sans', sans-serif", fontSize: 24,
                    fontWeight: 700, color: "#f5eed8", margin: "0 0 2px", letterSpacing: -0.3,
                  }}>
                    {result.name}
                  </h2>
                  {result.aliases && result.aliases.length > 0 && (
                    <div style={{
                      fontFamily: "'Source Serif 4', serif", fontSize: 13,
                      fontStyle: "italic", color: "#d4c4a0",
                    }}>
                      "{result.aliases.join('", "')}"
                    </div>
                  )}
                </div>
                {result.status && (() => {
                  const st = getStatusStyle(result.status);
                  return (
                    <span style={{
                      display: "inline-block", padding: "3px 10px",
                      borderRadius: 3, fontSize: 10, fontWeight: 500,
                      letterSpacing: 1.5, textTransform: "uppercase",
                      fontFamily: "'DM Mono', monospace",
                      background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                    }}>
                      {result.status}
                    </span>
                  );
                })()}
              </div>
              {result.affiliation && (
                <div style={{
                  marginTop: 8, display: "inline-block",
                  padding: "3px 10px", background: "#2e4a28",
                  border: "1px solid #4a6840", borderRadius: 3,
                  fontSize: 11, color: "#e0d0ae",
                  fontFamily: "'DM Mono', monospace", letterSpacing: 0.5,
                }}>
                  {result.affiliation}
                </div>
              )}
            </div>

            {/* Bio */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #3e5a35" }}>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2,
                textTransform: "uppercase", color: "#c4b48e", marginBottom: 8,
              }}>
                Who is this?
              </div>
              <div style={{
                fontSize: 15, lineHeight: 1.7, color: "#ece0c8",
                fontFamily: "'Source Serif 4', serif",
              }}>
                {result.bio}
              </div>
            </div>

            {/* Appearance */}
            {result.appearance && (
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #3e5a35" }}>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2,
                  textTransform: "uppercase", color: "#c4b48e", marginBottom: 8,
                }}>
                  Appearance
                </div>
                <div style={{
                  fontSize: 15, lineHeight: 1.7, color: "#ece0c8",
                  fontFamily: "'Source Serif 4', serif",
                }}>
                  {result.appearance}
                </div>
              </div>
            )}

            {/* First Mention */}
            {result.lastEncounter && (
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #3e5a35" }}>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2,
                  textTransform: "uppercase", color: "#c4b48e", marginBottom: 8,
                }}>
                  Last Encountered
                </div>
                <div style={{
                  fontSize: 15, lineHeight: 1.7, color: "#ece0c8",
                  fontFamily: "'Source Serif 4', serif",
                }}>
                  {result.lastEncounter}
                </div>
              </div>
            )}

            {/* Relationships */}
            {result.relationships && result.relationships.length > 0 && (
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #3e5a35" }}>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2,
                  textTransform: "uppercase", color: "#c4b48e", marginBottom: 10,
                }}>
                  Key Relationships
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.relationships.map((r, i) => (
                    <span key={i} style={{
                      display: "inline-block", padding: "5px 11px",
                      background: "#2a4224", border: "1px solid #d4b445",
                      borderRadius: 4, fontSize: 13, color: "#f0e8d4",
                      fontFamily: "'Source Serif 4', serif",
                    }}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Portrait section ── */}
            <div style={{ padding: "20px", background: "#1a2e16" }}>
              {portraitUrl ? (
                <div style={{ animation: "fadeUp 0.5s ease-out", textAlign: "center" }}>
                  <img src={portraitUrl} alt={`Portrait of ${result.name}`} style={{
                    width: "100%", maxWidth: 260, borderRadius: 8,
                    border: "1px solid #5a7a4a",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                  }} />
                  <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#c4b48e",
                    marginTop: 10, letterSpacing: 0.5,
                  }}>
                    AI-generated illustration
                  </div>
                  <div style={{
                    marginTop: 14, padding: "12px 14px", background: "#223a1c",
                    border: "1px solid #3e5a35", borderRadius: 6, textAlign: "left",
                  }}>
                    <div style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2,
                      textTransform: "uppercase", color: "#c4b48e", marginBottom: 6,
                    }}>
                      Prompt sent to image model
                    </div>
                    <div style={{
                      fontSize: 12, lineHeight: 1.6, color: "#d4c4a0", fontStyle: "italic",
                      fontFamily: "'Source Serif 4', serif",
                    }}>
                      {result.imagePrompt}
                    </div>
                  </div>
                </div>
              ) : portraitLoading ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{
                    width: 40, height: 40, margin: "0 auto 14px", borderRadius: "50%",
                    border: "2px solid #5a7a4a", borderTopColor: "#d4b445",
                    animation: "gentleSpin 1.2s linear infinite",
                  }} />
                  <div style={{
                    fontFamily: "'Source Serif 4', serif", fontSize: 14,
                    fontStyle: "italic", color: "#e0d0ae", marginBottom: 14,
                  }}>
                    Painting the portrait…
                  </div>
                  <div style={{
                    padding: "12px 14px", background: "#223a1c",
                    border: "1px solid #3e5a35", borderRadius: 6, textAlign: "left",
                  }}>
                    <div style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2,
                      textTransform: "uppercase", color: "#c4b48e", marginBottom: 6,
                    }}>
                      Prompt being sent
                    </div>
                    <div style={{
                      fontSize: 12, lineHeight: 1.6, color: "#d4c4a0", fontStyle: "italic",
                      fontFamily: "'Source Serif 4', serif",
                    }}>
                      {result.imagePrompt}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <div style={{
                    fontSize: 14, color: "#e0d0ae", marginBottom: 14,
                    fontFamily: "'Source Serif 4', serif",
                  }}>
                    Curious what <strong style={{ color: "#d4b445" }}>{result.name}</strong> looks like?
                  </div>
                  <button className="portrait-btn" onClick={handleGeneratePortrait} style={{
                    padding: "10px 24px", background: "transparent",
                    border: "2px solid #f0e8d4", borderRadius: 4,
                    color: "#f0e8d4", fontSize: 13,
                    fontFamily: "'DM Mono', monospace", fontWeight: 500,
                    letterSpacing: 1, cursor: "pointer",
                    transition: "all 0.2s", textTransform: "uppercase",
                  }}>
                    Paint their portrait
                  </button>
                  {portraitError && (
                    <div style={{ fontSize: 12, color: "#d48070", marginTop: 10 }}>
                      {portraitError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        </div>
      )}

      {/* ── Footer ── */}
      <StampDivider />
      <div style={{
        padding: "16px 24px 28px", textAlign: "center",
        fontFamily: "'DM Mono', monospace", fontSize: 10,
        letterSpacing: 1.5, color: "#a8997a",
      }}>
        {APP_NAME} · Imperial College MBA 2026
      </div>

      {/* ── History Drawer ── */}
      {showHistory && (
        <>
          <div onClick={() => setShowHistory(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(2px)", zIndex: 99,
          }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0,
            width: "min(340px, 85vw)", background: "#1e3318",
            borderLeft: "1px solid #5a7a4a", padding: "24px 20px",
            overflowY: "auto", zIndex: 100,
            boxShadow: "-4px 0 24px rgba(0,0,0,0.1)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{
                fontFamily: "'Instrument Sans', sans-serif", fontSize: 18,
                fontWeight: 700, color: "#f5eed8", margin: 0,
              }}>
                Recent lookups
              </h3>
              <button onClick={() => setShowHistory(false)} style={{
                background: "none", border: "none", color: "#d4c4a0",
                fontSize: 18, cursor: "pointer", padding: "4px 8px",
              }}>
                ✕
              </button>
            </div>
            {history.map((entry) => (
              <div key={entry.ts} className="hist-item" onClick={() => loadFromHistory(entry)} style={{
                padding: "12px 14px", background: "#263d22",
                border: "1px solid #4a6840", borderRadius: 6,
                marginBottom: 8, cursor: "pointer", transition: "all 0.15s",
              }}>
                <div style={{
                  fontFamily: "'Instrument Sans', sans-serif", fontSize: 15,
                  fontWeight: 600, color: "#f5eed8",
                }}>
                  {entry.data.name}
                </div>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 11,
                  color: "#c4b48e", marginTop: 3, letterSpacing: 0.3,
                }}>
                  {entry.book} · p.{entry.page}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
