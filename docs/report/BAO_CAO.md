# Báo cáo bàn giao — Quản lý nhà trọ

## Tóm tắt

Ứng dụng React quản lý phòng, người thuê, hợp đồng và hóa đơn; dữ liệu mẫu được cung cấp ở `../../db.sample.json`. Hướng dẫn cài đặt/chạy nằm tại [README](../../README.md).

## Kết quả kiểm thử

- `npm test -- --watchAll=false --runInBand`: 15 bộ kiểm thử, 80 test đạt.
- `npm run build`: build production thành công.
- Kiểm tra smoke test trong môi trường phát triển: frontend trả HTTP 200 ở cổng 3000, API trả HTTP 200 cho `/rooms` và `/invoices` ở cổng 9999.
- Bộ dữ liệu mẫu: 10 phòng, 8 người thuê, 7 hợp đồng, 14 hóa đơn; tài khoản demo `admin / 123456`.

## Ảnh giao diện

Ảnh được chụp với dữ liệu mẫu, giao diện tiếng Việt. Các ảnh lỗi minh họa thông tin đăng nhập sai và gửi form nghiệp vụ trống; không lưu thay đổi dữ liệu.

| Màn hình |
|---|
| Đăng nhập |
| Dashboard |
| Danh sách phòng |
| Danh sách người thuê |
| Danh sách hợp đồng |
| Danh sách hóa đơn |

## Hạn chế đã biết

1. `json-server` không cung cấp transaction, khóa ngoại hoặc khóa đồng thời. Service kiểm tra lại dữ liệu và một số luồng có rollback, nhưng không thể loại bỏ hoàn toàn race condition.
2. Xác thực chỉ dành cho demo: mật khẩu lưu dạng plain text và kiểm tra qua API client; không có phân quyền bảo vệ dữ liệu thật.
3. Danh sách được tải về client; cách này phù hợp dữ liệu nhỏ, không phù hợp quy mô lớn.
4. Hóa đơn lấy giá phòng tại thời điểm lập; nếu giá phòng đổi, hóa đơn các kỳ sau dùng mức giá mới.
5. Mỗi hợp đồng chỉ có một người thuê đại diện; chưa hỗ trợ người ở ghép.
6. Chưa có quy trình hoàn/trừ tiền cọc khi kết thúc hợp đồng.
7. Hóa đơn chỉ hỗ trợ thanh toán toàn phần, chưa có thanh toán từng phần/lịch sử nhiều lần thu.

## Dữ liệu và thao tác

`db.sample.json` được giữ nguyên làm dữ liệu chuẩn để chạy demo. Trước khi reset dữ liệu, sao lưu `db.json`; hướng dẫn lệnh khôi phục ở README.
