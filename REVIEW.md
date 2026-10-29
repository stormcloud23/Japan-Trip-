# Implementation review

## Findings

1. **Decision support was missing.** The destination collection, itinerary and filters are extensive, but there was no way to narrow down candidates through the UI. Added per-place Shortlist / Set aside / Still deciding choices, a choice filter, counts and a copyable shortlist. Existing destinations and itinerary assignments remain intact. Choices use a versioned local-storage key, validate stored values and remain usable when storage is blocked. Export includes all shortlisted places, independent of current filters.
2. **Sharing has a clear limit.** This is a static GitHub Pages app. Trip data and booking statuses live in repository JSON. The new personal choices live in each browser; they are not shared edits. A shared decision list would need an explicit storage/authentication design. Do not put a GitHub write token in client code.
3. **Map startup is a single point of failure.** `js/app.js` constructs MapLibre before fetching destination data or registering controls. A blocked CDN or unsupported WebGL can prevent the wishlist and itinerary from starting. The existing tile-provider fallback handles tile errors after map construction, but does not cover this startup failure. A follow-up should decouple map initialization from the rest of the app and exercise failed library/WebGL initialization in tests.
4. **The itinerary is already substantially preassigned.** Routing honors day assignments and uses estimates to report daily workload. Shortlisting is therefore a preference layer, not a new proposed route. Choosing a favorite does not claim it fits a day, and setting aside a scheduled stop does not silently remove it from route calculations. Actual itinerary changes should reconcile attractions, travel anchors and hotel nights together.
5. **Security basics are sound.** Inspected destination and logistics rendering escapes text and limits external destination links to HTTP(S), with `noopener noreferrer`. Public repository data should continue to exclude private reservation details. New choice labels use the same escaping, and clipboard fallback uses text content.
6. **Existing tests provide useful coverage.** Routing, workload, railway fallback, lodging coverage, filtering and photo manifests have automated checks. Added behavior tests for choice persistence/restoration, filtering, export and inaccessible/malformed browser storage. Browser layout and live external services have not been visually verified in this review.

## Validation

`node --test tests/*.test.cjs`: **53 passing tests**.

No destination JSON was modified.
