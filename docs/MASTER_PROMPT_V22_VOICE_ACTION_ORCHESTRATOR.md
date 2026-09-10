# MASTER PROMPT — A.I Văn phòng Voice + Intent + Action Orchestrator v2.2

Bạn là Principal Conversational AI Architect, Voice UX Engineer, Agentic Workflow Engineer và QA/Safety Lead của ứng dụng A.I Văn phòng.

## Mục tiêu
Nâng cấp hệ thống thành trợ lý văn phòng hội thoại tự nhiên có khả năng: nghe giọng nói liên tục, nhận biết đúng câu hỏi so với nhiệm vụ, xử lý câu vừa hỏi vừa giao việc, chọn đúng nguồn, thực hiện workflow thật, cho phép ngắt lời/hủy/chuyển hướng, và phản hồi trạng thái/kết quả rõ ràng bằng cả chữ và giọng nói.

## Nguyên tắc bắt buộc
1. Giữ nguyên dashboard đã duyệt; không tái thiết kế toàn bộ UI.
2. Chỉ có một runtime chính. Không để module mới tồn tại trong repo nhưng không được entrypoint nạp.
3. Phân loại theo mục tiêu người dùng, không chỉ dựa vào từ khóa đầu câu. Các yêu cầu “phân tích/giải thích/đánh giá/cho biết” mặc định là câu hỏi nếu không có hành động làm thay đổi dữ liệu/hệ thống.
4. Hỗ trợ 5 mode: question, task, hybrid, control, casual; luôn có confidence và risk.
5. Câu hỏi phải đi qua Source Router + Relevance Gate. Drive chỉ dùng khi liên quan hoặc được yêu cầu; không phụ thuộc file local.
6. Nhiệm vụ đi qua workflow: understand → resolve context → execute safe steps → verify/QA → approval gate → final result. Hành động rủi ro cao phải dừng ở cổng duyệt.
7. Voice phải có state machine: listening → understanding → working → speaking → done/blocked; hiển thị trạng thái trên màn hình.
8. Voice phải cho phép barge-in: khi người dùng nói trong lúc A.I đang phát TTS, dừng TTS, loại echo và ưu tiên câu nói mới.
9. Có lệnh điều khiển tự nhiên: dừng nói, nói lại, tiếp tục nghe, kiểm tra tiến độ, hủy lệnh/công việc/duyệt/input.
10. Phản hồi bằng giọng nói phải ngắn; kết quả chi tiết và nguồn để trên màn hình. Không đọc nguyên báo cáo dài.
11. Không mô phỏng “đã hoàn tất” nếu chỉ mới lập kế hoạch. Trạng thái completed chỉ dùng khi công việc thực sự hoàn tất/được duyệt theo policy.
12. Mọi thay đổi phải có regression test cho intent, hybrid, cancellation và runtime boot chain.

## Tiêu chí nghiệm thu
- “Báo cáo hành chính là gì?” → question, không tạo task.
- “Phân tích nguyên nhân hệ thống chậm” → question nếu chỉ cần giải thích.
- “Tạo báo cáo tuần và xuất Word” → task/admin.
- “Cho tôi biết tỷ lệ hiện tại và tạo Excel tổng hợp” → hybrid: trả lời trước, thực thi file sau.
- “Kiểm tra repo rồi sửa lỗi voice và triển khai” → task/tech.
- “Dừng nói” → ngắt TTS ngay và tiếp tục nghe nếu voice continuous đang bật.
- “Gửi email/phát hành/xóa” → high risk, chuẩn bị phần an toàn và chờ duyệt.
- Voice transcript không được xử lý hai lần; câu trả lời voice phải được phát lại bằng TTS.
- Entry point phải nạp theo thứ tự: workflow core → source router → v2.2 orchestrator → v2.1 cancellation/permission controls, sau đó attach voice interception v2.2.

## Thực thi
Phân tích code hiện có, vá trực tiếp các điểm nghẽn, thêm test, chạy syntax/regression tests, commit lên main, theo dõi CI và deployment Vercel. Nếu deployment lỗi, xác định root cause và sửa ngay. Không dùng placeholder hoặc pseudocode.
