/**
 * money-input-format.js
 * =====================
 * V2.2 Feature: Money Input Formatting — commas while typing.
 *
 * RESPONSIBILITIES
 * ─────────────────
 * • Format a text input's visible value with thousands separators while the
 *   user types (e.g. 1000000 → "1,000,000").
 * • Keep the cursor in a sensible position after every keystroke / paste.
 * • Expose parseMoneyValue() so form-submission handlers can strip commas and
 *   get a clean floating-point number before any DB / RPC / calculation work.
 *
 * SAFETY RULES (do not violate)
 * ──────────────────────────────
 * • This file ONLY affects visible UI text.
 * • It NEVER changes how numeric values are stored, calculated, or submitted.
 * • parseFloat / Number on a formatted string like "1,000,000" returns NaN —
 *   always call parseMoneyValue() before using the value in business logic.
 * • Dashboard's formatCurrency() is untouched; it receives numbers, not strings.
 */

'use strict';

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

/**
 * Count valid significant characters (digits and at most one decimal point)
 * in a string UP TO position `end`.
 *
 * Used to track the cursor through a reformat without shifting it onto a comma.
 *
 * @param {string} str
 * @param {number} end  — exclusive upper bound (like selectionStart)
 * @param {boolean} allowDecimals
 * @returns {number}
 */
function countSigChars(str, end, allowDecimals) {
  let count = 0;
  let seenDot = false;
  for (let i = 0; i < end; i++) {
    const c = str[i];
    if (c >= '0' && c <= '9') {
      count++;
    } else if (allowDecimals && c === '.' && !seenDot) {
      seenDot = true;
      count++;
    }
  }
  return count;
}

/**
 * Given a raw (possibly comma-containing) string, return a cleanly formatted
 * money string with thousands separators.
 *
 * Rules:
 *  • Existing commas are stripped before parsing — pasting "1,000,000" is safe.
 *  • Non-numeric, non-dot characters are discarded.
 *  • Only the FIRST decimal point is kept; subsequent ones are removed.
 *  • Decimal part is limited to 2 places (only while NOT mid-typing the decimal
 *    portion — see applyMoneyFormat which handles the "still typing" case).
 *  • Empty string → empty string (never coerced to "0").
 *  • Leading zeros before the integer part are collapsed (e.g. "007" → "7"),
 *    EXCEPT a lone "0" before a decimal point stays as "0." .
 *
 * @param {string}  raw
 * @param {boolean} allowDecimals
 * @returns {string}
 */
function formatMoneyString(raw, allowDecimals) {
  if (raw === null || raw === undefined) return '';
  const s = String(raw);
  if (s.trim() === '') return '';

  // Strip commas; then strip anything that isn't a digit or (optionally) a dot
  let cleaned = s.replace(/,/g, '');
  if (allowDecimals) {
    cleaned = cleaned.replace(/[^\d.]/g, '');
  } else {
    cleaned = cleaned.replace(/[^\d]/g, '');
  }

  if (cleaned === '') return '';

  if (allowDecimals && cleaned.includes('.')) {
    // Split on FIRST dot; discard any further dots
    const dotIdx  = cleaned.indexOf('.');
    let intPart   = cleaned.slice(0, dotIdx);
    let decPart   = cleaned.slice(dotIdx + 1).replace(/\./g, '').slice(0, 2);

    // Normalise integer part
    intPart = intPart === '' ? '0' : intPart.replace(/^0+(?=\d)/, '');

    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${formattedInt}.${decPart}`;
  }

  // Integer-only path
  let intPart = cleaned.replace(/^0+(?=\d)/, '');
  if (intPart === '') {
    // cleaned was all zeros e.g. "0"
    intPart = cleaned.slice(-1) || '0';
  }
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* ─────────────────────────────────────────────
   Public API
   ───────────────────────────────────────────── */

/**
 * Strip commas and parse a formatted money string to a float.
 *
 * ALWAYS call this before using an input's value in financial logic,
 * validation, Supabase/Firebase writes, or RPC calls.
 *
 * @param {string|number} val
 * @returns {number}  — NaN if the value is empty or non-numeric
 */
function parseMoneyValue(val) {
  if (val === null || val === undefined) return NaN;
  const clean = String(val).replace(/,/g, '').trim();
  if (clean === '') return NaN;
  const n = Number(clean);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Apply live formatting to a single <input type="text"> element.
 *
 * Called on 'input' events. After reformatting the value it restores the
 * cursor to a position that corresponds to the same logical digit the user's
 * caret was on before the reformat.
 *
 * @param {HTMLInputElement} inputEl
 * @param {boolean}          [allowDecimals=true]
 */
function applyMoneyFormat(inputEl, allowDecimals) {
  if (allowDecimals === undefined) allowDecimals = true;

  const raw       = inputEl.value;
  const selStart  = inputEl.selectionStart ?? raw.length;

  // Edge case: user is in the middle of typing a decimal — preserve trailing dot
  // e.g. "1,000." — don't reformat yet so the dot isn't stripped
  const endsWithDot = allowDecimals && raw.replace(/,/g, '').endsWith('.');

  // Count significant characters before the cursor so we can relocate it
  const sigBefore = countSigChars(raw, selStart, allowDecimals);

  // Get formatted value
  let formatted = formatMoneyString(raw, allowDecimals);

  // Preserve a trailing dot that the user just typed (they may be about to add decimals)
  if (endsWithDot && !formatted.endsWith('.')) {
    formatted = formatted + '.';
  }

  // Only update the DOM if the value actually changed (avoids cursor jump on mobile)
  if (inputEl.value !== formatted) {
    inputEl.value = formatted;

    // Restore cursor: find position in `formatted` where sigBefore sig-chars have passed
    let newPos   = formatted.length; // fallback: end of string
    let sigCount = 0;
    let seenDot  = false;
    for (let i = 0; i < formatted.length; i++) {
      const c = formatted[i];
      if (c >= '0' && c <= '9') {
        sigCount++;
      } else if (allowDecimals && c === '.' && !seenDot) {
        seenDot = true;
        sigCount++;
      }
      if (sigCount === sigBefore) {
        newPos = i + 1;
        break;
      }
    }
    if (sigBefore === 0) newPos = 0;

    try {
      inputEl.setSelectionRange(newPos, newPos);
    } catch (_) {
      // Ignore — some mobile browsers throw when the input is not focused
    }
  }
}

/**
 * Initialise money-input formatting on one or more inputs.
 *
 * Pass a CSS selector string, an HTMLElement, or a NodeList / Array.
 * The `allowDecimals` option applies to ALL inputs in this call — call
 * separately for integer-only inputs.
 *
 * @param {string|Element|NodeList|Array} target
 * @param {Object}  [opts]
 * @param {boolean} [opts.allowDecimals=true]
 */
function initMoneyInput(target, opts) {
  opts = opts || {};
  const allowDecimals = opts.allowDecimals !== false; // default true

  let elements;
  if (typeof target === 'string') {
    elements = Array.from(document.querySelectorAll(target));
  } else if (target instanceof Element) {
    elements = [target];
  } else {
    elements = Array.from(target || []);
  }

  elements.forEach(function (el) {
    if (!el || el.dataset.moneyFormatInitialized === '1') return;
    el.dataset.moneyFormatInitialized = '1';

    // Format existing value immediately (e.g. when editing an existing record)
    if (el.value !== '') {
      // Save cursor position before initial format
      const existing = el.value;
      el.value = formatMoneyString(existing, allowDecimals);
    }

    el.addEventListener('input', function () {
      applyMoneyFormat(el, allowDecimals);
    });

    // On paste: let the browser update the value first, then format
    el.addEventListener('paste', function () {
      setTimeout(function () {
        applyMoneyFormat(el, allowDecimals);
      }, 0);
    });
  });
}

/* ─────────────────────────────────────────────
   Attach to all monetary inputs once DOM ready
   ───────────────────────────────────────────── */

/**
 * Wires up formatting for all known monetary input IDs.
 * Called once on DOMContentLoaded (and safe to call again on dynamic content).
 */
function initAllMoneyInputs() {
  // ── Inputs that allow decimals ──────────────────────────────────────────
  const decimalIds = [
    'income-amount',
    'expense-amount',
    'monthly-budget',
    'savings-goal-target',
    'savings-movement-amount',
    'daily-savings',
    'daily-savings-calculator',
    'onboarding-income-amount',
    'onboarding-safe-daily-spending',
  ];

  decimalIds.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) initMoneyInput(el, { allowDecimals: true });
  });

  // ── Onboarding savings goal rows (cloned from template, class-based) ────
  document.querySelectorAll('.onboarding-goal-target').forEach(function (el) {
    initMoneyInput(el, { allowDecimals: true });
  });
}

// Run on initial load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAllMoneyInputs);
} else {
  initAllMoneyInputs();
}

/* ─────────────────────────────────────────────
   Exports — available globally for form handlers
   ───────────────────────────────────────────── */
window.moneyInputFormat = {
  parseMoneyValue:    parseMoneyValue,
  formatMoneyString:  formatMoneyString,
  applyMoneyFormat:   applyMoneyFormat,
  initMoneyInput:     initMoneyInput,
  initAllMoneyInputs: initAllMoneyInputs,
};

