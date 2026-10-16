# Concept Generator

Công cụ cho sale rep HEINEKEN Việt Nam: chụp ảnh quán thật → AI tạo **ảnh "After"** của chính quán đó với POSM của brand (bảng hiệu, mái hiên, dù, tủ mát, biển LED…), đúng không khí quán Việt Nam. Bảng hiệu được dán bằng code nên logo và tên quán tiếng Việt luôn đúng.

- Chạy thuần **HTML + JS**, không có backend. Gọi AI qua [OpenRouter](https://openrouter.ai).
- Đầu ra: ảnh **PNG**, xem so sánh Before / After ngay trên máy.
- Ý tưởng, phạm vi và quyết định kỹ thuật: xem [`IDEA.md`](IDEA.md).

## Cài đặt

Cần [Node.js](https://nodejs.org) (chỉ để chạy script đóng gói) và một key OpenRouter.

1. Tạo file `.env` từ `.env.example` rồi điền key:
   ```
   OPENROUTER_API_KEY=sk-or-v1-...
   ```
2. Đóng gói logo, ảnh sản phẩm, mẫu POSM và key:
   ```bash
   node src/build-assets.mjs
   ```
   Lệnh này sinh ra `src/assets.js` và `src/key.js`. Chạy lại mỗi khi đổi key, logo hoặc mẫu POSM.
3. Mở `index.html` bằng Chrome hoặc Edge (double-click là được). Cần có mạng.

`.env`, `src/key.js`, `src/assets.js` không được commit (xem `.gitignore`). Sau khi clone repo, làm lại bước 1–2.

## Dùng trên tablet

Tablet không mở được file HTML local, chọn một trong hai cách:

- **Qua Wi‑Fi từ laptop:** trong thư mục dự án chạy `npx --yes http-server -p 8000`, xem IP laptop bằng `ipconfig`, rồi trên tablet mở `http://<IP-laptop>:8000`.
- **Deploy Vercel:** từ thư mục gốc chạy `npx vercel --prod`. Lần đầu sẽ hỏi đăng nhập và liên kết project.

`.vercelignore` chỉ cho phép đưa lên `index.html` và `src/*.js`. `.env`, ảnh quán (`samples/`) và tài liệu brand (`assets/`) không bị deploy.

> **Lưu ý:** `src/key.js` được deploy cùng trang, ai có link đều đọc được key. Nên đặt **hạn mức tiền (credit limit)** cho key trên OpenRouter và không chia sẻ link.

## Cách dùng

| Bước | Nội dung |
|---|---|
| 1. Ảnh & thông tin | Upload nhiều ảnh (tối thiểu 1). Mỗi ảnh chọn **Mặt tiền / Bên trong** và tick **"Tạo thiết kế"** nếu muốn AI vẽ lại ảnh đó. Bấm **Phân tích ảnh** để AI tự điền tên quán, địa chỉ, SĐT, loại quán, món đặc trưng |
| 2. Mặt bằng | Kích thước quán, vỉa hè, cửa sau, mái che |
| 3. Loại hình & phong cách | Loại quán (gồm cả tạp hóa bán mang về), phong cách, thời điểm ngày / tối / khuya, có người trong ảnh hay không |
| 4. Brand & gói | Brand chính/phụ, gói POSM Đồng / Bạc / Vàng để tick sẵn POSM |
| 5. Chọn item | Đồ của quán và POSM, mỗi món có số lượng + Giữ / Thay mới / Thêm / Bỏ. Có sơ đồ mặt bằng 2D kéo thả |
| 6. Yêu cầu | Ghi chú, nội dung bảng hiệu (loại quán, món đặc trưng, địa chỉ, SĐT) + xem trước bảng hiệu |
| 7. Kết quả | Tạo 1–3 phương án / ảnh, so sánh Before / After, chỉnh 4 góc bảng hiệu nếu lệch, **Tải ảnh** PNG |

Chế độ **Nhanh** (góc trên) chỉ gồm bước 1, 3, 4, 7.

### Bên trong một lần tạo ảnh

1. **Tạo ảnh** — `bytedance-seed/seedream-5-0-flash` (~$0.02/ảnh, 15–25 giây): chỉnh sửa trên ảnh gốc, giữ khung hình, mặt bảng hiệu để trống. Gửi kèm logo, ảnh sản phẩm và mẫu POSM chuẩn (VD mái hiên, biển LED Tiger) làm tham chiếu.
2. **Dò bảng hiệu** — `google/gemini-3.5-flash` (~$0.005): tìm 4 góc bảng hiệu trên ảnh vừa tạo.
3. **Dán bảng hiệu bằng code** — vẽ logo thật, tên quán tiếng Việt, dòng cảnh báo 18+ rồi kéo theo phối cảnh. Tiger dùng mẫu **HIFLEX 4.0** (tỉ lệ 1:5–1:8).

Đổi model ở nút ⚙️ góc phải trên.

## Cấu trúc thư mục

```
index.html                 Giao diện + CSS
src/
  app.js                   Logic: wizard, gọi OpenRouter, dán bảng hiệu, sơ đồ 2D
  catalog.js               Brand, loại quán, phong cách, đồ đạc, POSM, gói, mẫu HIFLEX
  prompts.js               Prompt tạo ảnh ("không khí Việt Nam"), phân tích ảnh, dò bảng hiệu
  build-assets.mjs         Đóng gói assets → assets.js, .env → key.js
  assets.js, key.js        Tự sinh, không sửa tay, không commit
assets/
  brands/<brand>/          Logo + ảnh sản phẩm (heineken/{original,silver,zero}, tiger/{core,crystal,…}, larue, …)
  materials/               Tài liệu brand (UNTITLED 8.pptx — Tiger signage design)
    tiger-signage/         Mẫu HIFLEX 4.0, mái hiên (đã xoá chữ mẫu), biển LED
samples/                   Ảnh quán thật dùng để test
IDEA.md                    Ý tưởng, phạm vi, kỹ thuật, việc còn thiếu
```

## Lưu ý

- Giá POSM, hạn mức gói và sản lượng ước tính trong `src/catalog.js` là **số minh hoạ**. Bản demo vẫn còn phần chi phí và nút xuất proposal từ phiên bản trước, nằm ngoài phạm vi hiện tại (xem `IDEA.md`).
- Mã màu brand đang ước lượng từ logo / ảnh mẫu, chưa lấy từ brand guideline.
- AI có thể đọc sai dấu tên quán — kiểm tra ô tên quán trước khi tạo ảnh.
- AI vẫn có thể vẽ chữ brand nhỏ lên dù, poster, tủ mát; chỉ bảng hiệu chính là chắc chắn đúng.
