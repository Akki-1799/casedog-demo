(() => {
// Demo-only MCP dropdown. Edit the list below; status: connected | disconnected | auth
const mcps = [
  { name: "SupportDog", status: "auth" },
  { name: "Atlassian", status: "auth" },
  { name: "Datadog", status: "connected" },
  { name: "Slack", status: "connected" },
  { name: "Google Workspace", status: "disconnected" },
  { name: "Zendesk", status: "disconnected" },
];
const labels = { connected: "Connected", disconnected: "Not connected", auth: "Needs auth" };
const $ = (id) => document.getElementById(id);

function render() {
  $("mcp-count").textContent = `${mcps.filter((m) => m.status === "connected").length}/${mcps.length}`;
  $("mcp-list").innerHTML = mcps.map((m, i) => `
    <li><span class="dot ${m.status}"></span><span class="name">${m.name}</span>
      <small>${labels[m.status]}</small>
      ${m.status === "connected" ? "" : `<button class="btn" data-i="${i}">${m.status === "auth" ? "Authenticate" : "Connect"}</button>`}
    </li>`).join("");
}

$("mcp-trigger").onclick = () => { $("mcp-menu").hidden = !$("mcp-menu").hidden; };
$("mcp-list").onclick = (e) => { const i = e.target.dataset.i; if (i) { mcps[i].status = "connected"; render(); } };
$("mcp-all").onclick = () => { mcps.forEach((m) => (m.status = "connected")); render(); };
document.addEventListener("click", (e) => { if (e.target.isConnected && !$("mcp").contains(e.target)) $("mcp-menu").hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("mcp-menu").hidden = true; });
render();
})();
