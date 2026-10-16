# Concept Generator: Tạo ảnh thiết kế quán bằng AI cho Sale Rep Heineken Việt Nam

## 1. Mục tiêu

- **Người dùng:** sale rep của HEINEKEN Việt Nam (Heineken, Heineken Silver, Heineken 0.0, Tiger, Tiger Crystal, Larue, Bia Việt, Bivina, Edelweiss, Strongbow).
- **Vấn đề:** khi đề nghị hợp tác trưng bày, chủ quán khó hình dung quán của mình sẽ trông thế nào khi có POSM (bảng hiệu, dù, bạt, tủ mát, kệ…).
- **Tính năng chính:** sale rep chụp ảnh quán thật → AI tạo **ảnh "After"** của chính quán đó với POSM của brand, giữ nguyên kết cấu nhà và đúng không khí quán Việt Nam.
- **Đầu ra:** ảnh **PNG** (ảnh After đã dán bảng hiệu thật), xem so sánh Before/After ngay trên máy.
- **Ngoài phạm vi:** proposal, chi phí, hợp đồng, cam kết sản lượng.

## 2. Dữ liệu hiện có

### `samples/` — ảnh quán thật để test
- Khoảng 60 ảnh thật, tên dạng `A00x_TestcaseY_Z`: mặt tiền tạp hóa, quán nhậu, quán ốc, nhà hàng sân vườn.
- Nhiều quán đang treo bảng của hãng khác (Lạc Việt, Tuborg Ice) hoặc bảng cũ.
- **Cặp Before/After thật** (`A002_Testcase2_1`: Tuborg Ice → hộp đèn Tiger; `A001_Testcase2_1`: mặt tiền Tiger ban đêm) → dùng làm chuẩn so sánh chất lượng ảnh AI.
- **A005 không phải quán** (RMIT, Parc Mall) → ca kiểm tra AI có nhận ra ảnh không hợp lệ.
- Bảng hiệu thật luôn có dòng **"Người dưới 18 tuổi không được uống rượu, bia"**.

### `assets/materials/` — tài liệu brand
- `UNTITLED 8.pptx` — **TIGER SIGNAGE DESIGN**: 3 ảnh, đã tách ra `assets/materials/tiger-signage/`:
  - `hiflex-4.0-ratios.jpg`: mẫu bảng hiệu bạt **HIFLEX 4.0** (thiết kế hiện hành) ở 4 tỉ lệ chuẩn **1:5, 1:6, 1:7, 1:8**.
  - `awning.png`: mẫu mái hiên Tiger. `awning-blank.png` là bản đã xoá chữ tên quán mẫu ("TẠP HÓA HỒNG KIM BẢO") để AI không chép theo.
  - `led-signage.jpg`: mẫu biển LED Tiger ("no change"), thu nhỏ còn 1024 px.

### `assets/brands/` — logo & ảnh sản phẩm (mỗi brand 1 thư mục: `bia-viet`, `bivina`, `edelweiss`, `heineken/{original,silver,zero}`, `larue`, `strongbow`, `tiger/{core,crystal,platinum,soju}`)
- Logo của 10 brand (nhiều biến thể cho Heineken và Tiger) và **1 ảnh chai/lon cho mỗi brand**.
- Chưa có ảnh POSM thật (dù, bạt, hộp đèn, tủ mát…) và chưa có ảnh từng SKU.

## 3. Luồng sử dụng

```
① Upload ảnh quán (nhiều ảnh, tối thiểu 1)
   Mỗi ảnh: chọn Mặt tiền / Bên trong, tick "Tạo thiết kế" nếu muốn AI vẽ lại
        │
        ▼
② (Tuỳ chọn) AI phân tích ảnh
   Ảnh có phải quán không · loại quán · phong cách · tên, địa chỉ, SĐT
   brand đang có / đối thủ · đồ đang có · ảnh nào là mặt tiền / bên trong
        │
        ▼
③ Sale rep chọn: loại hình, phong cách, thời điểm (ngày/tối/khuya),
   brand chính/phụ, POSM và đồ của quán muốn có trong ảnh, yêu cầu đặc biệt
        │
        ▼
④ AI tạo ảnh After từ từng ảnh được tick (1–3 phương án/ảnh)
        │
        ▼
⑤ Code dán bảng hiệu thật (logo + tên quán tiếng Việt + cảnh báo 18+)
   lên vị trí bảng hiệu, sale rep chỉnh 4 góc nếu lệch
        │
        ▼
⑥ So sánh Before/After · tạo lại · lưu PNG
```

## 4. Khó nhất: logo và chữ tiếng Việt

Model sinh ảnh hay làm méo logo và sai dấu tiếng Việt. Cách xử lý:

1. **AI vẽ bố cục:** bảng hiệu, bạt, dù, tủ mát đúng phối cảnh và ánh sáng, nhưng **mặt bảng hiệu để trống** (chỉ màu brand).
2. **Code dán phần chữ:** model đọc ảnh dò 4 góc bảng hiệu → code vẽ mặt bảng hiệu (logo PNG thật, loại quán, tên quán, địa chỉ, SĐT, dòng cảnh báo 18+) → kéo theo phối cảnh (homography) dán lên ảnh. Buổi tối/khuya có thêm hiệu ứng hộp đèn phát sáng.
3. **Sale rep chỉnh tay** 4 góc nếu dò lệch, bật/tắt bảng hiệu dán.

**Mẫu bảng hiệu theo brand:**
- **Tiger** dùng mẫu **HIFLEX 4.0**: khối xanh bên trái (logo + chai Tiger & Tiger Crystal, dòng cảnh báo nhỏ dưới logo), cạnh chéo, panel xám sáng bên phải với loại quán, **TÊN QUÁN** (chữ đứng hẹp Barlow Condensed), "CHUYÊN: …", "ĐỊA CHỈ: … – ĐT: …". Tỉ lệ mặt bảng hiệu tự chọn mức gần nhất trong 1:5–1:8; prompt yêu cầu AI dựng khung bảng hiệu theo tỉ lệ này. Mã màu đang ước lượng từ ảnh mẫu (`BRANDS.tiger.hiflex` trong `catalog.js`).
- **Các brand khác** dùng mẫu chung: ô logo + nền màu brand + chữ trắng, có thêm dòng "Chuyên" nếu có.
- Ô **"Chuyên"** (món/hàng đặc trưng) ở bước 6; bước phân tích ảnh tự đọc từ bảng hiệu cũ.

**Mẫu POSM chuẩn làm ảnh tham chiếu:** khi sale rep chọn POSM có mẫu chuẩn (Tiger: mái hiên, biển LED), ảnh mẫu được gửi kèm với nhãn mô tả; prompt cho phép AI vẽ đúng hình brand trên các POSM này nhưng để trống vùng tên quán.

Lưu ý khi dò bảng hiệu: yêu cầu model trả **4 góc có tên** (`top_left`, `top_right`…) với x/y rõ ràng. Một số lần model trả `[y, x]` → code tự đảo lại nếu bảng hiệu ra dọc (bảng hiệu luôn ngang).

## 5. Loại hình quán

| Loại hình | Điểm nhấn trong ảnh |
|---|---|
| Nhậu bình dân vỉa hè | Bàn inox, ghế đẩu nhựa, dù, bàn tràn ra vỉa hè |
| Ốc / hải sản | Bể hải sản ở mặt tiền, tông xanh biển |
| Lẩu / nướng | Bàn có bếp, hút khói |
| Nhà hàng sân vườn | Bàn gỗ dưới tán cây, đèn dây, sân khấu/TV |
| Quán cơm / quán ăn | Bàn gỗ, tủ kính món |
| Tạp hóa kiêm nhậu | Kệ hàng phía trong, vài bàn phía ngoài |
| **Tạp hóa (bán mang về)** | **Không bàn ghế, không người uống tại chỗ.** Làm nổi tủ mát nhìn thấy từ đường, ụ thùng ở cửa, khối bia trên kệ, bảng giá. Người (nếu có) là khách mua lốc/thùng ở quầy |

## 6. Sale rep chọn những gì

| Bước | Nội dung |
|---|---|
| 1. Ảnh & thông tin | Upload nhiều ảnh. Tên quán, địa chỉ, SĐT (in lên bảng hiệu), khu vực |
| 2. Mặt bằng | Rộng × sâu, vỉa hè, cửa sau, mái che |
| 3. Loại hình & phong cách | Loại hình (mục 5), phong cách (bình dân, mộc/sân vườn, hiện đại, beer club, gia đình, hải sản), khách chính, thời điểm render, có người trong ảnh không |
| 4. Brand | Brand chính (có gợi ý theo phong cách + khu vực), brand phụ, gói POSM Đồng/Bạc/Vàng để tick sẵn POSM nhanh |
| 5. Item | 2 tab **Đồ của quán** và **POSM**, mỗi món có số lượng + trạng thái Giữ / Thay mới / Thêm / Bỏ |
| 6. Yêu cầu đặc biệt | Không dời bể hải sản, giữ bảng hiệu cũ, không dùng vỉa hè, ghi chú. Thiết lập bảng hiệu (dòng loại quán, bố cục logo trái/phải, hiện địa chỉ/SĐT) |
| 7. Kết quả | Tạo ảnh, so sánh Before/After, chỉnh 4 góc, tạo lại, lưu PNG |

- **Chế độ Nhanh** chỉ gồm bước 1, 3, 4, 7. Mọi thứ khác lấy mặc định theo loại hình.
- Danh mục đồ và POSM nằm trong `src/catalog.js`, đổi không cần sửa giao diện.
- Phần phụ trợ trong demo: **sơ đồ mặt bằng 2D** (code tự xếp + kéo thả + cảnh báo bố trí) giúp sale rep cân số lượng item trước khi tạo ảnh.

## 7. Prompt: không khí và văn hóa Việt Nam

Prompt đầy đủ nằm ở `src/prompts.js`. Nguyên tắc:

- **Giữ ảnh thật:** chỉnh sửa trên ảnh, giữ kết cấu nhà, góc chụp, phố xung quanh. Ảnh ra trông như chụp điện thoại, không bóng bẩy kiểu 3D.
- **Chất Việt Nam đời thường:** nhà ống, cửa cuốn, mái tôn, bạt cuộn, xe máy đậu trước quán, dây điện, cây bàng/dầu/me, bàn inox, ghế đẩu nhựa, xô đá, két bia, quạt hơi nước, TV bóng đá, đèn huỳnh quang hoặc đèn dây vàng. Tránh pub phương Tây, izakaya, quán Hàn, chữ Hán, nón lá/áo dài rập khuôn.
- **Theo vùng miền:** Bắc (bia hơi, ghế thấp), Trung (hải sản ven biển), Nam (nhậu Sài Gòn tràn vỉa hè), miền Tây (sông nước, mái tôn, dừa).
- **Theo phong cách và thời điểm** (ngày / tối / khuya).
- **Thương hiệu:** chỉ brand được chọn, không logo đối thủ, mặt bảng hiệu để trống cho code dán.
- **Tuân thủ:** không người dưới tuổi, không say xỉn, không uống khi lái xe. *Cần pháp chế / brand team duyệt lại.*
- Prompt gồm phần cố định (`SYSTEM_PROMPT`) + phần ghép theo lựa chọn (`buildContext()`), ghép chung vào tin nhắn `user` vì một số model bỏ qua role `system`.

## 8. Kỹ thuật

### Kiến trúc
- **Thuần HTML + JS, không backend**, chạy local bằng cách mở `index.html` ở thư mục gốc (file://); code JS nằm trong `src/`. Hướng dẫn: `README.md`.
- Gọi **OpenRouter** trực tiếp từ trình duyệt. Key đặt trong `.env` (`OPENROUTER_API_KEY=...`, mẫu ở `.env.example`) → `node src/build-assets.mjs` sinh ra `key.js`; `.env`, `key.js`, `assets.js` nằm trong `.gitignore` (chỉ dùng local, không chia sẻ).
- Logo/ảnh sản phẩm đóng gói thành data URI trong `assets.js` để canvas không bị lỗi bảo mật khi chạy file://.
- Không tự train model. Khi có nhiều cặp Before/After thật mới cân nhắc fine-tune (LoRA) một model chỉnh sửa ảnh mã nguồn mở.

### Model (11/10/2026)
| Việc | Model | Ghi chú |
|---|---|---|
| Tạo ảnh | `bytedance-seed/seedream-5-0-flash` | ~$0.02/ảnh, 15–25 giây, ảnh 2304×1728. Chỉ trả ảnh → gửi `modalities: ["image"]` |
| Phân tích ảnh, dò bảng hiệu | `google/gemini-3.5-flash` | ~$0.005/lần, dùng `response_format: json_object` |
| Dự phòng tạo ảnh | Seedream 5.0 Pro, Gemini 3.1 Flash Image (~$0.07/ảnh, gửi `modalities: ["image","text"]`) | Đổi ở nút ⚙️ |

### Lưu ý đã gặp
- **Phải gửi `image_config.aspect_ratio`** theo tỉ lệ ảnh gốc, nếu không model đổi khung hình và Before/After không khớp.
- **JSON từ model** đôi khi kèm chữ thừa → chỉ lấy object JSON đầu tiên.
- **Đường dẫn trên Windows:** dùng `fileURLToPath` trong script Node.
- Seedream đôi khi tự vẽ logo lên bảng hiệu dù đã dặn để trống → bảng hiệu dán bằng code sẽ che lên.
- AI vẫn có thể vẽ chữ brand nhỏ lên dù, poster, tủ mát. Chỉ bảng hiệu chính là chắc chắn đúng.

### Đầu ra
- Ảnh After tải về dạng **PNG** (đã dán bảng hiệu), tên file `ten-quan_mat-tien_pa1.png`.

## 9. Hướng dẫn chụp ảnh cho sale rep

- **Mặt tiền chính diện** (quan trọng nhất): đứng bên kia đường, cầm ngang máy, thấy trọn bảng hiệu, mái hiên, vỉa hè.
- **Cận cảnh bảng hiệu / danh thiếp:** để AI đọc đúng tên, địa chỉ, SĐT.
- **Bên trong, từ cửa nhìn vào:** thấy hết chiều sâu quán.
- Thêm nếu có: góc chéo 45°, vỉa hè, khu quầy/tủ mát, mặt tiền buổi tối.
- Mẹo: không zoom, không dùng góc rộng 0.5×, đủ sáng, đợi lúc ít xe chắn, hạn chế chụp rõ mặt người.

## 10. Hướng phát triển (tập trung vào ảnh)

| Ưu tiên | Tính năng | Ghi chú |
|---|---|---|
| Cao | **Tủ mát & kệ tạp hóa:** AI vẽ tủ/kệ trống → code dán ảnh lon/chai thật theo sơ đồ xếp hàng | Cần ảnh từng SKU nhìn thẳng, nền trong suốt + thông số tủ. Quy tắc xếp (SKU ưu tiên ngang tầm mắt, xếp khối theo brand) cần trade marketing xác nhận |
| Cao | Kiểm tra ảnh sau khi tạo | Model đọc ảnh tự soát: còn logo đối thủ? chữ méo? kết cấu nhà bị đổi? → cảnh báo hoặc tạo lại |
| Trung bình | Dán thêm logo thật lên dù, mái hiên, header tủ | Cùng kỹ thuật dán bảng hiệu |
| Trung bình | Ảnh POSM thật làm tham chiếu | Gửi kèm ảnh dù, hộp đèn, tủ mát thật để AI vẽ đúng mẫu |
| Trung bình | Tạo nhiều phương án theo phong cách / brand khác nhau trong 1 lần | So sánh nhanh cho chủ quán |
| Thấp | Fine-tune model | Khi có hàng trăm cặp Before/After thật |

## 11. Còn thiếu / cần xác nhận

- [ ] **Ảnh 2 lon Tiger Lager + Tiger Crystal nền trong suốt** cho bảng hiệu HIFLEX (đang tạm dùng ảnh chai).
- [ ] **Logo Tiger dạng ngang** (hổ bên trái, chữ Tiger bên phải) như trong mẫu HIFLEX; hiện chỉ có logo dạng đứng.
- [ ] File gốc mẫu HIFLEX 4.0 (AI/PDF) để lấy đúng mã màu và font.
- [ ] Mẫu bảng hiệu / POSM chuẩn của các brand khác (Heineken, Larue, Bia Việt…).
- [ ] Ảnh POSM thật cho từng brand (dù, bạt, hộp đèn, tủ mát, kệ).
- [ ] Danh mục SKU + ảnh packshot nền trong suốt (cho tính năng tủ mát).
- [ ] Mã màu HEX chính xác của từng brand từ brand guideline (hiện là ước lượng từ logo).
- [ ] Pháp chế / brand team duyệt phần tuân thủ trong prompt.
- [ ] Ảnh tủ mát, kệ tạp hóa và ảnh bên trong quán thật để test (bộ ảnh hiện tại chủ yếu là mặt tiền).
- [ ] Quy ước tên ảnh `A00x_TestcaseY_Z` nghĩa là gì.
- [ ] Demo hiện vẫn còn phần chi phí POSM, sản lượng ước tính và nút xuất proposal từ bản trước → gỡ ra cho khớp phạm vi mới.

## 12. Kiểm tra chất lượng ảnh

- Chạy cùng một ảnh với nhiều vùng miền × thời điểm, xem không khí có đổi đúng không.
- So với ảnh After thật (`A001_Testcase2_1`, `A002_Testcase2_1`): ảnh AI có "giống ngoài đời" không.
- Checklist mỗi ảnh: kết cấu nhà giữ nguyên? khung hình khớp ảnh gốc? có logo đối thủ? chữ méo? bảng hiệu dán đúng chỗ? có người trông dưới tuổi?
- Kết quả đã test (Seedream 5.0 Flash): quán nhậu Thuận Nguyên (A003), tạp hóa Phúc Anh (A001), tạp hóa Vũ Phương (A004) — giữ khung hình, đúng không khí, bảng hiệu dán đúng sau khi sửa lỗi đảo tọa độ.
