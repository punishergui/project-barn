(() => {
  const ensureLightbox = () => {
    let overlay = document.getElementById('lightboxOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'lightboxOverlay';
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `
      <button type="button" class="lightbox-close" aria-label="Close">×</button>
      <img class="lightbox-image" alt="Photo preview">
      <p class="lightbox-caption"></p>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.classList.remove('open');
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target.classList.contains('lightbox-close')) close();
    });
    return overlay;
  };

  window.openLightbox = (src, caption = '') => {
    const overlay = ensureLightbox();
    overlay.querySelector('.lightbox-image').src = src;
    overlay.querySelector('.lightbox-caption').textContent = caption;
    overlay.classList.add('open');
  };

  document.querySelectorAll('.js-lightbox-trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => window.openLightbox(trigger.dataset.src, trigger.dataset.caption || ''));
  });

  const profileTiles = document.querySelectorAll('.profile-tile');
  const pinBackdrop = document.getElementById('pinBackdrop');

  if (profileTiles.length && pinBackdrop) {
    const pinTitle = document.getElementById('pinTitle');
    const pinError = document.getElementById('pinError');
    const pinDots = [...document.querySelectorAll('#pinDots span')];
    const pinDotsWrap = document.getElementById('pinDots');
    const cancelBtn = document.getElementById('pinCancel');

    let selectedProfileId = null;
    let pin = '';

    const redraw = () => pinDots.forEach((dot, i) => dot.classList.toggle('fill', i < pin.length));
    const clearPin = () => { pin = ''; redraw(); };

    const submitPin = async () => {
      const resp = await fetch('/profiles/select', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: selectedProfileId, pin })
      });
      const data = await resp.json();
      if (data.success) return (window.location.href = data.redirect);
      pinError.textContent = data.error || 'Invalid PIN';
      pinDotsWrap.classList.add('shake');
      setTimeout(() => { pinDotsWrap.classList.remove('shake'); clearPin(); }, 500);
    };

    const directSelect = async () => {
      const resp = await fetch('/profiles/select', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: selectedProfileId })
      });
      const data = await resp.json();
      if (data.success) window.location.href = data.redirect;
    };

    profileTiles.forEach((tile) => {
      const avatarRound = tile.querySelector('.avatar-round');
      const avatarInput = tile.querySelector('.avatar-upload-input');
      const camBtn = tile.querySelector('.avatar-cam-btn');
      const camMenu = tile.querySelector('.avatar-cam-menu');
      const changeBtn = tile.querySelector('.change-btn');
      const removeBtn = tile.querySelector('.remove-btn');

      const closeMenus = () => document.querySelectorAll('.avatar-cam-menu.open').forEach((menu) => menu.classList.remove('open'));

      if (avatarRound && avatarInput && camBtn) {
        camBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          const hasPhoto = !!avatarRound.querySelector('img');
          if (!hasPhoto) {
            avatarInput.click();
            return;
          }
          camMenu.classList.toggle('open');
        });

        changeBtn?.addEventListener('click', (event) => {
          event.stopPropagation();
          camMenu.classList.remove('open');
          avatarInput.click();
        });

        removeBtn?.addEventListener('click', async (event) => {
          event.stopPropagation();
          camMenu.classList.remove('open');
          const resp = await fetch(`/profiles/${tile.dataset.profileId}/avatar/remove`, { method: 'POST' });
          const data = await resp.json();
          if (!data.success) return;
          avatarRound.innerHTML = tile.dataset.profileName?.[0]?.toUpperCase() || '?';
        });

        avatarInput.addEventListener('change', async () => {
          const file = avatarInput.files?.[0];
          if (!file) return;

          const form = new FormData();
          form.append('avatar', file);
          const resp = await fetch(`/profiles/${tile.dataset.profileId}/avatar`, { method: 'POST', body: form });
          const data = await resp.json();
          if (!data.success) return;

          const existingImg = avatarRound.querySelector('img');
          if (existingImg) {
            existingImg.src = `/uploads/${data.filename}?v=${Date.now()}`;
          } else {
            avatarRound.innerHTML = `<img src="/uploads/${data.filename}?v=${Date.now()}" alt="${tile.dataset.profileName}" class="profile-avatar-img">`;
          }
          avatarInput.value = '';
        });

        document.addEventListener('click', (event) => {
          if (!tile.contains(event.target)) closeMenus();
        });
      }

      tile.addEventListener('click', () => {
        selectedProfileId = tile.dataset.profileId;
        pinTitle.textContent = `Enter PIN — ${tile.dataset.profileName}`;
        pinError.textContent = '';
        clearPin();
        if (tile.dataset.requiresPin === 'true') {
          pinBackdrop.classList.add('open');
          pinBackdrop.setAttribute('aria-hidden', 'false');
          return;
        }
        directSelect();
      });
    });

    cancelBtn.addEventListener('click', () => {
      pinBackdrop.classList.remove('open');
      pinBackdrop.setAttribute('aria-hidden', 'true');
      clearPin();
    });

    document.querySelectorAll('.pin-key').forEach((key) => {
      key.addEventListener('click', () => {
        const value = key.dataset.key;
        if (!value) return;
        if (value === '⌫') return void (pin = pin.slice(0, -1), redraw());
        if (/^\d$/.test(value) && pin.length < 4) {
          pin += value;
          redraw();
          if (pin.length === 4) submitPin();
        }
      });
    });
  }

  document.querySelectorAll('.photo-upload-form').forEach((form) => {
    const input = form.querySelector('.photo-upload-input');
    const button = form.querySelector('.js-photo-upload-btn');
    if (!input || !button) return;

    button.addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;

      const body = new FormData();
      body.append('photo', file);

      const resp = await fetch(form.dataset.uploadUrl, { method: 'POST', body });
      const data = await resp.json();
      if (data.success) {
        const url = new URL(window.location.href);
        if (form.dataset.reloadTab) url.searchParams.set('tab', form.dataset.reloadTab);
        window.location.href = url.toString();
      }
    });
  });

  const detail = document.querySelector('.project-detail');
  if (detail) {
    const buttons = [...document.querySelectorAll('.tab-btn')];
    const panels = [...document.querySelectorAll('.tab-panel')];
    const setTab = (tab) => {
      buttons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
      panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.tabContent === tab));
    };
    setTab(detail.dataset.initialTab || 'timeline');
    buttons.forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.tab)));

    const logBackdrop = document.getElementById('logBackdrop');
    const openLog = document.getElementById('openLogSheet');
    const closeLog = document.getElementById('closeLogSheet');
    const notesInput = document.getElementById('quickLogNotes');

    if (logBackdrop && openLog && closeLog) {
      openLog.addEventListener('click', () => logBackdrop.classList.add('open'));
      closeLog.addEventListener('click', () => logBackdrop.classList.remove('open'));

      document.querySelectorAll('.log-type').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await fetch(`/projects/${detail.dataset.projectId}/tasks/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_type: btn.dataset.taskType, notes: notesInput.value })
          });
          window.location.reload();
        });
      });
    }
  }

  // Theme toggle
  const themeToggle = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("barn-theme");
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("barn-theme", next);
    });
  }

  // Notification panel
  const notifBell = document.getElementById("notifBell");
  const notifPanel = document.getElementById("notifPanel");
  const notifReadAll = document.getElementById("notifReadAll");
  if (notifBell && notifPanel) {
    notifBell.addEventListener("click", () => {
      const open = notifPanel.classList.toggle("open");
      notifPanel.setAttribute("aria-hidden", String(!open));
    });
    document.querySelectorAll(".notif-item").forEach((item) => {
      item.addEventListener("click", async () => {
        await fetch(`/notifications/read/${item.dataset.notifId}`, { method: "POST" });
        item.classList.add("read");
        if (item.dataset.link) window.location.href = item.dataset.link;
      });
    });
    if (notifReadAll) {
      notifReadAll.addEventListener("click", async () => {
        await fetch("/notifications/read-all", { method: "POST" });
        document.querySelectorAll(".notif-item").forEach((i) => i.classList.add("read"));
        const badge = document.querySelector(".notif-badge");
        if (badge) badge.remove();
      });
    }
  }

  // Goals
  const goalAddBtn = document.getElementById("goalAddBtn");
  const goalInput = document.getElementById("goalInput");
  const goalsList = document.getElementById("goalsList");
  if (goalAddBtn && goalInput && goalsList) {
    const projectId = document.querySelector(".project-detail")?.dataset.projectId;
    const attachGoalToggle = (item) => {
      item.querySelector(".goal-check").addEventListener("click", async () => {
        const resp = await fetch(`/projects/${projectId}/goals/${item.dataset.goalId}/toggle`, { method: "POST" });
        const data = await resp.json();
        if (data.success) item.classList.toggle("done", data.completed);
      });
    };

    goalAddBtn.addEventListener("click", async () => {
      const text = goalInput.value.trim();
      if (!text) return;
      const resp = await fetch(`/projects/${projectId}/goals/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await resp.json();
      if (data.success) {
        goalInput.value = "";
        const empty = goalsList.querySelector(".empty-state");
        if (empty) empty.remove();
        const div = document.createElement("div");
        div.className = "goal-item";
        div.dataset.goalId = data.id;
        div.innerHTML = `<button type="button" class="goal-check">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <circle cx="12" cy="12" r="9" stroke="var(--muted)" stroke-width="1.5" fill="none"/>
          </svg></button><span>${data.text}</span>`;
        goalsList.appendChild(div);
        attachGoalToggle(div);
      }
    });

    document.querySelectorAll(".goal-item").forEach(attachGoalToggle);
  }

  const showsFilterWrap = document.querySelector('[data-show-filters]');
  if (showsFilterWrap) {
    const buttons = [...showsFilterWrap.querySelectorAll('[data-filter]')];
    const cards = [...document.querySelectorAll('[data-show-status]')];
    const empty = document.querySelector('[data-empty-shows]');

    const applyFilter = (filter) => {
      let visible = 0;
      cards.forEach((card) => {
        const status = card.dataset.showStatus;
        const show = filter === 'all' || filter === status;
        card.hidden = !show;
        if (show) visible += 1;
      });
      if (empty) empty.hidden = visible !== 0;
      buttons.forEach((btn) => btn.classList.toggle('active', btn.dataset.filter === filter));
    };

    buttons.forEach((btn) => btn.addEventListener('click', () => applyFilter(btn.dataset.filter)));
    applyFilter('all');
  }
})();

(() => {
  const expenseFilters = document.querySelector('[data-expense-filters]');
  if (expenseFilters) {
    const filterButtons = [...expenseFilters.querySelectorAll('[data-project-filter]')];
    const cards = [...document.querySelectorAll('.expense-card[data-project-id]')];
    const months = [...document.querySelectorAll('[data-expense-month]')];

    const applyFilter = (projectId) => {
      cards.forEach((card) => {
        const matches = projectId === 'all' || card.dataset.projectId === projectId;
        card.hidden = !matches;
      });
      months.forEach((month) => {
        const visible = month.querySelector('.expense-card:not([hidden])');
        month.hidden = !visible;
      });
      filterButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.projectFilter === projectId));
    };

    filterButtons.forEach((btn) => btn.addEventListener('click', () => applyFilter(btn.dataset.projectFilter)));
    applyFilter('all');
  }

  const reportToggle = document.querySelector('[data-report-toggle="expense-summary"]');
  const reportBody = document.querySelector('[data-report-body="expense-summary"]');
  if (reportToggle && reportBody) {
    reportToggle.addEventListener('click', () => {
      reportBody.hidden = !reportBody.hidden;
    });
  }

  const openExport = document.getElementById('openExportSheet');
  const closeExport = document.getElementById('closeExportSheet');
  const exportBackdrop = document.getElementById('exportBackdrop');
  const exportForm = document.getElementById('exportProjectForm');

  if (openExport && closeExport && exportBackdrop && exportForm) {
    openExport.addEventListener('click', () => {
      exportBackdrop.classList.add('open');
      exportBackdrop.setAttribute('aria-hidden', 'false');
    });

    closeExport.addEventListener('click', () => {
      exportBackdrop.classList.remove('open');
      exportBackdrop.setAttribute('aria-hidden', 'true');
    });

    exportForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const selected = exportForm.querySelector('input[name="project_id"]:checked');
      if (!selected) return;
      window.location.href = `/reports/export/${selected.value}`;
    });
  }
})();
