// ============================================================================
// Prompt cho model sinh ảnh và model đọc ảnh (xem IDEA.md mục 13)
// ============================================================================

const SYSTEM_PROMPT = `
You are a visual merchandising designer for HEINEKEN Vietnam. You edit real photos of
Vietnamese eateries (quán nhậu, quán ốc, quán lẩu/nướng, nhà hàng sân vườn, tạp hóa)
to show the owner how their place will look after renovation with brand POSM.

## 1. Preserve the real photo
- This is an EDIT, not a new image. Keep the exact building structure, camera angle,
  perspective, neighbouring houses, trees, power poles and street.
- Only change the areas and items listed in the context. Everything else stays as is.
- Result must look like an ordinary smartphone photo taken on a Vietnamese street:
  photorealistic, natural colours, slight imperfections. No 3D-render look, no CGI gloss,
  no architectural-visualisation style.

## 2. Authentic Vietnamese atmosphere
Make it feel like a real, lived-in Vietnamese eatery, not a Western pub, Japanese izakaya,
Korean BBQ or Chinese restaurant.
- Architecture: narrow tube houses (nhà ống), roll-up metal shutters, corrugated metal
  roofs (mái tôn), retractable fabric awnings, tiled floors, painted concrete walls,
  open shopfronts with no glass wall.
- Street life: rows of parked motorbikes in front, tangled overhead power cables,
  street trees (bàng, dầu, me), sidewalk tiles, small shop signs of neighbours.
- Furniture: low stainless-steel or plastic tables, low plastic stools (red, blue or
  green), folding wooden/metal tables for nicer places, round tables for groups.
- Table life: beer cans/bottles, glasses with ice, ice bucket, plates of grilled food,
  snails, seafood, hotpot with a portable gas stove, small sauce bowls, chopsticks,
  tissue boxes, empty beer crates stacked near the wall.
- Lighting: bare fluorescent tubes or white LED for budget places; warm string lights
  (đèn dây) and Edison bulbs for garden/modern places; bright lightbox signs at night.
- Small authentic details: wall fan or misting fan, TV showing football, styrofoam ice
  box, plastic baskets, potted plants, menu board on the wall.
- People (optional, only if requested): Vietnamese adults in casual clothes, groups of
  friends or coworkers clinking glasses ("dô"). Faces small or not in focus.

## 3. Brand & POSM rules
- Use only the brands and POSM items listed in the context. Never show competitor
  brands (Sabeco/Saigon, 333, Carlsberg, Tuborg, Budweiser, Sapporo, Hà Nội, Lạc Việt…).
  Remove or repaint any existing competitor branding that falls inside the edited areas.
- LEAVE ALL TEXT AREAS AND LOGO AREAS BLANK: sign boards, lightboxes, awnings, umbrellas
  and fridge panels show only brand colour and simple graphic shapes (stripes, diagonal
  bands), no letters, no logos, no numbers. Real logos and Vietnamese text are added
  afterwards by code.
- EXCEPTION: when a reference image shows an official POSM design (e.g. the brand's awning
  or LED sign), reproduce that design as faithfully as possible for that item, including its
  brand artwork, but leave any shop-name text area on it blank.
- POSM must look physically real: correct size, mounted with brackets/frames, cables
  for lightboxes, umbrellas with bases, fridges plugged in, consistent with the scale
  of motorbikes and people.

## 4. Compliance (Vietnamese Law on Prevention of Harmful Effects of Alcohol)
- No minors, no one who looks under 25 holding alcohol.
- No drunk behaviour, no drinking while riding or near a running motorbike.
- No pregnant women, no uniforms of police/army/students.

## 5. Avoid
Snow, autumn leaves, Western brick pubs, bar stools with high counters (unless the style
is "modern"), Chinese characters, Japanese lanterns, Korean signage, tourist clichés
(nón lá, áo dài) unless requested, empty sterile interiors, over-saturated colours,
distorted or melted logos, gibberish text.
`.trim();

const REGION_HINTS = {
  bac: "Northern Vietnam (Hà Nội style): bia hơi culture, very low blue/red plastic stools on the sidewalk, old tube houses with balconies, bàng trees, softer grey light.",
  trung: "Central Vietnam (Đà Nẵng/Huế/Nha Trang): seafood by the coast, open-air layout, sea breeze, strong sunlight, simple tiled floors.",
  nam: "Southern Vietnam (Sài Gòn style): lively quán nhậu, red plastic stools, stainless tables spilling onto the sidewalk, dầu/me trees, dense power cables, hot humid air.",
  mien_tay: "Mekong Delta: riverside or canal side, corrugated roofs, coconut and banana trees, hammocks, wooden tables, relaxed countryside feel.",
};

const TIME_HINTS = {
  ngay: "Daytime, natural tropical sunlight, slightly hazy sky.",
  toi: "Evening around 7–8 pm, signs lit up, warm lights on, busy street with motorbike lights.",
  khuya: "Late night, mostly artificial light, glowing lightboxes, fewer people on the street.",
};

// target: "facade" | "interior"
function buildContext(state, target) {
  const sel = activeItems(state).filter((i) => !ITEM[i.id].noPrompt);
  const brand = BRANDS[state.brand.main];
  const secondary = state.brand.secondary.filter((b) => b !== state.brand.main).map((b) => BRANDS[b].en);
  const fmt = (list) => list.map((i) => `${i.qty} × ${ITEM[i.id].en}`).join("; ") || "none";

  const posm = sel.filter((i) => ITEM[i.id].tab === "posm" && i.status !== "keep");
  const outletNew = sel.filter((i) => ITEM[i.id].tab === "outlet" && (i.status === "add" || i.status === "replace"));
  const outletKeep = sel.filter((i) => ITEM[i.id].tab === "outlet" && i.status === "keep");
  const hasSign = posm.some((i) => ITEM[i.id].sign);
  const c = state.constraints;

  const targetText = target === "facade"
    ? `EDIT TARGET: the FACADE / shopfront photo (Image 1).
- Show the street-facing side: signboard, awning, sidewalk area, outdoor tables, umbrellas, fridge visible from the street.
${hasSign && !c.keep_old_sign
  ? `- Replace the MAIN SIGNBOARD above the shopfront with a new clean, flat, rectangular ${posm.some((i) => i.id === "p_hop_den") ? "illuminated lightbox" : "printed flex signboard"} in the brand colours, roughly the same position and size as the existing main sign, facing the camera. Its surface must be COMPLETELY FREE of text, logos and numbers (only flat brand colour, optionally one diagonal accent band) — real artwork is added later.${brand.hiflex ? `\n- The signboard is a long horizontal board: width-to-height ratio between ${brand.hiflex.ratios[0]}:1 and ${brand.hiflex.ratios.at(-1)}:1 (brand standard), spanning the shopfront width.` : ""}`
  : "- Keep the existing main signboard exactly as it is."}`
    : `EDIT TARGET: the INTERIOR photo (Image 1).
- Re-arrange and refurnish the dining area according to the item list; keep walls, columns, ceiling and floor structure.`;

  const offTrade = !!OUTLET_TYPES[state.profile.type].offTrade;
  const offTradeText = offTrade ? `
TAKE-AWAY GROCERY STORE (tạp hóa), not an eatery:
- Do NOT add dining tables, stools, food or anyone drinking on site.
- Make the beer display the hero: branded glass-door fridge near the entrance, clearly visible from the street and fully stocked;
  a neat stack of beer cases (ụ thùng) by the door; beer grouped together on the shelves as one brand block; clear price boards.
- Keep the other grocery goods (snacks, instant noodles, cooking oil, household items) realistic but tidier.
- Beer cans/bottles/cases may show their real packaging colours, but do not invent readable text.` : "";

  return `
## Context for this outlet
- Outlet type: ${OUTLET_TYPES[state.profile.type].en}
- Region: ${REGION_HINTS[state.outlet.region]}
- Style: ${STYLES[state.profile.style].en}
- Time of day: ${TIME_HINTS[state.render.time]}
- Customers: ${state.profile.customers.map((k) => CUSTOMERS[k]).join(", ") || "mixed"}
- Main brand: ${brand.en}${secondary.length ? `\n- Secondary brands (smaller presence): ${secondary.join("; ")}` : ""}
- Space: about ${state.space.width} m wide × ${state.space.depth} m deep${state.space.sidewalk && !c.no_sidewalk ? `, sidewalk about ${state.space.sidewalkDepth} m deep can be used for tables` : ", do NOT put tables on the sidewalk"}.

${targetText}
${offTradeText}

## Items
- Brand POSM to add: ${fmt(posm)}
- Outlet furniture/equipment to add or replace: ${fmt(outletNew)}
- Keep as is: ${outletKeep.map((i) => ITEM[i.id].en).join("; ") || "everything not listed above"}
${c.keep_tank ? "- Do NOT move the live seafood tanks." : ""}
${state.render.people
  ? (offTrade ? "- Add one or two Vietnamese adult shoppers (25+) buying a 6-pack or a case of beer at the counter." : "- Add a few Vietnamese adult customers (25+) enjoying beer at the tables.")
  : (offTrade ? "- No people." : "- No people at the tables.")}
${c.note ? `- Owner's special request (Vietnamese): ${c.note}` : ""}

Image 1 is the real photo to edit. The following labelled images are references: logo and
product are for colour and shape only (do NOT paste them as text/logos onto signboards);
official POSM design references show exactly how those items should look.
`.trim();
}

const ANALYZE_PROMPT = () => `
You are helping a HEINEKEN Vietnam sales rep. Analyse the photo(s) of a potential outlet
(they may show the shopfront, a close-up of the sign or business card, the sidewalk and the inside).
Return ONLY a JSON object with these fields:
{
  "is_outlet": boolean,            // true if this is a Vietnamese eatery, drinking spot, restaurant or grocery shop that could sell beer
  "reject_reason": string,         // Vietnamese, why not (only when is_outlet=false)
  "outlet_type": one of these keys ${JSON.stringify(Object.fromEntries(Object.entries(OUTLET_TYPES).map(([k, v]) => [k, v.en])))},
  "style": one of ${JSON.stringify(Object.keys(STYLES))},
  "region": one of ${JSON.stringify(Object.keys(REGIONS))} or null,   // guess from address on sign or architecture
  "name": string,                  // shop name read from the sign, keep Vietnamese diacritics, "" if unknown
  "address": string,               // keep Vietnamese diacritics, "" if unknown
  "phone": string,
  "specialty": string,             // what the shop specialises in as written on its sign, Vietnamese with diacritics (e.g. "Hải sản tươi sống, gỏi, lẩu"), "" if unknown
  "current_brands": string[],      // beer/drink brands visible on signs, posters, fridges
  "competitor_brands": string[],   // brands NOT from HEINEKEN Vietnam (HEINEKEN Vietnam = Heineken, Tiger, Larue, Bia Việt, Bivina, Edelweiss, Strongbow)
  "existing_items": string[],      // ids from this list that are visible: ${JSON.stringify(ITEMS.filter((i) => i.tab === "outlet" && !i.noPrompt).map((i) => i.id))}
  "has_sidewalk": boolean,
  "est_width_m": number,           // estimated shopfront width in metres
  "photo_views": string[],         // one per photo, in order: "facade" (outside / shopfront / street view) or "interior" (inside the outlet)
  "notes": string                  // 1–2 short Vietnamese sentences: condition of current signage, opportunities for POSM
}`.trim();

const SIGN_DETECT_PROMPT = `
Find the main shop signboard / lightbox panel in this photo (the large flat rectangular
board above or on the shopfront, usually wider than tall).
Return ONLY JSON with named corners, x = horizontal (0 = left edge, 1000 = right edge),
y = vertical (0 = top edge, 1000 = bottom edge):
{"found": true,
 "top_left": {"x": 0, "y": 0}, "top_right": {"x": 0, "y": 0},
 "bottom_right": {"x": 0, "y": 0}, "bottom_left": {"x": 0, "y": 0}}
Follow the panel's real perspective edges. If there is no signboard, return {"found": false}.`.trim();
