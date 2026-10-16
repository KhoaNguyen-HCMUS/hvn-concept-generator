// Đóng gói logo + ảnh sản phẩm thành data URI (assets.js) và key OpenRouter từ .env (key.js)
// để index.html chạy trực tiếp bằng file:// mà không bị lỗi CORS / canvas "tainted".
// Chạy: node src/build-assets.mjs   (từ thư mục concept-generator)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const A = (p) => path.join(ROOT, "assets", "brands", p);

const BRAND_FILES = {
  heineken:        { logo: "heineken/LOGO HNK MOI 2016 xanh.png",  product: "heineken/heineken.png" },
  heineken_silver: { logo: "heineken/HeinekenSilver-02.png",       product: "heineken/heineken-silver.png" },
  heineken_00:     { logo: "heineken/HNK00-02.png",                product: "heineken/heineken-00.png" },
  tiger:           { logo: "tiger/core/RGB_TIG_CORE_ZEN_MASTERLOGO_FLAT_PRIMARY.png", product: "tiger/core/tiger_1.png" },
  tiger_crystal:   { logo: "tiger/crystal/RGB_TIG_CRYSTAL_ZEN_MASTERLOGO_FLAT_EXTREME_HORI.png", product: "tiger/crystal/tiger-crystal_1.png" },
  larue:           { logo: "larue/Untitled design.jpg",            product: "larue/larue-special.png" },
  bia_viet:        { logo: "bia-viet/BV2.0-logo_Full Color (1).jpg", product: "bia-viet/bia-viet_20230706.png" },
  strongbow:       { logo: "strongbow/Untitled design.jpg",        product: "strongbow/strongbow-20221130.png" },
  edelweiss:       { logo: "edelweiss/Untitled design.jpg",        product: "edelweiss/edelweiss.png" },
  bivina:          { logo: "bivina/Untitled design.jpg",           product: "bivina/bivina-export.png" },
};

// Mẫu POSM chuẩn của brand (từ assets/materials/), gửi kèm cho AI làm ảnh tham chiếu khi chọn POSM đó
const M = (p) => path.join(ROOT, "assets", "materials", p);
const POSM_REF_FILES = {
  tiger: {
    p_mai_hien: { file: "tiger-signage/awning-blank.png", label: "official Tiger awning design (the blank white panel is where the shop name goes — keep it blank)" },
    p_neon:     { file: "tiger-signage/led-signage.jpg", label: "official Tiger LED signage (shape and glow only, ignore the brick wall)" },
  },
};
// Mẫu bảng hiệu chuẩn hiển thị cạnh bản xem trước ở bước 6
const SIGN_SAMPLE_FILES = { tiger: "tiger-signage/hiflex-4.0-ratios.jpg" };

const dataUri = (file) => {
  const ext = path.extname(file).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
};

const out = {};
for (const [id, f] of Object.entries(BRAND_FILES)) {
  out[id] = { logo: dataUri(A(f.logo)), product: dataUri(A(f.product)), posmRefs: {} };
  for (const [posm, r] of Object.entries(POSM_REF_FILES[id] || {})) {
    if (fs.existsSync(M(r.file))) out[id].posmRefs[posm] = { label: r.label, url: dataUri(M(r.file)) };
  }
  if (SIGN_SAMPLE_FILES[id] && fs.existsSync(M(SIGN_SAMPLE_FILES[id]))) out[id].signSample = dataUri(M(SIGN_SAMPLE_FILES[id]));
}
const dir = path.join(ROOT, "src");
fs.writeFileSync(path.join(dir, "assets.js"), "// Tự sinh bởi build-assets.mjs — không sửa tay\nconst BRAND_ASSETS = " + JSON.stringify(out) + ";\n");

// Key lấy từ biến môi trường OPENROUTER_API_KEY, hoặc file .env ở thư mục concept-generator
function readEnvKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY.trim();
  const envFile = path.join(ROOT, ".env");
  if (!fs.existsSync(envFile)) return "";
  const m = fs.readFileSync(envFile, "utf8").match(/^\s*OPENROUTER_API_KEY\s*=\s*["']?([^"'\r\n#]+)["']?/m);
  return m ? m[1].trim() : "";
}
const key = readEnvKey();
if (key) {
  fs.writeFileSync(path.join(dir, "key.js"), `// Tự sinh từ .env — CHỈ DÙNG LOCAL, không commit file này\nconst OPENROUTER_API_KEY = ${JSON.stringify(key)};\n`);
}
console.log("OK: assets.js", (fs.statSync(path.join(dir, "assets.js")).size / 1e6).toFixed(1) + " MB", key ? "+ key.js" : "(chưa có OPENROUTER_API_KEY trong .env — copy .env.example thành .env rồi điền key)");
