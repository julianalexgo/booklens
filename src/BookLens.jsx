import { useState, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const APP_NAME = "BookLens";

const BOOK_DATABASE = [
  { title: "A Game of Thrones", author: "George R.R. Martin", year: 1996 },
  { title: "A Clash of Kings", author: "George R.R. Martin", year: 1998 },
  { title: "A Storm of Swords", author: "George R.R. Martin", year: 2000 },
  { title: "The Fellowship of the Ring", author: "J.R.R. Tolkien", year: 1954 },
  { title: "The Two Towers", author: "J.R.R. Tolkien", year: 1954 },
  { title: "The Return of the King", author: "J.R.R. Tolkien", year: 1955 },
  { title: "The Hobbit", author: "J.R.R. Tolkien", year: 1937 },
  { title: "Harry Potter and the Philosopher's Stone", author: "J.K. Rowling", year: 1997 },
  { title: "Harry Potter and the Chamber of Secrets", author: "J.K. Rowling", year: 1998 },
  { title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling", year: 1999 },
  { title: "Harry Potter and the Goblet of Fire", author: "J.K. Rowling", year: 2000 },
  { title: "Harry Potter and the Order of the Phoenix", author: "J.K. Rowling", year: 2003 },
  { title: "Harry Potter and the Half-Blood Prince", author: "J.K. Rowling", year: 2005 },
  { title: "Harry Potter and the Deathly Hallows", author: "J.K. Rowling", year: 2007 },
  { title: "The Eye of the World", author: "Robert Jordan", year: 1990 },
  { title: "The Great Hunt", author: "Robert Jordan", year: 1990 },
  { title: "The Name of the Wind", author: "Patrick Rothfuss", year: 2007 },
  { title: "The Wise Man's Fear", author: "Patrick Rothfuss", year: 2011 },
  { title: "Dune", author: "Frank Herbert", year: 1965 },
  { title: "Dune Messiah", author: "Frank Herbert", year: 1969 },
  { title: "The Way of Kings", author: "Brandon Sanderson", year: 2010 },
  { title: "Words of Radiance", author: "Brandon Sanderson", year: 2014 },
  { title: "Mistborn: The Final Empire", author: "Brandon Sanderson", year: 2006 },
  { title: "Gardens of the Moon", author: "Steven Erikson", year: 1999 },
  { title: "The Blade Itself", author: "Joe Abercrombie", year: 2006 },
  { title: "Assassin's Apprentice", author: "Robin Hobb", year: 1995 },
  { title: "The Lies of Locke Lamora", author: "Scott Lynch", year: 2006 },
  { title: "The Fifth Season", author: "N.K. Jemisin", year: 2015 },
  { title: "American Gods", author: "Neil Gaiman", year: 2001 },
  { title: "Good Omens", author: "Terry Pratchett & Neil Gaiman", year: 1990 },
  { title: "The Colour of Magic", author: "Terry Pratchett", year: 1983 },
  { title: "Neuromancer", author: "William Gibson", year: 1984 },
  { title: "The Hitchhiker's Guide to the Galaxy", author: "Douglas Adams", year: 1979 },
  { title: "Ender's Game", author: "Orson Scott Card", year: 1985 },
  { title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", year: 1969 },
  { title: "A Wizard of Earthsea", author: "Ursula K. Le Guin", year: 1968 },
  { title: "The Lion, the Witch and the Wardrobe", author: "C.S. Lewis", year: 1950 },
  { title: "His Dark Materials: Northern Lights", author: "Philip Pullman", year: 1995 },
  { title: "The Priory of the Orange Tree", author: "Samantha Shannon", year: 2019 },
  { title: "Piranesi", author: "Susanna Clarke", year: 2020 },
  { title: "Jonathan Strange & Mr Norrell", author: "Susanna Clarke", year: 2004 },
];

// Legacy format for the character lookup autocomplete
const POPULAR_BOOKS = BOOK_DATABASE.map(b => `${b.title} — ${b.author}`);

// ─── Utility: Parse Claude API JSON ─────────────────────────────────────────
function parseClaudeJSON(text) {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔑 API KEY SETUP — TEAM MEMBERS: READ THIS!
// ═══════════════════════════════════════════════════════════════════════════════
//
// WITHOUT an API key, the app still works! Two demo flows are hardcoded:
//   1. "Hagrid" in "Harry Potter and the Philosopher's Stone" at page 155
//   2. "Smeagol" in "The Two Towers" at page 250
// These include character cards, portraits, and book recommendations.
//
// To enable LIVE lookups for any character, you need an Anthropic API key:
//   1. Go to https://console.anthropic.com/ and create an account
//   2. Generate an API key
//   3. Create a file called ".env" in the project root (same folder as package.json)
//   4. Add this line:  REACT_APP_CLAUDE_API_KEY=sk-ant-xxxxx-your-key-here
//   5. Restart the app (npm start)
//
// ═══════════════════════════════════════════════════════════════════════════════

const API_KEY = process.env.REACT_APP_CLAUDE_API_KEY;
const HAS_API_KEY = API_KEY && API_KEY !== "your-api-key-here" && API_KEY.length > 10;

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

// ─── Generate character data ────────────────────────────────────────────────
// ─── Demo character data ─────────────────────────────────────────────────────
const DEMO_CHARACTERS = {
  hagrid: {
    name: "Rubeus Hagrid",
    aliases: ["Hagrid", "Keeper of Keys and Grounds at Hogwarts"],
    bio: "Hagrid is the enormous, warm-hearted Keeper of Keys and Grounds at Hogwarts School of Witchcraft and Wizardry. He was the one who delivered Harry's Hogwarts acceptance letter and introduced him to the wizarding world, taking him to Diagon Alley to buy his school supplies. He is fiercely loyal to Dumbledore and has a well-known soft spot for dangerous magical creatures.",
    appearance: "An absolute giant of a man, nearly twice the height of a normal person with a long, wild tangle of bushy black hair and a thick, shaggy beard that covers most of his face. He has kind, dark eyes that crinkle when he smiles, and wears a massive moleskin overcoat with an extraordinary number of pockets.",
    affiliation: "Hogwarts School of Witchcraft and Wizardry",
    lastEncounter: "Hagrid recently invited Harry, Ron, and Hermione to his hut for tea, where they noticed a newspaper clipping about a break-in at Gringotts vault 713 — the very vault Hagrid had emptied on the day he took Harry to Diagon Alley.",
    relationships: ["Loyal servant of Albus Dumbledore", "Close friend and protector of Harry Potter", "Friendly with Ron Weasley and Hermione Granger", "Owns a boarhound named Fang"],
    status: "alive",
    imagePrompt: "A towering giant of a man in his 50s or 60s, standing nearly twelve feet tall with an enormous barrel-shaped body. Wild, long bushy black hair streaked with grey and a thick tangled black beard covering most of his weathered, ruddy face. Small dark eyes that are warm and kind. Wearing a heavy brown moleskin overcoat with many bulging pockets over rough clothing. Massive hands like dustbin lids. Holding a pink umbrella. Painterly fantasy storybook illustration style, warm golden lighting."
  },
  smeagol: {
    name: "Sméagol / Gollum",
    aliases: ["Gollum", "Sméagol", "Slinker", "Stinker", "My Precious"],
    bio: "Sméagol is a wretched, pitiable creature twisted by centuries of possessing the One Ring. Once a Hobbit-like river-dweller, he murdered his cousin Déagol to claim the Ring and was driven into the dark caves beneath the Misty Mountains. Now he follows the Fellowship — and later Frodo and Sam — consumed by his desperate desire to reclaim what he calls 'my Precious'. He speaks to himself in two voices: the fawning, eager-to-please Sméagol and the cruel, scheming Gollum.",
    appearance: "A thin, wiry creature with pale, clammy skin that seems to glow faintly in the dark. He has enormous, luminous eyes that catch the light like lamps, a few wisps of thin hair clinging to his bony skull, and long, dexterous fingers. He is emaciated and stooped, moving on all fours with an unsettling spider-like agility. He wears nothing but a ragged loincloth.",
    affiliation: "None — a solitary outcast",
    lastEncounter: "Sméagol has been captured by Frodo and Sam after stalking them through the Emyn Muil. Frodo has shown him mercy and made him swear on the Precious to serve as their guide to Mordor. He is now leading them through the Dead Marshes, seemingly torn between genuine gratitude toward Frodo and his ceaseless hunger for the Ring.",
    relationships: ["Bound to serve Frodo Baggins as guide", "Deeply distrusted by Samwise Gamgee", "Formerly possessed the One Ring for nearly 500 years", "Murdered his cousin Déagol for the Ring"],
    status: "alive",
    imagePrompt: "A gaunt, emaciated creature crouching on all fours, with enormous round pale eyes that glow in the dark. Thin, clammy greyish-white skin stretched over bony limbs. A few wisps of thin pale hair on a nearly bald skull. Long spindly fingers with sharp nails. An expression caught between pitiful sadness and cunning hunger. Dark cave background with faint reflections of water. Painterly fantasy storybook illustration style, cold blue-grey tones with a hint of golden light reflecting in his eyes."
  },
};

const DEMO_RECOMMENDATIONS = {
  hagrid: [
    { title: "The Hobbit", author: "J.R.R. Tolkien", year: 1937, reason: "Features Gandalf — a similarly warm, mysterious, and powerful mentor figure who guides a reluctant hero on an epic quest." },
    { title: "A Wizard of Earthsea", author: "Ursula K. Le Guin", year: 1968, reason: "Ogion the Silent shares Hagrid's gentle wisdom and deep connection to the natural world, mentoring a young wizard finding his power." },
    { title: "Guards! Guards!", author: "Terry Pratchett", year: 1989, reason: "Captain Vimes has Hagrid's big heart and fierce loyalty, protecting his city with the same stubborn devotion Hagrid shows to Dumbledore and Harry." },
  ],
  smeagol: [
    { title: "Frankenstein", author: "Mary Shelley", year: 1818, reason: "Shelley's creature shares Sméagol's tragic arc — a being driven to darkness by isolation and rejection, yet capable of moments of surprising tenderness and longing for connection." },
    { title: "The Strange Case of Dr Jekyll and Mr Hyde", author: "Robert Louis Stevenson", year: 1886, reason: "The duality of Jekyll and Hyde mirrors Sméagol and Gollum perfectly — two identities wrestling for control of one body, one clinging to goodness and the other consumed by obsession." },
    { title: "Wuthering Heights", author: "Emily Brontë", year: 1847, reason: "Heathcliff's all-consuming obsession with Catherine echoes the way the Ring warps Sméagol's love into possession, transforming devotion into something destructive." },
  ],
};

function getDemoCharacterKey(book, character) {
  const b = book.toLowerCase(), c = character.toLowerCase();
  if (c.includes("hagrid") && (b.includes("harry potter") || b.includes("philosopher") || b.includes("sorcerer"))) return "hagrid";
  if ((c.includes("smeagol") || c.includes("sméagol") || c.includes("gollum")) && (b.includes("two towers") || b.includes("lord of the rings") || b.includes("tolkien"))) return "smeagol";
  return null;
}

function getDemoRecommendations(characterName) {
  if (!characterName) return null;
  const name = characterName.toLowerCase();
  if (name.includes("hagrid")) return DEMO_RECOMMENDATIONS.hagrid;
  if (name.includes("smeagol") || name.includes("sméagol") || name.includes("gollum")) return DEMO_RECOMMENDATIONS.smeagol;
  return null;
}

// ─── Generate character data (with demo fallback) ───────────────────────────
async function generateCharacterData(book, character, page) {
  const demoKey = getDemoCharacterKey(book, character);
  if (!HAS_API_KEY && demoKey) {
    await new Promise((r) => setTimeout(r, 2000));
    return DEMO_CHARACTERS[demoKey];
  }
  if (!HAS_API_KEY) {
    throw new Error('No API key configured. Try the demo:\n• "Hagrid" in "Harry Potter and the Philosopher\'s Stone" (page 155)\n• "Smeagol" in "The Two Towers" (page 250)\nOr add your API key to the .env file for live lookups.');
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

// ─── Generate portrait SVG ──────────────────────────────────────────────────
// ─── Demo portrait URLs (for presentation) ─────────────────────────────────
const DEMO_PORTRAITS = {
  hagrid: "https://raw.githubusercontent.com/julianalexgo/booklens/refs/heads/main/DemoImages/ChatGPT%20Image%20Mar%2015%2C%202026%2C%2008_09_51%20AM.png",
  smeagol: "https://raw.githubusercontent.com/julianalexgo/booklens/refs/heads/main/DemoImages/ChatGPT%20Image%20Mar%2015%2C%202026%2C%2008_16_28%20AM.png",
  gollum: "https://raw.githubusercontent.com/julianalexgo/booklens/refs/heads/main/DemoImages/ChatGPT%20Image%20Mar%2015%2C%202026%2C%2008_16_28%20AM.png",
  // denna: "URL_HERE",  // ← Add Denna's URL when ready
};

function getDemoPortrait(characterName) {
  if (!characterName) return null;
  const name = characterName.toLowerCase();
  for (const [key, url] of Object.entries(DEMO_PORTRAITS)) {
    if (name.includes(key)) return url;
  }
  return null;
}

async function generatePortrait(imagePrompt, characterName) {
  // Check for a demo portrait first
  const demoUrl = getDemoPortrait(characterName);
  if (demoUrl) {
    await new Promise((r) => setTimeout(r, 800));
    // Try to fetch and convert to blob URL (works around CSP restrictions in iframes)
    try {
      const resp = await fetch(demoUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        return URL.createObjectURL(blob);
      }
    } catch {
      // If fetch fails, return the URL directly — browser may still load it
    }
    return demoUrl;
  }

  if (!HAS_API_KEY) {
    throw new Error("No portrait available without API key.");
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
  const [recommendations, setRecommendations] = useState(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [view, setView] = useState("search"); // "search", "result", or "reading-list"

  // Reading list state
  const [readingList, setReadingList] = useState([]);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [rlFilter, setRlFilter] = useState("all");
  const [showRlSuggestions, setShowRlSuggestions] = useState(false);

  const filteredRlBooks = BOOK_DATABASE.filter((b) =>
    newBookTitle.length > 0 &&
    (b.title.toLowerCase().includes(newBookTitle.toLowerCase()) ||
     b.author.toLowerCase().includes(newBookTitle.toLowerCase())) &&
    !readingList.some((r) => r.title === b.title && r.author === b.author)
  ); // "all", "want to read", "reading", "finished"

  const filteredBooks = POPULAR_BOOKS.filter((b) => b.toLowerCase().includes(book.toLowerCase()));

  const phases = [
    "Pulling the book from the shelf…",
    "Flipping through the pages…",
    "Cross-referencing the index…",
    "Writing up the card…",
  ];

  const handleSubmit = useCallback(async (isPageUpdate = false) => {
    if (!book.trim() || !character.trim() || !page.trim()) { setError("Please fill in all three fields."); return; }
    setError(null); setResult(null); setPortraitUrl(null); setPortraitError(null);
    setRecommendations(null); setRecsError(null);
    setLoading(true); setLoadingPhase(0); setView("result");
    const phaseInterval = setInterval(() => { setLoadingPhase((p) => (p < 3 ? p + 1 : p)); }, 2800);
    try {
      const data = await generateCharacterData(book.trim(), character.trim(), page.trim());
      setResult(data);
      if (isPageUpdate) {
        // Update the existing history entry for this book+character instead of adding a new one
        setHistory((prev) => prev.map((h) =>
          h.book === book.trim() && h.character === character.trim()
            ? { ...h, page: page.trim(), data, ts: Date.now() }
            : h
        ));
      } else {
        // Fresh lookup — add new history entry (or update if same book+character already exists)
        setHistory((prev) => {
          const existingIdx = prev.findIndex((h) => h.book === book.trim() && h.character === character.trim());
          if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = { ...updated[existingIdx], page: page.trim(), data, ts: Date.now() };
            return [updated[existingIdx], ...updated.filter((_, i) => i !== existingIdx)].slice(0, 10);
          }
          return [{ book: book.trim(), character: character.trim(), page: page.trim(), data, ts: Date.now() }, ...prev.slice(0, 9)];
        });
      }
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
    try { const url = await generatePortrait(result.imagePrompt, result.name); setPortraitUrl(url); }
    catch (e) { setPortraitError("Could not generate portrait. Try again."); }
    finally { setPortraitLoading(false); }
  }, [result]);

  const handleGetRecommendations = useCallback(async () => {
    if (!result) return;
    setRecsLoading(true); setRecsError(null);
    try {
      // Check for demo recommendations first
      const demoRecs = getDemoRecommendations(result.name);
      if (!HAS_API_KEY && demoRecs) {
        await new Promise((r) => setTimeout(r, 1500));
        setRecommendations(demoRecs);
        return;
      }
      if (!HAS_API_KEY) {
        throw new Error("NO_API_KEY");
      }
      const sys = `You are BookLens, a literary recommendation engine. Return ONLY valid JSON, no markdown.`;
      const usr = `The reader just looked up "${result.name}" from "${book}". Based on this character's traits — their personality, role in the story, and what makes them memorable — recommend exactly 3 books from other series that feature a similar type of character.

Return ONLY this JSON format:
[
  {"title":"Book Title","author":"Author Name","year":1999,"reason":"1-2 sentences explaining which character in this book is similar and why the reader would enjoy them."}
]`;
      const text = await callClaude(sys, usr);
      setRecommendations(parseClaudeJSON(text));
    } catch (e) {
      // Last resort: try demo recommendations on any error
      const demoRecs = getDemoRecommendations(result.name);
      if (demoRecs) { setRecommendations(demoRecs); }
      else { setRecsError("Could not load recommendations. Try again."); }
    } finally { setRecsLoading(false); }
  }, [result, book]);

  const addRecommendationToReadingList = (rec) => {
    if (readingList.some((r) => r.title === rec.title && r.author === rec.author)) return;
    setReadingList((prev) => [
      { id: Date.now(), title: rec.title, author: rec.author, year: rec.year, status: "want to read" },
      ...prev,
    ]);
  };

  const isOnReadingList = (rec) => readingList.some((r) => r.title === rec.title && r.author === rec.author);

  const handleBack = () => {
    setView("search"); setResult(null); setPortraitUrl(null); setPortraitError(null);
    setRecommendations(null); setRecsError(null);
  };

  // Reading list functions
  const addToReadingList = () => {
    if (!newBookTitle.trim()) return;
    // Check if typed text matches a known book
    const match = BOOK_DATABASE.find((b) =>
      b.title.toLowerCase() === newBookTitle.trim().toLowerCase()
    );
    if (match) {
      addBookFromSuggestion(match);
    } else {
      setReadingList((prev) => [
        { id: Date.now(), title: newBookTitle.trim(), author: "Unknown author", year: null, status: "want to read" },
        ...prev,
      ]);
      setNewBookTitle("");
    }
  };

  const addBookFromSuggestion = (bookObj) => {
    // Prevent duplicates
    if (readingList.some((r) => r.title === bookObj.title && r.author === bookObj.author)) return;
    setReadingList((prev) => [
      { id: Date.now(), title: bookObj.title, author: bookObj.author, year: bookObj.year, status: "want to read" },
      ...prev,
    ]);
    setNewBookTitle("");
    setShowRlSuggestions(false);
  };

  const cycleBookStatus = (id) => {
    const order = ["want to read", "reading", "finished"];
    setReadingList((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const next = order[(order.indexOf(b.status) + 1) % order.length];
        return { ...b, status: next };
      })
    );
  };

  const removeFromReadingList = (id) => {
    setReadingList((prev) => prev.filter((b) => b.id !== id));
  };

  const bookStatusStyle = (status) => {
    if (status === "reading") return { bg: "#2a4a30", color: "#d4b445", border: "#4a6840", label: "📖 Reading" };
    if (status === "finished") return { bg: "#1e3a22", color: "#4a8a5a", border: "#2a4a30", label: "✓ Finished" };
    return { bg: "#3a3520", color: "#d4c4a0", border: "#5a5030", label: "☆ Want to read" };
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
        .rl-item:hover { border-color: #5a7a4a !important; }
        .rl-status:hover { opacity: 0.8; }
        .rl-remove:hover { color: #d48070 !important; }

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
        {view === "result" || view === "reading-list" ? (
          <button className="back-btn" onClick={() => { if (view === "result") handleBack(); else setView("search"); }} style={{
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
        <div style={{ display: "flex", gap: 8 }}>
          {view !== "reading-list" && (
            <button onClick={() => setView("reading-list")} style={{
              background: "none", border: "1px solid #5a7a4a", borderRadius: 4,
              padding: "4px 10px", fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: 1, color: "#d4b445", cursor: "pointer", textTransform: "uppercase",
            }}>
              📚 {readingList.length}
            </button>
          )}
          {history.length > 0 ? (
            <button onClick={() => { setShowHistory(true); }} style={{
              background: "none", border: "1px solid #5a7a4a", borderRadius: 4,
              padding: "4px 10px", fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: 2, color: "#e0d0ae", cursor: "pointer", textTransform: "uppercase",
            }}>
              History ({history.length})
            </button>
          ) : (
            <button disabled style={{
              background: "none", border: "1px solid #4a6840", borderRadius: 4,
              padding: "4px 10px", fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: 2, color: "#a8997a", cursor: "default", textTransform: "uppercase",
              opacity: 0.5,
            }}>
              History (0)
            </button>
          )}
        </div>
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
          <button className="hipster-btn" onClick={() => handleSubmit(false)} disabled={loading} style={{
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
          Looking up <span style={{ color: "#d4b445" }}>{character}</span> in <span style={{ color: "#d4c4a0", fontStyle: "italic" }}>{book}</span>
        </div>
      </div>

      {/* ── Page number editor ── */}
      {!loading && result && (
        <div style={{
          padding: "14px 24px", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 10,
        }}>
          <label style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1.5,
            textTransform: "uppercase", color: "#c4b48e",
          }}>
            Page
          </label>
          <input
            type="number" min="1" value={page}
            onChange={(e) => setPage(e.target.value)}
            style={{
              width: 70, padding: "8px 10px", background: "#243e1e",
              border: "1px solid #4a6840", borderRadius: 6, color: "#d4b445",
              fontSize: 16, fontFamily: "'DM Mono', monospace", outline: "none",
              textAlign: "center", boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
          />
          <button className="hipster-btn" onClick={() => handleSubmit(true)} style={{
            padding: "8px 16px", background: "#d4b445", border: "none",
            borderRadius: 6, color: "#1a2816", fontSize: 12,
            fontFamily: "'DM Mono', monospace", fontWeight: 500,
            letterSpacing: 1, cursor: "pointer", transition: "all 0.2s",
            textTransform: "uppercase",
          }}>
            Update ↻
          </button>
        </div>
      )}

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
                  <img src={portraitUrl} alt={`Portrait of ${result.name}`}
                    crossOrigin="anonymous"
                    onError={(e) => {
                      // If the image URL fails to load, hide it gracefully
                      e.target.style.display = "none";
                    }}
                    style={{
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

      {/* ── Recommendations ── */}
      {result && !loading && (
        <div style={{ padding: "0 24px 20px" }}>
          <StampDivider />
          {!recommendations && !recsLoading ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{
                fontSize: 14, color: "#d4c4a0", marginBottom: 12,
                fontFamily: "'Source Serif 4', serif",
              }}>
                Enjoyed <strong style={{ color: "#d4b445" }}>{result.name}</strong>? Find similar characters in other books.
              </div>
              <button className="portrait-btn" onClick={handleGetRecommendations} style={{
                padding: "10px 24px", background: "transparent",
                border: "2px solid #f0e8d4", borderRadius: 4,
                color: "#f0e8d4", fontSize: 13,
                fontFamily: "'DM Mono', monospace", fontWeight: 500,
                letterSpacing: 1, cursor: "pointer",
                transition: "all 0.2s", textTransform: "uppercase",
              }}>
                Find similar characters
              </button>
              {recsError && (
                <div style={{ fontSize: 12, color: "#d48070", marginTop: 10 }}>{recsError}</div>
              )}
            </div>
          ) : recsLoading ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{
                width: 36, height: 36, margin: "0 auto 12px", borderRadius: "50%",
                border: "2px solid #5a7a4a", borderTopColor: "#d4b445",
                animation: "gentleSpin 1.2s linear infinite",
              }} />
              <div style={{
                fontFamily: "'Source Serif 4', serif", fontSize: 14,
                fontStyle: "italic", color: "#e0d0ae",
              }}>
                Finding similar characters…
              </div>
            </div>
          ) : recommendations && (
            <div style={{ paddingTop: 12 }}>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2,
                textTransform: "uppercase", color: "#c4b48e", marginBottom: 12,
                textAlign: "center",
              }}>
                If you liked {result.name}, try…
              </div>
              {recommendations.map((rec, i) => {
                const alreadyAdded = isOnReadingList(rec);
                return (
                  <div key={i} style={{
                    padding: "14px 16px", background: "#263d22",
                    border: "1px solid #4a6840", borderRadius: 8,
                    marginBottom: 10,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontFamily: "'Source Serif 4', serif", fontSize: 15,
                          fontWeight: 600, color: "#f5eed8", lineHeight: 1.4,
                        }}>
                          {rec.title}
                        </div>
                        <div style={{
                          fontFamily: "'DM Mono', monospace", fontSize: 11,
                          color: "#c4b48e", marginTop: 3, letterSpacing: 0.3,
                        }}>
                          {rec.author}{rec.year ? ` · ${rec.year}` : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => addRecommendationToReadingList(rec)}
                        disabled={alreadyAdded}
                        style={{
                          padding: "5px 10px", flexShrink: 0,
                          background: alreadyAdded ? "#1e3a22" : "#d4b445",
                          border: alreadyAdded ? "1px solid #2a4a30" : "none",
                          borderRadius: 4, fontSize: 11, fontWeight: 600,
                          fontFamily: "'DM Mono', monospace",
                          color: alreadyAdded ? "#4a8a5a" : "#1a2816",
                          cursor: alreadyAdded ? "default" : "pointer",
                          letterSpacing: 0.5, transition: "all 0.2s",
                        }}
                      >
                        {alreadyAdded ? "✓ Added" : "+ Add"}
                      </button>
                    </div>
                    <div style={{
                      fontSize: 13, lineHeight: 1.6, color: "#c4b48e",
                      fontFamily: "'Source Serif 4', serif", fontStyle: "italic",
                      marginTop: 8,
                    }}>
                      {rec.reason}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

        </div>
      )}

      {/* ═══════════════════ READING LIST VIEW ═══════════════════ */}
      {view === "reading-list" && (
        <div style={{ animation: "slideInRight 0.35s ease-out" }}>

          {/* Title */}
          <div style={{ padding: "24px 24px 4px" }}>
            <h2 style={{
              fontFamily: "'Instrument Sans', sans-serif", fontSize: 24,
              fontWeight: 700, color: "#f5eed8", margin: "0 0 4px", letterSpacing: -0.3,
            }}>
              📚 My Reading List
            </h2>
            <p style={{
              fontFamily: "'Source Serif 4', serif", fontSize: 13,
              fontStyle: "italic", color: "#8a9478", margin: 0,
            }}>
              Track the books on your shelf
            </p>
          </div>

          <StampDivider />

          {/* Add book input with autocomplete */}
          <div style={{ padding: "16px 24px", position: "relative" }}>
            <label style={{
              display: "block", fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: 2, textTransform: "uppercase", color: "#d4c4a0", marginBottom: 6,
            }}>
              Search for a book to add
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  type="text"
                  placeholder="Start typing a title or author…"
                  value={newBookTitle}
                  onChange={(e) => { setNewBookTitle(e.target.value); setShowRlSuggestions(true); }}
                  onFocus={() => setShowRlSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowRlSuggestions(false), 300)}
                  onKeyDown={(e) => { if (e.key === "Enter") addToReadingList(); }}
                  style={{
                    width: "100%", padding: "12px 14px", background: "#243e1e",
                    border: "1px solid #4a6840", borderRadius: 6, color: "#f0e8d4",
                    fontSize: 15, fontFamily: "'Source Serif 4', serif", outline: "none",
                    transition: "all 0.2s", boxSizing: "border-box",
                  }}
                />
                {showRlSuggestions && filteredRlBooks.length > 0 && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0,
                    background: "#223a1e", border: "1px solid #4a6840", borderRadius: 6,
                    marginTop: 4, maxHeight: 220, overflowY: "auto", zIndex: 50,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                  }}>
                    {filteredRlBooks.slice(0, 8).map((b, i) => (
                      <div key={i} className="suggestion-hover"
                        onPointerDown={(e) => { e.preventDefault(); addBookFromSuggestion(b); }}
                        style={{
                          padding: "10px 14px", cursor: "pointer",
                          borderBottom: "1px solid #3e5a35",
                          transition: "background 0.15s",
                        }}>
                        <div style={{ fontSize: 14, color: "#f0e8d4", fontFamily: "'Source Serif 4', serif" }}>
                          {b.title}
                        </div>
                        <div style={{ fontSize: 11, color: "#8a9478", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
                          {b.author} · {b.year}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={addToReadingList} style={{
                padding: "12px 18px", background: "#d4b445", border: "none",
                borderRadius: 6, color: "#1a2816", fontSize: 14, fontWeight: 600,
                fontFamily: "'Instrument Sans', sans-serif", cursor: "pointer",
                whiteSpace: "nowrap", transition: "all 0.2s", alignSelf: "flex-start",
              }}>
                + Add
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          {readingList.length > 0 && (
            <div style={{ padding: "0 24px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["all", "want to read", "reading", "finished"].map((f) => {
                const active = rlFilter === f;
                const count = f === "all" ? readingList.length : readingList.filter((b) => b.status === f).length;
                return (
                  <button key={f} onClick={() => setRlFilter(f)} style={{
                    padding: "5px 12px", borderRadius: 20,
                    background: active ? "#d4b445" : "transparent",
                    border: active ? "1px solid #d4b445" : "1px solid #4a6840",
                    color: active ? "#1a2816" : "#c4b48e",
                    fontSize: 11, fontFamily: "'DM Mono', monospace",
                    letterSpacing: 0.5, cursor: "pointer",
                    textTransform: "capitalize", transition: "all 0.15s",
                  }}>
                    {f} ({count})
                  </button>
                );
              })}
            </div>
          )}

          <StampDivider />

          {/* Book list */}
          <div style={{ padding: "16px 24px" }}>
            {readingList.length === 0 ? (
              <div style={{
                padding: "40px 16px", textAlign: "center",
              }}>
                <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>📚</div>
                <div style={{
                  fontFamily: "'Source Serif 4', serif", fontSize: 15,
                  fontStyle: "italic", color: "#8a9478", lineHeight: 1.7,
                  maxWidth: 240, margin: "0 auto",
                }}>
                  Your reading list is empty. Add books you're reading or want to read!
                </div>
              </div>
            ) : (
              (rlFilter === "all" ? readingList : readingList.filter((b) => b.status === rlFilter)).length === 0 ? (
                <div style={{
                  padding: "30px 16px", textAlign: "center",
                  fontFamily: "'Source Serif 4', serif", fontSize: 14,
                  fontStyle: "italic", color: "#8a9478",
                }}>
                  No books with this status yet.
                </div>
              ) : (
                (rlFilter === "all" ? readingList : readingList.filter((b) => b.status === rlFilter)).map((item) => {
                  const st = bookStatusStyle(item.status);
                  return (
                    <div key={item.id} className="rl-item" style={{
                      padding: "14px 16px", background: "#263d22",
                      border: "1px solid #4a6840", borderRadius: 8,
                      marginBottom: 10, transition: "all 0.15s",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontFamily: "'Source Serif 4', serif", fontSize: 15,
                            fontWeight: 600, color: "#f5eed8", lineHeight: 1.4,
                          }}>
                            {item.title}
                          </div>
                          <div style={{
                            fontFamily: "'DM Mono', monospace", fontSize: 11,
                            color: "#c4b48e", marginTop: 4, letterSpacing: 0.3,
                          }}>
                            {item.author}{item.year ? ` · ${item.year}` : ""}
                          </div>
                          <button className="rl-status" onClick={() => cycleBookStatus(item.id)} style={{
                            marginTop: 8, display: "inline-block",
                            padding: "4px 12px", background: st.bg,
                            border: `1px solid ${st.border}`, borderRadius: 4,
                            fontSize: 11, color: st.color, cursor: "pointer",
                            fontFamily: "'DM Mono', monospace", letterSpacing: 0.5,
                            transition: "opacity 0.15s",
                          }}>
                            {st.label} ↻
                          </button>
                        </div>
                        <button className="rl-remove" onClick={() => removeFromReadingList(item.id)} style={{
                          background: "none", border: "none", color: "#5a7a4a",
                          fontSize: 16, cursor: "pointer", padding: "2px 6px",
                          transition: "color 0.15s", flexShrink: 0, marginTop: 2,
                        }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>

          {/* Tip */}
          {readingList.length > 0 && (
            <div style={{
              margin: "0 24px 16px", padding: "10px 14px",
              border: "1px dashed #3e5a35", borderRadius: 4,
              fontSize: 11, color: "#8a9478", textAlign: "center",
              fontFamily: "'DM Mono', monospace", lineHeight: 1.6,
            }}>
              Tap the status badge to cycle: ☆ Want to read → 📖 Reading → ✓ Finished
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
      {/* ── Reading List Drawer — REMOVED, now a full view ── */}
    </div>
  );
}
