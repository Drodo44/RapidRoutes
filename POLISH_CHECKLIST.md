# RapidRoutes — Polish Checklist (Source of Truth)

Operating model:
- Work ticket-by-ticket in the order below.
- No freelancing / no redesigns / no scope creep.
- For every ticket: list files changed + exact manual test steps + expected results.
- Stop after each ticket and wait for confirmation before starting the next.

---

## ✅ Completed
- Dashboard Covered (This week) — DONE
- Floor Space Calculator — DONE
- P0 — Recap: lane visibility + saved-city gating — DONE (2026-02-10)

---

## ✅ Tickets (implement in this exact order)

### ✅ Ticket 3 — Recap Page: workflow-critical buttons + proactive indicators
**Progress:** Complete (2026-02-10)

**Acceptance Criteria**
- Recap page buttons work end-to-end:
  - Log Offer
  - Archive
  - Gave Back
  - Log Call
  - Log Email
- These actions correctly support workflow requirements:
  - Log hot cities for posting
  - Store carrier offers including: MC, email, rate offered, timestamp
  - Archive (covering the load) collects MC/Email/Rate for that lane
- Archiving and offer logging feeds:
  - “Carriers who ran this lane” database
  - “Top Carriers” tab (and related analytics)
- Recap lane-card left-side info is restored:
  - Weather + traffic display
  - Weather warnings indicating lateness risk
  - Traffic warnings indicating lateness risk
- Do not change the visuals of the new recap page except restoring the missing functional/info elements.

**Acceptance Criteria (Verified)**
- Log Offer writes ONLY to `carrier_offers` (no `carrier_coverage` writes from offer logging).
- Archive writes canonical coverage rows to `carrier_coverage`.
- Gave Back updates lane status/reason correctly on `lanes`.
- Log Call / Log Email write canonical contact logs (`city_performance`, with `contacts` fallback for schema variance).
- Org scoping is enforced for all actions.

**Verification Queries (SQL)**
```sql
-- carrier_offers: canonical write for Log Offer
SELECT id, lane_id, organization_id, user_id, mc_number, rate_offered, created_at
FROM carrier_offers
WHERE lane_id = :lane_id
ORDER BY created_at DESC
LIMIT 10;

-- carrier_coverage: canonical write for Archive
SELECT id, lane_id, organization_id, user_id,
       origin_city, origin_state, dest_city, dest_state,
       mc_number, carrier_email, rate_covered, covered_at, created_at
FROM carrier_coverage
WHERE lane_id = :lane_id
ORDER BY covered_at DESC
LIMIT 10;

-- lanes: gave back / archive state verification
SELECT id, organization_id, lane_status, gave_back_reason, gave_back_at, coverage_source, covered_at, updated_at
FROM lanes
WHERE id = :lane_id;

-- city_performance: canonical contact logs for Log Call / Log Email
SELECT id, lane_id, city, state, city_type, contact_method, reference_id, notes, contact_received_at, created_at
FROM city_performance
WHERE lane_id = :lane_id
ORDER BY COALESCE(contact_received_at, created_at) DESC
LIMIT 20;

-- contacts: fallback contact log table when city_performance schema differs
SELECT id, lane_id, contact_method, created_at
FROM contacts
WHERE lane_id = :lane_id
ORDER BY created_at DESC
LIMIT 20;
```

**Verification Notes**
- `Log Offer` now opens its input form and persists canonical rows in `carrier_offers`.
- `Archive` requires MC + carrier email + rate and writes canonical coverage to `carrier_coverage`.
- `Gave Back` persists archive status and reason fields on `lanes`.
- `Log Call` / `Log Email` now send authenticated requests and persist contact logs by lane.
- Lane-targeted writes are validated against organization/user scope before insert/update.
- Legacy lane-field mirrors remain best-effort only; canonical analytics tables are the source of truth.

---

### ☐ Ticket 2 — Floor Space Calculator: pallet count + weight logic (exact spec)
**Progress:** Not started

**Acceptance Criteria**
- Pallet count (48x40x48 pallets) is exactly:
  - Sprinter: 3
  - 26’ Straight Box Truck: 12
  - 48’ Dry Van: 24
  - 53’ Dry Van: 26
- Weight limits are exactly:
  - Sprinter: 3000 lbs
  - 26’ Straight Box Truck: 10000 lbs
  - 48’ or 53’ Dry Van: 45000 lbs
- Rules are implemented exactly:
  - Pallet count doubles if “Stackable” is checked
  - If within pallet range but overweight: suggest next size up and explicitly explain it’s due to weight
  - If overweight for 48/53 Dry Van: suggest two trucks (no higher legal limit) and explicitly explain

---

### ☐ Ticket 3 — Lanes Page: date UI + edit parity + email detail fields + bulk date change
**Progress:** Not started

**Acceptance Criteria**
- Date pickers: calendar icon is visible (not black-on-black).
- Edit Lanes includes all fields (parity with create lane):
  - No deleting required to edit details.
- Lane creation/edit includes an “Email Details” section for fields not on posting/CSV but included in emails:
  - Commodity
  - Pickup Date/Time
  - Delivery Date/Time
  - Reefer Temperature
  - Special Equipment Requirements (typed, optional)
  - Additional Notes (typed, optional)
- “Change Date For All Lanes” is restored and improved:
  - Supports changing dates for all lanes
  - Additionally supports selecting a subset of lanes (multi-select) to change dates (e.g., 6 of 7)

---

### ☐ Ticket 4 — Dashboard: heatmap mapping + welcome text
**Progress:** Not started

**Acceptance Criteria**
- Heatmap mapping is significantly more accurate to uploaded DAT heat map images:
  - Uploaded weekly, one per trailer type: Dry Van / Reefer / Flatbed
  - Source image color meaning:
    - RED = TIGHT
    - YELLOW = MODERATE
    - BLUE = LOOSE
- The stylized/dynamic dashboard map reflects the uploaded image coloration correctly (no “mostly red” mismatch).
- Welcome text is replaced:
  - Preferred: “Redefine the game. Outsmart the lane.”
  - Acceptable alternative: “Welcome to RapidRoutes”

---

### ☐ Ticket 5 — Sales Resources Page: restore cards + fix upload + copy prompt + download HTML
**Progress:** Not started

**Acceptance Criteria**
- Sales Resources upload works reliably.
- Cards are restored and match new UI style while keeping the existing data model fields:
  - Title
  - Description
  - Use Case
  - Target Audience
- Must support actions:
  - “Copy Prompt”
  - “Download HTML”
- System supports providing HTML files with one of these workflows (choose simplest + most reliable and document it):
  - A) Store HTML and derive prompt text for “Copy Prompt”, OR
  - B) Store BOTH “Prompt Text” and “HTML”
- Optional: embedding a Gemini window is allowed only if trivial and does not add instability; otherwise explicitly defer.

---

### ☐ Ticket 6 — Settings: approvals + team reassignment
**Progress:** Not started

**Acceptance Criteria**
- Settings page includes an approval section at the top (above heatmap upload):
  - Approve users who signed up to grant access
- Team reassignment is supported:
  - Change a user from being attached to an existing team to having their own team
  - Needed for apprentice → independent transitions so lanes are not intertwined

---

## Assets / Context
- If heatmap reference screenshots are needed for Ticket 4:
  - Ask where to place them in the repo and what filenames to use before implementing.

---

## Confirmation protocol
- After Phase 0 (this file), stop and wait for confirmation.
- Use: “Confirmed. Start Ticket 1.”
