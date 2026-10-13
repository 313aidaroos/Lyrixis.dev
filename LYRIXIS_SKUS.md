# Lyrixis SKUs for Apixis Wallet Catalog

**Company:** Lyrixis (lyrixis.vercel.app)  
**Contact:** lyrixis@apixis.dev  
**Catalog integration lead:** @apixiswallet  
**Currency:** Ixis (100 Ixis = $1)

---

## Proposed SKUs

### 1. Single Track Unlock
- **SKU:** `lyrixis_track_unlock`
- **Cost:** 300 Ixis ($3.00)
- **Type:** One-time purchase
- **Description:** Unlock full synced lyrics, metadata, and export formats for one track.
- **Entitlement:** Access to one track's complete intelligence layer (lyrics, timecodes, translations, exports).

### 2. Starter Monthly (100 tracks)
- **SKU:** `lyrixis_starter_monthly`
- **Cost:** 10,000 Ixis ($100/month)
- **Type:** Recurring monthly subscription
- **Description:** Starter tier: process up to 100 tracks per month.
- **Entitlement:** 100 track credits renew monthly; unused credits do not roll over.

### 3. Pro Monthly (1,000 tracks)
- **SKU:** `lyrixis_pro_monthly`
- **Cost:** 20,000 Ixis ($200/month)
- **Type:** Recurring monthly subscription
- **Description:** Pro tier: process up to 1,000 tracks per month with volume discount.
- **Entitlement:** 1,000 track credits renew monthly; unused credits do not roll over.

### 4. Enterprise Monthly (10,000 tracks)
- **SKU:** `lyrixis_enterprise_monthly`
- **Cost:** 30,000 Ixis ($300/month)
- **Type:** Recurring monthly subscription
- **Description:** Enterprise tier: process up to 10,000 tracks per month with priority processing.
- **Entitlement:** 10,000 track credits renew monthly; priority processing queue.

### 5. Custom Export (Per Track)
- **SKU:** `lyrixis_export_custom`
- **Cost:** 100 Ixis ($1.00)
- **Type:** One-time purchase
- **Description:** Export one track in a custom format (LRC, SRT, JSON, TTML, etc.).
- **Entitlement:** One custom export file download.

---

## Integration Notes

- All pricing uses **Ixis points** (100 Ixis = $1).
- Lyrixis will integrate with Apixis Wallet APIs:
  - `POST /api/v1/quotes` → create quote
  - `POST /api/v1/reservations` → reserve Ixis
  - `POST /api/v1/reservations/:id/capture` → finalize redemption
  - `POST /api/v1/reservations/:id/release` → cancel/refund
- **Paid Ixis never expires** (per family-wide policy).
- Entitlements are tracked in Lyrixis database; Wallet provides proof of redemption.

---

### 6. Voice setup (one-time)
- **SKU:** `lyrixis.voice.setup`
- **Cost:** 500 Ixis ($5.00)
- **Type:** One-time purchase
- **Description:** Private voice model for the signed-in Apixis ID, including a re-record.
- **Entitlement:** One own-voice model. Not a license to clone anyone else.

### 7. Voice song
- **SKU:** `lyrixis.voice.song`
- **Cost:** 600 Ixis ($6.00)
- **Type:** One-time purchase
- **Description:** One song in the user's own voice. Includes 3 takes and lyric edits.
- **Entitlement:** One voice song with 3 takes.

### 8. Extra voice take
- **SKU:** `lyrixis.voice.take`
- **Cost:** 100 Ixis ($1.00)
- **Type:** One-time purchase
- **Description:** One extra full take after the three included with a voice song.
- **Entitlement:** One additional take.

### 9. Voice song release
- **SKU:** `lyrixis.voice.release`
- **Cost:** 900 Ixis ($9.00)
- **Type:** One-time purchase
- **Description:** Submit one single for review and distribution. User keeps 90% of reported master royalties.
- **Entitlement:** One release request.

All-Access ($30 / month, 3,000 Ixis) includes the voice model, 4 voice songs, and 1 release each month.

---

## Requested Action

Please add these SKUs to `lib/catalog.ts` in the Apixis Wallet repo (313aidaroos/ApixisWallet).  
Lyrixis will implement the redemption flow once `docs/INTEGRATION.md` is published.

**Message:** @apixiswallet
