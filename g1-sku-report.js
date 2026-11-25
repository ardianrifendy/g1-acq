/* Local-only report served by a Shadowrocket http-request script. */
"use strict";

(function () {
  var ROOT = "https://one.google.com/g1-sku-report";
  var VERSION = "v7.6.0";
  var COLLECTOR_VERSION = "g1-acq-v7.6";
  var CONFIGURED_TARGET = "g1.2tb.ai.12months_ip_90p";
  var LEGACY_TARGET = "g1.2tb.ai.annual";
  var SCAN_KEY = "g1.sku.scan.v1";
  var TEST_KEY = "g1.pro.annual.test.v1";
  var OTHER_PATH = "[other one.google.com path]";
  var url = typeof $request === "object" && $request ? $request.url : "";
  if (typeof url !== "string" || !/^https:\/\/one\.google\.com\/g1-sku-report\/?(?:\?|$)/.test(url)) {
    $done({});
    return;
  }

  var storageAvailable = typeof $persistentStore !== "undefined" &&
    typeof $persistentStore.read === "function";
  var clearMessage = "";
  if (/(?:\?|&)clear=1(?:&|$)/.test(url)) {
    try {
      var scanCleared = $persistentStore.write("{}", SCAN_KEY);
      var testCleared = $persistentStore.write("{}", TEST_KEY);
      clearMessage = scanCleared && testCleared ? "Both local records for this tool have been cleared." : "Failed to clear local records.";
    } catch (error) {
      clearMessage = "Local storage interface is not ready.";
    }
  }

  function load(key) {
    if (!storageAvailable) return {};
    try {
      var value = JSON.parse($persistentStore.read(key) || "{}");
      return value && value.schemaVersion === 1 ? value : {};
    } catch (error) {
      return {};
    }
  }
  function text(value, length) {
    return typeof value === "string" ? value.slice(0, length || 180) : "";
  }
  function count(value) {
    var number = Number(value);
    return isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }
  function sku(value) {
    return typeof value === "string" && /^g1\.[A-Za-z0-9._-]{1,160}$/.test(value) ? value : "";
  }
  function rows(value, withTime, defaultTarget) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 300).filter(function (row) {
      return row && typeof row.id === "string" &&
        /^(?:g1\.|com\.google\.one\.)[A-Za-z0-9._-]{1,160}$/.test(row.id);
    }).map(function (row) {
      var out = { id: row.id, count: count(row.count) };
      if (withTime) {
        out.lastSeen = text(row.lastSeen, 32);
      } else {
        out.to = sku(row.to) || (row.id.indexOf("g1.ios.2tb.") === 0 ? defaultTarget || "" : "");
        out.fallback = row.fallback === true;
      }
      return out;
    }).sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
  }

  var scanStatuses = {
    "new-skus": "New product IDs discovered and recorded",
    "known-skus": "Response received; IDs already recorded (duplicates)",
    "no-skus": "Text response received; no product IDs found",
    "limit-reached": "New product IDs received; collection capacity limit reached",
    "non-text": "Response received; body is not scannable text"
  };
  var scanPaths = ["/", "/ai", "/plans", "/_/…/data/batchexecute", OTHER_PATH];
  function recent(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(-10).filter(function (event) {
      return event && typeof event.at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(event.at) &&
        (event.bodyType === "text" || event.bodyType === "non-text") &&
        Object.prototype.hasOwnProperty.call(scanStatuses, event.status);
    }).map(function (event) {
      return {
        at: event.at,
        path: scanPaths.indexOf(event.path) !== -1 ? event.path : OTHER_PATH,
        bodyType: event.bodyType,
        status: event.status,
        candidateCount: count(event.candidateCount),
        addedCount: count(event.addedCount),
        omittedCount: count(event.omittedCount)
      };
    });
  }

  var scanRaw = load(SCAN_KEY);
  var testRaw = load(TEST_KEY);
  var recordedTarget = sku(testRaw.target);
  if (!recordedTarget && /^(?:pro-annual-test-v[12]|g1-acq-v7(?:\.0|\.1)?)$/.test(testRaw.version || "")) {
    recordedTarget = LEGACY_TARGET;
  }
  var matchedFrom = rows(testRaw.matchedFrom, false, recordedTarget);
  if (!recordedTarget) {
    matchedFrom.some(function (row) {
      if (row.id.indexOf("g1.ios.2tb.") === 0 && row.to) {
        recordedTarget = row.to;
        return true;
      }
      return false;
    });
  }
  var annualHitCount = typeof testRaw.annualHitCount === "number" ? count(testRaw.annualHitCount) :
    matchedFrom.reduce(function (total, row) {
      return total + (row.id.indexOf("g1.ios.2tb.") === 0 ? row.count : 0);
    }, 0);
  var storedOrigin = text(testRaw.targetOrigin, 32);
  var targetOrigin = recordedTarget && /^(?:user-specified|pattern-derived|legacy)$/.test(storedOrigin) ?
    storedOrigin : recordedTarget === CONFIGURED_TARGET ? "user-specified" :
      recordedTarget === LEGACY_TARGET ? "legacy" : "";
  var report = {
    schemaVersion: 1,
    reportVersion: VERSION,
    configuredTarget: CONFIGURED_TARGET,
    storageAvailable: storageAvailable,
    scan: {
      version: text(scanRaw.version, 32),
      updatedAt: text(scanRaw.updatedAt, 32),
      scannedResponses: count(scanRaw.scannedResponses),
      matchedResponses: count(scanRaw.matchedResponses),
      nonTextResponses: count(scanRaw.nonTextResponses),
      recentResponses: recent(scanRaw.recentResponses),
      truncated: scanRaw.truncated === true,
      limit: 300,
      skus: rows(scanRaw.skus, true)
    },
    test: {
      version: text(testRaw.version, 32),
      updatedAt: text(testRaw.updatedAt, 32),
      sourcePrefix: "g1.ios.2tb.",
      target: recordedTarget,
      targetOrigin: targetOrigin,
      status: text(testRaw.status, 32),
      hitCount: count(testRaw.hitCount),
      annualHitCount: annualHitCount,
      matchedFrom: matchedFrom
    }
  };

  var headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-G1-Report-Version": VERSION,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
  };
  var exportJSON = /(?:\?|&)format=json(?:&|$)/.test(url);
  console.log("[g1-sku-report] " + VERSION + " " + (exportJSON ? "json" : "html") +
    " storage=" + (storageAvailable ? "ready" : "unavailable") + " candidates=" + report.scan.skus.length);
  if (exportJSON) {
    headers["Content-Type"] = "application/json; charset=utf-8";
    headers["Content-Disposition"] = 'attachment; filename="g1-sku-report.json"';
    $done({ response: { status: 200, headers: headers, body: JSON.stringify(report, null, 2) } });
    return;
  }

  function escape(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }
  function fallbackName(row) {
    if (!row.fallback) return "No";
    var discount = /_ip_(\d+p)\.acq$/.exec(row.to || "");
    return discount ? discount[1] : "Yes";
  }
  function table(items, withTime) {
    if (!items.length) return "<p>No records yet.</p>";
    return "<div class=scroll><table><thead><tr><th>Full Product ID</th><th>Count</th>" +
      (withTime ? "<th>Last Seen (UTC)</th>" : "<th>Actual Target SKU</th><th>Fallback</th>") + "</tr></thead><tbody>" +
      items.map(function (row) {
        return "<tr><td><code>" + escape(row.id) + "</code></td><td>" + row.count + "</td>" +
          (withTime ? "<td>" + escape(row.lastSeen) + "</td>" :
            "<td><code>" + escape(row.to || "Not recorded") + "</code></td><td>" + fallbackName(row) + "</td>") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }
  function recentTable(events) {
    if (!events.length) return "<p>No per-response records yet; legacy collection data does not include this diagnostic.</p>";
    return "<div class=scroll><table><thead><tr><th>Time (UTC)</th><th>Path Category</th><th>Outcome</th><th>Distinct IDs</th><th>Newly Added</th><th>Omitted (Cap)</th></tr></thead><tbody>" +
      events.slice().reverse().map(function (event) {
        return "<tr><td>" + escape(event.at) + "</td><td>" + escape(event.path) +
          "</td><td>" + scanStatuses[event.status] + "</td><td>" + event.candidateCount +
          "</td><td>" + event.addedCount + "</td><td>" + event.omittedCount + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  var latestScan = report.scan.recentResponses.length ?
    report.scan.recentResponses[report.scan.recentResponses.length - 1] : null;
  var scanVersionStatus = report.scan.version === COLLECTOR_VERSION ?
    "Records are from this version of the collector script; check response timestamps and counts to confirm new activity." :
    report.scan.version ? "Legacy collection record; no response activity from this version has been saved yet." : "No response activity from this version has been saved yet.";
  var statuses = {
    "rewritten": "String rewrite applied",
    "no-match": "No source SKU from the three-tier mapping matched this response",
    "non-text": "Response had no processable text body"
  };
  var status = Object.prototype.hasOwnProperty.call(statuses, report.test.status) ?
    statuses[report.test.status] : "No test execution record yet";
  if (report.test.version === "pro-annual-test-v1" && report.test.status === "no-match") {
    status = "Legacy v1 record: no iOS 2TB prefix matched this response";
  }
  var html = [
    "<!doctype html><html lang=en><meta charset=utf-8>",
    "<meta name=viewport content=\"width=device-width,initial-scale=1\"><title>Google One SKU Local Report</title>",
    "<style>body{font:16px/1.6 -apple-system,BlinkMacSystemFont,sans-serif;max-width:960px;margin:24px auto;padding:0 18px;color:#1c2737;background:#f5f7fa}section{background:white;border:1px solid #dde3ec;border-radius:12px;padding:18px;margin:18px 0}h1{font-size:24px;margin-bottom:10px}h2{font-size:20px}code{overflow-wrap:anywhere}a{color:#1259be}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:9px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.scroll{overflow:auto}.note{color:#46556b}.badge{display:inline-block;background:#e0f4e8;color:#176238;padding:4px 10px;border-radius:8px}.actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:20px 0}.actions form{margin:0}button,.actions a{font:inherit;padding:10px 16px;border:0;border-radius:8px;cursor:pointer;text-decoration:none}.actions a{background:#e4eaf3}.actions button{background:#1259be;color:white}button{background:#e4eaf3;color:#1c2737}</style>",
    "<h1>Google One SKU Local Report</h1>",
    "<p class=badge>Local script active · " + VERSION + "</p>",
    "<nav class=actions aria-label=\"Report actions\"><form method=get action=\"" + ROOT + "\"><button type=submit name=format value=json>Export JSON</button></form><a href=\"" + ROOT + "\">Refresh Report</a></nav>",
    "<p class=note>This page is generated locally by Shadowrocket on this device; the URL uses one.google.com, and all records stay on-device.</p>",
    "<p class=note>Keep a single G1 ACQ module enabled: it collects product IDs from original responses first, then applies the three-tier rewrite.</p>",
    clearMessage ? "<p>" + escape(clearMessage) + "</p>" : "",
    storageAvailable ? "" : "<p>Local storage interface is not ready; this page could not read collection records.</p>",
    "<section><h2>Collection Activity</h2>",
    "<p>Collector script version: <code>" + escape(report.scan.version || "None") + "</code><br>" + scanVersionStatus + "</p>",
    "<p>Scanned text responses: " + report.scan.scannedResponses + "; Non-text responses: " + report.scan.nonTextResponses +
      "; Responses with product IDs: " + report.scan.matchedResponses + "; Total unique IDs: " + report.scan.skus.length + "</p>",
    "<p>Last saved (UTC): " + escape(report.scan.updatedAt || "None") + "</p>",
    latestScan ? "<p><strong>Latest response: " + scanStatuses[latestScan.status] + "</strong><br>Detected " +
      latestScan.candidateCount + " distinct ID(s), added " + latestScan.addedCount + ", omitted (over cap) " + latestScan.omittedCount + ".</p>" : "",
    "<p class=note>The cumulative list is deduplicated by ID; repeated IDs increment occurrence counts without increasing the list size. Note the current counts and timestamp, reopen the plan page in the Google App, then refresh this report to compare.</p>",
    "<h3>Recent 10 Responses</h3>", recentTable(report.scan.recentResponses),
    "<p class=note>Rising counts with duplicate IDs confirm new responses arrived; unchanged counts and timestamps mean no new matching response was saved—check page caching, module toggle, HTTPS decryption, request hostname, and saved=no in script logs. Only path categories are stored.</p></section>",
    "<section><h2>Latest Three-Tier Mapping</h2>",
    "<p>Configured 2TB candidate target: <code>" + CONFIGURED_TARGET + "</code></p>",
    "<p class=note>This version tests the specified 12months_ip_90p ID ending with _ip_90p; verify the actual product, pricing, and billing cycle in the App Store purchase sheet.</p>",
    "<p>Version: " + escape(report.test.version || "None") + "<br>Status: " + escape(status) + "; Total rewrites: " + report.test.hitCount + "; 2TB hits: " + report.test.annualHitCount + "</p>",
    "<p>2TB source prefix: <code>g1.ios.2tb.</code><br>Recorded 2TB target for this run: <code>" + escape(report.test.target || "None") + "</code><br>Current 20TB / 30TB tiers support Ultra 1-month free trial (1month_eft) with 3-month 90p fallback; the table below preserves the actual target and fallback recorded for that run, including legacy 75p entries.<br>Execution time (UTC): " + escape(report.test.updatedAt || "None") + "</p>",
    "<p class=note>This section records script execution only; whether the App Store recognizes the SKU, along with pricing and billing period, must be checked in the purchase sheet.</p>",
    table(report.test.matchedFrom, false), "</section>",
    "<section><h2>Candidate SKUs Collected While Browsing</h2>",
    "<p>Total unique IDs: " + report.scan.skus.length + "; identical IDs are deduplicated with cumulative counts—see Collection Activity above for per-response additions and duplicates.</p>",
    "<p class=note>IDs are extracted from original responses before rewriting and do not represent a complete store catalog; script-generated target IDs are not automatically added to this list.</p>",
    report.scan.truncated ? "<p>Collection has reached the 300-ID cap; clear records to start a fresh capture on target pages.</p>" : "",
    table(report.scan.skus, true),
    "<p>Last updated (UTC): " + escape(report.scan.updatedAt || "None") + "</p></section>",
    "<form method=get action=\"" + ROOT + "\"><button name=clear value=1>Clear Collection and Test Records</button></form>",
    "<p class=note>Refresh this page after browsing plan pages to view updates; keep standalone scanner and legacy rewrite copies disabled to avoid duplicate counts.</p></html>"
  ].join("");
  $done({ response: { status: 200, headers: headers, body: html } });
})();
