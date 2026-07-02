/* =========================================================================
   Julianna Roberts — Prototypes
   Fetches projects.json and renders the card grid. Newest first.
   No build step, no dependencies.
   ========================================================================= */

(function () {
  "use strict";

  const grid = document.querySelector("[data-grid]");
  const empty = document.getElementById("empty");
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const esc = (s) =>
    String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  function applyProfile(profile) {
    if (!profile) return;
    if (profile.name) {
      document.querySelectorAll("[data-profile-name]").forEach((n) => (n.textContent = profile.name));
      document.title = `${profile.name} — ${profile.tagline || "Prototypes"}`;
    }
    if (profile.tagline) {
      document.querySelectorAll("[data-profile-tagline]").forEach((n) => (n.textContent = profile.tagline));
    }
  }

  function cardHTML(p) {
    const label = p.label || `Prototype ${String(p.number || 0).padStart(2, "0")}`;
    const num = String(p.number || 0).padStart(2, "0");
    const tags = Array.isArray(p.tags) ? p.tags : [];
    const tagsHTML = tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("");
    const repoHTML = p.repo
      ? `<a class="card-repo" href="${esc(p.repo)}" target="_blank" rel="noopener">View repo ↗</a>`
      : "";

    return `
      <article class="card" data-id="${esc(p.id)}">
        <div class="card-media"
             data-lightbox
             data-gif="${esc(p.gif)}"
             data-label="${esc(label)}"
             data-title="${esc(p.title)}"
             data-desc="${esc(p.description)}"
             data-repo="${esc(p.repo || "")}"
             role="button" tabindex="0" aria-label="Open ${esc(p.title)}">
          <span class="card-number">${esc(num)}</span>
          <img src="${esc(p.gif)}" alt="${esc(p.title)} preview" loading="lazy" decoding="async" />
        </div>
        <div class="card-body">
          <span class="card-label">${esc(label)}</span>
          <h2 class="card-title">${esc(p.title)}</h2>
          <p class="card-desc">${esc(p.description)}</p>
          <div class="card-foot">
            <div class="card-tags">${tagsHTML}</div>
            ${repoHTML}
          </div>
        </div>
      </article>`;
  }

  function revealOnScroll() {
    const cards = grid.querySelectorAll(".card");
    if (!("IntersectionObserver" in window)) {
      cards.forEach((c) => c.style.setProperty("--enter", "1"));
      return;
    }
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            // small stagger for a graceful cascade
            setTimeout(() => e.target.style.setProperty("--enter", "1"), (e.target.dataset.stagger || 0) * 1);
            obs.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    cards.forEach((c, i) => {
      c.dataset.stagger = (i % 2) * 90;
      io.observe(c);
    });
  }

  /* ---- Lightbox ---- */
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightboxImg");
  const lbLabel = document.getElementById("lightboxLabel");
  const lbTitle = document.getElementById("lightboxTitle");
  const lbDesc = document.getElementById("lightboxDesc");
  const lbRepo = document.getElementById("lightboxRepo");
  const lbClose = document.getElementById("lightboxClose");

  function openLightbox(d) {
    lbImg.src = d.gif;
    lbImg.alt = `${d.title} preview`;
    lbLabel.textContent = d.label;
    lbTitle.textContent = d.title;
    lbDesc.textContent = d.desc;
    if (d.repo) {
      lbRepo.href = d.repo;
      lbRepo.hidden = false;
    } else {
      lbRepo.hidden = true;
    }
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    lb.hidden = true;
    lbImg.src = "";
    document.body.style.overflow = "";
  }
  lbClose.addEventListener("click", closeLightbox);
  lb.addEventListener("click", (e) => {
    if (e.target === lb) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lb.hidden) closeLightbox();
  });

  function wireLightbox() {
    grid.querySelectorAll("[data-lightbox]").forEach((el) => {
      const open = () =>
        openLightbox({
          gif: el.dataset.gif,
          label: el.dataset.label,
          title: el.dataset.title,
          desc: el.dataset.desc,
          repo: el.dataset.repo,
        });
      el.addEventListener("click", open);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });
  }

  function render(data) {
    applyProfile(data.profile);
    const projects = Array.isArray(data.projects) ? data.projects.slice() : [];
    // newest first
    projects.sort((a, b) => (b.number || 0) - (a.number || 0));

    if (projects.length === 0) {
      grid.hidden = true;
      empty.hidden = false;
      return;
    }
    grid.hidden = false;
    empty.hidden = true;
    grid.innerHTML = projects.map(cardHTML).join("");
    wireLightbox();
    revealOnScroll();
  }

  fetch("projects.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`projects.json ${r.status}`);
      return r.json();
    })
    .then(render)
    .catch((err) => {
      console.error("Failed to load projects:", err);
      grid.hidden = true;
      empty.hidden = false;
    });
})();
