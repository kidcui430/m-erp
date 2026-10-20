// =================================================================================
// FILE 3: script.js - CHUYEN TRACH SAN XUAT (7 LINES & 19 STAGES THEO SCHEMA)
// KHONG DUNG KY TU $ VA BACKTICK DE TRANH LOI COPY
// =================================================================================

var SHARED_DB_KEY = "bic_erp_shared_db_v5";
var SHARED_USER_KEY = "bic_erp_current_user_v5";

var currentUser = null;
var db = null;
var lastLineIdRendered = "";

var LINE_COLORS = {
  CUTTING: "#fee2e2",
  NC: "#e0f2fe",
  MNC: "#dcfce7",
  GS_GV: "#ffedd5",
  GP_GE_GI: "#f3e8ff",
  ASSY: "#fef9c3",
  KENSA: "#f1f5f9"
};

var USERS_DIRECTORY = {
  ADMIN: { ma_nv: "ADMIN", password: "123", ten_nv: "Admin Văn Phòng", role: "ADMIN", line_id: "ALL", must_change_pwd: false },
  LD_CUTTING: { ma_nv: "LD_CUTTING", password: "123", ten_nv: "Leader Line Cutting", role: "LEADER", line_id: "CUTTING", must_change_pwd: true },
  LD_NC: { ma_nv: "LD_NC", password: "123", ten_nv: "Leader Line NC", role: "LEADER", line_id: "NC", must_change_pwd: true },
  LD_MNC: { ma_nv: "LD_MNC", password: "123", ten_nv: "Leader Line MNC", role: "LEADER", line_id: "MNC", must_change_pwd: true },
  LD_GS_GV: { ma_nv: "LD_GS_GV", password: "123", ten_nv: "Leader Line Mài (GS, GV)", role: "LEADER", line_id: "GS_GV", must_change_pwd: true },
  LD_GP_GE_GI: { ma_nv: "LD_GP_GE_GI", password: "123", ten_nv: "Leader Line Mài (GP, GE, GI)", role: "LEADER", line_id: "GP_GE_GI", must_change_pwd: true },
  LD_ASSY: { ma_nv: "LD_ASSY", password: "123", ten_nv: "Leader Line Assy", role: "LEADER", line_id: "ASSY", must_change_pwd: true },
  LD_KENSA: { ma_nv: "LD_KENSA", password: "123", ten_nv: "Leader Line Kensa", role: "LEADER", line_id: "KENSA", must_change_pwd: true }
};

var pendingFirstLoginUser = null;

function el(id) {
  return document.getElementById(id);
}

function orVal(val, fallback) {
  if (val !== undefined && val !== null && val !== "") {
    return val;
  }
  return fallback;
}

function nowVN() {
  return new Date().toLocaleString("vi-VN", { hour12: false });
}

function showToast(msg, isError) {
  var t = el("toast");
  if (!t) return;
  t.textContent = msg;
  if (isError) t.classList.add("error");
  else t.classList.remove("error");
  t.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(function () {
    t.classList.add("hidden");
  }, 3200);
}

function getInitialSharedData() {
  return {
    users: [
      { ma_nv: "ADMIN", password: "123", ten_nv: "Admin Văn Phòng", role: "ADMIN", line_id: "ALL", must_change_pwd: false },
      { ma_nv: "LD_CUTTING", password: "123", ten_nv: "Leader Line Cutting", role: "LEADER", line_id: "CUTTING", must_change_pwd: true },
      { ma_nv: "LD_NC", password: "123", ten_nv: "Leader Line NC", role: "LEADER", line_id: "NC", must_change_pwd: true },
      { ma_nv: "LD_MNC", password: "123", ten_nv: "Leader Line MNC", role: "LEADER", line_id: "MNC", must_change_pwd: true },
      { ma_nv: "LD_GS_GV", password: "123", ten_nv: "Leader Line Mài (GS, GV)", role: "LEADER", line_id: "GS_GV", must_change_pwd: true },
      { ma_nv: "LD_GP_GE_GI", password: "123", ten_nv: "Leader Line Mài (GP, GE, GI)", role: "LEADER", line_id: "GP_GE_GI", must_change_pwd: true },
      { ma_nv: "LD_ASSY", password: "123", ten_nv: "Leader Line Assy", role: "LEADER", line_id: "ASSY", must_change_pwd: true },
      { ma_nv: "LD_KENSA", password: "123", ten_nv: "Leader Line Kensa", role: "LEADER", line_id: "KENSA", must_change_pwd: true }
    ],
    lines: [
      { line_id: "CUTTING", line_name: "Line Cắt, Nhiệt, Độ cứng & Kho" },
      { line_id: "NC", line_name: "Line NC (NC1, NC2, NC3)" },
      { line_id: "MNC", line_name: "Line MNC (MNC1, MNC2, MNC3)" },
      { line_id: "GS_GV", line_name: "Line Mài (GS, GV)" },
      { line_id: "GP_GE_GI", line_name: "Line Mài (GP, GE, GI)" },
      { line_id: "ASSY", line_name: "Line Lắp ráp, Đóng thùng, GCN" },
      { line_id: "KENSA", line_name: "Line Kensa" }
    ],
    stages: [
      { stage_code: "CAT", line_id: "CUTTING", stage_name: "Cắt", thu_tu: 1 },
      { stage_code: "NHIET_LUYEN", line_id: "CUTTING", stage_name: "Nhiệt luyện", thu_tu: 2 },
      { stage_code: "DO_CUNG", line_id: "CUTTING", stage_name: "Độ cứng", thu_tu: 3 },
      { stage_code: "NC1", line_id: "NC", stage_name: "NC1", thu_tu: 4 },
      { stage_code: "NC2", line_id: "NC", stage_name: "NC2", thu_tu: 5 },
      { stage_code: "NC3", line_id: "NC", stage_name: "NC3", thu_tu: 6 },
      { stage_code: "MNC1", line_id: "MNC", stage_name: "MNC1", thu_tu: 7 },
      { stage_code: "MNC2", line_id: "MNC", stage_name: "MNC2", thu_tu: 8 },
      { stage_code: "MNC3", line_id: "MNC", stage_name: "MNC3", thu_tu: 9 },
      { stage_code: "GS", line_id: "GS_GV", stage_name: "GS", thu_tu: 10 },
      { stage_code: "GV", line_id: "GS_GV", stage_name: "GV", thu_tu: 11 },
      { stage_code: "GP", line_id: "GP_GE_GI", stage_name: "GP", thu_tu: 12 },
      { stage_code: "GE", line_id: "GP_GE_GI", stage_name: "GE", thu_tu: 13 },
      { stage_code: "GI", line_id: "GP_GE_GI", stage_name: "GI", thu_tu: 14 },
      { stage_code: "LAP_RAP", line_id: "ASSY", stage_name: "Lắp ráp", thu_tu: 15 },
      { stage_code: "DONG_THUNG", line_id: "ASSY", stage_name: "Đóng thùng", thu_tu: 16 },
      { stage_code: "XUAT_GCN", line_id: "ASSY", stage_name: "Đi-GCN", thu_tu: 17 },
      { stage_code: "NHAN_GCN", line_id: "ASSY", stage_name: "Về-GCN", thu_tu: 18 },
      { stage_code: "KIEM_TRA", line_id: "KENSA", stage_name: "Kiểm tra", thu_tu: 19 }
    ],
    machines: [
      { ma_may: "M-CAT-01", ten_may: "Máy Cắt Phôi 01", stage_code: "CAT", cong_suat_ca: 600, trang_thai_may: "RUNNING", lot_dang_chay: "PO2010-01" },
      { ma_may: "M-CAT-02", ten_may: "Máy Cắt Phôi 02", stage_code: "CAT", cong_suat_ca: 600, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "LO-NHIET-01", ten_may: "Lò Nhiệt Luyện 01", stage_code: "NHIET_LUYEN", cong_suat_ca: 1000, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "MAY-DO-01", ten_may: "Máy Đo Độ Cứng 01", stage_code: "DO_CUNG", cong_suat_ca: 1000, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "M-NC1-01", ten_may: "Máy Tiện NC1 - 01", stage_code: "NC1", cong_suat_ca: 450, trang_thai_may: "RUNNING", lot_dang_chay: "PO2010-02" },
      { ma_may: "M-NC1-02", ten_may: "Máy Tiện NC1 - 02", stage_code: "NC1", cong_suat_ca: 450, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "M-NC2-01", ten_may: "Máy Tiện NC2 - 01", stage_code: "NC2", cong_suat_ca: 450, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "M-NC3-01", ten_may: "Máy Tiện NC3 - 01", stage_code: "NC3", cong_suat_ca: 450, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "M-MNC1-01", ten_may: "Máy Phay MNC1 - 01", stage_code: "MNC1", cong_suat_ca: 400, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "M-MNC2-01", ten_may: "Máy Phay MNC2 - 01", stage_code: "MNC2", cong_suat_ca: 400, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "M-MNC3-01", ten_may: "Máy Phay MNC3 - 01", stage_code: "MNC3", cong_suat_ca: 400, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "M-GS-01", ten_may: "Máy GS 01", stage_code: "GS", cong_suat_ca: 500, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "M-GV-01", ten_may: "Máy GV 01", stage_code: "GV", cong_suat_ca: 500, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "M-GP-01", ten_may: "Máy GP 01", stage_code: "GP", cong_suat_ca: 500, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "M-GE-01", ten_may: "Máy GE 01", stage_code: "GE", cong_suat_ca: 500, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "M-GI-01", ten_may: "Máy GI 01", stage_code: "GI", cong_suat_ca: 500, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "BAN-ASSY-01", ten_may: "Bàn Lắp Ráp 01", stage_code: "LAP_RAP", cong_suat_ca: 800, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "BAN-PACK-01", ten_may: "Bàn Đóng Thùng 01", stage_code: "DONG_THUNG", cong_suat_ca: 1000, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "TRAM-GCN-OUT", ten_may: "Trạm Xuất Đi GCN", stage_code: "XUAT_GCN", cong_suat_ca: 2000, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "TRAM-GCN-IN", ten_may: "Trạm Nhận Hàng GCN", stage_code: "NHAN_GCN", cong_suat_ca: 2000, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "BAN-KENSA-01", ten_may: "Bàn Kiểm Tra Kensa 01", stage_code: "KIEM_TRA", cong_suat_ca: 1000, trang_thai_may: "IDLE", lot_dang_chay: "" }
    ],
    products: [
      {
        ma_sp: "TB-30",
        ten_sp: "Bánh răng truyền động thép C45",
        quy_cach: "Ø30 x 15mm",
        routing_map: [
          { order: 1, stage_id: "CAT" },
          { order: 2, stage_id: "NC1" },
          { order: 3, stage_id: "NC2" },
          { order: 4, stage_id: "MNC1" },
          { order: 5, stage_id: "NHIET_LUYEN" },
          { order: 6, stage_id: "DO_CUNG" },
          { order: 7, stage_id: "GS" },
          { order: 8, stage_id: "LAP_RAP" },
          { order: 9, stage_id: "KIEM_TRA" }
        ]
      }
    ],
    lots: [
      {
        so_lot: "PO2010-01",
        so_po_goc: "PO2010",
        ma_sp: "TB-30",
        ngay_cap_phat: "2026-10-20",
        tong_sl: 300,
        sl_hoan_thanh_kho: 0,
        wip_data: {
          CAT: { waiting: 300, good: 0, ng: 0, machine: "M-CAT-01" }
        }
      },
      {
        so_lot: "PO2010-02",
        so_po_goc: "PO2010",
        ma_sp: "TB-30",
        ngay_cap_phat: "2026-10-20",
        tong_sl: 300,
        sl_hoan_thanh_kho: 0,
        wip_data: {
          CAT: { waiting: 0, good: 300, ng: 0, machine: "M-CAT-01" },
          NC1: { waiting: 290, good: 0, ng: 10, machine: "M-NC1-01" }
        }
      },
      {
        so_lot: "PO2010-03",
        so_po_goc: "PO2010",
        ma_sp: "TB-30",
        ngay_cap_phat: "2026-10-20",
        tong_sl: 300,
        sl_hoan_thanh_kho: 0,
        wip_data: {
          CAT: { waiting: 0, good: 300, ng: 0, machine: "M-CAT-02" },
          NC1: { waiting: 0, good: 300, ng: 0, machine: "M-NC1-01" },
          NC2: { waiting: 0, good: 300, ng: 0, machine: "M-NC2-01" },
          MNC1: { waiting: 0, good: 300, ng: 0, machine: "M-MNC1-01" },
          NHIET_LUYEN: { waiting: 300, good: 0, ng: 0, machine: "" }
        }
      }
    ],
    nccs: [
      { ma_ncc: "NCC001", ten_ncc: "Thép Đặc Biệt Daido", so_dt: "0901234567 - Mr. Kenji", dia_chi: "KCN VSIP 1, Bình Dương" },
      { ma_ncc: "NCC002", ten_ncc: "Hóa Chất Minh Trí", so_dt: "0908889999 - Chị Lan", dia_chi: "Thuận An, Bình Dương" }
    ],
    items: [
      { ma_hang: "NVL001", phan_loai: "Kim Loại", ten_hang: "Thép tròn đặc C45", quy_cach: "Ø30mm x 6m", don_vi_tinh: "Kg", ma_ncc: "NCC001", tong_nhap: 1500, tong_xuat_sx: 120, ton_kho: 1380 },
      { ma_hang: "NVL002", phan_loai: "Kim Loại", ten_hang: "Thép hợp kim SCM440", quy_cach: "Ø20mm x 6m", don_vi_tinh: "Kg", ma_ncc: "NCC001", tong_nhap: 850, tong_xuat_sx: 50, ton_kho: 800 },
      { ma_hang: "NVL003", phan_loai: "Hóa Chất", ten_hang: "Dầu cắt gọt pha nước CNC", quy_cach: "Phuy 200L", don_vi_tinh: "Lít", ma_ncc: "NCC002", tong_nhap: 400, tong_xuat_sx: 40, ton_kho: 360 }
    ],
    prodLogs: [
      { thoi_gian: "20/10/2026 08:30", nguoi_thao_tac: "LD_CUTTING", ma_may: "M-CAT-01", so_lot: "PO2010-02", ma_sp: "TB-30", tu_cong_doan: "CAT", den_cong_doan: "NC1", sl_ok: 300, sl_ng: 0 }
    ],
    nvlLogs: [
      { thoi_gian_gd: "20/10/2026 07:45", ma_hang: "NVL001", ten_hang: "Thép tròn đặc C45", loai_giao_dich: "XUAT_SAN_XUAT", so_luong: 120, don_vi_tinh: "Kg", ma_may_sx: "M-CAT-01", so_lot_sx: "PO2010-01", nguoi_giao_dich: "LD_CUTTING", ghi_chu: "Xuất phôi đầu ca" }
    ]
  };
}

function loadDatabase() {
  var raw = localStorage.getItem(SHARED_DB_KEY);
  if (raw) {
    try {
      db = JSON.parse(raw);
      if (!db.users || !Array.isArray(db.users) || db.users.length === 0) {
        db.users = getInitialSharedData().users;
        saveDatabase();
      }
      return;
    } catch (e) {}
  }
  db = getInitialSharedData();
  saveDatabase();
}

function saveDatabase() {
  localStorage.setItem(SHARED_DB_KEY, JSON.stringify(db));
}

function findDbUser(maNv) {
  if (!db || !db.users) return null;
  for (var i = 0; i < db.users.length; i++) {
    if (db.users[i].ma_nv.toUpperCase() === String(maNv).toUpperCase()) {
      return db.users[i];
    }
  }
  return null;
}

window.resetSharedData = function () {
  if (!confirm("Khôi phục toàn bộ dữ liệu mẫu 7 Lines & 19 Stages?")) return;
  db = getInitialSharedData();
  saveDatabase();
  renderAllViews();
  showToast("Đã reset dữ liệu mẫu thành công!");
};

function getMyLineStages() {
  if (!currentUser || currentUser.role === "ADMIN" || currentUser.line_id === "ALL") {
    return db.stages;
  }
  var res = [];
  for (var i = 0; i < db.stages.length; i++) {
    if (db.stages[i].line_id === currentUser.line_id) {
      res.push(db.stages[i]);
    }
  }
  return res;
}

window.addEventListener("DOMContentLoaded", function () {
  loadDatabase();
  var today = new Date().toISOString().slice(0, 10);
  if (el("po-date")) el("po-date").value = today;
  initDefaultRoutingBuilder();

  var savedUser = localStorage.getItem(SHARED_USER_KEY);
  if (savedUser) {
    try {
      var u = JSON.parse(savedUser);
      var freshUser = findDbUser(u.ma_nv);
      if (freshUser && !freshUser.must_change_pwd) {
        loginSuccess(freshUser);
      }
    } catch (e) {}
  }
});

el("login-form").addEventListener("submit", function (e) {
  e.preventDefault();
  var uName = el("username").value.trim().toUpperCase();
  var pwd = el("password").value;
  var user = findDbUser(uName);
  if (!user) {
    showToast("Tài khoản [" + uName + "] không tồn tại!", true);
    return;
  }
  if (user.password !== pwd) {
    showToast("Mật khẩu không chính xác!", true);
    return;
  }

  // Kiem tra bat buoc doi mat khau lan dau
  if (user.must_change_pwd) {
    pendingFirstLoginUser = user;
    el("chg-pwd-user").value = user.ma_nv + " (" + user.ten_nv + ")";
    el("chg-pwd-new").value = "";
    el("chg-pwd-confirm").value = "";
    el("modal-first-change-pwd").classList.remove("hidden");
    return;
  }

  loginSuccess(user);
});

window.submitFirstChangePassword = function (e) {
  e.preventDefault();
  if (!pendingFirstLoginUser) return;
  var newPwd = el("chg-pwd-new").value.trim();
  var confirmPwd = el("chg-pwd-confirm").value.trim();

  if (newPwd.length < 4) {
    showToast("Mật khẩu mới phải có tối thiểu 4 ký tự!", true);
    return;
  }
  if (newPwd !== confirmPwd) {
    showToast("Xác nhận mật khẩu mới không khớp!", true);
    return;
  }

  // Cap nhat mat khau trong db
  for (var i = 0; i < db.users.length; i++) {
    if (db.users[i].ma_nv === pendingFirstLoginUser.ma_nv) {
      db.users[i].password = newPwd;
      db.users[i].must_change_pwd = false;
      pendingFirstLoginUser = db.users[i];
      break;
    }
  }
  saveDatabase();
  el("modal-first-change-pwd").classList.add("hidden");
  showToast("Đã đổi mật khẩu thành công! Đang vào ca làm việc...");
  loginSuccess(pendingFirstLoginUser);
  pendingFirstLoginUser = null;
};

window.openChangePasswordModal = function () {
  if (!currentUser) return;
  pendingFirstLoginUser = findDbUser(currentUser.ma_nv) || currentUser;
  el("chg-pwd-user").value = pendingFirstLoginUser.ma_nv + " (" + pendingFirstLoginUser.ten_nv + ")";
  el("chg-pwd-new").value = "";
  el("chg-pwd-confirm").value = "";
  el("modal-first-change-pwd").classList.remove("hidden");
};

function loginSuccess(u) {
  currentUser = u;
  localStorage.setItem(SHARED_USER_KEY, JSON.stringify(u));
  el("login-screen").classList.add("hidden");

  if (u.role === "ADMIN") {
    el("leader-screen").classList.add("hidden");
    el("admin-screen").classList.remove("hidden");
    renderAllViews();
  } else {
    el("admin-screen").classList.add("hidden");
    el("leader-screen").classList.remove("hidden");

    var switcher = el("quick-switch-leader");
    if (switcher) {
      switcher.value = u.ma_nv;
      // An select switch neu la Leader thuc te, chi Admin moi duoc chuyen linh hoat
      switcher.style.display = (u.role === "ADMIN") ? "inline-block" : "none";
    }

    // Chi Leader Line CUTTING moi hien nut mo sang kho.html va tab nvl
    var gotoKhoBtn = el("btn-goto-kho-app");
    var tabCuttingNvlBtn = el("btn-ld-tab-cutting-nvl");
    if (u.line_id === "CUTTING") {
      if (gotoKhoBtn) gotoKhoBtn.classList.remove("hidden");
      if (tabCuttingNvlBtn) tabCuttingNvlBtn.classList.remove("hidden");
    } else {
      if (gotoKhoBtn) gotoKhoBtn.classList.add("hidden");
      if (tabCuttingNvlBtn) tabCuttingNvlBtn.classList.add("hidden");
    }

    openLeaderTab("ld-tab-wip", el("btn-ld-tab-wip"));
  }
}

window.quickLogin = function (code) {
  var user = findDbUser(code) || USERS_DIRECTORY[code] || USERS_DIRECTORY.ADMIN;
  if (el("username")) el("username").value = user.ma_nv;
  if (el("password")) el("password").value = user.password || "123";

  if (user.must_change_pwd) {
    pendingFirstLoginUser = user;
    el("chg-pwd-user").value = user.ma_nv + " (" + user.ten_nv + ")";
    el("chg-pwd-new").value = "";
    el("chg-pwd-confirm").value = "";
    el("modal-first-change-pwd").classList.remove("hidden");
    return;
  }
  loginSuccess(user);
};

window.logout = function () {
  currentUser = null;
  localStorage.removeItem(SHARED_USER_KEY);
  el("admin-screen").classList.add("hidden");
  el("leader-screen").classList.add("hidden");
  el("login-screen").classList.remove("hidden");
};

window.openAdminTab = function (tabId, btnEl) {
  var tabs = document.querySelectorAll(".admin-tab");
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.add("hidden");
  el(tabId).classList.remove("hidden");

  var btns = document.querySelectorAll(".sidebar .tab-btn");
  for (var j = 0; j < btns.length; j++) btns[j].classList.remove("active");
  if (btnEl) btnEl.classList.add("active");
  renderAllViews();
};

window.openLeaderTab = function (tabId, btnEl) {
  var tabs = document.querySelectorAll(".ld-tab");
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.add("hidden");
  el(tabId).classList.remove("hidden");

  var btns = document.querySelectorAll(".tabs-mobile .tab-btn-mobile");
  for (var j = 0; j < btns.length; j++) btns[j].classList.remove("active");
  if (btnEl) btnEl.classList.add("active");
  renderAllViews();
};

function renderAllViews() {
  db.stages.sort(function (a, b) {
    return a.thu_tu - b.thu_tu;
  });
  renderAdminKPIs();
  renderAdminMatrix();
  renderAdminMachineBoard();
  renderWorkCenterManagement();
  renderProductsTab();
  renderCreatePoTab();
  renderNgResolveTab();
  renderLogsTab();

  if (currentUser && currentUser.role === "LEADER") {
    renderLeaderScreen();
  }
}

// =================================================================================
// GIAO DIEN LEADER THEO LINE (XEM HANG TRONG CAC STAGE THUOC LINE & CHON MAY)
// =================================================================================
window.renderLeaderScreen = function () {
  var myStages = getMyLineStages();
  var myStageCodes = [];
  var myStageNames = [];
  for (var i = 0; i < myStages.length; i++) {
    myStageCodes.push(myStages[i].stage_code);
    myStageNames.push(myStages[i].stage_name);
  }

  var lineName = currentUser.line_id;
  for (var l = 0; l < db.lines.length; l++) {
    if (db.lines[l].line_id === currentUser.line_id) {
      lineName = db.lines[l].line_name;
      break;
    }
  }

  el("ld-header-name").textContent = currentUser.ten_nv;
  el("ld-header-line-name").textContent = lineName;
  el("ld-header-stages").textContent = myStageNames.join(", ");

  var subFilter = el("ld-stage-subfilter");
  if (subFilter && lastLineIdRendered !== currentUser.line_id) {
    lastLineIdRendered = currentUser.line_id;
    var optHtml = '<option value="ALL">-- Mọi công đoạn thuộc ' + lineName + " (" + myStages.length + ") --</option>";
    for (var s = 0; s < myStages.length; s++) {
      optHtml += '<option value="' + myStages[s].stage_code + '">Công đoạn: ' + myStages[s].stage_name + " (" + myStages[s].stage_code + ")</option>";
    }
    subFilter.innerHTML = optHtml;
  }

  var stageFilter = subFilter ? subFilter.value : "ALL";
  var kwInput = el("ld-kw-filter");
  var kw = kwInput ? kwInput.value.trim().toUpperCase() : "";

  var activeStageCodes = [];
  for (var c = 0; c < myStageCodes.length; c++) {
    if (stageFilter === "ALL" || myStageCodes[c] === stageFilter) {
      activeStageCodes.push(myStageCodes[c]);
    }
  }

  renderLeaderWipCards(activeStageCodes, kw);
  renderLeaderMachinesCards(activeStageCodes, kw);
  renderLeaderHistoryTab(myStageCodes);
  if (currentUser.line_id === "CUTTING") renderCuttingNvlQuickView();
};

function renderCuttingNvlQuickView() {
  var container = el("cutting-nvl-quick-view");
  if (!container) return;
  var nvlLogs = orVal(db.nvlLogs, []);
  var items = orVal(db.items, []);

  var stockHtml = '<h4 style="margin-bottom:8px; color:var(--navy);">📦 Tồn Kho NVL Tức Thời</h4><div class="table-wrap"><table class="matrix-table"><thead><tr><th>Mã NVL</th><th>Tên & Quy Cách</th><th>Nhập</th><th>Xuất SX</th><th>Tồn</th></tr></thead><tbody>';
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    stockHtml += '<tr><td><b>' + it.ma_hang + '</b></td><td style="text-align:left;">' + it.ten_hang + '<br><small style="color:var(--gray-dark);">' + orVal(it.quy_cach, "") + '</small></td>' +
      '<td style="color:var(--green); font-weight:700;">' + it.tong_nhap + '</td>' +
      '<td style="color:var(--maroon); font-weight:700;">' + it.tong_xuat_sx + '</td>' +
      '<td><span class="badge-ok">' + it.ton_kho + ' ' + it.don_vi_tinh + '</span></td></tr>';
  }
  stockHtml += '</tbody></table></div>';

  var logHtml = '<h4 style="margin:14px 0 8px; color:var(--navy);">🕒 Lịch Sử 10 Giao Dịch Gần Nhất</h4><div class="table-wrap"><table class="matrix-table"><thead><tr><th>Thời Gian</th><th>NVL</th><th>Loại GD</th><th>Số Lượng</th><th>Ghi Chú</th></tr></thead><tbody>';
  var cnt = 0;
  for (var j = 0; j < nvlLogs.length && cnt < 10; j++) {
    var g = nvlLogs[j];
    var badge = g.loai_giao_dich === "NHAP_KHO" ? '<span class="badge-ok">Nhập</span>' : '<span class="badge-wait">Xuất SX</span>';
    logHtml += '<tr><td>' + g.thoi_gian_gd + '</td><td style="text-align:left;"><b>' + g.ma_hang + '</b> ' + g.ten_hang + '</td><td>' + badge + '</td><td><b>' + g.so_luong + '</b> ' + g.don_vi_tinh + '</td><td style="text-align:left;">' + orVal(g.ghi_chu, "-") + '</td></tr>';
    cnt++;
  }
  if (cnt === 0) logHtml += '<tr><td colspan="5" style="padding:14px;">Chưa có giao dịch kho nào.</td></tr>';
  logHtml += '</tbody></table></div>';

  container.innerHTML = stockHtml + logHtml;
}



function findStageObj(code) {
  for (var i = 0; i < db.stages.length; i++) {
    if (db.stages[i].stage_code === code) return db.stages[i];
  }
  return null;
}

function findProductObj(maSp) {
  for (var i = 0; i < db.products.length; i++) {
    if (db.products[i].ma_sp === maSp) return db.products[i];
  }
  return null;
}

function renderLeaderWipCards(activeStageCodes, kw) {
  var container = el("ld-waiting-lots-container");
  if (!container) return;

  var cards = [];
  for (var i = 0; i < db.lots.length; i++) {
    var lot = db.lots[i];
    if (kw && lot.so_lot.toUpperCase().indexOf(kw) === -1 && lot.ma_sp.toUpperCase().indexOf(kw) === -1) {
      continue;
    }
    var prod = findProductObj(lot.ma_sp);
    var routing = prod ? orVal(prod.routing_map, []) : [];

    for (var s = 0; s < activeStageCodes.length; s++) {
      var stCode = activeStageCodes[s];
      var cell = lot.wip_data ? lot.wip_data[stCode] : null;
      if (cell && cell.waiting > 0) {
        var stObj = findStageObj(stCode);
        var nextStageName = "KHO THÀNH PHẨM";
        for (var r = 0; r < routing.length; r++) {
          if (routing[r].stage_id === stCode && r + 1 < routing.length) {
            var nextCode = routing[r + 1].stage_id;
            var nextObj = findStageObj(nextCode);
            nextStageName = nextObj ? nextObj.stage_name + " (Line " + nextObj.line_id + ")" : nextCode;
            break;
          }
        }
        cards.push({
          so_lot: lot.so_lot,
          ma_sp: lot.ma_sp,
          stage_code: stCode,
          stage_name: stObj ? stObj.stage_name : stCode,
          waiting: cell.waiting,
          machine: orVal(cell.machine, ""),
          next_stage_name: nextStageName
        });
      }
    }
  }

  el("badge-count-waiting").textContent = cards.length;

  if (cards.length === 0) {
    container.innerHTML = '<div class="card" style="text-align:center; padding:28px; color:var(--gray-dark);">Không có lô hàng nào đang chờ tại Line <b>' + currentUser.line_id + "</b>.</div>";
    return;
  }

  var html = "";
  for (var k = 0; k < cards.length; k++) {
    var item = cards[k];
    var mcOptions = '<option value="">-- Chọn Máy tại công đoạn ' + item.stage_name + " --</option>";
    for (var m = 0; m < db.machines.length; m++) {
      var mc = db.machines[m];
      if (mc.stage_code === item.stage_code) {
        var selAttr = item.machine === mc.ma_may ? " selected" : "";
        var statusTxt = mc.lot_dang_chay ? " (Đang chạy " + mc.lot_dang_chay + ")" : " (Rảnh)";
        mcOptions += '<option value="' + mc.ma_may + '"' + selAttr + ">" + mc.ma_may + " - " + mc.ten_may + statusTxt + "</option>";
      }
    }

    var borderCol = item.machine ? "var(--green)" : "var(--amber)";
    html +=
      '<div class="card" style="border-left: 5px solid ' + borderCol + ';">' +
      '<div style="display:flex; justify-content:space-between; align-items:flex-start;">' +
      "<div>" +
      '<h3 style="color:var(--navy); margin-bottom:4px;">' + item.so_lot + ' <span style="font-size:13px; color:var(--gray-dark);">(' + item.ma_sp + ")</span></h3>" +
      '<p style="font-size:13px;">📍 Hiện tại: <strong style="color:var(--maroon);">' + item.stage_name + " (" + item.stage_code + ")</strong></p>" +
      '<p style="font-size:12px; color:var(--gray-dark);">➔ Sau khi PASS sẽ đến: <b>' + item.next_stage_name + "</b></p>" +
      "</div>" +
      '<div style="text-align:right;">' +
      '<span style="font-size:11px;">Đang chờ:</span>' +
      '<div style="font-size:20px; font-weight:800; color:var(--navy);">' + item.waiting + "</div>" +
      "</div>" +
      "</div>" +
      '<div style="background:#f8fafc; padding:10px; border-radius:8px; border:1px solid var(--border); margin-top:10px;">' +
      '<label style="font-size:12px; font-weight:700; color:var(--navy); display:block; margin-bottom:6px;">⚙️ Phân bổ LOT [' + item.stage_name + '] vào Máy:</label>' +
      '<div style="display:grid; grid-template-columns: 1fr auto; gap:8px; margin-bottom:8px;">' +
      '<select id="assign-mc-' + item.so_lot + "-" + item.stage_code + '" class="search-input" style="font-weight:700;">' + mcOptions + "</select>" +
      "</div>" +
      '<div style="display:grid; grid-template-columns: 1fr auto; gap:8px; align-items:flex-end;">' +
      '<div>' +
      '<label style="font-size:11px; font-weight:700; color:var(--slate); display:block; margin-bottom:4px;">SỐ LƯỢNG PHÂN BỔ (Tối đa: ' + item.waiting + ')</label>' +
      '<input type="number" inputmode="numeric" id="assign-qty-' + item.so_lot + "-" + item.stage_code + '" class="big-input" placeholder="' + item.waiting + '" min="1" max="' + item.waiting + '" style="width:100%; border:2px solid var(--primary); color:var(--primary); background:#eff6ff;" />' +
      "</div>" +
      '<button type="button" class="btn btn-primary" style="min-height:48px; padding:0 16px; white-space:nowrap;" onclick="assignLotToStageMachine(\'' + item.so_lot + "', '" + item.stage_code + '\')">✅ Phân Máy</button>' +
      "</div>" +
      "</div></div>";
  }
  container.innerHTML = html;
}

window.assignLotToStageMachine = function (soLot, stageCode) {
  var sel = el("assign-mc-" + soLot + "-" + stageCode);
  var maMay = sel ? sel.value : "";
  if (!maMay) {
    showToast("Vui lòng chọn Máy để phân bổ LOT!", true);
    return;
  }

  var qtyInput = el("assign-qty-" + soLot + "-" + stageCode);
  var phanBoQty = qtyInput ? parseInt(qtyInput.value) : NaN;

  for (var i = 0; i < db.lots.length; i++) {
    if (db.lots[i].so_lot === soLot && db.lots[i].wip_data[stageCode]) {
      var wipCell = db.lots[i].wip_data[stageCode];
      var maxQty = wipCell.waiting;
      if (isNaN(phanBoQty) || phanBoQty <= 0) phanBoQty = maxQty;
      if (phanBoQty > maxQty) {
        showToast("Số lượng phân bổ (" + phanBoQty + ") vượt tồn chờ (" + maxQty + ")!", true);
        return;
      }
      wipCell.machine = maMay;
      wipCell.phan_bo_qty = phanBoQty;
    }
  }
  for (var m = 0; m < db.machines.length; m++) {
    if (db.machines[m].ma_may === maMay) {
      db.machines[m].trang_thai_may = "RUNNING";
      db.machines[m].lot_dang_chay = soLot;
    }
  }

  saveDatabase();
  renderAllViews();
  showToast("Đã phân " + phanBoQty + " cái LOT [" + soLot + "] vào máy [" + maMay + "]!");
};

function renderLeaderMachinesCards(activeStageCodes, kw) {
  var container = el("leader-machines-container");
  if (!container) return;

  var myMachines = [];
  var runningCount = 0;
  for (var i = 0; i < db.machines.length; i++) {
    var m = db.machines[i];
    if (activeStageCodes.indexOf(m.stage_code) !== -1) {
      myMachines.push(m);
      if (m.trang_thai_may === "RUNNING" && m.lot_dang_chay) runningCount++;
    }
  }

  el("badge-count-running").textContent = runningCount + "/" + myMachines.length;

  var html = "";
  for (var k = 0; k < myMachines.length; k++) {
    var mc = myMachines[k];
    var stObj = findStageObj(mc.stage_code);
    var stName = stObj ? stObj.stage_name : mc.stage_code;

    var waitingLots = [];
    for (var l = 0; l < db.lots.length; l++) {
      var lot = db.lots[l];
      if (kw && lot.so_lot.toUpperCase().indexOf(kw) === -1 && lot.ma_sp.toUpperCase().indexOf(kw) === -1) continue;
      var w = lot.wip_data ? lot.wip_data[mc.stage_code] : null;
      if (w && w.waiting > 0) waitingLots.push(lot);
    }

    var activeLotNo = orVal(mc.lot_dang_chay, waitingLots.length > 0 ? waitingLots[0].so_lot : "");
    var lotOpts = "";
    if (waitingLots.length > 0) {
      for (var wIdx = 0; wIdx < waitingLots.length; wIdx++) {
        var wl = waitingLots[wIdx];
        var sel = wl.so_lot === activeLotNo ? " selected" : "";
        lotOpts += '<option value="' + wl.so_lot + '"' + sel + ">" + wl.so_lot + " [" + wl.ma_sp + "] - Tồn tại " + stName + ": " + wl.wip_data[mc.stage_code].waiting + " cái</option>";
      }
    } else {
      lotOpts = '<option value="">-- Không có LOT chờ ở ' + stName + " --</option>";
    }

    var isRun = mc.trang_thai_may === "RUNNING" && mc.lot_dang_chay;
    var badgeHtml = isRun
      ? '<span class="badge-ok">🟢 ĐANG CHẠY<br>' + mc.lot_dang_chay + "</span>"
      : '<span class="badge-wait">⚪ MÁY RẢNH</span>';

    html +=
      '<div class="m-card ' + (isRun ? "running" : "") + '">' +
      '<div class="m-card-header" onclick="toggleMachineBody(\'' + mc.ma_may + '\')">' +
      "<div>" +
      '<div style="font-size:15px; font-weight:800; color:var(--navy);">⚙️ ' + mc.ma_may + " - " + mc.ten_may + "</div>" +
      '<div style="font-size:12px; color:var(--gray-dark);">Công đoạn: <b style="color:var(--maroon);">' + stName + " (" + mc.stage_code + ")</b> | ĐM: <b>" + mc.cong_suat_ca + "</b>/ca</div>" +
      "</div>" +
      "<div>" + badgeHtml + "</div>" +
      "</div>" +
      '<div class="m-card-body" id="mbody-' + mc.ma_may + '">' +
      '<div class="input-group"><label>Chọn LOT xử lý trên máy [' + mc.ma_may + ']:</label>' +
      '<select id="sel-lot-' + mc.ma_may + '" class="search-input" style="font-weight:700; color:var(--navy);">' + lotOpts + "</select></div>" +
      '<div class="numpad-grid">' +
      '<div><label style="font-size:12px; font-weight:800; color:var(--green); display:block; margin-bottom:4px;">SỐ LƯỢNG GIAO (PASS)</label>' +
      '<input type="number" inputmode="numeric" id="ok-' + mc.ma_may + '" class="big-input ok-input w-100" placeholder="0" min="0" /></div>' +
      '<div><label style="font-size:12px; font-weight:800; color:var(--maroon); display:block; margin-bottom:4px;">SỐ LƯỢNG LỖI (NG)</label>' +
      '<input type="number" inputmode="numeric" id="ng-' + mc.ma_may + '" class="big-input ng-input w-100" placeholder="0" min="0" /></div>' +
      "</div>" +
      '<button type="button" class="btn btn-primary w-100" style="min-height:46px;" onclick="submitLeaderMachineMove(\'' + mc.ma_may + "', '" + mc.stage_code + "', " + mc.cong_suat_ca + ')">✅ XÁC NHẬN GIAO NHẬN</button>' +
      "</div></div>";
  }
  container.innerHTML = html;
}

window.toggleMachineBody = function (maMay) {
  var b = el("mbody-" + maMay);
  if (b) b.classList.toggle("hidden");
};

window.submitLeaderMachineMove = function (maMay, stageCode, maxCap) {
  var sel = el("sel-lot-" + maMay);
  var lotNo = sel ? sel.value : "";
  if (!lotNo) {
    showToast("Vui lòng chọn 1 LOT đang chờ!", true);
    return;
  }

  var okQty = parseInt(el("ok-" + maMay).value);
  if (isNaN(okQty)) okQty = 0;
  var ngQty = parseInt(el("ng-" + maMay).value);
  if (isNaN(ngQty)) ngQty = 0;

  if (okQty + ngQty <= 0) {
    showToast("Vui lòng nhập số lượng PASS hoặc NG!", true);
    return;
  }

  var lot = null;
  for (var i = 0; i < db.lots.length; i++) {
    if (db.lots[i].so_lot === lotNo) {
      lot = db.lots[i];
      break;
    }
  }
  if (!lot) return;

  var curWip = lot.wip_data[stageCode] ? lot.wip_data[stageCode] : { waiting: 0, good: 0, ng: 0, machine: maMay };
  if (okQty + ngQty > curWip.waiting) {
    showToast("Số lượng (" + (okQty + ngQty) + ") vượt quá số lượng tồn tại " + stageCode + " (" + curWip.waiting + ")!", true);
    return;
  }
  if (okQty + ngQty > maxCap) {
    if (!confirm("Số lượng (" + (okQty + ngQty) + ") vượt định mức ca của máy (" + maxCap + "). Bạn có chắc chắn không?")) return;
  }

  curWip.waiting -= (okQty + ngQty);
  curWip.good = orVal(curWip.good, 0) + okQty;
  curWip.ng = orVal(curWip.ng, 0) + ngQty;
  curWip.machine = maMay;
  lot.wip_data[stageCode] = curWip;

  var prod = findProductObj(lot.ma_sp);
  var routing = prod ? orVal(prod.routing_map, []) : [];
  var curIdx = -1;
  for (var r = 0; r < routing.length; r++) {
    if (routing[r].stage_id === stageCode) {
      curIdx = r;
      break;
    }
  }

  var nextStageLabel = "KHO THÀNH PHẨM";
  if (curIdx !== -1 && curIdx + 1 < routing.length) {
    var nextCode = routing[curIdx + 1].stage_id;
    var nextObj = findStageObj(nextCode);
    nextStageLabel = nextObj ? nextObj.stage_name + " (" + nextObj.line_id + ")" : nextCode;
    if (!lot.wip_data[nextCode]) {
      lot.wip_data[nextCode] = { waiting: 0, good: 0, ng: 0, machine: "" };
    }
    lot.wip_data[nextCode].waiting += okQty;
  } else {
    lot.sl_hoan_thanh_kho = orVal(lot.sl_hoan_thanh_kho, 0) + okQty;
  }

  for (var m = 0; m < db.machines.length; m++) {
    if (db.machines[m].ma_may === maMay) {
      db.machines[m].trang_thai_may = curWip.waiting === 0 ? "IDLE" : "RUNNING";
      db.machines[m].lot_dang_chay = curWip.waiting === 0 ? "" : lotNo;
    }
  }

  db.prodLogs.unshift({
    thoi_gian: nowVN(),
    nguoi_thao_tac: currentUser.ma_nv,
    ma_may: maMay,
    so_lot: lotNo,
    ma_sp: lot.ma_sp,
    tu_cong_doan: stageCode,
    den_cong_doan: nextStageLabel,
    sl_ok: okQty,
    sl_ng: ngQty
  });

  saveDatabase();
  renderAllViews();
  showToast("Đã chuyển " + okQty + " cái sang [" + nextStageLabel + "]!");
};

function renderLeaderHistoryTab(myStageCodes) {
  var tbody = el("ld-history-tbody");
  if (!tbody) return;
  var html = "";
  var count = 0;
  for (var i = 0; i < db.prodLogs.length; i++) {
    var l = db.prodLogs[i];
    if (myStageCodes.indexOf(l.tu_cong_doan) !== -1) {
      count++;
      html +=
        "<tr>" +
        "<td>" + l.thoi_gian + "</td>" +
        '<td style="text-align:left; white-space:normal;">LOT <b>' + l.so_lot + "</b> (" + l.ma_sp + ") | Máy <b>" + l.ma_may + "</b><br><small>" + l.tu_cong_doan + " ➔ " + l.den_cong_doan + "</small></td>" +
        '<td><span class="badge-ok">PASS: ' + l.sl_ok + '</span> <span class="badge-ng">NG: ' + l.sl_ng + "</span></td>" +
        "</tr>";
    }
  }
  if (count === 0) {
    html = '<tr><td colspan="3" style="padding:18px;">Chưa có lịch sử giao nhận tại Line này.</td></tr>';
  }
  tbody.innerHTML = html;
}

// =================================================================================
// CAC HAM RENDER ADMIN SAN XUAT
// =================================================================================
function renderAdminKPIs() {
  var runningCount = 0;
  for (var i = 0; i < db.machines.length; i++) {
    if (db.machines[i].trang_thai_may === "RUNNING" && db.machines[i].lot_dang_chay) runningCount++;
  }
  var totalWip = 0;
  var totalDone = 0;
  for (var l = 0; l < db.lots.length; l++) {
    totalDone += Number(orVal(db.lots[l].sl_hoan_thanh_kho, 0));
    var wipObj = orVal(db.lots[l].wip_data, {});
    for (var k in wipObj) {
      totalWip += Number(orVal(wipObj[k].waiting, 0));
    }
  }

  el("admin-kpi-container").innerHTML =
    '<div class="kpi-card"><div class="kpi-num">' + db.lines.length + " Lines / " + db.stages.length + ' Stages</div><div class="kpi-label">Hệ Thống Công Đoạn</div></div>' +
    '<div class="kpi-card" style="border-left-color:var(--green);"><div class="kpi-num">' + runningCount + " / " + db.machines.length + ' Máy</div><div class="kpi-label">Máy Đang Chạy Thực Tế</div></div>' +
    '<div class="kpi-card" style="border-left-color:var(--amber);"><div class="kpi-num">' + db.lots.length + " LOT (" + totalWip + ' cái)</div><div class="kpi-label">Tổng WIP Trên 19 Stages</div></div>' +
    '<div class="kpi-card" style="border-left-color:var(--maroon);"><div class="kpi-num">' + totalDone + ' cái</div><div class="kpi-label">Hoàn Thành Nhập Kho TP</div></div>';
}

window.renderAdminMatrix = function () {
  var wrap = el("matrix-table-wrap");
  if (!wrap) return;
  var kwEl = el("filter-matrix-kw");
  var kw = kwEl ? kwEl.value.trim().toUpperCase() : "";

  var html = '<table class="matrix-table" id="admin-export-matrix"><thead><tr>' +
    '<th rowspan="2">Ngày</th><th rowspan="2">Số LOT</th><th rowspan="2">Mã Hàng</th><th rowspan="2">Tổng</th>';

  for (var i = 0; i < db.stages.length; i++) {
    var st = db.stages[i];
    var bg = orVal(LINE_COLORS[st.line_id], "#edf2f7");
    html += '<th colspan="2" style="background:' + bg + '; border-bottom:1px solid #cbd5e1;">' + st.stage_name + '<br><small style="font-size:10px; font-weight:400;">(' + st.line_id + ")</small></th>";
  }
  html += '<th rowspan="2" style="background:#dcfce7;">KHO</th></tr><tr>';

  for (var j = 0; j < db.stages.length; j++) {
    var st2 = db.stages[j];
    var bg2 = orVal(LINE_COLORS[st2.line_id], "#edf2f7");
    html += '<th style="background:' + bg2 + '; color:#15803d; font-size:11px;">Chờ / OK</th>' +
            '<th style="background:' + bg2 + '; color:#b91c1c; font-size:11px; border-right:2px solid #cbd5e1;">NG</th>';
  }
  html += "</tr></thead><tbody>";

  for (var l = 0; l < db.lots.length; l++) {
    var lot = db.lots[l];
    if (kw && lot.so_lot.toUpperCase().indexOf(kw) === -1 && lot.ma_sp.toUpperCase().indexOf(kw) === -1) continue;

    html += "<tr><td>" + lot.ngay_cap_phat + '</td><td style="font-weight:800; color:var(--navy);">' + lot.so_lot + "</td><td><b>" + lot.ma_sp + "</b></td><td><b>" + lot.tong_sl + "</b></td>";
    for (var s = 0; s < db.stages.length; s++) {
      var stCol = db.stages[s];
      var colBg = orVal(LINE_COLORS[stCol.line_id], "transparent");
      var c = (lot.wip_data && lot.wip_data[stCol.stage_code]) ? lot.wip_data[stCol.stage_code] : { waiting: 0, good: 0, ng: 0, machine: "" };

      var cellContent = '<span style="color:#cbd5e1">-</span>';
      if (c.waiting > 0) {
        cellContent = '<span class="badge-wait">Chờ: ' + c.waiting + "</span>";
        if (c.machine) cellContent += '<br><span class="badge-machine">' + c.machine + "</span>";
        if (c.good > 0) cellContent += '<br><span class="badge-ok">OK: ' + c.good + "</span>";
      } else if (c.good > 0) {
        cellContent = '<span class="badge-ok">' + c.good + "</span>";
        if (c.machine) cellContent += '<br><small style="font-size:10px;">' + c.machine + "</small>";
      }

      var ngContent = c.ng > 0 ? '<span class="badge-ng">' + c.ng + "</span>" : '<span style="color:#cbd5e1">-</span>';
      html += '<td style="background:' + colBg + ';">' + cellContent + '</td><td style="background:' + colBg + '; border-right:2px solid #cbd5e1;">' + ngContent + "</td>";
    }
    var doneVal = lot.sl_hoan_thanh_kho > 0 ? lot.sl_hoan_thanh_kho : "-";
    html += '<td style="font-weight:800; color:var(--green); background:#f0fdf4;">' + doneVal + "</td></tr>";
  }

  wrap.innerHTML = html + "</tbody></table>";
};

function renderAdminMachineBoard() {
  var board = el("admin-machine-board");
  if (!board) return;
  var html = "";
  for (var i = 0; i < db.lines.length; i++) {
    var line = db.lines[i];
    var lineStages = [];
    for (var s = 0; s < db.stages.length; s++) {
      if (db.stages[s].line_id === line.line_id) lineStages.push(db.stages[s].stage_code);
    }
    var mcHtml = "";
    for (var m = 0; m < db.machines.length; m++) {
      var mc = db.machines[m];
      if (lineStages.indexOf(mc.stage_code) !== -1) {
        var isRun = mc.trang_thai_may === "RUNNING" && mc.lot_dang_chay;
        var stBadge = isRun ? '<span class="badge-ok">🟢 ' + mc.lot_dang_chay + "</span>" : '<span style="color:#64748b;">⚪ Rảnh</span>';
        mcHtml +=
          '<div class="machine-box ' + mc.trang_thai_may + '">' +
          '<div style="display:flex; justify-content:space-between; margin-bottom:4px;"><strong style="color:var(--navy);">' + mc.ma_may + '</strong><span class="badge-machine">' + mc.stage_code + "</span></div>" +
          '<div style="font-weight:600; margin-bottom:6px;">' + mc.ten_may + "</div>" +
          '<div style="display:flex; justify-content:space-between; font-size:12px;">' + stBadge + "<span>ĐM: <b>" + mc.cong_suat_ca + "</b></span></div>" +
          "</div>";
      }
    }
    html +=
      '<div style="margin-bottom:16px;">' +
      '<div style="padding:8px 12px; background:' + orVal(LINE_COLORS[line.line_id], "#eee") + '; border-left:4px solid var(--navy); font-weight:800; color:var(--navy); margin-bottom:8px; border-radius:4px;">' +
      line.line_name + " (" + line.line_id + ") — Các Stage: " + lineStages.join(", ") +
      "</div>" +
      '<div class="machine-grid">' + mcHtml + "</div></div>";
  }
  board.innerHTML = html;
}

function renderWorkCenterManagement() {
  var stLineSel = el("st-line");
  if (stLineSel) {
    var lOpts = "";
    for (var i = 0; i < db.lines.length; i++) {
      lOpts += '<option value="' + db.lines[i].line_id + '">' + db.lines[i].line_id + " - " + db.lines[i].line_name + "</option>";
    }
    stLineSel.innerHTML = lOpts;
  }

  var stTbody = el("stages-tbody");
  if (stTbody) {
    var sHtml = "";
    for (var s = 0; s < db.stages.length; s++) {
      var st = db.stages[s];
      var mcCount = 0;
      for (var m = 0; m < db.machines.length; m++) {
        if (db.machines[m].stage_code === st.stage_code) mcCount++;
      }
      sHtml += "<tr><td>" + st.thu_tu + "</td><td><b>" + st.stage_code + '</b></td><td style="text-align:left;">' + st.stage_name + '</td><td><span class="badge-machine">' + st.line_id + "</span></td><td>" + mcCount + ' máy</td><td><button class="btn btn-danger btn-sm" onclick="deleteStage(\'' + st.stage_code + '\')">Xóa</button></td></tr>';
    }
    stTbody.innerHTML = sHtml;
  }

  var mcStageSel = el("mc-stage");
  if (mcStageSel) {
    var stOpts = "";
    for (var k = 0; k < db.stages.length; k++) {
      stOpts += '<option value="' + db.stages[k].stage_code + '">[' + db.stages[k].stage_code + "] " + db.stages[k].stage_name + " (" + db.stages[k].line_id + ")</option>";
    }
    mcStageSel.innerHTML = stOpts;
  }

  var mcTbody = el("machines-tbody");
  if (mcTbody) {
    var mHtml = "";
    for (var idx = 0; idx < db.machines.length; idx++) {
      var mac = db.machines[idx];
      var stObj = findStageObj(mac.stage_code);
      var lineStr = stObj ? stObj.line_id : "";
      var runStr = mac.trang_thai_may === "RUNNING" ? '<span class="badge-ok">' + mac.lot_dang_chay + "</span>" : "Rảnh";
      mHtml += "<tr><td><b>" + mac.ma_may + '</b></td><td style="text-align:left;">' + mac.ten_may + '</td><td><span class="badge-machine">' + mac.stage_code + " (" + lineStr + ")</span></td><td>" + mac.cong_suat_ca + "</td><td>" + runStr + '</td><td><button class="btn btn-danger btn-sm" onclick="deleteMachine(\'' + mac.ma_may + '\')">Xóa</button></td></tr>';
    }
    mcTbody.innerHTML = mHtml;
  }
}

window.saveStage = function (e) {
  e.preventDefault();
  var code = el("st-code").value.trim().toUpperCase();
  var name = el("st-name").value.trim();
  var lineId = el("st-line").value;
  var order = parseInt(el("st-order").value);
  if (isNaN(order)) order = db.stages.length + 1;

  var exist = findStageObj(code);
  if (exist) {
    exist.stage_name = name;
    exist.line_id = lineId;
    exist.thu_tu = order;
  } else {
    db.stages.push({ stage_code: code, line_id: lineId, stage_name: name, thu_tu: order });
  }
  saveDatabase();
  renderAllViews();
  showToast("Đã lưu Stage [" + code + "] thuộc Line [" + lineId + "]!");
};

window.deleteStage = function (code) {
  if (!confirm("Xóa công đoạn [" + code + "]?")) return;
  var nextStages = [];
  for (var i = 0; i < db.stages.length; i++) {
    if (db.stages[i].stage_code !== code) nextStages.push(db.stages[i]);
  }
  db.stages = nextStages;
  saveDatabase();
  renderAllViews();
};

window.saveMachine = function (e) {
  e.preventDefault();
  var code = el("mc-code").value.trim().toUpperCase();
  var name = el("mc-name").value.trim();
  var stageCode = el("mc-stage").value;
  var cap = parseInt(el("mc-cap").value);
  if (isNaN(cap)) cap = 500;

  var found = null;
  for (var i = 0; i < db.machines.length; i++) {
    if (db.machines[i].ma_may === code) found = db.machines[i];
  }
  if (found) {
    found.ten_may = name;
    found.stage_code = stageCode;
    found.cong_suat_ca = cap;
  } else {
    db.machines.push({ ma_may: code, ten_may: name, stage_code: stageCode, cong_suat_ca: cap, trang_thai_may: "IDLE", lot_dang_chay: "" });
  }
  saveDatabase();
  renderAllViews();
  showToast("Đã lưu máy [" + code + "] vào Stage [" + stageCode + "]!");
};

window.deleteMachine = function (code) {
  if (!confirm("Xóa máy [" + code + "]?")) return;
  var nextMc = [];
  for (var i = 0; i < db.machines.length; i++) {
    if (db.machines[i].ma_may !== code) nextMc.push(db.machines[i]);
  }
  db.machines = nextMc;
  saveDatabase();
  renderAllViews();
};

function renderNgResolveTab() {
  var sel = el("ng-lot-stage-select");
  var retSel = el("ng-return-stage");
  if (!sel || !retSel) return;

  var rOpts = "";
  for (var i = 0; i < db.stages.length; i++) {
    rOpts += '<option value="' + db.stages[i].stage_code + '">' + db.stages[i].stage_name + " (" + db.stages[i].line_id + ")</option>";
  }
  retSel.innerHTML = rOpts;

  var ngOpts = "";
  var count = 0;
  for (var l = 0; l < db.lots.length; l++) {
    var lot = db.lots[l];
    var wip = orVal(lot.wip_data, {});
    for (var stCode in wip) {
      if (wip[stCode].ng > 0) {
        count++;
        var valStr = JSON.stringify({ so_lot: lot.so_lot, ma_sp: lot.ma_sp, stage_code: stCode, ng: wip[stCode].ng });
        ngOpts += "<option value='" + valStr + "'>" + lot.so_lot + " [" + lot.ma_sp + "] - Trạm " + stCode + " (Lỗi: " + wip[stCode].ng + ")</option>";
      }
    }
  }
  if (count === 0) ngOpts = '<option value="">-- Không có hàng NG --</option>';
  sel.innerHTML = ngOpts;
}

window.resolveNgAction = function (e) {
  e.preventDefault();
  var raw = el("ng-lot-stage-select").value;
  if (!raw) return;
  var info = JSON.parse(raw);
  var qty = parseInt(el("ng-resolve-qty").value);
  var action = el("ng-resolve-type").value;
  var returnStage = el("ng-return-stage").value;

  for (var i = 0; i < db.lots.length; i++) {
    if (db.lots[i].so_lot === info.so_lot) {
      var lot = db.lots[i];
      if (qty > lot.wip_data[info.stage_code].ng) {
        showToast("Số lượng vượt quá NG hiện có!", true);
        return;
      }
      lot.wip_data[info.stage_code].ng -= qty;
      if (action === "REWORK") {
        if (!lot.wip_data[returnStage]) lot.wip_data[returnStage] = { waiting: 0, good: 0, ng: 0, machine: "" };
        lot.wip_data[returnStage].waiting += qty;
        showToast("Đã trả " + qty + " cái về [" + returnStage + "] để REWORK!");
      } else {
        showToast("Đã Báo Hủy (SCRAP) " + qty + " cái!");
      }
    }
  }
  saveDatabase();
  renderAllViews();
};

function initDefaultRoutingBuilder() {
  var box = el("routing-steps-box");
  if (!box) return;
  box.innerHTML = "";
  var defaults = ["CAT", "NC1", "MNC1", "NHIET_LUYEN", "DO_CUNG", "KIEM_TRA"];
  for (var i = 0; i < defaults.length; i++) {
    addRoutingStepRow(defaults[i]);
  }
}

window.addRoutingStepRow = function (defaultStage) {
  var box = el("routing-steps-box");
  if (!box) return;
  var div = document.createElement("div");
  div.style.display = "flex";
  div.style.gap = "8px";
  div.style.marginBottom = "8px";

  var opts = "";
  for (var i = 0; i < db.stages.length; i++) {
    var s = db.stages[i];
    var sel = s.stage_code === defaultStage ? " selected" : "";
    opts += '<option value="' + s.stage_code + '"' + sel + ">[" + s.stage_code + "] " + s.stage_name + " (" + s.line_id + ")</option>";
  }
  div.innerHTML = '<select class="routing-step-select search-input" style="flex:1;">' + opts + '</select><button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">Xóa</button>';
  box.appendChild(div);
};

function renderProductsTab() {
  var tbody = el("products-tbody");
  if (!tbody) return;
  var html = "";
  for (var i = 0; i < db.products.length; i++) {
    var p = db.products[i];
    var rNames = [];
    var rMap = orVal(p.routing_map, []);
    for (var r = 0; r < rMap.length; r++) rNames.push(rMap[r].stage_id);
    html += "<tr><td><b>" + p.ma_sp + '</b></td><td style="text-align:left;"><b>' + p.ten_sp + "</b><br><small>" + orVal(p.quy_cach, "") + '</small></td><td style="text-align:left; white-space:normal;">' + rNames.join(" ➔ ") + '</td><td><button class="btn btn-danger btn-sm" onclick="deleteProduct(\'' + p.ma_sp + '\')">Xóa</button></td></tr>';
  }
  tbody.innerHTML = html;
}

window.saveProduct = function (e) {
  e.preventDefault();
  var code = el("sp-code").value.trim().toUpperCase();
  var name = el("sp-name").value.trim();
  var spec = el("sp-spec").value.trim();
  var routingMap = [];
  var selects = document.querySelectorAll(".routing-step-select");
  for (var i = 0; i < selects.length; i++) {
    if (selects[i].value) routingMap.push({ order: i + 1, stage_id: selects[i].value });
  }
  db.products.push({ ma_sp: code, ten_sp: name, quy_cach: spec, routing_map: routingMap });
  saveDatabase();
  renderAllViews();
  showToast("Đã lưu mã hàng [" + code + "]!");
};

window.deleteProduct = function (code) {
  var next = [];
  for (var i = 0; i < db.products.length; i++) {
    if (db.products[i].ma_sp !== code) next.push(db.products[i]);
  }
  db.products = next;
  saveDatabase();
  renderAllViews();
};

function renderCreatePoTab() {
  var sel = el("po-product-select");
  if (sel) {
    var pOpts = "";
    for (var i = 0; i < db.products.length; i++) {
      pOpts += '<option value="' + db.products[i].ma_sp + '">[' + db.products[i].ma_sp + "] " + db.products[i].ten_sp + "</option>";
    }
    sel.innerHTML = pOpts;
  }
  var tbody = el("lots-admin-tbody");
  if (tbody) {
    var lHtml = "";
    for (var l = 0; l < db.lots.length; l++) {
      var lot = db.lots[l];
      lHtml += "<tr><td><b>" + lot.so_lot + "</b></td><td>" + lot.ma_sp + "</td><td>" + lot.ngay_cap_phat + "</td><td><b>" + lot.tong_sl + '</b></td><td><span class="badge-ok">' + lot.sl_hoan_thanh_kho + '</span></td><td><button class="btn btn-danger btn-sm" onclick="deleteLot(\'' + lot.so_lot + '\')">Xóa</button></td></tr>';
    }
    tbody.innerHTML = lHtml;
  }
}

window.createLotsBatch = function (e) {
  e.preventDefault();
  var prefix = el("po-prefix").value.trim().toUpperCase();
  var maSp = el("po-product-select").value;
  var total = parseInt(el("po-total-qty").value);
  var split = parseInt(el("po-split-qty").value);
  var dateStr = el("po-date").value;

  var prod = findProductObj(maSp);
  var firstStage = (prod && prod.routing_map && prod.routing_map[0]) ? prod.routing_map[0].stage_id : "CAT";

  var rem = total;
  var idx = 1;
  while (rem > 0) {
    var q = rem > split ? split : rem;
    var lotNo = prefix + "-" + String(idx).padStart(2, "0");
    var wipObj = {};
    wipObj[firstStage] = { waiting: q, good: 0, ng: 0, machine: "" };
    db.lots.unshift({ so_lot: lotNo, so_po_goc: prefix, ma_sp: maSp, ngay_cap_phat: dateStr, tong_sl: q, sl_hoan_thanh_kho: 0, wip_data: wipObj });
    rem -= q;
    idx++;
  }
  saveDatabase();
  renderAllViews();
  showToast("Đã chẻ LOT và cấp phát xuống công đoạn [" + firstStage + "]!");
};

window.deleteLot = function (soLot) {
  var next = [];
  for (var i = 0; i < db.lots.length; i++) {
    if (db.lots[i].so_lot !== soLot) next.push(db.lots[i]);
  }
  db.lots = next;
  saveDatabase();
  renderAllViews();
};

function renderLogsTab() {
  var pTbody = el("prod-logs-tbody");
  if (!pTbody) return;
  var html = "";
  for (var i = 0; i < db.prodLogs.length; i++) {
    var l = db.prodLogs[i];
    html += "<tr><td>" + l.thoi_gian + "</td><td><b>" + l.nguoi_thao_tac + '</b></td><td><span class="badge-machine">' + l.ma_may + "</span></td><td><b>" + l.so_lot + "</b></td><td>" + l.ma_sp + "</td><td>" + l.tu_cong_doan + " ➔ " + l.den_cong_doan + "</td><td>PASS: <b>" + l.sl_ok + '</b> | NG: <b style="color:var(--maroon)">' + l.sl_ng + "</b></td></tr>";
  }
  pTbody.innerHTML = html;
}

window.exportMatrixCSV = function () {
  var table = el("admin-export-matrix");
  if (!table) return;
  var csv = "\uFEFF";
  var rows = table.querySelectorAll("tr");
  for (var i = 0; i < rows.length; i++) {
    var cols = rows[i].querySelectorAll("th, td");
    var rData = [];
    for (var j = 0; j < cols.length; j++) {
      rData.push('"' + cols[j].innerText.replace(/\n/g, " ").replace(/"/g, '""') + '"');
    }
    csv += rData.join(",") + "\n";
  }
  var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "BIC_WIP_Matrix.csv";
  a.click();
};