// ============================================================================
// Catalog: brand, loại quán, phong cách, đồ đạc của quán, POSM, gói hỗ trợ
// Giá POSM và hạn mức gói là SỐ MINH HỌA cho demo — thay bằng số thật của công ty.
// Kích thước w × d (mét) là diện tích chiếm chỗ trên sơ đồ (đã gồm chỗ ghế).
// ============================================================================

const BRANDS = {
  heineken:        { name: "Heineken",        color: "#0B7A33", accent: "#E4002B", text: "#FFFFFF", logoBg: "#FFFFFF", en: "Heineken (green #0B7A33 with red star, silver accents)" },
  heineken_silver: { name: "Heineken Silver", color: "#0B7A33", accent: "#B8BCC2", text: "#FFFFFF", logoBg: "#FFFFFF", en: "Heineken Silver (green and metallic silver, red star)" },
  heineken_00:     { name: "Heineken 0.0",    color: "#1F4E9C", accent: "#0B7A33", text: "#FFFFFF", logoBg: "#FFFFFF", en: "Heineken 0.0 non-alcoholic (blue #1F4E9C with green and red star)" },
  tiger:           { name: "Tiger",           color: "#1E4FA6", accent: "#F18A00", text: "#FFFFFF", logoBg: "#FFFFFF", en: "Tiger Beer (royal blue #1E4FA6, orange #F18A00, gold-and-white tiger)",
                     // Mẫu bảng hiệu HIFLEX 4.0 (assets/materials/UNTITLED 8.pptx). Màu ước lượng từ ảnh mẫu — thay bằng mã chuẩn khi có file gốc.
                     hiflex: { ratios: [5, 6, 7, 8], blue: "#2457B3", blueDark: "#163F8C", panel: "#DDE3EA", ink: "#14397D", products: ["tiger", "tiger_crystal"] } },
  tiger_crystal:   { name: "Tiger Crystal",   color: "#0A3A7A", accent: "#C9D6E3", text: "#FFFFFF", logoBg: "#FFFFFF", en: "Tiger Crystal (navy blue, icy silver-white, light blue)" },
  larue:           { name: "Larue",           color: "#0D4C92", accent: "#F7B500", text: "#FFFFFF", logoBg: "#FFFFFF", en: "Larue (blue #0D4C92 and golden yellow #F7B500, orange tiger)" },
  bia_viet:        { name: "Bia Việt",        color: "#D0121F", accent: "#F5B800", text: "#FFFFFF", logoBg: "#D0121F", en: "Bia Viet (red #D0121F, white, yellow star)" },
  strongbow:       { name: "Strongbow",       color: "#1A1A1A", accent: "#D4A84B", text: "#FFFFFF", logoBg: "#000000", en: "Strongbow apple cider (black, gold, apple green accents)" },
  edelweiss:       { name: "Edelweiss",       color: "#1B3E73", accent: "#C9A85C", text: "#FFFFFF", logoBg: "#FFFFFF", en: "Edelweiss wheat beer (deep blue #1B3E73, gold, white alpine)" },
  bivina:          { name: "Bivina",          color: "#C8102E", accent: "#F2B705", text: "#FFFFFF", logoBg: "#FFFFFF", en: "Bivina Export (red #C8102E, gold wheat, white)" },
};

const REGIONS = {
  bac:      "Miền Bắc",
  trung:    "Miền Trung",
  nam:      "Miền Nam (TP.HCM, Đông Nam Bộ)",
  mien_tay: "Miền Tây",
};

const OUTLET_TYPES = {
  nhau_binh_dan: { label: "Nhậu bình dân vỉa hè", en: "budget Vietnamese drinking eatery (quán nhậu bình dân)", sign: "QUÁN NHẬU" },
  oc_hai_san:    { label: "Ốc / hải sản",         en: "snail & seafood eatery (quán ốc, hải sản)",           sign: "ỐC – HẢI SẢN" },
  lau_nuong:     { label: "Lẩu / nướng",          en: "hotpot & barbecue restaurant (quán lẩu nướng)",       sign: "LẨU – NƯỚNG" },
  san_vuon:      { label: "Nhà hàng sân vườn",    en: "garden restaurant (nhà hàng sân vườn)",               sign: "NHÀ HÀNG SÂN VƯỜN" },
  tap_hoa:       { label: "Tạp hóa (bán mang về)", en: "take-away grocery store (tạp hóa) selling beer by can, 6-pack and 24-can case — no seating, nobody drinks on site", sign: "TẠP HÓA", offTrade: true },
  tap_hoa_nhau:  { label: "Tạp hóa kiêm nhậu",    en: "grocery shop that also serves beer at a few tables",  sign: "TẠP HÓA" },
  quan_com:      { label: "Quán cơm / quán ăn",   en: "rice & family eatery (quán cơm, quán ăn)",            sign: "QUÁN ĂN" },
};

const STYLES = {
  binh_dan:  { label: "Bình dân vỉa hè",      desc: "Bàn inox, ghế đẩu nhựa, đèn trắng",      swatch: ["#C9CDD2", "#D8352A", "#F4F4F4"], brands: ["tiger", "larue", "bia_viet"],
               en: "Budget street style: stainless tables, low plastic stools, white fluorescent light." },
  moc:       { label: "Mộc / sân vườn",       desc: "Tre, gỗ, đèn dây vàng, cây xanh",        swatch: ["#8B5E34", "#4C7A3A", "#F2C46D"], brands: ["larue", "bia_viet", "tiger"],
               en: "Rustic garden: bamboo, wood, thatch accents, warm string lights, lots of plants." },
  hien_dai:  { label: "Hiện đại / công nghiệp", desc: "Sắt đen, gỗ tối, tường xi măng, đèn thả", swatch: ["#2B2B2B", "#6B4A2E", "#9A9A9A"], brands: ["heineken", "tiger_crystal", "heineken_silver"],
               en: "Modern industrial: black steel, dark wood, exposed concrete, pendant lamps." },
  beer_club: { label: "Beer club sôi động",   desc: "Neon, TV lớn, nhạc, sân khấu",           swatch: ["#1B1446", "#00C2FF", "#FF2E88"], brands: ["heineken", "tiger", "strongbow"],
               en: "Lively beer club: neon accents, big TVs showing football, small stage, energetic." },
  gia_dinh:  { label: "Gia đình ấm cúng",     desc: "Bàn tròn, phòng riêng, ánh sáng ấm",     swatch: ["#B5651D", "#F3E1C7", "#7A2E1F"], brands: ["heineken", "heineken_00", "edelweiss"],
               en: "Cozy family restaurant: round tables, private rooms, warm soft lighting." },
  hai_san:   { label: "Hải sản miền biển",    desc: "Bể hải sản, tông xanh biển",             swatch: ["#0E5A8A", "#5FB3D9", "#F2F2F2"], brands: ["tiger", "larue", "bivina"],
               en: "Seafood: live seafood tanks at the front, blue tones, ice trays of fresh seafood." },
};

const CUSTOMERS = { cong_nhan: "Công nhân", van_phong: "Dân văn phòng", gia_dinh: "Gia đình", gioi_tre: "Giới trẻ", du_lich: "Khách du lịch", nhom_nu: "Nhóm nữ" };
const PEAKS     = { trua: "Trưa", toi: "Tối", khuya: "Khuya" };
const RENDER_TIMES = { ngay: "Ban ngày", toi: "Buổi tối", khuya: "Khuya" };
const ROOFS     = { none: "Không có", ton: "Mái tôn", bat_cuon: "Bạt cuộn", mai_hien: "Mái hiên di động" };

const TIERS = {
  dong: { label: "Đồng", limit: 10_000_000, minVolume: 50,  desc: "Bảng hiệu bạt + dù + vật phẩm trên bàn" },
  bac:  { label: "Bạc",  limit: 40_000_000, minVolume: 120, desc: "+ hộp đèn, mái hiên, tủ mát, standee" },
  vang: { label: "Vàng", limit: 100_000_000, minVolume: 300, desc: "+ neon, tủ mát 2 cửa, bàn ghế logo, backdrop" },
};
const TIER_ORDER = ["dong", "bac", "vang"];

// kind: dùng để xếp lên sơ đồ 2D. plan:false = chỉ có trong danh sách, không vẽ.
// zone: front (gần cửa) | back (cuối nhà) | dining (khu bàn) | sidewalk | wall
const ITEMS = [
  // ---------------- ĐỒ CỦA QUÁN ----------------
  { id: "ban_inox",     tab: "outlet", group: "Khu khách", label: "Bàn inox/nhựa vuông 70×70 (4 ghế đẩu)", en: "low square stainless/plastic table with 4 low plastic stools", kind: "table", w: 1.5, d: 1.5, seats: 4 },
  { id: "ban_go",       tab: "outlet", group: "Khu khách", label: "Bàn gỗ/sắt 4 người 120×70",              en: "wooden/metal table for 4 with chairs", kind: "table", w: 1.3, d: 2.0, seats: 4 },
  { id: "ban_tron",     tab: "outlet", group: "Khu khách", label: "Bàn tròn 8–10 người Ø1,4 m",             en: "large round table for 8-10 people", kind: "table", w: 2.6, d: 2.6, seats: 10, round: true },
  { id: "ban_lau",      tab: "outlet", group: "Khu khách", label: "Bàn lẩu/nướng có bếp (6 người)",          en: "hotpot/BBQ table with built-in portable stove for 6", kind: "table", w: 1.5, d: 2.2, seats: 6 },
  { id: "phong_vip",    tab: "outlet", group: "Khu khách", label: "Phòng VIP / vách ngăn",                   en: "private room with partition", kind: "table", w: 4.0, d: 3.0, seats: 10 },
  { id: "ghe_dau",      tab: "outlet", group: "Khu khách", label: "Ghế đẩu nhựa (bổ sung)",                  en: "extra low plastic stools", plan: false },

  { id: "quay_thu_ngan", tab: "outlet", group: "Quầy", label: "Quầy thu ngân", en: "cashier counter near the entrance", kind: "counter", zone: "front", w: 1.6, d: 0.7, required: true },
  { id: "may_pos",       tab: "outlet", group: "Quầy", label: "Máy POS + bảng QR", en: "POS machine and QR payment stand on the counter", plan: false },
  { id: "menu_board",    tab: "outlet", group: "Quầy", label: "Menu board treo tường", en: "menu board on the wall", plan: false },

  { id: "bep_gas",      tab: "outlet", group: "Bếp", label: "Bếp gas công nghiệp", en: "industrial gas stove", kind: "kitchen", zone: "back", required: "on" },
  { id: "bep_than",     tab: "outlet", group: "Bếp", label: "Bếp nướng than", en: "charcoal grill", kind: "kitchen", zone: "back" },
  { id: "hut_khoi",     tab: "outlet", group: "Bếp", label: "Máy hút khói", en: "smoke extractor hood", plan: false },
  { id: "ban_so_che",   tab: "outlet", group: "Bếp", label: "Bàn sơ chế inox + bồn rửa", en: "stainless prep table with sink", kind: "kitchen", zone: "back" },
  { id: "tu_dong",      tab: "outlet", group: "Bếp", label: "Tủ đông nguyên liệu", en: "chest freezer for ingredients", kind: "kitchen", zone: "back" },
  { id: "ke_chen",      tab: "outlet", group: "Bếp", label: "Kệ chén bát", en: "dish rack", plan: false },

  { id: "be_hai_san",   tab: "outlet", group: "Trưng bày món", label: "Bể hải sản sống", en: "live seafood tanks at the shopfront", kind: "display", zone: "front", w: 1.8, d: 0.7 },
  { id: "tu_kinh",      tab: "outlet", group: "Trưng bày món", label: "Tủ kính trưng bày món", en: "glass food display cabinet", kind: "display", zone: "front", w: 1.2, d: 0.6 },
  { id: "lo_quay",      tab: "outlet", group: "Trưng bày món", label: "Lò quay / xe đẩy", en: "rotisserie / food cart at the front", kind: "display", zone: "front", w: 1.0, d: 0.8 },
  { id: "ke_hang",      tab: "outlet", group: "Trưng bày món", label: "Kệ hàng tạp hóa", en: "grocery shelves stocked with goods", kind: "display", zone: "wall", w: 2.0, d: 0.5 },

  { id: "u_thung",      tab: "outlet", group: "Trưng bày món", label: "Ụ thùng bia ở cửa", en: "neat stack of beer cases (ụ thùng) by the entrance", kind: "display", zone: "front", w: 1.2, d: 0.8 },
  { id: "tu_mat_khac",  tab: "outlet", group: "Trưng bày món", label: "Tủ mát đang có (hãng khác)", en: "existing soft-drink fridge of another company", kind: "fridge", zone: "front", w: 0.7, d: 0.7 },
  { id: "kho",          tab: "outlet", group: "Hậu cần", label: "Kho hàng", en: "back storage area", kind: "storage", zone: "back", w: 1.5, d: 2.0 },
  { id: "khu_ket",      tab: "outlet", group: "Hậu cần", label: "Khu chứa két & vỏ chai", en: "stacked empty beer crates area", kind: "storage", zone: "back", w: 1.6, d: 1.2 },
  { id: "thung_xop_da", tab: "outlet", group: "Hậu cần", label: "Thùng xốp đá", en: "styrofoam ice box", plan: false },
  { id: "thung_rac",    tab: "outlet", group: "Hậu cần", label: "Thùng rác", en: "trash bin", plan: false },

  { id: "wc",           tab: "outlet", group: "Tiện ích", label: "Nhà vệ sinh + bồn rửa tay", en: "restroom with hand-wash sink", kind: "wc", zone: "back", w: 1.6, d: 1.6, required: "on" },
  { id: "quat_tuong",   tab: "outlet", group: "Tiện ích", label: "Quạt treo tường", en: "wall-mounted fans", plan: false },
  { id: "quat_hoi_nuoc",tab: "outlet", group: "Tiện ích", label: "Quạt hơi nước", en: "misting fans", plan: false },
  { id: "may_lanh",     tab: "outlet", group: "Tiện ích", label: "Máy lạnh", en: "air conditioners", plan: false },
  { id: "tv",           tab: "outlet", group: "Tiện ích", label: "TV 55\" (xem bóng đá)", en: "55-inch TV showing football", kind: "tv", zone: "wall", w: 1.3, d: 0.2 },
  { id: "loa",          tab: "outlet", group: "Tiện ích", label: "Loa", en: "speakers", plan: false },
  { id: "san_khau",     tab: "outlet", group: "Tiện ích", label: "Sân khấu nhạc sống mini", en: "small live-music stage", kind: "stage", zone: "dining", w: 2.5, d: 1.5 },

  { id: "cho_de_xe",    tab: "outlet", group: "Ngoài trời", label: "Chỗ để xe máy", en: "organised motorbike parking area in front", kind: "parking", zone: "sidewalk", w: 2.2, d: 2.0 },
  { id: "bat_cuon",     tab: "outlet", group: "Ngoài trời", label: "Bạt cuộn che mưa", en: "roll-down rain curtains", plan: false },
  { id: "chau_cay",     tab: "outlet", group: "Ngoài trời", label: "Chậu cây", en: "potted plants", plan: false },
  { id: "den_day",      tab: "outlet", group: "Ngoài trời", label: "Đèn dây trang trí", en: "warm string lights", plan: false },

  { id: "ban_tho",      tab: "outlet", group: "Văn hóa & an toàn", label: "Bàn thờ Thần Tài – Ông Địa", en: "small altar", kind: "altar", zone: "front", w: 0.5, d: 0.5, noPrompt: true }, // chỉ dùng cho sơ đồ 2D, không gửi cho AI
  { id: "binh_chua_chay", tab: "outlet", group: "Văn hóa & an toàn", label: "Bình chữa cháy + biển thoát hiểm", en: "fire extinguishers and exit sign", plan: false, required: true },
  { id: "camera",       tab: "outlet", group: "Văn hóa & an toàn", label: "Camera", en: "security cameras", plan: false },

  // ---------------- POSM CÔNG TY ----------------
  { id: "p_bang_hieu",  tab: "posm", group: "Mặt tiền", tier: "dong", price: 3_500_000,  label: "Bảng hiệu bạt in tên quán", en: "main shop signboard (printed flex, brand colours)", sign: true },
  { id: "p_hop_den",    tab: "posm", group: "Mặt tiền", tier: "bac",  price: 9_000_000,  label: "Hộp đèn bảng hiệu",         en: "main shop signboard as an illuminated lightbox", sign: true },
  { id: "p_neon",       tab: "posm", group: "Mặt tiền", tier: "vang", price: 6_000_000,  label: "Logo neon / chữ nổi",       en: "neon brand-shape light on the facade wall (no letters)" },
  { id: "p_mai_hien",   tab: "posm", group: "Mặt tiền", tier: "bac",  price: 5_000_000,  label: "Mái hiên / bạt có logo",    en: "retractable awning in brand colours" },
  { id: "p_day_co",     tab: "posm", group: "Mặt tiền", tier: "dong", price: 300_000,    label: "Dây cờ",                    en: "bunting flags in brand colours" },

  { id: "p_du",         tab: "posm", group: "Ngoài trời", tier: "dong", price: 1_200_000, label: "Dù có logo",         en: "large outdoor umbrellas in brand colours", kind: "umbrella", zone: "sidewalk", w: 2.5, d: 2.5 },
  { id: "p_ban_ghe",    tab: "posm", group: "Ngoài trời", tier: "vang", price: 2_500_000, label: "Bộ bàn ghế có logo (4 ghế)", en: "branded folding table set with 4 chairs", kind: "table", zone: "sidewalk", w: 1.5, d: 1.5, seats: 4 },
  { id: "p_bat_che",    tab: "posm", group: "Ngoài trời", tier: "vang", price: 2_000_000, label: "Bạt che có logo",     en: "branded side shade cloth" },

  { id: "p_tu_mat_1",   tab: "posm", group: "Lạnh", tier: "bac",  price: 12_000_000, label: "Tủ mát 1 cửa",          en: "single-door branded beer fridge with glass door", kind: "fridge", zone: "front", w: 0.7, d: 0.7, cans: 300 },
  { id: "p_tu_mat_2",   tab: "posm", group: "Lạnh", tier: "vang", price: 20_000_000, label: "Tủ mát 2 cửa",          en: "double-door branded beer fridge with glass doors", kind: "fridge", zone: "front", w: 1.3, d: 0.7, cans: 600 },
  { id: "p_thung_da",   tab: "posm", group: "Lạnh", tier: "bac",  price: 800_000,    label: "Thùng đá có logo",      en: "branded ice cooler box", kind: "cooler", zone: "front", w: 0.7, d: 0.5 },
  { id: "p_header_tu", tab: "posm", group: "Lạnh", tier: "bac",  price: 1_500_000, label: "Header đèn trên nóc tủ",  en: "illuminated brand header panel on top of the fridge (no text)" },
  { id: "p_sticker_tu", tab: "posm", group: "Lạnh", tier: "dong", price: 150_000,  label: "Sticker cửa tủ",          en: "brand-colour stickers on the fridge door frame" },
  { id: "p_xo_da",      tab: "posm", group: "Lạnh", tier: "dong", price: 120_000,    label: "Xô đá",                  en: "branded ice buckets on tables" },

  { id: "p_ly",         tab: "posm", group: "Trên bàn", tier: "dong", price: 25_000,  label: "Ly có logo",            en: "branded beer glasses" },
  { id: "p_khay",       tab: "posm", group: "Trên bàn", tier: "bac",  price: 80_000,  label: "Khay",                   en: "branded serving trays" },
  { id: "p_lot_ly",     tab: "posm", group: "Trên bàn", tier: "dong", price: 5_000,   label: "Lót ly",                 en: "branded coasters" },
  { id: "p_menu",       tab: "posm", group: "Trên bàn", tier: "dong", price: 60_000,  label: "Menu / kẹp menu có logo", en: "branded menu holders" },
  { id: "p_hop_giay",   tab: "posm", group: "Trên bàn", tier: "bac",  price: 40_000,  label: "Ống đũa / hộp giấy có logo", en: "branded chopstick holders and tissue boxes" },

  { id: "p_standee",    tab: "posm", group: "Truyền thông", tier: "bac",  price: 900_000,   label: "Standee",             en: "promotional standee near the entrance", kind: "standee", zone: "front", w: 0.6, d: 0.4 },
  { id: "p_poster",     tab: "posm", group: "Truyền thông", tier: "dong", price: 50_000,    label: "Poster",              en: "brand posters on the walls" },
  { id: "p_tranh",      tab: "posm", group: "Truyền thông", tier: "vang", price: 1_500_000, label: "Tranh treo tường",     en: "large framed brand artwork on the wall" },
  { id: "p_backdrop",   tab: "posm", group: "Truyền thông", tier: "vang", price: 4_000_000, label: "Backdrop sự kiện / góc check-in", en: "brand photo backdrop / check-in corner", kind: "backdrop", zone: "wall", w: 2.5, d: 0.3 },
  { id: "p_bang_km",    tab: "posm", group: "Truyền thông", tier: "bac",  price: 300_000,   label: "Bảng khuyến mãi",      en: "promotion board" },

  { id: "p_ke",         tab: "posm", group: "Trưng bày", tier: "bac",  price: 2_500_000, label: "Kệ trưng bày sản phẩm", en: "branded product display shelf", kind: "shelf", zone: "front", w: 1.0, d: 0.4 },
  { id: "p_shelf_strip", tab: "posm", group: "Trưng bày", tier: "dong", price: 80_000, label: "Thanh giá kệ có logo", en: "brand-colour shelf price strips on the shelf edges" },
  { id: "p_vay_u",      tab: "posm", group: "Trưng bày", tier: "bac",  price: 600_000, label: "Váy ụ thùng",        en: "brand-colour skirt wrapped around the stacked beer cases" },
  { id: "p_wobbler",    tab: "posm", group: "Truyền thông", tier: "dong", price: 20_000, label: "Wobbler / shelf talker", en: "small brand-colour wobblers on shelves" },
  { id: "p_thap_lon",   tab: "posm", group: "Trưng bày", tier: "vang", price: 500_000,   label: "Tháp lon / thùng xếp mẫu", en: "tower of stacked beer cases/cans as display" },

  { id: "p_dong_phuc",  tab: "posm", group: "Khác", tier: "vang", price: 150_000,   label: "Đồng phục / tạp dề nhân viên", en: "staff wearing branded aprons/t-shirts" },
  { id: "p_den",        tab: "posm", group: "Khác", tier: "vang", price: 700_000,   label: "Đèn trang trí có logo",  en: "branded pendant lamps" },
];
const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// Đồ mặc định theo loại quán (số lượng)
const OUTLET_DEFAULTS = {
  _common:       { quay_thu_ngan: 1, may_pos: 1, binh_chua_chay: 1, thung_rac: 1, cho_de_xe: 1 },
  _onTrade:      { bep_gas: 1, ban_so_che: 1, tu_dong: 1, ke_chen: 1, wc: 1, khu_ket: 1, thung_rac: 2 },
  tap_hoa:       { ke_hang: 4, u_thung: 1, tu_mat_khac: 1, kho: 1, quat_tuong: 1, camera: 1 },
  nhau_binh_dan: { ban_inox: 10, ghe_dau: 8, quat_tuong: 4, tv: 1, thung_xop_da: 2, menu_board: 1, bat_cuon: 1 },
  oc_hai_san:    { ban_inox: 8, ghe_dau: 8, be_hai_san: 1, quat_tuong: 4, tv: 1, thung_xop_da: 2, menu_board: 1 },
  lau_nuong:     { ban_lau: 8, bep_than: 1, hut_khoi: 1, quat_hoi_nuoc: 2, tv: 1, menu_board: 1 },
  san_vuon:      { ban_go: 10, ban_tron: 2, den_day: 1, chau_cay: 8, tv: 2, loa: 1, san_khau: 1, quat_hoi_nuoc: 4 },
  tap_hoa_nhau:  { ke_hang: 3, ban_inox: 4, ghe_dau: 4, quat_tuong: 2, thung_xop_da: 1 },
  quan_com:      { ban_go: 8, tu_kinh: 1, quat_tuong: 4, may_lanh: 1, menu_board: 1 },
};

// Gói POSM mặc định (số lượng) — gói cao hơn bao gồm gói thấp hơn
const TIER_PACKAGES = {
  dong: { p_bang_hieu: 1, p_du: 2, p_xo_da: 6, p_ly: 48, p_lot_ly: 100, p_menu: 6, p_poster: 4, p_day_co: 1 },
  bac:  { p_hop_den: 1, p_bang_hieu: 0, p_mai_hien: 1, p_tu_mat_1: 1, p_thung_da: 1, p_standee: 1, p_khay: 6, p_hop_giay: 10, p_bang_km: 1, p_du: 4 },
  vang: { p_neon: 1, p_tu_mat_2: 1, p_tu_mat_1: 0, p_ban_ghe: 4, p_tranh: 2, p_backdrop: 1, p_thap_lon: 1, p_dong_phuc: 6, p_den: 4, p_ly: 96 },
};

// Gói POSM cho tạp hóa bán mang về: bỏ đồ trên bàn, thêm đồ cho tủ/kệ/ụ
const OFFTRADE_PACKAGES = {
  dong: { p_bang_hieu: 1, p_du: 1, p_poster: 4, p_day_co: 1, p_sticker_tu: 1, p_shelf_strip: 6, p_wobbler: 10 },
  bac:  { p_hop_den: 1, p_bang_hieu: 0, p_mai_hien: 1, p_tu_mat_1: 1, p_header_tu: 1, p_vay_u: 1, p_standee: 1, p_bang_km: 1, p_ke: 1 },
  vang: { p_neon: 1, p_tu_mat_2: 1, p_tu_mat_1: 0, p_thap_lon: 1, p_ke: 2 },
};

const STATUS = { keep: "Giữ", replace: "Thay mới", add: "Thêm", remove: "Bỏ" };

const fmtVND = (n) => (n || 0).toLocaleString("vi-VN") + " ₫";
const tierIndex = (t) => TIER_ORDER.indexOf(t);

