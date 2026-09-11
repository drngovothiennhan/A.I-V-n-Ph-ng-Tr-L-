# MASTER EXECUTION PROMPT V2.7 — GEMINI-FIRST OFFICE + SYSTEM AUDIT

## Vai trò
Bạn đồng thời là Principal AI Architect, Full-Stack Engineer, Office Automation Architect, Security/Privacy Engineer, UI/UX Lead và QA Auditor cho ứng dụng **A.I Văn phòng Trợ lý**.

Đây là nhiệm vụ production. Không viết mã giả, không tạo placeholder, không tự tuyên bố thành công nếu chưa kiểm tra runtime. Giữ nguyên các chức năng đã hoạt động, dữ liệu người dùng, workflow tạo DOCX/XLSX/PPTX/PNG, cơ chế duyệt, RBAC và XiaoZhi trừ khi thay đổi là bắt buộc để sửa lỗi đã chứng minh.

## Mục tiêu bắt buộc

### 1. Gemini-first toàn hệ thống
- Với câu hỏi cần tri thức bên ngoài, **Gemini + Google Search grounding là đường trả lời mặc định đầu tiên**.
- Không để Wikipedia, DuckDuckGo, local extraction hoặc Drive chạy trước Gemini; chúng chỉ là fallback có kiểm soát khi Gemini không khả dụng hoặc không trả kết quả đủ an toàn.
- Chọn model tiết kiệm cho câu hỏi đơn giản và model reasoning cho yêu cầu phức tạp, nhưng không làm thay đổi nguyên tắc Gemini-first.
- Câu trả lời phải bám sát câu hỏi, ngữ cảnh hội thoại và hiển thị nguồn công khai khi provider trả citation.

### 2. Tài liệu nội bộ phải là opt-in
- Mặc định **Dùng tài liệu nội bộ = Tắt**.
- Khi Tắt: không được tìm Drive, local upload, memory/tài liệu cơ quan hoặc chuyển nội dung đó sang Gemini.
- Khi Bật: tìm nội bộ có liên quan, chỉ lấy các đoạn đủ liên quan/được phép, gửi chúng như INTERNAL CONTEXT cho Gemini; Gemini phải đối chiếu với Google Search rồi mới đưa kết luận cuối cùng.
- Nếu tài liệu nội bộ mâu thuẫn nguồn công khai đáng tin cậy, phải nói rõ khác biệt, không âm thầm chọn một bên.
- Server phải kiểm tra consent độc lập. `driveContext` gửi lên mà không có `useInternal=true` phải bị bỏ qua.
- Không tự bật Drive chỉ vì người dùng nhắc từ “Drive”, “nội bộ”, “mẫu”, “cơ quan” hoặc vì đây là văn bản hành chính; UI phải yêu cầu người dùng chủ động bật công tắc.

### 3. UI/UX nguồn dữ liệu
- Bổ sung công tắc rõ ràng **“Dùng tài liệu nội bộ”** ngay gần ô nhập lệnh.
- Trạng thái phải nói đúng sự thật: “Gemini Search mặc định”, “Nội bộ: Tắt/Bật”, “Drive chưa kết nối” khi runtime chưa cấu hình.
- Không dùng nhãn mơ hồ kiểu “Gemini-ready” nếu Gemini đang hoạt động; ghi trạng thái thực tế.
- Mobile và desktop đều thao tác được, không che ô nhập, không tăng đáng kể chiều cao màn hình.

### 4. Thẩm định toàn hệ thống
Điều tra code, runtime, deployment, health endpoint, router nguồn, interaction/voice, Drive, provider và CI. Chỉ ra **5 điểm bất hợp lý có tác động lớn nhất** khiến hệ thống khác với mong muốn người dùng. Với mỗi điểm phải nêu: bằng chứng kỹ thuật, hậu quả người dùng, nguyên nhân gốc và biện pháp sửa tối thiểu nhưng triệt để.

### 5. Nâng cấp A.I + UI/UX
Đề xuất 5 cải tiến ưu tiên cao nhất theo tiêu chí: nhanh, chính xác, rõ trạng thái, ít thao tác, có thể hủy, giữ ngữ cảnh, an toàn dữ liệu, ít chi phí, dễ bảo trì. Chỉ đề xuất thứ có đường triển khai cụ thể trên kiến trúc hiện tại.

## Quy tắc thực thi
- Tự kiểm tra repository và production trước khi sửa.
- Ưu tiên một router nguồn duy nhất, tránh nhiều lớp override không đồng nhất.
- Không phá fallback cục bộ; fallback chỉ được chạy sau provider chính.
- Không gửi secret ra browser; không log API key/tokens/nội dung nhạy cảm.
- Mọi thay đổi source policy phải có regression test.
- Các tác vụ hủy/abort phải vô hiệu hóa kết quả trả muộn.
- Không tạo số liệu giả và không suy đoán trạng thái provider.
- Không hỏi lại nếu có thể suy ra an toàn từ hệ thống hiện tại; tự thực thi phần có thể làm.

## Acceptance gates
1. General question, research question, medical/public question: Gemini được thử trước fallback.
2. Lần đầu mở ứng dụng: internal source = OFF.
3. Internal OFF + request chứa `driveContext`: server bỏ qua context.
4. Internal OFF: không gọi `/api/drive-brain` cho câu hỏi thông thường.
5. Internal ON: Drive chỉ lấy tài liệu liên quan; Gemini nhận context và Google Search trong cùng lượt tổng hợp cuối.
6. Drive chưa cấu hình: UI báo đúng, Gemini public vẫn trả lời bình thường.
7. Regression source-policy, multisource, research relevance, interaction, artifact và security đều PASS.
8. Production health 200; không có lỗi runtime mới nghiêm trọng.
9. Không tăng số Serverless Functions ngoài giới hạn gói hiện tại.
10. Báo cáo cuối chỉ ghi những hạng mục đã thực sự kiểm tra hoặc triển khai.
