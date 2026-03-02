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

      if (avatarRound && avatarInput) {
        avatarRound.addEventListener('click', (event) => {
          event.stopPropagation();
          avatarInput.click();
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
            existingImg.src = `/uploads/${data.filename}`;
          } else {
            avatarRound.innerHTML = `<img src="/uploads/${data.filename}" alt="${tile.dataset.profileName}" class="profile-avatar-img">`;
          }
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
