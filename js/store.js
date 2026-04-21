/**
 * store.js — LinguaBandit localStorage persistence layer
 * Version: 1.0
 *
 * All keys are prefixed with "lb_" to avoid collisions.
 * All public functions return the value written, or null on failure.
 * All reads return null if the key does not exist.
 *
 * Key structure:
 *   lb_packs              — index of all packs on this device
 *   lb_pack_{code}        — full pack definition
 *   lb_state_{code}       — student session state (persists on close)
 *   lb_bank_{code}        — student word bank with expiry
 *   lb_mastery_{code}     — mastery scores per word
 *
 * Pack code format: XX-XX-00
 *   e.g. FR-7K-42
 *   Language prefix (2 chars) + 2 random letters + 2 random digits
 *   Unique per device, used as URL hash and localStorage namespace
 */

var Store = (function () {

  /* ══════════════════════════════════════════
     INTERNAL HELPERS
  ══════════════════════════════════════════ */

  function key(type, code) {
    return code ? "lb_" + type + "_" + code : "lb_" + type;
  }

  function read(k) {
    try {
      var raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn("[Store] read failed:", k, e);
      return null;
    }
  }

  function write(k, value) {
    try {
      localStorage.setItem(k, JSON.stringify(value));
      return value;
    } catch (e) {
      console.warn("[Store] write failed:", k, e);
      return null;
    }
  }

  function remove(k) {
    try {
      localStorage.removeItem(k);
      return true;
    } catch (e) {
      console.warn("[Store] remove failed:", k, e);
      return false;
    }
  }

  /* ══════════════════════════════════════════
     CODE GENERATION
  ══════════════════════════════════════════ */

  /**
   * Generates a short readable game code.
   * Format: XX-XX-00  e.g. FR-7K-42
   * Excludes I and O from letters to avoid confusion with 1 and 0.
   */
  function generateCode(language) {
    var lang  = ((language || "fr").slice(0, 2)).toUpperCase();
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    var digits = "0123456789";
    var letters = chars[Math.floor(Math.random() * chars.length)]
                + chars[Math.floor(Math.random() * chars.length)];
    var nums    = digits[Math.floor(Math.random() * digits.length)]
                + digits[Math.floor(Math.random() * digits.length)];
    return lang + "-" + letters + "-" + nums;
  }

  /* ══════════════════════════════════════════
     DEFAULT CONFIG
     All admin-configurable values and their defaults.
     Exposed publicly so the admin UI can reference them.
  ══════════════════════════════════════════ */

  var DEFAULT_CONFIG = {
    nReels:           3,
    maxSpins:         5,
    spinCost:         1,
    wrongPenalty:     3,
    jokerProbability: 0.1,
    earnByReels:      { "3": 3, "4": 4, "5": 5 },
    masteryThreshold: 3,
    bankExpiryDays:   30,
    startingFrancs:   20,
    complexity:       "simple"
  };

  /* ══════════════════════════════════════════
     PACK INDEX
     Lightweight index of all packs on this device.
     Allows listing packs without loading full definitions.
  ══════════════════════════════════════════ */

  function getPackIndex() {
    return read(key("packs")) || {};
  }

  function savePackIndex(index) {
    return write(key("packs"), index);
  }

  function registerPack(code, label, language) {
    var index = getPackIndex();
    index[code] = {
      code:         code,
      label:        label || code,
      language:     language || "fr",
      createdAt:    Date.now(),
      lastPlayedAt: null
    };
    return savePackIndex(index);
  }

  function touchPackLastPlayed(code) {
    var index = getPackIndex();
    if (index[code]) {
      index[code].lastPlayedAt = Date.now();
      savePackIndex(index);
    }
  }

  function listPacks() {
    var index = getPackIndex();
    return Object.keys(index)
      .map(function (k) { return index[k]; })
      .sort(function (a, b) {
        return (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0);
      });
  }

  function packExists(code) {
    return !!getPackIndex()[code];
  }

  /* ══════════════════════════════════════════
     PACK DEFINITION
  ══════════════════════════════════════════ */

  /**
   * Creates a new pack and saves it.
   *
   * @param {string}   label          — human-readable pack name
   * @param {string}   language       — "fr", "ja", "zh"
   * @param {Array}    drums          — array of drum objects:
   *                                    [{ position, name, words: ["LA","LE",...] }]
   *                                    name is optional and cosmetic only.
   *                                    words can appear on multiple drums.
   * @param {Array}    preloadedBank  — words to seed the student bank on first load:
   *                                    [{ word: "LA", permanent: true }]
   * @param {object}   configOverrides — any config values to override from DEFAULT_CONFIG
   * @returns {object} the saved pack including its generated code
   */
  function createPack(label, language, drums, preloadedBank, configOverrides) {
    var code = generateCode(language);
    while (packExists(code)) {
      code = generateCode(language);
    }

    var config = Object.assign({}, DEFAULT_CONFIG, configOverrides || {});

    // Normalise drum words to uppercase, trimmed, non-empty
    var normalisedDrums = (drums || []).map(function (drum) {
      return {
        position: drum.position,
        name:     drum.name || ("Drum " + drum.position),
        words:    (drum.words || [])
                    .map(function (w) { return w.trim().toUpperCase(); })
                    .filter(function (w) { return w.length > 0; })
      };
    });

    // Normalise preloaded bank entries
    var normalisedBank = (preloadedBank || []).map(function (entry) {
      return {
        word:      (entry.word || entry).trim().toUpperCase(),
        permanent: entry.permanent !== false   // default true for preloaded words
      };
    });

    var pack = {
      code:          code,
      label:         label || code,
      language:      language || "fr",
      createdAt:     Date.now(),
      config:        config,
      drums:         normalisedDrums,
      preloadedBank: normalisedBank
    };

    write(key("pack", code), pack);
    registerPack(code, label, language);
    return pack;
  }

  function getPack(code) {
    return read(key("pack", code));
  }

  function updatePackConfig(code, configOverrides) {
    var pack = getPack(code);
    if (!pack) return null;
    pack.config = Object.assign({}, pack.config, configOverrides);
    return write(key("pack", code), pack);
  }

  /**
   * Replaces the drum definitions for a pack.
   * drums: [{ position, name, words }]
   */
  function updatePackDrums(code, drums) {
    var pack = getPack(code);
    if (!pack) return null;
    pack.drums = (drums || []).map(function (drum) {
      return {
        position: drum.position,
        name:     drum.name || ("Drum " + drum.position),
        words:    (drum.words || [])
                    .map(function (w) { return w.trim().toUpperCase(); })
                    .filter(function (w) { return w.length > 0; })
      };
    });
    return write(key("pack", code), pack);
  }

  /**
   * Updates the preloaded bank for a pack.
   * preloadedBank: [{ word, permanent }]
   */
  function updatePreloadedBank(code, preloadedBank) {
    var pack = getPack(code);
    if (!pack) return null;
    pack.preloadedBank = (preloadedBank || []).map(function (entry) {
      return {
        word:      (entry.word || entry).trim().toUpperCase(),
        permanent: entry.permanent !== false
      };
    });
    return write(key("pack", code), pack);
  }

  /**
   * Returns all unique words across all drums for a pack.
   * Useful for building word lists and mastery displays.
   */
  function getAllPackWords(code) {
    var pack = getPack(code);
    if (!pack || !pack.drums) return [];
    var seen = {};
    var all  = [];
    pack.drums.forEach(function (drum) {
      (drum.words || []).forEach(function (w) {
        if (!seen[w]) { seen[w] = true; all.push(w); }
      });
    });
    return all.sort();
  }

  /**
   * Returns words for a specific drum position.
   */
  function getDrumWords(code, position) {
    var pack = getPack(code);
    if (!pack || !pack.drums) return [];
    var drum = pack.drums.find(function (d) { return d.position === position; });
    return drum ? drum.words : [];
  }

  function deletePack(code) {
    var index = getPackIndex();
    delete index[code];
    savePackIndex(index);
    remove(key("pack",    code));
    remove(key("state",   code));
    remove(key("bank",    code));
    remove(key("mastery", code));
    return true;
  }

  /* ══════════════════════════════════════════
     SESSION STATE
     Persists the full game state so a student
     can close the browser and resume exactly
     where they left off.
  ══════════════════════════════════════════ */

  function defaultState(code, pack) {
    var config = (pack && pack.config) ? pack.config : DEFAULT_CONFIG;
    return {
      code:        code,
      francs:      config.startingFrancs,
      spinsLeft:   config.maxSpins,
      spinsUsed:   0,
      hasSpun:     false,
      wins:        0,
      streak:      0,
      words:       [],
      held:        [],
      joker:       [],
      lastSavedAt: null
    };
  }

  /**
   * Loads persisted state. Returns default state if none exists.
   */
  function getState(code) {
    var saved = read(key("state", code));
    if (saved) return saved;
    var pack = getPack(code);
    return defaultState(code, pack);
  }

  /**
   * Saves the current game state. Call this after every spin,
   * hold change, and submission — not just on page unload.
   */
  function saveState(state) {
    state.lastSavedAt = Date.now();
    return write(key("state", state.code), state);
  }

  /**
   * Resets to a fresh session (new round, same pack).
   * Does NOT reset francs, wins, streak — only the spin state.
   */
  function resetSessionState(code) {
    var current = getState(code);
    var pack    = getPack(code);
    var config  = (pack && pack.config) ? pack.config : DEFAULT_CONFIG;
    current.spinsLeft = config.maxSpins;
    current.spinsUsed = 0;
    current.hasSpun   = false;
    current.words     = [];
    current.held      = [];
    current.joker     = [];
    current.lastSavedAt = Date.now();
    return write(key("state", code), current);
  }

  /**
   * Full reset — wipes everything including francs and wins.
   * Used when admin tops up a student or restarts their game.
   */
  function fullResetState(code) {
    var pack  = getPack(code);
    var fresh = defaultState(code, pack);
    fresh.lastSavedAt = Date.now();
    return write(key("state", code), fresh);
  }

  /* ══════════════════════════════════════════
     WORD BANK
  ══════════════════════════════════════════ */

  function getBank(code) {
    return read(key("bank", code)) || {};
  }

  /**
   * Seeds the student's bank with the pack's preloadedBank words.
   * Only runs if the student has no existing bank for this pack
   * (i.e. first time they open the pack).
   * Permanent words have expiresAt: null and are never swept.
   */
  function seedBankIfEmpty(code) {
    var existing = read(key("bank", code));
    if (existing !== null) return false;   // bank already exists, do nothing

    var pack = getPack(code);
    if (!pack || !pack.preloadedBank || pack.preloadedBank.length === 0) {
      write(key("bank", code), {});        // initialise empty bank
      return false;
    }

    var bank    = {};
    var now     = Date.now();
    var expiry  = pack.config.bankExpiryDays * 24 * 60 * 60 * 1000;

    pack.preloadedBank.forEach(function (entry) {
      bank[entry.word] = {
        word:       entry.word,
        bankedAt:   now,
        expiresAt:  entry.permanent ? null : now + expiry,
        permanent:  entry.permanent === true,
        lastUsedAt: null,
        useCount:   0
      };
    });

    write(key("bank", code), bank);
    return true;  // seeding happened
  }

  /**
   * Adds an earned word to the bank.
   * If already present, refreshes its expiry (but keeps permanent flag).
   */
  function bankWord(code, word) {
    var pack   = getPack(code);
    var expiry = (pack ? pack.config.bankExpiryDays : 30) * 24 * 60 * 60 * 1000;
    var bank   = getBank(code);
    var now    = Date.now();
    var existing = bank[word];

    bank[word] = {
      word:       word,
      bankedAt:   existing ? existing.bankedAt : now,
      expiresAt:  (existing && existing.permanent) ? null : now + expiry,
      permanent:  existing ? existing.permanent : false,
      lastUsedAt: existing ? existing.lastUsedAt : null,
      useCount:   existing ? existing.useCount : 0
    };

    write(key("bank", code), bank);
    return bank[word];
  }

  /**
   * Records a word being used as a joker substitute.
   * Resets expiry on use (reward for active use).
   * Permanent words are unaffected by expiry reset but usage is recorded.
   */
  function useWord(code, word) {
    var bank = getBank(code);
    if (!bank[word]) return null;
    var pack   = getPack(code);
    var expiry = (pack ? pack.config.bankExpiryDays : 30) * 24 * 60 * 60 * 1000;
    var now    = Date.now();
    bank[word].lastUsedAt = now;
    bank[word].useCount  += 1;
    if (!bank[word].permanent) {
      bank[word].expiresAt = now + expiry;
    }
    write(key("bank", code), bank);
    return bank[word];
  }

  /**
   * Removes a word from the bank.
   * Used when a banked word is used incorrectly (penalty).
   * Permanent words CANNOT be removed by penalty — returns false.
   */
  function removeWord(code, word) {
    var bank = getBank(code);
    if (!bank[word]) return false;
    if (bank[word].permanent) return false;  // permanent words are protected
    delete bank[word];
    write(key("bank", code), bank);
    return true;
  }

  /**
   * Sweeps expired words from the bank.
   * Call this on every page load.
   * Permanent words are never swept.
   * Returns array of words removed (empty if none).
   */
  function sweepExpiredWords(code) {
    var bank    = getBank(code);
    var now     = Date.now();
    var removed = [];
    Object.keys(bank).forEach(function (word) {
      var entry = bank[word];
      if (!entry.permanent && entry.expiresAt && entry.expiresAt < now) {
        removed.push(word);
        delete bank[word];
      }
    });
    if (removed.length > 0) {
      write(key("bank", code), bank);
    }
    return removed;
  }

  /**
   * Returns active (non-expired) banked words as an array sorted A-Z.
   * Each entry includes full metadata.
   */
  function getActiveWords(code) {
    var bank = getBank(code);
    var now  = Date.now();
    return Object.values(bank)
      .filter(function (entry) {
        return entry.permanent || !entry.expiresAt || entry.expiresAt > now;
      })
      .sort(function (a, b) {
        return a.word.localeCompare(b.word);
      });
  }

  /**
   * Returns words expiring within the next N days, soonest first.
   * Used to show expiry warnings to the student.
   */
  function getExpiringWords(code, withinDays) {
    var bank    = getBank(code);
    var now     = Date.now();
    var horizon = now + ((withinDays || 7) * 24 * 60 * 60 * 1000);
    return Object.values(bank)
      .filter(function (entry) {
        return !entry.permanent
          && entry.expiresAt
          && entry.expiresAt > now
          && entry.expiresAt < horizon;
      })
      .sort(function (a, b) { return a.expiresAt - b.expiresAt; });
  }

  /**
   * Returns human-readable days remaining until expiry.
   * Returns null for permanent words.
   */
  function daysUntilExpiry(entry) {
    if (entry.permanent || !entry.expiresAt) return null;
    var ms   = entry.expiresAt - Date.now();
    var days = Math.ceil(ms / (24 * 60 * 60 * 1000));
    return days > 0 ? days : 0;
  }

  function getBankSize(code) {
    return getActiveWords(code).length;
  }

  function wordIsInBank(code, word) {
    var bank = getBank(code);
    if (!bank[word]) return false;
    var entry = bank[word];
    if (entry.permanent) return true;
    return !entry.expiresAt || entry.expiresAt > Date.now();
  }

  /* ══════════════════════════════════════════
     MASTERY SCORES
  ══════════════════════════════════════════ */

  function getMastery(code) {
    return read(key("mastery", code)) || {};
  }

  /**
   * Increments the mastery score for a word.
   * Returns the new score.
   */
  function incrementMastery(code, word) {
    var mastery  = getMastery(code);
    mastery[word] = (mastery[word] || 0) + 1;
    write(key("mastery", code), mastery);
    return mastery[word];
  }

  /**
   * Returns true if the word has reached the mastery threshold
   * AND is not already in the bank.
   * This is the trigger for banking a newly mastered word.
   */
  function isNewlyMastered(code, word) {
    var pack      = getPack(code);
    var threshold = pack ? pack.config.masteryThreshold : 3;
    var mastery   = getMastery(code);
    var score     = mastery[word] || 0;
    return score >= threshold && !wordIsInBank(code, word);
  }

  function getMasteryScore(code, word) {
    return (getMastery(code))[word] || 0;
  }

  /**
   * Returns mastery progress for all words in the pack as an array,
   * sorted by score descending. Useful for the student's progress view.
   */
  function getMasteryProgress(code) {
    var mastery  = getMastery(code);
    var pack     = getPack(code);
    var threshold = pack ? pack.config.masteryThreshold : 3;
    var words    = getAllPackWords(code);
    return words.map(function (word) {
      var score = mastery[word] || 0;
      return {
        word:      word,
        score:     score,
        threshold: threshold,
        mastered:  score >= threshold,
        banked:    wordIsInBank(code, word)
      };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  /* ══════════════════════════════════════════
     URL / CODE UTILITIES
  ══════════════════════════════════════════ */

  /**
   * Reads the game code from the URL hash.
   * e.g. https://site.com/#FR-7K-42 returns "FR-7K-42"
   * Returns null if no valid code found.
   */
  function getCodeFromURL() {
    var hash = window.location.hash;
    if (!hash || hash.length < 2) return null;
    var code = hash.slice(1).toUpperCase().trim();
    if (/^[A-Z]{2}-[A-Z]{2}-[0-9]{2}$/.test(code)) return code;
    return null;
  }

  /**
   * Builds the shareable URL for a given pack code.
   * This is the URL the teacher shares with students.
   */
function getShareURL(code) {
  var base = window.location.href.split("#")[0];
  base = base.replace(/admin\.html(\?.*)?$/, 'index.html');
  return base + "#" + code;
}

  /**
   * Sets the URL hash without reloading the page.
   */
  function setURLCode(code) {
    if (history.replaceState) {
      history.replaceState(null, "", "#" + code);
    } else {
      window.location.hash = code;
    }
  }

  /* ══════════════════════════════════════════
     ADMIN TOP-UP
     Teachers can add francs to a student's
     state from the admin panel.
  ══════════════════════════════════════════ */

  /**
   * Adds francs to a student's balance.
   * Returns the new balance, or null if state not found.
   */
  function topUpFrancs(code, amount) {
    var state = getState(code);
    if (!state) return null;
    state.francs += (amount || 0);
    saveState(state);
    return state.francs;
  }

  /* ══════════════════════════════════════════
     STORAGE DIAGNOSTICS
  ══════════════════════════════════════════ */

  /**
   * Returns approximate localStorage usage for lb_ keys in KB.
   */
  function getStorageUsageKB() {
    var total = 0;
    try {
      for (var k in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, k)
            && k.indexOf("lb_") === 0) {
          total += (localStorage[k].length + k.length) * 2;
        }
      }
    } catch(e) {}
    return Math.round(total / 1024 * 10) / 10;
  }

  /**
   * Returns a full dump of all lb_ keys. For debugging only.
   */
  function debugDump() {
    var dump = {};
    try {
      for (var k in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, k)
            && k.indexOf("lb_") === 0) {
          try { dump[k] = JSON.parse(localStorage[k]); }
          catch (e) { dump[k] = localStorage[k]; }
        }
      }
    } catch(e) {}
    return dump;
  }

  /**
   * Wipes ALL lb_ keys from localStorage.
   * Irreversible. Admin use only.
   */
  function nukeAll() {
    var toRemove = [];
    try {
      for (var k in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, k)
            && k.indexOf("lb_") === 0) {
          toRemove.push(k);
        }
      }
      toRemove.forEach(function (k) { localStorage.removeItem(k); });
    } catch(e) {}
    return toRemove.length;
  }

  /* ══════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════ */

  return {

    // ── Code and URL ──────────────────────
    generateCode:       generateCode,
    getCodeFromURL:     getCodeFromURL,
    getShareURL:        getShareURL,
    setURLCode:         setURLCode,

    // ── Pack index ────────────────────────
    listPacks:          listPacks,
    packExists:         packExists,
    touchPackLastPlayed:touchPackLastPlayed,

    // ── Pack CRUD ─────────────────────────
    createPack:         createPack,
    getPack:            getPack,
    updatePackConfig:   updatePackConfig,
    updatePackDrums:    updatePackDrums,
    updatePreloadedBank:updatePreloadedBank,
    getAllPackWords:     getAllPackWords,
    getDrumWords:       getDrumWords,
    deletePack:         deletePack,

    // ── Session state ─────────────────────
    getState:           getState,
    saveState:          saveState,
    resetSessionState:  resetSessionState,
    fullResetState:     fullResetState,

    // ── Word bank ─────────────────────────
    seedBankIfEmpty:    seedBankIfEmpty,
    getBank:            getBank,
    bankWord:           bankWord,
    useWord:            useWord,
    removeWord:         removeWord,
    sweepExpiredWords:  sweepExpiredWords,
    getActiveWords:     getActiveWords,
    getExpiringWords:   getExpiringWords,
    daysUntilExpiry:    daysUntilExpiry,
    getBankSize:        getBankSize,
    wordIsInBank:       wordIsInBank,

    // ── Mastery ───────────────────────────
    getMastery:         getMastery,
    incrementMastery:   incrementMastery,
    isNewlyMastered:    isNewlyMastered,
    getMasteryScore:    getMasteryScore,
    getMasteryProgress: getMasteryProgress,

    // ── Admin ─────────────────────────────
    topUpFrancs:        topUpFrancs,

    // ── Config default ────────────────────
    DEFAULT_CONFIG:     DEFAULT_CONFIG,

    // ── Diagnostics ───────────────────────
    getStorageUsageKB:  getStorageUsageKB,
    debugDump:          debugDump,
    nukeAll:            nukeAll
  };

})();
