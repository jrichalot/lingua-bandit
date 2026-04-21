# LinguaBandit — Manual Persistence Test Checklist
## Pre-commit verification — store.js + index.html wiring

All tests run via Live Server (`http://localhost:5500`).

---

### Important: recovering the pack code after navigation

When you navigate to a pack URL, the `pack` variable from the
previous console session is lost. Always recover the code first:

```javascript
var code = Store.getCodeFromURL();
```

Use `code` instead of `pack.code` in all console commands below.

---

### Setup — run once before starting

**Step 1** — Open `http://localhost:5500` in your browser.

**Step 2** — Open the console (F12) and paste:

```javascript
var pack = Store.createPack(
  "Test Persistence A1", "fr",
  [
    { position:1, words:["LA","LE","LES","UNE","UN"] },
    { position:2, words:["MAISON","CHAT","CHIEN","LIVRE","TABLE"] },
    { position:3, words:["BLEUE","ROUGE","GRAND","PETIT","VIEUX"] }
  ],
  [
    { word:"LA", permanent:true },
    { word:"LE", permanent:true },
    { word:"LES", permanent:true }
  ],
  {}
);
console.log(Store.getShareURL(pack.code));
```

**Step 3** — Copy the printed URL and navigate to it.

**Step 4** — After navigation, recover the code:

```javascript
var code = Store.getCodeFromURL();
```

Use `code` in all console commands from here on.

---

### M.1 — Pack loading

**What to do:**
Navigate to your pack URL. Open the console and run:
```javascript
var code = Store.getCodeFromURL();
code;
console.log(Store.getPack(code).label);
```

**Expected:**
- Console prints your pack code e.g. `FR-7K-42`
- Console prints `Test Persistence A1`
- Game shows words from the pack on the reels (not demo words)

**Pass:** [ ]

---

### M.2 — Demo mode fallback

**What to do:**
Open `http://localhost:5500` (no hash at all).

**Expected:**
- Game loads without crashing
- Francs = 20
- Reels show demo words (LA, MAISON, BLEUE etc.)

**Pass:** [ ]

---

### M.3 — Session state persists across browser close

**What to do:**
1. Open your pack URL
2. Run `var code = Store.getCodeFromURL();` in console
3. Click JOUER once — francs drop to 19
4. Hold one reel (click it — gold glow appears)
5. Close the tab entirely
6. Reopen the same pack URL

**Expected:**
- Francs still show 19
- The reel you held is still glowing gold
- One pip is filled in the Tours tracker

**Pass:** [ ]

---

### M.4 — Preloaded bank seeded on first visit

**What to do:**
1. Open your pack URL in a fresh browser profile or after running
   `Store.nukeAll()` in console to simulate a first visit
2. Run in console:
```javascript
var code = Store.getCodeFromURL();
Store.getActiveWords(code);
```

**Expected:**
- Returns array containing LA, LE, LES
- Each has `permanent: true` and `expiresAt: null`

**Pass:** [ ]

---

### M.5 — Ma Banque shows preloaded words

**What to do:**
1. Open your pack URL
2. Click **Ma Banque** in the footer nav

**Expected:**
- Alert shows `Votre banque (3 mots)`
- Words listed include LA, LE, LES

**Pass:** [ ]

---

### M.6 — Joker modal opens and places word

**What to do:**
1. Open your pack URL
2. Run in console to recover code and seed bank:
```javascript
var code = Store.getCodeFromURL();
Store.seedBankIfEmpty(code);
```
3. Force a joker on reel 1:
```javascript
G.joker[0]=true; G.words[0]="JOKER"; render();
```
4. Click the red [J] reel
5. Click one of the word chips in the modal (e.g. LA)

**Expected after step 3:** Reel 1 shows [J] with red glow

**Expected after step 4:** Modal opens showing LA, LE, LES as chips

**Expected after step 5:**
- Modal closes
- Reel 1 shows LA with gold glow (auto-held)
- Result banner confirms the placement

**Pass:** [ ]

---

### M.7 — Joker use recorded in bank

**What to do:**
Immediately after completing M.6, run in console:
```javascript
var code = Store.getCodeFromURL();
Store.getBank(code)["LA"];
```

**Expected:**
- `useCount` = 1 (or incremented from previous)
- `lastUsedAt` is a recent timestamp (not null)
- `expiresAt` is still null (LA is permanent — expiry not reset)

**Pass:** [ ]

---

### M.8 — Word expiry alert on page load

**What to do:**
1. Open your pack URL
2. Run in console to bank MAISON and immediately expire it:
```javascript
var code = Store.getCodeFromURL();
Store.bankWord(code, "MAISON");
var b = Store.getBank(code);
b["MAISON"].expiresAt = Date.now() - 1000;
localStorage.setItem("lb_bank_" + code, JSON.stringify(b));
```
3. Reload the page (F5)

**Expected:**
- Alert appears saying MAISON has expired and was removed
- MAISON no longer appears in Ma Banque

**Pass:** [ ]

---

### M.9 — Franc top-up

**What to do:**
1. Open your pack URL
2. Spin until francs reach 0 (or set directly in console:
   `G.francs=0; Store.saveState(G); render();`)
3. Confirm JOUER button is disabled (greyed out)
4. Close tab, reopen same URL — confirm still disabled
5. In console:
```javascript
var code = Store.getCodeFromURL();
Store.topUpFrancs(code, 10);
location.reload();
```

**Expected:**
- After reload, francs = 10
- JOUER button re-enabled

**Pass:** [ ]

---

### M.10 — Multiple packs coexist

**What to do:**
1. Note your current pack URL (Pack A)
2. Open console on any page and create Pack B:
```javascript
var packB = Store.createPack(
  "Test Pack B", "fr",
  [{ position:1, words:["JE","TU","IL"] }],
  [],
  { nReels:1, startingFrancs:15 }
);
console.log(Store.getShareURL(packB.code));
```
3. Navigate to Pack A URL, spend some francs
4. Navigate to Pack B URL — check francs
5. Return to Pack A URL — check francs unchanged

**Expected:**
- Pack A and Pack B have completely independent francs
- Pack B starts at 15₣
- Changes to Pack A do not affect Pack B and vice versa

**Pass:** [ ]

---

### M.11 — Flashcard print view

**What to do:**
1. Open your pack URL
2. Make sure you have words in your bank (click Ma Banque to confirm)
3. Click **Mes Fiches** in the footer nav

**Expected:**
- New browser tab opens
- Shows a grid of blank flashcards, one per banked word
- Each card has fields: Genre, Catégorie, Traduction, Phrase exemple
- All fields are blank (intentional — student fills in themselves)
- Imprimer button visible and triggers browser print dialog

**Pass:** [ ]

---

### M.12 — Demo mode leaves no localStorage trace

**What to do:**
1. Open `http://localhost:5500` (no hash)
2. Play several spins
3. In console:
```javascript
Object.keys(localStorage).filter(function(k){
  return k.indexOf("lb_") === 0;
});
```

**Expected:**
- Result contains only keys from your test packs (FR-XX-XX format)
- No key containing "DEMO"

**Pass:** [ ]

---

### Cleanup after testing

Run in console to remove all test data:

```javascript
// Remove specific test packs
Store.listPacks().forEach(function(p){
  if(p.label.indexOf("Test") === 0) Store.deletePack(p.code);
});

// Or wipe everything (irreversible)
Store.nukeAll();
```

---

### Known constraint (document for Entry 007)

`seedBankIfEmpty()` only runs during `init()` on page load.
If a pack is created in the console after the page has loaded,
the seed will not run automatically. Always call
`Store.seedBankIfEmpty(code)` manually in the console when
testing packs created mid-session.

In production this is not an issue — students always open
the game via the teacher's shared URL, so `init()` always
runs before any interaction.

---

### Sign-off

All 12 manual tests passing: [ ]
Tester: _______________
Date:   _______________
Notes:  _______________
