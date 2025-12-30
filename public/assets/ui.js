export function qs(sel, el = document) { return el.querySelector(sel); }
export function qsa(sel, el = document) { return Array.from(el.querySelectorAll(sel)); }

export function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch { return iso || ""; }
}

export function toast(message, type = "info", timeoutMs = 3500) {
  const holder = getToastHolder();
  const colors = {
    info: "bg-slate-900 text-white",
    success: "bg-emerald-600 text-white",
    warning: "bg-amber-600 text-white",
    error: "bg-rose-600 text-white",
  };

  const el = document.createElement("div");
  el.className = `pointer-events-auto ${colors[type] || colors.info} shadow-lg rounded-xl px-4 py-3 text-sm flex gap-3 items-start`;
  el.innerHTML = `
    <div class="mt-0.5">
      <span class="inline-block w-2 h-2 rounded-full bg-white/80"></span>
    </div>
    <div class="flex-1">${escapeHtml(message)}</div>
    <button class="text-white/80 hover:text-white transition" aria-label="Close">✕</button>
  `;

  const btn = el.querySelector("button");
  btn.addEventListener("click", () => el.remove());

  holder.appendChild(el);
  if (timeoutMs) setTimeout(() => el.remove(), timeoutMs);
}

export function confirmModal({ title = "Confirm", body = "Are you sure?", confirmText = "Confirm", cancelText = "Cancel" }) {
  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 z-50 flex items-center justify-center";
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="relative bg-white rounded-2xl shadow-2xl w-[min(92vw,520px)] p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-slate-900">${escapeHtml(title)}</h3>
            <p class="mt-2 text-sm text-slate-600">${escapeHtml(body)}</p>
          </div>
          <button class="p-2 rounded-lg hover:bg-slate-100" aria-label="Close">✕</button>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button data-cancel class="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700">${escapeHtml(cancelText)}</button>
          <button data-confirm class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const cleanup = (val) => { modal.remove(); resolve(val); };

    modal.querySelector("[data-cancel]").addEventListener("click", () => cleanup(false));
    modal.querySelector("[data-confirm]").addEventListener("click", () => cleanup(true));
    modal.querySelector('button[aria-label="Close"]').addEventListener("click", () => cleanup(false));
    modal.addEventListener("click", (e) => { if (e.target === modal.firstElementChild) cleanup(false); });
    window.addEventListener("keydown", function esc(ev) {
      if (ev.key === "Escape") { window.removeEventListener("keydown", esc); cleanup(false); }
    });
  });
}

function getToastHolder() {
  let holder = document.getElementById("toast-holder");
  if (!holder) {
    holder = document.createElement("div");
    holder.id = "toast-holder";
    holder.className = "fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none w-[min(92vw,380px)]";
    document.body.appendChild(holder);
  }
  return holder;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

