import { KEYS, save } from "./storage.js";
import { escapeHtml } from "./ui.js";

export function openWheelModal(teams, onDone) {
  const modal = document.createElement("div");
  modal.className = "modal open";
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-head">
        <h2>Assign owner</h2>
        <button class="btn" data-close type="button">Close</button>
      </div>
      <div class="modal-body">
        <div class="wheel" id="wheel"><span>Ready</span></div>
        <div id="wheelState" class="list"></div>
      </div>
    </div>
  `;
  document.body.append(modal);

  let rotation = 0;

  function unassigned() {
    return teams.filter((team) => (team.status || "pool") === "pool");
  }

  function renderState(selected = null) {
    const remaining = unassigned();
    document.getElementById("wheelState").innerHTML = selected ? `
      <form id="ownerForm" class="list">
        <div class="field">
          <label>Owner for ${escapeHtml(selected.name)}</label>
          <input name="owner" required placeholder="Owner name" autofocus>
        </div>
        <button class="btn primary" type="submit">Assign</button>
      </form>
    ` : remaining.length ? `
      <p class="muted">${remaining.length} teams waiting for owner assignment.</p>
      <button id="spinWheel" class="btn primary" type="button">Spin</button>
    ` : `<div class="empty">No pool teams available.</div>`;

    document.getElementById("spinWheel")?.addEventListener("click", () => {
      const pool = unassigned();
      const winner = pool[Math.floor(Math.random() * pool.length)];
      rotation += 720 + Math.floor(Math.random() * 720);
      const wheel = document.getElementById("wheel");
      wheel.style.transform = `rotate(${rotation}deg)`;
      wheel.querySelector("span").textContent = winner.shortName || winner.name;
      setTimeout(() => renderState(winner), 900);
    });

    document.getElementById("ownerForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const owner = new FormData(event.currentTarget).get("owner").trim();
      const index = teams.findIndex((team) => team.id === selected.id);
      teams[index] = save(KEYS.teams, { ...selected, owner, status: "active" });
      renderState();
      onDone();
    });
  }

  modal.querySelector("[data-close]").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.remove();
  });
  renderState();
}
