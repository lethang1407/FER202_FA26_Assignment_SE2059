# Quản lý nhà trọ

Ứng dụng web quản lý phòng trọ, người thuê, hợp đồng và hóa đơn. Frontend dùng React/React-Bootstrap; API giả lập REST dùng json-server.

## Yêu cầu

- Node.js và npm
- Windows, macOS hoặc Linux

## Cài đặt và chạy

Mở terminal tại thư mục `assignment` và cài dependencies:

```bash
npm install
```

Khởi động hai tiến trình trong **hai terminal riêng**:

```bash
npm run server
```

```bash
npm start
```

Ứng dụng chạy tại [http://localhost:3000](http://localhost:3000); API chạy tại [http://localhost:9999](http://localhost:9999). Tạo bản build: `npm run build`.

Các thư mục test (`__tests__`) đã được xóa theo yêu cầu, nên hiện không còn test tự động để chạy bằng `npm test`. Kết quả test trước khi xóa được ghi trong báo cáo bàn giao.

## Tài khoản demo

| Tên đăng nhập | Mật khẩu |
|---|---|
| `admin` | `123456` |

Đây là thông tin đăng nhập minh họa, không dùng cho môi trường thực tế.

## Chức năng

- Dashboard: công suất phòng, doanh thu thu theo tháng, công nợ, hóa đơn quá hạn và hợp đồng sắp hết hạn.
- CRUD phòng và người thuê; tìm kiếm, lọc và phân trang.
- Tạo, sửa, kết thúc hợp đồng; đồng bộ trạng thái phòng.
- Lập, sửa, xóa hóa đơn chưa thanh toán; tính tiền điện nước, ghi nhận thanh toán và theo dõi công nợ.
- Validate dữ liệu, xác nhận thao tác nguy hiểm, thông báo thành công/lỗi và trạng thái tải/rỗng/lỗi.

## Cấu trúc chính

```text
assignment/
├── db.json                    # Dữ liệu API đang chạy
├── db.sample.json             # Bộ dữ liệu mẫu để khôi phục/demo
├── public/
├── src/
│   ├── api/                   # Axios và API theo resource
│   ├── components/            # Layout và component dùng chung
│   ├── context/               # Auth và toast
│   ├── hooks/                 # Hook tải dữ liệu, phân trang
│   ├── pages/                 # Dashboard, login và các trang nghiệp vụ
│   ├── services/              # Nghiệp vụ và kiểm tra dữ liệu mới nhất
│   └── utils/                 # Validator, ngày, định dạng, trạng thái, tính tiền
├── docs/report/               # Báo cáo bàn giao và ảnh minh họa
├── package.json
└── QUAN_LY_PHONG_TRO.md       # Đặc tả và kế hoạch triển khai
```

## Khôi phục dữ liệu mẫu

Sao lưu `db.json` trước nếu cần giữ dữ liệu hiện tại, sau đó chép `db.sample.json` đè lên `db.json` và khởi động lại json-server. Lệnh PowerShell tại thư mục dự án:

```powershell
Copy-Item .\db.sample.json .\db.json -Force
```

Lệnh trên thay thế toàn bộ dữ liệu trong `db.json`.

## Báo cáo

Xem [báo cáo bàn giao](./docs/report/BAO_CAO.md) để biết kết quả kiểm thử, ảnh giao diện và các hạn chế đã biết.
