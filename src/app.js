"use strict";
// ============================================================================
// HVN Concept Generator — demo chạy thuần HTML + JS (xem IDEA.md mục 12)
// ============================================================================

const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Model chỉ trả ảnh (không có text) phải gửi modalities: ["image"]
const IMAGE_MODELS = [
  ["bytedance-seed/seedream-5-0-flash", "Seedream 5.0 Flash — ~$0.018/ảnh, ~15 giây (mặc định)"],
  ["bytedance-seed/seedream-5-0-pro", "Seedream 5.0 Pro — chất lượng cao hơn"],
  ["google/gemini-3.1-flash-image", "Gemini 3.1 Flash Image — ~$0.07/ảnh"],
  ["google/gemini-3-pro-image", "Gemini 3 Pro Image — chất lượng cao, đắt hơn"],
  ["openai/gpt-5.4-image-2", "GPT-5.4 Image 2"],
  ["openai/gpt-5-image-mini", "GPT-5 Image Mini — rẻ"],
  ["google/gemini-2.5-flash-image", "Gemini 2.5 Flash Image"],
];
const VISION_MODELS = [
  ["google/gemini-3.5-flash", "Gemini 3.5 Flash (mặc định)"],
  ["google/gemini-3.1-flash-lite", "Gemini 3.1 Flash Lite — rẻ"],
  ["google/gemini-3.1-pro-preview", "Gemini 3.1 Pro — chính xác hơn"],
];

const STEPS = [
  [1, "Ảnh & thông tin"], [2, "Mặt bằng"], [3, "Phong cách"], [4, "Brand & gói"],
  [5, "Chọn item"], [6, "Yêu cầu"], [7, "Kết quả"],
];
const QUICK_STEPS = [1, 3, 4, 7];
const CHIP_SOURCES = { OUTLET_TYPES, CUSTOMERS, PEAKS, RENDER_TIMES };
const WARNING_TEXT = "NGƯỜI DƯỚI 18 TUỔI KHÔNG ĐƯỢC UỐNG RƯỢU, BIA";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  mode: "detail",
  step: 1,
  itemTab: "outlet",
  photos: [], // { id, url, view: "facade" | "interior", gen: bool }
  analysis: null,
  outlet: { name: "", address: "", phone: "", region: "nam", rep: "" },
  space: { width: 6, depth: 14, floors: 1, sidewalk: true, sidewalkDepth: 3, backDoor: true, roof: "mai_hien" },
  profile: { type: "nhau_binh_dan", style: "binh_dan", customers: ["van_phong", "cong_nhan"], peak: ["toi"] },
  render: { time: "toi", people: true, variants: 1 },
  brand: { main: "tiger", secondary: [], tier: "bac", volume: 120 },
  items: {},
  constraints: { keep_tank: false, keep_old_sign: false, no_sidewalk: false, note: "" },
  sign: { tagline: "QUÁN NHẬU", specialty: "", layout: "left", showAddress: true, showPhone: true },
  plan: null,
  results: [],
  cost: 0,
};

const SETTINGS_VERSION = 2; // tăng khi đổi model mặc định để bỏ lựa chọn cũ đã lưu
const settings = { v: SETTINGS_VERSION, imageModel: IMAGE_MODELS[0][0], visionModel: VISION_MODELS[0][0] };
try {
  const saved = JSON.parse(localStorage.getItem("hvn_settings") || "{}");
  if (saved.v === SETTINGS_VERSION) Object.assign(settings, saved);
} catch {}
const saveSettings = () => { try { localStorage.setItem("hvn_settings", JSON.stringify(settings)); } catch {} };

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
const setPath = (o, p, v) => { const ks = p.split("."); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const shortLabel = (s) => s.split(/\s[(/]|\s–\s|\s\+\s/)[0].trim();
const slug = (s) => (s || "quan").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

let toastTimer;
function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("on"), ms);
}

function loadImg(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("Không đọc được ảnh"));
    im.src = src;
  });
}

function fileToDataURL(file, max = 1536) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(fr.error);
    fr.onload = async () => {
      try {
        const im = await loadImg(fr.result);
        const s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(im.naturalWidth * s);
        c.height = Math.round(im.naturalHeight * s);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.9));
      } catch (e) { rej(e); }
    };
    fr.readAsDataURL(file);
  });
}

// Lấy object JSON đầu tiên (model đôi khi trả kèm chữ hoặc JSON thừa phía sau)
function parseJSON(text) {
  const s = String(text || "");
  const start = s.indexOf("{");
  if (start < 0) throw new Error("AI không trả về JSON hợp lệ");
  let depth = 0, inStr = false, escNext = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (escNext) escNext = false;
      else if (c === "\\") escNext = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(s.slice(start, i + 1));
  }
  throw new Error("AI trả về JSON bị cắt ngang");
}

let fontsPromise;
function fontsReady() {
  fontsPromise ||= Promise.all([
    document.fonts.load('800 40px "Be Vietnam Pro"', "ẤỨ"),
    document.fonts.load('700 40px "Be Vietnam Pro"', "ẤỨ"),
    document.fonts.load('500 40px "Be Vietnam Pro"', "ẤỨ"),
    document.fonts.load('700 40px "Barlow Condensed"', "ẤỨ"),
    document.fonts.load('600 40px "Barlow Condensed"', "ẤỨ"),
  ]).catch(() => {});
  return fontsPromise;
}
const FONT = '"Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
const FONT_CONDENSED = '"Barlow Condensed", "Arial Narrow", "Be Vietnam Pro", sans-serif';

// ---------------------------------------------------------------------------
// OpenRouter
// ---------------------------------------------------------------------------
// Ảnh được tick "Tạo thiết kế" (không tick ảnh nào thì dùng ảnh đầu tiên)
const genPhotos = () => { const g = state.photos.filter((p) => p.gen); return g.length ? g : state.photos.slice(0, 1); };
const VIEW_LABEL = { facade: "Mặt tiền", interior: "Bên trong" };

const imageModalities = (model) => (/^(google\/gemini|openai\/gpt-5)/.test(model) ? ["image", "text"] : ["image"]);

function hasKey() { return typeof OPENROUTER_API_KEY !== "undefined" && !!OPENROUTER_API_KEY; }

async function callOR(body) {
  if (!hasKey()) throw new Error("Thiếu key OpenRouter (điền key vào .env rồi chạy: node src/build-assets.mjs)");
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + OPENROUTER_API_KEY, "Content-Type": "application/json", "X-Title": "HVN Concept Generator (demo)" },
    body: JSON.stringify(body),
  });
  let j;
  try { j = await r.json(); } catch { throw new Error("Lỗi mạng / phản hồi không hợp lệ (HTTP " + r.status + ")"); }
  if (!r.ok || j.error) throw new Error(j.error?.message || "HTTP " + r.status);
  const msg = j.choices?.[0]?.message;
  if (!msg) throw new Error("Model không trả về kết quả");
  const cost = j.usage?.cost || 0;
  state.cost += cost;
  $("#costPill").textContent = "$" + state.cost.toFixed(3);
  return { msg, cost };
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------
function activeItems(st = state) {
  return Object.entries(st.items)
    .filter(([, v]) => v.qty > 0 && v.status !== "remove")
    .map(([id, v]) => ({ id, ...v }));
}

const isOffTrade = () => !!OUTLET_TYPES[state.profile.type]?.offTrade;
const isRequired = (it) => it.required === true || (it.required === "on" && !isOffTrade());

function applyOutletDefaults(type, detected = []) {
  const d = { ...OUTLET_DEFAULTS._common, ...(OUTLET_TYPES[type]?.offTrade ? {} : OUTLET_DEFAULTS._onTrade) };
  for (const [k, v] of Object.entries(OUTLET_DEFAULTS[type] || {})) d[k] = Math.max(d[k] || 0, v);
  for (const it of ITEMS.filter((i) => i.tab === "outlet")) {
    let qty = d[it.id] || 0;
    const seen = detected.includes(it.id);
    if (seen && qty === 0) qty = 1;
    if (isRequired(it) && qty === 0) qty = 1;
    state.items[it.id] = { qty, status: seen ? "keep" : "add" };
  }
  state.plan = null;
}

function applyTier(tier) {
  const pkg = {};
  const packages = isOffTrade() ? OFFTRADE_PACKAGES : TIER_PACKAGES;
  for (const t of TIER_ORDER.slice(0, tierIndex(tier) + 1)) Object.assign(pkg, packages[t]);
  for (const it of ITEMS.filter((i) => i.tab === "posm")) {
    const prev = state.items[it.id];
    const qty = tierIndex(it.tier) <= tierIndex(tier) ? pkg[it.id] || 0 : 0;
    state.items[it.id] = { qty, status: prev?.status === "keep" && qty ? "keep" : "add" };
  }
  state.plan = null;
}

function calc() {
  const act = activeItems();
  let seats = 0, posmCost = 0, cans = 0;
  for (const a of act) {
    const it = ITEM[a.id];
    if (it.seats) seats += it.seats * a.qty;
    if (it.cans) cans += it.cans * a.qty;
    if (it.tab === "posm" && a.status !== "keep") posmCost += (it.price || 0) * a.qty;
  }
  const tier = TIERS[state.brand.tier];
  // Ước tính minh hoạ: lấp đầy 60%, 1,3 lượt khách/tối, 3 lon/người, 24 lon/thùng, 26 ngày/tháng
  // Tạp hóa (minh hoạ): tủ HVN quay vòng 6 lần/tháng + mỗi kệ 5 thùng + mỗi ụ 20 thùng
  const qty = (id) => act.find((a) => a.id === id)?.qty || 0;
  const estVolume = isOffTrade()
    ? Math.round(cans * 6 / 24 + qty("ke_hang") * 5 + qty("u_thung") * 20)
    : Math.round((seats * 0.6 * 1.3 * 3 / 24) * 26);
  return { seats, cans, posmCost, limit: tier.limit, estVolume, minVolume: tier.minVolume };
}

const hasSignPosm = () => activeItems().some((a) => ITEM[a.id].sign && a.status !== "keep");

// ---------------------------------------------------------------------------
// Floor plan: tự xếp + kiểm tra quy tắc (IDEA.md mục 10.3)
// ---------------------------------------------------------------------------
let uidSeq = 1;
const overlap = (a, b, m = 0) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.d + m && b.y < a.y + a.d + m;

function planGeometry() {
  const W = Math.max(2, +state.space.width || 6);
  const D = Math.max(3, +state.space.depth || 12);
  const useSide = !!state.space.sidewalk && !state.constraints.no_sidewalk;
  const S = useSide ? Math.max(0, +state.space.sidewalkDepth || 0) : 0;
  const aisle = W >= 4.5 ? { x: W / 2 - 0.5, y: 0, w: 1, d: D } : null;
  return { W, D, S, aisle };
}

function autoLayout() {
  const { W, D, S, aisle } = planGeometry();
  const placed = [];
  const unplaced = {};
  const act = activeItems();
  const qty = (id) => act.find((a) => a.id === id)?.qty || 0;
  const miss = (id, n = 1) => { unplaced[id] = (unplaced[id] || 0) + n; };

  const blocked = (r) =>
    placed.some((p) => p.kind !== "umbrella" && overlap(r, p, 0.08)) ||
    (aisle && r.area === "in" && overlap(r, aisle));

  function find(w, d, area, { y0, y1, fromRight = false, fromBack = false } = {}) {
    const lo = area === "in" ? y0 ?? 0 : -S;
    const hi = (area === "in" ? y1 ?? D : 0) - d;
    if (hi < lo - 1e-6 || w > W) return null;
    const ys = [], xs = [];
    for (let y = lo; y <= hi + 1e-6; y += 0.1) ys.push(+y.toFixed(2));
    for (let x = 0; x <= W - w + 1e-6; x += 0.1) xs.push(+x.toFixed(2));
    if (fromBack) ys.reverse();
    if (fromRight) xs.reverse();
    for (const y of ys) for (const x of xs) {
      const r = { x, y, w, d, area };
      if (!blocked(r)) return r;
    }
    return null;
  }
  const put = (it, r, extra = {}) => placed.push({ uid: "u" + uidSeq++, id: it.id, label: shortLabel(it.label), kind: it.kind, tab: it.tab, round: !!it.round, seats: it.seats || 0, ...r, ...extra });

  // 1. Bếp (gộp thành 1 khối) ở cuối nhà
  const kitchen = act.filter((a) => ITEM[a.id].kind === "kitchen");
  if (kitchen.length) {
    const kw = Math.min(W, Math.max(2.4, W * 0.6)), kd = Math.min(2.6, D * 0.25);
    placed.push({ uid: "u" + uidSeq++, id: "zone_kitchen", label: "Bếp", sub: kitchen.map((k) => shortLabel(ITEM[k.id].label)).join(", "), kind: "kitchen", tab: "outlet", x: W - kw, y: D - kd, w: kw, d: kd, area: "in" });
  }
  // 2. WC + khu két ở cuối nhà
  for (const id of ["wc", "khu_ket", "kho"]) {
    const it = ITEM[id];
    for (let n = 0; n < qty(id); n++) {
      const r = find(it.w, it.d, "in", { fromBack: true, y0: D * 0.5 });
      r ? put(it, r) : miss(id);
    }
  }
  // 3. Mặt tiền: quầy, tủ mát, thùng đá, bàn thờ, trưng bày, standee
  const frontOrder = ["quay_thu_ngan", "p_tu_mat_2", "p_tu_mat_1", "tu_mat_khac", "u_thung", "p_thung_da", "ban_tho", "be_hai_san", "tu_kinh", "lo_quay", "p_ke", "p_standee"];
  for (const id of frontOrder) {
    const it = ITEM[id];
    for (let n = 0; n < qty(id); n++) {
      const right = ["be_hai_san", "tu_kinh", "lo_quay", "p_standee", "u_thung"].includes(id);
      const r = find(it.w, it.d, "in", { y1: Math.min(D, 4.5), fromRight: right }) || find(it.w, it.d, "in", { fromRight: right });
      r ? put(it, r) : miss(id);
    }
  }
  // 4. Đồ sát tường (xoay dọc theo tường)
  // Kệ hàng: xếp dọc theo tường trái và phải, xen kẽ hai bên
  {
    const it = ITEM.ke_hang, len = it.w, thick = it.d;
    const slots = [];
    for (let y = 1.2; y + len <= D - 0.2; y += len + 0.3) slots.push({ x: 0, y }, { x: W - thick, y });
    for (let n = 0; n < qty("ke_hang"); n++) {
      const spot = slots.map((p) => ({ ...p, w: thick, d: len, area: "in" })).find((r) => !blocked(r))
        || find(thick, len, "in", { y0: 1 });
      spot ? put(it, spot) : miss("ke_hang");
    }
  }
  for (const [id, fromRight, y0] of [["tv", true, D * 0.3], ["p_backdrop", true, D * 0.45]]) {
    const it = ITEM[id];
    for (let n = 0; n < qty(id); n++) {
      const r = find(it.d, it.w, "in", { fromRight, y0 }) || find(it.d, it.w, "in", { fromRight });
      r ? put(it, r) : miss(id);
    }
  }
  // 5. Sân khấu
  for (let n = 0; n < qty("san_khau"); n++) {
    const it = ITEM.san_khau;
    const r = find(it.w, it.d, "in", { fromBack: true, y0: D * 0.35 });
    r ? put(it, r) : miss("san_khau");
  }
  // 6. Chỗ để xe máy trên vỉa hè
  if (qty("cho_de_xe") && S >= 1.2) {
    const w = Math.min(2.4, W * 0.35);
    put(ITEM.cho_de_xe, { x: W - w, y: -S, w, d: S, area: "side" });
  }
  // 7. Bàn: bàn POSM ưu tiên vỉa hè, bàn của quán ưu tiên trong nhà
  const tables = [];
  for (const a of act) if (ITEM[a.id].kind === "table") for (let n = 0; n < a.qty; n++) tables.push(ITEM[a.id]);
  tables.sort((a, b) => b.w * b.d - a.w * a.d);
  for (const it of tables) {
    const side = it.zone === "sidewalk";
    let r = side ? find(it.w, it.d, "side") : null;
    r ||= find(it.w, it.d, "in", { y0: 0.9 });
    if (!r && !side) r = find(it.w, it.d, "side");
    r ? put(it, r) : miss(it.id);
  }
  // 8. Dù: che các bàn ngoài vỉa hè
  let du = qty("p_du");
  const sideTables = placed.filter((p) => p.kind === "table" && p.area === "side");
  for (const t of sideTables) {
    if (!du) break;
    const cx = t.x + t.w / 2, cy = t.y + t.d / 2;
    put(ITEM.p_du, { x: cx - 1.25, y: cy - 1.25, w: 2.5, d: 2.5, area: "side" });
    du--;
  }
  if (du > 0) {
    if (S > 0) for (let n = 0; n < du; n++) put(ITEM.p_du, { x: clamp(0.3 + n * 2.7, 0, Math.max(0, W - 2.5)), y: -S / 2 - 1.25, w: 2.5, d: 2.5, area: "side" });
    else miss("p_du", du);
  }
  return { placed, unplaced, W, D, S, aisle };
}

function ensurePlan() {
  const g = planGeometry();
  if (!state.plan || state.plan.W !== g.W || state.plan.D !== g.D || state.plan.S !== g.S) state.plan = autoLayout();
  return state.plan;
}

function checkRules(plan) {
  const { placed, unplaced, W, D, S, aisle } = plan;
  const w = [];
  for (const [id, n] of Object.entries(unplaced)) w.push(`Không đủ chỗ cho ${n} × ${shortLabel(ITEM[id].label)}`);
  const solid = placed.filter((p) => p.kind !== "umbrella");
  for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
    if (overlap(solid[i], solid[j], -0.02)) w.push(`${solid[i].label} chồng lên ${solid[j].label}`);
  }
  for (const p of solid) {
    const inside = p.x >= -0.05 && p.x + p.w <= W + 0.05 && p.y + p.d <= D + 0.05 && p.y >= -S - 0.05;
    if (!inside) w.push(`${p.label} nằm ngoài mặt bằng`);
    if (p.kind === "counter" && p.y > 3) w.push("Quầy thu ngân nên đặt gần cửa ra vào");
    if (p.kind === "fridge" && p.y > 4) w.push("Tủ mát nên đặt gần mặt tiền để khách đi đường nhìn thấy");
    if (p.kind === "kitchen" && p.y + p.d / 2 < D / 2) w.push("Bếp nên ở phía sau, tách khỏi khu khách");
    if (p.kind === "wc" && p.y < 3 && p.y >= 0) w.push("Nhà vệ sinh không nên sát cửa chính");
    if (aisle && p.kind === "table" && p.y >= 0 && overlap(p, aisle, -0.05)) w.push(`${p.label} lấn lối đi chính (1 m)`);
  }
  const tableArea = solid.filter((p) => p.kind === "table" && p.y >= 0).reduce((s, p) => s + p.w * p.d, 0);
  if (tableArea / (W * D) > 0.55) w.push("Mật độ bàn trong nhà cao, lối đi có thể dưới 1 m");
  if (state.items.bep_than?.qty > 0 && state.items.bep_than.status !== "remove" && !(state.items.hut_khoi?.qty > 0)) w.push("Có bếp nướng than nhưng chưa có máy hút khói");
  return [...new Set(w)];
}

function planSVG(editable) {
  const plan = ensurePlan();
  const { placed, W, D, S, aisle } = plan;
  const b = BRANDS[state.brand.main];
  const minX = -0.8, maxX = W + 0.8, minY = -S - 1.6, maxY = D + 0.9;
  const U = Math.min(38, 640 / (maxY - minY));
  const ns = "http://www.w3.org/2000/svg";
  const parts = [];
  parts.push(`<defs><pattern id="hatch" width="0.4" height="0.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="0.4" height="0.4" fill="#F1EFE9"/><line x1="0" y1="0" x2="0" y2="0.4" stroke="#E2DED4" stroke-width="0.12"/></pattern></defs>`);
  parts.push(`<rect x="${minX}" y="${minY}" width="${maxX - minX}" height="${1.4}" fill="#D9DCDF"/><text x="${W / 2}" y="${minY + 0.85}" font-size="0.36" text-anchor="middle" fill="#6B7280" font-weight="700" letter-spacing="0.2">ĐƯỜNG</text>`);
  if (S > 0) parts.push(`<rect x="0" y="${-S}" width="${W}" height="${S}" fill="url(#hatch)"/><text x="0.15" y="${-S + 0.4}" font-size="0.26" fill="#9CA3AF" font-weight="700">VỈA HÈ ${S} m</text>`);
  parts.push(`<rect x="0" y="0" width="${W}" height="${D}" fill="#FCFCFA" stroke="#374151" stroke-width="0.12"/>`);
  parts.push(`<line x1="${W / 2 - 0.9}" y1="0" x2="${W / 2 + 0.9}" y2="0" stroke="#FCFCFA" stroke-width="0.16"/><text x="${W / 2}" y="0.42" font-size="0.24" text-anchor="middle" fill="#9CA3AF" font-weight="700">CỬA</text>`);
  if (state.space.backDoor) parts.push(`<line x1="0.2" y1="${D}" x2="1.2" y2="${D}" stroke="#FCFCFA" stroke-width="0.16"/>`);
  if (aisle) parts.push(`<rect x="${aisle.x}" y="0.6" width="${aisle.w}" height="${D - 0.6}" fill="none" stroke="#C7CBD1" stroke-width="0.03" stroke-dasharray="0.15 0.12"/>`);
  parts.push(`<text x="${W / 2}" y="${D + 0.6}" font-size="0.3" text-anchor="middle" fill="#6B7280">${W} m</text><text x="-0.35" y="${D / 2}" font-size="0.3" text-anchor="middle" fill="#6B7280" transform="rotate(-90 -0.35 ${D / 2})">${D} m</text>`);

  const fills = { table: "#F4E3C3", kitchen: "#E9D7D2", storage: "#E9D7D2", wc: "#D8E6EE", counter: "#E7E3F3", display: "#E7E3F3", altar: "#F6D7A7", tv: "#374151", stage: "#E7E3F3", parking: "#E5E7EB" };
  const sorted = [...placed].sort((a, z) => (a.kind === "umbrella") - (z.kind === "umbrella"));
  for (const p of sorted) {
    const posm = p.tab === "posm";
    const cx = p.w / 2, cy = p.d / 2;
    let shape = "";
    if (p.kind === "umbrella") {
      shape = `<circle cx="${cx}" cy="${cy}" r="${p.w / 2}" fill="${b.color}" fill-opacity="0.13" stroke="${b.color}" stroke-width="0.04" stroke-dasharray="0.18 0.1"/>`;
    } else if (p.kind === "table") {
      const f = posm ? b.color : fills.table;
      shape = `<rect width="${p.w}" height="${p.d}" rx="0.12" fill="${f}" fill-opacity="${posm ? 0.18 : 0.45}" stroke="${posm ? b.color : "#D6B98A"}" stroke-width="0.03" stroke-dasharray="0.1 0.08"/>` +
        (p.round ? `<circle cx="${cx}" cy="${cy}" r="${Math.min(p.w, p.d) * 0.28}" fill="${posm ? b.color : "#E2C28E"}"/>`
                 : `<rect x="${p.w * 0.25}" y="${p.d * 0.25}" width="${p.w * 0.5}" height="${p.d * 0.5}" rx="0.06" fill="${posm ? b.color : "#E2C28E"}"/>`);
    } else {
      const f = posm ? b.color : fills[p.kind] || "#E5E7EB";
      shape = `<rect width="${p.w}" height="${p.d}" rx="0.08" fill="${f}" stroke="rgba(0,0,0,.25)" stroke-width="0.025"/>`;
    }
    const vertical = p.d > p.w * 2.2 && p.w < 0.6;
    const label = p.kind === "table" ? `${p.seats}` : p.label;
    const span = (vertical ? p.d : p.w) * 0.92;
    const fs = Math.min(Math.max(0.16, Math.min(0.26, Math.min(p.w, p.d) * 0.22 + 0.08)), span / (label.length * 0.56));
    const textColor = posm && p.kind !== "umbrella" && p.kind !== "table" ? "#fff" : p.kind === "tv" ? "#fff" : "#1F2937";
    const ty = p.kind === "umbrella" ? 0.32 : cy + fs * 0.35;
    const text = vertical
      ? `<text x="${cx}" y="${cy}" font-size="${fs * 0.85}" text-anchor="middle" fill="${textColor}" font-weight="600" transform="rotate(-90 ${cx} ${cy})" dy="${fs * 0.3}">${esc(label)}</text>`
      : `<text x="${cx}" y="${ty}" font-size="${fs}" text-anchor="middle" fill="${textColor}" font-weight="600">${esc(label)}</text>`;
    const sub = p.sub ? `<text x="${cx}" y="${cy + fs * 1.3}" font-size="0.17" text-anchor="middle" fill="#6B7280">${esc(p.sub.length > 48 ? p.sub.slice(0, 46) + "…" : p.sub)}</text>` : "";
    parts.push(`<g class="it" data-uid="${p.uid}" transform="translate(${p.x} ${p.y})"><title>${esc(p.label)}</title>${shape}${text}${sub}</g>`);
  }
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);
  svg.setAttribute("width", Math.round((maxX - minX) * U));
  svg.setAttribute("height", Math.round((maxY - minY) * U));
  svg.setAttribute("font-family", FONT);
  svg.innerHTML = parts.join("");
  if (editable) enablePlanDrag(svg, plan);
  return svg;
}

function enablePlanDrag(svg, plan) {
  let drag = null;
  const pt = (e) => {
    const p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  };
  svg.addEventListener("pointerdown", (e) => {
    const g = e.target.closest(".it");
    if (!g) return;
    const item = plan.placed.find((p) => p.uid === g.dataset.uid);
    const m = pt(e);
    drag = { g, item, dx: m.x - item.x, dy: m.y - item.y };
    g.setPointerCapture(e.pointerId);
    g.parentNode.appendChild(g);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const m = pt(e);
    drag.item.x = Math.round((m.x - drag.dx) * 20) / 20;
    drag.item.y = Math.round((m.y - drag.dy) * 20) / 20;
    drag.item.area = drag.item.y < 0 ? "side" : "in";
    drag.g.setAttribute("transform", `translate(${drag.item.x} ${drag.item.y})`);
  });
  const end = () => { if (drag) { drag = null; renderPlanWarnings(); updateSummary(); } };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
}

function renderPlan() {
  const box = $("#planBox");
  box.innerHTML = "";
  box.appendChild(planSVG(true));
  $("#lgPosm").style.background = BRANDS[state.brand.main].color;
  renderPlanWarnings();
}

function renderPlanWarnings() {
  const w = checkRules(ensurePlan());
  $("#planWarns").innerHTML = w.length ? w.map((x) => `<li>⚠️ ${esc(x)}</li>`).join("") : `<li class="ok">✓ Bố trí hợp lý theo các quy tắc cơ bản</li>`;
}

// ---------------------------------------------------------------------------
// Logo + bảng hiệu (dán bằng code — IDEA.md mục 4)
// ---------------------------------------------------------------------------
// Cắt phần nền thừa quanh ảnh (nền trong suốt hoặc nền một màu)
async function trimImage(src, maxSide = 1200) {
  const im = await loadImg(src);
  const s = Math.min(1, maxSide / Math.max(im.naturalWidth, im.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(im.naturalWidth * s);
  c.height = Math.round(im.naturalHeight * s);
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(im, 0, 0, c.width, c.height);
  const { data, width: w, height: h } = g.getImageData(0, 0, c.width, c.height);
  const bg = [data[0], data[1], data[2], data[3]];
  const transparent = bg[3] < 20;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const fg = transparent ? data[i + 3] > 25
      : Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 60;
    if (fg) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 <= x0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.03);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const t = document.createElement("canvas");
  t.width = x1 - x0 + 1; t.height = y1 - y0 + 1;
  t.getContext("2d").drawImage(c, x0, y0, t.width, t.height, 0, 0, t.width, t.height);
  return { canvas: t, bgColor: transparent ? null : `rgb(${bg[0]},${bg[1]},${bg[2]})` };
}

const logoCache = {};
function getLogo(brandId) {
  return (logoCache[brandId] ||= (async () => {
    const { canvas: t, bgColor } = await trimImage(BRAND_ASSETS[brandId].logo);
    // Ảnh tham chiếu gửi cho model sinh ảnh (nhỏ để tiết kiệm)
    const rs = Math.min(1, 640 / Math.max(t.width, t.height));
    const rc = document.createElement("canvas");
    rc.width = Math.round(t.width * rs); rc.height = Math.round(t.height * rs);
    const rg = rc.getContext("2d");
    rg.fillStyle = bgColor || "#fff"; rg.fillRect(0, 0, rc.width, rc.height);
    rg.drawImage(t, 0, 0, rc.width, rc.height);
    return { canvas: t, bgColor, ref: rc.toDataURL("image/png") };
  })());
}

const productCache = {};
const getProduct = (brandId) => (productCache[brandId] ||= trimImage(BRAND_ASSETS[brandId].product, 800));

// Ảnh tham chiếu gửi kèm ảnh gốc: logo, sản phẩm, và mẫu POSM chuẩn của brand nếu có (VD mái hiên, biển LED Tiger)
async function getRefImages() {
  const id = state.brand.main;
  const logo = await getLogo(id);
  const refs = [{ label: `${BRANDS[id].name} logo (colour and shape reference only)`, url: logo.ref },
    { label: `${BRANDS[id].name} product (colour reference only)`, url: BRAND_ASSETS[id].product }];
  for (const a of activeItems()) {
    const r = BRAND_ASSETS[id].posmRefs?.[a.id];
    if (r && a.status !== "keep") refs.push({ label: `${r.label} — use this exact design for the "${ITEM[a.id].en}"`, url: r.url });
  }
  return refs;
}

function fitFont(g, text, weight, maxSize, maxW, minSize, family = FONT) {
  let s = maxSize;
  g.font = `${weight} ${s}px ${family}`;
  while (s > minSize && g.measureText(text).width > maxW) { s -= 1; g.font = `${weight} ${s}px ${family}`; }
  return s;
}

const faceCache = new Map();
async function renderSignFace(W, H) {
  await fontsReady();
  const b = BRANDS[state.brand.main];
  const logo = await getLogo(state.brand.main);
  const o = state.outlet, sg = state.sign;
  const key = [W, H, state.brand.main, o.name, o.address, o.phone, sg.tagline, sg.specialty, sg.layout, sg.showAddress, sg.showPhone].join("|");
  if (faceCache.has(key)) return faceCache.get(key);

  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  if (b.hiflex) {
    await drawHiflex(g, W, H);
    if (faceCache.size > 40) faceCache.clear();
    faceCache.set(key, c);
    return c;
  }
  const right = sg.layout === "right";
  const mx = (x) => (right ? W - x : x);
  const poly = (pts, fill) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(mx(x), y) : g.moveTo(mx(x), y))); g.closePath(); g.fillStyle = fill; g.fill(); };

  g.fillStyle = b.color; g.fillRect(0, 0, W, H);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(255,255,255,.10)"); grad.addColorStop(1, "rgba(0,0,0,.14)");
  g.fillStyle = grad; g.fillRect(0, 0, W, H);

  const lw = Math.min(W * 0.4, H * 1.9), slant = H * 0.22, band = H * 0.07;
  poly([[0, 0], [lw, 0], [lw - slant, H], [0, H]], logo.bgColor || b.logoBg);
  poly([[lw, 0], [lw + band, 0], [lw - slant + band, H], [lw - slant, H]], b.accent);

  // Logo
  const bx0 = H * 0.08, bx1 = lw - slant - H * 0.02, by0 = H * 0.1, by1 = H * 0.9;
  const lr = Math.min((bx1 - bx0) / logo.canvas.width, (by1 - by0) / logo.canvas.height);
  const lwid = logo.canvas.width * lr, lhei = logo.canvas.height * lr;
  const lcx = (bx0 + bx1) / 2;
  g.drawImage(logo.canvas, mx(lcx) - lwid / 2, (by0 + by1) / 2 - lhei / 2, lwid, lhei);

  // Chữ
  const tx0 = right ? H * 0.1 : lw + band + H * 0.12;
  const tx1 = right ? W - lw - band - H * 0.12 : W - H * 0.1;
  const maxW = Math.max(40, tx1 - tx0), cx = (tx0 + tx1) / 2;
  const lines = [];
  const norm = (t) => (t || "").trim().toUpperCase();
  if (sg.tagline && !norm(o.name).startsWith(norm(sg.tagline))) lines.push({ t: sg.tagline.toUpperCase(), w: 700, s: H * 0.11, min: H * 0.06, color: b.accent });
  lines.push({ t: (o.name || "TÊN QUÁN").toUpperCase(), w: 800, s: H * 0.34, min: H * 0.12, color: b.text, gap: H * 0.02 });
  if (sg.specialty) lines.push({ t: "Chuyên: " + sg.specialty, w: 600, s: H * 0.075, min: H * 0.045, color: "rgba(255,255,255,.92)" });
  if (sg.showAddress && o.address) lines.push({ t: o.address, w: 500, s: H * 0.075, min: H * 0.045, color: "rgba(255,255,255,.92)" });
  if (sg.showPhone && o.phone) lines.push({ t: "ĐT: " + o.phone, w: 700, s: H * 0.085, min: H * 0.05, color: b.text });
  for (const L of lines) L.s = fitFont(g, L.t, L.w, L.s, maxW, L.min);
  const gap = H * 0.035;
  const total = lines.reduce((s, L) => s + L.s, 0) + gap * (lines.length - 1);
  let y = H * 0.07 + (H * 0.8 - total) / 2;
  g.textAlign = "center"; g.textBaseline = "top";
  for (const L of lines) {
    g.font = `${L.w} ${L.s}px ${FONT}`;
    g.fillStyle = L.color;
    g.fillText(L.t, cx, y, maxW);
    y += L.s + gap;
  }
  // Dòng cảnh báo bắt buộc
  const sh = H * 0.1;
  g.fillStyle = "rgba(0,0,0,.22)";
  g.fillRect(right ? 0 : lw - slant, H - sh, right ? W - lw + slant : W - lw + slant, sh);
  const ws = fitFont(g, WARNING_TEXT, 600, H * 0.055, maxW, 8);
  g.font = `600 ${ws}px ${FONT}`; g.fillStyle = "#fff"; g.textBaseline = "middle";
  g.fillText(WARNING_TEXT, cx, H - sh / 2, maxW);
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = Math.max(2, H * 0.015); g.strokeRect(0, 0, W, H);

  if (faceCache.size > 40) faceCache.clear();
  faceCache.set(key, c);
  return c;
}

// Mẫu bảng hiệu HIFLEX 4.0 của Tiger: khối xanh (logo + 2 sản phẩm) bên trái, cạnh chéo,
// panel xám sáng bên phải với loại quán, TÊN QUÁN chữ đứng hẹp, "Chuyên", "Địa chỉ"
async function drawHiflex(g, W, H) {
  const b = BRANDS[state.brand.main], hf = b.hiflex;
  const o = state.outlet, sg = state.sign;
  const logo = await getLogo(state.brand.main);
  const prods = await Promise.all(hf.products.map(getProduct));

  // Panel phải: xám sáng, sáng dần về phía chữ
  const gp = g.createLinearGradient(0, 0, W, 0);
  gp.addColorStop(0, "#FFFFFF"); gp.addColorStop(1, hf.panel);
  g.fillStyle = gp; g.fillRect(0, 0, W, H);

  // Khối xanh bên trái, cạnh phải vát chéo; chiếm ~42% chiều ngang như mẫu chuẩn
  const slant = H * 0.28;
  const xb = Math.max(H * 2.4, W * 0.42);
  const gb = g.createLinearGradient(0, 0, 0, H);
  gb.addColorStop(0, hf.blue); gb.addColorStop(1, hf.blueDark);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(xb, 0); g.lineTo(xb - slant, H); g.lineTo(0, H); g.closePath();
  g.fillStyle = gb; g.fill();
  g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = H * 0.025;
  g.beginPath(); g.moveTo(xb + H * 0.03, 0); g.lineTo(xb - slant + H * 0.03, H); g.stroke();

  // 2 sản phẩm đứng cạnh nhau, chồng nhẹ qua cạnh chéo
  const ph = H * 0.86;
  const sizes = prods.map((pr) => pr.canvas.width * (ph / pr.canvas.height));
  const prodTotal = sizes.reduce((a, w) => a + w * 0.82, 0) + sizes.at(-1) * 0.18;
  const prodX0 = xb - slant * 0.35 - prodTotal;
  let px = prodX0;
  prods.forEach((pr, i) => {
    g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = H * 0.04;
    g.drawImage(pr.canvas, px, H * 0.07, sizes[i], ph);
    g.restore();
    px += sizes[i] * 0.82;
  });
  px = prodX0 + prodTotal;

  // Logo: giữa phần xanh còn lại bên trái sản phẩm
  const lb = { x0: H * 0.1, x1: prodX0 - H * 0.08, y0: H * 0.05, y1: H * 0.84 };
  const lr = Math.min((lb.x1 - lb.x0) / logo.canvas.width, (lb.y1 - lb.y0) / logo.canvas.height);
  const lw = logo.canvas.width * lr, lh = logo.canvas.height * lr;
  g.drawImage(logo.canvas, (lb.x0 + lb.x1) / 2 - lw / 2, (lb.y0 + lb.y1) / 2 - lh / 2, lw, lh);

  // Dòng cảnh báo nhỏ dưới logo
  const wMax = prodX0 - H * 0.15;
  const ws = fitFont(g, WARNING_TEXT, 600, H * 0.045, wMax, 6);
  g.font = `600 ${ws}px ${FONT}`; g.fillStyle = "rgba(255,255,255,.85)";
  g.textAlign = "left"; g.textBaseline = "middle";
  g.fillText(WARNING_TEXT, H * 0.1, H * 0.93, wMax);

  // Chữ trên panel phải
  const tx0 = Math.max(xb + H * 0.12, px + H * 0.08), tx1 = W - H * 0.2;
  const maxW = Math.max(40, tx1 - tx0), cx = (tx0 + tx1) / 2;
  const lines = [];
  const norm = (t) => (t || "").trim().toUpperCase();
  if (sg.tagline && !norm(o.name).startsWith(norm(sg.tagline))) lines.push({ t: sg.tagline.toUpperCase(), w: 600, s: H * 0.11, min: H * 0.06, f: FONT_CONDENSED });
  lines.push({ t: (o.name || "TÊN QUÁN").toUpperCase(), w: 700, s: H * 0.38, min: H * 0.14, f: FONT_CONDENSED });
  if (sg.specialty) lines.push({ t: "CHUYÊN: " + sg.specialty.toUpperCase(), w: 600, s: H * 0.075, min: H * 0.045, f: FONT_CONDENSED });
  const addr = [sg.showAddress && o.address ? "ĐỊA CHỈ: " + o.address.toUpperCase() : "", sg.showPhone && o.phone ? "ĐT: " + o.phone : ""].filter(Boolean).join(" – ");
  if (addr) lines.push({ t: addr, w: 600, s: H * 0.075, min: H * 0.045, f: FONT_CONDENSED });
  for (const L of lines) L.s = fitFont(g, L.t, L.w, L.s, maxW, L.min, L.f);
  const gap = H * 0.03;
  const total = lines.reduce((sum, L) => sum + L.s, 0) + gap * (lines.length - 1);
  let y = (H - total) / 2;
  g.textAlign = "center"; g.textBaseline = "top"; g.fillStyle = hf.ink;
  for (const L of lines) {
    g.font = `${L.w} ${L.s}px ${L.f}`;
    g.fillText(L.t, cx, y, maxW);
    y += L.s + gap;
  }
  g.strokeStyle = "rgba(0,0,0,.3)"; g.lineWidth = Math.max(2, H * 0.012); g.strokeRect(0, 0, W, H);
}

// Tỉ lệ ngang/cao của mặt bảng hiệu: brand có tỉ lệ chuẩn (Tiger 1:5–1:8) thì lấy mức gần nhất
function signRatio(aspect) {
  const rs = BRANDS[state.brand.main].hiflex?.ratios;
  if (!rs) return clamp(aspect, 1.4, 9);
  return rs.reduce((best, r) => (Math.abs(r - aspect) < Math.abs(best - aspect) ? r : best));
}

// Homography + vẽ ảnh lên tứ giác bằng lưới tam giác
function solveLinear(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}
function homography(src, dst) {
  const A = [], B = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v);
  }
  return [...solveLinear(A, B), 1];
}
const applyH = (h, x, y) => { const w = h[6] * x + h[7] * y + h[8]; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]; };

function drawTri(g, img, s0, s1, s2, d0, d1, d2) {
  const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
  const ex = (p) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * 0.8, p[1] + dy / l * 0.8]; };
  const [e0, e1, e2] = [ex(d0), ex(d1), ex(d2)];
  const [x0, y0] = s0, [x1, y1] = s1, [x2, y2] = s2;
  const [u0, v0] = d0, [u1, v1] = d1, [u2, v2] = d2;
  const den = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1);
  if (!den) return;
  const a = (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / den;
  const c = (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / den;
  const e = (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / den;
  const b = (v0 * (y1 - y2) + v1 * (y2 - y0) + v2 * (y0 - y1)) / den;
  const d = (v0 * (x2 - x1) + v1 * (x0 - x2) + v2 * (x1 - x0)) / den;
  const f = (v0 * (x1 * y2 - x2 * y1) + v1 * (x2 * y0 - x0 * y2) + v2 * (x0 * y1 - x1 * y0)) / den;
  g.save();
  g.beginPath(); g.moveTo(...e0); g.lineTo(...e1); g.lineTo(...e2); g.closePath(); g.clip();
  g.transform(a, b, c, d, e, f);
  g.drawImage(img, 0, 0);
  g.restore();
}

function warpImage(g, img, quad, N = 14) {
  const w = img.width, h = img.height;
  const H = homography([[0, 0], [w, 0], [w, h], [0, h]], quad);
  const P = [];
  for (let j = 0; j <= N; j++) {
    P[j] = [];
    for (let i = 0; i <= N; i++) {
      const s = [i / N * w, j / N * h];
      P[j][i] = { s, d: applyH(H, s[0], s[1]) };
    }
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const p00 = P[j][i], p10 = P[j][i + 1], p01 = P[j + 1][i], p11 = P[j + 1][i + 1];
    drawTri(g, img, p00.s, p10.s, p11.s, p00.d, p10.d, p11.d);
    drawTri(g, img, p00.s, p11.s, p01.s, p00.d, p11.d, p01.d);
  }
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const quadAspect = (q) => (dist(q[0], q[1]) + dist(q[3], q[2])) / Math.max(1, dist(q[0], q[3]) + dist(q[1], q[2]));

async function composeResult(r) {
  const img = r.afterImg;
  const c = r.canvas;
  if (!img || !c) return;
  if (c.width !== img.naturalWidth) { c.width = img.naturalWidth; c.height = img.naturalHeight; }
  const g = c.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(img, 0, 0);
  if (r.signOn && r.quad) {
    const q = r.quad;
    const FH = 360, FW = Math.round(FH * signRatio(quadAspect(q)) / 20) * 20;
    const face = await renderSignFace(FW, FH);
    const glow = state.render.time !== "ngay" && state.items.p_hop_den?.qty > 0;
    if (glow) {
      g.save();
      g.shadowColor = BRANDS[state.brand.main].color;
      g.shadowBlur = Math.max(24, c.width * 0.03);
      g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath();
      g.fillStyle = BRANDS[state.brand.main].color; g.fill();
      g.restore();
    }
    warpImage(g, face, q);
    if (!glow) {
      g.save();
      g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath();
      g.fillStyle = "rgba(0,0,0,0.05)"; g.fill();
      g.restore();
    }
  }
  if (r.editing) drawHandles(r);
}

const recomposeAll = debounce(() => { for (const r of state.results) if (r.status === "done") composeResult(r); }, 250);

async function drawSignPreview() {
  const c = $("#signPreview");
  const hf = BRANDS[state.brand.main].hiflex;
  const face = hf ? await renderSignFace(1440, 240) : await renderSignFace(1200, 300);
  c.width = face.width; c.height = face.height;
  c.getContext("2d").drawImage(face, 0, 0);
  const sample = BRAND_ASSETS[state.brand.main].signSample;
  $("#signSampleBox").hidden = !sample;
  if (sample) $("#signSample").src = sample;
  $("#signLayoutField").hidden = !!hf;
}
const drawSignPreviewDebounced = debounce(drawSignPreview, 150);

// ---------------------------------------------------------------------------
// Phân tích ảnh
// ---------------------------------------------------------------------------
async function analyze() {
  if (!state.photos.length) return toast("Hãy chọn ít nhất 1 ảnh");
  const btn = $("#analyzeBtn"), st = $("#analyzeStatus");
  btn.disabled = true;
  st.innerHTML = `<span class="spin dark" style="display:inline-block;width:16px;height:16px;border-width:2px;margin:0 6px -3px 0"></span>Đang phân tích… (~5–10 giây)`;
  try {
    const content = [{ type: "text", text: ANALYZE_PROMPT() }];
    state.photos.forEach((p, i) => {
      content.push({ type: "text", text: `Photo ${i + 1}:` });
      content.push({ type: "image_url", image_url: { url: p.url } });
    });
    const { msg } = await callOR({ model: settings.visionModel, response_format: { type: "json_object" }, messages: [{ role: "user", content }] });
    const a = parseJSON(msg.content);
    state.analysis = a;
    if (a.name) state.outlet.name = a.name;
    if (a.address) state.outlet.address = a.address;
    if (a.phone) state.outlet.phone = a.phone;
    if (a.specialty) state.sign.specialty = a.specialty;
    if (REGIONS[a.region]) state.outlet.region = a.region;
    if (STYLES[a.style]) state.profile.style = a.style;
    if (OUTLET_TYPES[a.outlet_type]) {
      state.profile.type = a.outlet_type;
      state.sign.tagline = OUTLET_TYPES[a.outlet_type].sign;
    }
    applyOutletDefaults(state.profile.type, (a.existing_items || []).filter((id) => ITEM[id]));
    applyTier(state.brand.tier);
    (a.photo_views || []).forEach((v, i) => { if (state.photos[i] && VIEW_LABEL[v]) state.photos[i].view = v; });
    if (typeof a.has_sidewalk === "boolean") state.space.sidewalk = a.has_sidewalk;
    if (a.est_width_m >= 2 && a.est_width_m <= 30) state.space.width = Math.round(a.est_width_m * 2) / 2;
    st.textContent = "Đã điền sẵn thông tin — kiểm tra và sửa nếu cần.";
    renderAll();
  } catch (e) {
    st.textContent = "";
    $("#analysisBox").innerHTML = `<div class="banner bad">Lỗi phân tích: ${esc(e.message)}</div>`;
  } finally {
    btn.disabled = false;
  }
}

function renderAnalysis() {
  const a = state.analysis, box = $("#analysisBox");
  if (!a) { box.innerHTML = ""; return; }
  if (a.is_outlet === false) {
    box.innerHTML = `<div class="banner bad">⚠️ <b>Ảnh này có vẻ không phải quán ăn / quán nhậu.</b> ${esc(a.reject_reason || "")}<br><span class="small">Bạn vẫn có thể tiếp tục nếu chắc chắn đây là outlet.</span></div>`;
    return;
  }
  const comp = a.competitor_brands || [];
  const hvn = (a.current_brands || []).filter((x) => !comp.includes(x));
  box.innerHTML = `
    <div class="banner ok">✓ <b>${esc(OUTLET_TYPES[a.outlet_type]?.label || "Outlet")}</b>${STYLES[a.style] ? " · phong cách " + esc(STYLES[a.style].label) : ""}
      ${a.existing_items?.length ? ` · nhận diện ${a.existing_items.length} món đang có (đánh dấu “Giữ” ở bước 5)` : ""}
      ${a.notes ? `<div style="margin-top:4px">${esc(a.notes)}</div>` : ""}
      ${hvn.length ? `<div class="chips" style="margin-top:8px">${hvn.map((x) => `<span class="badge">${esc(x)}</span>`).join("")}</div>` : ""}
    </div>
    ${comp.length ? `<div class="banner warn">🎯 Quán đang có POSM/brand đối thủ: <b>${comp.map(esc).join(", ")}</b> — cơ hội thay bằng brand HEINEKEN Việt Nam.</div>` : ""}`;
}

// ---------------------------------------------------------------------------
// Tạo ảnh
// ---------------------------------------------------------------------------
async function generate() {
  if (!state.photos.length) { toast("Cần ít nhất 1 ảnh (bước 1)"); return goStep(1); }
  if (!hasKey()) return toast("Thiếu key OpenRouter — xem README");
  const btn = $("#generateBtn");
  btn.disabled = true;
  const refs = await getRefImages();
  const photos = genPhotos();
  const n = +state.render.variants || 1;
  state.results = [];
  $("#results").innerHTML = "";
  const jobs = [];
  for (const p of photos) for (let v = 1; v <= n; v++) {
    const r = { id: "r" + uidSeq++, target: p.view, photoNo: state.photos.indexOf(p) + 1, variant: v, status: "loading", before: p.url, model: settings.imageModel, signOn: false, quad: null, picked: v === 1 };
    state.results.push(r);
    mountResult(r);
    jobs.push(runJob(r, refs));
  }
  await Promise.allSettled(jobs);
  btn.disabled = false;
  $("#exportCard").style.display = state.results.some((r) => r.status === "done") ? "" : "none";
}

async function runJob(r, refs) {
  r.status = "loading"; r.editing = false;
  mountResult(r);
  const t0 = performance.now();
  try {
    const text = SYSTEM_PROMPT + "\n\n" + buildContext(state, r.target) +
      (r.variant > 1 ? `\n\nThis is design variation #${r.variant}: propose a noticeably different arrangement and colour balance while following all rules.` : "");
    const content = [{ type: "text", text }, { type: "image_url", image_url: { url: r.before } }, ...refs.flatMap((r, i) => [{ type: "text", text: `Reference image ${i + 2}: ${r.label}` }, { type: "image_url", image_url: { url: r.url } }])];
    const src = await loadImg(r.before);
    const { msg, cost } = await callOR({ model: r.model, modalities: imageModalities(r.model), image_config: { aspect_ratio: nearestAspect(src.naturalWidth, src.naturalHeight) }, messages: [{ role: "user", content }] });
    const url = msg.images?.[0]?.image_url?.url;
    if (!url) throw new Error("Model không trả về ảnh. " + String(msg.content || "").slice(0, 200));
    r.after = url;
    r.afterImg = await loadImg(url);
    r.cost = cost;
    r.secs = Math.round((performance.now() - t0) / 1000);
    r.status = "done";
    mountResult(r);
    await composeResult(r);
    if (r.target === "facade" && hasSignPosm() && !state.constraints.keep_old_sign) await detectSign(r);
  } catch (e) {
    r.status = "error";
    r.error = e.message;
    mountResult(r);
  }
}

// Giữ khung hình giống ảnh gốc để so sánh Before/After khớp nhau
function nearestAspect(w, h) {
  const opts = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];
  const diff = (o) => { const [a, b] = o.split(":").map(Number); return Math.abs(Math.log(a / b / (w / h))); };
  return opts.reduce((best, o) => (diff(o) < diff(best) ? o : best));
}

async function detectSign(r) {
  const note = $(`#${r.id} .note`);
  if (note) note.textContent = "Đang dò vị trí bảng hiệu…";
  try {
    const { msg } = await callOR({ model: settings.visionModel, response_format: { type: "json_object" }, messages: [{ role: "user", content: [{ type: "text", text: SIGN_DETECT_PROMPT }, { type: "image_url", image_url: { url: r.after } }] }] });
    const a = parseJSON(msg.content);
    const W = r.afterImg.naturalWidth, H = r.afterImg.naturalHeight;
    const keys = ["top_left", "top_right", "bottom_right", "bottom_left"];
    const pts = keys.every((k) => a[k]) ? keys.map((k) => [+a[k].x, +a[k].y])
      : Array.isArray(a.corners) && a.corners.length === 4 ? a.corners.map(([x, y]) => [+x, +y]) : null;
    if (a.found && pts && pts.every((p) => p.every(Number.isFinite))) {
      let q = pts.map(([x, y]) => [clamp(x, 0, 1000) / 1000 * W, clamp(y, 0, 1000) / 1000 * H]);
      // Một số model trả [y, x]: bảng hiệu luôn ngang, nếu thành dọc thì đảo lại
      const swapped = pts.map(([x, y]) => [clamp(y, 0, 1000) / 1000 * W, clamp(x, 0, 1000) / 1000 * H]);
      if (quadAspect(q) < 1 && quadAspect(swapped) > 1) q = swapped;
      r.quad = q;
      r.signOn = true;
      if (note) note.textContent = "Đã dán bảng hiệu thật. Nếu lệch, bấm “Chỉnh 4 góc”.";
    } else {
      r.quad = [[W * 0.1, H * 0.06], [W * 0.9, H * 0.06], [W * 0.9, H * 0.26], [W * 0.1, H * 0.26]];
      r.signOn = false;
      if (note) note.textContent = "Không dò được bảng hiệu — bật “Dán bảng hiệu” và chỉnh 4 góc bằng tay.";
    }
  } catch (e) {
    if (note) note.textContent = "Lỗi dò bảng hiệu: " + e.message;
  }
  const cb = $(`#${r.id} [data-act=sign]`);
  if (cb) cb.checked = r.signOn;
  await composeResult(r);
}

function mountResult(r) {
  let el = document.getElementById(r.id);
  if (!el) {
    el = document.createElement("div");
    el.className = "result";
    el.id = r.id;
    $("#results").appendChild(el);
  }
  const title = `Ảnh ${r.photoNo} · ${VIEW_LABEL[r.target]} · Phương án ${r.variant}`;
  const head = `<div class="rh"><b>${title}</b><span class="badge gray">${esc(r.model.split("/")[1] || r.model)}</span>
      ${r.status === "done" ? `<span class="small muted">${r.secs}s · $${(r.cost || 0).toFixed(3)}</span>` : ""}
      <span class="spacer"></span>
      ${r.status === "done" ? `<label class="check small"><input type="radio" name="pick-${r.target}" data-act="pick" ${r.picked ? "checked" : ""}> ★ Dùng cho proposal</label>` : ""}</div>`;
  if (r.status === "loading") {
    el.innerHTML = head + `<div class="ba"><div class="loading"><div class="spin"></div>Đang tạo ảnh… thường mất 15–40 giây</div></div>`;
    return;
  }
  if (r.status === "error") {
    el.innerHTML = head + `<div class="err">Lỗi: ${esc(r.error)}</div><div class="tools"><button class="btn sm" data-act="retry">🔁 Thử lại</button></div>`;
    bindResult(el, r);
    return;
  }
  el.innerHTML = head + `
    <div class="ba">
      <canvas></canvas>
      <img class="before" src="${r.before}" alt="Before">
      <div class="divider" style="left:50%"></div>
      <span class="lbl l">Before</span><span class="lbl r">After</span>
      <input type="range" min="0" max="100" value="50" aria-label="So sánh trước sau">
    </div>
    <div class="tools">
      ${r.target === "facade" ? `
        <label class="check small"><input type="checkbox" data-act="sign" ${r.signOn ? "checked" : ""}> Dán bảng hiệu thật</label>
        <button class="btn sm" data-act="edit">✏️ Chỉnh 4 góc</button>
        <button class="btn sm" data-act="detect">🔍 Dò lại bảng hiệu</button>` : ""}
      <button class="btn sm" data-act="download">⬇️ Tải ảnh</button>
      <button class="btn sm" data-act="retry">🔁 Tạo lại</button>
      <span class="small muted note" style="flex-basis:100%"></span>
    </div>`;
  r.canvas = $("canvas", el);
  const before = $(".before", el), divider = $(".divider", el), range = $("input[type=range]", el);
  const setV = (v) => { before.style.clipPath = `inset(0 ${100 - v}% 0 0)`; divider.style.left = v + "%"; };
  setV(50);
  range.addEventListener("input", () => setV(+range.value));
  bindResult(el, r);
}

function bindResult(el, r) {
  el.onclick = async (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) return;
    if (act === "retry") { const refs = await getRefImages(); r.model = settings.imageModel; runJob(r, refs); }
    if (act === "download") {
      const a = document.createElement("a");
      a.href = r.canvas.toDataURL("image/png");
      a.download = `${slug(state.outlet.name)}_${r.target}_pa${r.variant}.png`;
      a.click();
    }
    if (act === "detect") detectSign(r);
    if (act === "edit") toggleEdit(r, el);
  };
  el.onchange = (e) => {
    const act = e.target.dataset.act;
    if (act === "sign") {
      r.signOn = e.target.checked;
      if (r.signOn && !r.quad) { const W = r.afterImg.naturalWidth, H = r.afterImg.naturalHeight; r.quad = [[W * 0.1, H * 0.06], [W * 0.9, H * 0.06], [W * 0.9, H * 0.26], [W * 0.1, H * 0.26]]; }
      composeResult(r);
    }
    if (act === "pick") state.results.forEach((x) => { if (x.target === r.target) x.picked = x === r; });
  };
}

function toggleEdit(r, el) {
  const ba = $(".ba", el);
  r.editing = !r.editing;
  $("[data-act=edit]", el).textContent = r.editing ? "✓ Xong" : "✏️ Chỉnh 4 góc";
  for (const s of [".before", ".divider", "input[type=range]", ".lbl"]) $$(s, ba).forEach((x) => (x.style.display = r.editing ? "none" : ""));
  $("svg.handles", ba)?.remove();
  if (!r.editing) return composeResult(r);
  if (!r.quad) { const W = r.afterImg.naturalWidth, H = r.afterImg.naturalHeight; r.quad = [[W * 0.1, H * 0.06], [W * 0.9, H * 0.06], [W * 0.9, H * 0.26], [W * 0.1, H * 0.26]]; }
  r.signOn = true;
  const cb = $("[data-act=sign]", el); if (cb) cb.checked = true;
  const W = r.afterImg.naturalWidth, H = r.afterImg.naturalHeight;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "handles");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  ba.appendChild(svg);
  r.handleSvg = svg;
  let drag = -1, raf = 0;
  const pt = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  svg.addEventListener("pointerdown", (e) => { const i = e.target.dataset?.i; if (i == null) return; drag = +i; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener("pointermove", (e) => {
    if (drag < 0) return;
    const m = pt(e);
    r.quad[drag] = [clamp(m.x, 0, W), clamp(m.y, 0, H)];
    drawHandles(r);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => composeResult(r));
  });
  const end = () => { drag = -1; };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  composeResult(r);
}

function drawHandles(r) {
  const svg = r.handleSvg;
  if (!svg || !r.editing) return;
  const W = r.afterImg.naturalWidth;
  const rad = W * 0.014;
  svg.innerHTML = `<polygon points="${r.quad.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#FFD400" stroke-width="${W * 0.003}" stroke-dasharray="${W * 0.01} ${W * 0.006}"/>` +
    r.quad.map((p, i) => `<circle data-i="${i}" cx="${p[0]}" cy="${p[1]}" r="${rad}" fill="#FFD400" stroke="#000" stroke-width="${W * 0.002}"/>`).join("");
}

// ---------------------------------------------------------------------------
// Proposal (in / PDF)
// ---------------------------------------------------------------------------
async function buildProposal() {
  const pick = (t) => state.results.find((r) => r.target === t && r.picked && r.status === "done") || state.results.find((r) => r.target === t && r.status === "done");
  const f = pick("facade"), i = pick("interior");
  const b = BRANDS[state.brand.main], tier = TIERS[state.brand.tier], k = calc();
  const logo = await getLogo(state.brand.main);
  const act = activeItems();
  const outlet = act.filter((a) => ITEM[a.id].tab === "outlet");
  const posm = act.filter((a) => ITEM[a.id].tab === "posm" && a.status !== "keep");
  const o = state.outlet;
  const today = new Date().toLocaleDateString("vi-VN");
  const imgPair = (r, label) => r ? `<h2>${label}</h2><div class="imgs"><figure><img src="${r.before}"><figcaption>Hiện trạng</figcaption></figure><figure><img src="${r.canvas.toDataURL("image/jpeg", 0.9)}"><figcaption>Đề xuất (ảnh minh hoạ)</figcaption></figure></div>` : "";
  const planEl = planSVG(false);
  planEl.removeAttribute("width"); planEl.removeAttribute("height");

  $("#proposal").innerHTML = `
    <div class="ph"><img src="${logo.canvas.toDataURL("image/png")}" style="background:${logo.bgColor || "transparent"};padding:4px;border-radius:6px">
      <div style="flex:1"><h1>ĐỀ XUẤT HỢP TÁC TRƯNG BÀY</h1><div>${esc(b.name)} · Gói ${esc(tier.label)} · ${today}</div></div></div>
    <table>
      <tr><th style="width:22%">Tên quán</th><td>${esc(o.name || "—")}</td><th style="width:18%">Loại hình</th><td>${esc(OUTLET_TYPES[state.profile.type].label)}</td></tr>
      <tr><th>Địa chỉ</th><td>${esc(o.address || "—")}</td><th>Điện thoại</th><td>${esc(o.phone || "—")}</td></tr>
      <tr><th>Phong cách</th><td>${esc(STYLES[state.profile.style].label)}</td><th>Sale rep</th><td>${esc(o.rep || "—")}</td></tr>
      <tr><th>Mặt bằng</th><td>${state.space.width} × ${state.space.depth} m${state.space.sidewalk ? `, vỉa hè ${state.space.sidewalkDepth} m` : ""}</td><th>${isOffTrade() ? "Sức chứa tủ HVN" : "Chỗ ngồi"}</th><td>${isOffTrade() ? k.cans + " lon" : k.seats}</td></tr>
    </table>
    ${imgPair(f, "Mặt tiền")}
    ${imgPair(i, "Bên trong")}
    <div class="page-break"></div>
    <h2>Sơ đồ bố trí đề xuất</h2><div class="plan">${planEl.outerHTML}</div>
    <h2>POSM công ty hỗ trợ</h2>
    <table><tr><th>Hạng mục</th><th class="r">SL</th><th class="r">Đơn giá</th><th class="r">Thành tiền</th></tr>
      ${posm.map((a) => `<tr><td>${esc(ITEM[a.id].label)}</td><td class="r">${a.qty}</td><td class="r">${fmtVND(ITEM[a.id].price)}</td><td class="r">${fmtVND(ITEM[a.id].price * a.qty)}</td></tr>`).join("")}
      <tr><th colspan="3">Tổng giá trị hỗ trợ</th><th class="r">${fmtVND(k.posmCost)}</th></tr>
      <tr><td colspan="3">Hạn mức gói ${esc(tier.label)}</td><td class="r">${fmtVND(k.limit)}</td></tr></table>
    <h2>Đồ đạc của quán (chủ quán tự trang bị)</h2>
    <table><tr><th>Hạng mục</th><th class="r">SL</th><th>Đề xuất</th></tr>
      ${outlet.map((a) => `<tr><td>${esc(ITEM[a.id].label)}</td><td class="r">${a.qty}</td><td>${STATUS[a.status]}</td></tr>`).join("")}</table>
    <h2>Cam kết</h2>
    <table>
      <tr><th>Sản lượng cam kết</th><td>${state.brand.volume} thùng/tháng (tối thiểu gói ${esc(tier.label)}: ${tier.minVolume})</td></tr>
      <tr><th>Công suất ước tính</th><td>~${k.estVolume} thùng/tháng (${isOffTrade() ? `tủ HVN ${k.cans} lon` : `${k.seats} chỗ ngồi`})</td></tr>
      <tr><th>Thời hạn</th><td>12 tháng kể từ ngày lắp đặt POSM</td></tr>
    </table>
    <ul class="small">
      <li>Quán ưu tiên trưng bày sản phẩm của HEINEKEN Việt Nam ở vị trí dễ thấy; tủ mát hỗ trợ chỉ chứa sản phẩm của công ty.</li>
      <li>POSM là tài sản của công ty; quán có trách nhiệm bảo quản và hoàn trả khi kết thúc hợp tác.</li>
      <li>Bảng hiệu có dòng cảnh báo “Người dưới 18 tuổi không được uống rượu, bia” theo quy định.</li>
    </ul>
    <div class="sig"><div>ĐẠI DIỆN QUÁN</div><div>ĐẠI DIỆN HEINEKEN VIỆT NAM</div></div>
    <div class="note">Ảnh đề xuất do AI tạo để minh hoạ, POSM thực tế có thể khác về kích thước và màu sắc. Đơn giá và hạn mức là số minh hoạ trong bản demo.</div>`;
  await Promise.all($$("#proposal img").map((im) => (im.decode ? im.decode().catch(() => {}) : null)));
}

// ---------------------------------------------------------------------------
// Render UI
// ---------------------------------------------------------------------------
const visibleSteps = () => (state.mode === "quick" ? QUICK_STEPS : STEPS.map((s) => s[0]));

function renderStepper() {
  const vis = visibleSteps();
  $("#stepper").innerHTML = STEPS.filter(([n]) => vis.includes(n)).map(([n, label], idx) =>
    `<button data-go="${n}" class="${n === state.step ? "on" : n < state.step ? "done" : ""}"><span class="n">${idx + 1}</span>${label}</button>`).join("");
  $$("#modeSeg button").forEach((b) => b.classList.toggle("on", b.dataset.mode === state.mode));
  $$(".detail-only").forEach((x) => (x.style.display = state.mode === "quick" ? "none" : ""));
  const i = vis.indexOf(state.step);
  $("#prevBtn").disabled = i <= 0;
  $("#nextBtn").style.display = i >= vis.length - 1 ? "none" : "";
}

function goStep(n) {
  state.step = n;
  $$(".step").forEach((s) => s.classList.toggle("on", +s.dataset.step === n));
  renderStepper();
  if (n === 5) { renderItems(); renderPlan(); }
  if (n === 6) drawSignPreview();
  if (n === 7) renderGenEstimate();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindInputs() {
  $$("[data-bind]").forEach((el) => {
    const v = getPath(state, el.dataset.bind);
    if (el.type === "checkbox") el.checked = !!v;
    else if (document.activeElement !== el) el.value = v ?? "";
  });
}

function renderChips() {
  $$("[data-chips]").forEach((box) => {
    const path = box.dataset.chips, src = CHIP_SOURCES[box.dataset.src], multi = box.hasAttribute("data-multi");
    const cur = getPath(state, path);
    box.innerHTML = Object.entries(src).map(([k, v]) => {
      const on = multi ? cur.includes(k) : cur === k;
      return `<button class="chip ${on ? "on" : ""}" data-k="${k}">${esc(typeof v === "string" ? v : v.label)}</button>`;
    }).join("");
  });
}

function suggestedBrands() {
  const s = [...STYLES[state.profile.style].brands];
  if (state.outlet.region === "mien_tay" && !s.includes("larue")) s.unshift("larue");
  return s;
}

function renderStyleCards() {
  $("#styleCards").innerHTML = Object.entries(STYLES).map(([k, s]) => `
    <button class="opt ${state.profile.style === k ? "on" : ""}" data-style="${k}">
      <span class="sw">${s.swatch.map((c) => `<i style="background:${c}"></i>`).join("")}</span>
      <span class="t">${esc(s.label)}</span><span class="d">${esc(s.desc)}</span>
      <span class="d">Gợi ý: ${s.brands.map((b) => BRANDS[b].name).join(", ")}</span>
    </button>`).join("");
}

async function renderBrandCards() {
  const sug = suggestedBrands();
  const ids = Object.keys(BRANDS);
  $("#brandCards").innerHTML = ids.map((k) => `
    <button class="opt brand-card ${state.brand.main === k ? "on" : ""}" data-brand="${k}">
      ${sug.includes(k) ? `<span class="badge badge">Gợi ý</span>` : ""}
      <span class="lg" id="lg-${k}"></span>
      <span class="t">${esc(BRANDS[k].name)}</span>
      <span class="sw"><i style="background:${BRANDS[k].color}"></i><i style="background:${BRANDS[k].accent}"></i></span>
    </button>`).join("");
  $("#secondaryChips").innerHTML = ids.filter((k) => k !== state.brand.main).map((k) =>
    `<button class="chip ${state.brand.secondary.includes(k) ? "on" : ""}" data-sec="${k}">${esc(BRANDS[k].name)}</button>`).join("");
  for (const k of ids) {
    const l = await getLogo(k);
    const box = document.getElementById("lg-" + k);
    if (!box) continue;
    box.style.background = l.bgColor || "#fff";
    box.innerHTML = `<img alt="${esc(BRANDS[k].name)}" src="${l.ref}">`;
  }
}

function renderTierCards() {
  $("#tierCards").innerHTML = TIER_ORDER.map((k) => {
    const t = TIERS[k];
    return `<button class="opt ${state.brand.tier === k ? "on" : ""}" data-tier="${k}">
      <span class="t">Gói ${t.label}</span><span class="d">${esc(t.desc)}</span>
      <span class="d">Hạn mức <b>${fmtVND(t.limit)}</b><br>Tối thiểu <b>${t.minVolume}</b> thùng/tháng</span></button>`;
  }).join("");
  renderVolumeHint();
}

function renderVolumeHint() {
  const k = calc();
  $("#volumeHint").innerHTML = `Gói ${TIERS[state.brand.tier].label} yêu cầu tối thiểu <b>${k.minVolume}</b> thùng/tháng.<br>Công suất ước tính: <b>~${k.estVolume}</b> thùng/tháng (${isOffTrade() ? `tủ HVN ${k.cans} lon` : `${k.seats} chỗ`}).`;
}

function renderItems() {
  $$("#itemTabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === state.itemTab));
  const tab = state.itemTab;
  const list = ITEMS.filter((i) => i.tab === tab);
  const groups = [...new Set(list.map((i) => i.group))];
  const statuses = tab === "posm" ? ["keep", "add", "remove"] : ["keep", "replace", "add", "remove"];
  const label = (s) => (tab === "posm" && s === "keep" ? "Đã có" : STATUS[s]);
  $("#itemList").innerHTML = groups.map((g) => `<div class="group-h">${esc(g)}</div>` + list.filter((i) => i.group === g).map((it) => {
    const v = state.items[it.id] || { qty: 0, status: "add" };
    const locked = tab === "posm" && tierIndex(it.tier) > tierIndex(state.brand.tier);
    const meta = tab === "posm"
      ? `${fmtVND(it.price)}/cái · ${locked ? `<span class="badge warn">Cần gói ${TIERS[it.tier].label}</span>` : `Gói ${TIERS[it.tier].label}`}`
      : [it.seats ? `${it.seats} chỗ` : "", it.w ? `${it.w}×${it.d} m` : "", it.plan === false ? "không vẽ trên sơ đồ" : ""].filter(Boolean).join(" · ");
    return `<div class="item ${v.qty === 0 ? "off" : ""} ${isRequired(it) ? "locked" : ""} ${locked ? "disabled" : ""}" data-id="${it.id}">
      <div><div class="name">${esc(it.label)}</div><div class="meta">${meta}</div></div>
      <div class="stepper-n"><button data-d="-1" ${locked ? "disabled" : ""}>−</button><input type="number" min="0" value="${v.qty}" ${locked ? "disabled" : ""}><button data-d="1" ${locked ? "disabled" : ""}>+</button></div>
      <div class="st" style="${v.qty === 0 ? "visibility:hidden" : ""}">${statuses.map((s) => `<button data-s="${s}" class="${v.status === s ? "on" : ""}" ${locked || (isRequired(it) && s === "remove") ? "disabled" : ""}>${label(s)}</button>`).join("")}</div>
    </div>`;
  }).join("")).join("");
}

function setItemQty(id, qty) {
  const it = ITEM[id];
  const v = state.items[id] ||= { qty: 0, status: "add" };
  qty = Math.max(isRequired(it) ? 1 : 0, Math.min(999, Math.round(qty) || 0));
  if (v.qty === 0 && qty > 0 && v.status === "remove") v.status = "add";
  v.qty = qty;
  itemsChanged();
}

function itemsChanged() {
  state.plan = null;
  renderItems();
  if (state.step === 5) renderPlan();
  updateSummary();
  renderVolumeHint();
}

function updateSummary() {
  const k = calc();
  $("#kSeatsLabel").textContent = isOffTrade() ? "Sức chứa tủ HVN" : "Chỗ ngồi";
  $("#kSeats").textContent = isOffTrade() ? `${k.cans} lon` : k.seats;
  $("#kCost").textContent = fmtVND(k.posmCost);
  const bar = $("#kCostBar");
  bar.style.width = Math.min(100, (k.posmCost / k.limit) * 100) + "%";
  bar.classList.toggle("over", k.posmCost > k.limit);
  $("#kVol").textContent = "~" + k.estVolume + " thùng/th";
  const w = checkRules(ensurePlan());
  if (k.posmCost > k.limit) w.unshift(`Chi phí POSM (${fmtVND(k.posmCost)}) vượt hạn mức gói ${TIERS[state.brand.tier].label} (${fmtVND(k.limit)})`);
  if (+state.brand.volume < k.minVolume) w.unshift(`Sản lượng cam kết (${state.brand.volume}) thấp hơn mức tối thiểu của gói (${k.minVolume} thùng/tháng)`);
  if (k.estVolume < k.minVolume) w.push(`Công suất ước tính (~${k.estVolume} thùng) thấp hơn yêu cầu của gói — cân nhắc gói thấp hơn hoặc thêm bàn`);
  const btn = $("#warnBtn");
  btn.textContent = w.length ? `⚠️ ${w.length} cảnh báo` : "✓ Ổn";
  btn.classList.toggle("ok", !w.length);
  $("#warnList").innerHTML = w.map((x) => `<li>${esc(x)}</li>`).join("") || `<li class="ok">Không có cảnh báo</li>`;
}

function renderGenEstimate() {
  const photos = genPhotos();
  const n = (+state.render.variants || 1) * photos.length;
  $("#genEstimate").innerHTML = photos.length
    ? `Sẽ tạo <b>${n}</b> ảnh từ ${photos.map((p) => `ảnh ${state.photos.indexOf(p) + 1} (${VIEW_LABEL[p.view].toLowerCase()})`).join(", ")} bằng <b>${esc(settings.imageModel)}</b>.`
    : `<span class="badge bad">Chưa có ảnh — quay lại bước 1</span>`;
}

function renderPhotos() {
  $("#photoList").innerHTML = state.photos.map((p, i) => `
    <div class="slot ${p.gen ? "has" : ""}" data-pid="${p.id}">
      <div class="ph"><img src="${p.url}" alt="Ảnh ${i + 1}"><div class="acts"><button data-rm="${p.id}" title="Xoá ảnh">✕</button></div></div>
      <div class="row" style="gap:8px">
        <b class="small">Ảnh ${i + 1}</b>
        <select data-view style="flex:1;padding:5px 8px">${Object.entries(VIEW_LABEL).map(([k, l]) => `<option value="${k}" ${p.view === k ? "selected" : ""}>${l}</option>`).join("")}</select>
      </div>
      <label class="check small"><input type="checkbox" data-gen ${p.gen ? "checked" : ""}> Tạo thiết kế từ ảnh này</label>
    </div>`).join("");
  const g = state.photos.filter((p) => p.gen).length;
  $("#photoCount").textContent = state.photos.length ? `${state.photos.length} ảnh · ${g} ảnh sẽ tạo thiết kế` : "Chưa có ảnh";
}

function renderAll() {
  bindInputs();
  renderChips();
  renderStyleCards();
  renderBrandCards();
  renderTierCards();
  renderPhotos();
  renderAnalysis();
  renderStepper();
  if (state.step === 5) { renderItems(); renderPlan(); }
  if (state.step === 6) drawSignPreview();
  updateSummary();
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
function onChange(path) {
  if (path.startsWith("space") || path === "constraints.no_sidewalk") { state.plan = null; if (state.step === 5) renderPlan(); }
  if (path === "brand.volume") renderVolumeHint();
  if (path === "outlet.region") renderBrandCards();
  if (path.startsWith("outlet") || path.startsWith("sign")) { if (state.step === 6) drawSignPreviewDebounced(); recomposeAll(); }
  if (path.startsWith("render")) renderGenEstimate();
  updateSummary();
}

function initEvents() {
  document.addEventListener("input", (e) => {
    const el = e.target.closest("[data-bind]");
    if (!el) return;
    let v = el.type === "checkbox" ? el.checked : el.value;
    if (el.hasAttribute("data-num")) v = v === "" ? 0 : +v;
    setPath(state, el.dataset.bind, v);
    onChange(el.dataset.bind);
  });

  $("#stepper").addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) goStep(+b.dataset.go); });
  $("#modeSeg").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]");
    if (!b) return;
    state.mode = b.dataset.mode;
    if (!visibleSteps().includes(state.step)) goStep(visibleSteps()[0]); else renderStepper();
  });
  $("#prevBtn").onclick = () => { const v = visibleSteps(); const i = v.indexOf(state.step); if (i > 0) goStep(v[i - 1]); };
  $("#nextBtn").onclick = () => { const v = visibleSteps(); const i = v.indexOf(state.step); if (i < v.length - 1) goStep(v[i + 1]); };
  $("#warnBtn").onclick = () => $("#warnPop").classList.toggle("on");

  // Ảnh
  $("#photoInput").onchange = async (e) => {
    const busy = [$("#analyzeBtn"), $("#generateBtn")];
    busy.forEach((x) => (x.disabled = true));
    $("#photoCount").textContent = "Đang tải ảnh…";
    for (const f of e.target.files) {
      const first = !state.photos.length;
      state.photos.push({ id: "p" + uidSeq++, url: await fileToDataURL(f), view: first ? "facade" : "interior", gen: first });
    }
    e.target.value = "";
    state.analysis = null;
    busy.forEach((x) => (x.disabled = false));
    renderPhotos(); renderAnalysis(); renderGenEstimate();
  };
  $("#photoList").addEventListener("change", (e) => {
    const p = state.photos.find((x) => x.id === e.target.closest("[data-pid]")?.dataset.pid);
    if (!p) return;
    if (e.target.matches("[data-view]")) p.view = e.target.value;
    if (e.target.matches("[data-gen]")) p.gen = e.target.checked;
    renderPhotos(); renderGenEstimate();
  });
  $("#photoList").addEventListener("click", (e) => {
    const rm = e.target.closest("[data-rm]");
    if (!rm) return;
    state.photos = state.photos.filter((x) => x.id !== rm.dataset.rm);
    if (state.photos.length && !state.photos.some((x) => x.gen)) state.photos[0].gen = true;
    renderPhotos(); renderGenEstimate();
  });
  $("#analyzeBtn").onclick = analyze;

  // Chips
  document.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-chips] .chip");
    if (!chip) return;
    const box = chip.closest("[data-chips]"), path = box.dataset.chips, k = chip.dataset.k;
    if (box.hasAttribute("data-multi")) {
      const arr = getPath(state, path);
      const i = arr.indexOf(k);
      i >= 0 ? arr.splice(i, 1) : arr.push(k);
    } else {
      setPath(state, path, k);
      if (path === "profile.type") {
        applyOutletDefaults(k, state.analysis?.existing_items || []);
        applyTier(state.brand.tier);
        state.sign.tagline = OUTLET_TYPES[k].sign;
        bindInputs();
        toast("Đã cập nhật đồ đạc mặc định cho " + OUTLET_TYPES[k].label);
      }
    }
    renderChips();
    onChange(path);
  });
  $("#styleCards").onclick = (e) => {
    const b = e.target.closest("[data-style]");
    if (!b) return;
    state.profile.style = b.dataset.style;
    renderStyleCards(); renderBrandCards();
  };
  $("#brandCards").onclick = (e) => {
    const b = e.target.closest("[data-brand]");
    if (!b) return;
    state.brand.main = b.dataset.brand;
    state.brand.secondary = state.brand.secondary.filter((x) => x !== state.brand.main);
    renderBrandCards();
    if (state.step === 6) drawSignPreview();
    recomposeAll();
    updateSummary();
  };
  $("#secondaryChips").onclick = (e) => {
    const b = e.target.closest("[data-sec]");
    if (!b) return;
    const arr = state.brand.secondary, k = b.dataset.sec, i = arr.indexOf(k);
    i >= 0 ? arr.splice(i, 1) : arr.push(k);
    renderBrandCards();
  };
  $("#tierCards").onclick = (e) => {
    const b = e.target.closest("[data-tier]");
    if (!b) return;
    state.brand.tier = b.dataset.tier;
    applyTier(state.brand.tier);
    renderTierCards();
    updateSummary();
    toast(`Đã chọn gói ${TIERS[state.brand.tier].label} — POSM được tick sẵn ở bước 5`);
  };

  // Items
  $("#itemTabs").onclick = (e) => { const b = e.target.closest("[data-tab]"); if (b) { state.itemTab = b.dataset.tab; renderItems(); } };
  $("#itemList").addEventListener("click", (e) => {
    const row = e.target.closest(".item");
    if (!row || e.target.disabled) return;
    const id = row.dataset.id;
    const d = e.target.closest("[data-d]");
    if (d) return setItemQty(id, (state.items[id]?.qty || 0) + +d.dataset.d);
    const s = e.target.closest("[data-s]");
    if (s) { state.items[id].status = s.dataset.s; itemsChanged(); }
  });
  $("#itemList").addEventListener("change", (e) => {
    const row = e.target.closest(".item");
    if (row && e.target.type === "number") setItemQty(row.dataset.id, +e.target.value);
  });
  $("#relayoutBtn").onclick = () => { state.plan = null; renderPlan(); updateSummary(); };

  // Kết quả
  $("#generateBtn").onclick = generate;
  $("#printBtn").onclick = async () => { await buildProposal(); window.print(); };

  // Cài đặt
  const dlg = $("#settings");
  $("#openSettings").onclick = () => {
    const sel = $("#imageModelSel");
    sel.innerHTML = IMAGE_MODELS.map(([id, l]) => `<option value="${id}">${esc(l)}</option>`).join("");
    const known = IMAGE_MODELS.some(([id]) => id === settings.imageModel);
    sel.value = known ? settings.imageModel : IMAGE_MODELS[0][0];
    $("#imageModelCustom").value = known ? "" : settings.imageModel;
    $("#visionModelSel").innerHTML = VISION_MODELS.map(([id, l]) => `<option value="${id}">${esc(l)}</option>`).join("");
    $("#visionModelSel").value = settings.visionModel;
    $("#keyStatus").textContent = hasKey() ? `Key: ${OPENROUTER_API_KEY.slice(0, 9)}…${OPENROUTER_API_KEY.slice(-4)} (từ key.js)` : "⚠️ Chưa có key — chạy node src/build-assets.mjs";
    dlg.showModal();
  };
  dlg.addEventListener("click", (e) => { if (e.target.hasAttribute("data-close")) dlg.close(); });
  dlg.addEventListener("close", () => {
    settings.imageModel = $("#imageModelCustom").value.trim() || $("#imageModelSel").value;
    settings.visionModel = $("#visionModelSel").value;
    saveSettings();
    renderGenEstimate();
  });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function init() {
  $("#regionSel").innerHTML = Object.entries(REGIONS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
  $("#roofSel").innerHTML = Object.entries(ROOFS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
  applyOutletDefaults(state.profile.type);
  applyTier(state.brand.tier);
  initEvents();
  renderAll();
  goStep(1);
  if (!hasKey()) toast("⚠️ Chưa có key OpenRouter — chạy: node src/build-assets.mjs", 6000);
}
init();
