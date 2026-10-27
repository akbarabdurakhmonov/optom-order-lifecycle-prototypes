// Prototype harness: scenario picker, notes panel, toasts, icons, seller shell
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const som = n => Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ") + " сум";
const ICON = {
  chart: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8"/></svg>',
  list: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M16 11a3 3 0 1 0 0-6M21 20c0-2-1.5-4-4-4.6"/></svg>',
  store: '<svg viewBox="0 0 24 24"><path d="M3 9l2-5h14l2 5M4 9v11h16V9M3 9h18M9 20v-6h6v6"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></svg>',
  truck: '<svg viewBox="0 0 24 24"><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2z"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  card: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
  msg: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  side: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>',
};
const LOGO = '<span class="logo"><svg width="34" height="34" viewBox="0 0 34 34"><rect x="12" y="2" width="10" height="30" rx="3" fill="#00a028"/><rect x="2" y="8" width="30" height="5" rx="2.5" fill="#00a028"/><rect x="2" y="15" width="30" height="5" rx="2.5" fill="#00a028"/><rect x="2" y="22" width="30" height="5" rx="2.5" fill="#00a028"/><rect x="15" y="9" width="4" height="17" rx="1" fill="#fff"/></svg>optom</span>';
const YG = '<span class="yglogo">Yandex <i>Go</i></span>';
const FARGO = '<span style="font-weight:800;font-style:italic;letter-spacing:-.5px"><span style="color:#e3262e">◤</span> FARGO</span>';

function sellerShell(active, crumbs, content) {
  const nav = (k, ic, t) => `<div class="nav ${active === k ? "on" : ""}">${ICON[ic]}${t}</div>`;
  return `<div class="shell"><aside class="side">${LOGO}
    <div class="grp">Основное</div>${nav("an", "chart", "Аналитика")}${nav("pr", "box", "Товары")}${nav("or", "list", "Заказы")}${nav("ch", "chat", "Чаты")}
    <div class="grp">Организация</div>${nav("em", "users", "Сотрудники")}${nav("br", "store", "Филиалы")}
    <div class="grp">Система</div>${nav("se", "gear", "Настройки")}${nav("ta", "spark", "Тарифы")}
    <div class="me"><span class="ava">НА</span><div><b style="font-weight:600">Николаев А. Д.</b><small>● Подтвержден</small></div></div></aside>
    <main class="main"><div class="top"><span class="iconbtn">${ICON.side.replace("<svg", '<svg width="18" height="18" fill="none" stroke="#38383b"')}</span><div class="crumbs">${crumbs}</div><span class="sp"></span><span class="iconbtn">${ICON.bell.replace("<svg", '<svg width="18" height="18" fill="none" stroke="#38383b"')}</span><span class="lang">Русский ▾</span></div>${content}</main></div>`;
}

// ---- harness ----
const H = { scen: [], cur: null, notesOn: false };
function harness(meta, scenarios) {
  H.scen = scenarios;
  const bar = document.createElement("div"); bar.className = "pbar";
  bar.innerHTML = `<b>${esc(meta.title)}</b><span class="tag">${esc(meta.stories)}</span><span class="tag">v${meta.version}</span>
    <span>Scenario:</span><select id="scen">${scenarios.map((s, i) => `<option value="${i}">${i + 1}. ${esc(s.label)}</option>`).join("")}</select>
    <button id="reset" title="Reset the current scenario">↺ Reset</button><span class="sp"></span>
    <span style="color:#9aa1ab">Prototype · RU UI · notes in English</span>
    <button id="ntoggle">Notes for this state</button>`;
  document.body.prepend(bar);
  const notes = document.createElement("div"); notes.className = "notes"; notes.id = "notes"; document.body.append(notes);
  $("#scen").onchange = e => go(+e.target.value);
  $("#reset").onclick = () => go(+$("#scen").value);
  $("#ntoggle").onclick = () => { H.notesOn = !H.notesOn; notes.classList.toggle("show", H.notesOn); $("#ntoggle").classList.toggle("on", H.notesOn); };
  const q = new URLSearchParams(location.hash.slice(1)), qs = new URLSearchParams(location.search); go(+(q.get("s") || qs.get("s") || 0));
}
function go(i) {
  const s = H.scen[i]; if (!s) return; H.cur = s; $("#scen").value = i; history.replaceState(null, "", "#s=" + i);
  s.apply(); setNotes(s.notes, s.src);
}
function setNotes(list, src) {
  $("#notes").innerHTML = `<h4>What this state shows</h4><ul>${(list || []).map(n => `<li>${n}</li>`).join("")}</ul>${src ? `<div class="src">${src}</div>` : ""}`;
}
let toastT;
function toast(t) { let el = $(".toast"); if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.append(el); } el.textContent = t; el.style.display = "block"; clearTimeout(toastT); toastT = setTimeout(() => el.style.display = "none", 3200); }
function modal(html) { closeModal(); const bg = document.createElement("div"); bg.className = "modal-bg"; bg.id = "mbg"; bg.innerHTML = `<div class="modal">${html}</div>`; document.body.append(bg); return bg; }
function closeModal() { const m = $("#mbg"); if (m) m.remove(); }

// When embedded in a narrow frame (e.g. Confluence iFrame), scale the desktop layout down to fit
(function fitFrame() {
  if (window === window.top) return;
  const apply = () => { const w = document.documentElement.clientWidth; document.documentElement.style.zoom = w < 1280 ? (w / 1280).toFixed(3) : ""; };
  apply(); window.addEventListener("resize", apply);
})();

