'use strict';

/**
 * Amount-range payout gateway routing.
 *
 * Centralises how a payout amount maps to the gateway that should process it so
 * the create / status-check / reconcile paths all agree. Resolution precedence:
 *
 *   1. payout_gateway_bands  — N-tier ranges (new, preferred)
 *   2. payout_gateway_threshold + payout_gateway_above/below — legacy 2-way
 *   3. payout_merchant_name  — single gateway (no routing)
 *
 * Band convention: a band { min, max, gateway } matches when
 *   amount >= min && (max === null || amount < max)
 * i.e. min inclusive, max exclusive, null max = no upper bound.
 *
 * A band may instead carry a rotation pattern with a per-gateway run-length:
 *   { min, max, rotation: [ { gateway: "GwA", times: 3 }, { gateway: "GwB", times: 1 } ] }
 * meaning: for a matched amount, cycle through the entries in order, letting
 * each gateway process its own `times` consecutive same-amount payouts before
 * handing off to the next, then wrapping around — e.g. A,A,A,B,A,A,A,B,…
 * Rotation is stateful and applied by the caller (see
 * src/services/payoutRotation.service.js); this module only detects/normalises
 * the pattern. A pattern with fewer than two entries degrades to a plain
 * single-gateway band.
 *
 * The legacy uniform shape { gateways: ["GwA","GwB"], rotateEvery: 3 } is still
 * accepted and expanded to a per-gateway pattern where every gateway shares the
 * same `times`.
 */

/**
 * Normalise a raw band's rotation config into `[{ gateway, times }]` (or null).
 * Accepts the per-gateway `rotation` array and the legacy `gateways`+`rotateEvery`.
 */
function parseRotation(b) {
  if (!b) return null;
  if (Array.isArray(b.rotation)) {
    const r = b.rotation
      .map((e) => ({
        gateway: String((e && e.gateway) || '').trim(),
        times: Math.max(1, parseInt(e && e.times, 10) || 1),
      }))
      .filter((e) => e.gateway);
    return r.length ? r : null;
  }
  if (Array.isArray(b.gateways)) {
    const times = Math.max(1, parseInt(b.rotateEvery, 10) || 1);
    const r = b.gateways
      .map((g) => String(g || '').trim())
      .filter(Boolean)
      .map((gateway) => ({ gateway, times }));
    return r.length ? r : null;
  }
  return null;
}

/**
 * Parse + validate a raw bands value (JSON string OR already-parsed array) into
 * a clean, min-sorted array of normalised bands
 *   { min, max, gateway, rotation }
 * where either `gateway` (single) or `rotation` ([{gateway,times}]) is set.
 * Returns null when there is no usable band config, so callers can fall through
 * to legacy/default routing.
 */
function parseBands(raw) {
  if (raw === null || raw === undefined || raw === '') return null;

  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return null;

  const bands = arr
    .map((b) => {
      const min = b == null || b.min === null || b.min === undefined || b.min === '' ? 0 : parseFloat(b.min);
      const max = b == null || b.max === null || b.max === undefined || b.max === '' ? null : parseFloat(b.max);
      const gateway = b && b.gateway ? String(b.gateway).trim() : '';
      const rotation = parseRotation(b);
      return { min, max, gateway, rotation };
    })
    .filter((b) =>
      (b.gateway || (b.rotation && b.rotation.length)) &&
      !isNaN(b.min) && (b.max === null || !isNaN(b.max))
    );

  if (!bands.length) return null;
  return bands.slice().sort((a, b) => a.min - b.min);
}

/**
 * Resolve the effective payout gateway for a merchant + amount.
 *
 * @param {object} md      MerchantDetails row (bands, legacy threshold cols, payout_merchant_name)
 * @param {number|string} amount
 * @returns {{ gateway: (string|null), routed: boolean, detail: (string|null),
 *            rotation?: Array<{gateway: string, times: number}> }}
 *   `routed` is true only when an amount rule (band or legacy threshold)
 *   actually selected the gateway; `detail` is a human-readable trace string.
 *   When the matched band defines a rotation pattern the result carries
 *   `rotation` and `gateway` is null — the caller must run the stateful
 *   rotation (payoutRotation.service) to obtain the concrete gateway.
 */
function resolvePayoutGateway(md, amount) {
  const fallback = md && md.payout_merchant_name;
  const amt = parseFloat(amount);

  // 1. N-tier bands
  const bands = parseBands(md && md.payout_gateway_bands);
  if (bands) {
    const match = bands.find((b) => amt >= b.min && (b.max === null || amt < b.max));
    if (match) {
      const range = `[${match.min}, ${match.max === null ? '∞' : match.max})`;
      // Rotation pattern (2+ entries): defer to stateful rotation in the caller.
      if (match.rotation && match.rotation.length >= 2) {
        const pattern = match.rotation.map((e) => `${e.gateway}×${e.times}`).join(', ');
        return {
          gateway: null,
          rotation: match.rotation,
          routed: true,
          detail: `Amount-based routing (bands): ${amt} in ${range} -> rotation [${pattern}]`
        };
      }
      const gateway = match.gateway || (match.rotation && match.rotation[0] && match.rotation[0].gateway);
      return {
        gateway,
        routed: true,
        detail: `Amount-based routing (bands): ${amt} in ${range} -> ${gateway}`
      };
    }
    // Amount matched no band — fall back to the single gateway rather than failing.
    return {
      gateway: fallback,
      routed: false,
      detail: `Amount ${amt} outside all configured bands; using default gateway ${fallback}`
    };
  }

  // 2. Legacy single-threshold routing
  const routingThreshold =
    md && md.payout_gateway_threshold !== null && md.payout_gateway_threshold !== undefined && md.payout_gateway_threshold !== ''
      ? parseFloat(md.payout_gateway_threshold)
      : null;
  if (routingThreshold !== null && !isNaN(routingThreshold) && md.payout_gateway_above && md.payout_gateway_below) {
    const gateway = amt >= routingThreshold ? md.payout_gateway_above : md.payout_gateway_below;
    return {
      gateway,
      routed: true,
      detail: `Amount-based routing: ${amt} ${amt >= routingThreshold ? '>=' : '<'} ${routingThreshold} -> ${gateway}`
    };
  }

  // 3. Single configured gateway
  return { gateway: fallback, routed: false, detail: null };
}

/**
 * Validate an array of bands coming from the admin UI. Returns
 * { valid: boolean, bands: (array|null), error: (string|null) }.
 * `bands` is the normalised array to persist (null clears band routing).
 * Rules: every band needs a gateway; min < max (when max set); bands must not
 * overlap and should be contiguous-ish (we only reject overlaps, gaps are
 * allowed and fall back to the default gateway).
 */
function validateBands(rawBands) {
  // Explicit clear: empty array / null means "disable band routing".
  if (rawBands === null || rawBands === undefined) return { valid: true, bands: null, error: null };
  if (Array.isArray(rawBands) && rawBands.length === 0) return { valid: true, bands: null, error: null };

  const parsed = parseBands(rawBands);
  if (!parsed) return { valid: false, bands: null, error: 'Each band needs a gateway (or a rotation pattern) and a valid amount range.' };

  // Every provided band must have resolved a gateway/pattern (parseBands drops
  // invalid ones, so a length mismatch means some row was incomplete).
  const providedCount = Array.isArray(rawBands) ? rawBands.length : null;
  if (providedCount !== null && parsed.length !== providedCount) {
    return { valid: false, bands: null, error: 'Every band must have a gateway (or a rotation pattern of 2+ gateways) and valid Min/Max values.' };
  }

  for (const b of parsed) {
    if (b.max !== null && b.max <= b.min) {
      return { valid: false, bands: null, error: `Band Max (${b.max}) must be greater than Min (${b.min}).` };
    }
    // A rotation band needs at least two entries and at least two distinct gateways.
    if (b.rotation && b.rotation.length >= 2 && new Set(b.rotation.map((e) => e.gateway)).size < 2) {
      return { valid: false, bands: null, error: 'A rotation pattern must contain at least two distinct gateways.' };
    }
  }

  // Validate the raw per-gateway `times` before parseBands' defensive coercion
  // masks a clearly-invalid admin value (e.g. 0, negative, or non-numeric).
  if (Array.isArray(rawBands)) {
    for (const b of rawBands) {
      const rot = b && Array.isArray(b.rotation) ? b.rotation : null;
      if (!rot) continue;
      for (const e of rot) {
        const t = e && e.times;
        if (t === null || t === undefined || t === '') continue;
        const n = Number(t);
        if (!Number.isInteger(n) || n < 1) {
          return { valid: false, bands: null, error: `Rotation "times" must be a whole number >= 1 (got ${t}).` };
        }
      }
    }
  }
  // Overlap check on the sorted list.
  for (let i = 1; i < parsed.length; i++) {
    const prev = parsed[i - 1];
    const cur = parsed[i];
    const prevMax = prev.max === null ? Infinity : prev.max;
    if (cur.min < prevMax) {
      return { valid: false, bands: null, error: 'Bands must not overlap.' };
    }
  }

  // Emit clean shapes: single-gateway bands as { min, max, gateway }, rotation
  // bands as { min, max, rotation: [{ gateway, times }] }.
  const clean = parsed.map((b) => {
    if (b.rotation && b.rotation.length >= 2) {
      return { min: b.min, max: b.max, rotation: b.rotation.map((e) => ({ gateway: e.gateway, times: e.times })) };
    }
    return { min: b.min, max: b.max, gateway: b.gateway || (b.rotation && b.rotation[0].gateway) };
  });

  return { valid: true, bands: clean, error: null };
}

module.exports = { parseBands, resolvePayoutGateway, validateBands };
