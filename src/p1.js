// P-OL1 Buyer: cart and checkout — branch per line, delivery method, price and payment window
const SELLERS = { to: "ТехноОпт", hs: "Холод Сервис" };
const BR = {
  ch: { s: "to", n: "Филиал Чиланзар", city: "Ташкент", a: "Ташкент, Чиланзарский р-н, ул. Бунёдкор, 12", pu: true, sd: { "Ташкент": 1 } },
  se: { s: "to", n: "Склад Сергели", city: "Ташкент", a: "Ташкент, Сергелийский р-н, ул. Янги Сергели, 45", pu: false, sd: { "Ташкент": 2 } },
  sm: { s: "to", n: "Филиал Самарканд", city: "Самарканд", a: "Самарканд, ул. Абдурахмана Джами, 40", pu: true, sd: { "Самарканд": 2 } },
  yu: { s: "hs", n: "Филиал Юнусабад", city: "Ташкент", a: "Ташкент, Юнусабадский р-н, ул. Амира Темура, 107", pu: true, sd: { "Ташкент": 1 } },
};
const ADDRS = { sam: { t: "Самарканд, ул. Регистан, 5", city: "Самарканд" }, tash: { t: "Ташкент, массив Буз-1, 8", city: "Ташкент" } };
// distances only drive the order and the «ближайший» hint; they are never shown as numbers
const DIST = { sam: { ch: 288, se: 281, sm: 4, yu: 296 }, tash: { ch: 3, se: 11, sm: 290, yu: 9 } };
const PROD = {
  fr: { n: "Холодильник Artel HD 455", p: 6300000, kg: 62 },
  fz: { n: "Морозильный ларь Artel 300", p: 4100000, kg: 48 },
  ac: { n: "Кондиционер Artel 12 Inverter", p: 3900000, kg: 35 },
  st: { n: "Стулья офисные (комплект)", p: 450000, kg: 24 },
};
const STOCK0 = { fr: { ch: 5, se: 8, sm: 4 }, fz: { ch: 2, se: 0, sm: 3 }, ac: { ch: 12, se: 15, sm: 3 }, st: { yu: 20 } };
const LINES0 = [{ id: "l1", p: "fr", q: 2, s: "to" }, { id: "l2", p: "fz", q: 1, s: "to" }, { id: "l3", p: "ac", q: 10, s: "to" }, { id: "l4", p: "st", q: 4, s: "hs" }];
const M = { pu: "Самовывоз", sd: "Доставка продавцом", yg: "Yandex Go", fa: "Fargo" };
const ORDER_NO = "68726512";
const ADDR_WHY = "Добавьте адрес доставки";
let S = {}, cdTimer = null;

function reset(o) {
  closeModal(); clearInterval(cdTimer);
  S = Object.assign({ view: "cart", hdr: "sam", saved: ["sam", "tash"], sel: ["l1", "l2"], stock: null, prev: "yg", fargoLogin: true, heavy: false, puOff: false,
    stale: false, bump: 0, priceMsg: false, method: undefined, addr: undefined, ck: null, alert: "", demo: "", sheet: null, heavySw: false }, o || {});
  S.stock = JSON.parse(JSON.stringify(STOCK0));
  (o && o.stockOv || []).forEach(([p, b, q]) => { S.stock[p][b] = q; });
  S.lines = LINES0.filter(l => !(o && o.drop || []).includes(l.id)).map(l => Object.assign({}, l, { manual: false }));
  S.lines.forEach(l => { l.br = suggest(l); });
  if (S.view === "checkout" || S.view === "phones") startCheckout(S.ckSel || S.sel, true);
  render();
}
const stock = (p, b) => (S.stock[p] || {})[b] || 0;
const branchesOf = s => Object.keys(BR).filter(k => BR[k].s === s);
const fullAt = l => branchesOf(l.s).filter(b => stock(l.p, b) >= l.q);
const byDist = arr => S.hdr ? arr.slice().sort((a, b) => DIST[S.hdr][a] - DIST[S.hdr][b]) : arr.slice();
// 4.3.1: nearest branch of the seller with the full quantity, from the header address; else a branch in the buyer's city; else the first active one
function suggest(l) {
  const ok = fullAt(l); if (!ok.length) return null;
  if (S.hdr) return byDist(ok)[0];
  if (S.city) { const c = ok.find(b => BR[b].city === S.city); if (c) return c; }
  return ok[0];
}
const lineById = id => S.lines.find(l => l.id === id);
const fmtD = n => { const d = new Date(2026, 9, 27 + n); return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear(); };
const plural = n => n % 10 === 1 && n % 100 !== 11 ? "товар" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "товара" : "товаров";

function header() {
  const t = S.hdr ? ADDRS[S.hdr].t : "Укажите адрес доставки";
  return `<div class="strip"><span>➤ <a href="#" id="hdraddr" style="color:#fff;text-decoration:underline">${t}</a></span><span><span>О компании</span><span>Связаться с нами</span><span>Доставка и оплата</span></span></div>
  <div class="bh">${LOGO}<button class="btn pri">☰ Каталог</button><div class="srch"><input placeholder="Что вы ищете?"><button>Найти</button></div><span class="small">Русский · Избранное · <b style="color:var(--green)">Корзина</b> · Заказы · Профиль</span></div>`;
}
function hdrPicker() {
  document.querySelectorAll(".addrpick").forEach(x => x.remove());
  const el = document.createElement("div"); el.className = "addrpick";
  el.innerHTML = `<div class="modal"><h3>Адрес доставки</h3>${Object.entries(ADDRS).map(([k, v]) => `<div class="opt" data-ha="${k}" style="cursor:pointer;border-top:1px solid var(--line)"><span class="radio ${S.hdr === k ? "on" : ""}"></span>${v.t}</div>`).join("")}
    <p class="hint">Филиал строк, которые вы не меняли вручную, подбирается заново.</p><div class="acts"><button class="btn out" id="hpclose">Закрыть</button></div></div>`;
  document.body.append(el);
  el.querySelectorAll("[data-ha]").forEach(x => x.onclick = () => { S.hdr = x.dataset.ha; S.lines.forEach(l => { if (!l.manual) l.br = suggest(l); }); el.remove(); render(); });
  $("#hpclose", el).onclick = () => el.remove();
}

// ---------- cart ----------
function cartState(selIds) {
  const ls = (selIds || S.sel).map(lineById).filter(Boolean);
  const brs = [...new Set(ls.map(l => l.br))];
  if (!ls.length) return { st: "none", ls };
  if (brs.length === 1) return { st: "ok", ls, br: brs[0] };
  let move = null;
  const sellers = [...new Set(ls.map(l => l.s))];
  if (sellers.length === 1) {
    const cand = branchesOf(sellers[0]).filter(b => ls.every(l => stock(l.p, b) >= l.q));
    if (cand.length) move = byDist(cand)[0];
  }
  return { st: "mixed", ls, move };
}
function groups() {
  const out = [];
  Object.keys(SELLERS).forEach(s => {
    const ls = S.lines.filter(l => l.s === s); if (!ls.length) return;
    const brs = byDist(Object.keys(BR).filter(b => ls.some(l => l.br === b)));
    out.push({ s, brs: brs.map(b => ({ b, ls: ls.filter(l => l.br === b) })) });
  });
  return out;
}
const isNear = l => l.br && l.br === suggest(l) && !!S.hdr && branchesOf(l.s).length > 1;
function shipLine(l, mob) {
  return `<div class="ship">${mob ? "" : ICON.store}<span style="white-space:nowrap">Отправка из: <b>${l.br ? BR[l.br].n : "—"}</b></span>${isNear(l) ? '<span class="near">ближайший</span>' : ""}<span class="chg" data-chg="${l.id}">Изменить</span></div>`;
}
function cartLine(l) {
  const p = PROD[l.p];
  return `<div class="cline"><input type="checkbox" data-sel="${l.id}" ${S.sel.includes(l.id) ? "checked" : ""}><span class="pimg"></span>
    <div><div class="pn">${p.n}</div><div class="small muted">${som(p.p)} / шт.</div>${shipLine(l)}</div>
    <div><span class="qty"><span>−</span><b>${l.q} шт.</b><span>+</span></span></div><div class="ltot">${som(p.p * l.q)}</div></div>`;
}
function cartSummary(cs) {
  const n = cs.ls.reduce((a, l) => a + l.q, 0), sum = cs.ls.reduce((a, l) => a + PROD[l.p].p * l.q, 0);
  let msg = "";
  if (cs.st === "mixed") {
    msg = `<div class="alert w mt12"><span class="ic">!</span><div>Товары из разных филиалов нельзя оформить одним заказом. Выберите товары одного филиала или перенесите их в один филиал.</div></div>`;
    if (cs.move) msg += `<div class="alert i mt12"><span class="ic">i</span><div>Все товары есть в филиале «${BR[cs.move].n}». Отправить всё оттуда?<div class="mt8"><button class="btn soft sm" id="move" data-to="${cs.move}">Перенести</button></div></div></div>`;
  }
  return `<div class="sumc"><h3 style="margin:0 0 8px">Ваша корзина</h3><div class="ln">Выбрано<b>${n} шт.</b></div><div class="ln">Товары<b>${som(sum)}</b></div>
    ${cs.st === "ok" ? `<div class="ln">Отправка из<b>${BR[cs.br].n}</b></div>` : ""}
    <div class="tot"><span>Итого</span><span>${som(sum)}</span></div>${msg}
    <button class="btn pri big" id="toCheckout" ${cs.st === "ok" ? "" : "disabled"}>Оформить заказ</button>
    ${cs.st === "none" ? '<p class="small muted mt8">Отметьте товары, которые хотите оформить.</p>' : ""}<p class="hint mt8">Стоимость доставки рассчитывается при оформлении.</p></div>`;
}
function cart() {
  const cs = cartState();
  const gs = groups().map(g => `<div class="cartg"><div class="sh">${ICON.store}${SELLERS[g.s]}</div>
      ${g.brs.map(x => `<div class="bh2">${ICON.pin}${BR[x.b].n} · ${BR[x.b].city}</div>${x.ls.map(cartLine).join("")}`).join("")}</div>`).join("");
  const top = (S.alert ? `<div class="alert e" style="margin-bottom:16px"><span class="ic">!</span><div>${S.alert}</div></div>` : "") + (S.demo ? `<div class="demo-line" style="margin:0 0 16px">${S.demo}</div>` : "");
  return `<div class="buyer">${header()}<div class="wrapb"><div class="small muted">Главная › Корзина</div><h1 style="font-size:30px;margin:8px 0 18px">Корзина <span class="muted small">${S.lines.length} ${plural(S.lines.length)}</span></h1>
    ${top}<div class="cg"><div>${gs || '<div class="empty">Корзина пуста</div>'}</div>${cartSummary(cs)}</div>
    ${S.orders !== undefined ? '<div class="demo-acts"><button id="openOrders">демо: открыть «Заказы»</button></div>' : ""}</div></div>`;
}
function pickerRows(l) {
  const brs = branchesOf(l.s), ok = brs.filter(b => stock(l.p, b) >= l.q), bad = brs.filter(b => !ok.includes(b));
  const near = suggest(l);
  return byDist(ok).concat(byDist(bad)).map(b => {
    const q = stock(l.p, b), can = q >= l.q;
    return `<div class="bl ${can ? "" : "dis"} ${l.br === b ? "sel" : ""}" ${can ? `data-pick="${b}"` : ""}><div><b>${BR[b].n}</b>${can && b === near && S.hdr ? ' <span class="near">ближайший</span>' : ""}<div class="small">${BR[b].a}</div>
      ${can ? "" : `<div class="why">${q ? `Здесь только ${q} шт.` : "Нет в наличии"}</div>`}</div><div class="small ${l.br === b ? "" : "muted"}">${l.br === b ? "<b style='color:var(--green)'>✓ Выбран</b>" : ""}</div></div>`;
  }).join("");
}
function openPicker(id) {
  const l = lineById(id), p = PROD[l.p];
  const m = modal(`<h3>Выберите филиал</h3><p class="sub">${p.n} · ${l.q} шт. · ${SELLERS[l.s]}</p><div class="blist mt8">${pickerRows(l)}</div>
    <div class="acts"><button class="btn out" id="pclose">Закрыть</button></div>`);
  m.querySelectorAll("[data-pick]").forEach(x => x.onclick = () => { l.br = x.dataset.pick; l.manual = true; closeModal(); render(); });
  $("#pclose", m).onclick = closeModal;
}

// ---------- checkout ----------
function startCheckout(ids, init) {
  const cs = cartState(ids);
  S.ck = { ids: cs.ls.map(l => l.id), br: cs.br || (cs.ls[0] && cs.ls[0].br) };
  if (S.addr === undefined || !init) S.addr = S.hdr && S.saved.includes(S.hdr) ? S.hdr : (S.saved[0] || null);
  S.method = defMethod();
}
function methods() {
  const b = BR[S.ck.br], a = S.addr ? ADDRS[S.addr] : null;
  const tt = a && a.city === "Ташкент" && b.city === "Ташкент";
  const puOk = b.pu && !S.puOff;
  const sdDays = a && b.sd[a.city];
  const fPrice = (tt ? 30000 : a && a.city === b.city ? 45000 : 60000) + S.bump;
  return [
    { k: "pu", ok: puOk, why: "В этом филиале нет самовывоза", price: 0, pt: "0 сум", sub: `${b.n} · ${b.a}` },
    { k: "sd", ok: !!sdDays, why: a ? "Продавец не доставляет по этому адресу" : ADDR_WHY, price: 0, pt: "Бесплатно", sub: sdDays ? `Ожидается до ${fmtD(sdDays)}` : "" },
    { k: "yg", ok: !!tt, why: a ? "Yandex Go доставляет только по Ташкенту" : ADDR_WHY, price: 35000, pt: som(35000), sub: `Ожидается ${fmtD(0)} – ${fmtD(1)}` },
    { k: "fa", ok: !!a && S.fargoLogin && !S.heavy, why: !a ? ADDR_WHY : !S.fargoLogin ? "Продавец не отправляет через Fargo" : "Слишком тяжёлый заказ для Fargo (более 1 000 кг)",
      price: fPrice, pt: som(fPrice), old: S.bump && S.priceMsg ? som(fPrice - S.bump) : "", sub: tt ? `Ожидается ${fmtD(1)} – ${fmtD(3)}` : `Ожидается ${fmtD(3)} – ${fmtD(5)}` },
  ];
}
// 4.3.2 default: previous method if available; else the cheapest available delivery to the address; pickup only as the previous method
function defMethod() {
  const ms = methods(), ok = ms.filter(m => m.ok);
  const prev = ok.find(m => m.k === S.prev); if (prev) return prev.k;
  // pickup also when it is the only method the seller offers for this order at all (no delivery offered, not merely greyed)
  if (BR[S.ck.br].noDelivery && ok.some(m => m.k === "pu")) return "pu";
  if (!S.addr) return null;
  const dl = ok.filter(m => m.k !== "pu");
  return dl.length ? dl.slice().sort((x, y) => x.price - y.price)[0].k : null;
}
const mIcon = k => k === "pu" ? ICON.store : ICON.truck;
const mName = k => k === "yg" ? YG : k === "fa" ? FARGO : `<b>${M[k]}</b>`;
function mTile(m, compact) {
  const on = S.method === m.k && m.ok;
  return `<div class="mtile ${m.ok ? "" : "off"} ${on ? "on" : ""}" ${m.ok ? `data-m="${m.k}"` : 'aria-disabled="true"'}><span class="r"></span>
    ${mIcon(m.k).replace("<svg", '<svg class="mic"')}<div style="flex:1;min-width:0">${mName(m.k)}
    ${m.ok ? `<div class="small muted">${compact && m.k === "pu" ? BR[S.ck.br].n : m.sub}</div>` : `<div class="why">${m.why}</div>`}</div>${m.ok ? `<div class="mp">${m.old ? `<s>${m.old}</s>` : ""}${m.pt}</div>` : ""}</div>`;
}
function ckTotals() {
  const ls = S.ck.ids.map(lineById), goods = ls.reduce((a, l) => a + PROD[l.p].p * l.q, 0);
  const m = methods().find(x => x.k === S.method && x.ok);
  return { ls, goods, m, deliv: m ? m.price : 0, total: goods + (m ? m.price : 0), kg: S.heavySw ? 1240 : ls.reduce((a, l) => a + PROD[l.p].kg * l.q, 0) };
}
function checkout() {
  const t = ckTotals(), b = BR[S.ck.br];
  const addrBlk = S.saved.length
    ? `<div class="box">${S.saved.map(k => `<div class="opt" data-addr="${k}" style="cursor:pointer"><span class="radio ${S.addr === k ? "on" : ""}"></span>${ADDRS[k].t}</div>`).join("")}</div>`
    : `<div class="box"><div class="opt"><span class="muted">У вас пока нет адреса доставки.</span><span style="flex:1"></span><button class="btn soft sm" id="addAddr">＋ Добавить адрес</button></div></div>`;
  const demo = [];
  if (S.sw === "fargo") demo.push(`<div class="demo-sw" id="swHeavy"><span class="toggle ${S.heavySw ? "on" : ""}"></span>демо: у продавца есть логин Fargo, но заказ весит 1 240 кг <span class="muted">(сейчас: ${S.heavySw ? "1 240" : t.kg} кг, ${S.heavySw ? "логин Fargo есть" : "логина Fargo нет"})</span></div>`);
  if (S.sw === "none") demo.push(`<div class="demo-sw" id="swNone"><span class="toggle ${S.puOff ? "on" : ""}"></span>демо: ни один способ не доступен <span class="muted">(в этом филиале выключен самовывоз)</span></div>`);
  if (S.sw === "stale") demo.push(`<div class="demo-line">демо: страница оформления открыта в <b>14:00</b>, цены доставки рассчитаны в 14:00. Сейчас <b>14:40</b> — покупатель нажимает «Оплатить».</div>`);
  const dl = t.m ? (t.m.k === "sd" ? "Бесплатно" : som(t.m.price)) : "—";
  return `<div class="buyer">${header()}<div class="wrapb"><span class="backl" id="backCart">‹ Назад в корзину</span><h1 style="font-size:30px;margin:8px 0 20px">Оформление заказа</h1><div class="cg"><div>
    <div class="blk"><h2>Адрес доставки</h2>${addrBlk}</div>
    <div class="blk"><h2>Товары · ${SELLERS[b.s]}</h2><div class="ship" style="margin:2px 0 6px">${ICON.store}<span>Отправка из: <b>${b.n}</b> · ${b.city}</span></div>
      ${t.ls.map(l => `<div class="row mt8"><span class="thumb"></span><div style="flex:1">${PROD[l.p].n}<div class="small muted">${l.q} шт. × ${som(PROD[l.p].p)}</div></div><b>${som(PROD[l.p].p * l.q)}</b></div>`).join("")}</div>
    <div class="blk"><h2>Способ доставки</h2>${methods().map(m => mTile(m)).join("")}${demo.join("")}</div></div>
    <div class="sumc"><h3 style="margin:0 0 8px">Ваш заказ</h3><div class="ln">${t.ls.length} ${plural(t.ls.length)}<b>${som(t.goods)}</b></div>
      <div class="ln">Доставка<b>${dl}</b></div><div class="tot"><span>Итого</span><span>${som(t.total)}</span></div>
      ${S.priceMsg ? '<div class="alert w mt12"><span class="ic">!</span><div>Стоимость доставки обновлена. Проверьте итог перед оплатой.</div></div>' : ""}
      <button class="btn pri big" id="pay" ${t.m ? "" : "disabled"}>Оплатить</button>${t.m ? "" : '<p class="small muted mt8">Выберите способ доставки</p>'}
      <p class="hint mt8">После нажатия «Оплатить» на оплату есть 20 минут.</p></div></div></div></div>`;
}
function pay() {
  const t0 = ckTotals().total;
  if (S.stale) { S.stale = false; S.bump = 2000; const t1 = ckTotals().total; if (t1 !== t0) { S.priceMsg = true; render(); return; } }
  toast("Переход к оплате (Paylov)…");
}

// ---------- Paylov stub and the 20-minute window ----------
function paylov() {
  const t = ckTotals();
  return `<div class="pay-pg"><div class="pay-card"><div class="row" style="justify-content:space-between"><span class="pay-logo">pay<i>lov</i></span><span class="ptag">демо: страница Paylov</span></div>
    <p class="sub mt16">Оплата заказа на Optom.uz · ${SELLERS.to}</p><div style="font-size:28px;font-weight:700;margin:6px 0 14px">${som(t.total)}</div>
    <div class="ln small muted">Платёж: PA-20261027-0412 (попытка оплаты, заказа ещё нет)</div>
    <div class="row mt16" style="justify-content:space-between;background:#f6f7f9;border-radius:12px;padding:12px 14px"><span>Осталось на оплату</span><span class="cd" id="cd">20:00</span></div>
    <div class="field mt16"><label>Номер карты</label><input class="inp" value="8600 •••• •••• 1234" disabled></div><div class="grid2"><input class="inp" value="12/28" disabled><input class="inp" value="SMS-код" disabled></div>
    <div class="demo-acts" style="margin-top:16px"><button id="payOk">Оплатить вовремя</button><button id="payLate">демо: оплатить через 21 минуту</button></div>
    <p class="hint mt12">Окно 20 минут начинается в момент нажатия «Оплатить» на Optom.uz (14:05 → до 14:25).</p></div></div>`;
}
function startCountdown() {
  let s = 20 * 60; clearInterval(cdTimer);
  cdTimer = setInterval(() => { const el = $("#cd"); if (!el) return clearInterval(cdTimer); s = Math.max(0, s - 1); el.textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); el.classList.toggle("low", s < 120); }, 1000);
}
function ordersModal() {
  const row = S.orders ? `<div class="kv"><div style="flex:1"><b>Заказ №${ORDER_NO}</b> <span class="pill b">Оформлен</span><div class="small muted mt8">${SELLERS.to} · Филиал Чиланзар · Fargo · ${som(S.orders)}</div></div></div>`
    : `<div class="empty" style="padding:30px 0">Нет активных заказов</div>`;
  const m = modal(`<h3>Заказы</h3><div class="tabs mt8"><span class="tab on">Активные</span><span class="tab">Завершенные</span><span class="tab">Отменённые</span></div>${row}<div class="acts"><button class="btn out" id="oclose">Закрыть</button></div>`);
  $("#oclose", m).onclick = closeModal;
}

// ---------- buyer app ----------
function phoneShell(title, body, extra, tab) {
  return `<div class="phonewrap"><div class="phone"><div class="sb"><span>9:41</span><span>▮▮▮ ◔</span></div><div class="ah"><span>‹</span><b>${title}</b></div>
    <div class="pc" style="padding-bottom:150px">${body}</div>${extra || ""}
    <div class="tabbar"><span>Главная</span><span>Каталог</span><span class="${tab === "cart" ? "on" : ""}">Корзина</span><span>Заказы</span><span>Профиль</span></div></div></div>`;
}
function mCart(withIds) {
  const cs = cartState();
  const body = groups().map(g => `<div class="card mt8"><b>${SELLERS[g.s]}</b>${g.brs.map(x => x.ls.map(l => `<div class="mline"><input type="checkbox" ${withIds ? `data-sel="${l.id}"` : ""} ${S.sel.includes(l.id) ? "checked" : ""}><span class="pimg"></span>
      <div><div style="font-size:13.5px">${PROD[l.p].n}</div><div class="small"><b>${som(PROD[l.p].p * l.q)}</b> · ${l.q} шт.</div>${shipLine(l, true).replace('data-chg="', withIds ? 'data-chg="' : 'data-x="')}</div></div>`).join("")).join("")}</div>`).join("");
  const sum = cs.ls.reduce((a, l) => a + PROD[l.p].p * l.q, 0);
  const warn = cs.st === "mixed" ? `<div class="alert w" style="margin-bottom:8px"><span class="ic">!</span><div>Товары из разных филиалов нельзя оформить одним заказом. Выберите товары одного филиала или перенесите их в один филиал.${cs.move ? `<div class="mt8">Все товары есть в филиале «${BR[cs.move].n}». Отправить всё оттуда? <button class="btn soft sm" ${withIds ? `id="move" data-to="${cs.move}"` : ""}>Перенести</button></div>` : ""}</div></div>` : "";
  const bar = `<div class="botbar">${warn}<button class="btn pri" style="width:100%;justify-content:center" ${withIds ? 'id="mCk"' : ""} ${cs.st === "ok" ? "" : "disabled"}>Оформить заказ · ${som(sum)}</button></div>`;
  return { body, bar };
}
function phones() {
  const a = mCart(true), b = mCart(false);
  const l = lineById(S.sheet);
  const sheet = `<div class="dim"></div><div class="sheet" style="z-index:5"><h3 style="margin:0 0 4px">Выберите филиал</h3><div class="small muted">${PROD[l.p].n} · ${l.q} шт.</div><div class="blist mt8">${pickerRows(l)}</div></div>`;
  const t = ckTotals();
  const ckBody = `<div class="card"><div class="small muted">Адрес доставки</div><b>${S.addr ? ADDRS[S.addr].t : "—"}</b></div>
    <div class="card mt8"><b>${SELLERS.to}</b><div class="ship">${ICON.store}<span>Отправка из: <b>${BR[S.ck.br].n}</b></span></div><div class="small muted mt8">${t.ls.length} ${plural(t.ls.length)} · ${som(t.goods)}</div></div>
    <div class="card mt8"><b>Способ доставки</b>${methods().map(m => mTile(m, true)).join("")}</div>`;
  const ckBar = `<div class="botbar"><div class="row" style="justify-content:space-between"><span class="small">Доставка</span><b class="small">${t.m ? (t.m.k === "sd" ? "Бесплатно" : som(t.m.price)) : "—"}</b></div>
    <div class="row" style="justify-content:space-between;margin-bottom:8px"><b>Итого</b><b>${som(t.total)}</b></div><button class="btn pri" style="width:100%;justify-content:center" id="pay" ${t.m ? "" : "disabled"}>Оплатить</button>${t.m ? "" : '<p class="small muted mt8">Выберите способ доставки</p>'}</div>`;
  return `<div class="buyer" style="background:var(--bg)"><div class="phones">
    <div class="pcol"><span class="cap">1 · Корзина: «Отправка из» у каждой строки</span>${phoneShell("Корзина", a.body, a.bar, "cart")}</div>
    <div class="pcol"><span class="cap">2 · «Изменить» → выбор филиала</span>${phoneShell("Корзина", b.body, sheet, "cart")}</div>
    <div class="pcol"><span class="cap">3 · Оформление: способы доставки</span>${phoneShell("Оформление заказа", ckBody, ckBar, "cart")}</div></div></div>`;
}

// ---------- render and events ----------
function render() {
  $("#app").innerHTML = S.view === "checkout" ? checkout() : S.view === "paylov" ? paylov() : S.view === "phones" ? phones() : cart();
  bind();
  if (S.view === "paylov") startCountdown();
}
function bind() {
  const on = (id, f) => { const e = $("#" + id); if (e) e.onclick = f; };
  on("hdraddr", e => { e.preventDefault(); if (S.view === "cart") hdrPicker(); });
  document.querySelectorAll("[data-sel]").forEach(x => x.onchange = () => { const id = x.dataset.sel; S.sel = x.checked ? S.sel.concat(id) : S.sel.filter(i => i !== id); S.alert = ""; render(); });
  document.querySelectorAll("[data-chg]").forEach(x => x.onclick = () => { if (S.view === "phones") { S.sheet = x.dataset.chg; return render(); } openPicker(x.dataset.chg); });
  document.querySelectorAll(".phone [data-pick]").forEach(x => x.onclick = () => { const l = lineById(S.sheet); l.br = x.dataset.pick; l.manual = true; render(); toast("Филиал строки изменён"); });
  on("move", e => { const to = e.currentTarget.dataset.to; cartState().ls.forEach(l => { l.br = to; l.manual = true; }); render(); toast(`Товары перенесены в «${BR[to].n}»`); });
  on("toCheckout", () => { S.view = "checkout"; S.priceMsg = false; S.bump = 0; startCheckout(S.sel); render(); window.scrollTo(0, 0); });
  on("mCk", () => toast("Открывается оформление заказа (экран 3)"));
  on("backCart", () => { S.view = "cart"; render(); });
  document.querySelectorAll("[data-addr]").forEach(x => x.onclick = () => { S.addr = x.dataset.addr; if (!methods().find(m => m.k === S.method && m.ok)) S.method = defMethod(); render(); });
  document.querySelectorAll("[data-m]").forEach(x => x.onclick = () => { S.method = x.dataset.m; render(); });
  on("addAddr", () => { S.saved = ["tash"]; S.addr = "tash"; S.hdr = "tash"; if (!S.method) S.method = defMethod(); render(); toast("Адрес добавлен: " + ADDRS.tash.t); });
  on("swHeavy", () => { S.heavySw = !S.heavySw; S.fargoLogin = S.heavySw; S.heavy = S.heavySw; render(); });
  on("swNone", () => { S.puOff = !S.puOff; if (S.method === "pu" && S.puOff) S.method = null; render(); });
  on("pay", () => { if (S.view === "phones") return toast("Переход к оплате (Paylov)…"); pay(); });
  on("payOk", () => { clearInterval(cdTimer); const tot = ckTotals().total; S.orders = tot; S.lines = S.lines.filter(l => !S.ck.ids.includes(l.id)); S.sel = []; S.view = "cart";
    S.demo = `демо: Paylov подтвердил оплату (Perform) в 14:12 → создан заказ №${ORDER_NO} в статусе «Оформлен». Оплаченные строки из «Филиал Чиланзар» удалены из корзины; строка, которая не была в заказе, осталась.`;
    render(); window.scrollTo(0, 0); toast(`Заказ №${ORDER_NO} создан, статус «Оформлен»`); });
  on("payLate", () => { clearInterval(cdTimer); S.orders = 0; S.view = "cart"; S.sel = S.ck.ids.slice(); S.alert = "Время на оплату истекло. Оформите заказ ещё раз.";
    S.demo = "демо: оплата в 14:26, через 21 минуту после «Оплатить» (14:05). Paylov Check отказал: попытка оплаты истекла. Заказа нет, строки корзины на месте, резерв товара и промокода сняты."; render(); window.scrollTo(0, 0); toast("Paylov: платёж отклонён"); });
  on("openOrders", ordersModal);
}

const SRC_CART = "PRD 4.3.1, OL-B1 – OL-B3, OL-P13, C1 – C5 · cart (website) not designed for branches; app picker exists (DR-OL3)";
const SRC_CK = "PRD 4.3.2, 4.8, OL-B4, C6 – C8, E-OL4 · checkout design shows five tiles with BTS (DR-OL2)";
harness({ title: "P-OL1 Cart and checkout: branch, method, price", stories: "US-BF-5.1-02 · US-BF-5.3-01/02", version: "1.0" }, [
  { label: "Cart: the branch each line ships from", apply: () => reset(),
    notes: ["US-BF-5.1-02. The cart is grouped by seller and then by branch; every line shows «Отправка из: {branch}» (M-OL2) with «Изменить» and a checkbox (OL-B1).",
      "Header address Самарканд: the fridge and the freezer ship from «Филиал Самарканд», the nearest branch of ТехноОпт with the full quantity, marked «ближайший» (example C1, OL-P13). Distances are never shown as numbers.",
      "The air conditioners (10 шт.) cannot ship from Samarkand (only 3 there), so they get the nearest branch with 10: «Склад Сергели».",
      "«Оформить заказ» checks out only the ticked lines of one branch. Tick the air conditioners to see the mixed-branch block; click the header address and pick Tashkent to see every untouched line re-suggested from Chilanzar."], src: SRC_CART },
  { label: "Branch picker: only branches with the full quantity", apply: () => { reset(); openPicker("l3"); },
    notes: ["US-BF-5.1-02. «Изменить» on the air conditioners opens «Выберите филиал» (M-OL3) with the branches of ТехноОпт only; «Холод Сервис» branches never appear (OL-B3).",
      "«Филиал Самарканд» has 3 of the 10: «Здесь только 3 шт.» (M-OL4), greyed and not clickable (example C5). Available branches come first, then the nearest.",
      "Pick «Филиал Чиланзар»: the line moves to a new Chilanzar block in the cart and loses the «ближайший» hint.",
      "A branch with none in stock shows «Нет в наличии» instead of «Здесь только 0 шт.» (proposed wording, from E-OL3)."], src: SRC_CART },
  { label: "Mixed branches: checkout blocked", apply: () => reset({ sel: ["l2", "l3"], stockOv: [["ac", "ch", 6]] }),
    notes: ["US-BF-5.1-02. Two ticked lines ship from two branches (freezer from Samarkand, air conditioners from Sergeli): «Оформить заказ» is disabled and M-OL1 is shown (OL-B2).",
      "No branch stocks both in full (Chilanzar has only 6 air conditioners), so M-OL5 is not offered (example C2).",
      "Untick either line: the block disappears and the other line can be checked out alone. Each branch is a separate order and payment."], src: "PRD 4.3.1, OL-B2, C2, M-OL1" },
  { label: "Mixed branches: move everything to one branch ⚑", apply: () => reset({ sel: ["l2", "l3"] }),
    notes: ["US-BF-5.1-02. Same selection, but «Филиал Чиланзар» stocks both lines in full: under M-OL1 the cart offers M-OL5 «Все товары есть в филиале «Филиал Чиланзар». Отправить всё оттуда?» with [Перенести] (example C3). ⚑ M-OL5 is a proposal (AS-OL6).",
      "Click «Перенести»: both ticked lines move to Chilanzar, the block disappears and «Оформить заказ» is enabled. Unticked lines are not moved.",
      "When several branches stock everything, the nearest one to the header address is offered."], src: "PRD 4.3.1, OL-B2, C3, M-OL5 ⚑ AS-OL6" },
  { label: "Checkout: four methods, the default and greyed reasons", apply: () => reset({ view: "checkout" }),
    notes: ["US-BF-5.3-01, US-BF-5.3-02. Lines of one branch (Филиал Самарканд) to «Самарканд, ул. Регистан, 5». Methods in the fixed order Самовывоз · Доставка продавцом · Yandex Go · Fargo, no BTS (OL-B4).",
      "Each method shows its price and expected date (4.8, M-OL22): seller delivery «Ожидается до 29.10.2026», Fargo 3–5 days outside Tashkent, pickup no date. Yandex Go is greyed with «Yandex Go доставляет только по Ташкенту».",
      "Default (example C7): the previous order used Yandex Go, which is not available here, so the cheapest available delivery to the address is preselected: free seller delivery.",
      "Choose Fargo: «Доставка» and «Итого» update. Pick the Tashkent address: seller delivery greys out (M-SD2), the default falls to Fargo 60 000 сум (E-OL4)."], src: SRC_CK },
  { label: "Fargo greyed: no Fargo login or over 1 000 kg", apply: () => reset({ view: "checkout", hdr: "tash", prev: "fa", fargoLogin: false, sw: "fargo" }),
    notes: ["US-BF-5.3-01. The seller has no Fargo login: Fargo is greyed with «Продавец не отправляет через Fargo» (M-OL6, example C6). Pickup, seller delivery and Yandex Go are unaffected.",
      "Turn on the demo switch: the seller has a login but the order weighs 1 240 kg, so Fargo shows «Слишком тяжёлый заказ для Fargo (более 1 000 кг)» (M-OL7).",
      "The previous method was Fargo; it is not available, so the default falls to the cheapest available delivery: free seller delivery (E-OL4)."], src: "PRD 4.3.2, OL-S7, M-OL6, M-OL7, C6" },
  { label: "No address and no previous method", apply: () => reset({ view: "checkout", hdr: null, saved: [], prev: null, sw: "none" }),
    notes: ["US-BF-5.3-01. No delivery address and no previous order: nothing is preselected. The three delivery methods are greyed with «Добавьте адрес доставки»; pickup can be chosen. «Оплатить» is disabled until a method is chosen.",
      "Click «Добавить адрес»: the Tashkent address is added and the default rule applies (cheapest available delivery).",
      "Demo switch «ни один способ не доступен»: pickup is off at this branch too, so every method is greyed with its reason and «Оплатить» stays disabled (4.3.2)."], src: "PRD 4.3.2 · no-address state not designed" },
  { label: "Previous method preselected (pickup)", apply: () => reset({ view: "checkout", hdr: "tash", prev: "pu" }),
    notes: ["US-BF-5.3-01. The buyer's previous order used pickup and «Филиал Чиланзар» has pickup on: «Самовывоз» is preselected and «Доставка» is 0 сум (example C8).",
      "Pickup is preselected only when it was the previous method or when the seller offers no delivery method for this order at all; otherwise the cheapest available delivery is the default, and if every delivery method is greyed nothing is preselected.",
      "Pickup shows no expected date at checkout; the ready date comes later from the seller (4.8)."], src: "PRD 4.3.2, 4.8, C8" },
  { label: "Price older than 30 minutes ⚑", apply: () => reset({ view: "checkout", hdr: "tash", prev: "fa", stale: true, sw: "stale" }),
    notes: ["US-BF-5.3-02. Checkout opened at 14:00 with Fargo 30 000 сум (previous method, preselected). The buyer presses «Оплатить» at 14:40: the price is older than 30 minutes, so the platform prices again before Paylov (OL-B5, BR-OL18).",
      "Fargo is now 32 000 сум: the alert M-OL8 appears, the old price is struck through and the new total is shown; the buyer is not sent to Paylov yet (example C9). ⚑ the 30 minutes are a proposal (OQ-OL19).",
      "Press «Оплатить» again: the buyer goes on to Paylov with the new total. If the total had not changed, the first press would go straight on."], src: "PRD 4.3.3, OL-B5, BR-OL18, M-OL8, C9 ⚑ OQ-OL19" },
  { label: "Payment window: 20 minutes from «Оплатить» ⚑", apply: () => reset({ view: "checkout", hdr: "tash", prev: "fa", sel: ["l1", "l2"] }) || (S.view = "paylov", render()),
    notes: ["US-BF-5.3-02. «Оплатить» created a payment attempt (stock and promo held) and started the 20-minute window; the Paylov page counts down from 20:00 (demo timer). No order exists yet (OL-B6). ⚑ payment attempt proposed (OQ-OL33).",
      "«Оплатить вовремя»: Perform creates order №68726512 in «Оформлен»; the paid lines of «Филиал Чиланзар» disappear from the cart, the unticked air conditioners stay. «демо: открыть «Заказы»» shows it under «Активные».",
      "«демо: оплатить через 21 минуту»: Paylov Check refuses the expired attempt, the buyer is back in the cart with the lines still there and «Время на оплату истекло. Оформите заказ ещё раз.» (new text T1, proposed); «Заказы» is empty (example C10)."], src: "PRD 4.3.3, OL-B6, C10, PaymentAttempt ⚑ OQ-OL33 · Paylov page is external" },
  { label: "Buyer app: cart and checkout", apply: () => { reset({ view: "phones", sheet: "l3" }); },
    notes: ["US-BF-5.1-02, US-BF-5.3-01. Screen 1: each cart line shows «Отправка из» with «Изменить»; the checkbox and M-OL1 / M-OL5 behave as on the website (tick the air conditioners).",
      "Screen 2: the bottom sheet «Выберите филиал» keeps today's per-line picker but lists only branches of this seller; Samarkand is disabled with «Здесь только 3 шт.» (DR-OL3). Tap Chilanzar to change the line on screens 1 and 2.",
      "Screen 3: checkout method list with Yandex Go greyed and seller delivery preselected by the default rule (C7)."], src: "PRD 4.3.1, 4.3.2, DR-OL2, DR-OL3" },
]);
