(() => {
  const profileTiles = document.querySelectorAll('.profile-tile');
  const pinBackdrop = document.getElementById('pinBackdrop');
  if (!profileTiles.length || !pinBackdrop) return;

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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: selectedProfileId, pin })
    });
    const data = await resp.json();
    if (data.success) {
      window.location.href = data.redirect;
      return;
    }
    pinError.textContent = data.error || 'Invalid PIN';
    pinDotsWrap.classList.add('shake');
    setTimeout(() => {
      pinDotsWrap.classList.remove('shake');
      clearPin();
    }, 500);
  };

  const directSelect = async () => {
    const resp = await fetch('/profiles/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: selectedProfileId })
    });
    const data = await resp.json();
    if (data.success) window.location.href = data.redirect;
  };

  profileTiles.forEach((tile) => {
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
      if (value === '⌫') {
        pin = pin.slice(0, -1);
        redraw();
        return;
      }
      if (/^\d$/.test(value) && pin.length < 4) {
        pin += value;
        redraw();
        if (pin.length === 4) submitPin();
      }
    });
  });
})();
