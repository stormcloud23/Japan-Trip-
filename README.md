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

## Provisional route (autumn 2027)

**Tokyo → flight to Asahikawa → Asahidake → Biei → limited-express train toward Sapporo → Jozankei → train to Noboribetsu → train to New Chitose Airport → flight to Osaka → Kyoto home base with Osaka/Himeji train day trips → Tokaido Shinkansen to Tokyo.**

The two domestic flights are provisional exceptions to the rail-first preference. In 2027 the Hokkaido Shinkansen ends at Shin-Hakodate-Hokuto (not Sapporo or Asahikawa); routing entirely by train would add long connecting-rail days that currently do not fit the 14-day trip. Confirm 2027 timetables and tickets nearer the trip.

### Automatic travel routing

The **source of truth** is `data/destinations.json`. Every website load runs the pure, testable `js/route-planner.js` engine:

1. Reads proposed `day` and `order` for attractions, plus `trip.travel_anchors` (airport/station waypoints and their arrival transport mode).
2. Merges those in chronological order and **automatically redraws** all connected legs. Adding or moving a day-assigned attraction requires **no manual edits to route coordinates**.
3. For a newly added item with `day: null`, attempts a **tentative suggested day** near already scheduled places, subject to proximity, a time budget and protected travel days. The engine inserts a suggested stop at the within-day position with the least additional geographic detour, preserving the order of existing stops. Suggested placements appear as *Suggested* in the page but are **not stored as confirmed assignments**. Itineraries for distant or oversized additions need a human decision.
4. `route_preference: "alternative"` (or `"unplanned"`) prevents auto-scheduling optional resorts, replacement attractions and wishlist-only locations. Existing alternatives have this flag.
5. For intercity routes, rail is preferred on supported corridors: `shinkansen` for Kyoto–Tokyo and Kyoto–Himeji; `rail` for Kyoto–Osaka and suitable Hokkaido train connections. An anchor's optional `arrival_mode` overrides this inference (e.g. `flight` at Asahikawa/Osaka airports). Unknown very-long-distance transfers are tagged `review`, rather than invented as an air or rail service.

The webpage displays five route styles: **magenta with dark outline for flights**, green for Shinkansen, teal for other trains, amber for local transfers and gray for transfers needing review. Lines are straight schematic links **not** real road geometry, train alignments, flight tracks or bookable services.

`trip.days` holds 14 day descriptions; update it when significantly reshuffling the itinerary. `trip.travel_anchors` is for durable major station/airport transitions and itinerary start/return hubs. These anchors **do not** need edits for a newly scheduled attraction in an existing area. A new destination that fundamentally changes regions, trip days or transportation must be reconsidered manually.

**Unscheduled alternatives** presently include Minakami's Takaragawa Onsen, Lake Toya, Niseko's Zaborin, other Hokkaido ryokan choices, Osaka Aquarium Kaiyukan and Hikone Castle.

### Route regression tests

Run `node --test tests/route-planner.test.cjs` with Node.js 22 or later. Tests cover the current 14-day data, flights and train segments, optional destinations, added unscheduled Kyoto sights and new planned Osaka stops.

GitHub Actions runs these on route-code, website or destination updates via `.github/workflows/validate-routing.yml`. Superseded workflow runs are canceled automatically to avoid redundant test jobs.

## Notes
- The map uses MapLibre GL JS with OpenFreeMap vector tiles (Liberty style with colored vegetation and water), preferring English and Romanized place names where available. No account, API key or paid tier is required for OpenFreeMap’s public instance. If the vector map fails, the page attempts a raster OpenStreetMap fallback. Internet access and a modern WebGL-capable browser are required.
- Colored route lines are schematic connections, **not** real flight paths, train alignments, walking or driving directions.
- The route was organized geographically using typical travel corridors; the website does not calculate live transit times or mathematically optimize travel. Those are future enhancements.
- Public GitHub repositories are public: do not store passport numbers, booking confirmation codes, personal contact details, or private travel documents here.
