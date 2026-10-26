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

Valid statuses: `wishlist`, `planned`, `booked`, `visited`. Day is `null` until scheduled, then an integer from 1 to 14. Use `order` to sequence stops within a day. Omit uncertain coordinates until verified.

## Notes
- The map uses MapLibre GL JS with OpenFreeMap vector tiles (Liberty style (colored vegetation and water)), preferring English and Romanized place names where available. No account, API key or paid tier is required for OpenFreeMap’s public instance. If the vector map fails, the page attempts a raster OpenStreetMap fallback. Internet access and a modern WebGL-capable browser are required.
- Dashed lines indicate itinerary sequence only; **not** rail, walking or driving directions.
- This version does not calculate real transit times or automatically optimize a route. Those are future enhancements.
- Public GitHub repositories are public: do not store passport numbers, booking confirmation codes, personal contact details, or private travel documents here.
