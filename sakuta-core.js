/* ============================================================
   Sakuta demo: inti aplikasi
   ------------------------------------------------------------
   Di produksi, semua yang ada di file ini dikerjakan oleh SERVER
   (database, endpoint order, endpoint webhook Midtrans).
   Untuk demo statis di GitHub Pages, "server" disimulasikan di
   browser memakai localStorage, dan antar tab/iframe saling
   sinkron lewat BroadcastChannel + event storage.
   ============================================================ */
(function (w) {
  'use strict';

  const KEY = 'sakuta_demo_v3';
  const SERVER_KEY = 'SB-Mid-server-DEMO-SAKUTA'; // kunci palsu, hanya untuk demo
  const EXPIRY_MIN = 15;
  const STALE_MS = 10 * 3600 * 1000;

  /* ---------------- util ---------------- */
  const pad = (n, l) => String(n).padStart(l || 2, '0');
  const rp = n => 'Rp\u00a0' + Math.round(n).toLocaleString('id-ID');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const timeStr = ts => { const d = new Date(ts); return pad(d.getHours()) + '.' + pad(d.getMinutes()); };
  const ymdhms = ts => { const d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };
  const ago = ts => {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 45) return 'baru saja';
    const m = Math.round(s / 60);
    if (m < 60) return m + ' mnt lalu';
    const h = Math.floor(m / 60);
    return h + ' jam lalu';
  };
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
  const uid = n => { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < (n || 8); i++) s += c[Math.floor(Math.random() * c.length)]; return s; };
  const clone = o => JSON.parse(JSON.stringify(o));
  const hashInt = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
  const rng = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

  /* ---------------- ikon (SVG garis) ---------------- */
  const P = {
    cup: '<path d="M5 10h11v4.5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 14.5V10z"/><path d="M16 11h1.4a2.3 2.3 0 0 1 0 4.6H16"/><path d="M8.5 3.5c-.9 1 .9 1.8 0 3M12 3.5c-.9 1 .9 1.8 0 3"/>',
    iced: '<path d="M6 8h12l-1.4 11a1.5 1.5 0 0 1-1.5 1.3H8.9A1.5 1.5 0 0 1 7.4 19L6 8z"/><path d="M6.6 12.5h10.8"/><path d="M13 8l1.8-4.5H18"/>',
    leaf: '<path d="M5 19c0-8.5 5-13.5 14.5-14.5C19.5 14 14.5 19 6 19"/><path d="M5 19c3-5 6-8.2 10-10.2"/>',
    bowl: '<path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M9 20.5h6"/><path d="M8.5 9c0-1.4 1-1.9 1-3.2M12 9c0-1.4 1-1.9 1-3.2M15.5 9c0-1.4 1-1.9 1-3.2"/>',
    utensils: '<path d="M7.5 3v7a2.2 2.2 0 0 0 4.4 0V3M9.7 3v18"/><path d="M17 3c-2.2 1.6-3.2 4.2-3.2 7.2H17V21"/>',
    bread: '<path d="M3.5 15c0-4 3-7 8.5-7s8.5 3 8.5 7c0 1.3-.8 2-2 2h-13c-1.2 0-2-.7-2-2z"/><path d="M9 9.2l1 7.6M15 9.2l-1 7.6M12 8.2v8.6"/>',
    sandwich: '<path d="M3.5 10.5L12 5l8.5 5.5"/><path d="M4.5 10.5h15v3h-15z"/><path d="M5.5 13.5v4.5h13v-4.5"/>',
    fries: '<path d="M6.2 10h11.6l-1.4 10H7.6L6.2 10z"/><path d="M8.2 10V5M11 10V3.5M13.8 10V5M16.3 10V6.5"/>',
    cookie: '<circle cx="12" cy="12" r="8.5"/><path d="M9 9h.01M14.6 8.6h.01M15 14.2h.01M9.6 15h.01M12.2 12h.01"/>',
    dessert: '<path d="M4 12.5h16v6.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6.5z"/><path d="M4 12.5c0-2.2 1.6-3.5 3.3-3.5h9.4c1.7 0 3.3 1.3 3.3 3.5"/><path d="M8.5 9V6.2M12 9V4.5M15.5 9V6.2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>',
    moon: '<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    table: '<rect x="3" y="7" width="18" height="3" rx="1"/><path d="M6 10v9M18 10v9"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5M20 14v.01M14 20h2.5M20 17v3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    grid: '<rect x="4" y="4" width="7" height="8" rx="1.5"/><rect x="13" y="4" width="7" height="5" rx="1.5"/><rect x="13" y="11" width="7" height="9" rx="1.5"/><rect x="4" y="14" width="7" height="6" rx="1.5"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    logout: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M15 8l4 4-4 4M19 12H9"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    chevR: '<path d="M9 5l7 7-7 7"/>',
    chevD: '<path d="M5 9l7 7 7-7"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    cash: '<rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10.5h18M7 15h3"/>',
    wallet: '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H17v3"/><rect x="4" y="8" width="16" height="11" rx="2"/><circle cx="16" cy="13.5" r="1"/>',
    bank: '<path d="M3 9l9-5 9 5M5.5 9.5v7.5M9.8 9.5V17M14.2 9.5V17M18.5 9.5V17M3 20h18"/>',
    shield: '<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z"/><path d="M9 12l2.2 2.2L15 10"/>',
    code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M5 16V6a2 2 0 0 1 2-2h8"/>',
    print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
    download: '<path d="M12 4v11M7.5 11L12 15.5 16.5 11M5 20h14"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8L12 3.5z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>',
    sound: '<path d="M4 10v4h4l5 4V6L8 10H4z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
    play: '<path d="M8 5l11 7-11 7V5z"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-3.5 3.5-5.5 7-5.5s6.3 2 7 5.5"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    truck: '<path d="M3 7.5h11v9H3zM14 10.5h4l3 3.2v2.8h-7"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
    github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.4 6.400-1.500 6.400-7A5.400 5.400 0 0 0 20 4.800 5.100 5.100 0 0 0 19.900 1S18.700.700 16 2.500a13.400 13.400 0 0 0-7 0C6.300.700 5.100 1 5.100 1A5.100 5.100 0 0 0 5 4.800a5.400 5.400 0 0 0-1.500 3.800c0 5.400 3.300 6.600 6.400 7A3.400 3.400 0 0 0 9 18.100V22"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.500h-6L13 3z"/>'
  };
  const icon = (n, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>';
  const logoMark = () => '<span class="logo-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><ellipse cx="12" cy="12" rx="5.6" ry="8.4" transform="rotate(32 12 12)"/><path d="M9.4 6.4c3.2 1.8 3.8 3.9 1.9 5.9s-1.4 3.7.9 5.3"/></svg></span>';
  const logo = (href) => '<a class="logo" href="' + (href || 'index.html') + '">' + logoMark() + '<span>sakuta</span></a>';

  /* ---------------- data dasar ---------------- */
  /* Menu asli Sakuta Coffee (dari foto menu cafe). Harga Hot/Ice mengikuti kolom di menu cetak. */
  const CATS = ['Special Series', 'Classic Coffee', 'Manual Brew', 'Main Course'];
  const CAT_TILE = { 'Special Series': 't-non', 'Classic Coffee': 't-kopi', 'Manual Brew': 't-cam', 'Main Course': 't-mak' };
  const IC_LABEL = { cup: 'Minuman panas', iced: 'Minuman dingin', leaf: 'Matcha dan teh', bowl: 'Nasi', utensils: 'Pasta dan mi', bread: 'Roti', sandwich: 'Sandwich', fries: 'Kentang', cookie: 'Cookie dan gorengan', dessert: 'Kue' };
  const TG = 'Hot atau Ice';
  const both = (hot, ice) => ({ g: TG, t: 1, c: [{ l: 'Hot' }, { l: 'Ice', p: ice - hot }] });
  const only = l => ({ g: TG, t: 1, c: [{ l }] });
  const ADD_SHOT = { g: 'Add on', multi: true, c: [{ l: 'Espresso shot', p: 7000 }] };
  const ADD_EGG = { g: 'Add on', multi: true, c: [{ l: 'Telur', p: 5000 }] };
  const SAMBAL = { g: 'Sambal', c: [{ l: 'Sambal matah' }, { l: 'Sambal ijo' }] };
  const PORSI = extra => ({ g: 'Porsi', c: [{ l: 'Reguler' }, { l: 'Dengan telur', p: extra }] });
  // d(id, kategori, nama, deskripsi, hargaHot, hargaIce, ikon, {tag, on, shot})
  const d = (id, cat, name, desc, hot, ice, ic, o) => {
    o = o || {};
    const m = { id, cat, name, desc, price: hot != null ? hot : ice, ic, opts: [hot != null && ice != null ? both(hot, ice) : only(hot != null ? 'Hot' : 'Ice')] };
    if (o.shot !== false) m.opts.push(ADD_SHOT);
    if (o.tag) m.tag = o.tag;
    if (o.on === false) m.on = false;
    return m;
  };
  const f = (id, name, desc, price, ic, opts, tag) => {
    const m = { id, cat: 'Main Course', name, desc, price, ic, opts };
    if (tag) m.tag = tag;
    return m;
  };
  const FAV = 'Favorit';
  const MENU = [
    d('m01', 'Special Series', 'Es Kopi Sakuta', 'Es kopi susu signature Sakuta.', null, 22000, 'iced', { tag: FAV }),
    d('m02', 'Special Series', 'Avocado Latte', 'Espresso dengan alpukat, creamy dan segar.', null, 26000, 'iced'),
    d('m03', 'Special Series', 'Creamy Kahlua Latte', 'Latte creamy beraroma kahlua.', 24000, 25000, 'cup', { tag: FAV }),
    d('m04', 'Special Series', 'Irish Cream Latte', 'Latte lembut dengan sirup irish cream.', 24000, 25000, 'cup'),
    d('m05', 'Special Series', 'Matcha Fusion', 'Matcha yang dipadukan dengan espresso.', null, 27000, 'leaf'),
    d('m06', 'Special Series', 'Pandan Latte', 'Latte harum pandan yang manis dan lembut.', 24000, 25000, 'cup'),
    d('m07', 'Special Series', 'Rummy Latte', 'Latte beraroma rum, manis dan hangat.', 24000, 25000, 'cup', { tag: FAV }),
    d('m08', 'Special Series', 'Sweet Butter Latte', 'Latte dengan butter yang manis dan gurih.', 24000, 25000, 'cup', { tag: FAV }),
    d('m09', 'Classic Coffee', 'Affogato', 'Espresso yang dituang di atas es krim.', null, 23000, 'iced', { tag: FAV }),
    d('m10', 'Classic Coffee', 'Americano', 'Espresso dan air, bersih dan ringan.', 22000, 22000, 'cup'),
    d('m11', 'Classic Coffee', 'Caffe Latte', 'Espresso dengan susu steamed yang lembut.', 27000, 28000, 'cup', { tag: FAV }),
    d('m12', 'Classic Coffee', 'Cappuccino', 'Espresso dengan susu dan busa yang tebal.', 26000, 26000, 'cup', { tag: FAV }),
    d('m13', 'Classic Coffee', 'Mochaccino', 'Espresso, cokelat, dan susu.', 28000, 29000, 'cup'),
    d('m14', 'Classic Coffee', 'Hazelnut Latte', 'Latte dengan sirup hazelnut.', 24000, 25000, 'cup', { tag: FAV }),
    d('m15', 'Classic Coffee', 'Vanilla Latte', 'Latte dengan sirup vanila.', 28000, 29000, 'cup', { tag: FAV }),
    d('m16', 'Manual Brew', 'V60 Manual Brew', 'Seduh manual dengan metode V60, disajikan panas.', 28000, null, 'cup', { shot: false }),
    d('m17', 'Manual Brew', 'Japanese', 'Seduh manual metode Japanese, langsung dingin.', null, 28000, 'iced', { shot: false }),
    f('m18', 'Nasi Kulit', 'Nasi dengan kulit ayam krispi. Pilih sambal matah atau sambal ijo.', 32000, 'bowl', [SAMBAL, ADD_EGG], FAV),
    f('m19', 'Nasi Chicken Teriyaki', 'Nasi hangat dengan ayam saus teriyaki.', 37000, 'bowl', [ADD_EGG], FAV),
    f('m20', 'Karaage Rice Bowl', 'Nasi dengan ayam karaage yang renyah.', 38000, 'bowl', [ADD_EGG]),
    f('m21', 'Nasi Katsu', 'Nasi dengan ayam katsu. Pilih sambal matah atau sambal ijo.', 35000, 'bowl', [SAMBAL, ADD_EGG], FAV),
    f('m22', 'Nasi Gila', 'Nasi goreng ala nasi gila dengan topping komplit.', 34000, 'bowl', [ADD_EGG]),
    f('m23', 'Nasi Goreng Sambal Ijo', 'Nasi goreng sambal ijo dengan telur ceplok, kerupuk, dan timun.', 36000, 'bowl', [ADD_EGG], FAV),
    f('m24', 'Nasi Goreng Kampung', 'Nasi goreng dengan bumbu kampung yang gurih.', 35000, 'bowl', [ADD_EGG], FAV),
    f('m25', 'Kwetiau Goreng', 'Kwetiau goreng dengan telur dan kerupuk.', 35000, 'utensils', [ADD_EGG]),
    f('m26', 'Nasi Ayam Taliwang', 'Nasi dengan ayam bumbu taliwang. Bisa ditambah telur.', 30000, 'bowl', [PORSI(3000)], FAV),
    f('m27', 'Nasi Ayam Thai Sauce', 'Nasi dengan ayam saus thai. Bisa ditambah telur.', 32000, 'bowl', [PORSI(3000)], FAV),
    f('m28', 'Spaghetti Tuna Agilio', 'Spaghetti bawang putih dengan tuna.', 34000, 'utensils', [ADD_EGG])
  ];
  const DEFAULT_SETTINGS = { tax: 10, service: 5, cash: true, sound: true, tables: 12 };

  const STATUS = {
    pending: { t: 'Menunggu pembayaran', k: 'b-amber' },
    paid: { t: 'Baru masuk', k: 'b-sage' },
    preparing: { t: 'Disiapkan', k: 'b-cocoa' },
    ready: { t: 'Siap diantar', k: 'b-slate' },
    delivered: { t: 'Sudah diantar', k: '' },
    expired: { t: 'Kedaluwarsa', k: 'b-rose' },
    cancelled: { t: 'Dibatalkan', k: 'b-rose' }
  };
  const METHOD = {
    qris: 'QRIS', gopay: 'GoPay', shopeepay: 'ShopeePay', va_bca: 'VA BCA', va_bni: 'VA BNI', va_bri: 'VA BRI',
    va_mandiri: 'VA Mandiri', card: 'Kartu', cash: 'Tunai'
  };
  const METHOD_GROUP = { qris: 'QRIS', gopay: 'E-wallet', shopeepay: 'E-wallet', va_bca: 'Virtual account', va_bni: 'Virtual account', va_bri: 'Virtual account', va_mandiri: 'Virtual account', card: 'Kartu', cash: 'Tunai' };
  const PAID_SET = ['paid', 'preparing', 'ready', 'delivered'];
  const STATUS_CODE = { settlement: '200', pending: '201', deny: '202', expire: '407', cancel: '200', refund: '200' };

  /* ---------------- perhitungan harga ("server") ---------------- */
  function priceLine(m, sel) {
    sel = sel || {};
    let unit = m.price; const labels = [];
    (m.opts || []).forEach(g => {
      const pick = sel[g.g];
      if (g.multi) {
        (Array.isArray(pick) ? pick : []).forEach(l => { const c = g.c.find(x => x.l === l); if (c) { unit += c.p || 0; labels.push(c.l); } });
      } else {
        const c = g.c.find(x => x.l === pick) || g.c[0];
        unit += c.p || 0; labels.push(c.l);
      }
    });
    return { unit, labels };
  }
  function totals(lines, set) {
    const sub = lines.reduce((a, l) => a + l.unit * l.qty, 0);
    const service = Math.round(sub * (set.service || 0) / 100);
    const tax = Math.round((sub + service) * (set.tax || 0) / 100);
    return { sub, service, tax, total: sub + service + tax };
  }


  /* ---------------- tampilan harga (Hot / Ice) ---------------- */
  const kfmt = n => (n % 1000 ? (n / 1000).toFixed(1).replace('.', ',') : n / 1000) + 'K';
  function priceTags(m) {
    const g = (m.opts || []).find(x => x.t);
    if (!g) return [{ l: '', v: m.price }];
    const vals = g.c.map(c => ({ l: c.l, v: m.price + (c.p || 0) }));
    /* Hanya satu varian harga (mis. cuma Ice) atau semua varian harganya sama: sembunyikan label Hot/Ice. */
    if (vals.every(x => x.v === vals[0].v)) return [{ l: '', v: vals[0].v }];
    return vals;
  }

  /* ---------------- tema terang / gelap ---------------- */
  const THEME_KEY = 'sk_theme';
  const getTheme = () => {
    let t = null; try { t = localStorage.getItem(THEME_KEY); } catch (e) { }
    return t || (w.matchMedia && w.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  };
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', t === 'dark' ? '#1B1816' : '#F6F5F3');
    document.querySelectorAll('[data-theme-toggle]').forEach(b => { b.innerHTML = icon(t === 'dark' ? 'sun' : 'moon'); b.setAttribute('aria-label', t === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'); });
  }
  function toggleTheme() { const t = getTheme() === 'dark' ? 'light' : 'dark'; try { localStorage.setItem(THEME_KEY, t); } catch (e) { } applyTheme(t); }
  const themeBtn = cls => '<button class="icon-btn ' + (cls || '') + '" data-theme-toggle title="Mode terang atau gelap">' + icon(getTheme() === 'dark' ? 'sun' : 'moon') + '</button>';
  w.addEventListener('storage', e => { if (e.key === THEME_KEY) applyTheme(getTheme()); });
  document.addEventListener('click', e => { if (e.target.closest('[data-theme-toggle]')) toggleTheme(); });
  applyTheme(getTheme());

  /* ---------------- penyimpanan + sinkronisasi ---------------- */
  let cache = null;
  let subs = [];
  let timer = null;
  const bc = ('BroadcastChannel' in w) ? new BroadcastChannel('sakuta_demo') : null;
  const fire = () => { clearTimeout(timer); timer = setTimeout(() => subs.slice().forEach(f => { try { f(); } catch (e) { console.error(e); } }), 25); };
  if (bc) bc.onmessage = () => { cache = null; fire(); };
  w.addEventListener('storage', e => { if (e.key === KEY || e.key === null) { cache = null; fire(); } });
  const on = fn => { subs.push(fn); return () => { subs = subs.filter(f => f !== fn); }; };

  function save(st) {
    cache = st;
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* mode privat: tetap jalan di memori */ }
    if (bc) bc.postMessage(1);
    fire();
  }
  function state() {
    if (cache) return cache;
    let st = null;
    try { st = JSON.parse(localStorage.getItem(KEY)); } catch (e) { st = null; }
    if (!st || st.v !== 3 || Date.now() - st.seededAt > STALE_MS) st = init();
    cache = st;
    return st;
  }
  function mutate(fn) { cache = null; const st = state(); const r = fn(st); save(st); return r; }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { } cache = null; const st = init(); return st; }

  /* ---------------- pembuatan order ---------------- */
  function makeOrder(st, inp, at) {
    st.seq++;
    const code = 'SKT-' + pad(st.seq, 4);
    const lines = [];
    (inp.lines || []).forEach(l => {
      const m = st.menu.find(x => x.id === l.id);
      if (!m || m.on === false) return;
      const pl = priceLine(m, l.sel);
      lines.push({ id: m.id, name: m.name, qty: Math.max(1, Math.min(20, l.qty | 0)), unit: pl.unit, opts: pl.labels, note: (l.note || '').slice(0, 120) });
    });
    if (!lines.length) { st.seq--; return null; }
    const t = totals(lines, st.settings);
    const cash = inp.mode === 'cash';
    const o = {
      code, token: uid(10), table: inp.table, name: (inp.name || '').slice(0, 30), lines,
      sub: t.sub, service: t.service, tax: t.tax, total: t.total,
      mode: cash ? 'cash' : 'online', method: cash ? 'cash' : null,
      status: 'pending', payStatus: 'pending', createdAt: at, expiresAt: cash ? null : at + EXPIRY_MIN * 60000,
      tl: [{ s: 'pending', at }], rating: 0
    };
    st.orders.push(o);
    return o;
  }
  const pushTL = (o, s, at) => { o.status = s; o.tl.push({ s, at: at || Date.now() }); };
  const byToken = t => state().orders.find(o => o.token === t) || null;
  const byCode = c => state().orders.find(o => o.code === c) || null;

  function createOrder(inp) {
    const tok = mutate(st => { const o = makeOrder(st, inp, Date.now()); return o && o.token; });
    return tok ? byToken(tok) : null;
  }

  /* ---------------- simulasi Midtrans ---------------- */
  async function sha512(str) {
    try {
      const b = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      let out = '', h = 2166136261;
      for (let k = 0; k < 16; k++) { for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i) + k; h = Math.imul(h, 16777619) >>> 0; } out += h.toString(16).padStart(8, '0'); }
      return out;
    }
  }
  const uuidLike = seed => {
    let hex = ''; for (let i = 0; i < 4; i++) hex += hashInt(seed + '#' + i).toString(16).padStart(8, '0');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-4' + hex.slice(13, 16) + '-a' + hex.slice(17, 20) + '-' + hex.slice(20, 32);
  };
  const VA_PREFIX = { va_bca: '39381', va_bni: '8810', va_bri: '26215', va_mandiri: '70012' };
  const vaFor = (method, code) => (VA_PREFIX[method] || '99') + String(hashInt(code + method)).padStart(10, '0').slice(0, 10);

  async function buildPayload(o, txStatus, method, at) {
    const gross = o.total.toFixed(2), sc = STATUS_CODE[txStatus] || '200';
    const sig = await sha512(o.code + sc + gross + SERVER_KEY);
    const type = method === 'card' ? 'credit_card' : String(method).startsWith('va_') ? 'bank_transfer' : (method || 'qris');
    const p = {
      transaction_time: ymdhms(o.createdAt),
      transaction_status: txStatus,
      transaction_id: uuidLike(o.code + txStatus + at),
      status_message: 'midtrans payment notification',
      status_code: sc,
      signature_key: sig,
      payment_type: type,
      order_id: o.code,
      merchant_id: 'G000000000',
      gross_amount: gross,
      fraud_status: 'accept',
      currency: 'IDR'
    };
    if (txStatus === 'settlement' || txStatus === 'refund') p.settlement_time = ymdhms(at);
    if (type === 'bank_transfer') p.va_numbers = [{ bank: String(method).slice(3), va_number: vaFor(method, o.code) }];
    if (type === 'credit_card') { p.masked_card = '481111-1114'; p.bank = 'bni'; p.card_type = 'credit'; }
    if (txStatus === 'deny') p.fraud_status = 'deny';
    return p;
  }

  /* Meniru endpoint POST /api/midtrans/notification */
  async function notify(code, txStatus, method) {
    const o0 = byCode(code); if (!o0) return null;
    const at = Date.now();
    const p = await buildPayload(o0, txStatus, method || o0.method || 'qris', at);
    const expected = await sha512(p.order_id + p.status_code + p.gross_amount + SERVER_KEY);
    const valid = expected === p.signature_key; // langkah 1 di server: verifikasi signature
    mutate(st => {
      const o = st.orders.find(x => x.code === code); if (!o) return;
      const e = { id: 'wh_' + uid(6), at, code, payload: p, verified: valid, http: valid ? 200 : 403, note: '', dup: false };
      if (!valid) { e.note = 'Signature tidak cocok. Notifikasi ditolak.'; }
      else if (txStatus === 'settlement') {
        if (o.payStatus === 'settlement') { e.dup = true; e.note = 'Duplikat. Pesanan sudah lunas, notifikasi diabaikan (idempotent).'; }
        else if (o.status === 'expired' || o.status === 'cancelled') { e.note = 'Pesanan sudah ' + STATUS[o.status].t.toLowerCase() + '. Dicatat untuk rekonsiliasi.'; }
        else { o.payStatus = 'settlement'; o.method = method; o.paidAt = at; pushTL(o, 'paid', at); e.note = 'Status pesanan berubah dari pending ke paid. Dashboard kasir diberi tahu.'; }
      } else if (txStatus === 'expire') {
        if (o.status === 'pending') { o.payStatus = 'expire'; pushTL(o, 'expired', at); e.note = 'Batas waktu habis. Pesanan ditandai kedaluwarsa otomatis.'; }
        else { return; }
      } else if (txStatus === 'deny') {
        e.note = 'Pembayaran ditolak. Pelanggan diminta memilih metode lain, pesanan tetap menunggu.';
      } else if (txStatus === 'cancel') {
        if (o.status === 'pending') { o.payStatus = 'cancel'; pushTL(o, 'cancelled', at); e.note = 'Transaksi dibatalkan.'; }
      } else if (txStatus === 'refund') {
        o.payStatus = 'refund'; o.refundedAt = at; pushTL(o, 'cancelled', at); e.note = 'Dana dikembalikan ke pelanggan. Pesanan dibatalkan.';
      }
      st.hooks.unshift(e); st.hooks = st.hooks.slice(0, 80);
    });
    return { payload: p, valid };
  }
  const replay = code => { const o = byCode(code); return o ? notify(code, 'settlement', o.method) : null; };

  const STEPS = ['paid', 'preparing', 'ready', 'delivered'];
  function advance(code) {
    return mutate(st => {
      const o = st.orders.find(x => x.code === code); if (!o) return null;
      const i = STEPS.indexOf(o.status); if (i < 0 || i >= STEPS.length - 1) return null;
      pushTL(o, STEPS[i + 1]); return o.status;
    });
  }
  function cashPaid(code) {
    mutate(st => { const o = st.orders.find(x => x.code === code); if (o && o.status === 'pending') { o.payStatus = 'cash'; o.method = 'cash'; o.paidAt = Date.now(); pushTL(o, 'paid'); } });
  }
  function cancelOrder(code) {
    mutate(st => { const o = st.orders.find(x => x.code === code); if (o && (o.status === 'pending')) { o.payStatus = 'cancel'; pushTL(o, 'cancelled'); } });
  }
  const refund = code => { const o = byCode(code); if (!o) return null; return o.method === 'cash' ? mutate(st => { const x = st.orders.find(y => y.code === code); if (x) { x.payStatus = 'refund'; pushTL(x, 'cancelled'); } }) : notify(code, 'refund', o.method); };
  function sweep() {
    const now = Date.now();
    state().orders.filter(o => o.status === 'pending' && o.expiresAt && o.expiresAt < now).forEach(o => notify(o.code, 'expire', o.method || 'qris'));
  }
  const rate = (code, n) => mutate(st => { const o = st.orders.find(x => x.code === code); if (o) o.rating = n; });

  /* ---------------- menu & pengaturan ---------------- */
  const menuToggle = id => mutate(st => { const m = st.menu.find(x => x.id === id); if (m) m.on = m.on === false; });
  function menuSave(item) {
    mutate(st => {
      const i = st.menu.findIndex(x => x.id === item.id);
      if (i >= 0) st.menu[i] = Object.assign({}, st.menu[i], item);
      else st.menu.push(Object.assign({ id: 'm' + uid(4), on: true, opts: [] }, item));
    });
  }
  const menuRemove = id => mutate(st => { st.menu = st.menu.filter(x => x.id !== id); });
  const setSettings = patch => mutate(st => { Object.assign(st.settings, patch); });

  /* ---------------- statistik dashboard ---------------- */
  function stats(hours) {
    const st = state(), now = new Date();
    const cur = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime();
    const first = cur - (hours - 1) * 3600000;
    const list = st.orders.filter(o => PAID_SET.includes(o.status) && o.createdAt >= first);
    const buckets = [];
    for (let i = 0; i < hours; i++) { const s = first + i * 3600000; buckets.push({ start: s, label: pad(new Date(s).getHours()) + '.00', rev: 0, n: 0, now: s === cur }); }
    const top = {}, pay = {};
    let revenue = 0;
    list.forEach(o => {
      revenue += o.total;
      const b = buckets[Math.min(hours - 1, Math.floor((o.createdAt - first) / 3600000))]; b.rev += o.total; b.n++;
      o.lines.forEach(l => { const t = top[l.id] || (top[l.id] = { name: l.name, qty: 0, rev: 0 }); t.qty += l.qty; t.rev += l.qty * l.unit; });
      const g = METHOD_GROUP[o.method] || 'Lainnya'; const p = pay[g] || (pay[g] = { label: g, n: 0, rev: 0 }); p.n++; p.rev += o.total;
    });
    return {
      revenue, count: list.length, avg: list.length ? revenue / list.length : 0,
      active: st.orders.filter(o => ['paid', 'preparing', 'ready'].includes(o.status)).length,
      buckets, top: Object.values(top).sort((a, b) => b.qty - a.qty).slice(0, 5),
      pay: Object.values(pay).sort((a, b) => b.rev - a.rev)
    };
  }
  function tableStatus(n) {
    const act = state().orders.filter(o => o.table === n && ['pending', 'paid', 'preparing', 'ready'].includes(o.status));
    return { busy: act.length > 0, n: act.length };
  }

  /* ---------------- QR, URL ---------------- */
  function qrSvg(text, o) {
    o = o || {};
    const q = qrcode(0, 'M'); q.addData(String(text)); q.make();
    const n = q.getModuleCount(), m = o.margin == null ? 2 : o.margin; let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
    const s = n + m * 2;
    return '<svg xmlns="http://www.w3.org/2000/svg" class="qr" viewBox="0 0 ' + s + ' ' + s + '" shape-rendering="crispEdges"' + (o.size ? ' width="' + o.size + '" height="' + o.size + '"' : '') + ' role="img" aria-label="' + esc(o.label || 'Kode QR') + '"><rect width="' + s + '" height="' + s + '" fill="' + (o.bg || '#fff') + '"/><path d="' + d + '" fill="' + (o.fg || '#2E2723') + '"/></svg>';
  }
  const pageUrl = (name, qs) => { const u = new URL(name, w.location.href); u.search = qs || ''; u.hash = ''; return u.href; };
  const tableUrl = n => pageUrl('menu.html', '?meja=' + n);

  /* ---------------- suara & toast ---------------- */
  let actx = null;
  function unlockAudio() { try { actx = actx || new (w.AudioContext || w.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { } }
  function beep() {
    if (!actx) return; const t = actx.currentTime;
    [[880, 0], [1174.66, .17]].forEach(a => {
      const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = a[0];
      g.gain.setValueAtTime(0.0001, t + a[1]); g.gain.linearRampToValueAtTime(.16, t + a[1] + .02); g.gain.exponentialRampToValueAtTime(.001, t + a[1] + .38);
      o.connect(g); g.connect(actx.destination); o.start(t + a[1]); o.stop(t + a[1] + .42);
    });
  }
  function toast(msg, o) {
    o = o || {};
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = (o.icon ? icon(o.icon, 'sm') : '') + '<span>' + esc(msg) + '</span>';
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, o.ms || 3200);
  }

  /* ---------------- seed data contoh ---------------- */
  function init() {
    const now = Date.now();
    const st = { v: 3, seededAt: now, seq: 0, orders: [], hooks: [], menu: clone(MENU), settings: clone(DEFAULT_SETTINGS) };
    seed(st, now);
    save(st);
    setTimeout(seedHooks, 0);
    return st;
  }
  function seed(st, now) {
    const r = rng(20260921);
    const pool = st.menu.filter(m => m.on !== false);
    const wgt = m => m.cat === 'Classic Coffee' ? 4 : m.cat === 'Special Series' ? 3.4 : m.cat === 'Main Course' ? 2.6 : 1;
    const total = pool.reduce((a, m) => a + wgt(m), 0);
    const pick = () => { let x = r() * total; for (const m of pool) { x -= wgt(m); if (x <= 0) return m; } return pool[0]; };
    const names = ['', 'Rina', 'Bagas', 'Dewi', '', 'Arif', 'Maya', '', 'Kevin', 'Sari', '', 'Tio'];
    const specs = [];
    for (let i = 0; i < 30; i++) {
      const t = now - (20 + r() * 10.2 * 60) * 60000;
      const lines = [], used = {}, cnt = 1 + Math.floor(r() * 3);
      for (let k = 0; k < cnt; k++) {
        const m = pick(); if (used[m.id]) continue; used[m.id] = 1;
        const sel = {}; (m.opts || []).forEach(g => { if (g.multi) { if (r() < .25) sel[g.g] = [g.c[0].l]; } else sel[g.g] = g.c[Math.floor(r() * g.c.length)].l; });
        lines.push({ id: m.id, qty: 1 + (r() < .22 ? 1 : 0), sel, note: '' });
      }
      const mr = r();
      const method = mr < .42 ? 'qris' : mr < .60 ? 'gopay' : mr < .72 ? 'shopeepay' : mr < .86 ? 'va_bca' : mr < .93 ? 'card' : 'cash';
      specs.push({ t, stage: 'delivered', method, name: names[Math.floor(r() * names.length)], table: 1 + Math.floor(r() * st.settings.tables), lines });
    }
    const min = 60000;
    specs.push({ t: now - 2.5 * min, stage: 'paid', method: 'qris', name: 'Rina', table: 3, lines: [{ id: 'm01', qty: 2, sel: {} }, { id: 'm21', qty: 1, sel: { Sambal: 'Sambal matah', 'Add on': ['Telur'] } }] });
    specs.push({ t: now - 7 * min, stage: 'preparing', method: 'gopay', name: 'Bagas', table: 7, lines: [{ id: 'm23', qty: 1, sel: { 'Add on': ['Telur'] } }, { id: 'm10', qty: 1, sel: { 'Hot atau Ice': 'Ice' }, note: 'Es batu sedikit' }] });
    specs.push({ t: now - 12 * min, stage: 'ready', method: 'va_bca', name: 'Maya', table: 2, lines: [{ id: 'm03', qty: 1, sel: { 'Hot atau Ice': 'Ice' } }, { id: 'm26', qty: 1, sel: { Porsi: 'Dengan telur' } }] });
    specs.push({ t: now - 3 * min, stage: 'cash', method: 'cash', name: 'Tio', table: 9, lines: [{ id: 'm11', qty: 1, sel: { 'Hot atau Ice': 'Hot' } }, { id: 'm28', qty: 1 }] });
    specs.sort((a, b) => a.t - b.t);
    specs.forEach(s => {
      const o = makeOrder(st, { table: s.table, name: s.name, lines: s.lines, mode: s.method === 'cash' ? 'cash' : 'online' }, s.t);
      if (!o) return;
      const sec = 1000, at = (x) => s.t + x;
      if (s.stage === 'cash') return;
      o.method = s.method; o.payStatus = s.method === 'cash' ? 'cash' : 'settlement';
      const dly = s.stage === 'delivered';
      const paid = at(dly ? (30 + r() * 60) * sec : 30 * sec);
      o.paidAt = paid; pushTL(o, 'paid', paid);
      if (s.stage === 'paid') return;
      const prep = dly ? paid + (40 + r() * 90) * sec : paid + 60 * sec; pushTL(o, 'preparing', prep);
      if (s.stage === 'preparing') return;
      const ready = dly ? prep + (3 + r() * 4) * min : prep + 7 * min; pushTL(o, 'ready', ready);
      if (s.stage === 'ready') return;
      pushTL(o, 'delivered', ready + (1 + r() * 3) * min);
      if (r() < .55) o.rating = 4 + (r() < .6 ? 1 : 0);
    });
  }
  async function seedHooks() {
    const st = state();
    const list = st.orders.filter(o => o.method && o.method !== 'cash' && PAID_SET.includes(o.status)).slice(-9);
    const entries = [];
    for (const o of list) {
      const p = await buildPayload(o, 'settlement', o.method, o.paidAt);
      entries.push({ id: 'wh_' + uid(6), at: o.paidAt, code: o.code, payload: p, verified: true, http: 200, note: 'Status pesanan berubah dari pending ke paid. Dashboard kasir diberi tahu.', dup: false });
    }
    mutate(s => { if (!s.hooks.length) s.hooks = entries.sort((a, b) => b.at - a.at); });
  }

  w.Sakuta = {
    KEY, EXPIRY_MIN, SERVER_KEY, CATS, CAT_TILE, IC_LABEL, STATUS, METHOD, METHOD_GROUP, PAID_SET, STEPS,
    icon, logo, logoMark, rp, esc, pad, timeStr, ymdhms, ago, mmss, uid, sha512, vaFor,
    state, mutate, on, reset, priceLine, totals, createOrder, byToken, byCode,
    notify, replay, advance, cashPaid, cancelOrder, refund, sweep, rate,
    menuToggle, menuSave, menuRemove, setSettings, stats, tableStatus,
    qrSvg, pageUrl, tableUrl, unlockAudio, beep, toast, kfmt, priceTags, themeBtn, toggleTheme, applyTheme
  };
})(window);
