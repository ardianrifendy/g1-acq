/**
 * g1-acq.js — Google One subscription page product ID mapper (Shadowrocket http-response script)
 *
 * Design principles:
 *   1. Single responsibility — only maps "original monthly ID -> promotional SKU ID", with no diagnostics or telemetry;
 *   2. Catalog-aware — collects real promotional SKUs (ending in acq) from the original response first; if the primary
 *      target is absent from the catalog while the fallback exists, falls back automatically to avoid pointing checkout
 *      at an unavailable item;
 *   3. Data-driven — all mappings live in the SKU_MAP / FALLBACK tables so tiers can be added or removed in one place.
 *
 * Version: v6
 */
"use strict";

console.log("[g1-acq] v6 loaded");

/* Original iOS IAP ID -> target promotional tier */
var SKU_MAP = {
  "g1.ios.20tb.m.v2":     "g1.20tb.3months_ip_90p.acq",
  "g1.ios.30tb.ai.pro.m": "g1.ai.ultra.3months_ip_90p.acq"
};

/* Fallback tier when the primary target is absent from the catalog (75p tiers have been observed in Play/iOS catalogs) */
var FALLBACK = {
  "g1.20tb.3months_ip_90p.acq":     "g1.20tb.3months_ip_75p.acq",
  "g1.ai.ultra.3months_ip_90p.acq": "g1.ai.ultra.3months_ip_75p.acq"
};

function occurrences(s, needle) {
  return needle ? s.split(needle).length - 1 : 0;
}

function run() {
  var body = $response && $response.body;
  if (typeof body !== "string" || body === "") {
    $done({});
    return;
  }

  /* Promotional tiers actually present in the response catalog */
  var raw = body.match(/g1\.[a-z0-9._]{2,60}acq/g) || [];
  var seen = {};
  var catalog = [];
  for (var r = 0; r < raw.length; r++) {
    if (!seen[raw[r]]) { seen[raw[r]] = 1; catalog.push(raw[r]); }
  }
  console.log("[g1-acq] Catalog offers: " + (catalog.join(", ") || "none"));

  var out = body, total = 0;
  var froms = Object.keys(SKU_MAP);
  for (var k = 0; k < froms.length; k++) {
    var from = froms[k];
    var n = occurrences(out, from);
    if (n === 0) continue;

    var to = SKU_MAP[from];
    if (catalog.indexOf(to) === -1 && FALLBACK[to] && catalog.indexOf(FALLBACK[to]) !== -1) {
      console.log("[g1-acq] Primary tier absent from catalog, falling back " + to + " -> " + FALLBACK[to]);
      to = FALLBACK[to];
    }

    out = out.split(from).join(to);
    total += n;
    console.log("[g1-acq] " + from + " -> " + to + " x" + n);
  }

  console.log(total ? "[g1-acq] Rewrote " + total + " occurrence(s)" : "[g1-acq] No match");
  $done(total ? { body: out } : {});
}

run();
