// P-OL2 Order pages: buyer and seller (order lifecycle). Example data only.
const NO = "68726458";
const SELLER = "ТехноОпт", BR = "Филиал Чиланзар", BR_ADDR = "Ташкент, Чиланзарский р-н, ул. Бунёдкор, 12";
const BADDR = "Ташкент, Юнусабад, 4-й квартал, 21";
const ME = "Николаев А. Д.";
const ITEMS = [["Смартфон Samsung Galaxy A15, 128 ГБ", 5, 1850000], ["Чехол силиконовый для Galaxy A15", 50, 25000]];
const GOODS = ITEMS.reduce((a, i) => a + i[1] * i[2], 0);
const QTY = ITEMS.reduce((a, i) => a + i[1], 0);
const MPRICE = { pu: 0, sd: 0, yg: 45000, fargo: 38000 };
const MTXT = { pu: "Самовывоз", sd: "Доставка продавцом", yg: "Yandex Go", fargo: "Fargo" };
const MLOGO = { pu: "⌂ Самовывоз", sd: "🚚 Доставка продавцом", yg: YG, fargo: FARGO };
const CANC = [41, 42, 45, 46, 47, 48, 50], PROB = [24, 26, 55, 60];
// Seller labels (PRD 4.2, 13.2)
const SL = { 16: ["Новый", "g"], 20: ["Подтверждён", "b"], 25: ["В обработке", "b"], 32: ["Готов к выдаче", "v"], 30: ["В доставке", "v"], 35: ["Доставлен", "n"], 40: ["Завершён", "n"],
  24: ["Доставка приостановлена", "a"], 26: ["Возвращается к вам", "a"], 55: ["Служба доставки не приняла заказ", "a"], 60: ["Ошибка доставки", "a"],
  41: ["Отменён покупателем", "r"], 42: ["Не подтверждён за 24 ч", "r"], 45: ["Отменён вами", "r"], 46: ["Отменён Optom", "r"], 48: ["Не забран / отказ", "r"], 50: ["Вернулся к вам", "r"], 47: ["Не оплачен", "n"] };
const pill = (l, c) => `<span class="pill ${c}">${l}</span>`;
const spill = st => pill(SL[st][0], SL[st][1]);
let S = {};
function reset(o) {
  closeModal();
  S = Object.assign({ view: "border", o: null, menu: false, err: "", flash: "", sheet: false, tab: "", race: false, fRefuse: false, fCancelRefuse: false, recent: false, alt: false }, o || {});
  render(); if (S.open) S.open();
}
function render() {
  const v = S.view;
  $("#app").innerHTML = v === "border" ? bPage() : v === "blist" ? bList() : v === "slist" ? sList() : v === "sorder" ? sPage() : bApp();
  bind();
}

// ================= BUYER =================
function BO(o) { return Object.assign({ no: NO, m: "yg", st: 16, max: 0, paid: "27.10.2026 в 09:15", exp: "Ожидается 27.10.2026 – 28.10.2026", cancel: null, problem: "", deliv: "", due: "29.10.2026", done: "", paused: false, log: [] }, o); }
function header() {
  return `<div class="strip"><span>➤ ${BADDR}</span><span><span>О компании</span><span>Связаться с нами</span><span>Доставка и оплата</span></span></div>
  <div class="bh">${LOGO}<button class="btn pri">☰ Каталог</button><div class="srch"><input placeholder="Что вы ищете?"><button>Найти</button></div><span class="small">Русский · Избранное · Корзина · <b>Профиль</b></span></div>`;
}
const isC = o => CANC.includes(o.st), isP = o => PROB.includes(o.st);
const bTab = o => isC(o) ? "Отменённые" : (o.st === 35 || o.st === 40) ? "Завершенные" : "Активные";
const doneWord = o => o.m === "pu" ? "Получен" : "Доставлен";
function bSteps(o) {
  const L = o.m === "pu" ? ["Оформлен", "Собирается", "Готов к выдаче", "Получен"] : ["Оформлен", "Собирается", "В пути", "Доставлен"];
  const I = o.m === "pu" ? ["▤", "▢", "⌂", "✓"] : ["▤", "▢", "⛟", "✓"];
  return `<div class="steps">${L.map((t, k) => `<div class="step ${k <= o.max ? "on" : ""}"><div class="dot">${I[k]}</div>${t}</div>`).join("")}</div>`;
}
// The stage, or the block that replaces it (cancelled, delivery problem). Never says who cancelled (BR-OL19).
function bStage(o) {
  if (o.cancel) return `<div class="o2state"><div class="ic">✕</div><div><div class="lbl">Отменён</div><div class="tx"><b>${o.cancel.own ? "Вы отменили заказ" : "Заказ отменён"}</b>${o.cancel.reason ? `<div>${o.cancel.reason}</div>` : ""}${o.cancel.comment ? `<div>Комментарий: ${esc(o.cancel.comment)}</div>` : ""}</div></div></div>`;
  if (o.problem) return `<div class="o2state"><div class="ic">!</div><div><div class="lbl">Проблема с доставкой</div><div class="tx">Проблема с доставкой: ${o.problem}. Мы разбираемся и сообщим вам.</div></div></div>`;
  return bSteps(o);
}
function bDate(o) {
  if (o.cancel) return "";
  if (o.st === 35 || o.st === 40) return `<span class="o2date">${ICON.cal}${doneWord(o)} ${o.deliv}</span>`;
  return `<span class="o2date">${ICON.cal}${o.exp}</span>`;
}
function bActions(o, mob) {
  const full = mob ? " o2full" : "";
  if (o.cancel) return "";
  if ([16, 20, 25].includes(o.st) && o.m === "fargo") return `<div class="alert i mt12"><span class="ic">i</span><div>Заказ с доставкой Fargo нельзя отменить после оплаты. Если что-то не так, напишите продавцу в чат.<div class="mt8"><a href="#" id="chat">Написать продавцу</a></div></div></div>`;
  if (o.st === 16) return `<div class="o2acts"><button class="btn dan sm${full}" id="bcancel">Отменить заказ</button></div>`;
  if (o.st === 35) return `<div class="o2acts">${o.paused ? "" : `<button class="btn pri${full}" id="recv">Я получил заказ</button>`}<button class="btn out${full}" id="review">Оставить отзыв</button></div>
    <p class="hint mt8">${o.paused ? "Автозавершение приостановлено, пока мы разбираемся с заказом." : `Заказ завершится автоматически ${o.due} в 23:59.`}</p>`;
  if (o.st === 40) return `<div class="alert s mt12"><span class="ic">✓</span><div><b>Завершён ${o.done}</b></div></div><div class="o2acts"><button class="btn out${full}" id="review">Оставить отзыв</button></div>`;
  return "";
}
function bWhere(o) {
  const pu = o.m === "pu";
  return `<div class="kv">${ICON.store}<div><span class="k">Продавец:</span> <b>${SELLER}</b> · ${BR}<div class="small muted">${BR_ADDR}</div></div></div>
    <div class="kv">${ICON.pin}<div><span class="k">${pu ? "Пункт самовывоза:" : "Адрес доставки:"}</span> ${pu ? BR + ", " + BR_ADDR : BADDR}</div></div>`;
}
function bTrack(o, mob) {
  const fargo16 = [16, 20, 25].includes(o.st) && o.m === "fargo";
  return `<div class="track"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><b>${MLOGO[o.m]} · ${o.m === "pu" || o.m === "sd" ? "0 сум" : som(MPRICE[o.m])}</b>${bDate(o)}</div>
    ${S.flash ? `<div class="alert e mt12"><span class="ic">!</span><div>${S.flash}</div></div>` : ""}${bActions(o, mob)}
    <div class="mt12" style="border-top:1px solid var(--line);padding-top:4px">${bWhere(o)}</div>
    ${fargo16 ? "" : `<button class="btn soft sm mt8" id="chat">${ICON.chat.replace("<svg", '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"')} Написать продавцу</button>`}</div>`;
}
function bItems(o) {
  return `<div class="blk mt16"><h2>Товары${isC(o) ? ' <span class="small muted" style="font-weight:400">· как в заказе</span>' : ""}</h2>${ITEMS.map(i => `<div class="o2line"><span class="thumb"></span><div>${i[0]}<div class="small muted">${i[1]} шт. × ${som(i[2])}</div></div><b>${som(i[1] * i[2])}</b></div>`).join("")}</div>`;
}
function bLog(o) {
  return `<div class="blk"><h2>История заказа</h2><div class="timeline">${o.log.map(([t, x]) => `<div class="it"><span class="d">•</span><div>${x}<small>${t}</small></div></div>`).join("")}</div></div>`;
}
function bSum(o) {
  const d = MPRICE[o.m];
  return `<div class="sumc"><h3 style="margin:0 0 8px">Ваш заказ</h3><div class="ln">${ITEMS.length} товара · ${QTY} шт.<b>${som(GOODS)}</b></div><div class="ln">Доставка<b>${d ? som(d) : "0 сум"}</b></div>
    <div class="tot"><span>Итого</span><span>${som(GOODS + d)}</span></div><p class="small muted mt12">Оплачен ${o.paid} · Paylov</p></div>`;
}
function bPage() {
  const o = S.o;
  return `<div class="buyer">${header()}<div class="wrapb"><div class="small muted">Главная › Мои заказы › ${bTab(o)}</div>
    <h1 style="font-size:28px;margin:8px 0 2px">Заказ №${o.no}</h1><div class="small muted" style="margin-bottom:16px">от ${o.paid}</div>
    <div class="oc"><div>${bStage(o)}${bTrack(o)}${S.demo ? `<div class="o2demo">${S.demo()}</div>` : ""}${bItems(o)}${bLog(o)}</div>${bSum(o)}</div></div></div>`;
}
function bApp() {
  const o = S.o;
  const sheet = S.sheet ? `<div class="o2dim"></div><div class="sheet"><h3 style="margin:0 0 6px">Подтвердить получение заказа №${o.no}?</h3><p class="sub">Заказ будет завершён.</p>
    <button class="btn pri big" id="ayes" style="width:100%">Подтвердить</button><button class="btn out o2full mt8" id="ano" style="width:100%">Не сейчас</button></div>` : "";
  return `<div class="phonewrap"><div class="phone"><div class="sb"><span>9:41</span><span>▮▮▮ ◔</span></div><div class="ah"><span>‹</span><b>Заказ №${o.no}</b></div>
    <div class="pc" style="padding-bottom:80px"><div class="card">${bStage(o)}<div class="mt12">${bDate(o)}</div>${bActions(o, true)}</div>
    <div class="card"><b>${MLOGO[o.m]} · ${som(MPRICE[o.m])}</b>${bWhere(o)}</div>
    <div class="card"><b>Товары</b>${ITEMS.map(i => `<div class="o2line" style="grid-template-columns:40px 1fr"><span class="thumb"></span><div>${i[0]}<div class="small muted">${i[1]} шт. × ${som(i[2])}</div></div></div>`).join("")}
      <div class="row mt8" style="justify-content:space-between"><b>Итого</b><b>${som(GOODS + MPRICE[o.m])}</b></div></div></div>
    <div class="tabbar"><span>Главная</span><span>Каталог</span><span>Корзина</span><span class="on">Заказы</span><span>Профиль</span></div>${sheet}</div></div>`;
}
// ----- buyer order list -----
const BROWS = {
  "Активные": [["68726458", "27.10.2026", "yg", ["Оформлен", "n"], "Ожидается 27.10.2026 – 28.10.2026", 0], ["68726391", "26.10.2026", "sd", ["Собирается", "b"], "Ожидается до 29.10.2026"],
    ["68726305", "25.10.2026", "fargo", ["В пути", "v"], "Ожидается 26.10.2026 – 28.10.2026", 5], ["68726277", "24.10.2026", "fargo", ["Проблема с доставкой", "r"], "Ожидается 25.10.2026 – 27.10.2026", 6]],
  "Завершенные": [["68726190", "26.10.2026", "yg", ["Доставлен", "g"], "Доставлен 26.10.2026", 7], ["68726233", "25.10.2026", "pu", ["Получен", "g"], "Получен 26.10.2026"], ["68725984", "21.10.2026", "fargo", ["Доставлен", "g"], "Завершён 24.10.2026", 8]],
  "Отменённые": [["68726412", "27.10.2026", "yg", ["Отменён", "r"], "", 3], ["68726120", "26.10.2026", "yg", ["Отменён", "r"], "", 4], ["68725877", "25.10.2026", "fargo", ["Отменён", "r"], ""], ["68719033", "03.10.2026", "fargo", ["Отменён", "r"], ""]] };
function bList() {
  const t = S.tab || "Активные", rows = BROWS[t];
  return `<div class="buyer">${header()}<div class="wrapb"><div class="small muted">Главная › Мои заказы</div><h1 style="font-size:28px;margin:8px 0 10px">Мои заказы</h1>
    <div class="o2tabs">${Object.keys(BROWS).map(k => `<span class="o2tab ${k === t ? "on" : ""}" data-tab="${k}">${k}<span class="c">${BROWS[k].length}</span></span>`).join("")}</div>
    <table class="t"><thead><tr><th>Заказ</th><th>Продавец</th><th>Способ получения</th><th>Статус</th><th>Срок</th><th style="text-align:right">Сумма</th></tr></thead><tbody>
    ${rows.map(r => `<tr class="${r[5] !== undefined ? "o2go" : ""}" ${r[5] !== undefined ? `data-go="${r[5]}"` : ""}><td><b>№${r[0]}</b><div class="small muted">от ${r[1]}</div></td><td>${SELLER}<div class="small muted">${BR}</div></td><td>${MTXT[r[2]]}</td><td>${pill(r[3][0], r[3][1])}</td><td class="small">${r[4] || "—"}</td><td style="text-align:right"><b>${som(GOODS + MPRICE[r[2]])}</b></td></tr>`).join("")}</tbody></table>
    <p class="hint mt12">Строки со ссылкой открывают соответствующий сценарий прототипа.</p></div></div>`;
}

// ================= SELLER =================
function SO(o) { return Object.assign({ no: NO, m: "fargo", st: 16, buyer: "Азизбек Хамидов", phone: "+998 90 222 02 20", paid: "26.10.2026 16:42", deadline: "27.10.2026 16:42", left: "Осталось 5 ч 12 мин", red: false, expired: false, exp: "27.10.2026 – 29.10.2026", deliv: "", due: "", cancel: null, problem: "", canDeliver: false, whyNot: "", hist: [], chat: "" }, o); }
const NOW = "27.10.2026 11:30";
const HI = (t, x) => Object.assign({ t }, x);
function sHist(o) {
  const src = { "действие": "", "задание": "job", "событие службы доставки": "ev", "исправление": "cor" };
  return `<div class="o2hist">${o.hist.map(h => {
    const main = h.corr ? `<b>${SL[h.st][0]}</b> — установил ${ME}: ${esc(h.cm)}`
      : `${h.st ? pill(SL[h.st][0], SL[h.st][1]) + " " : ""}${h.ev ? `<span>${h.ev}</span>` : ""}`;
    return `<div class="it"><div class="tm">${h.t}</div><div><div>${main}</div><div class="meta">${h.who} · <span class="o2src ${src[h.src]}">${h.src}</span></div>${h.cm && !h.corr ? `<div class="cm">Комментарий: ${esc(h.cm)}</div>` : ""}</div></div>`;
  }).join("")}</div>`;
}
function sMenu(o) {
  if (!["fargo", "yg"].includes(o.m) || ![30, 35].includes(o.st)) return "";
  let items = "", why = "";
  if (o.disputed) why = "Заказ проверяет поддержка Optom.uz.";
  else if (o.st === 30) { if (o.canDeliver) items = `<div class="mi" data-corr="35">Отметить доставленным</div>`; else why = "Отметить доставленным можно, когда ожидаемая дата прошла и служба доставки не присылала событий 24 часа."; }
  else if (o.st === 35) items = `<div class="mi" data-corr="30">Не доставлен</div>`;
  if (!items) return `<div class="mt12"><button class="btn out" disabled>Изменить статус</button><p class="hint mt8">${why}</p></div>`;
  return `<div class="o2mw mt12"><button class="btn out" id="chg">Изменить статус ▾</button>${S.menu ? `<div class="o2menu">${items}</div>` : ""}</div>`;
}
function sCancelBlock(o) {
  const c = o.cancel;
  return `<div class="kv mt8">${ICON.user}<div><span class="k">Кто отменил:</span> ${c.who}</div></div><div class="kv">${ICON.cal}<div><span class="k">Когда:</span> ${c.when}</div></div>
    <div class="kv">${ICON.msg}<div><span class="k">Комментарий:</span> ${c.cm ? esc(c.cm) : "—"}</div></div>`;
}
function sActions(o) {
  const b = (id, cls, t) => `<button class="btn ${cls}" id="${id}">${t}</button>`;
  const err = S.err ? `<div class="alert e mt12"><span class="ic">!</span><div>${S.err}</div></div>` : "";
  const carrier = MTXT[o.m];
  if (o.st === 16) return `<h3>Подтвердите заказ</h3><p class="sub">Подтвердите или отклоните заказ до ${o.deadline}.</p>
    <div class="row mt8"><span class="muted">Осталось на подтверждение:</span><span class="o2left ${o.red ? "red" : ""}">${o.left}</span></div>${err}
    <div class="row mt12">${b("reject", "dan", "Отклонить")}${b("confirm", "pri", "Подтвердить")}</div>
    ${o.expired ? `<div class="o2demo"><button id="job">демо: задание отмены (каждые 5 минут)</button></div>` : o.m === "fargo" ? `<div class="o2demo"><label class="${S.fRefuse ? "on" : ""}"><input type="checkbox" id="frefuse" ${S.fRefuse ? "checked" : ""}>демо: Fargo не принял заказ</label></div>` : ""}`;
  if (o.st === 25) return `<h3>Ждём курьера ${carrier}</h3><p class="sub">Курьер заберёт заказ в филиале. Пока курьер не забрал посылку, вы можете отменить заказ.</p>${err}<div class="row mt12">${b("scancel", "dan", "Отменить заказ")}</div>`;
  if (o.st === 30) return `<h3>Заказ в доставке</h3><p class="sub">Статус меняется по событиям ${carrier}.</p>${sMenu(o)}`;
  if (o.st === 35) return `<h3>Заказ доставлен</h3><p class="sub">Доставлен ${o.deliv}. Заказ завершится, когда покупатель подтвердит получение, или автоматически ${o.due} в 23:59.</p>${sMenu(o)}`;
  if (PROB.includes(o.st)) return `<div class="alert w"><span class="ic">!</span><div><b>${SL[o.st][0]}</b>Проблема с доставкой: ${o.problem}. Поддержка Optom.uz решит, что делать дальше.</div></div>`;
  if (CANC.includes(o.st)) return `<div class="alert e"><span class="ic">!</span><div><b>${SL[o.st][0]}</b>Товары вернулись на остаток филиала.</div></div>${sCancelBlock(o)}`;
  return "";
}
function sPage() {
  const o = S.o, d = MPRICE[o.m];
  return sellerShell("or", `Заказы <span>›</span> <b>№${o.no}</b>`, `<div class="h1">Заказ №${o.no} ${spill(o.st)}</div><div class="og"><div>
    <div class="card">${sActions(o)}${S.pdemo ? `<div class="o2demo">${S.pdemo()}</div>` : ""}</div>
    <div class="card"><h3>Доставка</h3>
      <div class="kv">${ICON.truck}<div><span class="k">Способ:</span> ${MLOGO[o.m]}${o.m === "fargo" ? ' · <span class="small muted">заказ Fargo FG-2610-55831</span>' : ""}</div></div>
      <div class="kv">${ICON.store}<div><span class="k">Филиал отправки:</span> <b>${BR}</b> · ${BR_ADDR}</div></div>
      <div class="kv">${ICON.pin}<div><span class="k">Адрес покупателя:</span> ${BADDR}</div></div>
      <div class="kv">${ICON.cal}<div><span class="k">Ожидается:</span> ${o.exp}${o.overdue && o.st === 30 ? ' <span class="overdue">· прошла</span>' : ""}</div></div>
      <div class="kv">${ICON.user}<div><span class="k">Покупатель:</span> ${o.buyer} · ${o.phone}</div></div></div>
    <div class="card"><h3>Товары</h3>${ITEMS.map(i => `<div class="prod mt8"><span class="thumb"></span><div style="flex:1">${i[0]}<div class="small muted">${i[1]} шт. × ${som(i[2])}</div></div><b>${som(i[1] * i[2])}</b></div>`).join("")}</div>
    <div class="card"><h3>История заказа</h3><p class="sub small" style="margin-bottom:6px">Статусы и события службы доставки, новые сверху. Время ташкентское.</p>${sHist(o)}</div></div>
    <div><div class="card"><h3>Сумма заказа</h3><div class="kv"><div style="flex:1">Товары</div><b>${som(GOODS)}</b></div><div class="kv"><div style="flex:1">Доставка (${MTXT[o.m]})</div><b>${d ? som(d) : "0 сум"}</b></div>
      <div class="kv"><div style="flex:1"><b>Итого</b></div><b>${som(GOODS + d)}</b></div><p class="small muted">Оплачен ${o.paid} · Paylov</p></div>
      ${o.chat ? `<div class="card"><h3>Чат с покупателем</h3><div class="o2chat">${o.chat}<small>${o.buyer} · 27.10.2026 09:40</small></div><button class="btn soft sm mt12">Открыть чат</button></div>` : ""}</div></div>`);
}
// ----- seller order list -----
const SROWS = {
  "Новые": [[NO, "26.10.2026 16:42", "Азизбек Хамидов", 16, "fargo", "27.10.2026 – 29.10.2026", "Осталось 5 ч 12 мин", 0, 11], ["68726470", "26.10.2026 13:05", "ООО «Савдо Плюс»", 16, "yg", "26.10.2026 – 27.10.2026", "Осталось 1 ч 35 мин", 1],
    ["68726495", "27.10.2026 09:20", "ИП Каримов Ш.", 16, "sd", "до 30.10.2026", "Осталось 21 ч 50 мин", 0]],
  "В работе": [["68726331", "26.10.2026 12:10", "ООО «Мега Телеком»", 25, "fargo", "27.10.2026 – 29.10.2026", "", 0, 13], ["68726418", "27.10.2026 08:05", "Дилшод Юсупов", 20, "yg", "27.10.2026 – 28.10.2026"], ["68726377", "25.10.2026 17:30", "ИП Рахимова Н.", 32, "pu", "хранение до 30.10.2026"]],
  "В доставке": [["68726187", "23.10.2026 09:30", "ООО «Савдо Плюс»", 30, "fargo", "24.10.2026 – 26.10.2026", "", 0, 14], ["68726352", "25.10.2026 15:12", "Азизбек Хамидов", 30, "sd", "до 28.10.2026"]],
  "Доставлены": [["68726190", "26.10.2026 10:00", "Отабек Назаров", 35, "yg", "доставлен 26.10.2026", "", 0, 15], ["68726233", "25.10.2026 11:40", "ИП Каримов Ш.", 35, "pu", "получен 26.10.2026"]],
  "Завершены": [["68725984", "21.10.2026 14:20", "ООО «Мега Телеком»", 40, "fargo", "доставлен 22.10.2026"], ["68725911", "20.10.2026 10:05", "Дилшод Юсупов", 40, "sd", "доставлен 21.10.2026"]],
  "Отменены": [["68726412", "27.10.2026 09:15", "Отабек Назаров", 41, "yg", "—", "", 0, 16], ["68726120", "26.10.2026 09:10", "ИП Рахимова Н.", 42, "yg", "—", "", 0, 12], ["68725877", "25.10.2026 10:30", "Азизбек Хамидов", 45, "fargo", "—"],
    ["68725802", "24.10.2026 16:55", "ООО «Савдо Плюс»", 46, "sd", "—"], ["68725790", "20.10.2026 12:00", "ИП Каримов Ш.", 48, "pu", "—"], ["68725655", "18.10.2026 09:45", "Дилшод Юсупов", 50, "fargo", "—"]],
  "Проблемные": [["68726277", "24.10.2026 11:15", "ООО «Мега Телеком»", 24, "fargo", "25.10.2026 – 27.10.2026"], ["68726260", "24.10.2026 10:20", "Отабек Назаров", 26, "yg", "24.10.2026 – 25.10.2026"],
    ["68726249", "26.10.2026 18:02", "ИП Рахимова Н.", 55, "fargo", "27.10.2026 – 29.10.2026"], ["68726238", "26.10.2026 12:30", "Дилшод Юсупов", 60, "yg", "26.10.2026 – 27.10.2026"]] };
const SBR = { "68726470": "Филиал Юнусабад", "68726352": "Филиал Юнусабад", "68725802": "Склад Сергели", "68726238": "Филиал Юнусабад", "68726377": "Склад Сергели" };
function sList() {
  const t = S.tab || "Новые", rows = SROWS[t], isNew = t === "Новые";
  return sellerShell("or", "<b>Заказы</b>", `<div class="h1">Заказы</div><div class="card">
    <div class="o2tabs">${Object.keys(SROWS).map(k => `<span class="o2tab ${k === t ? "on" : ""}" data-tab="${k}">${k}<span class="c ${k === "Проблемные" ? "r" : ""}">${SROWS[k].length}</span></span>`).join("")}</div>
    <table class="t"><thead><tr><th>№ заказа</th><th>Дата</th><th>Покупатель</th><th>Филиал</th><th>Статус</th><th>Способ</th><th>Ожидается</th>${isNew ? "<th>На подтверждение</th>" : ""}</tr></thead><tbody>
    ${rows.map(r => `<tr class="${r[8] !== undefined ? "o2go" : ""}" ${r[8] !== undefined ? `data-go="${r[8]}"` : ""}><td><b>№${r[0]}</b></td><td class="small">${r[1]}</td><td>${r[2]}</td><td class="small">${SBR[r[0]] || BR}</td><td>${spill(r[3])}</td><td>${MTXT[r[4]]}</td><td class="small">${r[5]}</td>${isNew ? `<td><span class="o2left ${r[7] ? "red" : ""}">${r[6]}</span></td>` : ""}</tr>`).join("")}</tbody></table>
    <p class="hint mt12">Строки со ссылкой открывают соответствующий сценарий прототипа.</p></div>`);
}

// ================= dialogs =================
// Cancel / reject dialog: optional comment ≤ 500 (M-OL9, M-OL10, M-OL11)
function commentDialog(opt) {
  const m = modal(`<h3>${opt.title}</h3><div class="field mt12"><label>Комментарий (необязательно) <span class="counter" id="cnt">0/500</span></label><textarea class="inp" id="cm" maxlength="500"></textarea></div>
    ${opt.demo ? `<div class="o2demo">${opt.demo}</div>` : ""}<div class="acts"><button class="btn out" id="no">${opt.no}</button><button class="btn danfill" id="yes">${opt.ok}</button></div>`);
  const ta = $("#cm", m); ta.oninput = () => $("#cnt", m).textContent = ta.value.length + "/500";
  m.querySelectorAll("input[type=checkbox]").forEach(x => x.onchange = () => { S[x.dataset.k] = x.checked; x.parentElement.classList.toggle("on", x.checked); });
  $("#no", m).onclick = closeModal;
  $("#yes", m).onclick = () => { const v = ta.value.trim(); closeModal(); opt.onOk(v); };
}
function bCancelDialog() {
  commentDialog({ title: `Отменить заказ №${S.o.no}?`, ok: "Отменить заказ", no: "Не отменять",
    demo: `<label class="${S.race ? "on" : ""}"><input type="checkbox" data-k="race" ${S.race ? "checked" : ""}>демо: продавец уже подтвердил</label>`,
    onOk: v => {
      if (S.race) { S.race = false; S.o.st = 25; S.o.max = 1; S.o.log.unshift(["27.10.2026 09:31", "Заказ собирается"]); S.flash = "Статус заказа изменился. Обновите страницу."; S.demo = null; render(); return toast("Статус заказа изменился. Обновите страницу."); }
      S.o.st = 41; S.o.cancel = { own: true, comment: v }; S.o.log.unshift(["27.10.2026 09:32", "Вы отменили заказ"]); S.demo = null; render();
    } });
}
function recvDialog() {
  if (S.view === "bapp") { S.sheet = true; return render(); }
  const m = modal(`<h3>Подтвердить получение заказа №${S.o.no}?</h3><p class="sub">Заказ будет завершён.</p><div class="acts"><button class="btn out" id="no">Не сейчас</button><button class="btn pri" id="yes">Подтвердить</button></div>`);
  $("#no", m).onclick = closeModal; $("#yes", m).onclick = () => { closeModal(); complete(); };
}
function complete() { S.sheet = false; S.o.st = 40; S.o.done = "27.10.2026"; S.o.log.unshift(["27.10.2026 11:30", "Заказ завершён"]); S.demo = null; render(); toast("Заказ завершён"); }
function sRejectDialog() {
  commentDialog({ title: `Отклонить заказ №${S.o.no}?`, ok: "Отклонить", no: "Назад",
    onOk: v => { const o = S.o; o.st = 45; o.cancel = { who: `Вы (${ME})`, when: NOW, cm: v }; o.hist.unshift(HI(NOW, { st: 45, who: ME + " · продавец", src: "действие", cm: v })); S.fRefuse = false; render(); toast("Заказ отклонён"); } });
}
function sCancelDialog() {
  commentDialog({ title: `Отменить заказ №${S.o.no}?`, ok: "Отменить заказ", no: "Не отменять",
    demo: `<label class="${S.fCancelRefuse ? "on" : ""}"><input type="checkbox" data-k="fCancelRefuse" ${S.fCancelRefuse ? "checked" : ""}>демо: Fargo отказал</label>`,
    onOk: v => {
      const o = S.o;
      if (S.fCancelRefuse) { S.err = "<b>Этот заказ уже нельзя отменить.</b>Причина от Fargo: Курьер уже забрал посылку"; return render(); }
      S.err = ""; o.hist.unshift(HI(NOW, { st: 45, who: ME + " · продавец", src: "действие", cm: v }));
      o.st = 45; o.cancel = { who: `Вы (${ME})`, when: NOW, cm: v }; render(); toast("Заказ отменён");
    } });
}
function corrDialog(to) {
  const lbl = SL[to][0];
  const m = modal(`<h3>Изменить статус на «${lbl}»?</h3><p class="sub">Используйте, только если служба доставки не обновила заказ.</p>
    <div class="field mt12"><label>Комментарий (обязательно) <span class="counter" id="cnt">0/500</span></label><textarea class="inp" id="cm" maxlength="500"></textarea><span class="err-t" id="e"></span></div>
    <div class="acts"><button class="btn out" id="no">Отмена</button><button class="btn pri" id="yes">Изменить статус</button></div>`);
  const ta = $("#cm", m); ta.oninput = () => { $("#cnt", m).textContent = ta.value.length + "/500"; ta.classList.remove("err"); $("#e", m).textContent = ""; };
  $("#no", m).onclick = closeModal;
  $("#yes", m).onclick = () => {
    const v = ta.value.trim(); if (!v) { ta.classList.add("err"); return $("#e", m).textContent = "Напишите, почему меняете статус."; }
    const o = S.o; closeModal(); S.menu = false;
    o.hist.unshift(HI(NOW, { st: to, who: ME + " · продавец", src: "исправление", cm: v, corr: true }));
    if (to === 35) { o.deliv = "27.10.2026 в 11:30"; o.due = "30.10.2026"; }
    if (to === 30) { o.canDeliver = false; o.disputed = true; }
    o.st = to; S.pdemo = null; render(); toast("Статус изменён");
  };
}

// ================= bind =================
function bind() {
  const on = (id, f) => { const e = $("#" + id); if (e) e.onclick = f; };
  on("bcancel", bCancelDialog); on("recv", recvDialog); on("review", () => toast("Открывается форма отзыва"));
  on("chat", e => { e.preventDefault(); toast("Открывается чат с продавцом"); });
  on("ayes", complete); on("ano", () => { S.sheet = false; render(); });
  document.querySelectorAll("[data-tab]").forEach(x => x.onclick = () => { S.tab = x.dataset.tab; render(); });
  document.querySelectorAll("tr[data-go]").forEach(x => x.onclick = () => go(+x.dataset.go));
  document.querySelectorAll("[data-m]").forEach(x => x.onclick = () => { const m = x.dataset.m; S.o.m = m; S.o.exp = { yg: "Ожидается 27.10.2026 – 28.10.2026", sd: "Ожидается до 29.10.2026", pu: "Продавец готовит заказ" }[m]; render(); });
  document.querySelectorAll("[data-sw]").forEach(x => x.onclick = () => { S.sw(x.dataset.sw); render(); });
  // seller
  on("confirm", () => {
    const o = S.o; if (o.expired) { S.err = "Время на подтверждение истекло. Заказ будет отменён автоматически."; return render(); }
    S.err = "";
    if (o.m === "fargo" && S.fRefuse) { o.st = 55; o.problem = "служба доставки не приняла заказ"; o.hist.unshift(HI(NOW, { ev: "Служба доставки не приняла заказ", who: "Fargo", src: "событие службы доставки" }), HI(NOW, { st: 55, who: ME + " · продавец (ответ Fargo)", src: "действие" })); render(); return toast("Служба доставки не приняла заказ"); }
    o.st = 25; o.hist.unshift(HI("27.10.2026 11:31", { ev: "Ищем курьера", who: "Fargo", src: "событие службы доставки" }), HI(NOW, { st: 25, who: ME + " · продавец", src: "действие" })); render(); toast("Заказ подтверждён");
  });
  on("reject", () => { if (S.o.expired) { S.err = "Время на подтверждение истекло. Заказ будет отменён автоматически."; return render(); } sRejectDialog(); });
  on("job", () => { const o = S.o; o.st = 42; S.err = ""; o.cancel = { who: "Optom.uz (заказ не подтверждён за 24 часа)", when: "27.10.2026 10:05", cm: "" }; o.hist.unshift(HI("27.10.2026 10:05", { st: 42, who: "Optom.uz", src: "задание" })); render(); toast("Задание отменило заказ"); });
  const fr = $("#frefuse"); if (fr) fr.onchange = () => { S.fRefuse = fr.checked; render(); };
  on("scancel", sCancelDialog);
  on("chg", () => { S.menu = !S.menu; render(); });
  document.querySelectorAll("[data-corr]").forEach(x => x.onclick = () => corrDialog(+x.dataset.corr));
}

// ================= scenario data =================
const LOG_PAID = ["27.10.2026 09:15", "Заказ оформлен и оплачен"];
function b16(m) { return BO({ m, log: [LOG_PAID.slice()] }); }
function methodDemo() { return ["yg", "sd", "pu"].map(k => `<button data-m="${k}" class="${S.o.m === k ? "on" : ""}">демо: ${MTXT[k]}</button>`).join(""); }
function otherCancel(k) {
  const base = { m: "yg", st: +k, max: 0, no: "68726120", paid: "26.10.2026 в 09:10", log: [["26.10.2026 09:10", "Заказ оформлен и оплачен"]] };
  const v = {
    42: { cancel: { reason: "Причина: заказ не подтверждён вовремя" }, log: [["27.10.2026 09:12", "Заказ отменён"]] },
    45: { m: "fargo", max: 1, cancel: { comment: "нет в наличии" }, log: [["26.10.2026 15:20", "Заказ отменён"], ["26.10.2026 10:30", "Заказ собирается"]] },
    46: { m: "sd", cancel: {}, log: [["26.10.2026 12:40", "Заказ отменён"]] },
    50: { m: "fargo", max: 2, cancel: { reason: "Причина: посылку не удалось доставить, она вернулась отправителю" }, log: [["27.10.2026 10:15", "Заказ отменён"], ["26.10.2026 18:00", "Проблема с доставкой"], ["26.10.2026 16:30", "Не удалось доставить заказ"], ["26.10.2026 12:05", "Заказ в пути"], ["26.10.2026 10:40", "Заказ собирается"]] } }[k];
  const paidLog = base.log; const o = BO(Object.assign(base, v)); o.log = v.log.concat(paidLog); return o;
}
const CODES = { 42: "42 не подтверждён за 24 ч", 45: "45 продавец, с комментарием", 46: "46 Optom, без комментария", 50: "50 посылка вернулась" };
function b30(early) {
  const all = [["26.10.2026 13:30", "Курьер забрал заказ"], ["26.10.2026 09:10", "Повторная попытка забора"], ["25.10.2026 15:40", "Заказ в пути"], ["25.10.2026 15:40", "Курьер забрал заказ"], ["25.10.2026 11:00", "Заказ собирается"], ["25.10.2026 10:05", "Заказ оформлен и оплачен"]];
  return BO({ no: "68726305", m: "fargo", st: early ? 25 : 30, max: 2, paid: "25.10.2026 в 10:05", exp: "Ожидается 26.10.2026 – 28.10.2026", log: early ? all.slice(1) : all });
}
function b35(o) {
  return BO(Object.assign({ no: "68726190", m: "yg", st: 35, max: 3, paid: "26.10.2026 в 10:00", deliv: "26.10.2026 в 14:00", due: "29.10.2026",
    log: [["26.10.2026 14:00", "Заказ доставлен"], ["26.10.2026 12:35", "Заказ в пути"], ["26.10.2026 11:50", "Заказ собирается"], ["26.10.2026 10:00", "Заказ оформлен и оплачен"]] }, o || {}));
}
function deliveredDemo() {
  return `<label class="${S.o.m === "pu" ? "on" : ""}"><input type="checkbox" data-d="pu" ${S.o.m === "pu" ? "checked" : ""}>демо: самовывоз</label><label class="${S.o.paused ? "on" : ""}"><input type="checkbox" data-d="ret" ${S.o.paused ? "checked" : ""}>демо: открыт запрос на возврат</label>`;
}
document.addEventListener("change", e => {
  const d = e.target.dataset && e.target.dataset.d; if (!d) return;
  if (d === "pu") { S.o.m = e.target.checked ? "pu" : "yg"; S.o.log[0][1] = e.target.checked ? "Заказ получен" : "Заказ доставлен"; S.o.log[1][1] = e.target.checked ? "Заказ готов к выдаче" : "Заказ в пути"; }
  if (d === "ret") S.o.paused = e.target.checked;
  if (d === "recent") { S.o.canDeliver = !e.target.checked; if (e.target.checked) S.o.hist.unshift(RECENT); else S.o.hist = S.o.hist.filter(h => h !== RECENT); S.menu = false; }
  if (d === "alt") { S.alt = e.target.checked; S.o = S.alt ? s45Fargo() : s41(); }
  render();
});
// seller orders
const H16 = (t) => HI(t, { st: 16, who: "Покупатель · оплата Paylov", src: "действие" });
function s16() { return SO({ hist: [H16("26.10.2026 16:42")] }); }
function s25() {
  return SO({ no: "68726331", st: 25, buyer: "ООО «Мега Телеком»", paid: "26.10.2026 12:10", exp: "27.10.2026 – 29.10.2026",
    hist: [HI("26.10.2026 14:05", { ev: "Курьер назначен и едет в филиал", who: "Fargo", src: "событие службы доставки" }), HI("26.10.2026 12:41", { ev: "Ищем курьера", who: "Fargo", src: "событие службы доставки" }),
      HI("26.10.2026 12:40", { st: 25, who: ME + " · продавец", src: "действие" }), H16("26.10.2026 12:10")] });
}
const RECENT = HI("27.10.2026 08:30", { ev: "Заказ на сортировке или в пути", who: "Fargo", src: "событие службы доставки" });
function s30() {
  return SO({ no: "68726187", st: 30, buyer: "ООО «Савдо Плюс»", paid: "23.10.2026 09:30", exp: "24.10.2026 – 26.10.2026", overdue: true, canDeliver: true,
    whyNot: "«Отметить доставленным» станет доступно, когда пройдёт ожидаемая дата и от Fargo не будет событий больше 24 часов. Последнее событие Fargo: 27.10.2026 08:30.",
    hist: [HI("25.10.2026 11:20", { ev: "Курьер везёт заказ к вам", who: "Fargo", src: "событие службы доставки" }), HI("24.10.2026 09:00", { ev: "Заказ на сортировке или в пути", who: "Fargo", src: "событие службы доставки" }),
      HI("23.10.2026 15:00", { st: 30, ev: "Курьер забрал заказ", who: "Fargo", src: "событие службы доставки" }), HI("23.10.2026 10:11", { ev: "Ищем курьера", who: "Fargo", src: "событие службы доставки" }),
      HI("23.10.2026 10:10", { st: 25, who: ME + " · продавец", src: "действие" }), H16("23.10.2026 09:30")] });
}
function s35() {
  return SO({ no: "68726190", m: "yg", st: 35, buyer: "Отабек Назаров", phone: "+998 93 410 45 67", paid: "26.10.2026 10:00", exp: "26.10.2026 – 27.10.2026", deliv: "26.10.2026 в 14:00", due: "29.10.2026",
    chat: "Здравствуйте! Заказ так и не пришёл, курьер не приезжал.",
    hist: [HI("26.10.2026 14:00", { st: 35, ev: "Заказ доставлен", who: "Yandex Go", src: "событие службы доставки" }), HI("26.10.2026 12:35", { st: 30, ev: "Курьер забрал заказ", who: "Yandex Go", src: "событие службы доставки" }),
      HI("26.10.2026 12:05", { ev: "Курьер назначен и едет в филиал", who: "Yandex Go", src: "событие службы доставки" }), HI("26.10.2026 11:58", { st: 25, ev: "Ищем курьера", who: "Yandex Go", src: "событие службы доставки" }),
      HI("26.10.2026 11:50", { st: 20, who: ME + " · продавец", src: "действие" }), H16("26.10.2026 10:00")] });
}
function s41() {
  return SO({ no: "68726412", m: "yg", st: 41, buyer: "Отабек Назаров", paid: "27.10.2026 09:15", exp: "27.10.2026 – 28.10.2026", cancel: { who: "Покупатель", when: "27.10.2026 09:32", cm: "Ошиблись с количеством, оформим заново" },
    hist: [HI("27.10.2026 09:32", { st: 41, who: "Покупатель", src: "действие", cm: "Ошиблись с количеством, оформим заново" }), H16("27.10.2026 09:15")] });
}
function s45Fargo() {
  return SO({ no: "68725877", st: 45, paid: "25.10.2026 10:30", exp: "26.10.2026 – 28.10.2026", cancel: { who: `Вы (${ME})`, when: "26.10.2026 15:20", cm: "нет в наличии" },
    hist: [HI("26.10.2026 15:20", { st: 45, who: ME + " · продавец", src: "действие", cm: "нет в наличии" }),
      HI("26.10.2026 09:40", { ev: "Не удалось забрать заказ у продавца", who: "Fargo", src: "событие службы доставки" }), HI("25.10.2026 14:05", { ev: "Курьер назначен и едет в филиал", who: "Fargo", src: "событие службы доставки" }),
      HI("25.10.2026 10:31", { ev: "Ищем курьера", who: "Fargo", src: "событие службы доставки" }), HI("25.10.2026 10:30", { st: 25, who: ME + " · продавец", src: "действие" }), H16("25.10.2026 10:00")] });
}

harness({ title: "P-OL2 Order pages: buyer and seller", stories: "US-BF-6.5-04/05 · US-BF-6.6-01 · US-SF-5.7-01 · US-SF-5.10-01 · US-BF-6.8-01/02", version: "1.0" }, [
  { label: "Buyer: paid, waiting for the seller (Yandex Go)", apply: () => reset({ o: b16("yg"), demo: methodDemo }),
    notes: ["16: the tracker shows «Оформлен»; the expected date is M-OL22 for Yandex Go, the payment day or the next day: «Ожидается 27.10.2026 – 28.10.2026» (4.8). The branch «Филиал Чиланзар» and the method are shown (US-BF-6.5-04, OL-B7).", "«Отменить заказ» is shown because the seller has not confirmed yet: the buyer may cancel Yandex Go, seller delivery and pickup only in 16 (US-BF-6.6-01, BR-OL7, X2). Click it to open the dialog.", "Demo buttons switch the method: seller delivery shows «Ожидается до {date}», pickup shows M-OL35 «Продавец готовит заказ» and the stage «Готов к выдаче» instead of «В пути». Buyer cancellation in 25 for seller delivery and pickup is still open ⚑ OQ-OL35; this prototype follows 16 only."],
    src: "PRD 4.2, 4.4, 4.8, OL-B7, OL-B9 · M-OL22, M-OL35 · DR-OL4" },
  { label: "Buyer: Fargo order cannot be cancelled", apply: () => reset({ o: BO({ m: "fargo", paid: "26.10.2026 в 15:00", exp: "Ожидается 27.10.2026 – 29.10.2026", log: [["26.10.2026 15:00", "Заказ оформлен и оплачен"]] }), demo: () => [[16, "16 Оформлен"], [25, "25 Собирается"], [30, "30 В пути"]].map(([k, t]) => `<button data-sw="${k}" class="${S.o.st === k ? "on" : ""}">демо: ${t}</button>`).join(""), sw: k => { S.o.st = +k; S.o.max = { 16: 0, 25: 1, 30: 2 }[k]; } }),
    notes: ["Fargo order: no «Отменить заказ»; M-OL12 explains why, with a «Написать продавцу» link to the chat. It is shown in 16, 20 and 25, not from 30 (demo buttons) (US-BF-6.6-01, OL-B9, X1).", "Fargo cannot be cancelled by the buyer even before the seller confirms ⚑ OQ-OL36 (stricter than Yandex Go; management to confirm). A cancel call through the API is refused with M-OL13.", "Expected date: paid 26.10 15:00, branch and buyer in Tashkent → 1–3 days (4.8, AS-OL9 ⚑)."],
    src: "PRD 4.4 (X1), 4.8 · M-OL12, M-OL13" },
  { label: "Buyer: cancel dialog with an optional comment", apply: () => reset({ o: b16("yg"), open: bCancelDialog }),
    notes: ["Title M-OL9, field M-OL10 «Комментарий (необязательно)» with a 0/500 counter (max 500), buttons M-OL11. No reason list (US-BF-6.6-01, OL23, ⚑ OQ-OL34).", "«Отменить заказ» with or without a comment → the own-cancellation state (41, X2).", "Tick «демо: продавец уже подтвердил» and confirm: the first request wins, the buyer sees M-OL33 and the page reloads in «Собирается» without the cancel button (E-OL1, NFR-OL2)."],
    src: "PRD 4.4, E-OL1 · M-OL9, M-OL10, M-OL11, M-OL33 · DR-OL4" },
  { label: "Buyer: own cancellation", apply: () => reset({ o: BO({ no: "68726412", st: 41, cancel: { own: true, comment: "Ошиблись с количеством, оформим заново" }, log: [["27.10.2026 09:32", "Вы отменили заказ"], LOG_PAID.slice()] }), demo: () => `<label class="${S.o.cancel.comment ? "" : "on"}"><input type="checkbox" data-sw="nc" ${S.o.cancel.comment ? "" : "checked"}>демо: без комментария</label>`, sw: () => { S.o.cancel.comment = S.o.cancel.comment ? "" : "Ошиблись с количеством, оформим заново"; } }),
    notes: ["The buyer's own cancellation says «Вы отменили заказ» (M-OL15, AS-OL3) and «Комментарий: …» when one was written (M-OL19) (US-BF-6.6-01).", "The stage tracker is replaced by «Отменён»; the order is in the «Отменённые» tab (US-BF-6.5-04, 4.2).", "The lines keep the ordered quantities (OL-B10, OL10, OL-P12); the stock went back to the branch. The refund is described in the Returns and refunds PRD."],
    src: "PRD 4.2, 4.4 · M-OL15, M-OL19 · OL-B10" },
  { label: "Buyer: cancelled by someone else", apply: () => reset({ o: otherCancel(42), demo: () => Object.keys(CODES).map(k => `<button data-sw="${k}" class="${S.o.st === +k ? "on" : ""}">демо: ${CODES[k]}</button>`).join(""), sw: k => { S.o = otherCancel(k); } }),
    notes: ["Anyone else's cancellation shows «Заказ отменён» (M-OL16) and never who cancelled (US-BF-6.5-04, BR-OL5, BR-OL19, OL-P16).", "Demo switch: 42 → reason M-OL17; 45 with a comment → «Комментарий: нет в наличии» (M-OL19, X5); 46 without a comment → only M-OL16; 50 → reason M-OL18.", "The status codes appear only in the demo switch, never in the buyer UI or the buyer API."],
    src: "PRD 4.2, 4.4 (X5, X8, X10) · M-OL16 – M-OL19" },
  { label: "Buyer: on the way, tracker and activity log", apply: () => reset({ o: b30(false), demo: () => `<label class="${S.o.st === 25 ? "on" : ""}"><input type="checkbox" data-sw="early" ${S.o.st === 25 ? "checked" : ""}>демо: момент 26.10.2026 09:10 (у Fargo снова 25)</label>`, sw: () => { S.o = b30(S.o.st !== 25); } }),
    notes: ["Fargo, 30: the tracker shows «В пути». The activity log, newest first in Tashkent time, has the stage changes and the pickup attempts, including «Повторная попытка забора» (M-OL31) (US-BF-6.5-04, US-BF-6.5-05, OL-B7).", "The carrier moved 30 → 25 → 30 on a new pickup attempt. Tick the demo switch to see the moment the order was back in 25: the tracker still shows «В пути»; it never moves back (OL8, OL-P10, BR-OL13).", "The buyer sees only stage changes and delivery attempts; every other carrier event is for the seller and the admin (4.9)."],
    src: "PRD 4.2, 4.9, OL-P8, OL-P10 · M-OL22, M-OL31 · DR-OL9" },
  { label: "Buyer: delivery problem", apply: () => reset({ o: BO({ no: "68726277", m: "fargo", st: 24, max: 1, problem: "служба доставки приостановила доставку", paid: "24.10.2026 в 11:15", exp: "Ожидается 25.10.2026 – 27.10.2026", log: [["27.10.2026 10:40", "Проблема с доставкой"], ["24.10.2026 12:00", "Заказ собирается"], ["24.10.2026 11:15", "Заказ оформлен и оплачен"]] }) }),
    notes: ["24, 26, 55 and 60 show «Проблема с доставкой» in place of the stage, with M-OL20 and a plain reason from the reason list (here 24 OnHold, Fargo → R7 «служба доставки приостановила доставку») (US-BF-6.5-04, 4.6).", "The order stays in the «Активные» tab (4.2). The admin decides on the problem list (OL6, BR-OL15); when the carrier delivers, the stage moves on (E-OL6).", "The seller sees M-OL21 with the same reason list (R1 – R10)."],
    src: "PRD 4.2, 4.6 · M-OL20" },
  { label: "Buyer: delivered, «Я получил заказ»", apply: () => reset({ o: b35(), demo: deliveredDemo }),
    notes: ["35 delivered 26.10.2026 14:00: stage «Доставлен», «Я получил заказ» (M-OL23) and M-OL25 «Заказ завершится автоматически 29.10.2026 в 23:59.» Day 0 is the delivery day; due at 23:59 on the 3rd calendar day after (US-BF-6.8-01, US-BF-6.8-02, K1, AS-OL4, ⚑ OQ-OL27). «Оставить отзыв» is available from 35 (OL30).", "The button opens M-OL24 with «Подтвердить» · «Не сейчас» (T6); confirm → 40 at once, CompletedBy = Buyer, toast (K3). The «delivered» notice has no button (OQ-79).", "«демо: самовывоз» shows «Получен» instead of «Доставлен» (AS-OL2). «демо: открыт запрос на возврат» replaces the M-OL25 line with «Автозавершение приостановлено, пока мы разбираемся с заказом.» (T2) (4.7, K4, ⚑ OQ-OL29). While a return request or appeal is open, «Я получил заказ» is hidden (US-BF-6.8-01)."],
    src: "PRD 4.7 (K1 – K4), OL-B11 · M-OL23 – M-OL25 · DR-OL5 (not designed)" },
  { label: "Buyer: completed", apply: () => reset({ o: BO({ no: "68725984", m: "fargo", st: 40, max: 3, paid: "21.10.2026 в 14:20", deliv: "22.10.2026 в 11:30", done: "24.10.2026", log: [["24.10.2026 18:10", "Заказ завершён"], ["22.10.2026 11:30", "Заказ доставлен"], ["21.10.2026 17:00", "Заказ в пути"], ["21.10.2026 15:00", "Заказ собирается"], ["21.10.2026 14:20", "Заказ оформлен и оплачен"]] }) }),
    notes: ["40: the tracker stays on «Доставлен» with M-OL26 «Завершён 24.10.2026» (US-BF-6.8-01, US-BF-6.8-02, 4.2).", "No cancel and no «Я получил заказ»; 40 is final (BR-OL10). «Оставить отзыв» stays (OL30).", "The completion date is a past date (24.10.2026) because today is 27.10.2026."],
    src: "PRD 4.2, 4.7 · M-OL26" },
  { label: "Buyer: order list tabs", apply: () => reset({ view: "blist" }),
    notes: ["Tabs «Активные · Завершенные · Отменённые» with counts (US-BF-6.5-04, OL-B8). Active holds 16, 25, 30 and a problem order with the red «Проблема с доставкой»; Завершенные holds 35 and 40 (pickup: «Получен»).", "Отменённые holds every cancellation as «Отменён», including the old order from 03.10.2026 in 47 (E-OL18); no row says who cancelled (BR-OL19).", "Each row shows the expected date (4.8). Rows with a link open the matching scenario of this prototype."],
    src: "PRD 4.2, 4.8, 13.2 · DR-OL8" },
  { label: "Seller: order list tabs", apply: () => reset({ view: "slist" }),
    notes: ["Tabs «Новые · В работе · В доставке · Доставлены · Завершены · Отменены · Проблемные» with counts; each row: №, date, buyer, seller label, method, expected date (US-BF-6.5-04, US-SF-5.10-01, OL-S1).", "«Новые» shows the time left of the 24 hours; under 2 hours in red. «В работе» also holds 20 «Подтверждён» and pickup 32 «Готов к выдаче».", "«Отменены» shows who cancelled: «Отменён покупателем», «Не подтверждён за 24 ч», «Отменён вами», «Отменён Optom», also 48 and 50 (⚑ OQ-OL38). «Проблемные» holds 24, 26, 55, 60 with their seller labels (4.2)."],
    src: "PRD 4.2, 13.2, OL-S1 · DR-OL8" },
  { label: "Seller: new order, confirm or reject", apply: () => reset({ view: "sorder", o: s16() }),
    notes: ["Fargo order in 16: label «Новый» and the time left of the 24 hours (US-SF-5.10-01, OL-S1, OL-S3). «Подтвердить» books Fargo → 25 «В обработке» with a toast and history rows. Pressing it again (double click, second tab) gives no error and returns the current order (NFR-OL4, F-OL2); an action from a stale screen after the status changed gives M-OL33.", "Tick «демо: Fargo не принял заказ» and confirm → 55 «Служба доставки не приняла заказ» with M-OL21; the seller has no action, the admin decides (OL-S8, 4.6).", "«Отклонить» opens a dialog with an optional comment (≤ 500) → 45 «Отменён вами», not 46 (OL-S4, X11, fixes F-OL1). Reject dialog: «Отклонить заказ №{order_no}?», M-OL10, «Отклонить» · «Назад» (T8)."],
    src: "PRD 4.4, 4.6, 6, OL-S3, OL-S4 · M-OL10, M-OL21" },
  { label: "Seller: confirm after the 24-hour deadline", apply: () => reset({ view: "sorder", o: SO({ no: "68726402", m: "yg", buyer: "ИП Рахимова Н.", paid: "26.10.2026 10:00", deadline: "27.10.2026 10:00", left: "Время вышло", red: true, expired: true, exp: "26.10.2026 – 27.10.2026", hist: [H16("26.10.2026 10:00")] }) }),
    notes: ["Paid 26.10 10:00, now 27.10 10:02; the job has not run yet, so the label is still «Новый» and the countdown shows «Время вышло» (US-SF-5.10-01, US-SF-5.7-01).", "«Подтвердить» or «Отклонить» shows M-OL34 and nothing changes (BR-OL20, E-OL7).", "«демо: задание отмены» runs the job (every 5 minutes): → 42 «Не подтверждён за 24 ч», CancelledBy = System, shown to the seller as «Optom.uz», stock back, ORD-07 and SOR-03 (X10, OL-P5, ⚑ 42 is a new status, OQ-OL41)."],
    src: "PRD 4.4 (X10), 7, E-OL7, OL-P5 · M-OL34" },
  { label: "Seller: cancel before pickup; the carrier refuses", apply: () => reset({ view: "sorder", o: s25() }),
    notes: ["Fargo order in 25 «В обработке»: «Отменить заказ» → M-OL9 / M-OL10 (optional comment) / M-OL11. Success → Fargo cancel call → 45 «Отменён вами» with the comment (US-SF-5.7-01, OL-S5, X5).", "Tick «демо: Fargo отказал»: the order stays 25; the seller sees M-OL13 with Fargo's reason translated «Курьер уже забрал посылку»; the order and its history do not change (X6).", "From 30 the seller cannot cancel; the admin cancels in 30 only for seller delivery, or for Fargo / Yandex Go while «Доставка оспорена» is open (US-AF-2.1-03)."],
    src: "PRD 4.4 (X5 – X7), OL-S5 · M-OL9 – M-OL11, M-OL13" },
  { label: "Seller: correction 30 → 35 «Отметить доставленным»", apply: () => reset({ view: "sorder", o: s30(), pdemo: () => `<label class="${S.o.canDeliver ? "" : "on"}"><input type="checkbox" data-d="recent" ${S.o.canDeliver ? "" : "checked"}>демо: событие от Fargo 3 часа назад</label>` }),
    notes: ["Fargo order in 30; the expected 24.10 – 26.10 has passed and the last carrier event was 25.10 11:20, more than 24 hours ago. «Изменить статус» offers only «Отметить доставленным» (US-SF-5.10-01, 4.5, OL-S6, ⚑ OQ-OL37).", "Dialog M-OL27 with a required comment; empty → M-OL28. Saved → 35 «Доставлен», history line M-OL29 «Доставлен — установил Николаев А. Д.: …», source «исправление»; the buyer gets the delivered notice and the 3-day clock starts (K8).", "Tick «демо: событие от Fargo 3 часа назад»: no move is allowed, so «Изменить статус» is disabled and the reason is shown: «Отметить доставленным можно, когда ожидаемая дата прошла и служба доставки не присылала событий 24 часа.» After the correction to 35 the menu offers «Не доставлен»."],
    src: "PRD 4.5, 4.7 (K8), OL-S6 · M-OL27 – M-OL29 · DR-OL6" },
  { label: "Seller: correction 35 → 30 «Не доставлен»", apply: () => reset({ view: "sorder", o: s35() }),
    notes: ["Yandex Go order in 35; the buyer wrote in the chat that nothing arrived. «Изменить статус» → «Не доставлен», required comment → 30 «В доставке» (US-SF-5.10-01, 4.5, Yandex Go BR-Y24).", "After the change «Изменить статус» shows «Заказ проверяет поддержка Optom.uz.»: the seller cannot flip back to 35 while the dispute is open. «Не доставлен» is not offered while a return request is open.", "Effects: the admin problem list gets «Доставка оспорена»; the buyer's stage goes back to «В пути» (the one exception to OL8, BR-OL13); «Я получил заказ» disappears and completion stops; reviews already left stay.", "The buyer notice «Заказ №{order_no} снова в пути» is proposed in section 8 ⚑."],
    src: "PRD 4.2, 4.5, 4.6, 8 · M-OL27 – M-OL29" },
  { label: "Seller: order history with who and why", apply: () => reset({ view: "sorder", o: s41(), pdemo: () => `<label class="${S.alt ? "on" : ""}"><input type="checkbox" data-d="alt" ${S.alt ? "checked" : ""}>демо: заказ Fargo, отменённый после событий доставки</label>` }),
    notes: ["41 «Отменён покупателем»: the cancellation block shows who (Покупатель), when and the comment; the seller sees who cancelled (US-SF-5.7-01, OL-S2, ⚑ OQ-OL38).", "The history lists every status with who and role, the source (действие · задание · событие службы доставки · исправление) and the comment (US-BF-6.5-04, OL-P3).", "A buyer can cancel only in 16, before any courier is booked, so a 41 order has no carrier events. Tick the demo switch to see a 45 Fargo order where the carrier events are merged by time with the statuses as plain Russian sentences (US-BF-6.5-05, 4.9)."],
    src: "PRD 4.2, 4.9, 11 (OrderStatusHistory, OrderEvent), OL-S2" },
  { label: "Buyer app: order page", apply: () => reset({ view: "bapp", o: b35() }),
    notes: ["Buyer app, delivered order: the tracker, «Я получил заказ» (M-OL23) and the auto-complete line M-OL25 (US-BF-6.8-01).", "The button opens a bottom sheet with M-OL24; «Подтвердить» completes the order (40), «Не сейчас» (T6) closes the sheet; the page shows «Завершён 27.10.2026» (M-OL26) with a toast.", "The app has the same rules as the website; the design has no such button (DR-OL5)."],
    src: "PRD 4.7, OL-B11 · M-OL23 – M-OL26 · DR-OL5 (not designed)" },
]);
