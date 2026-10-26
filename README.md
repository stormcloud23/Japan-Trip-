# Japan Honeymoon Planner 🇯🇵

A living, mobile-friendly Japan trip map, wishlist and 14-day itinerary.

## View the site
After enabling **Settings → Pages → Deploy from a branch → main / (root)**, visit:
https://stormcloud23.github.io/Japan-Trip-/

## Update the trip
The source of truth is [data/destinations.json](data/destinations.json). Send attraction, restaurant, hotel, or activity links in the Japan Trip ChatGPT project and ask to add them to this GitHub repository. Changes to the JSON will show on the site after GitHub Pages publishes them. You can also edit the JSON directly on GitHub.

Example destination object (coordinates are decimal degrees; use verified coordinates):
```json
{
  "id": "unique-slug",
  "name": "Place name",
  "city": "Kyoto",
  "region": "Kyoto Prefecture",
  "lat": 35.0,
  "lng": 135.7,
  "category": "temple",
  "status": "wishlist",
  "priority": "high",
  "day": null,
  "order": null,
  "estimated_minutes": 90,
  "url": "https://example.com/",
  "notes": "Why we want to visit"
}
```

Valid statuses: `wishlist`, `planned`, `booked`, `visited`. `day` is `null` for optional/unscheduled stops, or an integer from 1 to 14 for proposed stops. Use `order` to sequence stops within a day. Proposed days are not bookings. Omit uncertain coordinates until verified.

## Using the map and itinerary

- **Choose a day:** Use the day selector above the map, its Previous/Next buttons, or click a day card below the map. The map zooms to the attractions and incoming travel connections for that day. For longer rail legs, it fits the mapped tracks as well as the stops (without zooming out for long flight paths). Choose **All Japan** to reset the view and filters.
- **Share a specific day:** Click **Copy Day N link** to share a URL ending in `#day=N` (for example, `#day=12`). Opening the URL restores that selected day automatically. The URL includes no private travel data; browsers without clipboard access display the link for manual copying.
- **Print / Save PDF:** Click the button above the 14-day itinerary to open your browser's print dialog. Print styles omit the interactive map and include all itinerary cards, proposed overnight bases and the booking checklist. Most browsers can use **Save as PDF** as the print destination.
- **Clustered destinations:** On the whole-trip map, nearby places merge into numbered clusters as you zoom out. Click a cluster to zoom in. A single pin has a day number; in day view, its number is that day's stop order.
- **Color-coded pins:** Sightseeing (coral), nature (green), history (purple), food (gold), shopping (blue), onsen/hotels (lavender). Unscheduled or alternative destinations are **gray**.
- **Filters:** Region, category, scheduled vs. optional, booking status, and text search all narrow the wishlist and visible map markers. Use **Show on map** on a destination card to zoom straight to it.
- **Daily workload estimates:** Each day card has a provisional activity+travel workload indicator and expandable breakdown. The calculation sums attraction duration estimates, a coarse allowance for significant train/flight/road legs stored in `trip.days[].travel_minutes_estimate`, rough between-stop transfer times derived from geographic distance, and 45 minutes for a break. It compares that total with a configurable daily comfort target (generally 600 minutes). **Busy** exceeds 85% of the target and **Packed** exceeds it. These are not confirmed train timetables or ticketed schedules.
- The app does **not** remove wishlist entries when a day looks crowded. The current schedule flags Days **3, 10, 12, and 13** as packed based on these planning estimates. They can be relaxed later by shifting dates or activities.

The UI is implemented in `js/app.js` and `css/site.css`, so the map/controls are separate from the pure routing logic in `js/route-planner.js`.

## Provisional route (autumn 2027)

**Tokyo → flight to Asahikawa → Asahidake → Biei → limited-express train toward Sapporo → Jozankei → train to Noboribetsu → train to New Chitose Airport → flight to Osaka → Kyoto home base with Osaka/Himeji train day trips → Tokaido Shinkansen to Tokyo.**

The two domestic flights are provisional exceptions to the rail-first preference. In 2027 the Hokkaido Shinkansen ends at Shin-Hakodate-Hokuto (not Sapporo or Asahikawa); routing entirely by train would add long connecting-rail days that currently do not fit the 14-day trip. Confirm 2027 timetables and tickets nearer the trip.

### Automatic travel routing

The **source of truth** is `data/destinations.json`. Every website load runs the pure, testable `js/route-planner.js` engine:

1. Reads proposed `day` and `order` for attractions, plus `trip.travel_anchors` (airport/station waypoints and their arrival transport mode).
2. Merges those in chronological order and **automatically redraws** all connected legs. Adding or moving a day-assigned attraction requires **no manual edits to route coordinates**.
3. For a newly added item with `day: null`, attempts a **tentative suggested day** near already scheduled places, subject to proximity, the day workload model (activities + travel + transfer estimates), and protected travel days. The engine inserts a suggested stop at the within-day position with the least additional geographic detour, preserving the order of existing stops. Suggested placements appear as *Suggested* in the page but are **not stored as confirmed assignments**. Itineraries for distant or oversized additions need a human decision.
4. `route_preference: "alternative"` (or `"unplanned"`) prevents auto-scheduling optional resorts, replacement attractions and wishlist-only locations. Existing alternatives have this flag.
5. For intercity routes, rail is preferred on supported corridors: `shinkansen` for Kyoto–Tokyo and Kyoto–Himeji; `rail` for Kyoto–Osaka and suitable Hokkaido train connections. An anchor's optional `arrival_mode` overrides this inference (e.g. `flight` at Asahikawa/Osaka airports). Unknown very-long-distance transfers are tagged `review`, rather than invented as an air or rail service.

The webpage displays five route styles: **magenta dashed lines for flights**, green for Shinkansen, teal for other trains, amber for local transfers and gray for transfers needing review. Train legs with cached GIS coverage follow mapped railway alignments; flights and other unmatched connections remain straight schematic links. No route line establishes a bookable service.

`trip.days` holds 14 day descriptions; update it when significantly reshuffling the itinerary. `trip.travel_anchors` is for durable major station/airport transitions and itinerary start/return hubs. These anchors **do not** need edits for a newly scheduled attraction in an existing area. A new destination that fundamentally changes regions, trip days or transportation must be reconsidered manually.

**Unscheduled alternatives** presently include Minakami's Takaragawa Onsen, Lake Toya, Niseko's Zaborin, other Hokkaido ryokan choices, Osaka Aquarium Kaiyukan and Hikone Castle.

## Overnight bases and booking-readiness checklist

The **Overnight stays & reservations** panel groups the 13 provisional nights into seven hotel blocks and shows six potential hotel changes. This is a planning forecast, not a list of booked hotels:

| Nights | Proposed base | Possible property |
|---|---|---|
| 1–2 | Tokyo | Not selected |
| 3 | Asahikawa / Biei | Not selected |
| 4 | Sapporo | Not selected |
| 5 | Jozankei Onsen | Jozankei Daiichi Hotel Suizantei (candidate) |
| 6 | Noboribetsu Onsen | Dai-ichi Takimotokan (candidate) |
| 7–11 | Kyoto | Not selected; one Kyoto hotel for day trips |
| 12–13 | Tokyo | Not selected |

The reservation checklist includes flight planning, potential ryokan nights, Ghibli Museum, Cafe Capyba, Hikiniku to Kome, and Kyoto–Tokyo Shinkansen tickets. It has **All / High priority / Hotels / Transport / Experiences** filters. Every task is currently in `research` status, not booked. Ticket release rules and 2027 transport schedules must be rechecked nearer travel.

Data is stored in `trip.stays` and `trip.booking_tasks` inside `data/destinations.json`. `js/stay-planner.js` validates night coverage, prevents overlapping hotel blocks, links candidate destination IDs, and summarizes remaining tasks; `js/logistics-ui.js` renders the section without editing or storing changes in the browser. Updates to accommodation choices and booking statuses should be made through GitHub/ChatGPT. No reservation confirmation codes, passenger details, or passport data should be stored in this public repository.

## Actual railway track overlays

The rail-first route planner now has a second, **offline cached GIS layer**. The map attempts to overlay each scheduled `rail` or `shinkansen` leg with geographic railway centerlines rather than a straight line.

- `data/rail-corridors.json` contains **8 corridor shapes covering 9 currently scheduled train legs** (Kyoto–Himeji is used in both directions). Its combined size is about 13 KB.
- The shapes were calculated from **国土数値情報（鉄道データ）(国土交通省) / Japan MLIT National Land Numerical Information N02 railway data (2024)**, sourced through the archived processed GIS sections at [antfu/mlit-json](https://github.com/antfu/mlit-json). [Official 2024 dataset](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2024.html) · [MLIT data terms](https://nlftp.mlit.go.jp/ksj/other/agreement_02.html). **We processed, selected, routed, and simplified the source GIS centerlines** using shortest connected railway paths; this is not a map issued by the Japanese government.
- `js/rail-geometry.js` matches start and end geographic coordinates and mode to cached track corridors, automatically reverses directional paths, and builds separate **amber local-access connectors** where a destination is away from the track/station. Those access connectors are straight approximations rather than walking navigation.
- All other connections (including both flights, local ground transfers, and newly scheduled train connections not yet in the cached dataset) remain **straight-line schematic fallbacks**. No external railway-geometry API or paid account is required at page load; the rail snapshot loads after the itinerary and never blocks the map.
- `tests/rail-geometry.test.cjs` verifies railway source metadata, reverse trips, approximate station access, all 9 mapped legs, and graceful fallback.

These geographical alignments **do not prove a direct service** between the chosen endpoints and **do not include train timetables, platform routing, real footpaths, or changes made after the 2024 dataset**. Verify route/service availability when planning real rail tickets. In day view, intercity lines appear on the **arrival day**, so Kyoto → Tokyo displays on Day 12.

### Route regression tests

Run `node --test tests/*.test.cjs` with Node.js 22 or later. Tests cover the 14-day route, flights/train segments, optional stops, packed-day warnings, automatic additions, 13 hotel nights, booking filters and safe markup. A mocked MapLibre/browser test also exercises day navigation, pins, cluster setup, cached curved rail shapes and full-map reset without a live map provider.

GitHub Actions runs these on route-code, website or destination updates via `.github/workflows/validate-routing.yml`. Superseded workflow runs are canceled automatically to avoid redundant test jobs.

## Notes
- The map uses MapLibre GL JS with OpenFreeMap vector tiles (Liberty style with colored vegetation and water), preferring English and Romanized place names where available. No account, API key or paid tier is required for OpenFreeMap’s public instance. If the vector map fails, the page attempts a raster OpenStreetMap fallback. Internet access and a modern WebGL-capable browser are required.
- Mapped rail overlays approximate real railway track centerlines from 2024 GIS data. Flights, local transfers, and unmatched train legs remain schematic; no lines represent confirmed service, walking or driving directions.
- The route was organized geographically using typical travel corridors; the website does not calculate live transit times or mathematically optimize travel. Those are future enhancements.
- Public GitHub repositories are public: do not store passport numbers, booking confirmation codes, personal contact details, or private travel documents here.
