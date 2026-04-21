# LinguaBandit — Persistence Test Checklist
## Entry 007 pre-commit verification — store.js + index.html wiring

Run all tests via Live Server (`http://localhost:5500`).
Create a test pack first using the console command below, then
navigate to the URL it returns. All tests use that URL.

---

### Setup — create test pack (run once in browser console)

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

Navigate to the printed URL before running any tests.

---

### 1. Pack loading

| # | Test | Expected | Pass |
|---|------|----------|------|
| 1.1 | Open bare `localhost:5500` (no hash) | Game loads in demo mode, francs = 20, hardcoded words | [ ] |
| 1.2 | Open pack URL with valid hash | Game loads pack words, title shows pack label in admin alert | [ ] |
| 1.3 | Open URL with invented hash e.g. `#XX-ZZ-99` | Falls back to demo mode gracefully, no crash | [ ] |
| 1.4 | Run `Store.debugDump()` in console after opening pack URL | Shows `lb_pack_XX`, `lb_state_XX`, `lb_packs` keys | [ ] |

---

### 2. Session state persistence

| # | Test | Expected | Pass |
|---|------|----------|------|
| 2.1 | Spin once, note francs (should be 19) | Francs decremented correctly | [ ] |
| 2.2 | Close tab, reopen same pack URL | Francs still 19, spins used pip still filled | [ ] |
| 2.3 | Hold a reel, close tab, reopen | Held reel is still held (gold glow visible) | [ ] |
| 2.4 | Spin 3 times, close tab, reopen | All 3 pips filled, spinsLeft = 2 | [ ] |
| 2.5 | Run `Store.getState(pack.code)` in console | Returns object with correct francs, spinsLeft, words | [ ] |

---

### 3. Word bank and mastery

| # | Test | Expected | Pass |
|---|------|----------|------|
| 3.1 | Open pack URL fresh | Word bank contains LA, LE, LES (preloaded permanent words) | [ ] |
| 3.2 | Click Ma Banque | Alert shows LA, LE, LES with bank count = 3 | [ ] |
| 3.3 | Close tab, reopen | Preloaded words still in bank | [ ] |
| 3.4 | Submit correct alignment 3 times for same words | Words appear in bank (mastery threshold = 3) | [ ] |
| 3.5 | Run `Store.getMasteryProgress(pack.code)` in console | Shows score per word, mastered:true for threshold-reached words | [ ] |
| 3.6 | Run `Store.getActiveWords(pack.code)` in console | Returns array including permanent words and newly mastered words | [ ] |
| 3.7 | Close tab after banking a word, reopen | Banked word still present | [ ] |

---

### 4. Permanent words (preloaded bank)

| # | Test | Expected | Pass |
|---|------|----------|------|
| 4.1 | Run `Store.getBank(pack.code)` in console | LA, LE, LES show `permanent:true`, `expiresAt:null` | [ ] |
| 4.2 | Run `Store.removeWord(pack.code, "LA")` in console | Returns false — permanent words cannot be removed | [ ] |
| 4.3 | Run `Store.sweepExpiredWords(pack.code)` in console | Returns empty array — permanent words not swept | [ ] |

---

### 5. Word expiry

| # | Test | Expected | Pass |
|---|------|----------|------|
| 5.1 | Bank a non-permanent word via mastery | Word has `expiresAt` set ~30 days from now | [ ] |
| 5.2 | Manually expire a word in console: `var b = Store.getBank(pack.code); b["MAISON"].expiresAt = Date.now() - 1000; localStorage.setItem("lb_bank_" + pack.code, JSON.stringify(b));` then reload | MAISON removed from bank on load, alert shown | [ ] |
| 5.3 | Run `Store.getExpiringWords(pack.code, 7)` in console | Returns words expiring within 7 days | [ ] |
| 5.4 | Use a banked word as joker substitute | Word lastUsedAt updated, expiresAt reset to 30 days from now | [ ] |

---

### 6. Joker mechanic with bank

| # | Test | Expected | Pass |
|---|------|----------|------|
| 6.1 | Force a joker in console: `G.joker[0]=true; G.words[0]="JOKER"; render();` | Reel 1 shows [J] in red | [ ] |
| 6.2 | Click joker reel | Modal opens showing banked words as chips | [ ] |
| 6.3 | Select a word from bank | Word placed on reel, reel held automatically | [ ] |
| 6.4 | Check `Store.getBank(pack.code)["LA"]` in console | useCount incremented, lastUsedAt updated | [ ] |

---

### 7. Franc credit

| # | Test | Expected | Pass |
|---|------|----------|------|
| 7.1 | Spend all francs (spin 20 times) | JOUER button disables when francs reach 0 | [ ] |
| 7.2 | Close tab, reopen | Francs still 0, button still disabled | [ ] |
| 7.3 | Run `Store.topUpFrancs(pack.code, 10)` in console, reload | Francs = 10, JOUER re-enables | [ ] |

---

### 8. Multiple packs coexisting

| # | Test | Expected | Pass |
|---|------|----------|------|
| 8.1 | Create a second pack in console (different label) | `Store.listPacks()` returns both packs | [ ] |
| 8.2 | Open first pack URL, spend some francs | First pack state persisted | [ ] |
| 8.3 | Open second pack URL in same browser | Second pack loads fresh state independently | [ ] |
| 8.4 | Return to first pack URL | First pack state unchanged | [ ] |
| 8.5 | Run `Store.debugDump()` | Shows separate lb_state and lb_bank keys for each code | [ ] |

---

### 9. Demo mode safety

| # | Test | Expected | Pass |
|---|------|----------|------|
| 9.1 | Open `localhost:5500` (no hash), play and close | Nothing written to localStorage under lb_ for DEMO | [ ] |
| 9.2 | Verify in console: `Object.keys(localStorage).filter(function(k){return k.indexOf("lb_")===0})` | Returns only keys from pack tests — no DEMO keys | [ ] |

---

### 10. Storage diagnostics

| # | Test | Expected | Pass |
|---|------|----------|------|
| 10.1 | Run `Store.getStorageUsageKB()` | Returns a number (KB used by lb_ keys) | [ ] |
| 10.2 | Run `Store.debugDump()` | Returns readable object of all lb_ data | [ ] |

---

### Cleanup after testing

```javascript
// Remove just the test pack and all its data
Store.deletePack(pack.code);

// Or wipe everything (careful — irreversible)
Store.nukeAll();
```

---

### Sign-off

All tests passing: [ ]
Tester: _______________
Date:   _______________
Notes:  _______________
