// P-OL3 Admin: orders, problems and actions (Order lifecycle PRD 4.1, 4.2, 4.4 – 4.6, 4.9, 5.3)
// ---------- reference data ----------
const MTH = { pu: "Самовывоз", sd: "Доставка продавцом", yg: "Yandex Go", fg: "Fargo" };
const MORD = ["pu", "sd", "yg", "fg"];
// code: [name in code, admin label, buyer stage, pill class]
const ST = {
  16: ["PaymentSuccessWaitingConfirmation", "Новый", "Оформлен", "g"],
  20: ["Confirmed", "Подтверждён", "Собирается", "b"],
  25: ["Processing", "В обработке", "Собирается", "b"],
  30: ["Shipped", "В доставке", "В пути", "v"],
  32: ["ReadyForPickup", "Готов к выдаче", "Готов к выдаче", "v"],
  35: ["Delivered", "Доставлен", "Доставлен", "n"],
  40: ["Success", "Завершён", "Доставлен", "g"],
  24: ["OnHold", "Доставка приостановлена", "Проблема с доставкой", "a"],
  26: ["ReturnInProgress", "Возвращается продавцу", "Проблема с доставкой", "a"],
  55: ["FargoDoesNotAcceptOrder", "Служба доставки не приняла заказ", "Проблема с доставкой", "a"],
  60: ["FargoException", "Ошибка доставки", "Проблема с доставкой", "a"],
  41: ["CancelledPaymentClient", "Отменён покупателем", "Отменён", "r"],
  42: ["CancelledNotConfirmed", "Не подтверждён за 24 ч", "Отменён", "r"],
  45: ["CancelledBySeller", "Отменён продавцом", "Отменён", "r"],
  46: ["CancelledByAdmin", "Отменён Optom", "Отменён", "r"],
  48: ["CancelledNotCollected", "Не забран / отказ", "Отменён", "r"],
  50: ["Refunded", "Вернулся продавцу", "Отменён", "r"],
  47: ["CancelledPaymentExpired", "Не оплачен", "Отменён", "r"],
};
const SELLER_SEES = { 45: "Отменён вами", 26: "Возвращается к вам", 50: "Вернулся к вам" }; // seller's own wording (13.2)
const ST_GROUPS = [["Основной путь", [16, 20, 25, 30, 32, 35, 40]], ["Проблемы с доставкой", [24, 26, 55, 60]], ["Отмены и возврат", [41, 42, 45, 46, 48, 50]], ["Старые заказы", [47]]];
const FINAL = [40, 41, 42, 45, 46, 47, 48, 50];
const SEL = { hs: ["ООО «Холод Сервис»", "Николаев А. Д."], ka: ["ИП Каримов", "Каримов У. Т."], mo: ["ООО «Мебель Опт»", "Саидова Н. Р."] };
const BRN = { chil: ["Филиал Чиланзар", "hs"], sam: ["Филиал Самарканд", "hs"], serg: ["Склад Сергели", "ka"], yun: ["Филиал Юнусабад", "mo"] };
const ME = "Каримова Д.";
const PT = {
  hold: "Доставка приостановлена", notacc: "Служба доставки не приняла заказ", exc: "Ошибка доставки", ygnb: "Yandex Go: курьер не забронирован",
  sdfail: "Не удалось доставить", sdover: "Просрочен", ret: "Посылка возвращается продавцу", unk: "Неизвестный статус от перевозчика",
  part: "Доставлен частично", disp: "Доставка оспорена",
};
const PT_ORDER = ["hold", "notacc", "exc", "ygnb", "sdfail", "sdover", "ret", "unk", "part", "disp"];
// carrier events: plain sentences grouped by meaning (PRD 4.9)
const EVT = {
  fg: {
    accepted: "Fargo принял заказ", on_his_way: "Курьер едет в филиал за посылкой", picked_up: "Курьер забрал посылку", in_sorting_facility: "Посылка на сортировочном складе",
    in_transit: "Посылка в пути", out_for_delivery: "Курьер везёт посылку покупателю", completed: "Посылка доставлена", partial_complete: "Посылка доставлена частично",
    on_hold: "Fargo приостановил доставку", delivery_rejected: "Fargo отказался принять заказ", cancelled_due_to_out_of_delivery_area: "Адрес вне зоны доставки Fargo",
    delivery_failed: "Доставка не удалась", dispatch_for_return: "Посылка отправлена обратно продавцу", returning_to_origin: "Посылка едет обратно продавцу",
    courier_lost_signal: "Неизвестный статус перевозчика", cancel_refused: "Fargo отказал в отмене брони", cancelled: "Прежняя доставка Fargo отменена по запросу Optom.uz",
  },
  yg: {
    performer_lookup: "Yandex Go ищет курьера", cancelled_by_taxi: "Yandex Go отказался выполнить доставку", performer_not_found: "Курьер не найден", performer_found: "Курьер найден и едет в филиал", pickuped: "Курьер забрал заказ",
    delivered: "Заказ доставлен", delivered_finish: "Yandex Go закрыл доставку", failed: "Доставка не удалась",
    cancelled_with_items_on_hands: "Курьер отменил доставку, товар у курьера", cancelled: "Доставка Yandex Go отменена по запросу Optom.uz",
  },
};
// ---------- time helpers (today 27.10.2026, Tashkent time) ----------
const P2 = x => String(x).padStart(2, "0");
function pt(s) { const [d, t] = s.split(" "); const [dd, mm, yy] = d.split(".").map(Number); const [h, mi] = (t || "00:00").split(":").map(Number); return new Date(yy, mm - 1, dd, h, mi).getTime(); }
function ft(ms) { const d = new Date(ms); return `${P2(d.getDate())}.${P2(d.getMonth() + 1)}.${d.getFullYear()} ${P2(d.getHours())}:${P2(d.getMinutes())}`; }
let CLK = pt("27.10.2026 11:30");
function nowS() { CLK += 60000; return ft(CLK); }
function ago(s) { const m = Math.max(0, Math.round((CLK - pt(s)) / 60000)); const d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mi = m % 60; return d ? `${d} дн. ${h} ч` : h ? `${h} ч ${mi} мин` : `${mi} мин`; }
function dueAfter(s) { const d = new Date(pt(s)); d.setDate(d.getDate() + 3); return `${P2(d.getDate())}.${P2(d.getMonth() + 1)}.${d.getFullYear()} 23:59`; }

// ---------- example orders ----------
// h: [time, from, to, who (b buyer, s seller, c carrier, j job, a:<admin>), source (A action, J job, C carrier event, K correction), comment]
// ev: [time, carrier code, mapped status or null, FargoOrderId]
const PAY = (t, b) => [t, null, 16, "b", "A", "Оплата подтверждена (Paylov)"];
const ORD0 = [
  { n: "68731702", d: "27.10.2026 11:20", b: "ООО «Строй Маркет»", br: "sam", m: "fg", st: 16, exp: "30.10.2026 – 01.11.2026", sum: 3150000, it: [["Морозильный ларь Artel 300 л", 1]], h: [PAY("27.10.2026 11:20")], ev: [] },
  { n: "68731590", d: "26.10.2026 18:20", b: "ИП Юлдашев", br: "chil", m: "yg", st: 45, exp: "—", sum: 10500000, it: [["Холодильник Artel HD 455 RN", 5]],
    cb: "Продавец", cbw: "Николаев А. Д.", cr: "SellerCancelled", cc: "Нет нужного количества на складе", cat: "27.10.2026 09:05",
    h: [PAY("26.10.2026 18:20"), ["27.10.2026 08:30", 16, 20, "s", "A", "Подтверждён; ищем курьера Yandex Go"], ["27.10.2026 08:41", 20, 25, "c", "C", "performer_found"], ["27.10.2026 09:05", 25, 45, "s", "A", "Нет нужного количества на складе"]],
    ev: [["27.10.2026 08:30", "performer_lookup", 20], ["27.10.2026 08:41", "performer_found", 25], ["27.10.2026 09:05", "cancelled", null]] },
  { n: "68731388", d: "27.10.2026 07:40", b: "ООО «Ташкент Текстиль»", br: "chil", m: "yg", st: 20, exp: "27.10.2026 – 28.10.2026", sum: 2100000, it: [["Микроволновая печь Artel MW 20", 6]],
    h: [PAY("27.10.2026 07:40"), ["27.10.2026 08:05", 16, 20, "s", "A", "Подтверждён; ищем курьера Yandex Go"]],
    ev: [["27.10.2026 08:05", "performer_lookup", 20], ["27.10.2026 08:35", "performer_not_found", null]],
    prob: { t: "ygnb", since: "27.10.2026 08:35", det: "Курьер не найден (performer_not_found). Перезаказать доставку может продавец" } },
  { n: "68731204", d: "27.10.2026 09:12", b: "ООО «Строй Маркет»", br: "chil", m: "fg", st: 25, exp: "28.10.2026 – 30.10.2026", fid: "FG-5512087", sum: 6300000, it: [["Холодильник Artel HD 455 RN", 3]],
    h: [PAY("27.10.2026 09:12"), ["27.10.2026 10:05", 16, 25, "s", "A", "Подтверждён; Fargo забронирован"]],
    ev: [["27.10.2026 10:05", "accepted", 25, "FG-5512087"], ["27.10.2026 10:48", "on_his_way", 25, "FG-5512087"]] },
  { n: "68731120", d: "27.10.2026 08:15", b: "ООО «Восток Трейд»", br: "chil", m: "yg", st: 55, exp: "27.10.2026 – 28.10.2026", sum: 1950000, it: [["Вентилятор Artel FN 16", 15]],
    h: [PAY("27.10.2026 08:15"), ["27.10.2026 08:40", 16, 20, "s", "A", "Подтверждён; ищем курьера Yandex Go"], ["27.10.2026 09:02", 20, 55, "c", "C", "cancelled_by_taxi"]],
    ev: [["27.10.2026 08:40", "performer_lookup", 20], ["27.10.2026 09:02", "cancelled_by_taxi", 55]],
    prob: { t: "notacc", since: "27.10.2026 09:02", det: "Yandex Go: cancelled_by_taxi. Перезаказать доставку может продавец" } },
  { n: "68731015", d: "26.10.2026 15:55", b: "ИП Рахимов Ш.", br: "sam", m: "fg", st: 55, exp: "29.10.2026 – 31.10.2026", sum: 4400000, it: [["Стиральная машина Artel WF 60", 2]],
    h: [PAY("26.10.2026 15:55"), ["26.10.2026 17:32", 16, 55, "s", "A", "Подтверждён; Fargo отказал в брони"]],
    ev: [["26.10.2026 17:32", "cancelled_due_to_out_of_delivery_area", 55]],
    prob: { t: "notacc", since: "26.10.2026 17:32", det: "При подтверждении: cancelled_due_to_out_of_delivery_area" } },
  { n: "68730877", d: "26.10.2026 14:30", b: "ИП Рахимов Ш.", br: "serg", m: "sd", st: 30, exp: "до 28.10.2026", sum: 9800000, it: [["Кондиционер Midea 12000 BTU", 2]],
    h: [PAY("26.10.2026 14:30"), ["26.10.2026 15:10", 16, 25, "s", "A", ""], ["27.10.2026 09:40", 25, 30, "s", "A", "Передан в доставку"]], ev: [] },
  { n: "68730733", d: "26.10.2026 10:05", b: "ООО «Восток Трейд»", br: "yun", m: "fg", st: 30, exp: "27.10.2026 – 29.10.2026", fid: "FG-5506032", sum: 5900000, it: [["Шкаф-купе «Классик» 2 м", 2]],
    h: [PAY("26.10.2026 10:05"), ["26.10.2026 11:00", 16, 25, "s", "A", "Подтверждён; Fargo забронирован"], ["26.10.2026 15:10", 25, 30, "c", "C", "picked_up"]],
    ev: [["26.10.2026 11:00", "accepted", 25, "FG-5506032"], ["26.10.2026 15:10", "picked_up", 30, "FG-5506032"], ["26.10.2026 18:00", "in_transit", 30, "FG-5506032"], ["27.10.2026 09:14", "courier_lost_signal", null, "FG-5506032"]],
    prob: { t: "unk", since: "27.10.2026 09:14", code: "courier_lost_signal", det: "Статус заказа не изменился (30 Shipped); событие сохранено" } },
  { n: "68730650", d: "26.10.2026 12:10", b: "ООО «Самарканд Савдо»", br: "sam", m: "pu", st: 32, exp: "заберите до 30.10.2026", sum: 1800000, it: [["Электрочайник Artel KT 17", 40]],
    h: [PAY("26.10.2026 12:10"), ["26.10.2026 13:00", 16, 25, "s", "A", ""], ["27.10.2026 10:10", 25, 32, "s", "A", "Готов к выдаче"]], ev: [] },
  { n: "68730540", d: "26.10.2026 16:40", b: "ИП Юлдашев", br: "chil", m: "yg", st: 60, exp: "26.10.2026 – 27.10.2026", sum: 2600000, it: [["Пылесос Artel VCC 0120", 8]],
    h: [PAY("26.10.2026 16:40"), ["26.10.2026 17:00", 16, 20, "s", "A", "Подтверждён; ищем курьера Yandex Go"], ["26.10.2026 17:12", 20, 25, "c", "C", "performer_found"], ["26.10.2026 17:50", 25, 30, "c", "C", "pickuped"], ["26.10.2026 19:15", 30, 60, "c", "C", "cancelled_with_items_on_hands"]],
    ev: [["26.10.2026 17:00", "performer_lookup", 20], ["26.10.2026 17:12", "performer_found", 25], ["26.10.2026 17:50", "pickuped", 30], ["26.10.2026 19:15", "cancelled_with_items_on_hands", 60]],
    prob: { t: "exc", since: "26.10.2026 19:15", det: "Yandex Go: cancelled_with_items_on_hands. Перезаказать доставку может продавец" } },
  { n: "68730402", d: "25.10.2026 15:30", b: "ИП Юлдашев", br: "chil", m: "yg", st: 30, exp: "25.10.2026 – 26.10.2026", sum: 3300000, it: [["Холодильник Artel HS 228", 1]],
    h: [PAY("25.10.2026 15:30"), ["25.10.2026 15:50", 16, 20, "s", "A", "Подтверждён; ищем курьера Yandex Go"], ["25.10.2026 16:02", 20, 25, "c", "C", "performer_found"], ["25.10.2026 17:10", 25, 30, "c", "C", "pickuped"], ["25.10.2026 18:02", 30, 35, "c", "C", "delivered"], ["27.10.2026 10:25", 35, 30, "s", "K", "Покупатель позвонил: заказ не получил"]],
    ev: [["25.10.2026 15:50", "performer_lookup", 20], ["25.10.2026 16:02", "performer_found", 25], ["25.10.2026 17:10", "pickuped", 30], ["25.10.2026 18:02", "delivered", 35], ["25.10.2026 20:02", "delivered_finish", null]],
    prob: { t: "disp", since: "27.10.2026 10:25", det: "30 Shipped — установил Николаев А. Д. (продавец): Покупатель позвонил: заказ не получил" } },
  { n: "68730299", d: "25.10.2026 12:00", b: "ИП Рахимов Ш.", br: "serg", m: "sd", st: 30, exp: "до 26.10.2026", sum: 7200000, it: [["Кондиционер Midea 9000 BTU", 2]],
    h: [PAY("25.10.2026 12:00"), ["25.10.2026 13:10", 16, 25, "s", "A", ""], ["26.10.2026 09:30", 25, 30, "s", "A", "Передан в доставку"]], ev: [],
    prob: { t: "sdover", since: "27.10.2026 00:05", det: "Срок «до 26.10.2026» истёк, заказ не доставлен" } },
  { n: "68730122", d: "25.10.2026 13:15", b: "ООО «Строй Маркет»", br: "serg", m: "fg", st: 60, exp: "26.10.2026 – 28.10.2026", fid: "FG-5504471", sum: 4900000, it: [["Кондиционер Midea 12000 BTU", 1]],
    h: [PAY("25.10.2026 13:15"), ["25.10.2026 14:00", 16, 25, "s", "A", "Подтверждён; Fargo забронирован"], ["26.10.2026 10:20", 25, 30, "c", "C", "picked_up"], ["27.10.2026 08:47", 30, 60, "c", "C", "delivery_failed"]],
    ev: [["25.10.2026 14:00", "accepted", 25, "FG-5504471"], ["26.10.2026 10:20", "picked_up", 30, "FG-5504471"], ["27.10.2026 08:05", "out_for_delivery", 30, "FG-5504471"], ["27.10.2026 08:47", "delivery_failed", 60, "FG-5504471"]],
    prob: { t: "exc", since: "27.10.2026 08:47", det: "Fargo: delivery_failed" } },
  { n: "68729911", d: "25.10.2026 10:30", b: "ООО «Восток Трейд»", br: "yun", m: "fg", st: 24, exp: "26.10.2026 – 28.10.2026", fid: "FG-5503120", sum: 8100000, it: [["Диван «Милан» 3-местный", 2]],
    h: [PAY("25.10.2026 10:30"), ["25.10.2026 11:20", 16, 25, "s", "A", "Подтверждён; Fargo забронирован"], ["25.10.2026 15:40", 25, 30, "c", "C", "picked_up"], ["26.10.2026 11:05", 30, 24, "c", "C", "on_hold"]],
    ev: [["25.10.2026 11:20", "accepted", 25, "FG-5503120"], ["25.10.2026 15:40", "picked_up", 30, "FG-5503120"], ["26.10.2026 11:05", "on_hold", 24, "FG-5503120"]],
    prob: { t: "hold", since: "26.10.2026 11:05", det: "Fargo: on_hold" } },
  { n: "68729877", d: "24.10.2026 14:25", b: "ООО «Самарканд Савдо»", br: "sam", m: "fg", st: 35, exp: "27.10.2026 – 29.10.2026", fid: "FG-5500918", sum: 3600000, it: [["Электрочайник Artel KT 17", 60], ["Тостер Artel TS 02", 20]],
    dlv: "26.10.2026 13:05", due: "29.10.2026 23:59",
    h: [PAY("24.10.2026 14:25"), ["24.10.2026 15:10", 16, 25, "s", "A", "Подтверждён; Fargo забронирован"], ["25.10.2026 09:40", 25, 30, "c", "C", "picked_up"], ["26.10.2026 13:05", 30, 35, "c", "C", "partial_complete"]],
    ev: [["24.10.2026 15:10", "accepted", 25, "FG-5500918"], ["25.10.2026 09:40", "picked_up", 30, "FG-5500918"], ["26.10.2026 13:05", "partial_complete", 35, "FG-5500918"]],
    prob: { t: "part", since: "26.10.2026 13:05", det: "Fargo: partial_complete. Автозавершение приостановлено (срок был 29.10.2026 23:59)" } },
  { n: "68729605", d: "24.10.2026 09:50", b: "ООО «Строй Маркет»", br: "serg", m: "sd", st: 24, exp: "до 26.10.2026", sum: 5600000, it: [["Кондиционер Midea 9000 BTU", 1], ["Монтажный комплект", 1]],
    h: [PAY("24.10.2026 09:50"), ["24.10.2026 10:40", 16, 25, "s", "A", ""], ["26.10.2026 10:00", 25, 30, "s", "A", "Передан в доставку"], ["26.10.2026 16:30", 30, 24, "s", "A", "Не удалось доставить: покупатель отказался от заказа"]], ev: [],
    prob: { t: "sdfail", since: "26.10.2026 16:30", det: "Попытка 1: покупатель отказался от заказа" } },
  { n: "68729340", d: "23.10.2026 16:05", b: "ООО «Ташкент Текстиль»", br: "yun", m: "fg", st: 26, exp: "24.10.2026 – 26.10.2026", fid: "FG-5498810", sum: 7450000, it: [["Диван угловой «Комфорт»", 1]],
    h: [PAY("23.10.2026 16:05"), ["23.10.2026 17:20", 16, 25, "s", "A", "Подтверждён; Fargo забронирован"], ["24.10.2026 10:15", 25, 30, "c", "C", "picked_up"], ["25.10.2026 18:40", 30, 26, "c", "C", "dispatch_for_return"]],
    ev: [["23.10.2026 17:20", "accepted", 25, "FG-5498810"], ["24.10.2026 09:50", "on_his_way", 25, "FG-5498810"], ["24.10.2026 10:15", "picked_up", 30, "FG-5498810"], ["24.10.2026 14:02", "in_sorting_facility", 30, "FG-5498810"], ["25.10.2026 11:30", "out_for_delivery", 30, "FG-5498810"], ["25.10.2026 18:40", "dispatch_for_return", 26, "FG-5498810"], ["26.10.2026 09:12", "returning_to_origin", 26, "FG-5498810"]],
    prob: { t: "ret", since: "25.10.2026 18:40", det: "Покупатель не ответил; Fargo везёт посылку обратно (dispatch_for_return)" } },
  { n: "68728815", d: "24.10.2026 11:40", b: "ООО «Восток Трейд»", br: "chil", m: "fg", st: 35, exp: "25.10.2026 – 27.10.2026", fid: "FG-5501466", sum: 5200000, it: [["Морозильный ларь Artel 300 л", 2]],
    dlv: "26.10.2026 16:20", due: "29.10.2026 23:59",
    h: [PAY("24.10.2026 11:40"), ["24.10.2026 12:30", 16, 25, "s", "A", "Подтверждён; Fargo забронирован"], ["25.10.2026 10:05", 25, 30, "c", "C", "picked_up"], ["26.10.2026 16:20", 30, 35, "c", "C", "completed"]],
    ev: [["24.10.2026 12:30", "accepted", 25, "FG-5501466"], ["25.10.2026 10:05", "picked_up", 30, "FG-5501466"], ["26.10.2026 09:30", "out_for_delivery", 30, "FG-5501466"], ["26.10.2026 16:20", "completed", 35, "FG-5501466"]] },
  { n: "68725102", d: "20.10.2026 10:15", b: "ИП Юлдашев", br: "yun", m: "pu", st: 40, exp: "—", sum: 4600000, it: [["Стул офисный «Престиж»", 20]],
    dlv: "21.10.2026 15:30", comp: "22.10.2026 09:05", compBy: "Покупатель",
    h: [PAY("20.10.2026 10:15"), ["20.10.2026 11:00", 16, 25, "s", "A", ""], ["21.10.2026 10:00", 25, 32, "s", "A", "Готов к выдаче"], ["21.10.2026 15:30", 32, 35, "s", "A", "Выдан по коду"], ["22.10.2026 09:05", 35, 40, "b", "A", "«Я получил заказ»"]], ev: [] },
];
// seeded admin action log (OL-A4): one entry for every admin action type
let LOG = [
  { t: "27.10.2026 10:41", a: "Юсупов Б.", n: "68729102", act: "Отменить заказ", fr: 55, to: 46, c: "Продавец не отправляет через Fargo в этот район" },
  { t: "27.10.2026 09:58", a: ME, n: "68728450", act: "Отправить заново", fr: 60, to: 25, c: "Новый FargoOrderId FG-5509921 (был FG-5507310)" },
  { t: "27.10.2026 09:20", a: "Юсупов Б.", n: "68727731", act: "Посылка вернулась", fr: 26, to: 50, c: "Продавец подтвердил: посылка на складе" },
  { t: "26.10.2026 18:05", a: ME, n: "68728003", act: "Вернуть в обработку", fr: 30, to: 25, c: "Продавец нажал «Передан в доставку» по ошибке" },
  { t: "26.10.2026 16:44", a: "Юсупов Б.", n: "68727540", act: "Не доставлен", fr: 35, to: 30, c: "Покупатель сообщил в поддержку, что заказ не получил" },
  { t: "26.10.2026 15:12", a: ME, n: "68727218", act: "Отметить доставленным", fr: 30, to: 35, c: "Покупатель подтвердил получение по телефону" },
  { t: "26.10.2026 12:30", a: "Юсупов Б.", n: "68726904", act: "Решено", fr: 24, to: null, c: "Fargo возобновил доставку, ждём событие" },
  { t: "26.10.2026 11:02", a: ME, n: "68726458", act: "Написать продавцу", fr: null, to: null, c: "Просьба подтвердить заказ до конца дня" },
  { t: "25.10.2026 17:40", a: "Юсупов Б.", n: "68726102", act: "Разрешить новую попытку", fr: 24, to: null, c: "Покупатель попросил доставить завтра" },
];
const ACTS = ["Отменить заказ", "Отправить заново", "Вернуть в обработку", "Посылка вернулась", "Не доставлен", "Отметить доставленным", "Разрешить новую попытку", "Решено", "Написать продавцу"];

// ---------- state ----------
let S = {};
function reset(o) {
  closeModal();
  S = Object.assign({ v: "list", cur: null, f: { st: [], m: "", br: "", pr: false }, stOpen: false, pf: { m: "", t: [] }, lf: { a: "", act: "", from: "", to: "" }, merged: false, variants: null, demoRefuse: null, demoNoCancel: false, fgRefuse: false, stale: false, last: null, focus: null },
    o || {});
  S.o = JSON.parse(JSON.stringify(ORD0));
  render();
}
const ord = n => S.o.find(x => x.n === n);
const stName = c => `${c} ${ST[c][0]}`;
const stFull = c => `${c} ${ST[c][0]} · ${ST[c][1]}`;
function stCell(c) { return `<div class="stc"><b>${c}</b> <span class="nm">${ST[c][0]}</span><br><span class="pill ${ST[c][3]}">${ST[c][1]}</span></div>`; }
function stHead(c) { return `<span class="pill ${ST[c][3]} sth"><b>${c}</b><span class="mono">${ST[c][0]}</span>· ${ST[c][1]}</span>`; }
function buyerSees(o) {
  if (o.bst) return o.bst;
  if (o.m === "pu" && (o.st === 35 || o.st === 40)) return o.st === 40 ? `Получен + «Завершён ${o.comp.slice(0, 10)}»` : "Получен";
  if (o.st === 40) return `Доставлен + «Завершён ${o.comp.slice(0, 10)}»`;
  return ST[o.st][2];
}
const sellerSees = o => SELLER_SEES[o.st] || (o.st === 46 ? "Отменён Optom" : ST[o.st][1]);
const isCarrier = o => o.m === "fg" || o.m === "yg";
const carrierName = o => o.m === "fg" ? "Fargo" : "Yandex Go";
function whoTxt(o, w) {
  if (w === "b") return [o.b, "покупатель"];
  if (w === "s") return [SEL[BRN[o.br][1]][1], "продавец"];
  if (w === "c") return [carrierName(o), "перевозчик"];
  if (w === "j") return ["Система", "задание"];
  return [w.slice(2), "администратор"];
}
const SRC = { A: "Действие", J: "Задание", C: "Событие перевозчика", K: "Корректировка" };
function probText(o) { return o.prob.t === "unk" ? `Неизвестный статус от ${carrierName(o)}: ${o.prob.code}` : PT[o.prob.t]; }

// ---------- which admin actions are allowed (PRD 4.4, 4.5, 4.6) ----------
function canCancel(o) {
  if ([16, 20, 25, 32, 24, 55, 60].includes(o.st)) return true;
  if (o.st === 30 && o.m === "sd") return true;
  if (o.st === 30 && o.prob && o.prob.t === "disp") return true; // 4.6: «Доставка оспорена» row offers cancel
  return false;
}
function ordActs(o) {
  const a = [];
  if (o.m === "fg" && [24, 55, 60].includes(o.st)) a.push("resend");
  if (o.m === "sd" && o.st === 30) a.push("back");
  if (isCarrier(o) && o.st === 30 && o.prob && o.prob.t === "disp") a.push("markdel");
  if (isCarrier(o) && o.st === 35) a.push("notdel");
  if (isCarrier(o) && o.st === 26) a.push("returned");
  if (o.m === "sd" && o.st === 24) a.push("retry");
  if (canCancel(o)) a.push("cancel");
  return a;
}
function probActs(o) {
  const t = o.prob.t, a = [];
  if (o.m === "fg" && ["hold", "notacc", "exc"].includes(t)) a.push("resend");
  if (t === "sdfail") a.push("retry");
  if (t === "ret") a.push("returned");
  if (t === "disp") a.push("markdel");
  if (!["ret", "unk", "part"].includes(t) && canCancel(o)) a.push("cancel");
  a.push("resolve");
  return a;
}
const ABTN = {
  resend: ["Отправить заново", "pri"], back: ["Вернуть в обработку", "out"], markdel: ["Отметить доставленным", "out"], notdel: ["Не доставлен", "out"],
  returned: ["Посылка вернулась", "out"], retry: ["Разрешить новую попытку", "out"], cancel: ["Отменить заказ", "dan"], resolve: ["Решено", "soft"],
};
const abtn = (k, n, sm) => `<button class="btn ${ABTN[k][1]} ${sm ? "sm" : ""}" data-act="${k}" data-n="${n}">${ABTN[k][0]}</button>`;
function cancelWhy(o) { // exact texts when cancel is not offered
  if (canCancel(o)) return "";
  if (o.st === 26) return "Посылка возвращается к продавцу — отменить нельзя.";
  if (o.st === 35) return "Заказ доставлен — оформляется возврат.";
  if (FINAL.includes(o.st)) return "Заказ завершён или отменён.";
  if (o.st === 30) return "Заказ у курьера — отменить нельзя.";
  return "";
}

// ---------- shell ----------
const AIC = { an: ICON.chart, pr: ICON.box, or: ICON.list, us: ICON.users, de: ICON.truck, mo: '<svg viewBox="0 0 24 24"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/></svg>' };
function shell(sub, content) {
  const nav = (k, t) => `<div class="anav ${k === "or" ? "on" : ""}">${AIC[k]}${t}</div>`;
  const np = S.o.filter(o => o.prob).length;
  const subs = [["list", "Все заказы"], ["prob", `Проблемы с доставкой<span class="cnt3">${np}</span>`], ["log", "Журнал действий"]].map(s => `<div class="asub ${sub === s[0] ? "on" : ""}" data-nav="${s[0]}">${s[1]}</div>`).join("");
  return `<div class="ash o3"><aside class="aside">${LOGO.replace("optom</span>", "optom.uz</span>")}${nav("an", "Аналитика")}${nav("pr", "Товары")}${nav("or", "Заказы")}${subs}${nav("us", "Пользователи")}${nav("mo", "Модерация")}${nav("de", "Доставка")}</aside>
    <div><div class="atop"><span class="abox">${ICON.bell.replace("<svg", '<svg width="18" height="18" fill="none" stroke="#38383b" stroke-width="1.6"')}</span><span class="abox">RU ▾</span><span class="abox"><span class="ava" style="width:28px;height:28px;font-size:11px">КД</span><b style="font-size:13px">${ME} (admin)</b></span></div>${content}</div></div>`;
}

// ---------- orders list (OL-A1) ----------
function listView() {
  const F = S.f;
  const rows = S.o.filter(o => (!F.st.length || F.st.includes(o.st)) && (!F.m || o.m === F.m) && (!F.br || o.br === F.br) && (!F.pr || o.prob)).sort((a, b) => pt(b.d) - pt(a.d));
  const stLbl = F.st.length ? `Статус: ${F.st.join(", ")}` : "Статус: все";
  const pan = S.stOpen ? `<div class="pan">${ST_GROUPS.map(g => `<div class="grp">${g[0]}</div>${g[1].map(c => `<label><input type="checkbox" data-st="${c}" ${F.st.includes(c) ? "checked" : ""}><b>${c}</b> <span class="mono">${ST[c][0]}</span> · ${ST[c][1]}</label>`).join("")}`).join("")}
      <div class="ft"><button class="btn link sm" id="stclr">Очистить</button><button class="btn out sm" id="stok">Готово</button></div></div>` : "";
  const table = rows.length ? `<table class="t3"><thead><tr><th>№</th><th>Дата</th><th>Покупатель</th><th>Продавец</th><th>Филиал</th><th>Способ</th><th>Статус</th><th>Ожидается</th><th></th></tr></thead><tbody>
    ${rows.map(o => `<tr class="clk" data-open="${o.n}"><td><b>${o.n}</b></td><td>${o.d.slice(0, 10)}<div class="mut">${o.d.slice(11)}</div></td><td>${o.b}</td><td>${SEL[BRN[o.br][1]][0]}</td><td>${BRN[o.br][0]}</td><td>${MTH[o.m]}</td><td>${stCell(o.st)}</td>
      <td class="small">${o.st === 35 ? "Доставлен " + o.dlv.slice(0, 10) : FINAL.includes(o.st) ? "—" : o.exp}</td><td>${o.prob ? `<span class="pmark" title="${esc(probText(o))}">Проблема</span>` : ""}</td></tr>`).join("")}</tbody></table>`
    : `<div class="empty3">По выбранным фильтрам заказов нет. <button class="btn link sm" id="fclr">Сбросить фильтры</button></div>`;
  return shell("list", `<div class="apanel"><h1>Заказы</h1>
    <div class="fbar"><div class="msel"><button class="bt ${F.st.length ? "on" : ""}" id="stbtn">${stLbl} ▾</button>${pan}</div>
      <select class="inp" id="fm"><option value="">Способ доставки: все</option>${MORD.map(k => `<option value="${k}" ${F.m === k ? "selected" : ""}>${MTH[k]}</option>`).join("")}</select>
      <select class="inp" id="fb"><option value="">Филиал: все</option>${Object.keys(BRN).map(k => `<option value="${k}" ${F.br === k ? "selected" : ""}>${BRN[k][0]} · ${SEL[BRN[k][1]][0]}</option>`).join("")}</select>
      <label class="chk" style="margin:0"><input type="checkbox" id="fp" ${F.pr ? "checked" : ""}>Есть проблема</label>
      <span class="hint">Найдено: ${rows.length}</span>${F.st.length || F.m || F.br || F.pr ? '<button class="btn link sm" id="fclr2">Сбросить фильтры</button>' : ""}</div>
    ${table}</div>`);
}

// ---------- order page (OL-A1, OL-A3, OL-A5) ----------
function orderView() {
  const o = ord(S.cur), sl = SEL[BRN[o.br][1]];
  const vbar = `<div class="dem">${S.variants ? `<b>демо: заказ</b>${S.variants.map(v => `<button data-var="${v[0]}" class="${S.cur === v[0] ? "on" : ""}">${v[1]}</button>`).join("")}` : "<b>демо:</b>"}
      ${o.m === "fg" && o.st === 25 ? `<label style="margin-left:8px"><input type="checkbox" id="fgref" ${S.fgRefuse ? "checked" : ""}>Fargo отказал в отмене</label>` : ""}${staleDemo()}</div>`;
  const kv = [["Дата оплаты", o.d], ["Способ доставки", MTH[o.m] + (o.fid ? `<div class="mut">FargoOrderId: <span class="mono">${o.fid}</span></div>` : "")], ["Филиал", BRN[o.br][0]],
    ["Покупатель", o.b], ["Продавец", sl[0]], ["Ожидается", FINAL.includes(o.st) ? "—" : o.exp],
    ["Сумма", som(o.sum)], ["Покупатель видит", `«${buyerSees(o)}»`], ["Продавец видит", `«${sellerSees(o)}»`]];
  if (o.dlv && [35, 40].includes(o.st)) kv.push(["Доставлен (DeliveredAt)", o.dlv]);
  if (o.st === 35) kv.push(["Автозавершение", o.prob ? `<span class="pill a">приостановлено</span>` : `${o.due} (CompletionDueAt)`]);
  if (o.st === 40) kv.push(["Завершён", `${o.comp} · CompletedBy: ${o.compBy}`]);
  const canc = FINAL.includes(o.st) && o.st !== 40 ? `<div class="alert e"><span class="ic">!</span><div><b>${stFull(o.st)}</b>
      Кто отменил (CancelledBy): <b style="display:inline">${o.cb}</b>${o.cbw ? " · " + o.cbw : ""} · Причина (CancelReason): <span class="mono">${o.cr}</span> · ${o.cat}<br>Комментарий: ${o.cc ? esc(o.cc) : "<span class='mut'>нет</span>"}</div></div>` : "";
  const pb = o.prob ? `<div class="alert w"><span class="ic">!</span><div style="flex:1"><b>В списке «Проблемы с доставкой» с ${o.prob.since} (${ago(o.prob.since)}): ${esc(probText(o))}</b>${esc(o.prob.det || "")}
      <div class="ra">${abtn("resolve", o.n, true)}<button class="btn link sm" data-nav="prob">Открыть список проблем</button></div></div></div>` : "";
  const cl = !o.prob && o.closed && o.closed.st === o.st ? `<div class="alert i"><span class="ic">i</span><div><b>Строка «${esc(o.closed.p)}» закрыта ${o.closed.at} (${o.closed.by}, «Решено»)</b>Статус не изменился: покупатель по-прежнему видит «Проблема с доставкой», продавец — во вкладке «Проблемные». Строка вернётся в список при новом событии проблемы или если статус не изменится до ${o.closed.until}.</div></div>` : "";
  const acts = ordActs(o), why = cancelWhy(o);
  const abar = `<div class="abar"><span class="lbl">Действия:</span>${acts.map(k => abtn(k, o.n)).join("")}${why ? `<span class="why3">${why}</span>` : ""}<span class="sp"></span>
      <button class="btn out" data-act="msg" data-n="${o.n}">${ICON.chat.replace("<svg", '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"')}Написать продавцу</button></div>`;
  // history and events
  const hRows = o.h.map(r => { const w = whoTxt(o, r[3]); return { t: r[0], k: "h", r, w }; });
  const eRows = o.ev.map(r => ({ t: r[0], k: "e", r }));
  const evLine = r => `<span class="mono">${r[1]}</span>`;
  const evText = r => `${EVT[o.m][r[1]] || r[1]}${r[3] ? `<div class="mut">FargoOrderId ${r[3]}</div>` : ""}`;
  const evMap = r => r[2] ? `→ ${stName(r[2])}` : '<span class="mut">статус не изменён</span>';
  const hTr = x => `<tr><td class="small">${x.r[0]}</td><td>${x.r[1] == null ? "—" : stName(x.r[1])} → <b>${stName(x.r[2])}</b></td><td>${esc(x.w[0])}<div class="mut">${x.w[1]}</div></td><td><span class="src ${x.r[4]}">${SRC[x.r[4]]}</span></td><td class="small">${x.r[5] ? esc(x.r[5]) : '<span class="mut">—</span>'}</td></tr>`;
  let logs;
  if (S.merged) {
    const all = hRows.concat(eRows).sort((a, b) => pt(a.t) - pt(b.t) || (a.k === "e" ? -1 : 1));
    logs = `<table class="t3"><thead><tr><th>Время</th><th>Запись</th><th>Что произошло</th><th>Кто / перевозчик</th><th>Комментарий / статус</th></tr></thead><tbody>${all.map(x => x.k === "h"
      ? `<tr><td class="small">${x.t}</td><td><span class="src ${x.r[4]}">Статус · ${SRC[x.r[4]]}</span></td><td>${x.r[1] == null ? "—" : stName(x.r[1])} → <b>${stName(x.r[2])}</b></td><td>${esc(x.w[0])}<div class="mut">${x.w[1]}</div></td><td class="small">${x.r[5] ? esc(x.r[5]) : "—"}</td></tr>`
      : `<tr><td class="small">${x.t}</td><td><span class="src C">Событие</span></td><td>${evText(x.r)}</td><td>${carrierName(o)}<div>${evLine(x.r)}</div></td><td class="small">${evMap(x.r)}</td></tr>`).join("")}</tbody></table>`;
  } else {
    logs = `<div class="sec3"><h3>История статусов</h3><table class="t3"><thead><tr><th>Время</th><th>Статус: было → стало</th><th>Кто</th><th>Источник</th><th>Комментарий</th></tr></thead><tbody>${hRows.map(hTr).join("")}</tbody></table></div>
      <div class="sec3"><h3>События перевозчика</h3>${eRows.length ? `<table class="t3"><thead><tr><th>Время</th><th>Перевозчик</th><th>Код перевозчика</th><th>Что произошло</th><th>Статус заказа</th></tr></thead><tbody>${eRows.map(x => `<tr><td class="small">${x.r[0]}</td><td>${carrierName(o)}</td><td>${evLine(x.r)}</td><td>${evText(x.r)}</td><td class="small">${evMap(x.r)}</td></tr>`).join("")}</tbody></table>`
      : `<p class="hint">${isCarrier(o) ? "Событий от перевозчика пока нет." : `${MTH[o.m]}: перевозчика нет, все шаги продавца — в истории статусов.`}</p>`}</div>`;
  }
  const mine = LOG.filter(l => l.n === o.n);
  const adm = `<div class="sec3"><h3>Действия администраторов по заказу</h3>${mine.length ? `<table class="t3"><thead><tr><th>Время</th><th>Администратор</th><th>Действие</th><th>Статус</th><th>Комментарий</th></tr></thead><tbody>${mine.map(l => `<tr><td class="small">${l.t}</td><td>${l.a}</td><td>${l.act}</td><td class="small">${logSt(l)}</td><td class="small">${l.c ? esc(l.c) : "—"}</td></tr>`).join("")}</tbody></table>` : '<p class="hint">Пока нет.</p>'}</div>`;
  const items = `<div class="sec3"><h3>Товары</h3><table class="t3"><tbody>${o.it.map(i => `<tr><td>${i[0]}</td><td style="width:120px">${i[1]} шт.</td></tr>`).join("")}</tbody></table>${FINAL.includes(o.st) && o.st !== 40 ? '<p class="hint">Количества сохранены как в заказе; остаток возвращён на склад филиала.</p>' : ""}</div>`;
  return shell("list", `<div class="apanel"><span class="back3" data-nav="list">‹ Заказы</span><h1>Заказ №${o.n} ${stHead(o.st)}</h1>${vbar}
    <div class="dl3">${kv.map(x => `<div><span>${x[0]}</span>${x[1]}</div>`).join("")}</div>${canc}${pb}${cl}${abar}
    <div class="sec3"><div class="row"><h3 style="margin:0">Журнал заказа</h3><span class="seg"><span data-mg="0" class="${S.merged ? "" : "on"}">Раздельно</span><span data-mg="1" class="${S.merged ? "on" : ""}">Вместе по времени</span></span></div></div>
    ${S.merged ? `<div style="margin-top:10px">${logs}</div>` : logs}${adm}${items}</div>`);
}

// ---------- problem list (OL-A2) ----------
function probView() {
  const P = S.pf;
  const rows = S.o.filter(o => o.prob && (!P.m || o.m === P.m) && (!P.t.length || P.t.includes(o.prob.t))).sort((a, b) => pt(a.prob.since) - pt(b.prob.since));
  const dem = `<div class="dem"><b>демо:</b>${S.demoRefuse != null ? `<label><input type="checkbox" id="dnc" ${S.demoNoCancel ? "checked" : ""}>Fargo не отменил прежнюю доставку</label>
      <label><input type="checkbox" id="drf" ${S.demoRefuse ? "checked" : ""}>Fargo снова отказал</label>` : ""}${staleDemo()}</div>`;
  const table = rows.length ? `<table class="t3"><thead><tr><th style="width:150px">Заказ</th><th>Способ</th><th>Проблема</th><th style="width:120px">С какого времени</th><th>Продавец</th><th style="width:250px">Действия</th></tr></thead><tbody>
    ${rows.map(o => `<tr class="${S.focus === o.n ? "hl" : ""}"><td><b>№${o.n}</b>${stCell(o.st)}</td><td>${MTH[o.m]}</td><td><b style="font-weight:600">${esc(probText(o))}</b><div class="mut">${esc(o.prob.det || "")}</div>${o.retryOk ? '<span class="pill g" style="margin-top:4px">Новая попытка разрешена</span>' : ""}</td>
      <td class="small">${o.prob.since}<div class="mut">${ago(o.prob.since)}</div></td><td>${SEL[BRN[o.br][1]][0]}<div class="mut">${BRN[o.br][0]}</div></td>
      <td><div class="ra">${probActs(o).map(k => abtn(k, o.n, true)).join("")}<button class="btn link sm" data-open="${o.n}">Открыть заказ</button></div>${o.m === "yg" && ["exc", "ygnb", "notacc"].includes(o.prob.t) ? '<div class="mut" style="margin-top:4px">Перезаказать Yandex Go может только продавец</div>' : ""}</td></tr>`).join("")}</tbody></table>`
    : `<div class="empty3">${P.m || P.t.length ? "По выбранным фильтрам проблем нет." : "Сейчас нет заказов с проблемами доставки."}${P.m || P.t.length ? ' <button class="btn link sm" id="pclr">Сбросить фильтры</button>' : ""}</div>`;
  return shell("prob", `<div class="apanel"><h1>Проблемы с доставкой <span class="pill r">${S.o.filter(o => o.prob).length}</span></h1>
    <div class="fbar"><select class="inp" id="pm"><option value="">Способ доставки: все</option>${MORD.map(k => `<option value="${k}" ${P.m === k ? "selected" : ""}>${MTH[k]}</option>`).join("")}</select><span class="hint">сначала самые старые · найдено: ${rows.length}</span></div>
    <div class="chips" style="margin-bottom:14px"><span class="hint">Тип проблемы:</span>${PT_ORDER.map(t => `<span class="chipt ${P.t.includes(t) ? "on" : ""}" data-pt="${t}">${PT[t]}</span>`).join("")}</div>
    ${dem}${table}</div>`);
}

// ---------- admin action log (OL-A4) ----------
function logSt(l) { return l.fr == null ? "—" : l.to == null ? `${stName(l.fr)} <span class="mut">(без изменения)</span>` : `${stName(l.fr)} → <b>${stName(l.to)}</b>`; }
function logView() {
  const L = S.lf;
  const iso = t => t.slice(6, 10) + "-" + t.slice(3, 5) + "-" + t.slice(0, 2);
  const rows = LOG.filter(l => (!L.a || l.a === L.a) && (!L.act || l.act === L.act) && (!L.from || iso(l.t) >= L.from) && (!L.to || iso(l.t) <= L.to)).sort((a, b) => pt(b.t) - pt(a.t));
  const admins = [...new Set(LOG.map(l => l.a))];
  return shell("log", `<div class="apanel"><h1>Журнал действий администраторов</h1>
    <div class="fbar"><select class="inp" id="la"><option value="">Администратор: все</option>${admins.map(a => `<option ${L.a === a ? "selected" : ""}>${a}</option>`).join("")}</select>
      <select class="inp" id="lact"><option value="">Действие: все</option>${ACTS.map(a => `<option ${L.act === a ? "selected" : ""}>${a}</option>`).join("")}</select>
      <span class="dr3">Дата: с <input type="date" class="inp" id="lfrom" value="${L.from}" max="2026-10-27"> по <input type="date" class="inp" id="lto" value="${L.to}" max="2026-10-27"></span>${L.a || L.act || L.from || L.to ? '<button class="btn link sm" id="lclr">Сбросить</button>' : ""}<span class="hint">Найдено: ${rows.length} · записи нельзя изменить или удалить</span></div>
    ${rows.length ? `<table class="t3"><thead><tr><th>Время</th><th>Администратор</th><th>Заказ</th><th>Действие</th><th>Статус: было → стало</th><th>Комментарий</th></tr></thead><tbody>
      ${rows.map(l => `<tr class="${l.nw ? "nw" : ""}"><td class="small">${l.t}${l.nw ? '<div class="mut">в этой сессии</div>' : ""}</td><td>${l.a} <span class="mut">(admin)</span></td><td>${ord(l.n) ? `<a href="#" data-open="${l.n}">№${l.n}</a>` : "№" + l.n}</td><td>${l.act}</td><td class="small">${logSt(l)}</td><td class="small">${l.c ? esc(l.c) : '<span class="mut">—</span>'}</td></tr>`).join("")}</tbody></table>`
      : '<div class="empty3">Нет действий по выбранным фильтрам.</div>'}</div>`);
}

// ---------- render and bind ----------
function render() {
  const v = S.v;
  $("#app").innerHTML = v === "order" ? orderView() : v === "prob" ? probView() : v === "log" ? logView() : listView();
  bind();
}
function bind() {
  const all = (sel, f) => document.querySelectorAll(sel).forEach(f);
  const on = (id, ev, f) => { const e = $("#" + id); if (e) e[ev] = f; };
  all("[data-nav]", x => x.onclick = () => { S.v = x.dataset.nav; S.stOpen = false; render(); });
  all("[data-open]", x => x.onclick = e => { e.preventDefault(); if (e.target.closest("[data-act]")) return; S.cur = x.dataset.open; S.v = "order"; render(); });
  all("[data-act]", x => x.onclick = e => { e.stopPropagation(); doAct(x.dataset.act, x.dataset.n); });
  all("[data-var]", x => x.onclick = () => { S.cur = x.dataset.var; render(); });
  all("[data-mg]", x => x.onclick = () => { S.merged = x.dataset.mg === "1"; render(); });
  all("[data-pt]", x => x.onclick = () => { const t = x.dataset.pt, a = S.pf.t; a.includes(t) ? a.splice(a.indexOf(t), 1) : a.push(t); S.focus = null; render(); });
  all("[data-st]", x => x.onchange = () => { const c = +x.dataset.st, a = S.f.st; x.checked ? a.push(c) : a.splice(a.indexOf(c), 1); render(); });
  on("stbtn", "onclick", () => { S.stOpen = !S.stOpen; render(); });
  on("stok", "onclick", () => { S.stOpen = false; render(); });
  on("stclr", "onclick", () => { S.f.st = []; render(); });
  on("fm", "onchange", e => { S.f.m = e.target.value; render(); });
  on("fb", "onchange", e => { S.f.br = e.target.value; render(); });
  on("fp", "onchange", e => { S.f.pr = e.target.checked; render(); });
  const clr = () => { S.f = { st: [], m: "", br: "", pr: false }; S.stOpen = false; render(); };
  on("fclr", "onclick", clr); on("fclr2", "onclick", clr);
  on("pm", "onchange", e => { S.pf.m = e.target.value; render(); });
  on("pclr", "onclick", () => { S.pf = { m: "", t: [] }; render(); });
  on("drf", "onchange", e => { S.demoRefuse = e.target.checked; });
  on("fgref", "onchange", e => { S.fgRefuse = e.target.checked; });
  on("la", "onchange", e => { S.lf.a = e.target.value; render(); });
  on("lact", "onchange", e => { S.lf.act = e.target.value; render(); });
  on("lfrom", "onchange", e => { S.lf.from = e.target.value; render(); });
  on("lto", "onchange", e => { S.lf.to = e.target.value; render(); });
  on("lclr", "onclick", () => { S.lf = { a: "", act: "", from: "", to: "" }; render(); });
  on("dnc", "onchange", e => { S.demoNoCancel = e.target.checked; });
  on("stale", "onchange", e => { S.stale = e.target.checked; });
  on("rep", "onclick", () => { const l = S.last; toast(`Повторный запрос «${l.act}» по заказу №${l.n}: ошибки нет, заказ не изменился, второй записи в истории и журнале нет.`); });
}

// ---------- dialogs ----------
// opts: { title, sub, label, req, reqErr, okText, okCls, noText, onOk(comment) -> string error to show, or nothing to close }
function dlg(op) {
  const m = modal(`<div class="o3m"><h3>${op.title}</h3>${op.sub ? `<p class="sub">${op.sub}</p>` : ""}${op.box ? `<div class="box3">${op.box}</div>` : ""}
    ${op.label ? `<label class="fl">${op.label}</label><textarea class="inp" id="dc" maxlength="500" rows="3"></textarea><div class="row" style="justify-content:space-between"><span class="err-t" id="de"></span><span class="cntr" id="dn">0 / 500</span></div>` : ""}
    <div id="dres"></div><div class="acts"><button class="btn out" id="dno">${op.noText || "Назад"}</button><button class="btn ${op.okCls || "pri"}" id="dok">${op.okText}</button></div></div>`);
  const ta = $("#dc", m);
  if (ta) { ta.focus(); ta.oninput = () => { $("#dn", m).textContent = ta.value.length + " / 500"; ta.classList.remove("err"); $("#de", m).textContent = ""; }; }
  $("#dno", m).onclick = closeModal;
  $("#dok", m).onclick = () => {
    const v = ta ? ta.value.trim() : "";
    if (op.req && !v) { ta.classList.add("err"); $("#de", m).textContent = op.reqErr; return; }
    if (S.stale && !op.noStale) { $("#dres", m).innerHTML = `<div class="alert e"><span class="ic">!</span><div>Статус заказа изменился. Обновите страницу.<div class="ra"><button class="btn out sm" id="drl">Обновить</button></div></div></div>`;
      $("#drl", m).onclick = () => { closeModal(); S.stale = false; render(); toast("Заказ загружен заново."); }; return; }
    const err = op.onOk(v);
    if (err) { $("#dres", m).innerHTML = `<div class="alert e"><span class="ic">!</span><div>${err}</div></div>`; return; }
    closeModal();
  };
}
function addLog(o, act, fr, to, c) { LOG.unshift({ t: ft(CLK), a: ME, n: o.n, act, fr, to, c, nw: true }); if (act !== "Написать продавцу") S.last = { n: o.n, act }; }
function staleDemo() {
  return `<label style="margin-left:8px"><input type="checkbox" id="stale" ${S.stale ? "checked" : ""}>другой администратор уже изменил заказ</label>${S.last ? `<button id="rep">повторить последний запрос</button>` : ""}`;
}
function setSt(o, to, src, c) { const t = nowS(); o.h.push([t, o.st, to, "a:" + ME, src, c]); const fr = o.st; o.st = to; o.closed = null; return [t, fr]; }
function corrDlg(o, to, actName, after, txt) {
  dlg({ title: txt ? txt[0] : `Изменить статус на «${stFull(to)}»?`, sub: txt ? txt[1] : "Используйте, только если служба доставки не обновила заказ.", box: `Заказ №${o.n} · ${MTH[o.m]} · сейчас ${stFull(o.st)}`,
    label: "Комментарий (обязательно)", req: true, reqErr: "Напишите, почему меняете статус.", okText: actName, okCls: "pri",
    onOk: c => { const [t, fr] = setSt(o, to, "K", c); addLog(o, actName, fr, to, c); after(c, t, fr); render(); } });
}
function doAct(k, n) {
  const o = ord(n);
  if (k === "cancel") return dlg({ title: `Отменить заказ №${o.n}?`, sub: "Покупатель увидит «Заказ отменён» и комментарий, если он есть; кто отменил, покупатель не видит. Остаток вернётся на склад филиала.",
    box: `${MTH[o.m]} · ${stFull(o.st)} → <b>46 CancelledByAdmin · Отменён Optom</b>`, label: "Комментарий (необязательно)", okText: "Отменить заказ", okCls: "danfill", noText: "Не отменять",
    onOk: c => {
      if (isCarrier(o) && S.fgRefuse && o.m === "fg") { o.ev.push([nowS(), "cancel_refused", null, o.fid]); return `Этот заказ уже нельзя отменить.<br>${carrierName(o)}: курьер уже забрал посылку.`; }
      const [t, fr] = setSt(o, 46, "A", c); o.cb = "Администратор"; o.cbw = ME; o.cr = "AdminCancelled"; o.cc = c; o.cat = t; o.prob = null;
      addLog(o, "Отменить заказ", fr, 46, c); render();
      toast(`Заказ №${o.n} отменён: 46 CancelledByAdmin.${isCarrier(o) && [20, 25, 24, 55, 60, 30].includes(fr) && o.fid ? " Бронь Fargo отменена." : ""} Покупатель и продавец получили уведомление.`);
    } });
  if (k === "resend") return dlg({ title: "Отправить заказ в Fargo заново?", sub: "Fargo рассчитает новую цену; покупатель не доплачивает.", label: "Комментарий (обязательно)", req: true, reqErr: "Напишите комментарий.", noText: "Назад",
    box: `${stFull(o.st)} → 25 Processing, если Fargo примет заказ<br>${[24, 60].includes(o.st) && o.fid ? `Сначала Fargo отменит прежнюю доставку <span class="mono">${o.fid}</span>, затем примет новую. Прежний FargoOrderId останется в истории и событиях.` : "Брони Fargo по заказу сейчас нет — отменять нечего."}`, okText: "Отправить заново",
    onOk: cm => {
      const prev = [24, 60].includes(o.st) && o.fid;
      if (prev && S.demoNoCancel) { o.ev.push([nowS(), "cancel_refused", null, o.fid]); render(); return "Fargo не отменил прежнюю доставку: курьер уже в пути. Новая доставка не заказана, заказ не изменился."; }
      if (prev) o.ev.push([nowS(), "cancelled", null, o.fid]);
      if (S.demoRefuse) {
        const [t, fr] = setSt(o, 55, "A", "Отправлено заново; Fargo отказал: delivery_rejected. " + cm); o.ev.push([t, "delivery_rejected", 55]); o.prob = { t: "notacc", since: t, det: "После «Отправить заново»: delivery_rejected" }; o.fid = null;
        addLog(o, "Отправить заново", fr, 55, "Fargo отказал: delivery_rejected. " + cm); S.focus = o.n;
        if (S.pf.t.length && !S.pf.t.includes("notacc")) S.pf.t.push("notacc"); // keep the row visible under the active type filter
        render(); toast("Fargo снова отказал: заказ в 55 FargoDoesNotAcceptOrder и остаётся в списке."); return;
      }
      const old = prev || null, nf = "FG-55" + String(13000 + Math.floor(Math.random() * 900)); o.fid = nf;
      const c = `Новый FargoOrderId ${nf}${old ? ` (был ${old})` : ""}`;
      const [t, fr] = setSt(o, 25, "A", `Отправлено заново. ${c}. ${cm}`); o.ev.push([t, "accepted", 25, nf]); o.prob = null; o.bst = null;
      addLog(o, "Отправить заново", fr, 25, `${c}. ${cm}`); render(); toast(`Fargo принял заказ: 25 Processing. ${c}. Строка убрана из списка.`);
    } });
  const stb = [24, 26, 55, 60].includes(o.st);
  if (k === "resolve") return dlg({ title: `Решено: заказ №${o.n}`, sub: o.prob.t === "part" ? "Статус заказа не изменится. Автозавершение возобновится."
      : stb ? `Строка закроется, статус останется ${stName(o.st)}: покупатель по-прежнему видит «Проблема с доставкой», продавец — во вкладке «Проблемные». Строка вернётся при новом событии проблемы или если статус не изменится за 24 часа.` : `Статус заказа не изменится (${stName(o.st)}). Строка уйдёт из списка.`,
    box: esc(probText(o)) + (o.prob.det ? `<div class="mut">${esc(o.prob.det)}</div>` : ""), label: "Комментарий (обязательно)", req: true, reqErr: "Напишите комментарий.", okText: "Решено", okCls: "pri",
    onOk: c => {
      const part = o.prob.t === "part", t = nowS(); addLog(o, "Решено", o.st, null, `${probText(o)}: ${c}`);
      if (stb) o.closed = { st: o.st, p: probText(o), at: t, by: ME, until: ft(pt(t) + 864e5) };
      o.prob = null; render();
      toast(part ? `Проблема закрыта. Автозавершение возобновлено: заказ завершится ${o.due.slice(0, 10)} в 23:59.` : stb ? "Строка закрыта; вернётся, если статус не изменится за 24 часа." : "Проблема закрыта, статус заказа не изменился.");
    } });
  if (k === "back") return corrDlg(o, 25, "Вернуть в обработку", () => { o.bst = "В пути"; toast("Статус изменён: 30 → 25 Processing. Покупатель по-прежнему видит «В пути»."); },
    ["Вернуть заказ в статус «В обработке»?", "Используйте, только если продавец отметил отправку по ошибке."]);
  if (k === "returned") return corrDlg(o, 50, "Посылка вернулась", (c, t) => { o.cb = "Система"; o.cr = "ReturnedToSender"; o.cc = c; o.cat = t; o.prob = null; toast("50 Refunded — финальный статус. Возврат денег покупателю — по правилам возвратов."); });
  if (k === "notdel") return corrDlg(o, 30, "Не доставлен", (c, t) => { o.prob = { t: "disp", since: t, det: `30 Shipped — установил ${ME} (администратор): ${c}` }; toast("Статус изменён: 35 → 30 Shipped. Автозавершение остановлено; заказ в «Проблемы с доставкой»: «Доставка оспорена»."); });
  if (k === "markdel") return corrDlg(o, 35, "Отметить доставленным", (c, t) => { o.prob = null; o.dlv = t; o.due = dueAfter(t); o.bst = null; toast(`35 Delivered. Покупатель получил уведомление о доставке; заказ завершится автоматически ${o.due.slice(0, 10)} в 23:59.`); });
  if (k === "retry") return dlg({ title: `Разрешить новую попытку доставки по заказу №${o.n}?`, sub: "Продавец снова сможет отправить заказ (24 OnHold → 30 Shipped). Статус сейчас не изменится.", label: "Комментарий (необязательно)", okText: "Разрешить",
    onOk: c => { nowS(); o.retryOk = true; addLog(o, "Разрешить новую попытку", o.st, null, c); render(); toast("Продавец может начать новую попытку доставки."); } });
  if (k === "msg") return dlg({ title: `Сообщение продавцу ${SEL[BRN[o.br][1]][0]}`, sub: `По заказу №${o.n}. Сообщение придёт в чат продавца.`, label: "Сообщение", req: true, reqErr: "Напишите сообщение.", okText: "Отправить", noStale: true,
    onOk: c => { nowS(); addLog(o, "Написать продавцу", null, null, c); render(); toast("Сообщение отправлено в чат продавца."); } });
}

// ---------- scenarios ----------
const VARS = [["68731204", "Fargo · 25"], ["68730877", "Доставка продавцом · 30"], ["68729340", "Fargo · 26"], ["68728815", "Fargo · 35"], ["68725102", "Самовывоз · 40"], ["68731590", "Yandex Go · 45"]];
harness({ title: "P-OL3 Admin: orders, problems and actions", stories: "US-AF-2.1-03 · US-BF-6.5-04/05", version: "1.0" }, [
  { label: "Orders list: codes, names and filters", apply: () => reset(),
    notes: ["Admin orders list (US-AF-2.1-03, US-BF-6.5-04): every row shows the status code, the name in the code and the admin label, e.g. «45 CancelledBySeller · Отменён продавцом» (PRD 4.2). The admin wording of 45, 26 and 50 is neutral; the seller's own wording («Отменён вами», «Возвращается к вам», «Вернулся к вам») is shown on the order page.",
      "Filters work on the example data (OL-A1): status multi-select listing every code with its name and label (grouped: main path, problems, cancellations, old orders), method (Самовывоз · Доставка продавцом · Yandex Go · Fargo), branch, «Есть проблема».",
      "The red «Проблема» marker appears on every order that has an open row in «Проблемы с доставкой», including problems without a status change (Yandex Go not booked, seller-delivery overdue, unknown status ⚑, partly delivered ⚑).",
      "«Ожидается» uses the per-method ranges of PRD 4.8 (M-OL22); final statuses show «—». Click a row to open the order."],
    src: "Order lifecycle PRD 4.1, 4.2, 4.8, 5.3 (OL-A1) · admin screens not designed: DR-OL1, DR-OL7" },
  { label: "Order page: history, events and named actions", apply: () => reset({ v: "order", cur: "68731204", variants: VARS }),
    notes: ["Order header with code + name + label, method, branch, buyer, seller, and what the buyer and the seller see (US-AF-2.1-03, US-BF-6.5-05, OL-A1). Cancelled orders show CancelledBy, CancelReason and the comment (OL-A5): switch to «Yandex Go · 45».",
      "History (time, from → to, who + role, source, comment) and carrier events (time, carrier, carrier code, plain sentence, «→ status» when mapped) are separate; «Вместе по времени» merges them (PRD 4.9).",
      "Named actions only, per status and method (OL-A3; no status dropdown, no editable fields, DR-OL7 ⚑ OQ-OL12): Fargo 25 → cancel (try «демо: Fargo отказал в отмене» for M-OL13 + reason, E-OL12); seller delivery 30 → cancel and «Вернуть в обработку» (own dialog text, required comment, empty → M-OL28; buyer stays «В пути»); Fargo 26 → «Посылка вернулась»; 35 → «Не доставлен»; 40 and 45 → no actions. «Написать продавцу» (existing) is always there.",
      "When cancel is not offered, the action bar says exactly one of: «Посылка возвращается к продавцу — отменить нельзя.» (26), «Заказ у курьера — отменить нельзя.» (30), «Заказ доставлен — оформляется возврат.» (35), «Заказ завершён или отменён.» (final). Admin cancel in 30 for Fargo / Yandex Go only while «Доставка оспорена» is open.",
      "Stale screen: tick «другой администратор уже изменил заказ» and confirm any action → M-OL33, nothing changes (E-OL13, NFR-OL2). «повторить последний запрос» shows that repeating a successful action gives no error and writes nothing twice (NFR-OL4).",
      "Cancel = M-OL9/M-OL10/M-OL11 with an optional comment ≤ 500 → 46 CancelledByAdmin (AS-OL7, X8). Corrections = M-OL27 with a required comment; empty → M-OL28 (BR-OL9). Every action lands in «Действия администраторов по заказу» and the action log (OL-A4)."],
    src: "PRD 4.2, 4.4, 4.5, 4.9, 5.3 (OL-A1, OL-A3 – OL-A5) · DR-OL7 ⚑ OQ-OL12" },
  { label: "Problem list «Проблемы с доставкой»", apply: () => reset({ v: "prob" }),
    notes: ["One admin list for every method (US-AF-2.1-03, OL-A2, OL6): order, method, problem, since when and for how long, seller; oldest first; filters by method and problem type.",
      "12 rows, one of each type of PRD 4.6: 24 / 60 / 55 Fargo («Отправить заново», cancel), 55 and 60 Yandex Go and «не забронирован» (cancel only; re-booking stays with the seller, YG-S10), seller delivery 24 «Не удалось доставить» («Разрешить новую попытку» from the Seller delivery PRD, cancel) and «Просрочен» (cancel), 26 returning («Посылка вернулась», no cancel), unknown status ⚑ and partly delivered ⚑ («Решено» only), delivery disputed («Отметить доставленным», cancel).",
      "Every row has «Решено» (M-OL36, required comment, no status change) and «Открыть заказ». A row leaves the list when the order moves on, is cancelled or is resolved.",
      "«Решено» on a status-based problem (24, 26, 55, 60) closes the row but keeps the status: the buyer still sees «Проблема с доставкой», the seller keeps it in «Проблемные», and the row re-opens on the next problem event or after 24 hours in the same status (toast; the order page shows until when)."],
    src: "PRD 4.6, 5.3 (OL-A2), BR-OL15 · not designed" },
  { label: "Fargo problem: send again, cancel or resolved", apply: () => reset({ v: "prob", pf: { m: "", t: ["exc"] }, demoRefuse: false, focus: "68730122" }),
    notes: ["Filtered to «Ошибка доставки»: the Fargo row (60 FargoException) has «Отправить заново», the Yandex Go row does not (US-AF-2.1-03, PRD 4.6).",
      "For 24 and 60, «Отправить заново» first cancels the previous Fargo booking; tick «Fargo не отменил прежнюю доставку» to get «Fargo не отменил прежнюю доставку: курьер уже в пути» — nothing booked, order unchanged. For 55 there is nothing to cancel.",
      "«Отправить заново» → confirmation with a required comment (PRD 4.5; empty → «Напишите комментарий.») → 25 Processing with a new FargoOrderId; the old one stays in the history and the events (open the order); the row leaves the list. Tick «Fargo снова отказал» first to get 55 FargoDoesNotAcceptOrder instead: the row stays with «Служба доставки не приняла заказ».",
      "«Отменить заказ» (optional comment) → 46 CancelledByAdmin, row removed (X8). «Решено» needs a comment (M-OL36), closes the row, status unchanged.",
      "⚑ OQ-OL42: who pays when the new Fargo price is higher than what the buyer paid is open (proposed: the seller). The screen only says the buyer does not pay more."],
    src: "PRD 4.5, 4.6 · ⚑ OQ-OL42" },
  { label: "Unknown carrier status and partly delivered ⚑", apply: () => reset({ v: "prob", pf: { m: "", t: ["unk", "part"] } }),
    notes: ["⚑ OQ-OL9: an unknown Fargo status keeps the order status (30 Shipped), the event is stored, and a row «Неизвестный статус от Fargo: courier_lost_signal» (M-OL30) is added (US-AF-2.1-03, US-BF-6.5-05, OL-P9). «Открыть заказ» shows the stored event with «статус не изменён».",
      "⚑ OQ-OL31: Fargo partial_complete moves the order to 35 Delivered and opens «Доставлен частично»; automatic completion is paused while the row is open (K7).",
      "«Решено» on the partly-delivered row resumes completion: the order completes at the later of the original due time (29.10.2026 23:59) and the closing time (PRD 4.7, ⚑ OQ-OL29). The buyer may still request a return."],
    src: "PRD 4.6, 4.7, 4.9 · ⚑ OQ-OL9, OQ-OL31" },
  { label: "Returning parcel: «Посылка вернулась» (26 → 50)", apply: () => reset({ v: "order", cur: "68729340" }),
    notes: ["26 ReturnInProgress (Fargo): no cancel button; the action bar says «Посылка возвращается к продавцу — отменить нельзя.» (US-AF-2.1-03, PRD 4.4, AS-OL7).",
      "«Посылка вернулась» opens the correction dialog M-OL27 with a required comment (empty → M-OL28) → 50 Refunded, final; CancelledBy = Система, CancelReason ReturnedToSender (PRD 11); the history row has Source «Корректировка» and the admin's name.",
      "The refund to the buyer follows the Returns and refunds PRD; this prototype does not show the money side."],
    src: "PRD 4.4, 4.5, 4.6" },
  { label: "Delivery disputed (35 → 30)", apply: () => reset({ v: "prob", pf: { m: "", t: ["disp"] }, focus: "68730402" }),
    notes: ["The seller corrected a Yandex Go order 35 → 30 «Не доставлен» because the buyer said it did not arrive; the row «Доставка оспорена» shows the seller's correction line (M-OL29) (US-AF-2.1-03, PRD 4.5).",
      "Actions: «Отметить доставленным» → 35 Delivered with a required comment (M-OL27 / M-OL28), new DeliveredAt and completion date; «Отменить заказ» → 46 CancelledByAdmin; «Решено» (M-OL36) keeps 30.",
      "Cancel in 30 for a Yandex Go order is offered only on this problem (PRD 4.6), although 4.4 allows the admin to cancel in 30 only for seller delivery."],
    src: "PRD 4.5, 4.6, 13.1" },
  { label: "Admin action log", apply: () => reset({ v: "log" }),
    notes: ["Log of admin actions on orders (US-AF-2.1-03, OL-A4, BR-OL14): time, admin, order, action, status from → to, comment; filters by admin, by action and by date (from – to, both inclusive).",
      "Example entries cover every action of the scenarios above (cancel, send again, back to processing, parcel returned, not delivered, mark delivered, allow a new attempt, resolved, message to the seller). Actions you take in the other scenarios are added on top, marked «в этой сессии».",
      "Entries are read-only. The same entries appear on the order page under «Действия администраторов по заказу»."],
    src: "PRD 5.3 (OL-A4), 9 (BR-OL14) · not designed" },
]);
