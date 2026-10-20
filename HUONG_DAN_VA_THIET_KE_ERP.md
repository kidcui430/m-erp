# HƯỚNG DẪN THIẾT KẾ VÀ TRIỂN KHAI HỆ THỐNG ERP EMS - BIC
**Phiên bản: 2.0 (7 Lines • 19 Stages • Phân quyền Di động • Cloudflare Worker & SQLite D1)**

---

## 1. TỔNG QUAN HỆ THỐNG

Hệ thống **ERP EMS - BIC** là giải pháp điều hành sản xuất và quản lý kho nguyên vật liệu cho xưởng cơ khí chính xác / gia công chi tiết với cấu trúc:
- **7 Phân xưởng / Dây chuyền (Lines)**:
  1. `CUTTING`: Line Cắt phôi, Nhiệt luyện, Đo độ cứng & Quản lý Kho NVL
  2. `NC`: Line Tiện NC (NC1, NC2, NC3)
  3. `MNC`: Line Phay MNC (MNC1, MNC2, MNC3)
  4. `GS_GV`: Line Mài phẳng (GS), Mài tròn (GV)
  5. `GP_GE_GI`: Line Đánh bóng (GP), Khắc (GE), Rửa siêu âm (GI)
  6. `ASSY`: Line Lắp ráp, Đóng thùng, Đi/Nhận Gia công ngoài (GCN)
  7. `KENSA`: Line Kiểm tra Kensa & Nhập Kho Thành Phẩm
- **19 Công đoạn (Stages)** liên kết thành Routing sản phẩm.
- **2 Phân hệ giao diện**:
  - `index.html`: Điều hành sản xuất tổng thể (Admin PC) & Giao diện di động cho 7 Leader phân xưởng.
  - `kho.html`: Quản lý kho nguyên vật liệu độc lập (chỉ dành cho Admin & Leader Cutting).

---

## 2. KIẾN TRÚC VÀ CÔNG NGHỆ

```
┌────────────────────────────────────────────────────────┐
│                   FRONTEND THUẦN                       │
│  - HTML5 Semantic                                      │
│  - CSS3 (style.css - Mobile First, Flex/Grid, Tailwind)│
│  - Vanilla JavaScript (ES6+), Không cần build tool     │
│  - Chạy mượt trên Trình duyệt PC và Smartphone         │
└───────────────────────────┬────────────────────────────┘
                            │ (REST API Fetch / JSON)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   BACKEND SERVERLESS                   │
│  - Cloudflare Worker (worker.js)                       │
│  - Tốc độ phản hồi cực nhanh, miễn phí 100.000 req/ngày│
│  - Xử lý xác thực, kiểm tra quyền theo Line & Role     │
└───────────────────────────┬────────────────────────────┘
                            │ (D1 Binding SQL)
                            ▼
┌────────────────────────────────────────────────────────┐
│              CƠ SỞ DỮ LIỆU SQLITE (D1)                 │
│  - Cloudflare D1 (schema.sql)                          │
│  - Lưu trữ Users, Lots, Machines, NVL, WIP, Logs       │
│  - Tương thích SQLite 100%, sao lưu tự động            │
└────────────────────────────────────────────────────────┘
```

---

## 3. CÁC TÍNH NĂNG VÀ CẢI TIẾN TRỌNG TÂM

### 3.1. Sửa Lỗi Lăn Chuột Trên PC Cho Admin
- **Nguyên nhân**: Các container giao diện cha bị set `overflow: hidden` hoặc chiều cao cố định không co giãn, dẫn đến sự kiện con lăn chuột (`wheel`) bị chặn.
- **Giải pháp**:
  - Tách biệt rõ ràng thanh Navbar cố định bên trên (`height: 56px`).
  - Phần thân `.app-body` chia thành Sidebar và Content với `overflow-y: auto`.
  - Bảng tổng kết WIP 19 Stages `.table-wrap` hỗ trợ cuộn ngang (`overflow-x: auto`) độc lập, cho phép cuộn dọc toàn màn hình mượt mà bằng con lăn chuột.

### 3.2. Giao Diện Tối Ưu Điện Thoại Cho Leader Di Động
- Chiều cao các nút bấm tối thiểu **44px - 48px** đảm bảo chạm chính xác bằng ngón tay.
- Các ô nhập số lượng lớn, hỗ trợ `inputmode="numeric"` tự động bật bàn phím số trên điện thoại.
- Thiết kế dạng thẻ (Card-based layout) gọn gàng, hiển thị trạng thái máy đang chạy / rảnh bằng màu sắc trực quan (Xanh / Cam / Đỏ).

### 3.3. Phân Quyền Phân Xưởng Nghiêm Ngặt
| Tài khoản | Vai trò | Phân quyền công đoạn | Quyền Kho NVL (`kho.html`) |
|---|---|---|---|
| `ADMIN` | Quản trị viên | Xem và thao tác toàn bộ 7 Lines & 19 Stages | Toàn quyền Nhập / Xuất / Quản lý |
| `LD_CUTTING` | Leader Line Cutting | Chỉ xem `CAT`, `NHIET_LUYEN`, `DO_CUNG` | **Được quyền Nhập NVL & Xuất NVL qua sản xuất** |
| `LD_NC` | Leader Line NC | Chỉ xem `NC1`, `NC2`, `NC3` | ⛔ Không được truy cập |
| `LD_MNC` | Leader Line MNC | Chỉ xem `MNC1`, `MNC2`, `MNC3` | ⛔ Không được truy cập |
| `LD_GS_GV` | Leader Line GS-GV | Chỉ xem `GS`, `GV` | ⛔ Không được truy cập |
| `LD_GP_GE_GI` | Leader Line GP-GE-GI | Chỉ xem `GP`, `GE`, `GI` | ⛔ Không được truy cập |
| `LD_ASSY` | Leader Line Assy | Chỉ xem `LAP_RAP`, `DONG_THUNG`, `XUAT_GCN`, `NHAN_GCN` | ⛔ Không được truy cập |
| `LD_KENSA` | Leader Line Kensa | Chỉ xem `KIEM_TRA` ➔ Nhập kho thành phẩm | ⛔ Không được truy cập |

### 3.4. Sửa Lỗi Đăng Nhập & Bắt Buộc Đổi Mật Khẩu Lần Đầu
- Mỗi tài khoản có mật khẩu ban đầu (mặc định: `123`).
- Khi đăng nhập lần đầu, hệ thống kiểm tra cờ `must_change_pwd`. Nếu là `true`, hệ thống lập tức mở cửa sổ yêu cầu:
  1. Nhập mật khẩu mới.
  2. Xác nhận lại mật khẩu mới.
  3. Cập nhật vào cơ sở dữ liệu và chuyển `must_change_pwd = false`.

### 3.5. Phân Bổ LOT Ra Máy Có Nhập Số Lượng (Allocation Quantity)
- Thay vì gán toàn bộ số lượng LOT vào 1 máy một cách thụ động, Leader có ô: **"Số lượng phân bổ cho máy này"**.
- Ví dụ: Lô hàng PO2026-01 đang chờ ở công đoạn Cắt là 600 cái:
  - Leader gán 300 cái vào `M-CAT-01`.
  - Gán 300 cái còn lại vào `M-CAT-02`.
- Máy móc quản lý chính xác khối lượng công việc được giao thực tế theo từng ca.

---

## 4. MÔ HÌNH DỮ LIỆU SQLITE (SCHEMA D1)

Hệ thống cơ sở dữ liệu được tổ chức theo 11 bảng:
1. `users`: Quản lý tài khoản, mật khẩu, phân quyền line, cờ đổi mật khẩu.
2. `lines`: Danh mục 7 lines sản xuất.
3. `stages`: 19 công đoạn với thứ tự quy trình.
4. `machines`: Danh sách máy móc, định mức ca, trạng thái.
5. `products`: Mã hàng, tên, quy cách và cấu hình lộ trình (Routing JSON).
6. `lots`: Danh sách lệnh sản xuất / LOT chẻ.
7. `lot_wip`: Tiến độ số lượng chờ, PASS, NG của LOT ở từng Stage.
8. `suppliers`: Danh bạ nhà cung cấp phôi và vật tư.
9. `materials`: Danh mục NVL, tồn kho, tổng nhập, tổng xuất.
10. `production_logs`: Lịch sử giao dịch từng lần chuyển công đoạn.
11. `material_logs`: Sổ cái kho xuất nhập vật tư.

---

## 5. HƯỚNG DẪN TRIỂN KHAI VÀ VẬN HÀNH

### Cách 1: Chạy trực tiếp tại máy tính (Chế độ Local)
- Mở file `index.html` trực tiếp bằng trình duyệt Chrome/Edge hoặc dùng Live Server (VS Code / Antigravity).
- Dữ liệu tự động lưu trữ trên `localStorage` trình duyệt, đầy đủ 100% tính năng kể cả khi không có kết nối internet.

### Cách 2: Triển khai Backend Cloudflare Worker + Cloudflare D1
1. **Cài đặt Cloudflare Wrangler**:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
2. **Tạo Database D1**:
   ```bash
   wrangler d1 create bic-erp-db
   ```
   *Copy `database_name` và `database_id` vào file `wrangler.jsonc`*.
3. **Khởi tạo bảng và nạp dữ liệu mẫu**:
   ```bash
   wrangler d1 execute bic-erp-db --file=./schema.sql
   ```
4. **Deploy Worker lên Cloudflare**:
   ```bash
   wrangler deploy
   ```
   *Worker sẽ cung cấp domain API dạng `https://bic-erp-api.<your-subdomain>.workers.dev`*.
5. **Cấu hình Frontend**:
   - Điền URL của Worker vào biến cấu hình `API_BASE_URL` trong `script.js` để dữ liệu tự động đồng bộ thời gian thực lên máy chủ Cloudflare.
