// CaseDog demo interactions (simulated, no backend).

// ---- Data ----
const tickets = [];

// Queue cases (also listed in the sidebar). skills: Triage, Investigate, Reply, Repro, Resolution
// skill states: done | fail | run | na
const skillNames = ["Triage", "Investigate", "Reply", "Repro", "Resolution"];
const groups = { review: "Ready to review", stuck: "AI opted out", new: "Not started" };
// Columns: id, priority, title, meta, queue group, skills, next step, assignee, product area, SLA, status
const queueCases = [
  ["#900101", "Urgent", "Agent metrics disappear on proxy-routed hosts after a configuration rollout", "Orchard Sandbox · 10 days open", "review", "done done done run na", "Send reply", "Me", "Agent", "Breaching soon", "Needs review"],
  ["#900103", "High", "Kubernetes checkout logs have service:none while traces use checkout", "Willow Sandbox · 13 days open", "review", "done done run na na", "Draft reply", "Me", "Logs", "On track", "Needs review"],
  ["#900107", "High", "Synthetic browser test fails on a sandbox overlay element", "Cedar Sandbox · 9 days open", "review", "done done done run na", "Send reply", "prabhu.sivakumar", "Synthetics", "On track", "Waiting"],
  ["#900105", "High", "Database Monitoring test replica has metrics but no query samples", "Birch Sandbox · 11 days open", "stuck", "fail run na na na", "Add info", "Me", "DBM", "Breaching soon", "AI blocked"],
  ["#900111", "Normal", "AWS sandbox integration tag investigation cannot complete", "Alder Sandbox · 6 days open", "stuck", "fail run na na na", "Add info", "ronnel.martinez", "Integrations", "On track", "AI blocked"],
  ["#900110", "Normal", "New sandbox case: Lambda tracing overhead needs initial review", "Hazel Sandbox · new", "new", "run na na na na", "Run AI", "jyothsna.kattakinda", "APM", "On track", "Agent working"],
];
const prioClass = { Urgent: "urgent", High: "high", Normal: "" };
queueCases.forEach(([id, prio, title, meta, group, skills, next, assignee, area, sla, status]) => tickets.push({
  id, title, priority: prio, meta, group, skills: skills.split(" "), next, checked: false,
  assignee, area, sla, status, tags: [[prioClass[prio], prio]],
}));

// Sidebar filter groups: field on the ticket -> options
const filterGroups = {
  assignee: { label: "Assignee", options: ["Me", "prabhu.sivakumar", "ronnel.martinez", "jyothsna.kattakinda"] },
  priority: { label: "Priority", options: ["Urgent", "High", "Normal"] },
  area: { label: "Product area", options: ["Agent", "Logs", "APM", "Synthetics", "DBM", "Integrations"] },
  sla: { label: "Customer tier / SLA", options: ["Breaching soon", "On track"] },
  status: { label: "Status", options: ["Needs review", "Agent working", "AI blocked", "Waiting", "Resolved"] },
};
const savedViews = {
  "My open cases": { assignee: ["Me"], status: ["Needs review", "Agent working", "AI blocked", "Waiting"] },
  "Breaching SLA": { sla: ["Breaching soon"] },
  "Waiting on customer": { status: ["Waiting"] },
  "AI opted out": { status: ["AI blocked"] },
};

const menus = {
  settings: ["Preferences", "Keyboard shortcuts", "Sign out"],
  more: ["Copy ticket link", "Export conversation", "Report a problem"],
  dossier: ["Finding: org 1000428385 has On-Call enabled"],
  mode: ["Assistant", "Investigator", "Writer"],
  max: ["Max mode: on", "Max mode: off"],
};

// ---- Helpers ----
const $ = (s) => document.querySelector(s);
let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2200);
}
let turns = 1;
function addMessage(text, who = "assistant") {
  const div = document.createElement("div");
  div.className = `bubble ${who}`; div.textContent = text;
  $("#thread").append(div);
  if (who === "assistant") $("#turns").textContent = `${++turns} turns · $0`;
  $("#conversation").scrollTop = $("#conversation").scrollHeight;
}

// ---- Filters (sidebar) ----
const filters = {}; // field -> Set of selected options (empty = no filter)
Object.keys(filterGroups).forEach((f) => (filters[f] = new Set()));
const openGroups = new Set(["assignee", "priority"]);
const collapsedStatus = new Set();

function matches(t, skipField) {
  const q = $("#search").value.toLowerCase();
  if (q && !(t.id + " " + t.title).toLowerCase().includes(q)) return false;
  return Object.entries(filters).every(([f, set]) => f === skipField || !set.size || set.has(t[f]));
}
const visible = () => tickets.map((t, i) => [t, i]).filter(([t]) => matches(t));

function renderSidebar() {
  $("#views").innerHTML = Object.keys(savedViews).map((v) => `<button class="view" data-view="${v}">${v}</button>`).join("");
  $("#filters").innerHTML = Object.entries(filterGroups).map(([f, g]) => {
    const open = openGroups.has(f);
    const opts = g.options.map((o) => {
      const n = tickets.filter((t) => t[f] === o && matches(t, f)).length;
      return `<label class="opt"><input type="checkbox" data-filter="${f}" value="${o}" ${filters[f].has(o) ? "checked" : ""}>
        <span>${o}</span><small class="muted">${n}</small></label>`;
    }).join("");
    const active = filters[f].size ? ` <span class="badge">${filters[f].size}</span>` : "";
    return `<div class="fgroup"><button class="fhead" data-group="${f}">${open ? "▾" : "▸"} ${g.label}${active}</button>
      ${open ? `<div class="opts">${opts}</div>` : ""}</div>`;
  }).join("");
  const n = Object.values(filters).reduce((a, s) => a + s.size, 0) + ($("#search").value ? 1 : 0);
  $("#active-count").textContent = n ? `${n} active filter${n > 1 ? "s" : ""}` : "No filters";
  $("#clear-filters").hidden = !n;

  const vis = visible();
  $("#status-list").innerHTML = filterGroups.status.options.map((st) => {
    const rows = vis.filter(([t]) => t.status === st); const closed = collapsedStatus.has(st);
    return `<div class="sgroup"><button class="shead st-${st.split(" ")[0].toLowerCase()}" data-status="${st}">
        ${closed ? "▸" : "▾"} ${st.toUpperCase()} <span class="badge">${rows.length}</span></button>
      ${closed ? "" : rows.map(([t, i]) => `<button class="scase ${i === selected ? "selected" : ""}" data-pick="${i}">
        <small class="id">${t.id}</small> ${t.title}</button>`).join("") || `<p class="muted none">None</p>`}</div>`;
  }).join("");

  const t = tickets[selected];
  $("#toolkit").innerHTML = t ? `<p class="section">TROUBLESHOOTING TOOLKIT · ${t.id}</p><div class="toolkit">
    ${[["Open in Zendesk", `Opening ${t.id} in Zendesk… (demo)`], ["Org in Datadog", `Opening ${t.meta.split(" · ")[0]} org… (demo)`],
       ["Flare analyzer", "No flare attached yet. Ask the customer for one. (demo)"], ["Past similar tickets", `3 similar ${t.area} tickets found (demo)`],
       ["Runbooks / Docs", `Opening ${t.area} troubleshooting docs… (demo)`]]
      .map(([l, m]) => `<button class="btn small" data-toast="${m}">${l}</button>`).join("")}</div>` : "";
  $("#recent").innerHTML = recent.map((i) => `<li><button class="scase" data-pick="${i}"><small class="id">${tickets[i].id}</small> ${tickets[i].title}</button></li>`).join("")
    || `<li class="muted">None yet</li>`;
}
function refresh() { renderSidebar(); renderQueue(); }

$("#search").oninput = refresh;
$("#sidebar").addEventListener("change", (e) => {
  const d = e.target.dataset; if (!d.filter) return;
  filters[d.filter][e.target.checked ? "add" : "delete"](e.target.value); refresh();
});
$("#sidebar").addEventListener("click", (e) => {
  const el = e.target.closest("[data-group],[data-status],[data-pick],[data-view]"); if (!el) return;
  const d = el.dataset;
  if (d.group) { openGroups.has(d.group) ? openGroups.delete(d.group) : openGroups.add(d.group); renderSidebar(); }
  if (d.status) { collapsedStatus.has(d.status) ? collapsedStatus.delete(d.status) : collapsedStatus.add(d.status); renderSidebar(); }
  if (d.pick) selectTicket(+d.pick);
  if (d.view) {
    Object.values(filters).forEach((s) => s.clear()); $("#search").value = "";
    Object.entries(savedViews[d.view]).forEach(([f, vals]) => { vals.forEach((v) => filters[f].add(v)); openGroups.add(f); });
    refresh(); toast(`View: ${d.view}`);
  }
});
$("#clear-filters").onclick = () => { Object.values(filters).forEach((s) => s.clear()); $("#search").value = ""; refresh(); };
$("#hide-filters").onclick = () => {
  const hidden = $("#sidebar").classList.toggle("collapsed");
  $("#hide-filters").textContent = hidden ? "⇥" : "⇤ Hide filters";
  $("#hide-filters").title = hidden ? "Show filters" : "";
};

// ---- Selection ----
let selected = -1;
const recent = []; // last 5 viewed ticket indexes
function selectTicket(i) {
  selected = i; const t = tickets[i];
  recent.splice(0, recent.length, i, ...recent.filter((r) => r !== i).slice(0, 4));
  $("#head-label").textContent = "Ticket";
  $("#head-id").textContent = t.id; $("#head-subject").textContent = t.title;
  $("#head-tags").innerHTML = t.tags.map(([c, l]) => `<span class="tag ${c}">${l}</span>`).join(" ") + ` <span class="tag">${t.status}</span>`;
  $("#thread").innerHTML = "";
  refresh();
}

// ---- Queue matrix ----
const icons = { done: "✓", fail: "✕", run: "+", na: "–" };
const nextClass = { "Send reply": "ok", "Draft reply": "primary", "Add info": "", "Run AI": "primary" };
function renderQueue() {
  let html = ""; const vis = visible();
  $("#open-count").textContent = `${vis.length} open`;
  for (const [g, label] of Object.entries(groups)) {
    const rows = vis.filter(([t]) => t.group === g);
    html += `<tr class="group"><td colspan="8"><b>${label}</b></td>
      <td class="next"><button class="btn small" data-selectall="${g}">Select all</button></td></tr>`;
    html += rows.map(([t, i]) => `
      <tr class="case ${i === selected ? "selected" : ""}" data-row="${i}">
        <td><input type="checkbox" data-check="${i}" ${t.checked ? "checked" : ""}></td>
        <td><span class="prio ${prioClass[t.priority]}">${t.priority}</span></td>
        <td><b>${t.title}</b><br><small class="muted">${t.id} · ${t.meta}</small></td>
        ${t.skills.map((s, k) => `<td><span class="cell ${s}" data-cell="${i}:${k}">${icons[s]}</span></td>`).join("")}
        <td class="next"><button class="btn small ${nextClass[t.next]}" data-next="${i}">${t.next}</button></td>
      </tr>`).join("") || `<tr><td colspan="9" class="muted none">No matching cases</td></tr>`;
  }
  $("#queue-body").innerHTML = html;
}
$("#queue-body").onclick = (e) => {
  const d = e.target.dataset;
  if (d.check !== undefined) { tickets[d.check].checked = e.target.checked; return; }
  if (d.selectall) {
    const rows = visible().map(([t]) => t).filter((t) => t.group === d.selectall);
    const all = rows.every((t) => t.checked); rows.forEach((t) => (t.checked = !all));
    renderQueue(); return toast(`${all ? "Cleared" : "Selected"} ${rows.length} in ${groups[d.selectall]}`);
  }
  if (d.cell) {
    const [i, k] = d.cell.split(":").map(Number); const t = tickets[i];
    if (t.skills[k] === "na") return toast(`${skillNames[k]} isn't available yet for ${t.id}`);
    if (t.skills[k] !== "done") { t.skills[k] = "done"; toast(`${skillNames[k]} ran for ${t.id} (simulated)`); }
    else toast(`Jumping to ${skillNames[k]} for ${t.id}`);
    return selectTicket(i);
  }
  if (d.next) {
    const t = tickets[d.next]; const k = t.skills.indexOf("run");
    if (k >= 0) t.skills[k] = "done";
    toast(`${t.next}: done for ${t.id} (simulated)`); return selectTicket(+d.next);
  }
  const row = e.target.closest("[data-row]"); if (row) selectTicket(+row.dataset.row);
};

// ---- Dropdown menus ----
const dd = $("#dropdown");
function openMenu(btn, key) {
  dd.innerHTML = menus[key].map((m) => `<button data-item="${m}">${m}</button>`).join("");
  const r = btn.getBoundingClientRect();
  dd.style.top = `${r.bottom + 4}px`;
  dd.style.left = `${Math.min(r.left, innerWidth - 240)}px`;
  dd.dataset.key = key; dd.hidden = false;
}
dd.onclick = (e) => {
  const item = e.target.dataset.item; if (!item) return;
  const key = dd.dataset.key; dd.hidden = true;
  if (key === "mode") { $("#mode-chip").textContent = `${item} ▾`; toast(`Mode: ${item}`); }
  else toast(item);
};

// ---- Global click handling (data attributes) ----
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-menu],[data-toast],[data-reply]");
  if (!dd.contains(e.target) && !(el && el.dataset.menu)) dd.hidden = true;
  if (!el) return;
  const d = el.dataset;
  if (d.menu) { if (!dd.hidden && dd.dataset.key === d.menu) dd.hidden = true; else openMenu(el, d.menu); }
  if (d.toast) toast(d.toast);
  if (d.reply) addMessage(d.reply);
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") dd.hidden = true; });

// ---- Composer ----
function send() {
  const text = $("#input").value.trim(); if (!text) return;
  addMessage(text, "user"); $("#input").value = "";
  setTimeout(() => addMessage(`Got it. Looking into "${text}" for ${tickets[selected]?.id ?? "your queue"}… (canned demo reply)`), 500);
}
$("#send").onclick = send;
$("#input").onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
$("#rephrase").onclick = () => {
  const i = $("#input"); if (!i.value.trim()) return toast("Type something to rephrase.");
  i.value = `Could you please ${i.value.trim().replace(/^./, (c) => c.toLowerCase())}`; toast("Rephrased");
};

// ---- Theme ----
$("#theme-toggle").onclick = () => {
  const dark = document.body.classList.toggle("dark");
  $("#theme-toggle").textContent = dark ? "☀" : "☾";
};

refresh();
