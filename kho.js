// =================================================================================
// FILE 1: kho.js - MODULE QUAN LY KHO NVL DOC LAP (DUNG CHO LEADER CUTTING & ADMIN)
// KHONG DUNG KY TU $ VA BACKTICK DE TRANH LOI BIEN DANG CODE KHI COPY
// =================================================================================

var SHARED_DB_KEY = "bic_erp_shared_db_v5";
var SHARED_USER_KEY = "bic_erp_current_user_v5";

var currentUser = null;
var db = null;

function el(id) {
  return document.getElementById(id);
}

function orVal(val, fallback) {
  if (val !== undefined && val !== null && val !== "") {
    return val;
  }
  return fallback;
}

function fmt(n) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(Number(orVal(n, 0)));
}

function nowVN() {
  return new Date().toLocaleString("vi-VN", { hour12: false });
}

function showToast(msg, isError) {
  var t = el("toast");
  if (!t) return;
  t.textContent = msg;
  if (isError) {
    t.classList.add("error");
  } else {
    t.classList.remove("error");
  }
  t.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(function () {
    t.classList.add("hidden");
  }, 3200);
}

// Du lieu khoi tao du phong neu nguoi dung mo thang kho.html truoc khi mo index.html
function getFallbackSeedData() {
  return {
    lines: [
      { line_id: "CUTTING", line_name: "Line Cutting" },
      { line_id: "NC", line_name: "Line NC" },
      { line_id: "MNC", line_name: "Line MNC" },
      { line_id: "ASSY", line_name: "Line Assy" },
      { line_id: "KENSA", line_name: "Line Kensa" },
      { line_id: "GS_GV", line_name: "Line GS-GV" },
      { line_id: "GP_GE_GI", line_name: "Line GP-GE-GI" }
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
      { stage_code: "LAP_RAP", line_id: "ASSY", stage_name: "Lắp ráp", thu_tu: 10 },
      { stage_code: "DONG_THUNG", line_id: "ASSY", stage_name: "Đóng thùng", thu_tu: 11 },
      { stage_code: "XUAT_GCN", line_id: "ASSY", stage_name: "Đi Gia Công Ngoài", thu_tu: 12 },
      { stage_code: "NHAN_GCN", line_id: "ASSY", stage_name: "Nhận Gia Công Ngoài", thu_tu: 13 },
      { stage_code: "KIEM_TRA", line_id: "KENSA", stage_name: "Kiểm tra", thu_tu: 14 },
      { stage_code: "GS", line_id: "GS_GV", stage_name: "GS", thu_tu: 15 },
      { stage_code: "GV", line_id: "GS_GV", stage_name: "GV", thu_tu: 16 },
      { stage_code: "GP", line_id: "GP_GE_GI", stage_name: "GP", thu_tu: 17 },
      { stage_code: "GE", line_id: "GP_GE_GI", stage_name: "GE", thu_tu: 18 },
      { stage_code: "GI", line_id: "GP_GE_GI", stage_name: "GI", thu_tu: 19 }
    ],
    machines: [
      { ma_may: "M-CAT-01", ten_may: "Máy Cắt Phôi 01", stage_code: "CAT", cong_suat_ca: 600, trang_thai_may: "RUNNING", lot_dang_chay: "PO2010-01" },
      { ma_may: "M-CAT-02", ten_may: "Máy Cắt Phôi 02", stage_code: "CAT", cong_suat_ca: 600, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "LO-NHIET-01", ten_may: "Lò Nhiệt Luyện 01", stage_code: "NHIET_LUYEN", cong_suat_ca: 1000, trang_thai_may: "IDLE", lot_dang_chay: "" },
      { ma_may: "MAY-DO-01", ten_may: "Máy Đo Độ Cứng 01", stage_code: "DO_CUNG", cong_suat_ca: 1000, trang_thai_may: "IDLE", lot_dang_chay: "" }
    ],
    lots: [
      { so_lot: "PO2010-01", so_po_goc: "PO2010", ma_sp: "TB-30", ngay_cap_phat: "2026-10-20", tong_sl: 300, sl_hoan_thanh_kho: 0, wip_data: { CAT: { waiting: 300, good: 0, ng: 0, machine: "M-CAT-01" } } },
      { so_lot: "PO2010-02", so_po_goc: "PO2010", ma_sp: "TB-30", ngay_cap_phat: "2026-10-20", tong_sl: 300, sl_hoan_thanh_kho: 0, wip_data: { CAT: { waiting: 0, good: 300, ng: 0, machine: "M-CAT-01" }, NC1: { waiting: 290, good: 0, ng: 10, machine: "M-NC1-01" } } }
    ],
    nccs: [
      { ma_ncc: "NCC001", ten_ncc: "Thép Đặc Biệt Daido", so_dt: "0901234567 - Mr. Kenji", dia_chi: "KCN VSIP 1, Bình Dương" },
      { ma_ncc: "NCC002", ten_ncc: "Hóa Chất Công Nghiệp Minh Trí", so_dt: "0908889999 - Chị Lan", dia_chi: "Thuận An, Bình Dương" }
    ],
    items: [
      { ma_hang: "NVL001", phan_loai: "Kim Loại", ten_hang: "Thép tròn đặc C45", quy_cach: "Ø30mm x 6m", don_vi_tinh: "Kg", ma_ncc: "NCC001", tong_nhap: 1500, tong_xuat_sx: 120, ton_kho: 1380 },
      { ma_hang: "NVL002", phan_loai: "Kim Loại", ten_hang: "Thép hợp kim SCM440", quy_cach: "Ø20mm x 6m", don_vi_tinh: "Kg", ma_ncc: "NCC001", tong_nhap: 850, tong_xuat_sx: 50, ton_kho: 800 },
      { ma_hang: "NVL003", phan_loai: "Hóa Chất", ten_hang: "Dầu cắt gọt pha nước CNC", quy_cach: "Phuy 200L", don_vi_tinh: "Lít", ma_ncc: "NCC002", tong_nhap: 400, tong_xuat_sx: 40, ton_kho: 360 }
    ],
    prodLogs: [],
    nvlLogs: [
      { thoi_gian_gd: "20/10/2026 07:45", ma_hang: "NVL001", ten_hang: "Thép tròn đặc C45", loai_giao_dich: "XUAT_SAN_XUAT", so_luong: 120, don_vi_tinh: "Kg", ma_may_sx: "M-CAT-01", so_lot_sx: "PO2010-01", nguoi_giao_dich: "LD_CUTTING", ghi_chu: "Xuất phôi đầu ca" }
    ]
  };
}

function loadKhoDatabase() {
  var raw = localStorage.getItem(SHARED_DB_KEY);
  if (raw) {
    try {
      db = JSON.parse(raw);
      return;
    } catch (e) {}
  }
  db = getFallbackSeedData();
  saveKhoDatabase();
}

function saveKhoDatabase() {
  localStorage.setItem(SHARED_DB_KEY, JSON.stringify(db));
}

window.addEventListener("DOMContentLoaded", function () {
  loadKhoDatabase();

  var savedUser = localStorage.getItem(SHARED_USER_KEY);
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch (e) {}
  }

  if (!currentUser) {
    currentUser = { ma_nv: "LD_CUTTING", ten_nv: "Leader Cutting", role: "LEADER", line_id: "CUTTING" };
    localStorage.setItem(SHARED_USER_KEY, JSON.stringify(currentUser));
  }

  checkKhoAccessPermission();

  document.addEventListener("click", function (e) {
    if (!e.target.closest("#kho-dropdown-wrap")) {
      var list = el("kho-nvl-list");
      if (list) list.classList.add("hidden");
    }
  });
});

function checkKhoAccessPermission() {
  var badge = el("kho-user-badge");
  var isAllowed = false;
  if (currentUser) {
    if (currentUser.role === "ADMIN" || currentUser.line_id === "CUTTING") {
      isAllowed = true;
    }
  }

  if (!isAllowed) {
    if (badge) badge.textContent = currentUser.ten_nv + " (Line " + currentUser.line_id + " - Khong co quyen Kho)";
    el("kho-access-denied").classList.remove("hidden");
    el("kho-main-view").classList.add("hidden");
    return;
  }

  if (badge) badge.textContent = currentUser.ten_nv + " (Line: " + currentUser.line_id + ")";
  el("kho-access-denied").classList.add("hidden");
  el("kho-main-view").classList.remove("hidden");
  renderAllKhoViews();
}

window.switchToCuttingLeaderInKho = function () {
  currentUser = { ma_nv: "LD_CUTTING", ten_nv: "Leader Cutting", role: "LEADER", line_id: "CUTTING" };
  localStorage.setItem(SHARED_USER_KEY, JSON.stringify(currentUser));
  checkKhoAccessPermission();
  showToast("Đã chuyển sang tài khoản Leader Line CUTTING!");
};

window.openKhoTab = function (tabId, btnEl) {
  var tabs = document.querySelectorAll(".kho-tab");
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.add("hidden");
  }
  el(tabId).classList.remove("hidden");

  var btns = document.querySelectorAll(".tabs-mobile .tab-btn-mobile");
  for (var j = 0; j < btns.length; j++) {
    btns[j].classList.remove("active");
  }
  if (btnEl) btnEl.classList.add("active");
  renderAllKhoViews();
};

function renderAllKhoViews() {
  var lots = orVal(db.lots, []);
  var machines = orVal(db.machines, []);
  var nccs = orVal(db.nccs, []);
  var items = orVal(db.items, []);
  var nvlLogs = orVal(db.nvlLogs, []);

  // 1. Nap danh sach LOT
  var lotSel = el("kho-lot-select");
  if (lotSel) {
    var lotHtml = "";
    for (var i = 0; i < lots.length; i++) {
      var l = lots[i];
      lotHtml += '<option value="' + l.so_lot + '">' + l.so_lot + " - Mã SP: " + l.ma_sp + " (SL: " + l.tong_sl + ")</option>";
    }
    lotSel.innerHTML = lotHtml;
  }

  // 2. Nap danh sach May (Uu tien may CAT cua Line CUTTING len dau)
  var mcSel = el("kho-machine-select");
  if (mcSel) {
    var mcHtml = "";
    for (var mIdx = 0; mIdx < machines.length; mIdx++) {
      var m = machines[mIdx];
      mcHtml += '<option value="' + m.ma_may + '">[' + m.ma_may + "] " + m.ten_may + " (Stage: " + m.stage_code + ")</option>";
    }
    mcSel.innerHTML = mcHtml;
  }

  // 3. Nap danh sach NCC
  var nccSel = el("kho-ncc-select");
  if (nccSel) {
    var nccHtml = "";
    for (var nIdx = 0; nIdx < nccs.length; nIdx++) {
      var n = nccs[nIdx];
      nccHtml += '<option value="' + n.ma_ncc + '">' + n.ma_ncc + " - " + n.ten_ncc + "</option>";
    }
    nccSel.innerHTML = nccHtml;
  }

  // 4. Bang ton kho nhanh
  var quickTbody = el("kho-quick-stock-tbody");
  if (quickTbody) {
    var qHtml = "";
    for (var k = 0; k < items.length; k++) {
      var it = items[k];
      qHtml +=
        "<tr>" +
        '<td><b style="color:var(--navy)">' + it.ma_hang + "</b></td>" +
        '<td style="text-align:left;"><b>' + it.ten_hang + '</b><br><small style="color:var(--gray-dark)">' + orVal(it.quy_cach, "-") + "</small></td>" +
        '<td style="color:var(--green); font-weight:700;">' + fmt(it.tong_nhap) + "</td>" +
        '<td style="color:var(--maroon); font-weight:700;">' + fmt(it.tong_xuat_sx) + "</td>" +
        '<td><span class="badge-ok">' + fmt(it.ton_kho) + " " + it.don_vi_tinh + "</span></td>" +
        "</tr>";
    }
    quickTbody.innerHTML = qHtml;
  }

  // 5. Bang danh muc NVL day du
  var fullTbody = el("kho-full-stock-tbody");
  if (fullTbody) {
    var fHtml = "";
    for (var f = 0; f < items.length; f++) {
      var item = items[f];
      fHtml +=
        "<tr>" +
        "<td><b>" + item.ma_hang + "</b></td>" +
        "<td>" + item.phan_loai + "</td>" +
        '<td style="text-align:left;"><b>' + item.ten_hang + "</b> (" + orVal(item.quy_cach, "-") + ")</td>" +
        "<td>" + item.don_vi_tinh + "</td>" +
        "<td><b>" + fmt(item.ton_kho) + "</b></td>" +
        '<td><button class="btn btn-danger btn-sm" onclick="deleteNvlInKho(\'' + item.ma_hang + '\')">Xóa</button></td>' +
        "</tr>";
    }
    fullTbody.innerHTML = fHtml;
  }

  // 6. Bang Nha cung cap
  var nccTbody = el("kho-ncc-tbody");
  if (nccTbody) {
    var supHtml = "";
    for (var s = 0; s < nccs.length; s++) {
      var sup = nccs[s];
      supHtml +=
        "<tr>" +
        "<td><b>" + sup.ma_ncc + "</b></td>" +
        '<td style="text-align:left;"><b>' + sup.ten_ncc + "</b></td>" +
        "<td>" + orVal(sup.so_dt, "-") + "</td>" +
        '<td style="text-align:left;">' + orVal(sup.dia_chi, "-") + "</td>" +
        "</tr>";
    }
    nccTbody.innerHTML = supHtml;
  }

  // 7. Bang So cai lich su Kho
  var histTbody = el("kho-history-tbody");
  if (histTbody) {
    var hHtml = "";
    for (var h = 0; h < nvlLogs.length; h++) {
      var g = nvlLogs[h];
      var badgeLoai = g.loai_giao_dich === "NHAP_KHO"
        ? '<span class="badge-ok">Nhập Kho</span>'
        : '<span class="badge-wait">Xuất Sản Xuất</span>';

      hHtml +=
        "<tr>" +
        "<td>" + g.thoi_gian_gd + "</td>" +
        "<td><b>" + g.nguoi_giao_dich + "</b></td>" +
        '<td style="text-align:left;"><b>' + g.ma_hang + "</b> - " + g.ten_hang + "</td>" +
        "<td>" + badgeLoai + "</td>" +
        "<td><b>" + fmt(g.so_luong) + " " + g.don_vi_tinh + "</b></td>" +
        "<td>LOT: <b>" + orVal(g.so_lot_sx, "-") + "</b> | Máy: <b>" + orVal(g.ma_may_sx, "-") + "</b></td>" +
        '<td style="text-align:left;">' + orVal(g.ghi_chu, "-") + "</td>" +
        "</tr>";
    }
    histTbody.innerHTML = hHtml;
  }
}

window.toggleKhoTxMode = function () {
  var type = el("kho-tx-type").value;
  if (type === "XUAT_SAN_XUAT") {
    el("kho-xuat-sx-group").classList.remove("hidden");
    el("kho-nhap-ncc-group").classList.add("hidden");
  } else {
    el("kho-xuat-sx-group").classList.add("hidden");
    el("kho-nhap-ncc-group").classList.remove("hidden");
  }
};

window.showKhoNvlDropdown = function () {
  filterKhoNvlDropdown();
  el("kho-nvl-list").classList.remove("hidden");
};

window.filterKhoNvlDropdown = function () {
  var input = el("kho-nvl-search");
  var list = el("kho-nvl-list");
  var kw = orVal(input.value, "").trim().toLowerCase();
  var items = orVal(db.items, []);

  var html = "";
  var count = 0;
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var searchStr = (item.ma_hang + " " + item.ten_hang + " " + orVal(item.quy_cach, "")).toLowerCase();
    if (!kw || searchStr.indexOf(kw) !== -1) {
      count++;
      html +=
        '<li onclick="selectKhoNvlItem(\'' + item.ma_hang + '\')">' +
        '<div style="display:flex; justify-content:space-between;">' +
        "<strong>[" + item.ma_hang + "] " + item.ten_hang + "</strong>" +
        '<span class="badge-ok">Tồn: ' + fmt(item.ton_kho) + " " + item.don_vi_tinh + "</span>" +
        "</div>" +
        '<div style="font-size:12px; color:var(--gray-dark);">' + item.phan_loai + " | Quy cách: " + orVal(item.quy_cach, "-") + "</div>" +
        "</li>";
    }
  }

  if (count === 0) {
    html = '<li style="color:var(--maroon); text-align:center;">Không tìm thấy NVL phù hợp</li>';
  }
  list.innerHTML = html;
  list.classList.remove("hidden");
};

window.selectKhoNvlItem = function (maHang) {
  var items = orVal(db.items, []);
  var found = null;
  for (var i = 0; i < items.length; i++) {
    if (items[i].ma_hang === maHang) {
      found = items[i];
      break;
    }
  }
  if (!found) return;

  el("kho-nvl-search").value = "[" + found.ma_hang + "] " + found.ten_hang;
  el("kho-nvl-code").value = found.ma_hang;
  el("kho-stock-info").textContent = "📦 Tồn kho hiện tại: " + fmt(found.ton_kho) + " " + found.don_vi_tinh + " (" + orVal(found.quy_cach, "-") + ")";
  el("kho-nvl-list").classList.add("hidden");
};

window.submitKhoTransaction = function (e) {
  e.preventDefault();
  var type = el("kho-tx-type").value;
  var maHang = el("kho-nvl-code").value;
  if (!maHang) {
    showToast("Vui lòng chạm chọn 1 Nguyên Vật Liệu từ danh sách!", true);
    return;
  }

  var qty = parseFloat(el("kho-qty-main").value);
  if (isNaN(qty) || qty <= 0) {
    showToast("Số lượng phải lớn hơn 0!", true);
    return;
  }

  var soLot = el("kho-lot-select").value;
  var maMay = el("kho-machine-select").value;
  var note = el("kho-tx-note").value.trim();

  var found = null;
  for (var i = 0; i < db.items.length; i++) {
    if (db.items[i].ma_hang === maHang) {
      found = db.items[i];
      break;
    }
  }
  if (!found) return;

  if (type === "XUAT_SAN_XUAT") {
    if (qty > found.ton_kho) {
      showToast("Tồn kho không đủ! Hiện chỉ còn " + fmt(found.ton_kho) + " " + found.don_vi_tinh, true);
      return;
    }
    found.ton_kho = Number((found.ton_kho - qty).toFixed(3));
    found.tong_xuat_sx = Number((orVal(found.tong_xuat_sx, 0) + qty).toFixed(3));
  } else {
    found.ton_kho = Number((found.ton_kho + qty).toFixed(3));
    found.tong_nhap = Number((orVal(found.tong_nhap, 0) + qty).toFixed(3));
  }

  db.nvlLogs.unshift({
    thoi_gian_gd: nowVN(),
    ma_hang: found.ma_hang,
    ten_hang: found.ten_hang,
    loai_giao_dich: type,
    so_luong: qty,
    don_vi_tinh: found.don_vi_tinh,
    so_lot_sx: type === "XUAT_SAN_XUAT" ? soLot : "-",
    ma_may_sx: type === "XUAT_SAN_XUAT" ? maMay : "-",
    nguoi_giao_dich: currentUser.ma_nv,
    ghi_chu: note
  });

  saveKhoDatabase();
  renderAllKhoViews();
  el("kho-qty-main").value = "";
  el("kho-qty-sub").value = "";
  el("kho-tx-note").value = "";
  selectKhoNvlItem(maHang);
  showToast("Đã ghi sổ Kho NVL thành công!");
};

window.addNewNvlInKho = function (e) {
  e.preventDefault();
  var nextNo = db.items.length + 1;
  var code = "NVL" + String(nextNo).padStart(3, "0");
  var initQty = parseFloat(el("new-nvl-init").value);
  if (isNaN(initQty)) initQty = 0;

  db.items.push({
    ma_hang: code,
    phan_loai: el("new-nvl-cat").value.trim(),
    ten_hang: el("new-nvl-name").value.trim(),
    quy_cach: el("new-nvl-spec").value.trim(),
    don_vi_tinh: el("new-nvl-unit").value.trim(),
    tong_nhap: initQty,
    tong_xuat_sx: 0,
    ton_kho: initQty
  });

  saveKhoDatabase();
  renderAllKhoViews();
  el("new-nvl-name").value = "";
  el("new-nvl-spec").value = "";
  showToast("Đã thêm mã NVL [" + code + "] thành công!");
};

window.deleteNvlInKho = function (maHang) {
  if (!confirm("Xóa mã NVL [" + maHang + "]?")) return;
  var nextList = [];
  for (var i = 0; i < db.items.length; i++) {
    if (db.items[i].ma_hang !== maHang) nextList.push(db.items[i]);
  }
  db.items = nextList;
  saveKhoDatabase();
  renderAllKhoViews();
};

window.addNewNccInKho = function (e) {
  e.preventDefault();
  var code = "NCC" + String(db.nccs.length + 1).padStart(3, "0");
  db.nccs.push({
    ma_ncc: code,
    ten_ncc: el("new-ncc-name").value.trim(),
    so_dt: el("new-ncc-phone").value.trim(),
    dia_chi: el("new-ncc-addr").value.trim()
  });
  saveKhoDatabase();
  renderAllKhoViews();
  el("new-ncc-name").value = "";
  el("new-ncc-phone").value = "";
  el("new-ncc-addr").value = "";
  showToast("Đã thêm Nhà cung cấp [" + code + "]!");
};