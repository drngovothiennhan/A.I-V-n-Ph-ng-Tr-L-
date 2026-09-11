# A.I Văn phòng — Drive Brain Runtime production

## Mục tiêu

Drive là kho knowledge canonical nhưng **không phải dependency bắt buộc để hội thoại hoạt động**. Khi Drive chưa khả dụng, Orchestrator tiếp tục dùng Gemini + Google Search/public sources. Tài liệu local chỉ được dùng khi người dùng gọi đích danh file local/upload.

Knowledge production chỉ đọc các scope:

- `02_APPROVED` — ground truth ưu tiên cao nhất
- `01_KNOWLEDGE`
- `03_TEMPLATES`
- `04_SKILLS`

`00_INBOX`, `05_TRAINING`, `06_OUTPUTS`, `07_ARCHIVE` không được dùng làm nguồn production mặc định.

Canary bắt buộc sau khi cấu hình: `DBR-CANARY-2026-09-10` trong `02_APPROVED`.

---

## Chọn MỘT trong hai provider

### A. Google Service Account readonly — khuyến nghị

Đây là phương án ít thành phần hơn, không cần Apps Script/Web App và không cần `DRIVE_BRAIN_TOKEN`.

1. Trong Google Cloud Console, tạo Service Account cho A.I Văn phòng và bật Google Drive API cho project.
2. Tạo JSON key của Service Account. **Không commit JSON vào GitHub và không đặt trong frontend.**
3. Lấy `client_email` trong JSON.
4. Share thư mục Drive root A.I Văn phòng `1q8fnN4-WYFlbGXUkRAWj8uqudNBW4qG0` cho `client_email` với quyền **Viewer**.
5. Trong Vercel Environment Variables thêm:
   - `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` = toàn bộ JSON key
   - áp dụng cho Production; Preview nếu cần kiểm thử preview.
6. Redeploy backend.
7. Mở ứng dụng → `⚙ Runtime` → `Kiểm tra Grounding + Canary`.
8. Chỉ coi hoàn tất khi `Drive Approved canary` báo **Đã xác minh**.

Runtime Service Account chỉ yêu cầu OAuth scope `https://www.googleapis.com/auth/drive.readonly`. Provider không có logic tạo/sửa/xóa file hay sửa permissions.

### B. Apps Script Bridge

Dùng khi muốn Apps Script chạy với chính tài khoản Google đang sở hữu Drive.

1. Copy `integrations/google-apps-script/DriveBrainBridge.gs` vào một Apps Script project.
2. Script Properties: tạo `DRIVE_BRAIN_TOKEN` bằng một token mạnh ngẫu nhiên.
3. Deploy Web App, Execute as Me, cấp quyền Drive/Docs/Sheets/Slides và lấy URL `/exec`.
4. Trong Vercel thêm:
   - `DRIVE_BRAIN_BRIDGE_URL` = URL `/exec`
   - `DRIVE_BRAIN_TOKEN` = đúng token trong Script Properties
5. Redeploy và chạy `⚙ Runtime` → `Kiểm tra Grounding + Canary`.

Nếu A và B cùng được cấu hình: Apps Script Bridge là primary; Service Account readonly là failover.

---

## Deployment production

Project Vercel hiện cần một trong hai cơ chế xác thực để backend nhận code GitHub mới:

### Khuyến nghị: Vercel Git Integration

1. Vercel → project `ai-van-phong-tro-ly` → Settings → Git.
2. Connect GitHub repository `drngovothiennhan/A.I-V-n-Ph-ng-Tr-L-`.
3. Production Branch = `main`.
4. Sau khi kết nối, push lên `main` sẽ tạo deployment; không cần `VERCEL_TOKEN` trong GitHub Actions.

### Thay thế: GitHub Actions + Vercel token

Nếu không muốn Git Integration, tạo Vercel token và lưu **chỉ** dưới GitHub Actions Secret tên `VERCEL_TOKEN`. `VERCEL_ORG_ID` và `VERCEL_PROJECT_ID` đã có trong workflow; không commit token vào repo.

---

## Chuỗi xác minh sau redeploy

1. `GET /api/health`
   - `status = ok`
   - `providers.gemini.configured = true`
   - `providers.googleDriveRuntime.configured = true` sau khi cấp một Drive provider
2. `GET /api/provider-check?probe=gemini-grounding`
   - `probe.geminiGrounding.pass = true`
   - `groundingSourceCount > 0`
3. `POST /api/drive-brain`
   - body: `{"action":"search","query":"DBR-CANARY-2026-09-10","scopes":["02_APPROVED"],"limit":5}`
   - phải tìm được file canary Approved thật
4. Kiểm thử hội thoại không upload local:
   - `Theo Bộ Y tế Việt Nam, người dân nên làm gì để phòng ngừa sốt xuất huyết?`
   - Không chấp nhận Wikipedia lạc đề hoặc câu không liên quan.
   - Nếu grounding không đủ, hệ thống phải trả trạng thái thiếu căn cứ thay vì suy đoán.
5. Kiểm thử local isolation:
   - Câu hỏi bình thường: `localDependency=false`, local không được đưa vào model.
   - Chỉ khi người dùng nói rõ `file local`, `file vừa tải`, `tài liệu upload` thì local mới là supplement.

---

## Nguyên tắc fail-safe

- Drive lỗi/thiếu credential → bỏ qua Drive, tiếp tục Gemini + nguồn ngoài.
- Gemini grounding lỗi ở câu hỏi y tế/nguồn chính thức → không ghép nguồn relevance thấp thành câu trả lời.
- Không có nguồn đủ liên quan → trả thiếu căn cứ, không bịa.
- Không có provider nào được phép tự chuyển sang local upload như dependency mặc định.
