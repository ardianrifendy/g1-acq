# Pro 12-Month Promo Testing and SKU Scanning

**Install and enable a single G1 ACQ module to support both Ultra 1-month free trial and 2TB 12-month promo testing**, while passively collecting original SKUs, applying three-tier rewrites, and inspecting the local report. `v7.6.0` continues providing recent 10-response diagnostics, newly added ID counts, and duplicate detection. The script first collects product IDs from raw text responses under `one.google.com/`, then—only on `/ai?` responses—rewrites **complete original iOS 2TB SKUs** starting with `g1.ios.2tb.` to `g1.2tb.ai.12months_ip_90p`, while mapping 20TB / 30TB to the Ultra 1-month free trial SKUs `g1.20tb.1month_eft.acq` / `g1.ai.ultra.1month_eft.acq` with independent fallback to their respective 3-month 90p promo SKUs. The 2TB tier uses the user-specified fixed candidate with no fallback (see Section 4 for full mappings); the current response script version is `g1-acq-v7.6`.

This release integrates [GitHub PR #3](https://github.com/crhywun/g1-acq/pull/3), adding 20TB / 30TB Ultra 1-month free trial support. Record trial eligibility for the current account, billing interval, and renewal pricing from the App Store checkout sheet, and confirm entitlements from the Google One account status.

The collector only inspects matching responses actually received by the device and **never actively queries the full SKU catalog**. Seeing an existing ID again increments its occurrence count rather than creating a new entry; seeing an unchanged list of IDs does not by itself mean the script failed, and there is no verified device-side failure implied by duplicates.

**The full 12-month promo candidate for this round is `g1.2tb.ai.12months_ip_90p`, with no `.acq` suffix.** The first item in the user's screenshot lists this candidate alongside the price label `$1.99 × 12 months = $23.88/year`, depicting a monthly promotional discount over 12 consecutive months. `90p` stands for **90% off** (paying ~10%), not paying 90%. `$23.88/year` is a 12-month cumulative label from the screenshot, not proof of a one-time annual charge.

Although the screenshot heading reads **Pro 5TB**, the source product for this test remains complete SKUs prefixed with `g1.ios.2tb.` (no 5TB source prefix has been added). The screenshot only documents the origin of the candidate string and price label—it is not verified iOS App Store product metadata and does not prove actual iOS pricing, billing intervals, or 5TB entitlements. The target environment is Shadowrocket + Google App on iPhone; verify actual product names, billing cycles, introductory/renewal pricing when returned by the App Store, and confirm entitlements in the Google One account. Offline tests verify string matching and report behavior.

## 1. Install or Upgrade the Main Module

**G1 ACQ — Ultra 1-Month Free Trial, 2TB 12-Month Promo Test, Passive Collection, Recent 10-Response Diagnostics & JSON Export**

```text
https://cdn.jsdelivr.net/gh/crhywun/g1-acq@v7.6.0/g1-acq-v7.sgmodule
```

For a new installation, add the URL above in Shadowrocket's Module manager and enable it. When upgrading from an earlier release, replace the old **G1 ACQ** module URL with this URL once. The module name remains **G1 ACQ**, and both the installer and internal script links are pinned to `@v7.6.0`, so no manual script setup is required. Reconnect Shadowrocket after installing or upgrading, then reopen the plans page in the Google App. Publishing future releases requires updating both script code and the pinned version tag; merging a PR does not automatically update or invalidate older pinned CDN URLs, which continue serving their original versions. Upgrading preserves local history; reinstalling will not force the server to return new SKUs, so always compare versions, counters, and timestamps when troubleshooting.

Collection and rewriting run sequentially inside the same main module, eliminating any need to install or toggle **G1 SKU Scan**. If you only installed the main module, there are no extra steps; if you previously installed the standalone scanner, **G1 Pro Annual Test**, or other rewrite copies, disable them to avoid double counting or duplicate rewriting. Historical tags `v7.0.0` / `v7.1.0` / `v7.2.0` / `v7.3.0` / `v7.4.0` / `v7.5.0` and `pro-annual-test-v1` / `pro-annual-test-v2` remain unchanged.

Response activity diagnostics come from the main script `g1-acq-v7.6`. The **G1 Pro Annual Test** compatibility module points to this same script but remains limited to `/ai?`. The standalone **G1 SKU Scan** compatibility module only updates its download pin; its script retains the legacy collector saving version `pro-annual-test-v2` without response activity fields. When the new report reads those records, it shows the true legacy version and **Legacy collection record**, leaving `recentResponses` empty without fabricating events.

The main module includes the local report script, appends only `one.google.com` to MITM hostnames, and preserves the global UDP 443 reject rule (which can also impact HTTP/3, speed, or connectivity for other apps).

## 2. Configure HTTPS Decryption

To inspect and rewrite HTTPS responses, enable HTTPS Decryption and trust the certificate in your active configuration:

1. Enable **G1 ACQ** installed from the `v7.6.0` URL in Section 1 (upgrade once if coming from an older version) and keep Shadowrocket's VPN connected.
2. Go to **Config → tap `(i)` next to your active config → HTTPS Decryption** and switch decryption on.
3. If a valid, trusted Shadowrocket certificate is already configured, keep using it; otherwise, generate and install a certificate there, then complete profile installation in iOS **Settings → General → VPN & Device Management**.
4. For first-time certificate setup, open iOS **Settings → General → About → Certificate Trust Settings** and enable trust for the Shadowrocket root certificate.
5. Check that `one.google.com` is listed under **HTTPS Decryption hostnames** in the active config (appended via `%APPEND%`). Make sure you check the HTTPS Decryption hostname list, not DNS Hosts.
6. After changing module toggles or decryption settings, reconnect Shadowrocket and then reopen the Google App plans page.

The [configuration entry screenshot in README](../README.md#installation-shadowrocket) highlights the `(i)` button next to the active config. While MITM decryption covers the entire `one.google.com` host, script inspection and rewriting are restricted by the URL patterns documented below.

## 3. Browse Plans to Passively Collect Original SKUs

Keep the single **G1 ACQ** module enabled. On every matching text response under `one.google.com/`, the main script scans the raw response first and only then evaluates three-tier rewrite rules—so captured candidate IDs are never overwritten by the subsequent rewrite. Matching non-text responses are counted separately under non-text diagnostics.

1. Keep Shadowrocket connected and paste the full [Local Report URL](https://one.google.com/g1-sku-report) into Safari on the same device. Confirm the **Local script active** and **v7.6.0** badge, and note the baseline `scan.version`, `scannedResponses`, `matchedResponses`, `nonTextResponses`, and latest response timestamp.
2. Open **Google App (colorful G icon) → Manage Google One**, reopen the **2TB / Pro** plan presented to your account, and—when testing Ultra 1-month free trial mappings—also browse any visible **20TB / 30TB** plans.
3. If monthly/annual toggles are shown, switch through each view and let it finish loading. Only newly received matching responses generate collection activity—you do not need to complete a purchase. Account eligibility, region, and app version control which plans and toggles appear, and client caching can prevent new requests from being sent.
4. Return to Safari, refresh the report, and compare the counters, latest response event, newly added count, and status. Rising counts with `known-skus` indicate duplicate data—an unchanged list length does not mean collection stopped. If all counters and the latest timestamp are unchanged, no new collection record was saved in this pass (a storage write failure also preserves old counts); follow Section 7 to check `saved=no` / `SKU collection unavailable` logs, caching, match scope, and module configuration.
5. Under "Candidate SKUs Collected While Browsing", record full IDs, occurrence counts, and last-seen timestamps. Look for actual complete IDs starting with `g1.ios.2tb.`; compare 20TB / 30TB against the two complete source IDs in Section 4 without inventing or guessing suffixes.
6. Tap **Export JSON** in the report action bar, or open the [JSON Export URL](https://one.google.com/g1-sku-report?format=json) directly.

Passive collection covers text responses under `https://one.google.com/`, skipping `/g1-sku-report`, `/g1-sku-report/`, and any query parameters on that path. It extracts `g1.*` and `com.google.one.*` tokens, deduplicating by ID and accumulating total occurrences (repeated appearances within one response or across multiple responses both increment `count`, which is not a purchase count).

Up to **300 distinct IDs** are retained. Once full, existing IDs continue updating their counts and timestamps while overflow IDs are excluded and tallied per response in `omittedCount`. When `addedCount > 0`, the event status is `new-skus` even if `omittedCount > 0`; `limit-reached` is set only when `addedCount === 0` and `omittedCount > 0`. Keep existing records to compare new vs. duplicate activity; only perform the manual two-key clear from Section 5 after exporting if you explicitly want to reset history—routine diagnostics do not require clearing.

Collection decodes `\u002e`, `\x2e`, and HTML dot entities on an internal discovery copy only; this decoding never modifies the HTTP response. After scanning, only `/ai?` responses enter three-tier rewriting while all other responses pass through unmodified. The script never reads request headers or request bodies, never stores full response bodies, never queries the App Store, and never transmits collected data externally.

## 4. Test 2TB 12-Month Promo and Ultra 1-Month Free Trial

Collection and rewriting execute automatically in order inside the main module; keep the same **G1 ACQ** module enabled while checking the App Store sheet.

1. Confirm the updated **G1 ACQ** module is enabled and Shadowrocket is connected—no module switching is needed.
2. Verify **Active Config `(i)` → HTTPS Decryption** toggle, `one.google.com` hostname, and iOS certificate trust, then reconnect Shadowrocket.
3. Exit the current plan screen and re-enter **2TB / Pro** from **Google App (colorful G) → Manage Google One**. The source product for the 12-month promo test is the original iOS 2TB SKU; to verify Ultra 1-month free trial mappings, open any 20TB / 30TB plans presented on the page.
4. Enter the subscription flow from the available plan and check the App Store checkout sheet for **product name, billing period, currency, introductory price, and renewal price**. If the sheet does not open, record the exact on-screen error message. Record 2TB, 20TB, and 30TB outcomes separately.
5. Open the [Local Report](https://one.google.com/g1-sku-report) in Safari and inspect "Latest Three-Tier Mapping" for version, execution time, and status: "Total rewrites" covers all three tiers, "2TB hits" covers 2TB / Pro promo rewrites, and the table lists each complete source ID, actual target, count, and fallback status.
6. Tap **Export JSON** or visit the [JSON Export URL](https://one.google.com/g1-sku-report?format=json), keeping `reportVersion`, `configuredTarget`, `test.version`, `test.matchedFrom`, `test.target`, `test.targetOrigin`, `test.hitCount`, `test.annualHitCount`, `test.status`, and `test.updatedAt` alongside your App Store checkout observations.

The main script first scans raw text responses matching `^https://one\.google\.com/`, then matches complete plaintext SKU tokens on `^https://one\.google\.com/ai\?` responses using this table:

| Complete Source SKU in Body | Default Target | Fallback Target |
|---|---|---|
| Complete SKU with prefix `g1.ios.2tb.` | `g1.2tb.ai.12months_ip_90p` (user-specified candidate) | None |
| `g1.ios.20tb.m.v2` | `g1.20tb.1month_eft.acq` (Ultra 1-month free trial) | `g1.20tb.3months_ip_90p.acq` (3-month 90p promo) |
| `g1.ios.30tb.ai.pro.m` | `g1.ai.ultra.1month_eft.acq` (Ultra 1-month free trial) | `g1.ai.ultra.3months_ip_90p.acq` (3-month 90p promo) |

Any matched complete 2TB source ID is always rewritten to `g1.2tb.ai.12months_ip_90p` with no fallback and without requiring the target string to appear in the body. 20TB / 30TB must match their exact source IDs above, and each tier decides its target independently from the original response body:

- If that tier's `1month_eft` default target appears in the body, use the default target (even if the 90p fallback is also present) and record `fallback=false`.
- If that tier's `1month_eft` default target is absent and its corresponding 90p fallback appears in the body, use the 90p fallback and record `fallback=true`.
- If neither the default target nor the 90p fallback appears in the body, still rewrite to the `1month_eft` default target and record `fallback=false`.

The 20TB fallback check only inspects 20TB targets, and the 30TB check only inspects 30TB targets. 75p is no longer a fallback target in this release; only historical records retain `g1.20tb.3months_ip_75p.acq` or `g1.ai.ultra.3months_ip_75p.acq`. This logic checks strings present in the response body—it does not query the App Store catalog. Unrelated IDs stay untouched, and zero-match responses pass through unchanged. The two `1month_eft` default targets represent the Ultra 1-month free trial entry, while the 3-month 90p SKUs are per-tier fallback offers; distinguish trial vs. fallback offers in reports and logs using each row's actual `to` value.

| Report Field | Meaning |
|---|---|
| `reportVersion` | Current report script version (`v7.6.0`), displayed separately from the saved execution version |
| `configuredTarget` | Currently configured 2TB candidate (`g1.2tb.ai.12months_ip_90p`) |
| `test.version` | Script version that produced the saved execution record (`g1-acq-v7.6` for this release; legacy records keep their original version) |
| `test.matchedFrom` | Complete source IDs matched in that response as `{id, to, count, fallback}` rows: `to` is the actual target applied, `count` is replacement count, and `fallback=true` means that version's fallback was used (90p in this release, or 75p in legacy records; rendered by actual `to`) |
| `test.target` | 2TB target saved during the most recent execution: both new and legacy v7.5 records show `g1.2tb.ai.12months_ip_90p` (with v7.5 retaining `test.version=g1-acq-v7.5`); legacy v7.3 / v7.4 keep `g1.2tb.ai.annual_ip_90p.acq`; v7.2 keeps `g1.2tb.ai.annual.3months_ip_90p.acq`; v1 / v7.1 keep `g1.2tb.ai.annual`; check each row's `to` for actual 20TB / 30TB targets |
| `test.targetOrigin` | `user-specified` for current and legacy v7.3 / v7.4 / v7.5 records, `pattern-derived` for v7.2, `legacy` for v1 / v7.1 standard annual records, or empty when no record exists |
| `test.hitCount` | Total three-tier rewrites for that response (matches `hits=N` in logs) |
| `test.annualHitCount` | Legacy field name counting only 2TB / Pro promo rewrites in that response (matches `annualHits=N` in logs and "2TB hits" in HTML; does not prove annual billing) |
| `test.updatedAt` | Timestamp of the most recent rewrite check (UTC) |
| `test.status = rewritten` | At least one of the three tiers was rewritten (includes responses where only 20TB / 30TB matched) |
| `test.status = no-match` | None of the three source SKUs matched the text response; body returned unchanged |
| `test.status = non-text` | Response had no processable text body; returned unchanged |

Logs use the `[g1-acq]` prefix with summary line `g1-acq-v7.6 hits=N annualHits=N`, followed by one line per matched source: `<source SKU> -> <actual target> xN`. When 20TB / 30TB uses a fallback, the line appends `fallback=<full target ID>` (`fallback=g1.20tb.3months_ip_90p.acq` or `fallback=g1.ai.ultra.3months_ip_90p.acq`; legacy logs used `fallback=75p`). Each row's `to` in the report matches these log lines, HTML displays `90p` or historical `75p` based on `to`, and `hits` / `annualHits` match `hitCount` / `annualHitCount`.

Storage keeps **only the most recent execution that entered the three-tier rewrite check**, not cumulative rewrite history—a subsequent zero-match `/ai?` response overwrites it. `configuredTarget` shows the active configuration while `test.target` shows what was saved during the latest run: legacy v7.5 records still show `g1.2tb.ai.12months_ip_90p`, `user-specified`, and `test.version=g1-acq-v7.5`; v7.3 / v7.4 retain `g1.2tb.ai.annual_ip_90p.acq` and `user-specified`; v7.2 retains `g1.2tb.ai.annual.3months_ip_90p.acq` and `pattern-derived`; v1 / v7.1 retain `g1.2tb.ai.annual` and `legacy`. Upgrading never relabels historical IDs, targets, versions, or origins. Always check `test.version` and `test.updatedAt` even when the 2TB target matches—identical targets alone do not mean a v7.5 record was updated. Hit counts only confirm string replacement, not App Store acceptance or subscription completion.

`hitCount=0` with `status=no-match` simply means none of the three tiers matched that text response—it does not mean the account lacks a 2TB plan or that the target SKU does not exist. If `annualHitCount=0` while `hitCount>0`, only 20TB / 30TB matched (`status` is still `rewritten`); always check `annualHitCount` alongside each row's `id` and `to` when evaluating the 2TB 12-month promo test.

Passive collection covers all of `one.google.com/` and decodes escaped dots, whereas three-tier rewriting only operates on unescaped complete tokens in `/ai?` responses. Therefore, seeing a candidate ID in the scan list does not guarantee that another `/ai?` response will match it. If a target tier does not match, keep browsing available plans and check the passively collected complete IDs in Section 3 without switching modules or guessing new iOS SKUs.

## 5. Local Report Page, Export & Clearing

Keep Shadowrocket connected and the updated **G1 ACQ** module enabled, then paste the full [Local Report URL](https://one.google.com/g1-sku-report) into Safari. The page header should show **Local script active** and **v7.6.0** with an **Export JSON** button; you can also use these direct URLs:

| URL | Action |
|---|---|
| [Local Report](https://one.google.com/g1-sku-report) | Shows cumulative scan results and the latest three-tier mapping record |
| [Export JSON](https://one.google.com/g1-sku-report?format=json) | Returns `g1-sku-report.json` as a file download |
| [Clear Tool Records](https://one.google.com/g1-sku-report?clear=1) | Clears this tool's local scan record and latest test record |

**Although the URL uses Google's domain, the page is served entirely by the local script on your device.** Shadowrocket's `http-request` script intercepts `https://one.google.com/g1-sku-report` (including trailing `/` and query parameters), generates HTML or JSON locally, and responds directly without sending that request to Google. The HTML loads zero external assets, and neither the report nor export script makes outbound network requests.

If Safari loads a normal Google page or a 404, the local report script did not handle the request. Verify the updated **G1 ACQ** module is enabled, Shadowrocket is connected, **Active Config `(i)` → HTTPS Decryption** is enabled, `one.google.com` is in the hostname list, and the root certificate is trusted in iOS, then paste the full report URL into Safari again.

Data is stored locally in `$persistentStore` with UTC timestamps; both storage keys and `schemaVersion: 1` remain unchanged:

| Key | Contents |
|---|---|
| `g1.sku.scan.v1` | Candidate IDs, cumulative counts, last-seen timestamps, actual collector version, text/matched/non-text response counters, cap status, and up to 10 redacted response events |
| `g1.pro.annual.test.v1` | Latest rewrite script version, 2TB source prefix, matched source IDs with per-row actual target and fallback flags, 2TB target, total hits, 2TB hits, timestamp, and status |

The HTML table lists each matched source ID alongside its actual target, count, and fallback status so `test.target` is never mistaken for the 20TB / 30TB target. Current default targets are `g1.20tb.1month_eft.acq` / `g1.ai.ultra.1month_eft.acq` with fallbacks `g1.20tb.3months_ip_90p.acq` / `g1.ai.ultra.3months_ip_90p.acq`. HTML renders `90p`, historical `75p`, or `No` from `fallback` and `to` (or `Yes` if fallback is flagged without target info), leaving legacy 20TB / 30TB rows intact. Legacy v1 2TB-only records remain supported: missing `to` defaults to `g1.2tb.ai.annual`, missing `annualHitCount` is summed from 2TB rows, and fallback renders as `No`. Legacy v1 / v7.1 (`legacy`), v7.2 (`g1.2tb.ai.annual.3months_ip_90p.acq` / `pattern-derived`), v7.3 / v7.4 (`g1.2tb.ai.annual_ip_90p.acq` / `user-specified`), and v7.5 (`g1.2tb.ai.12months_ip_90p` / `user-specified` / `g1-acq-v7.5`) records keep all original values across upgrades—you do not need to clear these keys when upgrading.

In JSON exports, the core collection list is `scan.skus` (entries with `id`, `count`, `lastSeen`); see Section 4 for `test` fields. The report separates **report version `reportVersion=v7.6.0`** from **actual collector version `scan.version`** (`g1-acq-v7.6` for this release). Legacy records display **Legacy collection record; no response activity from this version has been saved yet.** Empty or unknown versions display **No response activity from this version has been saved yet.** Updating the report script alone does not mean the new collector has received responses, nor do these notices imply a device error.

| Collection Field | Meaning |
|---|---|
| `scan.version` | Script version that produced the saved scan record (legacy values preserved) |
| `scan.scannedResponses` | Cumulative count of text responses (non-text excluded; unchanged semantics) |
| `scan.matchedResponses` | Cumulative count of text responses with at least one candidate ID, including duplicates (unchanged semantics) |
| `scan.nonTextResponses` | Cumulative count of non-text responses, tracked separately from text responses |
| `scan.recentResponses` | Up to 10 events; stored oldest → newest in JSON (oldest evicted beyond 10), displayed newest → oldest in HTML |

Each response event contains:

| Event Field | Meaning |
|---|---|
| `at` | Time the response was processed (UTC) |
| `path` | Fixed redacted path category: `/`, `/ai`, `/plans`, `/_/…/data/batchexecute`, or `[other one.google.com path]` |
| `bodyType` | Body classification (`text` or `non-text`), never the body content |
| `status` | Collection diagnostic status for this response (see table below) |
| `candidateCount` | Distinct candidate IDs found in this response (repeated occurrences of the same ID count once) |
| `addedCount` | Distinct new IDs added and retained in storage during this response |
| `omittedCount` | Distinct new IDs dropped due to the 300-ID cap (repeated occurrences of an omitted ID count once) |

| `status` | Meaning |
|---|---|
| `new-skus` | `addedCount > 0`; new IDs were retained (takes precedence even if `omittedCount > 0`) |
| `known-skus` | All detected IDs were already recorded; only counts and timestamps were updated |
| `no-skus` | Text response contained no recognizable candidate IDs |
| `limit-reached` | Used only when `addedCount === 0` and `omittedCount > 0` (no additions retained, cap overflow occurred) |
| `non-text` | Response body was not scannable text; increments `nonTextResponses` |

`candidateCount`, `addedCount`, and `omittedCount` count distinct IDs within a single response, whereas `scan.skus[].count` accumulates total string occurrences across responses. When legacy records lack `recentResponses`, the report does not synthesize fake events from old counts or timestamps—only subsequent processed responses append new events. Historical counts and candidate IDs are preserved, and the recent-10 window does not represent all-time history.

Paths are strictly redacted: the `…` in `/_/…/data/batchexecute` is literal placeholder text, and all other paths collapse to `[other one.google.com path]`. Neither events nor JSON exports store query strings, full URLs, request/response headers, request bodies, or response bodies. Compare the latest timestamp and recent history against when you reopened the plan page.

`?clear=1` is a manual reset that clears only those two keys (never Shadowrocket's global "Clear All Data"). Simply viewing or refreshing the standard report URL never clears records. Only export and clear when you intentionally want to reset history; if no new IDs appear, keep existing records and compare counters, versions, and events first. After clearing, navigate back to the plain [Local Report URL](https://one.google.com/g1-sku-report) (without `clear=1`) so refreshing does not immediately wipe new records.

## 6. Collecting and Verifying Hidden SKUs in iOS Shadowrocket

This project runs on **iPhone + Shadowrocket + Google App**. Collection scans the entire matching raw text response: even if a plan is not visually displayed in the UI, any product ID carried in that response payload is extracted. Seeing only a few plans on screen does not mean the response contains only a few IDs.

1. Keep the single **G1 ACQ** module enabled and open each available 2TB / Pro, monthly, annual, and promotional entry in the Google App, letting every screen finish loading so the module captures responses across entry points.
2. Open the [Local Report](https://one.google.com/g1-sku-report) in Safari and inspect "Candidate SKUs Collected While Browsing", which holds up to 300 complete pre-rewrite IDs.
3. For this round's specified candidate `g1.2tb.ai.12months_ip_90p`, reopen the original 2TB / Pro plan so the module substitutes the source ID; confirm `test.version=g1-acq-v7.6`, `test.target`, and the corresponding row's `to` value in the report.
4. Proceed to the native subscription checkout from that plan, verify the actual product, billing cycle, introductory price, and renewal price shown by the App Store, record what appeared, and export JSON to pair with your observations.

The raw scan list and configured rewrite targets are tracked separately. Target IDs injected by the module are not automatically added as "collected hidden SKUs", and IDs never sent by the server will not appear in the scan list. Shadowrocket scripts operate on network responses and do not call StoreKit APIs directly inside the Google App, so "String rewrite applied" describes text substitution only.

Native iOS product lookups use StoreKit's `Product.products(for:)` or `SKProductsRequest` with known IDs submitted from the app's context; those APIs return metadata for requested IDs rather than enumerating an entire store catalog. On device, this workflow collects raw IDs, rewrites the specified candidate, inspects the native StoreKit sheet, and saves the report.

## 7. Interpreting Common Results

| Observation | Next Step |
|---|---|
| Report shows "No records yet" or "No response activity from this version has been saved yet" | Record the current `scan.version` and counters, reopen an available 2TB / Pro plan in the Google App, and refresh the report; an unknown or empty state does not immediately mean a device failure |
| Report shows `v7.6.0`, but the scan section says "Legacy collection record" | The report script is upgraded while saved scan data is still from an older collector; compare `scan.version`, counters, and latest timestamp, then reopen a plan page and check again |
| Legacy record has no `recentResponses` | Keep existing candidates and cumulative counts and wait for new responses to populate history; the report will not fabricate recent activity from legacy totals |
| Safari shows a normal Google page or 404 | The local report did not intercept the request; follow Section 5 to check the updated G1 ACQ toggle, VPN connection, active config HTTPS Decryption, `one.google.com` hostname, and trusted certificate, then paste the full report URL into Safari |
| Page lacks "Local script active", `v7.6.0`, or the "Export JSON" button | Confirm you upgraded to the new main module from Section 1 and reopen the Section 5 report URL (direct JSON export URL is also in Section 5) |
| Report says local storage interface is not ready | The script could not access `$persistentStore.read`; this page is not evidence of successful collection—record the message and Shadowrocket version |
| List still has old IDs, but text count rose and status is `known-skus` | Duplicate IDs were received, updating counts and timestamps; keep current records and inspect per-response candidate and added counts |
| `scannedResponses`, `matchedResponses`, `nonTextResponses`, and latest timestamp are all unchanged | Confirms no new collection record was saved during this pass (storage write errors also preserve old counts); check logs for `saved=no` or `SKU collection unavailable`, then verify caching, `one.google.com/` scope, module toggle, VPN, active config HTTPS Decryption, certificate trust, and hostnames before reopening a plan and refreshing |
| Text count increased and latest status is `no-skus` | The processed text body contained no matching SKU strings; continue checking actual 2TB / Pro, monthly, and annual screens without inventing IDs |
| Only `nonTextResponses` increased and latest status is `non-text` | A non-text response arrived (text counters stay unchanged); note the body type and redacted path, then test other plan pages |
| Latest status is `new-skus` | `addedCount > 0`—new IDs were retained (status stays `new-skus` even if `omittedCount > 0`); `count` in the candidate table remains cumulative occurrences |
| Collected a 2TB ID, but `annualHitCount` is 0 | Check execution timestamp, complete source ID, `g1.ios.2tb.` prefix, and `/ai?` rewrite scope; re-collect per Section 3 |
| `status=rewritten` and `hitCount > 0`, but `annualHitCount === 0` | Only 20TB / 30TB were rewritten; inspect each row's `id`, `to`, and `fallback`—this does not indicate a 2TB promo hit |
| `status=no-match` and `hitCount === 0` | None of the three tiers matched this text response; verify complete source IDs and URL scope in Section 4, then re-collect per Section 3 |
| Current 20TB / 30TB shows `fallback=false` | Actual `to` is that tier's `1month_eft` default trial SKU (selected when default appears in body, or when neither default nor 90p appears); verify the full ID against Section 4 |
| Current 20TB / 30TB shows `fallback=true` | The `1month_eft` default target was absent from the raw body while the 3-month 90p fallback appeared; actual `to` is `g1.20tb.3months_ip_90p.acq` or `g1.ai.ultra.3months_ip_90p.acq` (not the 1-month free trial) |
| Historical 20TB / 30TB row shows 75p fallback | Preserved `to` and `fallback` from an older release; keep as-is and cross-check against `test.version`, timestamp, and original checkout notes (75p is not used in this release) |
| 2TB `test.target` matches current config, but `test.version=g1-acq-v7.5` | Still a legacy v7.5 record; both versions use `g1.2tb.ai.12months_ip_90p`, so identical targets do not prove `g1-acq-v7.6` has run |
| `hitCount > 0`, but checkout shows an error or never opens | Record the exact prompt and that tier's actual `to` target; track text rewrite success separately from App Store product acceptance |
| App Store product, billing cycle, or price differs from expectations | Record the actual App Store sheet details; check whether `to` was a `1month_eft` trial, 3-month 90p fallback, or 2TB target—SKU labels (`1month_eft`, `12months`, `90p`) and screenshot prices never override actual checkout results |
| `addedCount === 0` and `omittedCount > 0` with status `limit-reached` | No new IDs were retained due to the 300-ID cap (existing IDs still update); if you intentionally need room for a new capture, export JSON first and then manually run `?clear=1` |

Following the single-pass "note baseline → reopen actual plan → refresh and compare" flow in Section 3 preserves before-and-after evidence; whether new IDs appear depends on server responses, and reinstalling modules or repeatedly clearing storage will not make the server return new SKUs.

## 8. On-Device Verification Template

```text
Collection / Test Timestamp (with timezone): [fill in]
iOS / Google App / Shadowrocket Versions: [fill in]
Main Module Name: G1 ACQ
Main Module URL: https://cdn.jsdelivr.net/gh/crhywun/g1-acq@v7.6.0/g1-acq-v7.sgmodule
Main Module Release Version: v7.6.0
Main Module Script Version: g1-acq-v7.6
Mode: Single module passively collecting original SKUs and recent 10 responses before three-tier rewriting (Ultra 1-month free trial / 3-month 90p fallback, 2TB 12-month promo candidate)
Currently Enabled Main Module: G1 ACQ
Report Top Local Badge & Version: [fill in exact display]
Report Script Version (reportVersion): [fill in exact display; current v7.6.0]
Actual Collector Version (scan.version): [fill in saved value; current collector is g1-acq-v7.6]
Collector Version Notice: [fill in exact display; Legacy collection record / No response activity saved / Current version]
Text Count Before Opening Plan (scan.scannedResponses): [fill in]
Text Count After Opening Plan (scan.scannedResponses): [fill in]
Matched Count Before Opening Plan (scan.matchedResponses): [fill in]
Matched Count After Opening Plan (scan.matchedResponses): [fill in]
Non-Text Count Before Opening Plan (scan.nonTextResponses): [fill in; write "not recorded" if absent in legacy data]
Non-Text Count After Opening Plan (scan.nonTextResponses): [fill in]
Latest Response Time Before Opening Plan: [fill in; write "not recorded" if legacy data lacks history]
Latest Response Time After Opening Plan: [fill in]
Recent Responses (scan.recentResponses): [list up to 10 in JSON oldest->newest order; HTML is newest->oldest; write "not recorded" if absent]
Latest Response at / path / bodyType: [fill in saved values; UTC timestamp, redacted path category only]
Latest Response status: [new-skus / known-skus / no-skus / limit-reached / non-text]
Latest Response candidateCount / addedCount / omittedCount: [distinct candidates / newly added / omitted over cap]
Configured Target (configuredTarget): g1.2tb.ai.12months_ip_90p
Candidate Origin: user-specified from screenshot, literal g1.2tb.ai.12months_ip_90p (no .acq suffix)
Screenshot Price Label: $1.99 × 12 months = $23.88/year; 12-month consecutive monthly promo label, not verified iOS pricing or billing cycle
Screenshot Discount Meaning: 90p = 90% off (~10% paid), not 90% paid
Screenshot Heading: Pro 5TB; source product remains original iOS 2TB, screenshot does not prove 5TB entitlement
2TB Candidate Verification Status: Pending actual App Store product response; fill in product name, period, intro & renewal prices below
Ultra 1-Month Free Trial: Supported in this version; shown to current account: [fill in from checkout sheet]
20TB Source SKU: g1.ios.20tb.m.v2
20TB Default Trial SKU: g1.20tb.1month_eft.acq
20TB 3-Month 90p Fallback SKU: g1.20tb.3months_ip_90p.acq
30TB Source SKU: g1.ios.30tb.ai.pro.m
30TB Default Trial SKU: g1.ai.ultra.1month_eft.acq
30TB 3-Month 90p Fallback SKU: g1.ai.ultra.3months_ip_90p.acq
Independent Selection Rule: Prefer default when present; fall back to 90p only when default is absent and 90p is present; use 1month_eft default when both are absent; 75p not used in this release
20TB Default / 90p Present in Raw Body: [fill in evidence from raw response, or "not checked"]
30TB Default / 90p Present in Raw Body: [fill in evidence from raw response, or "not checked"]
Saw and Tapped "Export JSON" Button: [fill in]
Actual Plan Name Opened in Google App: [fill in exact 2TB / Pro, 20TB, or 30TB name]
Collected Original iOS 2TB Complete SKU: [verbatim ID, or "not collected"]
Collected Original iOS 20TB / 30TB Complete SKU: [verbatim ID, or "not collected"]
Execution Script Version (test.version): [fill in saved value; g1-acq-v7.6 for current, g1-acq-v7.5 for legacy v7.5]
Latest Test Time (test.updatedAt, UTC): [fill in]
Per-Row Source, Target, Count & Fallback (test.matchedFrom): [fill in {id, to, count, fallback}]
20TB Actual Target to / fallback: [saved value; default g1.20tb.1month_eft.acq / false, fallback g1.20tb.3months_ip_90p.acq / true]
30TB Actual Target to / fallback: [saved value; default g1.ai.ultra.1month_eft.acq / false, fallback g1.ai.ultra.3months_ip_90p.acq / true]
Historical 75p Fallback: [only for legacy records retaining g1.20tb.3months_ip_75p.acq or g1.ai.ultra.3months_ip_75p.acq]
Log fallback Marker: [full target ID from log, or "none"]
Recorded 2TB Target (test.target): [saved value; legacy records retain original target ID; v7.5 shares g1.2tb.ai.12months_ip_90p with older version]
Recorded Target Origin (test.targetOrigin): [user-specified / pattern-derived / legacy / empty]
Total Three-Tier Rewrites (test.hitCount): [fill in]
2TB / Pro Promo Rewrites (test.annualHitCount): [fill in; legacy field name, does not prove annual billing]
Execution Status (test.status): [fill in]
App Store Checkout Sheet Opened: [yes / no]
App Store Product Name: [fill in exact display]
Subscription Period: [fill in exact display]
Currency / Introductory Price / Renewal Price: [fill in exact display]
Actual Error Message: [verbatim text, or "none"]
Purchase Completed: [yes / no]
Google One Account Entitlements After Purchase: [only fill in if purchased]
JSON Export Filename: [fill in]
```
