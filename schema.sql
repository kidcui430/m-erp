-- =============================================================================
-- SCHEMA.SQL - CƠ SỞ DỮ LIỆU CLOUDFLARE D1 (SQLite)
-- APP ERP EMS - BIC: 7 Lines, 19 Stages, Users, Lots, WIP, NVL, Logs
-- Chạy lệnh: wrangler d1 execute bic-erp-db --file=./schema.sql
-- =============================================================================

-- Bật Foreign Key nếu cần
PRAGMA journal_mode = WAL;

-- -----------------------------------------------------------------------------
-- BẢNG 1: USERS - Quản lý tài khoản và phân quyền
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_nv       TEXT NOT NULL UNIQUE,       -- Mã tài khoản: ADMIN, LD_CUTTING...
  password    TEXT NOT NULL DEFAULT '123',-- Mật khẩu (bản thật dùng SHA-256)
  ten_nv      TEXT NOT NULL,              -- Tên hiển thị
  role        TEXT NOT NULL DEFAULT 'LEADER', -- ADMIN | LEADER
  line_id     TEXT NOT NULL DEFAULT 'ALL',-- ALL (Admin) | CUTTING | NC | MNC...
  must_change_pwd INTEGER NOT NULL DEFAULT 1, -- 1=Bắt buộc đổi pass, 0=đã đổi
  created_at  TEXT DEFAULT (datetime('now','localtime')),
  updated_at  TEXT DEFAULT (datetime('now','localtime'))
);

-- -----------------------------------------------------------------------------
-- BẢNG 2: LINES - Danh mục 7 dây chuyền sản xuất
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lines (
  line_id     TEXT PRIMARY KEY,           -- CUTTING | NC | MNC | GS_GV | GP_GE_GI | ASSY | KENSA
  line_name   TEXT NOT NULL,             -- Tên hiển thị đầy đủ
  color_hex   TEXT DEFAULT '#e2e8f0',    -- Mã màu badge line
  sort_order  INTEGER NOT NULL DEFAULT 99
);

-- -----------------------------------------------------------------------------
-- BẢNG 3: STAGES - 19 Công đoạn sản xuất
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stages (
  stage_code  TEXT PRIMARY KEY,           -- CAT | NHIET_LUYEN | NC1 | NC2 ...
  line_id     TEXT NOT NULL REFERENCES lines(line_id),
  stage_name  TEXT NOT NULL,
  thu_tu      INTEGER NOT NULL DEFAULT 99  -- Thứ tự cột trong bảng WIP Matrix
);

-- -----------------------------------------------------------------------------
-- BẢNG 4: MACHINES - Danh sách máy móc thiết bị
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS machines (
  ma_may        TEXT PRIMARY KEY,          -- M-CAT-01, M-NC1-01 ...
  ten_may       TEXT NOT NULL,
  stage_code    TEXT NOT NULL REFERENCES stages(stage_code),
  cong_suat_ca  INTEGER NOT NULL DEFAULT 500, -- Định mức sản lượng / ca
  trang_thai    TEXT NOT NULL DEFAULT 'IDLE', -- IDLE | RUNNING | MAINTENANCE
  lot_dang_chay TEXT DEFAULT '',           -- Số LOT đang chạy trên máy
  sl_dang_chay  INTEGER DEFAULT 0,         -- Số lượng đang chạy (được phân bổ)
  updated_at    TEXT DEFAULT (datetime('now','localtime'))
);

-- -----------------------------------------------------------------------------
-- BẢNG 5: PRODUCTS - Mã hàng và lộ trình sản xuất (Routing)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  ma_sp       TEXT PRIMARY KEY,
  ten_sp      TEXT NOT NULL,
  quy_cach    TEXT DEFAULT '',
  routing_json TEXT NOT NULL DEFAULT '[]', -- JSON mảng [{order:1, stage_id:"CAT"}, ...]
  created_at  TEXT DEFAULT (datetime('now','localtime'))
);

-- -----------------------------------------------------------------------------
-- BẢNG 6: LOTS - Danh sách lệnh sản xuất / LOT chẻ
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lots (
  so_lot        TEXT PRIMARY KEY,          -- PO2026-01, PO2026-02 ...
  so_po_goc     TEXT NOT NULL,             -- PO gốc: PO2026
  ma_sp         TEXT NOT NULL REFERENCES products(ma_sp),
  ngay_cap_phat TEXT NOT NULL,
  tong_sl       INTEGER NOT NULL DEFAULT 0,-- Tổng số lượng LOT
  sl_kho_tp     INTEGER NOT NULL DEFAULT 0,-- Đã nhập kho thành phẩm
  trang_thai    TEXT NOT NULL DEFAULT 'DANG_SX', -- DANG_SX | HOAN_THANH | TAM_DUNG
  created_at    TEXT DEFAULT (datetime('now','localtime'))
);

-- -----------------------------------------------------------------------------
-- BẢNG 7: LOT_WIP - Tiến độ từng LOT qua từng Stage (thay cho wip_data JSON)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lot_wip (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  so_lot      TEXT NOT NULL REFERENCES lots(so_lot),
  stage_code  TEXT NOT NULL REFERENCES stages(stage_code),
  waiting     INTEGER NOT NULL DEFAULT 0,  -- Số lượng đang chờ tại stage này
  good        INTEGER NOT NULL DEFAULT 0,  -- Đã xử lý PASS
  ng          INTEGER NOT NULL DEFAULT 0,  -- Số lượng NG
  ma_may      TEXT DEFAULT '',             -- Máy được gán
  phan_bo_qty INTEGER DEFAULT 0,           -- Số lượng được phân bổ cho máy
  updated_at  TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(so_lot, stage_code)
);

-- -----------------------------------------------------------------------------
-- BẢNG 8: SUPPLIERS - Nhà cung cấp nguyên vật liệu
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  ma_ncc      TEXT PRIMARY KEY,           -- NCC001, NCC002 ...
  ten_ncc     TEXT NOT NULL,
  so_dt       TEXT DEFAULT '',
  dia_chi     TEXT DEFAULT '',
  ghi_chu     TEXT DEFAULT '',
  created_at  TEXT DEFAULT (datetime('now','localtime'))
);

-- -----------------------------------------------------------------------------
-- BẢNG 9: MATERIALS - Danh mục Nguyên Vật Liệu (NVL)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials (
  ma_hang     TEXT PRIMARY KEY,           -- NVL001, NVL002 ...
  phan_loai   TEXT NOT NULL DEFAULT 'Vật Tư', -- Kim Loại | Hóa Chất | Vật Tư...
  ten_hang    TEXT NOT NULL,
  quy_cach    TEXT DEFAULT '',
  don_vi_tinh TEXT NOT NULL DEFAULT 'Kg',  -- Kg | Cây | Lít | Cái ...
  ma_ncc      TEXT DEFAULT '' REFERENCES suppliers(ma_ncc),
  tong_nhap   REAL NOT NULL DEFAULT 0,
  tong_xuat_sx REAL NOT NULL DEFAULT 0,
  ton_kho     REAL NOT NULL DEFAULT 0,
  updated_at  TEXT DEFAULT (datetime('now','localtime'))
);

-- -----------------------------------------------------------------------------
-- BẢNG 10: PRODUCTION_LOGS - Lịch sử giao nhận PASS/NG qua công đoạn
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS production_logs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  thoi_gian         TEXT DEFAULT (datetime('now','localtime')),
  nguoi_thao_tac    TEXT NOT NULL,         -- ma_nv của người thực hiện
  ma_may            TEXT DEFAULT '',
  so_lot            TEXT NOT NULL,
  ma_sp             TEXT NOT NULL,
  tu_cong_doan      TEXT NOT NULL,         -- Stage code xuất phát
  den_cong_doan     TEXT NOT NULL,         -- Stage code đến (hoặc "KHO_THANH_PHAM")
  sl_ok             INTEGER NOT NULL DEFAULT 0,
  sl_ng             INTEGER NOT NULL DEFAULT 0
);

-- -----------------------------------------------------------------------------
-- BẢNG 11: MATERIAL_LOGS - Sổ cái nhập/xuất kho NVL
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS material_logs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  thoi_gian_gd      TEXT DEFAULT (datetime('now','localtime')),
  nguoi_giao_dich   TEXT NOT NULL,
  ma_hang           TEXT NOT NULL REFERENCES materials(ma_hang),
  ten_hang          TEXT NOT NULL,
  loai_giao_dich    TEXT NOT NULL,         -- NHAP_KHO | XUAT_SAN_XUAT
  so_luong          REAL NOT NULL,
  don_vi_tinh       TEXT NOT NULL,
  so_lot_sx         TEXT DEFAULT '',
  ma_may_sx         TEXT DEFAULT '',
  ma_ncc            TEXT DEFAULT '',
  sl_dong_goi       REAL DEFAULT 0,        -- Số lượng đóng gói (cây/bao)
  ghi_chu           TEXT DEFAULT ''
);

-- =============================================================================
-- DỮ LIỆU MẪU KHỞI TẠO (SEED DATA)
-- =============================================================================

-- Tài khoản
INSERT OR IGNORE INTO users (ma_nv, password, ten_nv, role, line_id, must_change_pwd) VALUES
  ('ADMIN',      '123', 'Admin Văn Phòng',             'ADMIN',  'ALL',      0),
  ('LD_CUTTING', '123', 'Leader Line Cutting',          'LEADER', 'CUTTING',  1),
  ('LD_NC',      '123', 'Leader Line NC',               'LEADER', 'NC',       1),
  ('LD_MNC',     '123', 'Leader Line MNC',              'LEADER', 'MNC',      1),
  ('LD_GS_GV',   '123', 'Leader Line Mài (GS, GV)',     'LEADER', 'GS_GV',    1),
  ('LD_GP_GE_GI','123', 'Leader Line Mài (GP, GE, GI)', 'LEADER', 'GP_GE_GI', 1),
  ('LD_ASSY',    '123', 'Leader Line Assy',              'LEADER', 'ASSY',     1),
  ('LD_KENSA',   '123', 'Leader Line Kensa',             'LEADER', 'KENSA',    1);

-- Lines
INSERT OR IGNORE INTO lines (line_id, line_name, color_hex, sort_order) VALUES
  ('CUTTING',   'Line Cắt, Nhiệt, Độ cứng & Kho', '#fee2e2', 1),
  ('NC',        'Line NC (NC1, NC2, NC3)',          '#e0f2fe', 2),
  ('MNC',       'Line MNC (MNC1, MNC2, MNC3)',      '#dcfce7', 3),
  ('GS_GV',     'Line Mài (GS, GV)',                '#ffedd5', 4),
  ('GP_GE_GI',  'Line Mài (GP, GE, GI)',            '#f3e8ff', 5),
  ('ASSY',      'Line Lắp ráp, Đóng thùng, GCN',   '#fef9c3', 6),
  ('KENSA',     'Line Kensa',                        '#f1f5f9', 7);

-- Stages (19 công đoạn)
INSERT OR IGNORE INTO stages (stage_code, line_id, stage_name, thu_tu) VALUES
  ('CAT',        'CUTTING', 'Cắt',          1),
  ('NHIET_LUYEN','CUTTING', 'Nhiệt luyện',  2),
  ('DO_CUNG',    'CUTTING', 'Độ cứng',      3),
  ('NC1',        'NC',      'NC1',          4),
  ('NC2',        'NC',      'NC2',          5),
  ('NC3',        'NC',      'NC3',          6),
  ('MNC1',       'MNC',     'MNC1',         7),
  ('MNC2',       'MNC',     'MNC2',         8),
  ('MNC3',       'MNC',     'MNC3',         9),
  ('GS',         'GS_GV',   'GS',           10),
  ('GV',         'GS_GV',   'GV',           11),
  ('GP',         'GP_GE_GI','GP',           12),
  ('GE',         'GP_GE_GI','GE',           13),
  ('GI',         'GP_GE_GI','GI',           14),
  ('LAP_RAP',    'ASSY',    'Lắp ráp',      15),
  ('DONG_THUNG', 'ASSY',    'Đóng thùng',   16),
  ('XUAT_GCN',   'ASSY',    'Đi-GCN',       17),
  ('NHAN_GCN',   'ASSY',    'Về-GCN',       18),
  ('KIEM_TRA',   'KENSA',   'Kiểm tra',     19);

-- Machines (mẫu)
INSERT OR IGNORE INTO machines (ma_may, ten_may, stage_code, cong_suat_ca, trang_thai) VALUES
  ('M-CAT-01',      'Máy Cắt Phôi 01',       'CAT',        600, 'RUNNING'),
  ('M-CAT-02',      'Máy Cắt Phôi 02',       'CAT',        600, 'IDLE'),
  ('LO-NHIET-01',   'Lò Nhiệt Luyện 01',     'NHIET_LUYEN',1000,'IDLE'),
  ('MAY-DO-01',     'Máy Đo Độ Cứng 01',     'DO_CUNG',    1000,'IDLE'),
  ('M-NC1-01',      'Máy Tiện NC1 - 01',     'NC1',        450, 'RUNNING'),
  ('M-NC1-02',      'Máy Tiện NC1 - 02',     'NC1',        450, 'IDLE'),
  ('M-NC2-01',      'Máy Tiện NC2 - 01',     'NC2',        450, 'IDLE'),
  ('M-NC3-01',      'Máy Tiện NC3 - 01',     'NC3',        450, 'IDLE'),
  ('M-MNC1-01',     'Máy Phay MNC1 - 01',    'MNC1',       400, 'IDLE'),
  ('M-MNC2-01',     'Máy Phay MNC2 - 01',    'MNC2',       400, 'IDLE'),
  ('M-MNC3-01',     'Máy Phay MNC3 - 01',    'MNC3',       400, 'IDLE'),
  ('M-GS-01',       'Máy Mài Phẳng GS 01',   'GS',         500, 'IDLE'),
  ('M-GV-01',       'Máy Mài Tròn GV 01',    'GV',         500, 'IDLE'),
  ('M-GP-01',       'Máy Đánh Bóng GP 01',   'GP',         500, 'IDLE'),
  ('M-GE-01',       'Máy Khắc GE 01',        'GE',         500, 'IDLE'),
  ('M-GI-01',       'Máy Rửa Siêu Âm GI 01', 'GI',         500, 'IDLE'),
  ('BAN-ASSY-01',   'Bàn Lắp Ráp 01',        'LAP_RAP',    800, 'IDLE'),
  ('BAN-PACK-01',   'Bàn Đóng Thùng 01',     'DONG_THUNG', 1000,'IDLE'),
  ('TRAM-GCN-OUT',  'Trạm Xuất Đi GCN',      'XUAT_GCN',   2000,'IDLE'),
  ('TRAM-GCN-IN',   'Trạm Nhận Hàng GCN',    'NHAN_GCN',   2000,'IDLE'),
  ('BAN-KENSA-01',  'Bàn Kiểm Tra Kensa 01', 'KIEM_TRA',   1000,'IDLE');

-- Suppliers
INSERT OR IGNORE INTO suppliers (ma_ncc, ten_ncc, so_dt, dia_chi) VALUES
  ('NCC001', 'Thép Đặc Biệt Daido',            '0901234567 - Mr. Kenji', 'KCN VSIP 1, Bình Dương'),
  ('NCC002', 'Hóa Chất Công Nghiệp Minh Trí',  '0908889999 - Chị Lan',   'Thuận An, Bình Dương');

-- Materials (NVL mẫu)
INSERT OR IGNORE INTO materials (ma_hang, phan_loai, ten_hang, quy_cach, don_vi_tinh, ma_ncc, tong_nhap, tong_xuat_sx, ton_kho) VALUES
  ('NVL001', 'Kim Loại', 'Thép tròn đặc C45',        'Ø30mm x 6m',   'Kg',  'NCC001', 1500, 120, 1380),
  ('NVL002', 'Kim Loại', 'Thép hợp kim SCM440',       'Ø20mm x 6m',   'Kg',  'NCC001', 850,  50,  800),
  ('NVL003', 'Hóa Chất', 'Dầu cắt gọt pha nước CNC', 'Phuy 200L',    'Lít', 'NCC002', 400,  40,  360);

-- Products (Mã hàng mẫu)
INSERT OR IGNORE INTO products (ma_sp, ten_sp, quy_cach, routing_json) VALUES
  ('TB-30', 'Bánh răng thép C45 Ø30',
   'Ø30 x 15mm',
   '[{"order":1,"stage_id":"CAT"},{"order":2,"stage_id":"NC1"},{"order":3,"stage_id":"NC2"},{"order":4,"stage_id":"MNC1"},{"order":5,"stage_id":"NHIET_LUYEN"},{"order":6,"stage_id":"DO_CUNG"},{"order":7,"stage_id":"GS"},{"order":8,"stage_id":"LAP_RAP"},{"order":9,"stage_id":"KIEM_TRA"}]'
  );

-- Lots mẫu
INSERT OR IGNORE INTO lots (so_lot, so_po_goc, ma_sp, ngay_cap_phat, tong_sl) VALUES
  ('PO2010-01', 'PO2010', 'TB-30', '2026-10-20', 300),
  ('PO2010-02', 'PO2010', 'TB-30', '2026-10-20', 300),
  ('PO2010-03', 'PO2010', 'TB-30', '2026-10-20', 300);

-- WIP mẫu
INSERT OR IGNORE INTO lot_wip (so_lot, stage_code, waiting, good, ng, ma_may) VALUES
  ('PO2010-01', 'CAT',  300, 0, 0, 'M-CAT-01'),
  ('PO2010-02', 'CAT',  0, 300, 0, 'M-CAT-01'),
  ('PO2010-02', 'NC1',  290, 0, 10,'M-NC1-01'),
  ('PO2010-03', 'CAT',  0, 300, 0, 'M-CAT-02'),
  ('PO2010-03', 'NC1',  0, 300, 0, 'M-NC1-01'),
  ('PO2010-03', 'NC2',  0, 300, 0, 'M-NC2-01'),
  ('PO2010-03', 'MNC1', 300, 0, 0, '');

-- Production log mẫu
INSERT OR IGNORE INTO production_logs (nguoi_thao_tac, ma_may, so_lot, ma_sp, tu_cong_doan, den_cong_doan, sl_ok, sl_ng) VALUES
  ('LD_CUTTING', 'M-CAT-01', 'PO2010-02', 'TB-30', 'CAT', 'NC1', 300, 0);

-- Material log mẫu
INSERT OR IGNORE INTO material_logs (nguoi_giao_dich, ma_hang, ten_hang, loai_giao_dich, so_luong, don_vi_tinh, so_lot_sx, ma_may_sx, ghi_chu) VALUES
  ('LD_CUTTING', 'NVL001', 'Thép tròn đặc C45', 'XUAT_SAN_XUAT', 120, 'Kg', 'PO2010-01', 'M-CAT-01', 'Xuất phôi đầu ca');
