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

**Tokyo → fly Haneda–Asahikawa → Asahidake → Biei → Jozankei → Noboribetsu → fly New Chitose–Osaka Itami → Kyoto → Shinkansen to Tokyo.** Two domestic flights are only suggestions: confirm 2027 schedules and availability later.

`trip.days` describes each of the 14 provisional day cards, including travel-only days. `trip.route` supplies an ordered sequence of geographic hubs and airports; the map draws schematic segments in distinct colors for `transport_to_next`: `ground`, `flight`, or `rail`. These segments do **not** reflect real road geometry, station connections, ticket availability, or real-time travel times. Route lines remain visible when filtering the destination wishlist.

**Optional rather than scheduled:** Minakami's Takaragawa Onsen, Lake Toya, Niseko's Zaborin, and alternate Jozankei/Noboribetsu ryokan properties. All remain selectable pins; they are not removed. Modifying the route means updating both `trip.route` and the affected destination `day`/`order` and `trip.days` entries.

## Notes
- The map uses MapLibre GL JS with OpenFreeMap vector tiles (Liberty style with colored vegetation and water), preferring English and Romanized place names where available. No account, API key or paid tier is required for OpenFreeMap’s public instance. If the vector map fails, the page attempts a raster OpenStreetMap fallback. Internet access and a modern WebGL-capable browser are required.
- Colored route lines are schematic connections, **not** real flight paths, train alignments, walking or driving directions.
- The route was organized geographically using typical travel corridors; the website does not calculate live transit times or mathematically optimize travel. Those are future enhancements.
- Public GitHub repositories are public: do not store passport numbers, booking confirmation codes, personal contact details, or private travel documents here.
