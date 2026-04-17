/**
 * LinguaBandit — Automated Persistence Test Suite
 * Version: 1.0
 *
 * HOW TO USE:
 *   1. Open your pack URL in Live Server (or bare localhost:5500 for demo tests)
 *   2. Open browser console (F12)
 *   3. Paste this entire file into the console and press Enter
 *   4. Results print automatically
 *   5. Run LBTest.cleanup() afterwards to remove test data
 *
 * NOTE: UI interaction tests (joker modal, button clicks) cannot be
 * automated and are marked [MANUAL] — run those from the checklist.
 */

var LBTest = (function () {

  /* ── Test registry ── */
  var results = [];
  var testPack = null;
  var testCode = null;

  /* ── Colours for console output ── */
  var C = {
    pass:  "color:#2EC27E;font-weight:bold",
    fail:  "color:#E8112D;font-weight:bold",
    skip:  "color:#888",
    head:  "color:#FFC72C;font-weight:bold;font-size:14px",
    sub:   "color:#aaa;font-weight:bold",
    reset: "color:inherit"
  };

  /* ── Assertion helpers ── */
  function assert(id, description, condition, detail) {
    var passed = !!condition;
    results.push({ id: id, description: description, passed: passed, detail: detail || "" });
    return passed;
  }

  function assertEq(id, description, actual, expected) {
    var passed = actual === expected;
    var detail = passed ? "" : "Expected: " + JSON.stringify(expected) + " | Got: " + JSON.stringify(actual);
    return assert(id, description, passed, detail);
  }

  function assertTruthy(id, description, val) {
    return assert(id, description, !!val, val === null ? "Got null" : val === undefined ? "Got undefined" : "Got: " + JSON.stringify(val));
  }

  function assertFalsy(id, description, val) {
    return assert(id, description, !val, "Got: " + JSON.stringify(val));
  }

  function assertArrayIncludes(id, description, arr, item) {
    var passed = Array.isArray(arr) && arr.indexOf(item) !== -1;
    return assert(id, description, passed, passed ? "" : JSON.stringify(item) + " not found in " + JSON.stringify(arr));
  }

  function assertObjectHasKey(id, description, obj, key) {
    var passed = obj !== null && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, key);
    return assert(id, description, passed, passed ? "" : "Key '" + key + "' missing from object");
  }

  function manual(id, description) {
    results.push({ id: id, description: description, passed: null, detail: "MANUAL — see checklist" });
  }

  /* ── Setup ── */
  function setup() {
    /* Wipe any leftover test data */
    var existing = Store.listPacks().filter(function(p){ return p.label.indexOf("LBTest") === 0; });
    existing.forEach(function(p){ Store.deletePack(p.code); });

    testPack = Store.createPack(
      "LBTest Auto Pack",
      "fr",
      [
        { position:1, words:["LA","LE","LES","UNE","UN"] },
        { position:2, words:["MAISON","CHAT","CHIEN","LIVRE","TABLE"] },
        { position:3, words:["BLEUE","ROUGE","GRAND","PETIT","VIEUX"] }
      ],
      [
        { word:"LA",  permanent:true },
        { word:"LE",  permanent:true },
        { word:"LES", permanent:true }
      ],
      {
        nReels: 3, maxSpins: 5, spinCost: 1, wrongPenalty: 3,
        jokerProbability: 0.1, masteryThreshold: 3,
        bankExpiryDays: 30, startingFrancs: 20, complexity: "simple"
      }
    );
    testCode = testPack.code;
    return testCode;
  }

  /* ══════════════════════════════════════════
     TEST SECTIONS
  ══════════════════════════════════════════ */

  function runSection1_PackLoading() {
    console.log("%c\n── 1. Pack Loading ──", C.sub);

    assertTruthy("1.1", "Pack created and retrievable",
      Store.getPack(testCode));

    assertEq("1.2", "Pack label correct",
      Store.getPack(testCode).label, "LBTest Auto Pack");

    assertEq("1.3", "Pack language correct",
      Store.getPack(testCode).language, "fr");

    assertEq("1.4", "Pack has 3 drums",
      Store.getPack(testCode).drums.length, 3);

    assert("1.5", "Pack appears in index",
      Store.listPacks().some(function(p){ return p.code === testCode; }));

    assertTruthy("1.6", "packExists() returns true for valid code",
      Store.packExists(testCode));

    assertFalsy("1.7", "packExists() returns false for invented code",
      Store.packExists("XX-ZZ-99"));

    assertTruthy("1.8", "getShareURL() returns URL containing code",
      Store.getShareURL(testCode).indexOf(testCode) !== -1);

    assert("1.9", "getAllPackWords() returns all unique words across drums",
      Store.getAllPackWords(testCode).length >= 5);

    assertEq("1.10", "getDrumWords() returns correct words for drum 1",
      Store.getDrumWords(testCode, 1).indexOf("LA") !== -1, true);
  }

  function runSection2_SessionState() {
    console.log("%c\n── 2. Session State ──", C.sub);

    /* Start fresh */
    var state = Store.getState(testCode);
    assertTruthy("2.1", "getState() returns object for new pack",
      state && typeof state === "object");

    assertEq("2.2", "Default francs = 20",
      state.francs, 20);

    assertEq("2.3", "Default spinsLeft = 5",
      state.spinsLeft, 5);

    assertFalsy("2.4", "Default hasSpun = false",
      state.hasSpun);

    /* Mutate and save */
    state.francs    = 17;
    state.spinsLeft = 3;
    state.spinsUsed = 2;
    state.hasSpun   = true;
    state.wins      = 1;
    state.streak    = 1;
    Store.saveState(state);

    /* Read back */
    var reloaded = Store.getState(testCode);
    assertEq("2.5", "Francs persisted correctly",   reloaded.francs,    17);
    assertEq("2.6", "SpinsLeft persisted correctly", reloaded.spinsLeft, 3);
    assertEq("2.7", "SpinsUsed persisted correctly", reloaded.spinsUsed, 2);
    assertEq("2.8", "HasSpun persisted correctly",   reloaded.hasSpun,   true);
    assertEq("2.9", "Wins persisted correctly",      reloaded.wins,      1);
    assertEq("2.10","Streak persisted correctly",    reloaded.streak,    1);

    assertTruthy("2.11", "lastSavedAt is set",
      reloaded.lastSavedAt && reloaded.lastSavedAt > 0);

    /* Reset session — keeps francs and wins */
    Store.resetSessionState(testCode);
    var reset = Store.getState(testCode);
    assertEq("2.12", "resetSessionState keeps francs",   reset.francs, 17);
    assertEq("2.13", "resetSessionState keeps wins",     reset.wins,   1);
    assertEq("2.14", "resetSessionState resets spinsLeft", reset.spinsLeft, 5);
    assertFalsy("2.15","resetSessionState resets hasSpun", reset.hasSpun);

    /* Full reset */
    Store.fullResetState(testCode);
    var full = Store.getState(testCode);
    assertEq("2.16", "fullResetState resets francs to default", full.francs, 20);
    assertEq("2.17", "fullResetState resets wins to 0",         full.wins,   0);
  }

  function runSection3_WordBank() {
    console.log("%c\n── 3. Word Bank ──", C.sub);

    /* Seed on first load */
    var seeded = Store.seedBankIfEmpty(testCode);
    assertTruthy("3.1", "seedBankIfEmpty() seeds preloaded words on first call",
      seeded);

    var bank = Store.getBank(testCode);
    assertObjectHasKey("3.2", "LA in bank after seeding",  bank, "LA");
    assertObjectHasKey("3.3", "LE in bank after seeding",  bank, "LE");
    assertObjectHasKey("3.4", "LES in bank after seeding", bank, "LES");

    /* Should not re-seed */
    var seeded2 = Store.seedBankIfEmpty(testCode);
    assertFalsy("3.5", "seedBankIfEmpty() does not re-seed on second call",
      seeded2);

    /* Bank size */
    assertEq("3.6", "getBankSize() = 3 after seeding",
      Store.getBankSize(testCode), 3);

    /* Bank an earned word */
    Store.bankWord(testCode, "MAISON");
    assertEq("3.7", "getBankSize() = 4 after banking MAISON",
      Store.getBankSize(testCode), 4);

    assertTruthy("3.8", "wordIsInBank() true for MAISON",
      Store.wordIsInBank(testCode, "MAISON"));

    assertFalsy("3.9", "wordIsInBank() false for CHAT (not banked)",
      Store.wordIsInBank(testCode, "CHAT"));

    /* getActiveWords returns sorted array */
    var active = Store.getActiveWords(testCode);
    assertTruthy("3.10", "getActiveWords() returns array",
      Array.isArray(active));
    assertEq("3.11", "getActiveWords() length = 4",
      active.length, 4);
    assert("3.12", "getActiveWords() sorted A-Z",
      active[0].word <= active[active.length-1].word);
  }

  function runSection4_PermanentWords() {
    console.log("%c\n── 4. Permanent Words ──", C.sub);

    var bank = Store.getBank(testCode);

    assertEq("4.1", "LA has permanent:true",
      bank["LA"].permanent, true);

    assertEq("4.2", "LA has expiresAt:null",
      bank["LA"].expiresAt, null);

    assertEq("4.3", "LE has permanent:true",
      bank["LE"].permanent, true);

    /* Cannot remove permanent word */
    var removed = Store.removeWord(testCode, "LA");
    assertFalsy("4.4", "removeWord() returns false for permanent word",
      removed);

    assertTruthy("4.5", "LA still in bank after attempted removal",
      Store.wordIsInBank(testCode, "LA"));

    /* Sweep does not touch permanent words */
    var swept = Store.sweepExpiredWords(testCode);
    assertFalsy("4.6", "sweepExpiredWords() does not include permanent words",
      swept.indexOf("LA") !== -1);

    assertTruthy("4.7", "LA still in bank after sweep",
      Store.wordIsInBank(testCode, "LA"));

    /* MAISON (non-permanent) can be removed */
    var removedMaison = Store.removeWord(testCode, "MAISON");
    assertTruthy("4.8", "removeWord() returns true for non-permanent word",
      removedMaison);

    assertFalsy("4.9", "MAISON gone from bank after removal",
      Store.wordIsInBank(testCode, "MAISON"));

    /* Re-bank MAISON for further tests */
    Store.bankWord(testCode, "MAISON");
  }

  function runSection5_Expiry() {
    console.log("%c\n── 5. Word Expiry ──", C.sub);

    /* MAISON should have expiresAt set */
    var bank = Store.getBank(testCode);
    assertTruthy("5.1", "MAISON has expiresAt set",
      bank["MAISON"] && bank["MAISON"].expiresAt !== null);

    assert("5.2", "MAISON expiresAt is ~30 days from now",
      bank["MAISON"].expiresAt > Date.now() + (29 * 24 * 60 * 60 * 1000));

    /* daysUntilExpiry for non-permanent word */
    var days = Store.daysUntilExpiry(bank["MAISON"]);
    assert("5.3", "daysUntilExpiry() returns ~30 for fresh word",
      days >= 29 && days <= 31);

    /* daysUntilExpiry for permanent word */
    var daysLA = Store.daysUntilExpiry(bank["LA"]);
    assertEq("5.4", "daysUntilExpiry() returns null for permanent word",
      daysLA, null);

    /* Manually expire MAISON */
    bank["MAISON"].expiresAt = Date.now() - 1000;
    localStorage.setItem("lb_bank_" + testCode, JSON.stringify(bank));

    /* Sweep should remove it */
    var swept = Store.sweepExpiredWords(testCode);
    assertArrayIncludes("5.5", "sweepExpiredWords() removes expired MAISON",
      swept, "MAISON");

    assertFalsy("5.6", "MAISON gone from active words after sweep",
      Store.wordIsInBank(testCode, "MAISON"));

    assertTruthy("5.7", "LA still in bank after sweep (permanent)",
      Store.wordIsInBank(testCode, "LA"));

    /* getExpiringWords */
    /* Bank a word that expires in 3 days */
    var b2 = Store.getBank(testCode);
    b2["CHAT"] = {
      word: "CHAT", bankedAt: Date.now(),
      expiresAt: Date.now() + (3 * 24 * 60 * 60 * 1000),
      permanent: false, lastUsedAt: null, useCount: 0
    };
    localStorage.setItem("lb_bank_" + testCode, JSON.stringify(b2));

    var expiring = Store.getExpiringWords(testCode, 7);
    assertTruthy("5.8", "getExpiringWords() finds CHAT expiring in 3 days",
      expiring.some(function(e){ return e.word === "CHAT"; }));

    var notExpiring = Store.getExpiringWords(testCode, 1);
    assertFalsy("5.9", "getExpiringWords(1) does not include CHAT (expires in 3 days)",
      notExpiring.some(function(e){ return e.word === "CHAT"; }));

    /* useWord resets expiry */
    Store.useWord(testCode, "CHAT");
    var b3 = Store.getBank(testCode);
    assert("5.10", "useWord() resets CHAT expiry to ~30 days",
      b3["CHAT"].expiresAt > Date.now() + (29 * 24 * 60 * 60 * 1000));

    assertTruthy("5.11", "useWord() increments useCount",
      b3["CHAT"].useCount === 1);

    assertTruthy("5.12", "useWord() sets lastUsedAt",
      b3["CHAT"].lastUsedAt !== null);
  }

  function runSection6_Mastery() {
    console.log("%c\n── 6. Mastery ──", C.sub);

    /* Start fresh mastery */
    assertEq("6.1", "getMasteryScore() = 0 for unplayed word",
      Store.getMasteryScore(testCode, "ROUGE"), 0);

    /* Increment once */
    var s1 = Store.incrementMastery(testCode, "ROUGE");
    assertEq("6.2", "incrementMastery() returns 1 after first increment",
      s1, 1);

    /* Not yet mastered */
    assertFalsy("6.3", "isNewlyMastered() false at score 1 (threshold 3)",
      Store.isNewlyMastered(testCode, "ROUGE"));

    /* Increment to threshold */
    Store.incrementMastery(testCode, "ROUGE");
    Store.incrementMastery(testCode, "ROUGE");

    assertTruthy("6.4", "isNewlyMastered() true at score 3",
      Store.isNewlyMastered(testCode, "ROUGE"));

    /* Bank the word */
    Store.bankWord(testCode, "ROUGE");

    assertFalsy("6.5", "isNewlyMastered() false once word is in bank",
      Store.isNewlyMastered(testCode, "ROUGE"));

    /* getMasteryProgress */
    var progress = Store.getMasteryProgress(testCode);
    assertTruthy("6.6", "getMasteryProgress() returns array",
      Array.isArray(progress));

    var rougeEntry = progress.find(function(p){ return p.word === "ROUGE"; });
    assertTruthy("6.7", "getMasteryProgress() includes ROUGE",
      rougeEntry);
    assertEq("6.8", "ROUGE shows mastered:true in progress",
      rougeEntry && rougeEntry.mastered, true);
    assertEq("6.9", "ROUGE shows banked:true in progress",
      rougeEntry && rougeEntry.banked, true);
    assertEq("6.10","ROUGE score = 3 in progress",
      rougeEntry && rougeEntry.score, 3);
  }

  function runSection7_FrancTopUp() {
    console.log("%c\n── 7. Franc Top-Up ──", C.sub);

    /* Set known state */
    Store.fullResetState(testCode);
    var state = Store.getState(testCode);
    assertEq("7.1", "Francs start at 20 after full reset",
      state.francs, 20);

    /* Top up */
    var newBalance = Store.topUpFrancs(testCode, 10);
    assertEq("7.2", "topUpFrancs() returns correct new balance",
      newBalance, 30);

    var reloaded = Store.getState(testCode);
    assertEq("7.3", "Top-up persisted in state",
      reloaded.francs, 30);

    /* Top up by 0 */
    var unchanged = Store.topUpFrancs(testCode, 0);
    assertEq("7.4", "topUpFrancs(0) does not change balance",
      unchanged, 30);
  }

  function runSection8_MultiplePacks() {
    console.log("%c\n── 8. Multiple Packs ──", C.sub);

    var pack2 = Store.createPack(
      "LBTest Pack 2", "fr",
      [{ position:1, words:["JE","TU","IL"] }],
      [],
      { nReels:1, startingFrancs:15 }
    );
    var code2 = pack2.code;

    assertEq("8.1", "Both packs appear in listPacks()",
      Store.listPacks().filter(function(p){
        return p.label.indexOf("LBTest") === 0;
      }).length, 2);

    /* Mutate pack 1 state */
    var s1 = Store.getState(testCode);
    s1.francs = 7;
    Store.saveState(s1);

    /* Pack 2 state should be independent */
    var s2 = Store.getState(code2);
    assertEq("8.2", "Pack 2 starts with its own default francs",
      s2.francs, 15);

    assertEq("8.3", "Pack 1 francs unchanged by pack 2 access",
      Store.getState(testCode).francs, 7);

    /* Separate bank keys */
    Store.bankWord(testCode, "VIEUX");
    assertFalsy("8.4", "VIEUX in pack 1 bank does not appear in pack 2 bank",
      Store.wordIsInBank(code2, "VIEUX"));

    /* Delete pack 2 */
    Store.deletePack(code2);
    assertFalsy("8.5", "Pack 2 gone after deletePack()",
      Store.packExists(code2));

    assertTruthy("8.6", "Pack 1 still exists after pack 2 deleted",
      Store.packExists(testCode));
  }

  function runSection9_Diagnostics() {
    console.log("%c\n── 9. Diagnostics ──", C.sub);

    var kb = Store.getStorageUsageKB();
    assert("9.1", "getStorageUsageKB() returns a positive number",
      typeof kb === "number" && kb > 0);

    var dump = Store.debugDump();
    assertTruthy("9.2", "debugDump() returns object",
      dump && typeof dump === "object");

    assert("9.3", "debugDump() contains pack key",
      Object.keys(dump).some(function(k){ return k === "lb_pack_" + testCode; }));

    assert("9.4", "debugDump() contains state key",
      Object.keys(dump).some(function(k){ return k === "lb_state_" + testCode; }));

    assert("9.5", "debugDump() contains bank key",
      Object.keys(dump).some(function(k){ return k === "lb_bank_" + testCode; }));
  }

  function runSection10_PackUpdates() {
    console.log("%c\n── 10. Pack Config Updates ──", C.sub);

    Store.updatePackConfig(testCode, { maxSpins: 8 });
    assertEq("10.1", "updatePackConfig() updates maxSpins",
      Store.getPack(testCode).config.maxSpins, 8);

    assertEq("10.2", "updatePackConfig() does not alter other config fields",
      Store.getPack(testCode).config.spinCost, 1);

    Store.updatePackDrums(testCode, [
      { position:1, words:["JE","TU","IL","ELLE"] },
      { position:2, words:["MANGE","DORT","COURT"] },
      { position:3, words:["VITE","BIEN","MAL"] }
    ]);
    assertEq("10.3", "updatePackDrums() replaces drum words",
      Store.getDrumWords(testCode, 1).indexOf("JE") !== -1, true);

    assertEq("10.4", "Old drum words gone after updatePackDrums()",
      Store.getDrumWords(testCode, 1).indexOf("LA") !== -1, false);

    Store.updatePreloadedBank(testCode, [
      { word:"JE", permanent:true }
    ]);
    assertEq("10.5", "updatePreloadedBank() replaces preloaded bank",
      Store.getPack(testCode).preloadedBank[0].word, "JE");
  }

  function runSection11_DOMContentLoaded() {
    console.log("%c\n── 11. DOMContentLoaded Timing ──", C.sub);

    /* ── 11.1 — getCodeFromURL() returns null when hash is empty ── */
    var savedHash = window.location.hash;

    /* Temporarily clear the hash */
    history.replaceState(null, "", window.location.pathname);
    var noHash = Store.getCodeFromURL();
    assertEq("11.1", "getCodeFromURL() returns null when no hash present",
      noHash, null);

    /* Restore hash */
    history.replaceState(null, "", savedHash || "");

    /* ── 11.2 — getCodeFromURL() returns null for invalid hash formats ── */
    var badFormats = ["#NOTACODE", "#FR-C-49", "#FR-CK-4", "#frcK49", "#FR_CK_49"];
    var allNull = badFormats.every(function(h) {
      history.replaceState(null, "", h);
      return Store.getCodeFromURL() === null;
    });
    history.replaceState(null, "", savedHash || "");
    assert("11.2", "getCodeFromURL() returns null for all invalid hash formats",
      allNull);

    /* ── 11.3 — getCodeFromURL() returns code for valid hash ── */
    history.replaceState(null, "", "#" + testCode);
    var validRead = Store.getCodeFromURL();
    history.replaceState(null, "", savedHash || "");
    assertEq("11.3", "getCodeFromURL() returns correct code for valid hash",
      validRead, testCode);

    /* ── 11.4 — CODE is never DEMO when a valid hash is present ──
       This is the regression test for the DOMContentLoaded timing bug.
       We simulate what init() does: read code from URL, check it is
       not "DEMO" when a real pack code is in the hash.           ── */
    history.replaceState(null, "", "#" + testCode);
    var codeFromURL = Store.getCodeFromURL();
    history.replaceState(null, "", savedHash || "");

    assert("11.4", "CODE is not DEMO when valid pack hash is in URL",
      codeFromURL !== "DEMO" && codeFromURL !== null);

    /* ── 11.5 — packExists() true for code read from URL ── */
    assert("11.5", "packExists() is true for code read from URL hash",
      Store.packExists(codeFromURL));

    /* ── 11.6 — getState() loaded from URL code returns saved data,
       not default state. Simulates what init() does after the fix:
       read code → load state → verify francs are not reset to 20
       when a modified state has been saved.                       ── */
    var knownState = Store.getState(testCode);
    knownState.francs = 13;
    Store.saveState(knownState);

    var reloaded = Store.getState(testCode);
    assertEq("11.6", "getState() returns saved francs, not default (DOMContentLoaded regression)",
      reloaded.francs, 13);

    /* ── 11.7 — Verify CODE "DEMO" path uses default state, not saved ──
       If CODE were DEMO (the pre-fix bug), getState("DEMO") would
       return a default state with francs=20, not the pack's saved 13. ── */
    var demoState = Store.getState("DEMO");
    assertEq("11.7", "getState(DEMO) returns default francs=20, not pack saved state",
      demoState.francs, 20);

    /* ── 11.8 — setURLCode() updates hash without page reload ── */
    Store.setURLCode(testCode);
    var hashAfterSet = window.location.hash;
    history.replaceState(null, "", savedHash || "");
    assertEq("11.8", "setURLCode() sets URL hash to pack code",
      hashAfterSet, "#" + testCode);

    /* ── 11.9 — getShareURL() produces URL containing pack code ── */
    var shareURL = Store.getShareURL(testCode);
    assert("11.9", "getShareURL() contains pack code",
      shareURL.indexOf(testCode) !== -1);

    assert("11.10", "getShareURL() contains # separator",
      shareURL.indexOf("#") !== -1);

    /* Restore original hash */
    if (savedHash) {
      history.replaceState(null, "", savedHash);
    }
  }

  function runManualSection() {
    console.log("%c\n── 12. Manual UI Tests (see checklist) ──", C.sub);
    manual("M.1",  "Game loads correctly in browser with pack URL");
    manual("M.2",  "Demo mode loads correctly with no hash");
    manual("M.3",  "Session state (francs, held reel) persists across tab close");
    manual("M.4",  "Preloaded bank words present on first visit");
    manual("M.5",  "Ma Banque shows preloaded words");
    manual("M.6",  "Joker modal opens and places word correctly");
    manual("M.7",  "Joker use recorded in bank (useCount, lastUsedAt)");
    manual("M.8",  "Expiry alert shown when expired word removed on reload");
    manual("M.9",  "Franc top-up re-enables JOUER button");
    manual("M.10", "Multiple packs coexist independently");
    manual("M.11", "Flashcard print view opens with blank cards");
    manual("M.12", "Demo mode leaves no lb_ trace in localStorage");
  }

  /* ══════════════════════════════════════════
     REPORT
  ══════════════════════════════════════════ */

  function printReport() {
    var passed  = results.filter(function(r){ return r.passed === true;  }).length;
    var failed  = results.filter(function(r){ return r.passed === false; }).length;
    var manual  = results.filter(function(r){ return r.passed === null;  }).length;
    var total   = results.length;

    console.log("%c\n═══════════════════════════════════════", C.head);
    console.log("%c  LinguaBandit Persistence Test Report", C.head);
    console.log("%c═══════════════════════════════════════\n", C.head);

    results.forEach(function(r) {
      if (r.passed === true) {
        console.log("%c  PASS  %c" + r.id + " — " + r.description, C.pass, C.reset);
      } else if (r.passed === false) {
        console.log("%c  FAIL  %c" + r.id + " — " + r.description, C.fail, C.reset);
        if (r.detail) console.log("        %c" + r.detail, C.fail);
      } else {
        console.log("%c  ----  " + r.id + " — " + r.description + " [MANUAL]", C.skip);
      }
    });

    console.log("\n%c═══════════════════════════════════════", C.head);
    console.log(
      "%c  Results: %c" + passed + " passed  %c" + failed + " failed  %c" + manual + " manual  %c/ " + total + " total",
      C.reset, C.pass, C.fail, C.skip, C.reset
    );
    if (failed === 0) {
      console.log("%c  All automated tests passed. Run manual tests from checklist.", C.pass);
    } else {
      console.log("%c  " + failed + " test(s) failed — review above.", C.fail);
    }
    console.log("%c═══════════════════════════════════════\n", C.head);
    console.log("%cRun LBTest.cleanup() to remove test data.", C.skip);

    return { passed: passed, failed: failed, manual: manual, total: total };
  }

  /* ══════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════ */

  function run() {
    results = [];
    console.clear();
    console.log("%cLinguaBandit — running persistence tests...", C.head);

    try {
      setup();
      runSection1_PackLoading();
      runSection2_SessionState();
      runSection3_WordBank();
      runSection4_PermanentWords();
      runSection5_Expiry();
      runSection6_Mastery();
      runSection7_FrancTopUp();
      runSection8_MultiplePacks();
      runSection9_Diagnostics();
      runSection10_PackUpdates();
      runSection11_DOMContentLoaded();
      runManualSection();
    } catch(e) {
      console.error("Test runner error:", e);
    }

    return printReport();
  }

  function cleanup() {
    var removed = 0;
    Store.listPacks().forEach(function(p) {
      if (p.label.indexOf("LBTest") === 0) {
        Store.deletePack(p.code);
        removed++;
      }
    });
    console.log("%cLBTest cleanup: removed " + removed + " test pack(s).", C.skip);
  }

  function runSingle(sectionFn) {
    results = [];
    try { setup(); sectionFn(); }
    catch(e) { console.error("Error:", e); }
    printReport();
  }

  return {
    run:      run,
    cleanup:  cleanup,
    /* Expose individual sections for targeted re-runs */
    s1:  function(){ runSingle(runSection1_PackLoading);       },
    s2:  function(){ runSingle(runSection2_SessionState);      },
    s3:  function(){ runSingle(runSection3_WordBank);          },
    s4:  function(){ runSingle(runSection4_PermanentWords);    },
    s5:  function(){ runSingle(runSection5_Expiry);            },
    s6:  function(){ runSingle(runSection6_Mastery);           },
    s7:  function(){ runSingle(runSection7_FrancTopUp);        },
    s8:  function(){ runSingle(runSection8_MultiplePacks);     },
    s9:  function(){ runSingle(runSection9_Diagnostics);       },
    s10: function(){ runSingle(runSection10_PackUpdates);      },
    s11: function(){ runSingle(runSection11_DOMContentLoaded); }
  };

})();

/* Auto-run on paste */
LBTest.run();
