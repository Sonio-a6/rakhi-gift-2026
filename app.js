/* ==========================================================================
   Rakhi With My Favorite Cousin - Application Logic & Interactive Engine
   ========================================================================== */

// --- REGISTER PWA SERVICE WORKER FOR MOBILE INSTALLATION ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('PWA ServiceWorker Active:', reg))
      .catch(err => console.log('PWA ServiceWorker error:', err));
  });
}

// Check if running inside installed standalone PWA app
function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true ||
         document.referrer.includes('android-app://');
}

function hideInstallButtons() {
  const pwaBtn = document.getElementById('pwa-install-btn');
  const splashBtn = document.getElementById('splash-install-btn');
  if (pwaBtn) pwaBtn.style.display = 'none';
  if (splashBtn) splashBtn.style.display = 'none';
}

// PWA Install Event Handler
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('beforeinstallprompt fired, captured deferredPrompt');
  if (!isPWAInstalled()) {
    const pwaBtn = document.getElementById('pwa-install-btn');
    const splashBtn = document.getElementById('splash-install-btn');
    if (pwaBtn) pwaBtn.style.display = 'flex';
    if (splashBtn) splashBtn.style.display = 'inline-block';
  }
});

// Hide install buttons automatically once installed!
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed successfully');
  hideInstallButtons();
});

function triggerPWAInstall() {
  if (isPWAInstalled()) {
    hideInstallButtons();
    return;
  }

  const ua = navigator.userAgent || '';
  const isInApp = /FBAN|FBAV|Instagram|WhatsApp|Line|FB_IAB/i.test(ua);

  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted PWA installation');
        hideInstallButtons();
      }
      deferredPrompt = null;
    });
  } else if (isInApp) {
    showModal(
      "Open in Chrome to Install 📲",
      "You are viewing this link inside WhatsApp/In-App browser!\n\n1. Tap top-right 3 dots (⋮) or Share icon.\n2. Select 'Open in Chrome'.\n3. Tap 'Install App'!",
      "🌐"
    );
  } else {
    showModal(
      "Install App on Phone 📲",
      "Android (Chrome): Tap top 3-dots (⋮) menu -> Select 'Install app' or 'Add to Home screen'.\n\niPhone (Safari): Tap Share button (📤) -> Select 'Add to Home Screen'.",
      "📲"
    );
  }
}

// Clear any stale stored completion data on launch
try {
  localStorage.removeItem('rakhi_completed');
  sessionStorage.removeItem('rakhi_completed');
} catch(e) {}

// --- App State ---
const STATE = {
  activeScreen: 'splash-screen',
  soundEnabled: true,
  theme: localStorage.getItem('rakhi_theme') || 'light',
  completedActivities: [], // Always starts empty on new app opening
  quizScore: 0,
  quizIndex: 0,
  chatIndex: 0,
  emojiScore: 0,
  emojiTimer: null,
  isWheelSpinning: false,
  activePhotoIndex: 0,
  isRakhiTied: false
};

// --- Haptic Feedback Helper ---
function triggerHaptic(pattern = [20, 30, 20]) {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignored if unsupported
    }
  }
}

// ==========================================================================
// Web Audio API Sound Synthesizer Engine (Zero External Audio File Dependencies)
// ==========================================================================
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.bgMusicTimer = null;
    this.isMusicPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPop() {
    if (!STATE.soundEnabled) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playBell() {
    if (!STATE.soundEnabled) return;
    this.init();
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // Temple bell C5-E5-G5-C6 chord
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const startTime = this.ctx.currentTime + idx * 0.1;
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.4);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 1.4);
    });
  }

  playFanfare() {
    if (!STATE.soundEnabled) return;
    this.init();
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const startTime = this.ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.7);
    });
  }

  playWheelTick() {
    if (!STATE.soundEnabled) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 650;
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }

  toggleBgMusic() {
    if (this.isMusicPlaying) {
      this.stopBgMusic();
    } else {
      this.startBgMusic();
    }
  }

  startBgMusic() {
    if (!STATE.soundEnabled) return;
    this.init();
    this.isMusicPlaying = true;
    const melody = [261.63, 329.63, 392.00, 440.00, 392.00, 329.63, 349.23, 392.00];
    let noteIdx = 0;

    const playNextNote = () => {
      if (!this.isMusicPlaying) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = melody[noteIdx];
      
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.9);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.9);
      
      noteIdx = (noteIdx + 1) % melody.length;
      this.bgMusicTimer = setTimeout(playNextNote, 650);
    };

    playNextNote();
  }

  stopBgMusic() {
    this.isMusicPlaying = false;
    if (this.bgMusicTimer) clearTimeout(this.bgMusicTimer);
  }
}

const audio = new SoundSynth();

// ==========================================================================
// Dynamic Particle System (Hearts, Sparkles, Butterflies, Petals & Fireworks)
// ==========================================================================
class CanvasParticles {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.bursts = [];
    this.fireworks = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initFloatingParticles();
    this.loop();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initFloatingParticles() {
    this.particles = [];
    const symbols = ['❤️', '✨', '🌸', '💖', '⭐', '🦋', '🪢'];
    for (let i = 0; i < 28; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: 14 + Math.random() * 16,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        speedY: 0.35 + Math.random() * 0.55,
        speedX: Math.sin(Math.random() * Math.PI) * 0.4,
        alpha: 0.4 + Math.random() * 0.5
      });
    }
  }

  spawnBurst(x, y, count = 35, type = 'confetti') {
    const colors = ['#ff758f', '#ffb703', '#a0c4ff', '#c77dff', '#2ec4b6', '#ffd166'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 6.5;
      this.bursts.push({
        x: x || this.canvas.width / 2,
        y: y || this.canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: type === 'petals' ? 12 : (4 + Math.random() * 6),
        color: colors[Math.floor(Math.random() * colors.length)],
        type: type,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.02,
        rotation: Math.random() * Math.PI
      });
    }
  }

  spawnFireworks(count = 12) {
    for (let f = 0; f < count; f++) {
      setTimeout(() => {
        const fx = Math.random() * (this.canvas.width - 100) + 50;
        const fy = Math.random() * (this.canvas.height * 0.5) + 50;
        this.spawnBurst(fx, fy, 70, 'fireworks');
      }, f * 350);
    }
  }

  loop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Floating Background Symbols
    this.particles.forEach(p => {
      p.y -= p.speedY;
      p.x += p.speedX;
      if (p.y < -30) {
        p.y = this.canvas.height + 30;
        p.x = Math.random() * this.canvas.width;
      }
      this.ctx.globalAlpha = p.alpha;
      this.ctx.font = `${p.size}px sans-serif`;
      this.ctx.fillText(p.symbol, p.x, p.y);
    });

    // 2. Explosive Bursts, Petals & Fireworks
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.12; // gravity
      b.life -= b.decay;
      b.rotation += 0.06;

      if (b.life <= 0) {
        this.bursts.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = b.life;
      this.ctx.translate(b.x, b.y);
      this.ctx.rotate(b.rotation);

      if (b.type === 'petals') {
        this.ctx.fillStyle = '#ff758f';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, b.size, b.size / 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = b.color;
        this.ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size);
      }
      this.ctx.restore();
    }

    requestAnimationFrame(() => this.loop());
  }
}

let fx;

// ==========================================================================
// Navigation & Core App Flow
// ==========================================================================
function switchScreen(screenId) {
  const current = document.querySelector('.view-screen.active');
  const target = document.getElementById(screenId);

  if (!target || current === target) return;

  if (current) {
    current.classList.remove('active');
  }
  
  target.classList.add('active');
  target.scrollTop = 0; // Automatically reset scroll to top on screen change
  STATE.activeScreen = screenId;
  audio.playPop();
  triggerHaptic([15]);

  // Update bottom dock active tab
  document.querySelectorAll('.nav-tab').forEach(tab => {
    if (tab.dataset.target === screenId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Toggle bottom nav dock visibility
  const bottomDock = document.getElementById('bottom-dock');
  if (screenId === 'splash-screen') {
    bottomDock.style.display = 'none';
  } else {
    bottomDock.style.display = 'flex';
  }

  // Update Finale Photo dynamically if custom photo exists
  if (screenId === 'final-screen') {
    const finaleImg = document.querySelector('.finale-img');
    const customPhotos = JSON.parse(localStorage.getItem('rakhi_custom_photos')) || {};
    if (finaleImg && customPhotos['p1']) {
      finaleImg.src = customPhotos['p1'];
    }
    fx.spawnFireworks(7);
    audio.playFanfare();
  }

  // Trigger screen canvas initializers
  if (screenId === 'act-5') {
    const video = document.getElementById('rakhi-ceremony-video');
    if (video) {
      try {
        video.pause();
        video.currentTime = 0;
      } catch(e) {}
    }
  }
  if (screenId === 'act-8') initWheelCanvas();
  if (screenId === 'act-11') drawDistanceMap();
}

function markActivityDone(actId) {
  if (!STATE.completedActivities.includes(actId)) {
    STATE.completedActivities.push(actId);
    updateProgressUI();
  }
}

function updateProgressUI() {
  const total = 13;
  const doneCount = STATE.completedActivities.length;
  const percentage = (doneCount / total) * 100;
  
  const fill = document.getElementById('overall-progress');
  const text = document.getElementById('progress-text');
  
  if (fill) fill.style.width = `${percentage}%`;
  if (text) text.innerText = `${doneCount} of ${total} Memories Completed`;

  // Dynamically insert or remove badges on tiles
  document.querySelectorAll('.activity-tile').forEach(tile => {
    const act = tile.dataset.act;
    const existingBadge = tile.querySelector('.completed-badge');

    if (STATE.completedActivities.includes(act)) {
      tile.classList.add('completed');
      if (!existingBadge) {
        const badge = document.createElement('span');
        badge.className = 'completed-badge';
        badge.innerText = '✓ Done';
        tile.appendChild(badge);
      }
    } else {
      tile.classList.remove('completed');
      if (existingBadge) {
        existingBadge.remove();
      }
    }
  });
}

function showModal(title, message, icon = '🎉') {
  document.getElementById('modal-title').innerText = title;
  document.getElementById('modal-body').innerText = message;
  document.getElementById('modal-icon').innerText = icon;
  
  document.getElementById('global-modal').classList.add('active');
  audio.playFanfare();
  triggerHaptic([30, 40, 30]);
  fx.spawnBurst(window.innerWidth / 2, window.innerHeight / 3, 45);
}

// Reset all screens to initial front state
function resetAllAppStages() {
  STATE.completedActivities = [];
  STATE.quizIndex = 0;
  STATE.quizScore = 0;
  STATE.chatIndex = 0;
  STATE.emojiScore = 0;
  STATE.isRakhiTied = false;

  // Clear completed class & badges from DOM
  document.querySelectorAll('.activity-tile').forEach(tile => {
    tile.classList.remove('completed');
    const badge = tile.querySelector('.completed-badge');
    if (badge) badge.remove();
  });

  // Photo Wall reset cover
  const coverStage = document.getElementById('photo-wall-cover');
  const roomStage = document.getElementById('photo-wall-room');
  if (coverStage) coverStage.style.display = 'block';
  if (roomStage) roomStage.style.display = 'none';

  // Secret box reset
  const giftStage = document.getElementById('gift-box-stage');
  const letterStage = document.getElementById('letter-stage');
  const secretBtnArea = document.getElementById('secret-btn-area');
  if (giftStage) giftStage.style.display = 'flex';
  if (letterStage) letterStage.style.display = 'none';
  if (secretBtnArea) secretBtnArea.style.display = 'block';

  // Rakhi ceremony video reset
  const video = document.getElementById('rakhi-ceremony-video');
  if (video) {
    video.pause();
    video.currentTime = 0;
  }
  const tieBtnArea = document.getElementById('tie-rakhi-btn-area');
  const hugBtnArea = document.getElementById('hug-btn-container');

  if (tieBtnArea) tieBtnArea.style.display = 'block';
  if (hugBtnArea) hugBtnArea.style.display = 'none';

  // Friendship meter needle reset
  const needle = document.getElementById('meter-needle');
  const meterResult = document.getElementById('meter-result-title');
  if (needle) needle.style.transform = 'rotate(-90deg)';
  if (meterResult) meterResult.innerText = 'Press Test to Calculate!';

  // Cute brother reset
  const cuteAnswers = document.getElementById('cute-answers-area');
  const cuteResult = document.getElementById('cute-result-msg');
  const btnNo = document.getElementById('btn-cute-no');
  if (cuteAnswers) cuteAnswers.style.display = 'flex';
  if (cuteResult) cuteResult.style.display = 'none';
  if (btnNo) {
    btnNo.style.display = 'inline-block';
    btnNo.style.position = 'absolute';
    btnNo.style.top = '65%';
    btnNo.style.left = '60%';
    btnNo.style.right = 'auto';
    btnNo.style.bottom = 'auto';
    btnNo.style.visibility = 'visible';
    btnNo.style.opacity = '1';
  }

  // Promise cards reset
  document.querySelectorAll('.promise-card').forEach(card => card.classList.remove('sealed'));

  // Always show front splash screen on start
  document.querySelectorAll('.view-screen').forEach(s => s.classList.remove('active'));
  const splash = document.getElementById('splash-screen');
  if (splash) splash.classList.add('active');

  const bottomDock = document.getElementById('bottom-dock');
  if (bottomDock) bottomDock.style.display = 'none';

  updateProgressUI();
}

// ==========================================================================
// FEATURE 1: 📸 OUR MEMORIES ❤️ (SWAYING PHOTO WALL)
// ==========================================================================

function getSavedPhotos() {
  return JSON.parse(localStorage.getItem('rakhi_custom_photos')) || {};
}

const MEMORY_PHOTOS = [
  { id: 'p1', defaultImg: 'assets/photos/photo1.jpg', caption: 'Best Cousin & Best Friend ❤️', stringRow: 1 },
  { id: 'p2', defaultImg: 'assets/photos/photo2.jpg', caption: 'Laughs & Late-Night Talks 🌸', stringRow: 1 },
  { id: 'p3', defaultImg: 'assets/photos/photo3.jpg', caption: 'World\'s Cutest Troublemakers 😂', stringRow: 2 },
  { id: 'p4', defaultImg: 'assets/photos/photo4.png', caption: 'Unforgettable Memories ✨', stringRow: 2 },
  { id: 'p5', defaultImg: 'assets/photos/photo5.jpg', caption: 'Partners in Crime Forever 💖', stringRow: 3 },
  { id: 'p6', defaultImg: 'assets/photos/photo1.jpg', caption: 'Distance Means Nothing ❤️', stringRow: 3 }
];

function initPhotoWall() {
  const btnOpen = document.getElementById('btn-open-photo-wall');
  const coverStage = document.getElementById('photo-wall-cover');
  const roomStage = document.getElementById('photo-wall-room');

  if (!btnOpen) return;

  btnOpen.addEventListener('click', () => {
    audio.playPop();
    triggerHaptic([20, 30]);
    fx.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 40, 'petals');

    coverStage.style.display = 'none';
    roomStage.style.display = 'flex';

    renderPhotoWallItems();
    markActivityDone('act-1');
  });

  const lightboxModal = document.getElementById('photo-lightbox-modal');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const lightboxFileInput = document.getElementById('lightbox-file-input');

  lightboxClose.onclick = () => lightboxModal.classList.remove('active');
  lightboxPrev.onclick = () => navigateLightbox(-1);
  lightboxNext.onclick = () => navigateLightbox(1);

  lightboxFileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        const currentItem = MEMORY_PHOTOS[STATE.activePhotoIndex];
        const saved = getSavedPhotos();
        saved[currentItem.id] = base64;
        localStorage.setItem('rakhi_custom_photos', JSON.stringify(saved));
        
        document.getElementById('lightbox-img').src = base64;
        renderPhotoWallItems(); // Immediately re-render wall thumbnails!

        audio.playPop();
        triggerHaptic([30, 30]);
        fx.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 25);
      };
      reader.readAsDataURL(file);
    }
  };

  let touchStartX = 0;
  lightboxModal.ontouchstart = (e) => { touchStartX = e.touches[0].clientX; };
  lightboxModal.ontouchend = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    if (touchStartX - touchEndX > 50) navigateLightbox(1);
    if (touchEndX - touchStartX > 50) navigateLightbox(-1);
  };
}

function renderPhotoWallItems() {
  const savedPhotos = getSavedPhotos();
  [1, 2, 3].forEach(rowNum => {
    const rowElem = document.getElementById(`row-${rowNum}-polaroids`);
    if (!rowElem) return;
    rowElem.innerHTML = '';

    const rowItems = MEMORY_PHOTOS.filter(item => item.stringRow === rowNum);
    rowItems.forEach((item, idx) => {
      const photoSrc = savedPhotos[item.id] || item.defaultImg;
      const card = document.createElement('div');
      card.className = 'polaroid-card';
      card.style.animationDelay = `${idx * 0.25}s`;
      card.innerHTML = `
        <div class="wooden-clip"></div>
        <div class="polaroid-img-wrapper">
          <img src="${photoSrc}" alt="${item.caption}" class="polaroid-img" id="thumb-${item.id}">
        </div>
        <p class="polaroid-caption">${item.caption}</p>
      `;

      card.onclick = () => {
        const globalIdx = MEMORY_PHOTOS.findIndex(p => p.id === item.id);
        openLightbox(globalIdx);
      };

      rowElem.appendChild(card);
    });
  });
}

function openLightbox(index) {
  STATE.activePhotoIndex = index;
  const item = MEMORY_PHOTOS[index];
  const savedPhotos = getSavedPhotos();
  const photoSrc = savedPhotos[item.id] || item.defaultImg;

  document.getElementById('lightbox-img').src = photoSrc;
  document.getElementById('lightbox-caption').innerText = item.caption;
  document.getElementById('photo-lightbox-modal').classList.add('active');

  audio.playPop();
  triggerHaptic([20]);
}

function navigateLightbox(direction) {
  STATE.activePhotoIndex = (STATE.activePhotoIndex + direction + MEMORY_PHOTOS.length) % MEMORY_PHOTOS.length;
  openLightbox(STATE.activePhotoIndex);
}

// ==========================================================================
// FEATURE 2: 😂 FUNNY QUIZ
// ==========================================================================
const QUIZ_DATA = [
  { q: "Who starts fights first?", options: ["Him (just to tease me!)", "Me", "Ghosts", "The weather"], correct: 0 },
  { q: "Who laughs more at stupid jokes?", options: ["Him", "Me", "Both of us together at 2 AM!", "Neither"], correct: 2 },
  { q: "Who says sorry first after a silly argument?", options: ["Him", "Me (Always)", "We just send funny memes instead! 😂", "Nobody"], correct: 2 },
  { q: "Who is the most dramatic cousin in the world?", options: ["Him (100% Certified Drama King!)", "Me (A little bit 😇)", "The cat", "Both of us!"], correct: 0 },
  { q: "Who loves food more?", options: ["Both of us (Total Foodies!)", "Only Him", "Only Me", "Salad lovers"], correct: 0 },
  { q: "Who is always late for meetups?", options: ["Him (Always taking forever!)", "Me (Getting ready 💅)", "Both of us", "On time always"], correct: 0 }
];

function renderQuizQuestion() {
  const qData = QUIZ_DATA[STATE.quizIndex];
  const stepCounter = document.getElementById('quiz-step-counter');
  const title = document.getElementById('quiz-question-title');
  const optionsList = document.getElementById('quiz-options-list');
  
  if (!title || !optionsList) return;

  stepCounter.innerText = `Question ${STATE.quizIndex + 1} of ${QUIZ_DATA.length}`;
  title.innerText = qData.q;
  optionsList.innerHTML = '';

  qData.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option-btn';
    btn.innerHTML = `<span>${opt}</span> <span>👉</span>`;
    btn.onclick = () => handleQuizAnswer(idx, btn);
    optionsList.appendChild(btn);
  });
}

function handleQuizAnswer(selectedIdx, btnElement) {
  btnElement.classList.add('correct');
  audio.playPop();
  triggerHaptic([15]);

  setTimeout(() => {
    STATE.quizIndex++;
    if (STATE.quizIndex < QUIZ_DATA.length) {
      renderQuizQuestion();
    } else {
      markActivityDone('act-2');
      showModal(
        "You know me better than anyone ❤️",
        "Result: 100% Best Cousin Match! Distance can never change how well we know each other.",
        "🏆"
      );
      STATE.quizIndex = 0;
      renderQuizQuestion();
    }
  }, 500);
}

// ==========================================================================
// FEATURE 3: ❤️ FRIENDSHIP METER
// ==========================================================================
function initFriendshipMeter() {
  const needle = document.getElementById('meter-needle');
  const resultTitle = document.getElementById('meter-result-title');
  const btn = document.getElementById('btn-start-meter');

  if (!btn) return;

  btn.addEventListener('click', () => {
    audio.playPop();
    triggerHaptic([20, 20]);
    resultTitle.innerText = "Calculating bond level...";
    needle.style.transform = "rotate(-90deg)";

    setTimeout(() => {
      needle.style.transform = "rotate(75deg)";
      audio.playFanfare();
      triggerHaptic([40, 50, 40]);
      fx.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 55);
      resultTitle.innerText = "Partners in Crime Forever ❤️";
      markActivityDone('act-3');
    }, 600);
  });
}

// ==========================================================================
// FEATURE 4: 😂 ROAST & COMPLIMENT MACHINE
// ==========================================================================
const ROASTS = [
  "You're the CEO of overthinking.",
  "World's cutest troublemaker.",
  "Professional snack thief.",
  "Drama Queen with VIP membership.",
  "Google still can't understand your mood swings."
];

const COMPLIMENTS = [
  "You are my favorite person to laugh with in the entire universe.",
  "Distance only makes our rare meetups 1000x more special.",
  "Thank you for being my safe space and my best friend.",
  "Life is so much brighter and funnier with you as my cousin!",
  "You're not just a cousin, you're the best friend I could ever ask for."
];

function initRoastGenerator() {
  const box = document.getElementById('roast-display-box');
  const btnRoast = document.getElementById('btn-roast-me');
  const btnPraise = document.getElementById('btn-praise-me');

  if (!btnRoast) return;

  btnRoast.addEventListener('click', () => {
    audio.playPop();
    triggerHaptic([15]);
    const randomRoast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
    box.innerText = `😂 "${randomRoast}"`;
    box.style.color = "var(--primary-pink)";
    markActivityDone('act-4');
  });

  btnPraise.addEventListener('click', () => {
    audio.playPop();
    triggerHaptic([15]);
    const randomPraise = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
    box.innerText = `❤️ "${randomPraise}"`;
    box.style.color = "var(--soft-purple)";
    markActivityDone('act-4');
  });
}

// ==========================================================================
// FEATURE 5: 🎀 VIRTUAL RAKHI CEREMONY (EMAIL NOTIFICATION DELIVERED ON VIRTUAL HUG)
// Sends email to atanu9791@gmail.com from Sananda Paul with Hug Emoji!
// ==========================================================================
function sendVirtualHugEmail() {
  const targetEmail = "atanu9791@gmail.com";
  
  // 1. AJAX request via FormSubmit to send email to atanu9791@gmail.com
  fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
    method: "POST",
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      _subject: "🤗 Virtual Hug from Sananda Paul!",
      name: "Sananda Paul",
      message: "Sananda Paul just sent you a big, warm virtual hug from her Rakhi Special Gift App! 🤗💖✨\n\nHappy Raksha Bandhan! ❤️",
      _captcha: "false"
    })
  }).catch(err => console.log('Email delivery note:', err));
}

function initRakhiCeremony() {
  const video = document.getElementById('rakhi-ceremony-video');
  const btnTie = document.getElementById('btn-tie-rakhi');
  const btnHug = document.getElementById('btn-send-hug');
  const tieBtnArea = document.getElementById('tie-rakhi-btn-area');
  const hugBtnArea = document.getElementById('hug-btn-container');

  if (!video || !btnTie) return;

  let fireworksTimer = null;

  const triggerCelebration = () => {
    if (STATE.isRakhiTied) return;
    STATE.isRakhiTied = true;
    audio.playFanfare();
    triggerHaptic([50, 60, 50, 60]);
    
    // Massive Fireworks Explosion blowing across the entire screen!
    fx.spawnFireworks(12);
    fx.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 90, 'confetti');

    if (hugBtnArea) hugBtnArea.style.display = 'block';
    if (tieBtnArea) tieBtnArea.style.display = 'none';
    markActivityDone('act-5');
  };

  btnTie.onclick = () => {
    audio.playBell();
    audio.startBgMusic();
    triggerHaptic([30, 40, 30]);

    if (tieBtnArea) tieBtnArea.style.display = 'none';

    try {
      video.currentTime = 0;
      video.muted = false;
      const p = video.play();
      if (p !== undefined) {
        p.catch(err => {
          console.log('Unmuted play note:', err);
          video.muted = true;
          video.play();
        });
      }
    } catch(e) {}

    if (fireworksTimer) clearTimeout(fireworksTimer);
    fireworksTimer = setTimeout(() => {
      triggerCelebration();
    }, 12000);
  };

  if (btnHug) {
    btnHug.onclick = () => {
      audio.playPop();
      triggerHaptic([40, 60, 40]);
      fx.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 65, 'confetti');

      // Trigger Email Notification Delivery to atanu9791@gmail.com
      sendVirtualHugEmail();

      showModal(
        "Virtual Hug Sent! 🤗",
        "A warm virtual hug email from Sananda Paul has been sent to atanu9791@gmail.com! 💖✨",
        "💖"
      );
    };
  }
}

// ==========================================================================
// FEATURE 6: 🔒 SECRET GIFT
// ==========================================================================
function initSecretBox() {
  const btn = document.getElementById('btn-open-secret-box');
  const boxImg = document.getElementById('gift-box-wrapper');
  const giftStage = document.getElementById('gift-box-stage');
  const letterStage = document.getElementById('letter-stage');
  const btnArea = document.getElementById('secret-btn-area');

  const openBox = () => {
    audio.playBell();
    triggerHaptic([30, 40]);
    fx.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 50);

    giftStage.style.display = 'none';
    letterStage.style.display = 'block';
    btnArea.style.display = 'none';
    markActivityDone('act-6');
  };

  if (btn) btn.addEventListener('click', openBox);
  if (boxImg) boxImg.addEventListener('click', openBox);
}

// ==========================================================================
// FEATURE 7: 📜 PROMISE WALL
// ==========================================================================
const PROMISES = [
  "I'll always support you.",
  "I'll always make you laugh.",
  "I'll always tease you.",
  "I'll always answer your calls.",
  "I'll always protect our friendship."
];

function initPromiseWall() {
  const container = document.getElementById('promises-list');
  if (!container) return;
  container.innerHTML = '';

  PROMISES.forEach((text) => {
    const card = document.createElement('div');
    card.className = 'promise-card';
    card.innerHTML = `
      <span>"${text}"</span>
      <span class="stamp-heart">💖</span>
    `;
    card.addEventListener('click', () => {
      card.classList.toggle('sealed');
      audio.playPop();
      triggerHaptic([20]);
      fx.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 18);
      markActivityDone('act-7');
    });
    container.appendChild(card);
  });
}

// ==========================================================================
// FEATURE 8: 🎡 SPIN THE WHEEL
// ==========================================================================
const WHEEL_ITEMS = [
  "Chocolate 🍫",
  "One Hug 🤗",
  "Movie 🍿",
  "Pizza 🍕",
  "Selfie Together 📸",
  "Coffee ☕",
  "Secret Gift 🎁",
  "Wish Card 💌"
];

const WHEEL_COLORS = ['#ff758f', '#b5e2fa', '#ffb703', '#caffbf', '#c77dff', '#a0c4ff', '#ff8fa3', '#ffd166'];
let currentWheelRotation = 0;

function initWheelCanvas() {
  const canvas = document.getElementById('wheel-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const numSegments = WHEEL_ITEMS.length;
  const anglePerSeg = (Math.PI * 2) / numSegments;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 10;

    for (let i = 0; i < numSegments; i++) {
      const startAngle = i * anglePerSeg + currentWheelRotation;
      const endAngle = startAngle + anglePerSeg;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Text Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + anglePerSeg / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#2b2d42';
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.fillText(WHEEL_ITEMS[i], radius - 20, 8);
      ctx.restore();
    }

    // Center Cap
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#ff758f';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  draw();

  const spinBtn = document.getElementById('btn-spin-wheel');
  spinBtn.onclick = () => {
    if (STATE.isWheelSpinning) return;
    STATE.isWheelSpinning = true;
    audio.playPop();
    triggerHaptic([20]);

    const spins = 5 + Math.floor(Math.random() * 5);
    const targetAngle = spins * Math.PI * 2 + Math.random() * Math.PI * 2;
    const duration = 4000;
    const start = performance.now();

    function animateSpin(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      currentWheelRotation = targetAngle * easeOut;
      draw();
      audio.playWheelTick();

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        STATE.isWheelSpinning = false;
        const normalized = (Math.PI * 2.5 - (currentWheelRotation % (Math.PI * 2))) % (Math.PI * 2);
        const winIdx = Math.floor(normalized / anglePerSeg) % numSegments;
        const prize = WHEEL_ITEMS[winIdx];
        
        markActivityDone('act-8');
        showModal("You Won a Special Coupon! 🎡", `Your Reward: ${prize}\n\nShow this ticket to your brother to claim!`, "🎁");
      }
    }

    requestAnimationFrame(animateSpin);
  };
}

// ==========================================================================
// FEATURE 9: 😊 EMOJI CHALLENGE
// ==========================================================================
function initEmojiBattle() {
  const gameArea = document.getElementById('emoji-game-area');
  const scoreText = document.getElementById('emoji-score');
  const timerText = document.getElementById('emoji-timer');
  const startBtn = document.getElementById('btn-start-emoji-game');

  const emojis = ['❤️', '😂', '🥹', '😎', '🤭', '🎉'];

  if (!startBtn) return;

  startBtn.addEventListener('click', () => {
    STATE.emojiScore = 0;
    let timeLeft = 15;
    scoreText.innerText = STATE.emojiScore;
    timerText.innerText = `${timeLeft}s`;
    gameArea.innerHTML = '';
    audio.playPop();
    triggerHaptic([20]);

    function spawnEmoji() {
      if (timeLeft <= 0) return;
      const el = document.createElement('div');
      el.className = 'floating-target-emoji';
      el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
      
      const maxX = gameArea.clientWidth - 50;
      const maxY = gameArea.clientHeight - 50;
      el.style.left = `${Math.max(10, Math.random() * maxX)}px`;
      el.style.top = `${Math.max(10, Math.random() * maxY)}px`;

      el.addEventListener('click', () => {
        STATE.emojiScore += 10;
        scoreText.innerText = STATE.emojiScore;
        audio.playPop();
        triggerHaptic([15]);
        el.remove();
        spawnEmoji();
      });

      gameArea.appendChild(el);

      setTimeout(() => {
        if (el.parentNode) el.remove();
      }, 1100);
    }

    spawnEmoji();
    spawnEmoji();

    if (STATE.emojiTimer) clearInterval(STATE.emojiTimer);
    STATE.emojiTimer = setInterval(() => {
      timeLeft--;
      timerText.innerText = `${timeLeft}s`;
      if (timeLeft % 2 === 0) spawnEmoji();

      if (timeLeft <= 0) {
        clearInterval(STATE.emojiTimer);
        gameArea.innerHTML = `<div class="start-hint-text" style="color: var(--primary-pink); font-size: 1.1rem; flex-direction: column;"><span>Game Over!</span><span>Final Score: ${STATE.emojiScore}</span></div>`;
        markActivityDone('act-9');
        showModal("Title Awarded! 🏆", "You officially win the title of Best Cousin Ever ❤️", "👑");
      }
    }, 1000);
  });
}

// ==========================================================================
// FEATURE 10: 🌸 WISH JAR
// ==========================================================================
const WISHES = [
  "Stay happy always.",
  "Keep smiling.",
  "Achieve every dream.",
  "Never lose your beautiful laugh.",
  "May our friendship stay forever."
];
let wishIndex = 0;

function initWishJar() {
  const target = document.getElementById('jar-click-target');
  const display = document.getElementById('wish-display');

  if (!target) return;

  target.addEventListener('click', () => {
    audio.playPop();
    triggerHaptic([20]);
    fx.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 28, 'petals');
    
    display.innerText = `🌸 "${WISHES[wishIndex]}"`;
    wishIndex = (wishIndex + 1) % WISHES.length;
    markActivityDone('act-10');
  });
}

// ==========================================================================
// FEATURE 11: 🌍 DISTANCE DOESN'T MATTER MAP
// ==========================================================================
function drawDistanceMap() {
  const canvas = document.getElementById('map-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = 220;

  const w = canvas.width;
  const h = canvas.height;

  const p1 = { x: w * 0.22, y: h * 0.65, label: "Brother" };
  const p2 = { x: w * 0.78, y: h * 0.35, label: "Sister" };

  let t = 0;

  function render() {
    ctx.clearRect(0, 0, w, h);

    // Golden Curved Thread connecting cities
    ctx.beginPath();
    ctx.setLineDash([6, 6]);
    ctx.moveTo(p1.x, p1.y);
    const cp = { x: w * 0.5, y: h * 0.12 }; // curve control point
    ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y);
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);

    // Location Pins
    [p1, p2].forEach(p => {
      ctx.fillStyle = '#ff758f';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'var(--text-main)';
      ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, p.y + 22);
    });

    // Flying Paper Airplane along golden curve
    t = (t + 0.005) % 1;
    const ax = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * cp.x + t * t * p2.x;
    const ay = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * cp.y + t * t * p2.y;

    ctx.font = '22px sans-serif';
    ctx.fillText('✈️', ax, ay);

    requestAnimationFrame(render);
  }

  render();
}

// ==========================================================================
// FEATURE 12: 💬 FUNNY CHAT SIMULATOR
// ==========================================================================
const CHAT_SCRIPT = [
  { sender: 'her', text: 'Missed me?' },
  { sender: 'me', text: 'Never... Okay maybe a little 😅' },
  { sender: 'her', text: 'You owe me chocolate.' },
  { sender: 'me', text: 'I already knew that.' },
  { sender: 'her', text: 'Best cousin?' },
  { sender: 'me', text: 'Always ❤️' }
];

function initChatSimulator() {
  const box = document.getElementById('chat-messages-box');
  const btn = document.getElementById('btn-next-chat-msg');
  if (!box || !btn) return;

  box.innerHTML = '';
  STATE.chatIndex = 0;

  btn.onclick = () => {
    if (STATE.chatIndex < CHAT_SCRIPT.length) {
      const msg = CHAT_SCRIPT[STATE.chatIndex];
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${msg.sender}`;
      bubble.innerText = msg.text;
      box.appendChild(bubble);
      box.scrollTop = box.scrollHeight;
      audio.playPop();
      triggerHaptic([15]);
      STATE.chatIndex++;

      if (STATE.chatIndex >= CHAT_SCRIPT.length) {
        btn.innerText = "❤️ Chat Completed!";
        markActivityDone('act-12');
      }
    }
  };
}

// ==========================================================================
// FEATURE 13: 🙈 CUTE BROTHER CHECK (ENTIRE BUTTON BLOCK MOVES UNIFIED INSIDE WHITE BOX)
// ==========================================================================
function initCuteBrotherCheck() {
  const btnNo = document.getElementById('btn-cute-no');
  const btnYes = document.getElementById('btn-cute-yes');
  const cardArena = document.getElementById('cute-card-arena');
  const arena = document.getElementById('cute-answers-area');
  const resultMsg = document.getElementById('cute-result-msg');

  if (!btnNo || !btnYes || !cardArena) return;

  const dodgeNoButton = (e) => {
    if (e) e.preventDefault();
    audio.playPop();
    triggerHaptic([15]);

    const cardWidth = cardArena.clientWidth;
    const cardHeight = cardArena.clientHeight;
    const btnWidth = btnNo.offsetWidth || 90;
    const btnHeight = btnNo.offsetHeight || 40;

    // Safe padding boundaries inside the white card box
    const paddingX = 18;
    const paddingY = 18;

    const minX = paddingX;
    const maxX = Math.max(minX + 10, cardWidth - btnWidth - paddingX);

    const minY = paddingY;
    const maxY = Math.max(minY + 10, cardHeight - btnHeight - paddingY);

    const randomX = Math.floor(Math.random() * (maxX - minX) + minX);
    const randomY = Math.floor(Math.random() * (maxY - minY) + minY);

    // Reset right/bottom so entire button box moves as one unified block!
    btnNo.style.position = 'absolute';
    btnNo.style.right = 'auto';
    btnNo.style.bottom = 'auto';
    btnNo.style.left = `${randomX}px`;
    btnNo.style.top = `${randomY}px`;
    btnNo.style.display = 'inline-block';
    btnNo.style.visibility = 'visible';
    btnNo.style.opacity = '1';
  };

  btnNo.addEventListener('mouseover', dodgeNoButton);
  btnNo.addEventListener('mouseenter', dodgeNoButton);
  btnNo.addEventListener('touchstart', dodgeNoButton);
  btnNo.addEventListener('pointerdown', dodgeNoButton);
  btnNo.addEventListener('click', dodgeNoButton);

  btnYes.addEventListener('click', () => {
    audio.playFanfare();
    triggerHaptic([40, 50, 40]);
    fx.spawnFireworks(8);
    fx.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 60);

    arena.style.display = 'none';
    btnNo.style.display = 'none'; // Hide dodging button when YES is clicked
    resultMsg.style.display = 'block';

    markActivityDone('act-13');

    showModal("I knew it! 🥰", "Thank you! You are officially the best sister ever ❤️", "🥰");
  });
}

// ==========================================================================
// APP INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  fx = new CanvasParticles('bg-canvas');

  // Check if app is already running as installed PWA app
  if (isPWAInstalled()) {
    hideInstallButtons();
  }

  // Theme Init
  document.body.setAttribute('data-theme', STATE.theme);

  // Install PWA Button Click Handlers
  const pwaBtn = document.getElementById('pwa-install-btn');
  const splashBtn = document.getElementById('splash-install-btn');
  if (pwaBtn) pwaBtn.addEventListener('click', triggerPWAInstall);
  if (splashBtn) splashBtn.addEventListener('click', triggerPWAInstall);

  // Audio Toggle
  document.getElementById('audio-toggle-btn').addEventListener('click', (e) => {
    STATE.soundEnabled = !STATE.soundEnabled;
    e.target.innerText = STATE.soundEnabled ? '🎵' : '🔇';
    audio.toggleBgMusic();
  });

  // Theme Toggle
  document.getElementById('theme-toggle-btn').addEventListener('click', (e) => {
    STATE.theme = STATE.theme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', STATE.theme);
    localStorage.setItem('rakhi_theme', STATE.theme);
    e.target.innerText = STATE.theme === 'light' ? '🌙' : '☀️';
  });

  // Splash Screen Button
  document.getElementById('btn-open-gift').addEventListener('click', () => {
    switchScreen('home-screen');
    audio.startBgMusic();
  });

  // Grand Finale Navigation
  document.getElementById('btn-goto-final').addEventListener('click', () => {
    switchScreen('final-screen');
  });

  // Finale Replay Fireworks
  document.getElementById('btn-celebrate-burst').addEventListener('click', () => {
    fx.spawnFireworks(8);
    audio.playFanfare();
    triggerHaptic([50, 50, 50]);
  });

  // Finale Back to Home
  document.getElementById('btn-replay-memories').addEventListener('click', () => {
    switchScreen('home-screen');
  });

  // Global Modal Close Button
  document.getElementById('modal-close-btn').addEventListener('click', () => {
    document.getElementById('global-modal').classList.remove('active');
  });

  // Activity Grid Tile Clicks
  document.querySelectorAll('.activity-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const actId = tile.dataset.act;
      switchScreen(actId);
    });
  });

  // Bottom Navigation Dock Tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.target;
      switchScreen(target);
    });
  });

  // Init All Features & Reset to Front State
  initPhotoWall();
  renderQuizQuestion();
  initFriendshipMeter();
  initRoastGenerator();
  initRakhiCeremony();
  initSecretBox();
  initPromiseWall();
  initWheelCanvas();
  initEmojiBattle();
  initWishJar();
  initChatSimulator();
  initCuteBrotherCheck();
  resetAllAppStages();
});
