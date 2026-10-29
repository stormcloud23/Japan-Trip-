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

## Destination photo slideshow

The homepage showcases **10 credited photographs** of real, scheduled destinations across Tokyo, Hokkaido, Kyoto, Osaka and Himeji. Every source is a Wikimedia Commons image with its photographer, license and original-file link shown underneath the slideshow. Photos reflect different seasons and years, not necessarily the planned 2027 travel dates.

- `data/photos.json` is the curated photo manifest. Each photo records a stable destination ID, trip day, thumbnail, alt text, caption, creator and source/license links.
- `js/photo-gallery.js` is **independent of the map and route planner**. It fetches the static manifest with normal browser caching and initially loads only the visible thumbnail; after it loads, it may preload the next image (unless Data Saver is enabled).
- Browse with arrows, dots, swipe or keyboard arrow keys while the carousel is focused. Auto-advance runs every 8.5 seconds and pauses when offscreen, hovered, focused or tab-hidden. Reduced-motion preferences start it paused, with a manual Play control.
- **Explore Day N on map** changes to that itinerary day without modifying the trip data. Failed external images display a fallback message without breaking the map.
- To add a photo, add a properly licensed Wikimedia Commons thumbnail and matching `destination_id` in the JSON. Test with `node --test tests/*.test.cjs`.

## Ten additional honeymoon wishlist locations (October 2026)

All ten are preserved as **optional / alternative** destinations in `data/destinations.json`; no existing scheduled stop, hotel night or railway leg was changed. The optional `proposed_day` is a possible future placement, not a confirmed schedule. The website now shows **Possible visit**, **Possible stay**, or **Meal idea** depending on the category, rather than labeling all proposals as dinner.

| Region | New location | Provisional fit / trade-off |
|---|---|---|
| Kyoto | HOSHINOYA Kyoto | Luxury riverside Arashiyama ryokan, 15-minute-ish private boat from riverside reception. Would substitute a central Kyoto hotel night, not add another night |
| Kyoto | Arashiyama Bamboo Grove | Iconic forest path, a possible **alternative Kyoto day**; pairs with HOSHINOYA but is not adjacent to Kifune |
| Kyoto | Fushimi Inari Taisha | Vermilion torii gates and optional mountain hike; could substitute a Kyoto morning |
| Tokyo | teamLab Borderless (Azabudai Hills) | Contemporary immersive art; timed-entry tickets; NOT the old Odaiba location |
| Tokyo | SHIBUYA SKY | Observation deck and sunset time slots; adjacent to Shibuya Scramble and Nintendo TOKYO, but Day 13 is packed |
| Tokyo | Meiji Jingu Shrine | Wooded shrine around Harajuku (Shibuya Ward); daylight-only; closes around sunset |
| Tokyo | Omoide Yokocho | Narrow yakitori and izakaya alley beside Shinjuku Station, pairs with existing Shinjuku nightlife on Day 12 |
| Hakone | Gora Kadan | Luxury onsen ryokan: potential overnight between Kyoto and Tokyo, **not currently in the hotel-night plan** |
| Hakone | Hakone Open-Air Museum | Outdoor sculpture park near Gora; possible dedicated Hakone sightseeing day |
| Hakone | Hakone Ropeway | Sounzan–Owakudani–Ubako–Togendai scenic gondola ride; one pin marks **Owakudani Station**, not the entire line |

Three Hakone pins have a new dedicated **Hakone / Kanagawa** region filter. A full Hakone overnight would require restructuring the already crowded Kyoto→Tokyo Day 12 and replacing an existing hotel night. **Do not automatically route to Hakone** merely because the new pins have proposed days.

New booking-research checklist items cover HOSHINOYA Kyoto, Gora Kadan, teamLab Borderless and SHIBUYA SKY. Prices, reservation windows, operating times and ropeway weather closures are subject to change before autumn 2027. No bookings have been made.

## Tokyo food additions (October 2026)

Three more **optional** Tokyo stops are saved, without changing any scheduled day, hotel night, flight or railway connection:

| Stop | Where | Provisional fit | Important booking / timing |
|---|---|---|---|
| **400℃ PIZZA TOKYO (Kagurazaka)** | 13-1 Wakamiyacho, Shinjuku, `kif annex` 1F | Alternative early meal / lunch around Day 12 (already busy) | Small counter pizza shop; 2026 budget ~¥4,000–5,000 pp. Official TableCheck: booking opens daily at 12:00 JST for **two days ahead**; 70-min seatings from 11:00 through 17:00. Not a late dinner. Not the Shinagawa or Kyoto branches. |
| **Sushi Yuu (鮨 由う)** | 1-14-6 Ginza, Chuo, VORT Ginza briller 8F | Special-occasion Tokyo omakase alternative, tentatively Day 2 | Relocated from Roppongi in Dec 2023. Counter omakase 2026 ~¥27,500 (Hanare) or ¥33,000 (main). Dinner starts 17:30/20:00; reservation-only. **Distinct from Roppongi Sushi Yu / 鮨悠 and Ginza Sushi Yuu / 鮨佑.** |
| **Tsukiji Outer Market** | Tsukiji 4-16-2, Chuo Ward | Day 2 morning/early lunch option if space allows | Seafood, casual sushi, kitchenware and tamagoyaki. Many shops busiest 09:00–13:00 and close in afternoons; individual days vary. The old wholesale market/tuna auctions moved to **Toyosu in 2018**; this pin is for Tsukiji's operating **outer** market. |

The two booking research reminders for 400℃ PIZZA and Ginza Sushi Yuu are deliberately left **unbooked**. Prices, availability and service hours are 2026 references only; reconfirm before the autumn 2027 trip. Maps use precise published street addresses for navigation but restaurant pin coordinates are approximate.

## Tokyo shopping and nightlife wishlist additions (October 2026)

Five more stops are retained as **optional** Tokyo destinations; the number of scheduled attractions, the 14-day itinerary, and the precomputed train geometry do not change.

| New destination | Area | Planning notes |
|---|---|---|
| **BAR CENTIFOLIA** | Azabu-Jūban, Minato City | Tiny theatrical cocktail bar, suggested as a possible Day 2 late evening; reserve table vs. counter deliberately. **Nonrefundable booking fees: ¥10,000 per person for a table or ¥35,000 for counter seating**, *before* cocktails (¥4,000+), tax or other charges. At two guests, fees alone can reach **¥20,000 or ¥70,000**. Official TableCheck shows bookings up to two weeks in advance, closed Wed/Sun. Research reminder added, nothing booked. |
| **Shibuya LOFT** | 21-1 Udagawachō, Shibuya | Seven-floor lifestyle/stationery/gift shop near Shibuya Scramble; good to swap into Day 13 rather than piling onto an already busy day. Confirm opening hours closer to the trip. |
| **Daikanyama T-SITE / Tsutaya Books** | 17-5 Sarugakuchō, Shibuya | Distinctive three-building bookstore for photography, design, literature, music and coffee. 5-minute walk from Daikanyama Station. Further from Shibuya Crossing than LOFT; allow a deliberate detour. |
| **Ginza Itoya (G.Itoya)** | 2-7-15 Ginza, Chūō City | Famous multi-floor stationery flagship for notebooks, paper, fountain pens, art supplies and gifts; close to the other Ginza food stops. |
| **Kappabashi Dougu Street** | 3-18-2 Matsugaya, Taitō City | An approximately 800-meter district of 170+ kitchenware shops for Japanese knives, tableware, baking tools and replica food displays. Close to Sensō-ji, ideal optional Day 2 daytime shopping. |

All five have mapped coordinates, official destination links, realistic time allowances and `route_preference: "alternative"`. The cocktail bar is categorized as nightlife under the food filter and receives a **Nightlife idea** label instead of being called dinner. Retail destinations are selectable under the existing **Shopping / games** filter. No hotel nights or reservations have been changed.

## Using the map and itinerary

- **Choose a day:** Use the day selector above the map, its Previous/Next buttons, or click a day card below the map. The map zooms to the attractions and incoming travel connections for that day. For longer rail legs, it fits the mapped tracks as well as the stops (without zooming out for long flight paths). Choose **All Japan** to reset the view and filters.
- **Share a specific day:** Click **Copy Day N link** to share a URL ending in `#day=N` (for example, `#day=12`). Opening the URL restores that selected day automatically. The URL includes no private travel data; browsers without clipboard access display the link for manual copying.
- **Print / Save PDF:** Click the button above the 14-day itinerary to open your browser's print dialog. Print styles omit the interactive map and include all itinerary cards, proposed overnight bases and the booking checklist. Most browsers can use **Save as PDF** as the print destination.
- **Clustered destinations:** On the whole-trip map, nearby places merge into numbered clusters as you zoom out. Click a cluster to zoom in. A single pin has a day number; in day view, its number is that day's stop order.
- **Color-coded pins:** Sightseeing (coral), nature (green), history (purple), food (gold), shopping (blue), onsen/hotels (lavender), and **sushi (pink with an S)**. Most unscheduled/alternative venues are gray, but sushi deliberately keeps its distinctive pink color even while unscheduled. The category dropdown offers Sushi (all), Omakase sushi and Casual sushi filters.
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

## Sushi dinners: seven recommended options

**Sushi is a favorite food for this honeymoon.** The wishlist currently includes seven *optional* sushi restaurants: four premium omakase counters and three informal sushi restaurants. All seven have `category` containing `sushi`, `dining_style` equal to `omakase` or `casual`, and `route_preference: "alternative"` so automatic routing will not schedule additional dinners or overload existing sightseeing days. Each has a `proposed_day` giving a potential dinner slot, a `price_guide_jpy` planning estimate and a current official/informational URL (and `reservation_url` for omakase when available).

| Style | Restaurant | Region | Possible dinner | Booking / trade-off |
|---|---|---|---|---|
| Premium omakase | Sushi Ginza Onodera Souhonten | Tokyo (Ginza) | Tentatively Day 2 | Dinner from roughly ¥27,500 + 10% service (2026). Day 2 is preferable to already packed Day 12 |
| Premium omakase | Sukiyabashi Jiro (Ginza Main Shop) | Tokyo (Ginza) | Tentatively Day 2 | Official menu from ¥88,000 pp including tax (2026); foreign guests must book through their own hotel concierge. Very limited availability, photo-ID rules and a strict cancellation policy. An alternative to Sushi Ginza Onodera, not a second required dinner |
| Premium omakase | Sushi Gion Matsudaya | Kyoto (Gion) | Day 8 or another Kyoto night | 6-seat Edomae sushi counter, omakase from around ¥41,800 (2026). An alternative to the existing Hikiniku to Kome dinner |
| Premium omakase | Sushizen Honten | Sapporo (Maruyama) | Day 4 | Traditional Hokkaido seafood omakase (from ¥36,000, plus 10% service in 2026), closed Tuesdays/Wednesdays currently |
| Casual / conveyor | Nemuro Hanamaru, JR Tower Stellar Place | Sapporo Station | Day 4 | Excellent Hokkaido seafood, no reservations; queue at the station branch |
| Casual sushi | Sushi no Midori, Shibuya Mark City | Tokyo (Shibuya) | Day 13 | Good-quality nigiri and generous portions; queue system; choose instead of other full-day additions |
| Casual / local counter | Harukoma Sushi Honten | Osaka (Tenma) | Day 10 | Lively narrow counter; can involve a queue and a detour from Osaka Bay / Dotonbori, so treat as a swap |

A new `trip.booking_tasks` entry reminds us to choose which special-occasion omakase dinners to reserve after exact 2027 trip dates are established. **None are booked** and 2026 menu prices, booking rules, closures and maps must be reconfirmed before travel. Sushi pin positions are approximate and should not replace the listed street addresses for navigation.

## Additional Tokyo onigiri and Kyoto mountain cuisine

These are **four newly saved optional wishlist pins** (the seventh sushi restaurant above plus three other Japanese-food experiences). No currently scheduled destination or hotel night has been displaced.

| Experience | Location | Tentative fit | Important note |
|---|---|---|---|
| Miyamasou | Hanase mountains, Kyoto | Day 9 only as a major northern-Kyoto day replacement or an overnight alternative | Historical riverside cooking inn and `tsumikusa` mountain kaiseki; **not sushi**. Access is a significant excursion; Kyoto Bus 32 takes about 1h40 and runs only two round trips per day under current guidance. Restaurant and lodging reservations by phone |
| Sukiyabashi Jiro main shop | Ginza, Tokyo | Day 2, replacing another fancy omakase | Flagship Jiro location, not Roppongi. ¥88,000+ pp official 2026 menu; book **only via the concierge of your own Tokyo hotel** if visiting from overseas, with ID and cancellation requirements |
| Onigiri Bongo | Otsuka, Tokyo | Flexible meal instead of a full Day 13 stop | Generous, fluffy made-to-order rice balls with dozens of fillings, typically a long queue, 2-minute walk from JR Otsuka Station |
| Onigiri Asakusa Yadoroku | Asakusa, Tokyo | Day 2 lunchtime, close to Senso-ji | Traditional counter with freshly made rice balls, lunch sets and rice-based sellout. Cash only, closed Sundays, no evening service Tuesdays/Wednesdays |

Miyamasou's **Japanese-language official website** currently lists three dining prices including tax and service (`¥22,770 / ¥27,830 / ¥33,880` per person), plus overnight rates starting from `¥75,900` pp with dinner and breakfast. Its English website lists only a higher dining option and an overnight package from `¥88,550` pp. These reflect different course and package displays, not a reliable quote for 2027; confirm available options directly. Onigiri Bongo/Yadoroku pins show the **food color**, Sukiyabashi Jiro shows the existing **pink sushi pin**, and Miyamasou shows a food pin in the mountains outside Kyoto.

The booking checklist includes separate research tasks for Jiro's concierge-only system and Miyamasou's meal-versus-overnight decision. All four have `route_preference: "alternative"`, so the auto-route does not add meals or hotel changes automatically.

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

The reservation checklist includes flight planning, potential ryokan nights, Ghibli Museum, Cafe Capyba, Hikiniku to Kome, selecting special-occasion sushi omakase dinners, requesting Sukiyabashi Jiro through a Tokyo hotel concierge, investigating Miyamasou as a mountain dining/overnight experience, and Kyoto–Tokyo Shinkansen tickets. It has **All / High priority / Hotels / Transport / Experiences** filters. Every task is currently in `research` status, not booked. Ticket release rules and 2027 transport schedules must be rechecked nearer travel.

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

## Keeping updates fast

This is a **static GitHub Pages app**, not a hosted backend. The Japanese rail overlay is already pre-simplified into 8 cached railway corridors (around **13 KB** of JSON), with no live route solver.

- New destinations always fetch fresh; the static rail cache now uses normal browser HTTP caching.
- The map maintains stable GeoJSON per selected day and **does not resend identical railway geometry to MapLibre** for simple search/category/status changes.
- Filter changes only update visible destination cards and map pins, not all 14 itinerary cards or workload summaries.
- Assigned vs. optional membership uses a `Set` instead of repeatedly scanning the whole wishlist.
- Browser tests derive destination counts, sushi totals, optional pins and booking counts from current data, so adding an unscheduled restaurant does not require modifying multiple tests.
- For future multi-file changes, **make one atomic commit** rather than separate commits for the destination data, test adjustments, and documentation. This means only one GitHub Actions run and one Pages deployment. The workflow already cancels superseded runs.
- Railway geometry, timetable estimates and bookings remain subject to verification. When rail cache is absent, the app falls back to straight schematic legs.

Run `node --test tests/*.test.cjs` for the full check suite.

## Notes
- The map uses MapLibre GL JS with OpenFreeMap vector tiles (Liberty style with colored vegetation and water), preferring English and Romanized place names where available. No account, API key or paid tier is required for OpenFreeMap’s public instance. If the vector map fails, the page attempts a raster OpenStreetMap fallback. Internet access and a modern WebGL-capable browser are required.
- Mapped rail overlays approximate real railway track centerlines from 2024 GIS data. Flights, local transfers, and unmatched train legs remain schematic; no lines represent confirmed service, walking or driving directions.
- The route was organized geographically using typical travel corridors; the website does not calculate live transit times or mathematically optimize travel. Those are future enhancements.
- Public GitHub repositories are public: do not store passport numbers, booking confirmation codes, personal contact details, or private travel documents here.
