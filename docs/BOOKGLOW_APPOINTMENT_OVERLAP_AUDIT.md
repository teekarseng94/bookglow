# BookGlow appointment overlap audit

Read-only check on 10 October 2026.  
Production project: `uecphpjymbgtttrizhgy`.  
Calendar used for “today”: `Asia/Kuala_Lumpur`. The database date at query time was **2026-10-10**.

No appointment was deleted, rescheduled, or updated. Appointment `date` and `time` are stored as text, not as UTC timestamps. “Past”, “today”, and “future” compare that calendar date with 10 October 2026 in Malaysia.

## 1. What 777 means

The pre-production audit described **777** as “overlapping non-cancelled staff pairs”. It did not save the SQL. It is a count of **pairs of appointments**, not 777 appointment rows and not 777 staff members.

Re-running that definition on 10 October 2026:

A pair is counted when all of the following are true:

- same `outlet_id`
- same non-blank `staff_id`
- same calendar `date`
- `a.id < b.id`, so each unordered pair is counted once
- status is not `cancelled`, `no-show`, `no_show`, or `canceled` (the same set the insert trigger and the merchant overlap helper ignore)
- the stored start and end times overlap: start A < end B and start B < end A
- both rows have an end time later than the start time

That query returns **776 pairs**.

777 and 776 are the same metric, one pair apart. No appointment was inserted after the earlier audit (`created_at` max is 2026-10-09 14:22 UTC). The unsaved original statement is the likely reason for the one-pair difference, not a later booking. This report uses the measured **776**.

Other counts from the same rows, so they are not mixed up with 776:

| Metric | Count | Meaning |
| --- | ---: | --- |
| Stored-time overlap pairs | 776 | The 777-style figure |
| Distinct appointments inside those pairs | 1,017 | One appointment can sit in several pairs |
| Staff-days that contain at least one pair | 393 | One busy day with many overlapping rows becomes many pairs |
| Trigger rule, including a missing end filled from the service duration or 30 minutes | 891 | 115 of these are not in the 776 |
| Same outlet, overlapping stored times, **different** staff | 2,805 | Legitimate parallel bookings. Not part of 776 |
| Appointments in the table | 2,342 | All outlets |

Back-to-back visits, where one end time equals the next start time, are not overlaps.

## 2. Past, today, and future

Every one of the 2,342 appointments has a calendar date before 10 October 2026. The earliest is 2025-01-05. The latest is **2026-10-09**.

| Window | Appointments | Stored-time overlap pairs |
| --- | ---: | ---: |
| Historical (date before 2026-10-10) | 2,342 | 776 |
| Today | 0 | 0 |
| Future | 0 | 0 |

There is no upcoming double booking in the database on this date. Outlet `timezone` is null on these rows; the appointment date is already a calendar date, so it was not shifted from UTC.

## 3. Confirmed conflicts

A confirmed conflict here means the 776 stored-time pairs: same outlet, same staff member, overlapping clock times, and a status the product still treats as occupying the calendar (`scheduled` or `completed`). `confirmed` does not appear in this data. Six `cancelled` rows were excluded. There are no `no-show` rows.

Those 776 pairs are all historical.

They are not all two different customers:

| Who is on the two rows | Pairs |
| --- | ---: |
| Two different saved client ids | 132 |
| The same client id | 265 |
| Guest, blank, or one side missing a client | 379 |

The 132 pairs are the ones that show two identified people on one staff member at the same time. The 265 same-client pairs still occupy that staff member twice; they can be two services stacked on one visit, or the same visit stored twice. The 379 guest pairs cannot be told apart, because POS walk-ins are often stored as `guest`.

Four pairs share one sale id (1 at Sohokaki, 3 at Bali Wellness). That is one checkout writing two overlapping rows for the same person. It is not the source of the other 772 pairs.

## 4. Status rules

Blocking statuses in the live insert trigger and in `apps/merchant-portal/utils/appointmentOverlap.ts` are everything except `cancelled`, `no-show`, `no_show`, and `canceled`. `completed` still blocks. That matches this count.

Non-blocking rows in production: 6 `cancelled`. None of them are inside the 776.

## 5. Different staff members

They were not included in the 776.

There are **2,805** pairs with the same outlet, the same date, and overlapping stored times, but **different** staff ids. Those are two therapists working at once. The pair query requires `staff_id` to match, so they stay out of the conflict count.

## 6. No assigned staff member

| Check | Result |
| --- | --- |
| `staff_id` null or blank | 0 appointments |
| Calendar token `__unassigned__` | 0 appointments |
| Shared room or chair capacity rule | None in the schema or booking trigger |

`__unassigned__` is only a schedule-column label when a row’s staff id is missing or not in the loaded staff list. It is not a bookable resource with a capacity.

The public booking function, if an outlet has no staff row, can store the literal staff id `unassigned`. That string is not blank, so the insert trigger would treat those rows as the same staff member and reject a second insert. No current appointment uses that value.

“Any available” does not leave the staff empty. `create_public_booking` assigns the first staff member for the outlet by name, then inserts. The overlap lock then applies to that person. It does not search for a free therapist.

## 7. By outlet

Only three outlets have appointments. The other outlets have none, so they have no pairs.

| Outlet | Appointments | Overlap pairs | Appointments in those pairs | Staff-days | Date range |
| --- | ---: | ---: | ---: | ---: | --- |
| SOHOKAKI WELLNESS CENTER | 1,264 | 448 | 565 | 214 | 2025-08-03 to 2026-10-09 |
| Bali Wellness | 1,077 | 328 | 452 | 179 | 2026-01-31 to 2026-10-09 |
| 白金卡 | 1 | 0 | 0 | 0 | one past row |

Sohokaki pairs: 106 different clients, 186 same client, 156 guest or blank.  
Bali Wellness pairs: 26 different clients, 79 same client, 223 guest or blank.

## 8. Where the pairs came from

`source` and `created_at` are the evidence. Customer public booking and Setmore are not the source of these pairs.

| Origin | How it was recognized | Sohokaki pairs | Bali pairs | Different clients |
| --- | --- | ---: | ---: | ---: |
| Imported, no source | Both rows have a null `source`, a null `created_at`, and were copied with `is_on_duty` | 340 | 111 | 126 |
| POS | Either row has `source = 'pos'` | 68 | 177 | 3 |
| Other saved rows | A `created_at` is present, source is still blank | 40 | 40 | 3 |
| `public-booking` | `source = 'public-booking'` | 0 | 0 | 0 |
| Setmore | `source = 'setmore'` | 0 | 0 | 0 |

Production shape of the table:

- 1,511 rows are `scheduled`, `is_on_duty = true`, source null. The column default is `false`, so the flag was stored on purpose. 1,269 of the on-duty, source-null rows also have a null `created_at`. The Firestore appointment import copies `isOnDuty` and can leave `created_at` empty. These are historical POS / on-duty records, not new website bookings. 451 of the 776 pairs are two of those imported rows.
- 700 rows are `completed`, `source = 'pos'`, `is_on_duty = true`. That is the current merchant checkout path, which creates a completed schedule row for each service line. 245 pairs involve a POS row. 242 of those use a guest or blank client, so they do not prove two customers. Only 3 POS pairs have two different client ids.
- Public booking has 2 rows (1 `scheduled`, 1 `cancelled`). Setmore has 23 `scheduled` rows. Neither source appears in an overlap pair.
- Same-client imported pairs (174 at Sohokaki, 73 at Bali) fit two on-duty records for one guest, or two services given the same clock times. They are not evidence of a public-booking race.

The old insert path did not check overlap. That hole is real for **new** rows. It did not produce the public-booking pairs in this table, because those pairs are not there.

## 9. Can a new double booking still be saved?

New inserts for the same outlet, staff member, and date are rejected. Existing rows are left as they are.

Verified on the live database:

- Trigger `appointments_reject_staff_overlap` is `BEFORE INSERT` only. It is not an `UPDATE` trigger.
- The function takes `pg_advisory_xact_lock` on `outlet_id | staff_id | date` before it looks for an overlap.
- Two simultaneous inserts for that key wait on the lock. Under read committed, the second transaction sees the first row after the first commits, then raises `unique_violation` with “This staff member already has an appointment at that time.”
- Blank staff is skipped. Cancelled and no-show inserts are skipped.
- `create_public_booking` still has no overlap check of its own. Its `INSERT` runs the trigger, and it writes `end_time` from the service duration.
- Different staff members can be booked at the same time. That is allowed.
- There is no appointment today or in the future, so nothing upcoming is currently double-booked.

Gaps that do not rewrite history:

- **Update / reschedule** does not run the trigger. Moving an existing row onto another booking can still create a new overlap. An update trigger that runs for every column would also block harmless edits of the old overlapping rows, which is why the current trigger is insert-only.
- The merchant screen only compares appointments already loaded in the browser. The trigger is what actually stops the insert.
- The public slot list is not locked. Two people can see the same slot. The second insert fails.
- A public checkout with several services sends them all at the **same** selected time, in parallel. If they use the same therapist, the lock rejects the second insert. The first insert can already be committed, so the customer can see an error after one service was saved.
- “Any available” assigns the first staff name, not a free staff member, and then the lock applies to that person.
- If `end_time` is missing, the trigger fills it from the service duration or 30 minutes. That can reject a new insert the stored-time report would not have called an overlap. 115 existing pairs exist only under that estimate (Sohokaki 47, of which 46 use a catalog duration and 1 uses 30 minutes; Bali Wellness 68, of which 24 use a catalog duration and 44 use 30 minutes).

## 10. Results

| | Count |
| --- | ---: |
| Total detected overlaps (stored-time pairs, the 777 metric) | 776 |
| Confirmed two-customer conflicts | 132 pairs |
| Same-customer overlapping records | 265 pairs |
| Guest or unknown customer | 379 pairs |
| Historical conflicts | 776 pairs, all of them |
| Today | 0 |
| Upcoming conflicts | 0 |
| False positives inside the 776 | Different staff were not included. The 115 duration-only pairs are estimates and are **not** inside the 776. Same-client and guest pairs are real staff-time overlaps with a weaker claim that two people were booked. |
| Parallel work that is not a conflict | 2,805 different-staff pairs |

### Root causes

1. Historical on-duty rows imported from Firestore, with no source and no `created_at`, already overlapped. That is 451 pairs, including 126 with two different clients.
2. POS checkout writes a completed on-duty appointment per service. That is 245 pairs, almost all guest clients, plus 4 pairs that share one sale.
3. Another 80 pairs are saved merchant rows with a `created_at` and no source. Three of those have two different clients.
4. Public booking and Setmore did not create these pairs.
5. The missing overlap check on insert explains how new overlaps could be saved before 10 October 2026. The insert trigger now closes that for new rows.

### Recommended fixes

Do not delete, cancel, or move these appointments as a batch.

1. Leave the 776 historical pairs in place. Clean them only with a reviewed list, starting from the 132 different-client pairs if a human is going to call the customer.
2. Keep the insert trigger and the advisory lock. That is what stops a new double booking, including two requests at the same time for one staff member.
3. If reschedule must be protected, run the same check on update only when staff, date, or times change. Do not reject an edit that leaves the old window as it is, or the historical pairs become stuck.
4. Keep writing an explicit `end_time`. Do not rely on the 30-minute guess for new rows.
5. For a multi-service public booking, give each service its own start time, or book a different therapist. Same therapist and the same clock time will keep failing the second insert.
6. Change “any available” so it chooses a staff member who is free, then inserts under the lock.
7. For POS, do not add a second blocking row when the sale is already tied to an appointment. Store a real client id for walk-ins when the outlet knows who it is.
8. There is no shared-room capacity to enforce. Do not treat unassigned columns, or different staff at the same time, as conflicts.
9. Before any cleanup, re-run the stored-time pair query. The number that matters for release is upcoming pairs. On 10 October 2026 that number is 0.
