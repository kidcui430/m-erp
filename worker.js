/**
 * WORKER.JS - CLOUDFLARE WORKER REST API
 * APP ERP EMS - BIC (7 Lines, 19 Stages)
 *
 * Deploy:   npx wrangler deploy
 * Test local: npx wrangler dev
 *
 * Endpoints:
 *   POST /api/auth/login
 *   POST /api/auth/change-password
 *   GET  /api/bootstrap
 *   GET  /api/lots?line_id=...
 *   POST /api/production/assign-machine
 *   POST /api/production/move
 *   POST /api/production/split-lot
 *   POST /api/kho/transaction
 *   POST /api/kho/material
 *   GET  /api/kho/materials
 *   GET  /api/kho/logs
 */

export default {
  async fetch(request, env) {
    // Xu ly CORS cho tat ca requests (cho phep goi tu file:// va bat ky domain)
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 200);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ========================
      // AUTH ENDPOINTS
      // ========================
      if (path === '/api/auth/login' && request.method === 'POST') {
        return handleLogin(request, env);
      }

      if (path === '/api/auth/change-password' && request.method === 'POST') {
        return handleChangePassword(request, env);
      }

      // ========================
      // BOOTSTRAP (tai du lieu khoi tao)
      // ========================
      if (path === '/api/bootstrap' && request.method === 'GET') {
        return handleBootstrap(request, env);
      }

      // ========================
      // PRODUCTION ENDPOINTS
      // ========================
      if (path === '/api/production/assign-machine' && request.method === 'POST') {
        return handleAssignMachine(request, env);
      }

      if (path === '/api/production/move' && request.method === 'POST') {
        return handleProductionMove(request, env);
      }

      if (path === '/api/production/split-lot' && request.method === 'POST') {
        return handleSplitLot(request, env);
      }

      if (path === '/api/production/ng-resolve' && request.method === 'POST') {
        return handleNgResolve(request, env);
      }

      // ========================
      // KHO NVL ENDPOINTS
      // ========================
      if (path === '/api/kho/materials' && request.method === 'GET') {
        return handleGetMaterials(request, env);
      }

      if (path === '/api/kho/material' && request.method === 'POST') {
        return handleAddMaterial(request, env);
      }

      if (path === '/api/kho/transaction' && request.method === 'POST') {
        return handleKhoTransaction(request, env);
      }

      if (path === '/api/kho/logs' && request.method === 'GET') {
        return handleGetKhoLogs(request, env);
      }

      if (path === '/api/kho/suppliers' && request.method === 'GET') {
        return handleGetSuppliers(request, env);
      }

      if (path === '/api/kho/supplier' && request.method === 'POST') {
        return handleAddSupplier(request, env);
      }

      return corsResponse({ error: 'Not Found', path }, 404);

    } catch (err) {
      return corsResponse({ error: err.message, stack: err.stack }, 500);
    }
  }
};

// =============================================================================
// AUTH HANDLERS
// =============================================================================

async function handleLogin(request, env) {
  const body = await request.json();
  const { ma_nv, password } = body;

  if (!ma_nv || !password) {
    return corsResponse({ success: false, message: 'Thiếu tài khoản hoặc mật khẩu.' }, 400);
  }

  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE UPPER(ma_nv) = UPPER(?)'
  ).bind(ma_nv).first();

  if (!user) {
    return corsResponse({ success: false, message: 'Tài khoản không tồn tại!' }, 401);
  }

  // So sánh mật khẩu (thực tế nên dùng hash như bcrypt hoặc SHA-256)
  if (user.password !== password) {
    return corsResponse({ success: false, message: 'Mật khẩu không chính xác!' }, 401);
  }

  // Ẩn password trước khi trả về client
  const { password: _, ...safeUser } = user;

  return corsResponse({
    success: true,
    user: safeUser,
    must_change_pwd: user.must_change_pwd === 1
  });
}

async function handleChangePassword(request, env) {
  const body = await request.json();
  const { ma_nv, new_password } = body;

  if (!ma_nv || !new_password || new_password.length < 4) {
    return corsResponse({ success: false, message: 'Dữ liệu không hợp lệ.' }, 400);
  }

  await env.DB.prepare(
    'UPDATE users SET password = ?, must_change_pwd = 0, updated_at = datetime("now","localtime") WHERE UPPER(ma_nv) = UPPER(?)'
  ).bind(new_password, ma_nv).run();

  return corsResponse({ success: true, message: 'Đã đổi mật khẩu thành công.' });
}

// =============================================================================
// BOOTSTRAP - Trả về toàn bộ dữ liệu cần thiết khi app khởi động
// =============================================================================

async function handleBootstrap(request, env) {
  const url = new URL(request.url);
  const lineId = url.searchParams.get('line_id') || 'ALL';
  const role   = url.searchParams.get('role') || 'LEADER';

  const [lines, stages, machines, products, lots, wipData, materials, nvlLogs, prodLogs, suppliers] = await Promise.all([
    env.DB.prepare('SELECT * FROM lines ORDER BY sort_order').all(),
    env.DB.prepare('SELECT * FROM stages ORDER BY thu_tu').all(),
    env.DB.prepare('SELECT * FROM machines ORDER BY stage_code, ma_may').all(),
    env.DB.prepare('SELECT * FROM products').all(),
    env.DB.prepare('SELECT * FROM lots ORDER BY created_at DESC').all(),
    env.DB.prepare('SELECT * FROM lot_wip').all(),
    env.DB.prepare('SELECT * FROM materials ORDER BY phan_loai, ten_hang').all(),
    env.DB.prepare('SELECT * FROM material_logs ORDER BY id DESC LIMIT 200').all(),
    env.DB.prepare('SELECT * FROM production_logs ORDER BY id DESC LIMIT 200').all(),
    env.DB.prepare('SELECT * FROM suppliers ORDER BY ma_ncc').all()
  ]);

  // Build lots voi wip_data dang object giong localStorage (tuong thich FE)
  const wipMap = {};
  for (const w of wipData.results) {
    if (!wipMap[w.so_lot]) wipMap[w.so_lot] = {};
    wipMap[w.so_lot][w.stage_code] = {
      waiting: w.waiting,
      good: w.good,
      ng: w.ng,
      machine: w.ma_may,
      phan_bo_qty: w.phan_bo_qty
    };
  }

  const lotsWithWip = lots.results.map(l => ({
    ...l,
    wip_data: wipMap[l.so_lot] || {}
  }));

  // Parse routing_json cho products
  const productsWithRouting = products.results.map(p => ({
    ...p,
    routing_map: JSON.parse(p.routing_json || '[]')
  }));

  return corsResponse({
    success: true,
    lines: lines.results,
    stages: stages.results,
    machines: machines.results,
    products: productsWithRouting,
    lots: lotsWithWip,
    items: materials.results,
    nvlLogs: nvlLogs.results,
    prodLogs: prodLogs.results,
    nccs: suppliers.results
  });
}

// =============================================================================
// PRODUCTION HANDLERS
// =============================================================================

async function handleAssignMachine(request, env) {
  const { ma_nv, so_lot, stage_code, ma_may, phan_bo_qty } = await request.json();

  // Lay wip hien tai
  const wip = await env.DB.prepare(
    'SELECT * FROM lot_wip WHERE so_lot = ? AND stage_code = ?'
  ).bind(so_lot, stage_code).first();

  if (!wip) {
    return corsResponse({ success: false, message: 'Không tìm thấy WIP LOT tại stage này.' }, 400);
  }

  const qty = phan_bo_qty && phan_bo_qty > 0 ? phan_bo_qty : wip.waiting;

  if (qty > wip.waiting) {
    return corsResponse({ success: false, message: 'Số lượng phân bổ vượt tồn chờ!' }, 400);
  }

  // Cap nhat wip
  await env.DB.prepare(
    'UPDATE lot_wip SET ma_may = ?, phan_bo_qty = ?, updated_at = datetime("now","localtime") WHERE so_lot = ? AND stage_code = ?'
  ).bind(ma_may, qty, so_lot, stage_code).run();

  // Cap nhat may
  await env.DB.prepare(
    'UPDATE machines SET trang_thai = "RUNNING", lot_dang_chay = ?, sl_dang_chay = ?, updated_at = datetime("now","localtime") WHERE ma_may = ?'
  ).bind(so_lot, qty, ma_may).run();

  return corsResponse({ success: true, message: 'Đã phân ' + qty + ' cái LOT [' + so_lot + '] vào máy [' + ma_may + '].' });
}

async function handleProductionMove(request, env) {
  const { ma_nv, ma_may, so_lot, stage_code, sl_ok, sl_ng, max_cap } = await request.json();

  // Lay thong tin lot va wip
  const [lotRow, wipRow, prodRow] = await Promise.all([
    env.DB.prepare('SELECT * FROM lots WHERE so_lot = ?').bind(so_lot).first(),
    env.DB.prepare('SELECT * FROM lot_wip WHERE so_lot = ? AND stage_code = ?').bind(so_lot, stage_code).first(),
    env.DB.prepare('SELECT routing_json FROM products WHERE ma_sp = (SELECT ma_sp FROM lots WHERE so_lot = ?)').bind(so_lot).first()
  ]);

  if (!wipRow) {
    return corsResponse({ success: false, message: 'WIP không tồn tại.' }, 400);
  }

  const total = (sl_ok || 0) + (sl_ng || 0);
  if (total <= 0) {
    return corsResponse({ success: false, message: 'Số lượng không hợp lệ.' }, 400);
  }

  if (total > wipRow.waiting) {
    return corsResponse({ success: false, message: 'Số lượng vượt tồn chờ tại ' + stage_code }, 400);
  }

  // Cap nhat wip hien tai
  await env.DB.prepare(
    'UPDATE lot_wip SET waiting = waiting - ?, good = good + ?, ng = ng + ?, updated_at = datetime("now","localtime") WHERE so_lot = ? AND stage_code = ?'
  ).bind(total, sl_ok, sl_ng, so_lot, stage_code).run();

  // Xac dinh stage tiep theo theo routing
  const routing = JSON.parse(prodRow?.routing_json || '[]');
  let nextStageCode = null;
  let nextStageLabel = 'KHO_THANH_PHAM';

  for (let i = 0; i < routing.length; i++) {
    if (routing[i].stage_id === stage_code && i + 1 < routing.length) {
      nextStageCode = routing[i + 1].stage_id;
      nextStageLabel = nextStageCode;
      break;
    }
  }

  // Chuyen sl_ok sang stage tiep theo
  if (sl_ok > 0) {
    if (nextStageCode) {
      // Upsert lot_wip cho stage tiep theo
      await env.DB.prepare(`
        INSERT INTO lot_wip (so_lot, stage_code, waiting, good, ng, ma_may)
        VALUES (?, ?, ?, 0, 0, '')
        ON CONFLICT(so_lot, stage_code) DO UPDATE SET
          waiting = waiting + excluded.waiting,
          updated_at = datetime('now','localtime')
      `).bind(so_lot, nextStageCode, sl_ok).run();
    } else {
      // Nhap kho thanh pham
      await env.DB.prepare(
        'UPDATE lots SET sl_kho_tp = sl_kho_tp + ? WHERE so_lot = ?'
      ).bind(sl_ok, so_lot).run();
    }
  }

  // Cap nhat trang thai may
  const newWaiting = wipRow.waiting - total;
  await env.DB.prepare(
    'UPDATE machines SET trang_thai = ?, lot_dang_chay = ?, sl_dang_chay = 0, updated_at = datetime("now","localtime") WHERE ma_may = ?'
  ).bind(newWaiting > 0 ? 'RUNNING' : 'IDLE', newWaiting > 0 ? so_lot : '', ma_may || '').run();

  // Ghi production log
  await env.DB.prepare(`
    INSERT INTO production_logs (nguoi_thao_tac, ma_may, so_lot, ma_sp, tu_cong_doan, den_cong_doan, sl_ok, sl_ng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(ma_nv, ma_may || '', so_lot, lotRow.ma_sp, stage_code, nextStageLabel, sl_ok, sl_ng).run();

  return corsResponse({ success: true, message: 'Đã chuyển ' + sl_ok + ' cái sang [' + nextStageLabel + ']!' });
}

async function handleSplitLot(request, env) {
  const { prefix, ma_sp, total_qty, split_qty, ngay_cap_phat } = await request.json();

  const product = await env.DB.prepare('SELECT * FROM products WHERE ma_sp = ?').bind(ma_sp).first();
  if (!product) {
    return corsResponse({ success: false, message: 'Mã hàng không tồn tại.' }, 400);
  }

  const routing = JSON.parse(product.routing_json || '[]');
  const firstStage = routing.length > 0 ? routing[0].stage_id : 'CAT';

  let rem = total_qty;
  let idx = 1;
  const createdLots = [];

  while (rem > 0) {
    const q = rem > split_qty ? split_qty : rem;
    const lotNo = prefix + '-' + String(idx).padStart(2, '0');

    await env.DB.prepare(
      'INSERT OR IGNORE INTO lots (so_lot, so_po_goc, ma_sp, ngay_cap_phat, tong_sl) VALUES (?, ?, ?, ?, ?)'
    ).bind(lotNo, prefix, ma_sp, ngay_cap_phat, q).run();

    await env.DB.prepare(
      'INSERT OR IGNORE INTO lot_wip (so_lot, stage_code, waiting, good, ng) VALUES (?, ?, ?, 0, 0)'
    ).bind(lotNo, firstStage, q).run();

    createdLots.push(lotNo);
    rem -= q;
    idx++;
  }

  return corsResponse({ success: true, created: createdLots });
}

async function handleNgResolve(request, env) {
  const { ma_nv, so_lot, stage_code, qty, action, return_stage } = await request.json();

  const wip = await env.DB.prepare(
    'SELECT * FROM lot_wip WHERE so_lot = ? AND stage_code = ?'
  ).bind(so_lot, stage_code).first();

  if (!wip || wip.ng < qty) {
    return corsResponse({ success: false, message: 'Số lượng NG không hợp lệ.' }, 400);
  }

  await env.DB.prepare(
    'UPDATE lot_wip SET ng = ng - ?, updated_at = datetime("now","localtime") WHERE so_lot = ? AND stage_code = ?'
  ).bind(qty, so_lot, stage_code).run();

  if (action === 'REWORK' && return_stage) {
    await env.DB.prepare(`
      INSERT INTO lot_wip (so_lot, stage_code, waiting, good, ng, ma_may)
      VALUES (?, ?, ?, 0, 0, '')
      ON CONFLICT(so_lot, stage_code) DO UPDATE SET
        waiting = waiting + excluded.waiting,
        updated_at = datetime('now','localtime')
    `).bind(so_lot, return_stage, qty).run();
    return corsResponse({ success: true, message: 'Đã trả ' + qty + ' về [' + return_stage + '] để REWORK.' });
  }

  return corsResponse({ success: true, message: 'Đã báo hủy (SCRAP) ' + qty + ' cái.' });
}

// =============================================================================
// KHO NVL HANDLERS
// =============================================================================

async function handleGetMaterials(request, env) {
  const materials = await env.DB.prepare('SELECT * FROM materials ORDER BY phan_loai, ten_hang').all();
  return corsResponse({ success: true, items: materials.results });
}

async function handleAddMaterial(request, env) {
  const { phan_loai, ten_hang, quy_cach, don_vi_tinh, ma_ncc, ton_dau_ky } = await request.json();

  // Tao ma_hang tu dem hien tai
  const countRow = await env.DB.prepare('SELECT COUNT(*) as cnt FROM materials').first();
  const code = 'NVL' + String((countRow.cnt || 0) + 1).padStart(3, '0');

  await env.DB.prepare(`
    INSERT INTO materials (ma_hang, phan_loai, ten_hang, quy_cach, don_vi_tinh, ma_ncc, tong_nhap, ton_kho)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(code, phan_loai, ten_hang, quy_cach || '', don_vi_tinh, ma_ncc || '', ton_dau_ky || 0, ton_dau_ky || 0).run();

  return corsResponse({ success: true, ma_hang: code });
}

async function handleKhoTransaction(request, env) {
  const { ma_nv, loai_giao_dich, ma_hang, so_luong, sl_dong_goi, so_lot_sx, ma_may_sx, ma_ncc, ghi_chu } = await request.json();

  // Kiem tra quyen: Chi ADMIN va LD_CUTTING duoc phep
  const user = await env.DB.prepare('SELECT * FROM users WHERE UPPER(ma_nv) = UPPER(?)').bind(ma_nv).first();
  if (!user || (user.role !== 'ADMIN' && user.line_id !== 'CUTTING')) {
    return corsResponse({ success: false, message: 'Không có quyền thực hiện giao dịch kho NVL.' }, 403);
  }

  const mat = await env.DB.prepare('SELECT * FROM materials WHERE ma_hang = ?').bind(ma_hang).first();
  if (!mat) {
    return corsResponse({ success: false, message: 'Mã NVL không tồn tại.' }, 400);
  }

  let newTon = mat.ton_kho;
  let newNhap = mat.tong_nhap;
  let newXuat = mat.tong_xuat_sx;

  if (loai_giao_dich === 'XUAT_SAN_XUAT') {
    if (so_luong > mat.ton_kho) {
      return corsResponse({ success: false, message: 'Tồn kho không đủ! Hiện còn: ' + mat.ton_kho + ' ' + mat.don_vi_tinh }, 400);
    }
    newTon = parseFloat((mat.ton_kho - so_luong).toFixed(3));
    newXuat = parseFloat((mat.tong_xuat_sx + so_luong).toFixed(3));
  } else {
    newTon = parseFloat((mat.ton_kho + so_luong).toFixed(3));
    newNhap = parseFloat((mat.tong_nhap + so_luong).toFixed(3));
  }

  await env.DB.prepare(
    'UPDATE materials SET ton_kho = ?, tong_nhap = ?, tong_xuat_sx = ?, updated_at = datetime("now","localtime") WHERE ma_hang = ?'
  ).bind(newTon, newNhap, newXuat, ma_hang).run();

  await env.DB.prepare(`
    INSERT INTO material_logs (nguoi_giao_dich, ma_hang, ten_hang, loai_giao_dich, so_luong, don_vi_tinh, so_lot_sx, ma_may_sx, ma_ncc, sl_dong_goi, ghi_chu)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(ma_nv, ma_hang, mat.ten_hang, loai_giao_dich, so_luong, mat.don_vi_tinh,
    so_lot_sx || '', ma_may_sx || '', ma_ncc || '', sl_dong_goi || 0, ghi_chu || '').run();

  return corsResponse({ success: true, ton_kho_moi: newTon, don_vi_tinh: mat.don_vi_tinh });
}

async function handleGetKhoLogs(request, env) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const logs = await env.DB.prepare(
    'SELECT * FROM material_logs ORDER BY id DESC LIMIT ?'
  ).bind(limit).all();
  return corsResponse({ success: true, logs: logs.results });
}

async function handleGetSuppliers(request, env) {
  const suppliers = await env.DB.prepare('SELECT * FROM suppliers ORDER BY ma_ncc').all();
  return corsResponse({ success: true, nccs: suppliers.results });
}

async function handleAddSupplier(request, env) {
  const { ten_ncc, so_dt, dia_chi, ghi_chu } = await request.json();

  const countRow = await env.DB.prepare('SELECT COUNT(*) as cnt FROM suppliers').first();
  const code = 'NCC' + String((countRow.cnt || 0) + 1).padStart(3, '0');

  await env.DB.prepare(
    'INSERT INTO suppliers (ma_ncc, ten_ncc, so_dt, dia_chi, ghi_chu) VALUES (?, ?, ?, ?, ?)'
  ).bind(code, ten_ncc, so_dt || '', dia_chi || '', ghi_chu || '').run();

  return corsResponse({ success: true, ma_ncc: code });
}

// =============================================================================
// HELPER: Tao Response voi CORS headers day du
// =============================================================================

function corsResponse(data, status = 200) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id'
  };

  return new Response(
    data !== null ? JSON.stringify(data) : null,
    { status, headers }
  );
}
