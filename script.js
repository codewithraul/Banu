(() => {
  'use strict';

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const elements = {
    body: document.body,
    welcome: $('#welcome'),
    startButton: $('#startButton'),
    site: $('#mainContent'),
    nav: $('#bottomNav'),
    particles: $('#particles'),
    gallery: $('#gallery'),
    surpriseButton: $('#surpriseButton'),
    surpriseIntro: $('#surpriseIntro'),
    surpriseMessage: $('#surpriseMessage'),
    confettiCanvas: $('#confettiCanvas'),
    musicControl: $('#musicControl'),
    musicToggle: $('#musicToggle'),
    muteToggle: $('#muteToggle'),
    musicIcon: $('#musicIcon'),
    muteIcon: $('#muteIcon'),
    musicBars: $('#musicBars'),
    audio: $('#backgroundMusic'),
    lightbox: $('#lightbox'),
    lightboxImage: $('#lightboxImage'),
    lightboxCaption: $('#lightboxCaption'),
    lightboxClose: $('#lightboxClose'),
    lightboxPrev: $('#lightboxPrev'),
    lightboxNext: $('#lightboxNext')
  };

  const state = { started: false, musicAvailable: true, currentImage: 0, loadedImages: [] };
  const galleryItems = Array.from({ length: 6 }, (_, index) => ({
    src: 'photo-' + (index + 1) + '.jpg',
    alt: 'Xatirə şəkli ' + (index + 1),
    label: String(index + 1).padStart(2, '0') + ' · Xatirə'
  }));

  function createParticles() {
    if (reducedMotion) return;
    const count = Math.min(28, Math.max(16, Math.round(window.innerWidth / 35)));
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      const particle = document.createElement('span');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = 90 + Math.random() * 25 + '%';
      particle.style.setProperty('--duration', 13 + Math.random() * 16 + 's');
      particle.style.setProperty('--delay', -Math.random() * 20 + 's');
      particle.style.setProperty('--drift', -55 + Math.random() * 110 + 'px');
      particle.style.setProperty('--opacity', .2 + Math.random() * .58);
      const size = 1 + Math.random() * 2;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      fragment.appendChild(particle);
    }
    elements.particles.appendChild(fragment);
  }

  function showPlaceholder(card, item) {
    card.classList.add('is-placeholder');
    card.removeAttribute('aria-label');
    card.disabled = true;
    card.innerHTML = '<div class="placeholder-art"><div><span>✦</span><small>' + item.label + '<br>şəkil üçün yer</small></div></div>';
  }

  function createGallery() {
    const fragment = document.createDocumentFragment();
    galleryItems.forEach((item, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'gallery-card';
      card.style.setProperty('--delay', index * 80 + 'ms');
      card.setAttribute('aria-label', item.label + ' şəklini böyüt');
      const image = new Image();
      image.loading = 'lazy';
      image.decoding = 'async';
      image.src = item.src;
      image.alt = item.alt;
      image.addEventListener('load', () => {
        state.loadedImages.push({ ...item, index });
        card.dataset.available = 'true';
      }, { once: true });
      image.addEventListener('error', () => showPlaceholder(card, item), { once: true });
      card.append(image);
      card.insertAdjacentHTML('beforeend', '<span class="gallery-card__overlay"><span>' + item.label + '</span><span class="gallery-card__zoom" aria-hidden="true">＋</span></span>');
      card.addEventListener('click', () => openLightbox(index));
      fragment.appendChild(card);
    });
    elements.gallery.appendChild(fragment);
  }

  function getAvailableImages() {
    return galleryItems.filter((_, index) => {
      const card = elements.gallery.children[index];
      return card && card.dataset.available === 'true';
    });
  }

  function openLightbox(originalIndex) {
    const available = getAvailableImages();
    const selected = galleryItems[originalIndex];
    const availableIndex = available.findIndex(item => item.src === selected.src);
    if (availableIndex < 0) return;
    state.currentImage = availableIndex;
    renderLightbox();
    if (typeof elements.lightbox.showModal === 'function') elements.lightbox.showModal();
    else elements.lightbox.setAttribute('open', '');
  }

  function renderLightbox() {
    const available = getAvailableImages();
    if (!available.length) return;
    state.currentImage = (state.currentImage + available.length) % available.length;
    const item = available[state.currentImage];
    elements.lightboxImage.src = item.src;
    elements.lightboxImage.alt = item.alt;
    elements.lightboxCaption.textContent = item.label;
    const hideNavigation = available.length < 2;
    elements.lightboxPrev.hidden = hideNavigation;
    elements.lightboxNext.hidden = hideNavigation;
  }

  function closeLightbox() {
    if (typeof elements.lightbox.close === 'function') elements.lightbox.close();
    else elements.lightbox.removeAttribute('open');
  }

  function setupRevealObserver() {
    const targets = $$('.reveal, .gallery-card');
    if (!('IntersectionObserver' in window) || reducedMotion) {
      targets.forEach(target => target.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    targets.forEach(target => observer.observe(target));
  }

  function updateMusicUI() {
    const playing = !elements.audio.paused && !elements.audio.ended;
    elements.musicControl.classList.toggle('is-playing', playing);
    elements.musicIcon.textContent = playing ? 'Ⅱ' : '▶';
    elements.musicToggle.setAttribute('aria-label', playing ? 'Musiqini dayandır' : 'Musiqini başladın');
    elements.musicToggle.title = playing ? 'Musiqini dayandır' : 'Musiqini başladın';
    elements.muteIcon.textContent = elements.audio.muted ? '×' : '◖';
    elements.muteToggle.setAttribute('aria-label', elements.audio.muted ? 'Səsi aç' : 'Səsi bağla');
    elements.muteToggle.title = elements.audio.muted ? 'Səsi aç' : 'Səsi bağla';
  }

  async function playMusic() {
    if (!state.musicAvailable) return;
    try {
      await elements.audio.play();
      updateMusicUI();
    } catch (_) {
      updateMusicUI();
    }
  }

  async function startExperience() {
    if (state.started) return;
    state.started = true;
    elements.welcome.classList.add('is-leaving');
    elements.site.classList.add('is-visible');
    elements.site.setAttribute('aria-hidden', 'false');
    elements.nav.classList.add('is-visible');
    elements.nav.setAttribute('aria-hidden', 'false');
    elements.musicControl.classList.add('is-visible');
    elements.musicControl.setAttribute('aria-hidden', 'false');
    elements.body.classList.remove('is-locked');
    window.setTimeout(() => {
      elements.welcome.hidden = true;
      $('#home').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }, reducedMotion ? 0 : 850);
    await playMusic();
  }

  function setupNavigation() {
    const links = $$('.bottom-nav a');
    const sections = links.map(link => document.getElementById(link.dataset.section));
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach(link => link.classList.toggle('is-active', link.dataset.section === visible.target.id));
    }, { rootMargin: '-32% 0px -55% 0px', threshold: [0, .2, .5] });
    sections.forEach(section => section && observer.observe(section));
  }

  function runConfetti() {
    if (reducedMotion) return;
    const canvas = elements.confettiCanvas;
    const context = canvas.getContext('2d');
    if (!context) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.scale(dpr, dpr);
    const colors = ['#f8e8bd', '#d8b96f', '#ffffff', '#c8b7d8', '#ead9bd'];
    const pieces = Array.from({ length: Math.min(90, Math.round(width / 4.5)) }, () => ({
      x: width * .5 + (Math.random() - .5) * 120,
      y: height * .53,
      vx: (Math.random() - .5) * 8,
      vy: -5 - Math.random() * 8,
      gravity: .09 + Math.random() * .06,
      drag: .985,
      size: 2 + Math.random() * 4,
      rotation: Math.random() * Math.PI,
      rotationSpeed: (Math.random() - .5) * .16,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: .65 + Math.random() * .35,
      shape: Math.random() > .55 ? 'line' : 'circle'
    }));
    const start = performance.now();
    function frame(now) {
      context.clearRect(0, 0, width, height);
      pieces.forEach(piece => {
        piece.vx *= piece.drag;
        piece.vy = piece.vy * piece.drag + piece.gravity;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.rotation += piece.rotationSpeed;
        if (now - start > 1700) piece.alpha *= .972;
        context.save();
        context.globalAlpha = Math.max(0, piece.alpha);
        context.translate(piece.x, piece.y);
        context.rotate(piece.rotation);
        context.fillStyle = piece.color;
        if (piece.shape === 'circle') {
          context.beginPath();
          context.arc(0, 0, piece.size * .55, 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillRect(-piece.size * 1.4, -piece.size * .25, piece.size * 2.8, piece.size * .5);
        }
        context.restore();
      });
      if (now - start < 3200) requestAnimationFrame(frame);
      else context.clearRect(0, 0, width, height);
    }
    requestAnimationFrame(frame);
  }

  function openSurprise() {
    elements.surpriseIntro.classList.add('is-hidden');
    elements.surpriseMessage.classList.add('is-visible');
    elements.surpriseMessage.setAttribute('aria-hidden', 'false');
    runConfetti();
  }

  function setupParallax() {
    if (reducedMotion || window.matchMedia('(pointer: coarse)').matches) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        $$('.ambient__orb').forEach((orb, index) => {
          orb.style.marginTop = y * (.018 + index * .008) + 'px';
        });
        ticking = false;
      });
    }, { passive: true });
  }

  elements.startButton.addEventListener('click', startExperience);
  elements.surpriseButton.addEventListener('click', openSurprise, { once: true });
  elements.musicToggle.addEventListener('click', () => elements.audio.paused ? playMusic() : elements.audio.pause());
  elements.muteToggle.addEventListener('click', () => { elements.audio.muted = !elements.audio.muted; updateMusicUI(); });
  elements.audio.addEventListener('play', updateMusicUI);
  elements.audio.addEventListener('pause', updateMusicUI);
  elements.audio.addEventListener('error', () => { state.musicAvailable = false; elements.musicControl.classList.add('is-unavailable'); });
  elements.lightboxClose.addEventListener('click', closeLightbox);
  elements.lightboxPrev.addEventListener('click', () => { state.currentImage -= 1; renderLightbox(); });
  elements.lightboxNext.addEventListener('click', () => { state.currentImage += 1; renderLightbox(); });
  elements.lightbox.addEventListener('click', event => { if (event.target === elements.lightbox) closeLightbox(); });
  document.addEventListener('keydown', event => {
    if (!elements.lightbox.hasAttribute('open')) return;
    if (event.key === 'ArrowLeft') { state.currentImage -= 1; renderLightbox(); }
    if (event.key === 'ArrowRight') { state.currentImage += 1; renderLightbox(); }
  });

  createParticles();
  createGallery();
  setupRevealObserver();
  setupNavigation();
  setupParallax();
  updateMusicUI();
})();