# Development Log — LinguaBandit

## Entry 001 — 2026-04-01

### GitHub & Versioning Setup

**Status:** Complete

**Tasks completed:**
- Created GitHub repository: `lingua-bandit` (public)
- Configured Git identity (name + email)
- Cloned repository locally
- Established two-branch strategy:
  - `main` — stable releases, auto-deploys to GitHub Pages
  - `dev` — active development
- Created initial project structure:
```
  lingua-bandit/
  ├── index.html
  ├── css/
  │   └── style.css
  ├── js/
  │   └── main.js
  ├── data/
  │   └── .gitkeep
  ├── assets/
  │   └── sounds/
  │       └── .gitkeep
  └── README.md
```
- Added `.gitignore` (excludes `.DS_Store`, `node_modules/`, `.env`)
- Made initial commit and pushed to `dev`
- Configured GitHub Pages to serve from `main` branch root
- Live URL: `https://YOUR-USERNAME.github.io/lingua-bandit`

**Decisions made:**
- Public repo (required for free GitHub Pages hosting)
- No build step or bundler for now — plain HTML/CSS/JS
- Vite can be added later if complexity grows

**Next:** Begin game architecture and core file setup

--------------------------------------------------------------------------------------

## Entry 002 — 2026-04-01

### Architecture & Design Decisions

**Status:** Design phase complete — ready to build

---

### App identity
- **Name:** LinguaBandit
- **Concept:** A one-armed bandit (slot machine) vocabulary game for language learners
- **Starting language:** French only (v1)
- **Future languages:** Japanese, then Chinese (architecture must be extensible)
- **Hosting:** GitHub Pages (static)
- **Versioning:** GitHub — `main` (production) / `dev` (development)

---

### Game concept
- Reels spin and stop on words. A winning alignment is a grammatically
  and semantically correct French phrase
- Examples of valid alignments:
  - Simple: `LA | MAISON | BLEUE`
  - Complex: `IL | LES | LUI | A | DONNÉES`
  - Very complex: `ELLE | Y | SERAIT | ALLÉE | LENTEMENT`
- Reel width is configurable by admin: 3 to 5 slots
- All manner of French words are in scope: articles, nouns, adjectives,
  verbs, pronouns (subject, object, indirect, reflexive, y, en),
  adverbs, auxiliary verbs, past participles
- Complex constructions (compound tenses, pronoun ordering, past
  participle agreement) are explicitly in scope

### Word bank mechanic
- Successfully aligning a word n times (admin-configurable) earns
  the right to bank it
- Banked words are the player's currency and score
- Banked words expire after a set period — players must reuse them
- A joker symbol can appear on a reel — player may substitute
  a banked word
- Using a banked word incorrectly loses it permanently
- Players can view their word bank, track expiry, and print
  flashcards from outside the game

### Flashcard philosophy
- The app prints a blank template with the word only
- Students fill in gender, grammatical category, translation,
  example sentence etc. themselves — by design
- Pre-filling this information would undermine the learning process
- This is a firm pedagogical decision, not a technical limitation

---

### Tech stack
- **Frontend:** Plain HTML + CSS + JavaScript — no framework
- **Sound:** Howler.js (slot machine SFX and feedback sounds)
- **Persistence:** localStorage (in-browser user database)
- **Bundler:** None for now — add Vite later if needed
- **Validation:** Anthropic API via Cloudflare Worker proxy
- **Hosting:** GitHub Pages

### File structure
```
lingua-bandit/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── main.js
├── data/
│   └── .gitkeep
├── assets/
│   └── sounds/
│       └── .gitkeep
├── .gitignore
└── README.md
```

### Planned JS modules (to be created)
- `engine.js` — slot machine spin logic, alignment validation calls
- `vocab.js` — word pool management, mastery tracking
- `bank.js` — word bank CRUD, expiry logic, flashcard generation
- `admin.js` — config UI, vocab import
- `store.js` — all localStorage reads/writes, schema versioning

---

### Validation architecture

**Approach:** Full AI validation — no local rule engine

**Rejected approaches:**
- Hand-coded French grammar rule engine — too brittle, cannot scale
  to complex pronoun constructions and compound tenses
- LanguageTool API — weak on Japanese/Chinese, not designed for
  short fragment inputs, requires CORS proxy
- Browser NLP libraries (compromise.js, Wink) — English only,
  not applicable

**Chosen approach:**
- Every spin result is validated by a single AI API call
- The call checks grammar AND semantics together in one shot
- The response returns `{ valid: true/false, reason: "..." }`
- On failure the reason is shown to the player as a learning moment
- On success validation is silent — the win speaks for itself

**Model selection by complexity:**
- Simple alignments (ART + NOUN + ADJ): Haiku 4.5
- Complex alignments (pronouns, compound tenses): Sonnet 4.6
- Complexity level declared in the pack config by admin

**Validation prompt pattern:**
```
You are a French grammar judge for a language learning game.
The player has aligned these words in order: [WORDS]
1. Is this grammatically correct French?
2. Does it make semantic sense?
3. If wrong, explain simply why in English (max 2 sentences,
   encouraging tone, suitable for a language learner).
Respond ONLY as JSON: { "valid": true/false, "reason": "..." }
```

### API & key management
- Anthropic API key stored in LastPass — never in codebase
- Key will live as an environment variable in a Cloudflare Worker
- Cloudflare Worker acts as a proxy — keeps key out of frontend JS
- Cloudflare free tier: up to 100,000 requests/day — sufficient
- Spending cap set at $5/month on Anthropic Console
- Email alerts at $1 and $3 thresholds

---

### Data architecture

**localStorage schema — key objects:**
- `users{}` — user profiles
- `wordBank{}` — banked words with expiry timestamps
- `masteryScores{}` — per-word win counts per user
- `vocabPacks{}` — loaded word lists
- `gameConfig{}` — admin settings

**Word entry — minimal by design:**
```json
{ "word": "maison", "level": "A1" }
```

No gender, no grammatical category, no translation — the AI
validates at runtime, students research and record this
information themselves on their handwritten flashcards.

**Game pack entry:**
```json
{
  "id": "pack-maison-a1",
  "label": "At home — A1",
  "language": "fr",
  "mastery_threshold": 3,
  "bank_expiry_days": 7,
  "complexity": "simple",
  "words": [
    { "word": "maison", "level": "A1" },
    { "word": "chat", "level": "A1" }
  ],
  "reel_width": 3,
  "llm_explain_language": "en"
}
```

---

### Admin setup flow
1. Admin pastes comma-separated word list into setup screen
2. Selects reel width (3–5), complexity level, mastery threshold,
   bank expiry period
3. Clicks "Create pack" — words saved to localStorage as-is
4. No AI call at setup time — validation is entirely at runtime
5. Admin panel is password-protected

### Semantic validity
- Curated slot pools (Option 3) as primary safeguard — admin
  groups words that make sense together
- Lightweight semantic tag-check (Option 1) as safety net for
  open pools
- AI validation catches anything that slips through at runtime
- AI also handles cases that are grammatically valid but
  semantically absurd (e.g. LA MAISON RAPIDE)

---

### UI & UX
- Visual style: casino slot machine — convincing, immersive
- Must include satisfying sounds (Howler.js)
- Players can access word bank and flashcard view outside the game
- Game should feel rewarding to win and instructive to lose

---

### Open questions / deferred decisions
- Elision handling (l'arbre vs la arbre) — deferred to v1 testing
- Plural forms on reels — not yet designed
- User authentication model — localStorage only for v1,
  no server-side accounts
- Specific French grammatical structures for v1 — not yet locked
- Whether to support multiple simultaneous users on one device

---

**Next:** Cloudflare Worker setup, then core game engine

--------------------------------------------------------------------------------------

## Entry 003 — 2026-04-01

### Cloudflare Worker Setup

**Status:** In progress

---

### Purpose
Cloudflare Worker acts as a secure proxy between the LinguaBandit
frontend and the Anthropic API. The API key never appears in
frontend JavaScript or the GitHub repository. All validation
requests from the game are routed through the Worker, which
attaches the key server-side before forwarding to Anthropic.

### Why Cloudflare Workers
- Free tier: 100,000 requests/day — more than sufficient
- No server to maintain — serverless, always on
- Environment variables keep the API key secure
- Deployment takes ~15 minutes
- Works seamlessly with a static GitHub Pages frontend

### Worker responsibility
- Receive a validation request from the game (words + complexity)
- Forward it to the Anthropic API with the key attached
- Return the JSON response to the game
- Reject requests from unauthorised origins (CORS protection)

### Next
- Create Cloudflare account
- Create Worker
- Set API key as environment variable
- Deploy and test
- Note Worker URL for use in engine.js

-----------------------------------------------------------------------------------------

## Entry 004 — 2026-04-01

### Cloudflare Worker — Validation Proxy

**Status:** Complete and tested

---

### Worker details
- Name: `lingua-bandit-validator`
- URL: `https://lingua-bandit-validator.jrichalot.workers.dev`
- Platform: Cloudflare Workers (free tier)
- Deployed: 2026-04-01

### What it does
- Receives POST requests from the game frontend
- Selects model based on complexity flag:
  - simple → `claude-haiku-4-5-20251001`
  - complex → `claude-sonnet-4-6`
- Forwards request to Anthropic API with key attached server-side
- Strips markdown code fences from model response if present
- Returns clean JSON to the game: `{ "valid": true/false, "reason": "..." }`

### Bug encountered and fixed
- Initial deployment returned `{"valid":false,"reason":"Validation service error."}`
- Cause: model was wrapping JSON response in markdown code fences
  (` ```json ... ``` `) which broke `JSON.parse()`
- Fix: added `.replace()` chain to strip fences before parsing

### Test results
**Valid alignment:**
- Input:  `["LA", "MAISON", "BLEUE"]`
- Output: `{"valid":true,"reason":""}`

**Invalid alignment:**
- Input:  `["LE", "MAISON", "BLEUE"]`
- Output: `{"valid":false,"reason":"The article should be 'LA' instead
  of 'LE' because 'maison' is a feminine noun in French. You're on the
  right track — just remember that 'maison' takes the feminine article!"}`

### Notes
- CORS currently set to `*` (all origins)
- Tighten to `https://jrichalot.github.io` before going live
- API key stored as encrypted environment variable in Cloudflare —
  never in codebase
- Worker URL to be stored in `engine.js` as `VALIDATOR_URL` constant

### To modify or redeploy
1. Go to cloudflare.com → Workers & Pages
2. Select `lingua-bandit-validator`
3. Click Edit Code
4. Make changes → Save and deploy
5. Environment variables: Settings → Variables

---

**Next:** Slot machine UI — HTML structure and CSS casino styling

---------------------------------------------------------------------------------------

## Entry 005 — 2026-04-07

### Slot Machine UI — First Playable Version

**Status:** Complete — saved as `index.html`, committed to `dev`

---

### What was built
A fully playable slot machine UI connected to the live Cloudflare
validation worker. The machine renders as a physical one-armed bandit
cabinet with a pullable lever arm on the right side.

### Visual design
After several iterations:
- **Rejected:** Dark Vegas casino (too heavy, too adult)
- **Rejected:** Super Mario pixel art (too literal, wrong mood)
- **Rejected:** Clean blue corporate card UI (too cold)
- **Settled on:** Disney palette on a physical casino cabinet form

**Colour palette:**
- Cabinet body: Disney royal blue `#006EB6` to `#002D66`
- Trim and border rails: Disney gold `#FFC72C` / `#D4A000`
- JOUER button: bright red `#FF4460` to `#CC0018` (white text)
- SOUMETTRE button: bright gold `#FFE878` to `#FFA800` (dark blue text)
- Logo sign background: Disney purple `#7B2D8B`
- Page background: dark atmospheric radial gradient

**Typography:** Satisfy (logo cursive) · Fredoka One (game text)
· Nunito (body and nav)

**Cabinet structure top to bottom:**
- Arched top with gold rivet details, animated star row, coin lights
- Purple logo sign: LinguaBandit in gold Satisfy script
- Status bar: Tours remaining · ₣ Franc balance · Série
- Dark glass reel window with gold payline line
- Spin pip tracker (one pip per available turn)
- AI feedback / result banner
- JOUER (red) + SOUMETTRE (gold) buttons
- Gold neon panel: Vocabulaire · Grammaire · Jackpot
- Footer nav: Ma Banque · Mes Fiches · Admin
- Gold base strip

**Lever:** Gold mounting plate attached to the right side of the
cabinet. Chrome track with physical end stops top and bottom.
Red ball travels down the track on click, springs back before
reels spin.

---

### Game mechanics implemented

**Spin and hold:**
- JOUER costs 1₣ per spin
- Reels spin left to right with staggered stops (700ms + 340ms each)
- Drum blur animation gives physical reel illusion
- Ghost words above and below centre word reinforce drum depth
- Click any reel frame to hold it — gold glow appears
- Label changes: GARDER → GARDE (held state)
- Held reels do not spin on next turn

**Joker mechanic:**
- 10% probability per reel per spin (configurable via JOKER_P)
- Joker reels glow red, label shows JOKER !
- Cannot be held — clicking opens word bank modal
- Player selects a banked word to place on the reel
- "Tourner ce rouleau à la place" cancels and forces re-spin

**Submit and validation:**
- SOUMETTRE button appears after first spin
- Fires POST request to Cloudflare Worker
- Worker selects Claude Haiku (simple) or Sonnet (complex)
- Valid alignment → ₣ earned + unspent spins refunded,
  session resets automatically
- Invalid alignment → AI explanation shown in result banner
  in English, −3₣ penalty applied
- Unresolved jokers block submission

**₣ Franc credit system:**
- Starting balance: 20₣ (hardcoded, admin-configurable later)
- Each spin costs 1₣
- Correct submission earns 3₣ / 4₣ / 5₣ by reel count
- Unspent spins refunded on correct submission
- Wrong submission penalty: −3₣ fixed
- JOUER button disables at 0₣

**Mastery and word bank:**
- Words require 3 correct submissions before entering the bank
  (masteryScores tracked per word in G object)
- Bank alert every 10 new words banked
- Game locks at 50 banked words without printing flashcards
  (lock screen with humorous message shown)
- Unlock requires opening the flashcard print view

**Flashcard print view:**
- Opens in a new browser tab
- Blank card grid — one card per banked word, sorted A–Z
- Fields: Genre · Catégorie · Traduction · Phrase exemple
- All fields blank by design — student fills in themselves
- Print button included in the tab

---

### Responsive design
- All sizing uses CSS `clamp()` throughout
- Scales cleanly from 280px phone to wide desktop
- Cabinet and lever maintain physical proportions at all sizes
- No scrolling required on any viewport

### Reel count adaptability
- `var N_REELS = 3` at top of script — change to 4 or 5
- Reels, pools, holds, jokers and stagger delays all adapt
- Word pools for reels 4 and 5 pre-populated (verbs, adverbs)

---

### Key constants (all configurable at top of script)
```javascript
var N_REELS          = 3;
var MAX_SPINS        = 5;
var SPIN_COST        = 1;
var PENALTY          = 3;
var JOKER_P          = 0.1;
var EARN             = {"3":3, "4":4, "5":5};
var BANK_ALERT_EVERY = 10;
var BANK_LOCK_AT     = 50;
```

---

### Bugs encountered and fixed

**Bug 1 — Rendering failure (code displayed on screen)**
- Cause: nested template literals inside `<script>` block
  confused the HTML parser
- Cause confirmed: `</style>` inside a JavaScript string on
  the flashcard HTML builder was interpreted by the HTML parser
  as a real closing tag, terminating script parsing early
- Fix: rewrote entire script block using `var`, plain string
  concatenation, and `createElement` — no template literals
  anywhere in JS. Escaped all closing HTML tags inside JS
  strings as `<\/style>`, `<\/head>`, `<\/body>`, `<\/html>`
- Lesson: the HTML parser pre-scans `<script>` blocks before
  JS runs. Any `</tagname>` sequence inside a JS string can
  terminate parsing. Always escape closing tags in JS strings
  that build HTML.

**Bug 2 — AI explanation returned in French not English**
- Cause: `explain_language` sent as `'French'` from `index.html`
- Fix: hardcoded English in the Cloudflare Worker prompt,
  removed the `explain_language` variable from the prompt.
  Added teenager-appropriate tone guidance and instruction
  to acknowledge what is good about the attempt.

**Bug 3 — Connection error when testing inside Claude chat**
- Cause: Claude's chat widget sandbox blocks outbound fetch
  calls to external URLs — not a real app bug
- Fix: always test via VS Code Live Server
  (`http://localhost:5500`) or GitHub Pages, never inside
  the Claude chat widget

---

### Cloudflare Worker prompt (updated)
```javascript
const prompt = `You are a friendly grammar coach for a French
language learning game aimed at teenagers.
The player has aligned these words in order: ${words.join(" ")}

Evaluate this alignment:
1. Is it grammatically correct French?
2. Does it make natural semantic sense?
3. If incorrect, explain in simple English why it is wrong —
   maximum 2 sentences, warm and encouraging tone, suitable
   for a beginner learner. Start with what is good about
   the attempt if anything.

Respond ONLY as JSON with no commentary:
{ "valid": true/false, "reason": "..." }
If valid, reason must be an empty string.`;
```

---

### Testing notes
- Must be tested via Live Server or GitHub Pages
- Claude chat widget blocks external fetch — always shows
  connection error, not a real bug
- Confirmed working: valid alignment returns win state,
  invalid alignment returns English AI explanation

---

### Known limitations deferred to later versions
- No sound yet (Howler.js integration pending)
- No localStorage persistence — state resets on page refresh
- Admin panel is a placeholder alert
- Word pools hardcoded — real pack loading not yet built
- No user login or multi-user support
- Flashcard PDF export not yet implemented — current version
  opens a print stylesheet in a new tab
- Joker shows [J] text placeholder — visual improvement pending

---

### Files changed
- `index.html` — created (replaces placeholder from Entry 001)
- Cloudflare Worker `lingua-bandit-validator` — prompt updated

### Suggested next commit
```bash
git add index.html DEVLOG.md
git commit -m "feat: first playable slot machine UI with AI validation"
git push
```

### Next steps
1. Commit `index.html` and `DEVLOG.md` to `dev` branch
2. localStorage persistence layer (`store.js`)
3. Admin panel — word list input, pack creation, config
4. Sound design — Howler.js
5. Flashcard PDF generation — jsPDF

----------------------------------------------------------------

## Entry 006 — 2026-04-17

### store.js — localStorage persistence layer

**Status:** Complete — saved as `js/store.js`

---

### What was built
A self-contained localStorage module that persists all game state,
pack definitions, word banks and mastery scores across browser
sessions. Students can close the browser and resume exactly where
they left off. Multiple classes can coexist on the same device
without collision, each identified by a unique game code.

---

### Architecture decisions made this session

**One browser = one student**
No login or user accounts. Each browser instance is one student.
All data is stored under that student's localStorage for the
pack they are currently playing.

**Game code system**
The multi-class problem (different teachers, different classes,
same device) is solved without a backend using URL hash codes.

Format: `XX-XX-00` e.g. `FR-7K-42`
- Language prefix (2 chars)
- 2 random uppercase letters (I and O excluded — too similar to
  1 and 0)
- 2 random digits

The teacher shares a URL: `https://jrichalot.github.io/lingua-bandit/#FR-7K-42`

When a student opens the URL, the game reads the code from the
hash, loads the matching pack from localStorage, and resumes
the student's saved state. Multiple class packs coexist on the
same device without collision because every localStorage key is
namespaced by code.

**No grammatical categories in the schema**
After discussion, grammatical category labels were removed from
the drum schema entirely. The original design carried labels
like "Article", "Nom", "Adjectif" per drum — a holdover from
the rule-engine approach. This breaks down immediately for
complex constructions:

- `JE LA LUI AI DONNÉE` — drum 2 is a direct object pronoun
- `LA GRANDE MAISON DEVANT LA FORÊT` — drum 2 is an adjective

There is no stable relationship between drum position and
grammatical category. The AI validator judges the full alignment
without caring about position. Drums are just pools of words.

The drum schema is therefore:
```json
"drums": [
  { "position": 1, "name": "Drum 1", "words": ["LA","LE","LES"] },
  { "position": 2, "name": "Drum 2", "words": ["MAISON","GRANDE","CHAT"] },
  { "position": 3, "name": "Drum 3", "words": ["BLEUE","MAISON","ROUGE"] }
]
```
`name` is optional and cosmetic only — the game uses it for
display in the admin UI but it has zero influence on validation
or game logic. Words can appear on multiple drums.

**AI drum assignment at setup time**
When the teacher pastes a word list, one AI call suggests drum
assignments. Words can and should appear on multiple drums.
The AI flags uncertain assignments with `"flagged": true` at
the word level (not drum level) so the teacher knows exactly
where to review. The prompt deliberately avoids mentioning
grammatical categories or typical drum roles — the AI thinks
holistically about which words could co-occur in valid French
phrases regardless of position.

AI drum assignment prompt strategy:
- No grammatical category guidance
- Framed as: "which words could plausibly co-occur in a valid
  French phrase" — position-agnostic
- Goal stated explicitly: maximise valid alignments
- Flag uncertain words with `"flagged": true`
- Return JSON only, no explanation, no markdown

**Preloaded word bank**
Teachers can seed a student's bank with words before they start
playing — e.g. loading all articles so students always have
LA, LE, LES available as joker substitutes from day one.

Preloaded words are permanent by default (`"permanent": true`).
Permanent words:
- Have `expiresAt: null`
- Are never swept by `sweepExpiredWords()`
- Cannot be lost through wrong-use penalty
- Are protected in `removeWord()` — returns false silently

Earned words (via mastery) are time-based with configurable
expiry (`bankExpiryDays`, default 30). Using a word as a joker
substitute resets its expiry — rewarding active use.

---

### localStorage key structure

```
lb_packs              — index of all packs on this device
lb_pack_{code}        — full pack definition
lb_state_{code}       — student session state
lb_bank_{code}        — student word bank with expiry
lb_mastery_{code}     — mastery scores per word
```

All keys prefixed `lb_` to avoid collisions with other apps.

### Pack definition schema
```json
{
  "code": "FR-7K-42",
  "label": "Classe 3A — Maison et famille",
  "language": "fr",
  "createdAt": 1712345678000,
  "config": {
    "nReels": 3,
    "maxSpins": 5,
    "spinCost": 1,
    "wrongPenalty": 3,
    "jokerProbability": 0.1,
    "earnByReels": {"3":3,"4":4,"5":5},
    "masteryThreshold": 3,
    "bankExpiryDays": 30,
    "startingFrancs": 20,
    "complexity": "simple"
  },
  "drums": [
    { "position": 1, "name": "Drum 1", "words": ["LA","LE","LES"] },
    { "position": 2, "name": "Drum 2", "words": ["MAISON","GRANDE"] },
    { "position": 3, "name": "Drum 3", "words": ["BLEUE","MAISON"] }
  ],
  "preloadedBank": [
    { "word": "LA",  "permanent": true },
    { "word": "LE",  "permanent": true },
    { "word": "LES", "permanent": true }
  ]
}
```

### Word bank entry schema
```json
{
  "MAISON": {
    "word": "MAISON",
    "bankedAt": 1712345678000,
    "expiresAt": 1714937678000,
    "permanent": false,
    "lastUsedAt": null,
    "useCount": 0
  },
  "LA": {
    "word": "LA",
    "bankedAt": 1712345678000,
    "expiresAt": null,
    "permanent": true,
    "lastUsedAt": 1712399999000,
    "useCount": 3
  }
}
```

---

### Public API — store.js

**Code and URL**
- `generateCode(language)` — generates unique pack code
- `getCodeFromURL()` — reads code from window.location.hash
- `getShareURL(code)` — builds shareable teacher URL
- `setURLCode(code)` — updates hash without page reload

**Pack index**
- `listPacks()` — all packs sorted by last played
- `packExists(code)` — boolean check
- `touchPackLastPlayed(code)` — updates last played timestamp

**Pack CRUD**
- `createPack(label, language, drums, preloadedBank, config)`
- `getPack(code)`
- `updatePackConfig(code, overrides)`
- `updatePackDrums(code, drums)`
- `updatePreloadedBank(code, entries)`
- `getAllPackWords(code)` — unique words across all drums
- `getDrumWords(code, position)` — words for one drum
- `deletePack(code)` — removes pack and all student data

**Session state**
- `getState(code)` — loads saved state or returns default
- `saveState(state)` — call after every spin and submission
- `resetSessionState(code)` — new round, keeps francs/wins
- `fullResetState(code)` — complete wipe including francs

**Word bank**
- `seedBankIfEmpty(code)` — seeds preloaded words on first load
- `bankWord(code, word)` — adds earned word to bank
- `useWord(code, word)` — records joker use, resets expiry
- `removeWord(code, word)` — penalty removal (permanent words protected)
- `sweepExpiredWords(code)` — call on every page load
- `getActiveWords(code)` — non-expired words sorted A-Z
- `getExpiringWords(code, withinDays)` — expiry warning list
- `daysUntilExpiry(entry)` — human-readable days remaining
- `getBankSize(code)` — count of active words
- `wordIsInBank(code, word)` — boolean check

**Mastery**
- `incrementMastery(code, word)` — call on correct submission
- `isNewlyMastered(code, word)` — true when threshold reached
  and word not yet in bank — the banking trigger
- `getMasteryScore(code, word)`
- `getMasteryProgress(code)` — full progress array for all
  pack words, sorted by score descending

**Admin**
- `topUpFrancs(code, amount)` — teacher tops up student credit

**Diagnostics**
- `getStorageUsageKB()` — approximate lb_ usage
- `debugDump()` — full dump of all lb_ keys
- `nukeAll()` — wipes all lb_ keys (admin use only)

---

### How to wire into index.html

Add before closing `</head>`:
```html
<script src="js/store.js"></script>
```

On page load:
```javascript
var code = Store.getCodeFromURL();
if (code && Store.packExists(code)) {
  Store.sweepExpiredWords(code);      // remove expired words
  Store.seedBankIfEmpty(code);        // seed preloaded bank once
  Store.touchPackLastPlayed(code);    // update last played
  var G = Store.getState(code);       // load saved state
} else {
  // no valid code — show admin setup or pack picker
}
```

After every spin and submission:
```javascript
Store.saveState(G);
```

---

### Files changed
- `js/store.js` — created

### Commit
```bash
git add js/store.js DEVLOG.md
git commit -m "feat: localStorage persistence layer (store.js)"
git push
```

### Next steps
1. Wire `store.js` into `index.html` — replace hardcoded G
   object with Store calls
2. Admin panel — pack creation UI with AI drum assignment
3. Sound design — Howler.js
4. Flashcard PDF generation — jsPDF

---------------------------------------------------------------

## Entry 007 — 2026-04-17

### store.js wired into index.html — persistence verified

**Status:** Complete — tested, bugs fixed, committed to `dev`

---

### What was done
`store.js` was wired into `index.html`, replacing the hardcoded
`var G = {}` object and all in-memory state with Store calls.
The game now fully persists across browser close and supports
multiple independent class packs via URL hash codes.

---

### Changes to index.html

**Removed:**
- Hardcoded `var G = { francs:20, wordBank:[...], ... }` object
- `initState()` function
- Direct `G.wordBank.push()` calls
- Direct `G.masteryScores` tracking
- Hardcoded `ALL_POOLS` as the word source

**Added:**
- `<script src="js/store.js"></script>` in `<head>`
- `DEMO_PACK` constant — fallback pack for bare URL with no hash
- `init()` function — replaces `initState()`, reads pack from URL,
  loads persisted state, seeds bank, sweeps expired words
- `saveG()` helper — calls `Store.saveState(G)` after every
  spin, hold change, and submission
- `getBankedWords()` and `getBankCount()` helpers — read from
  Store in pack mode, fall back to `G.wordBank` in demo mode
- Demo mode guard (`CODE !== "DEMO"`) throughout — demo play
  leaves no trace in localStorage

**Key wiring points:**
- `spin()` calls `saveG()` after reels stop
- `toggleHold()` calls `saveG()` after hold state changes
- `submitAlignment()` calls `Store.incrementMastery()` and
  `Store.isNewlyMastered()` — banks words via Store, not array push
- `placeJoker()` calls `Store.useWord()` — records use, resets expiry
- `showBank()` calls `Store.getExpiringWords()` — shows expiry
  warnings alongside banked words
- `showAdmin()` shows pack label, code, and shareable URL

---

### Bugs found and fixed during testing

**Bug 1 — DOMContentLoaded timing (critical)**

Symptom: State reset to defaults (francs=20) on every page reload
despite being correctly saved to localStorage.

Root cause: `init()` was called at the bottom of the script block
which runs before the browser has finished parsing the full URL
including the hash. `getCodeFromURL()` read `window.location.hash`
while it was still empty, returned `null`, and `init()` fell through
to demo mode (`CODE = "DEMO"`). `Store.getState("DEMO")` returned
a default state with `francs:20`, overwriting the saved state.

Diagnosis steps:
1. `Store.getState(code)` showed `francs:19` — state WAS saved
2. `G.francs` after reload showed `20` — something reset it
3. Added `console.log("Loading state for CODE:", CODE)` — printed
   `"DEMO"` confirming the URL hash was not being read

Fix: wrapped `init()` call in a `DOMContentLoaded` listener:
```javascript
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

This ensures `init()` always runs after the full URL including
the hash is available to JavaScript.

**Bug 2 — seedBankIfEmpty against wrong code (consequence of bug 1)**

Symptom: Preloaded bank words (LA, LE, LES) not available when
joker modal opened on packs created before the DOMContentLoaded fix.

Root cause: `seedBankIfEmpty()` ran during `init()` while `CODE`
was still `"DEMO"`. The seed was written to `lb_bank_DEMO` instead
of `lb_bank_FR-XX-XX`. The real pack's bank was therefore empty.

Fix: same DOMContentLoaded fix above. All packs created and opened
after the fix seed correctly. Existing test packs required manual
`Store.seedBankIfEmpty(code)` call to recover.

---

### Known constraint

`seedBankIfEmpty()` only runs during `init()` on page load.
If a pack is created in the browser console after the page has
already loaded, the seed will not run automatically. Call
`Store.seedBankIfEmpty(code)` manually in that case.

In production this is not an issue — students always open the
game via the teacher's shared URL so `init()` always runs first.

---

### Test results

**Automated suite — persistence.test.js**
- Version updated to 1.1
- Section 11 added: DOMContentLoaded Timing (10 new assertions)
- Total: 100 passed · 0 failed · 12 manual · / 112 total

Section 11 tests cover:
- `getCodeFromURL()` returns null when hash is empty
- `getCodeFromURL()` returns null for all invalid hash formats
- `getCodeFromURL()` returns correct code for valid hash
- CODE is never "DEMO" when a valid pack hash is in the URL
- `packExists()` true for code read from URL hash
- `getState()` returns saved data not defaults (regression test)
- `getState("DEMO")` returns defaults not pack saved state
- `setURLCode()` updates hash without page reload
- `getShareURL()` produces URL containing pack code and # separator

**Manual checklist — MANUAL_PERSISTENCE_TEST_CHECKLIST.md**
All 12 manual tests passed:
- M.1  Pack loading from URL hash
- M.2  Demo mode fallback
- M.3  Session state persists across tab close (francs, held reel)
- M.4  Preloaded bank seeded on first visit
- M.5  Ma Banque shows preloaded words
- M.6  Joker modal opens and places word
- M.7  Joker use recorded in bank
- M.8  Word expiry alert on page reload
- M.9  Franc top-up re-enables JOUER
- M.10 Multiple packs coexist independently
- M.11 Flashcard print view
- M.12 Demo mode leaves no localStorage trace

Note on M.6: joker modal only works after at least one spin has
been played in the session. This is correct — jokers cannot appear
on load, only as the result of a spin. The edge case of forcing a
joker via console before any spin is an artificial state that
cannot occur in normal gameplay.

---

### Files changed
- `index.html` — wired to store.js, DOMContentLoaded fix applied
- `js/store.js` — no changes (v1.0 unchanged)
- `tests/persistence.test.js` — updated to v1.1, section 11 added
- `tests/MANUAL_PERSISTENCE_TEST_CHECKLIST.md` — used for M tests

### Commit
```bash
git add index.html tests/persistence.test.js DEVLOG.md
git commit -m "feat: wire store.js into index.html, fix DOMContentLoaded timing bug"
git push
```

### Next steps
1. Admin panel — pack creation UI with AI drum assignment
2. Sound design — Howler.js
3. Flashcard PDF generation — jsPDF
