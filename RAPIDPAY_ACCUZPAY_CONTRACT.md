# RapidPay API Contract — AccuzPay ↔ UrbanKart (RapidPay downstream)

Endpoints **AccuzPay calls on us** for RapidPay collections (payin) and disbursements (payout), plus the **result callback we POST back to AccuzPay**. Same conventions as the AirPay / Razorpay / MizorPay integrations.

- **Base URL:** `https://api.anpamart.com/api/v1/payments/rapidpay`
- **Auth (AccuzPay → us):** header `x-api-key: <ACCUZPAY_SHARED_SECRET>` — missing/wrong key → `401 { "success": false, "message": "Unauthorized" }`
- **Content-Type:** `application/json`
- **Amounts:** INR **rupees** (not paise)
- **Correlation key:** AccuzPay's `reference_id` — unique per transaction, used for status checks and callbacks

| # | Method | Path | Purpose |
|---|---|---|---|
| 1 | POST | `/rpp-initiate` | Create a collection (UPI intent) |
| 2 | GET | `/rpp-check?reference_id=` | Collection status |
| 3 | GET | `/rpp-balance` | Collection wallet balance |
| 4 | POST | `/payout/rpp-initiate` | Send a payout (bank transfer) |
| 5 | GET | `/payout/rpp-check?reference_id=` | Payout status |
| 6 | GET | `/payout/rpp-balance` | Payout wallet balance |
| — | POST | *AccuzPay callback URL* | Final result we push to AccuzPay (§7) |

---

## 1. Initiate Collection

`POST /rpp-initiate`

**Request**
```json
{
  "reference_id": "ACZPAYIN000123",
  "amount": "100",
  "name": "Test Customer",
  "email": "customer@example.com",
  "phone": "9999999999",
  "customerId": "CUST001"
}
```

| Field | Required | Notes |
|---|---|---|
| `reference_id` | ✅ | Unique; a repeat returns `409` (even if the first attempt failed — use a new id to retry) |
| `amount` | ✅ | Rupees. **Minimum ₹100** (RapidPay rule) |
| `email` | ✅ | |
| `customerId` | ✅ | |
| `name` | ⬜ | Default `"Customer"` |
| `phone` | ⬜ | Last 10 digits used |

**Success `200`**
```json
{
  "success": true,
  "reference_id": "ACZPAYIN000123",
  "rapidpay_order_id": "RPC…",
  "rapidpay_txn_id": null,
  "upi_intent_uri": "upi://pay?mode=04&pa=pinelabs.11839793@pineaxis&pn=SALAH%20CIRCLE%20ENTERPRISE&mc=7399&cu=INR&am=100.00&tr=…&tn=…",
  "rapidpay_payload": { "reference_id": "RPC…", "intent": "upi://pay?…", "txn_amount": "100", "status": "PENDING" }
}
```
Render a QR / deep link from `upi_intent_uri`. The payee shown to the customer is RapidPay's merchant (e.g. *SALAH CIRCLE ENTERPRISE*). `rapidpay_txn_id` is always `null` — RapidPay does not return its own id.

**Errors**
| Code | Body | Meaning |
|---|---|---|
| `400` | `{ "success": false, "message": "Missing required fields: reference_id, amount, email, customerId" }` | Validation |
| `409` | `{ "success": false, "message": "Transaction with this reference_id already exists" }` | Duplicate |
| `502` | `{ "success": false, "message": "RapidPay collection/initiate failed: min amount for order is 100", "provider_error": { … } }` | Rejected by RapidPay (min amount, invalid request, …) |

---

## 2. Check Collection Status

`GET /rpp-check?reference_id=ACZPAYIN000123`

Served from our database, which RapidPay's webhook keeps current (usually within seconds of payment). Only a transaction still `PENDING` after 3 minutes triggers one live RapidPay lookup, at most once per minute — so polling is cheap and safe.

**Response `200`**
```json
{
  "success": true,
  "reference_id": "ACZPAYIN000123",
  "status": "TXN",
  "rapidpay_status": "SUCCESS",
  "rapidpay_order_id": "RPC…",
  "rapidpay_txn_id": null,
  "forwarded": true,
  "amount": 100,
  "utr": "790698247377",
  "failure_reason": null
}
```

| `status` | Meaning |
|---|---|
| `TXN` | Paid. `utr` is set |
| `PENDING` | Not paid yet |
| `FAILED` | Rejected at initiate. `failure_reason` is set |

`forwarded` = whether the §7 callback has been delivered. Unknown `reference_id` → `404 { "success": false, "message": "Transaction not found" }`.

> ⚠️ **A failed UPI attempt (e.g. wrong PIN) does not fail the collection** — RapidPay keeps it `PENDING` (the customer can retry) and sends no failure. AccuzPay's reconciliation worker should expire stale `PENDING` collections on its own timeout. We run no expiry job.

---

## 3. Collection Balance

`GET /rpp-balance` → `200 { "success": true, "balance": "285.84" }`
RapidPay error → `502 { "success": false, "message": "…", "provider_error": { … } }`

---

## 4. Initiate Payout

`POST /payout/rpp-initiate`

**Request**
```json
{
  "reference_id": "ACZPAYOUT000123",
  "amount": "100",
  "account_number": "497102010031582",
  "account_ifsc": "UBIN0549711",
  "bank_name": "Union BANK",
  "beneficiary_name": "Abhishek",
  "request_type": "IMPS"
}
```

| Field | Required | Notes |
|---|---|---|
| `reference_id` | ✅ | Unique; a repeat returns `409` |
| `amount` | ✅ | Rupees |
| `account_number` | ✅ | |
| `account_ifsc` | ✅ | |
| `bank_name` | ✅ | Human name, e.g. `"Union BANK"` |
| `beneficiary_name` | ✅ | |
| `request_type` | ⬜ | Stored for reference only |
| `email`, `mobile` | ⬜ | **Ignored.** We always send our fixed company contact to RapidPay |

**Responses**

| Code | Body | Meaning |
|---|---|---|
| `200` | `{ "success": true, "reference_id": "…", "rapidpay_payout_id": "RPD…", "rapidpay_txn_id": null, "status": "PROCESSING", "amount": 100 }` | Accepted. Final result via §7 / §5 |
| `200` | same shape, `"status": "FAILED"` | RapidPay rejected it instantly. Final — §7 callback with `FAILED` also sent |
| `200` | same shape, `"status": "PROCESSING"` + `"message": "Payout submission outcome unknown — poll /payout/rpp-check; do NOT retry with a new reference_id"` | Timeout / network error reaching RapidPay. The payout **may** have gone through |
| `400` | `{ "success": false, "message": "Missing required fields: reference_id, amount, account_number, account_ifsc, bank_name, beneficiary_name" }` | Validation |
| `409` | `{ "success": false, "message": "Payout with this reference_id already exists" }` | Duplicate |
| `502` | `{ "success": false, "message": "RapidPay disbursement/initiate failed: invalid request.", "provider_error": { … } }` | Rejected by RapidPay before creation (invalid request, downtime, …). Nothing was sent |

> ⚠️ **Never retry a `PROCESSING` payout with a new `reference_id`** — that risks paying twice. Poll §5 or wait for §7. Retrying is safe only after a `FAILED` result.

Typical timing seen live: `PROCESSING` → `SUCCESS` in ~3–4 min; failures in under a minute. RapidPay charges ~₹2.36 per ₹100 payout; failed payouts are refunded in full.

---

## 5. Check Payout Status

`GET /payout/rpp-check?reference_id=ACZPAYOUT000123`

DB-first, same rule as §2 (live lookup only for in-flight payouts older than 3 min, max once per minute).

**Response `200`**
```json
{
  "success": true,
  "reference_id": "ACZPAYOUT000123",
  "status": "TXN",
  "payout_status": "SUCCESS",
  "rapidpay_payout_id": "RPD…",
  "rapidpay_txn_id": null,
  "forwarded": true,
  "amount": 100,
  "utr": "631819461743",
  "failure_reason": null
}
```

| `status` | Meaning |
|---|---|
| `TXN` | Paid out. `utr` is set |
| `PROCESSING` | Sent, awaiting bank result |
| `PENDING` | Just created |
| `FAILED` | Failed. `failure_reason` is set |

Unknown `reference_id` → `404 { "success": false, "message": "Payout not found" }`.
**Note:** RapidPay gives no failure reason, so `failure_reason` is often just `"FAILED"`.

---

## 6. Payout Balance

`GET /payout/rpp-balance` → `200 { "success": true, "balance": "197.64" }`
RapidPay error → `502`.

---

## 7. Result Callback (us → AccuzPay)

When a transaction reaches a final state, we `POST` once to AccuzPay:

- **Collections:** `ACCUZPAY_CALLBACK_URL`
- **Payouts:** `ACCUZPAY_PAYOUT_CALLBACK_URL` (falls back to `ACCUZPAY_CALLBACK_URL`)
- **Headers:** `x-api-key: <ACCUZPAY_SHARED_SECRET>`, `Content-Type: application/json`

**Success**
```json
{ "reference_id": "ACZPAYOUT000123", "status": "TXN", "utr": "631819461743", "amount": 100 }
```

**Failure**
```json
{ "reference_id": "ACZPAYOUT000123", "status": "FAILED", "utr": null, "amount": 100, "error_message": "FAILED" }
```

- Sent only for final states (`TXN` or `FAILED`). A collection that stays `PENDING` gets no callback.
- **Delivery:** reply with any `2xx`. Otherwise we retry 6 times with exponential backoff (3s, 6s, 12s, …). After a `2xx`, nothing more is sent.
- **Idempotency:** treat `reference_id` as idempotent on your side, since a retry can arrive after a slow `2xx`.

---

## 8. How results reach us

RapidPay notifies us by webhook (IP-allowlisted, typically within seconds), so most results reach AccuzPay through §7 with no polling needed. The check endpoints exist as a fallback and for reconciliation.
