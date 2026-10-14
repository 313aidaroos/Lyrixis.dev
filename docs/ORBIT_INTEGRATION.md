# Apixis Orbit — Lyrixis integration handoff

**Status: NOT CONNECTED**. This PR is a safe scoped implementation brief and capability manifest, with no production API or user behavior changed.

## What exists today
`README.md` says Lyrixis supports song uploads, a processing pipeline, synchronized lyric preview, rights checks, downloads and Wallet entitlement. Some enterprise/translation capabilities are deferred.

## Proposed scope
- Capability: `lyrixis.tracks.status.read` (`read`, planned).
Let the verified rights holder ask their Orbit agent for the real processing status of their own uploaded music.

## Concrete work to implement next
1. Reuse the owner-scoped track status API and copyright/rights metadata.
2. Return job state and source timestamp, never unreleased lyrics/audio files in a cross-site summary.
3. Do not schedule duplicate heavy transcoding jobs or charge Wallet again during status reads.
4. If processing is running, report that fact, not an invented result.
5. Test cross-user track IDs and missing processing records.

## Universal Orbit gates
1. The Orbit host uses the **existing Apixis identity** and wallet; this repo does not create another credit ledger, agent registry, checkout or auth provider.
2. Any future adapter needs a dedicated signed service credential, expiry + replay prevention, binding from Apixis ID subject to the **local account or tenant**, and per-resource authorization. The Orbit hub must not impersonate users by supplying emails.
3. Data must be genuine and have a source timestamp and `demo` flag; errors and absent integrations fail closed. User-facing text must distinguish draft, submitted, paid, and verified states.
4. Only read/draft initially. No autonomous outbound messaging, spending, contracts, orders, investments, publishing or settlement.
5. Require unit/integration tests for wrong owner, missing creds, no-data response, retried requests and source freshness.
6. Never activate an Orbit capability in Core until product-specific code, tests and owner production configuration are verified.

**This PR provides integration preparation only, not runtime wiring.** See https://github.com/313aidaroos/Apixis.dev/pull/86 for the draft Orbit Core.
