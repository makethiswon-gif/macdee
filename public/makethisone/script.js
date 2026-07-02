/* ============================================
   makethis1. — Script
   Animations, Data Layer, & Interactions
   ============================================ */

// ---- INTRO ANIMATION ----
function runIntro() {
  const splash = document.getElementById('introSplash');
  if (!splash) return;

  // 세션당 1회만 인트로 — 이미 본 세션이면 즉시 스킵 (매 방문 2.4초 대기 제거)
  let seen = false;
  try { seen = sessionStorage.getItem('mto_intro_seen') === '1'; } catch (e) { /* ignore */ }

  if (seen) {
    splash.remove();
    document.body.classList.remove('intro-active');
    return;
  }
  try { sessionStorage.setItem('mto_intro_seen', '1'); } catch (e) { /* ignore */ }

  // Wait for character animations to finish, then fade out
  setTimeout(() => {
    splash.classList.add('hidden');
    document.body.classList.remove('intro-active');

    // Remove from DOM after transition
    setTimeout(() => {
      splash.remove();
    }, 700);
  }, 2400);
}

// ---- DATA LAYER (localStorage) ----
const STORAGE_KEYS = {
  PORTFOLIO: 'macdee_portfolio',
  COLUMNS: 'macdee_columns'
};

const DEFAULT_PORTFOLIO = [
  {
    id: 1,
    title: '법무법인 새록',
    category: 'Marketing',
    description: '',
    image: '',
    color: '#0a2d6e'
  },
  {
    id: 2,
    title: '법무법인 양영&정훈',
    category: 'Marketing',
    description: '',
    image: '',
    color: '#10234f'
  },
  {
    id: 3,
    title: '법무법인 오른',
    category: 'Marketing',
    description: '',
    image: '',
    color: '#0a3048'
  },
  {
    id: 4,
    title: '법무법인 그날',
    category: 'Marketing',
    description: '',
    image: '',
    color: '#0c2450'
  },
  {
    id: 5,
    title: '이정도 변호사',
    category: 'Marketing',
    description: '',
    image: '',
    color: '#1a1050'
  },
  {
    id: 6,
    title: '법무법인 율빛',
    category: 'Marketing',
    description: '',
    image: '',
    color: '#162045'
  },
  {
    id: 7,
    title: '법무법인 해밀',
    category: 'Marketing',
    description: '',
    image: '',
    color: '#102a52'
  },
  {
    id: 8,
    title: '법무법인 안세',
    category: 'Marketing',
    description: '',
    image: '',
    color: '#0a3048'
  },
  {
    id: 9,
    title: '카라 법률사무소',
    category: 'Marketing',
    description: '',
    image: '',
    color: '#2a1838'
  },
  {
    id: 10,
    title: '법무법인 류현',
    category: 'Marketing',
    description: '',
    image: '',
    color: '#182050'
  }
];

const DEFAULT_COLUMNS = [
  {
    id: 1,
    title: 'AI 시대에도 변호사 블로그를 멈추면 안 되는 이유',
    excerpt: 'AI가 발전해도 전문성과 신뢰를 보여줄 수 있는 블로그의 가치는 오히려 높아집니다.',
    date: '2026.01.15'
  },
  {
    id: 2,
    title: '네이버 블로그 지수, 정말 중요한가?',
    excerpt: '블로그 지수의 실체와 로펌 마케팅에서 진정으로 중요한 지표를 분석합니다.',
    date: '2026.01.08'
  },
  {
    id: 3,
    title: '법률사무소 마케팅 블로그가 필수인 이유',
    excerpt: '잠재 의뢰인이 변호사를 찾는 경로와 블로그의 역할을 데이터로 살펴봅니다.',
    date: '2025.12.20'
  }
];

function getData(key, defaults) {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch (e) { /* ignore */ }
  return defaults;
}

function setData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ---- RENDER PORTFOLIO ----
function renderPortfolio() {
  const grid = document.getElementById('portfolioGrid');
  if (!grid) return;
  // 기본값은 초기 HTML에 정적 렌더됨(SEO·크롤). 관리자 localStorage 커스터마이즈가 있을 때만 덮어씀.
  let stored = null;
  try { stored = localStorage.getItem(STORAGE_KEYS.PORTFOLIO); } catch (e) { /* ignore */ }
  if (!stored) return;
  let items;
  try { items = JSON.parse(stored); } catch (e) { return; }
  if (!Array.isArray(items) || !items.length) return;

  grid.innerHTML = items.map((item, i) => `
    <div class="portfolio-card reveal reveal-delay-${(i % 4) + 1}">
      <div class="card-image" style="
        width:100%; height:100%;
        background: linear-gradient(135deg, ${item.color || '#0a2d6e'} 0%, ${adjustColor(item.color || '#0a2d6e', 30)} 100%);
        display: flex; align-items: center; justify-content: center;
      ">
        ${item.image
      ? `<img src="${item.image}" alt="${item.title}" style="width:100%;height:100%;object-fit:cover;">`
      : `<span style="font-family:var(--font-en);font-weight:900;font-size:2.5rem;color:rgba(255,255,255,0.06);text-transform:uppercase;letter-spacing:0.05em;">${item.category}</span>`
    }
      </div>
      <div class="card-overlay">
        <span class="card-category">${item.category}</span>
        <h3 class="card-title">${item.title}</h3>
        <p class="card-desc">${item.description}</p>
      </div>
    </div>
  `).join('');

  observeElements();
}

function adjustColor(hex, amount) {
  hex = hex.replace('#', '');
  const num = parseInt(hex, 16);
  let r = Math.min(255, ((num >> 16) & 0xFF) + amount);
  let g = Math.min(255, ((num >> 8) & 0xFF) + amount);
  let b = Math.min(255, (num & 0xFF) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ---- RENDER COLUMNS ----
async function renderColumns() {
  const list = document.getElementById('columnList');
  if (!list) return;

  try {
    const res = await fetch('/api/magazine?page=1');
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();
    let items = data.magazines || [];

    if (items.length === 0) {
      // Fallback
      items = getData(STORAGE_KEYS.COLUMNS, DEFAULT_COLUMNS).slice(0, 3);
      list.innerHTML = items.map((item, i) => `
        <div class="column-item reveal reveal-delay-${(i % 3) + 1}">
          <span class="col-number">${String(i + 1).padStart(2, '0')}</span>
          <div class="col-content">
            <h3 class="col-title">${item.title}</h3>
            <p class="col-excerpt">${item.excerpt || ''}</p>
          </div>
          <span class="col-arrow">→</span>
        </div>
      `).join('');
    } else {
      items = items.slice(0, 3); // top 3
      list.innerHTML = items.map((item, i) => `
        <a href="${item.slug ? `/magazine/${item.slug}` : '#'}" class="column-item reveal reveal-delay-${(i % 3) + 1}" style="text-decoration:none;">
          <span class="col-number">${String(i + 1).padStart(2, '0')}</span>
          <div class="col-content">
            <h3 class="col-title">${item.title}</h3>
            <p class="col-excerpt">${item.excerpt || ''}</p>
          </div>
          <span class="col-arrow">→</span>
        </a>
      `).join('');
    }
    observeElements();
  } catch (err) {
    console.error('Error fetching columns:', err);
    const items = getData(STORAGE_KEYS.COLUMNS, DEFAULT_COLUMNS).slice(0, 3);
    list.innerHTML = items.map((item, i) => `
      <div class="column-item reveal reveal-delay-${(i % 3) + 1}">
        <span class="col-number">${String(i + 1).padStart(2, '0')}</span>
        <div class="col-content">
          <h3 class="col-title">${item.title}</h3>
          <p class="col-excerpt">${item.excerpt || ''}</p>
        </div>
        <span class="col-arrow">→</span>
      </div>
    `).join('');
    observeElements();
  }
}

// ---- MENU ----
const menuToggle = document.getElementById('menuToggle');
const menuOverlay = document.getElementById('menuOverlay');
let menuOpen = false;

if (menuToggle && menuOverlay) {
  menuToggle.addEventListener('click', () => {
    menuOpen = !menuOpen;
    menuToggle.classList.toggle('active', menuOpen);
    menuOverlay.classList.toggle('active', menuOpen);
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  });
}

function closeMenu() {
  menuOpen = false;
  if (menuToggle) menuToggle.classList.remove('active');
  if (menuOverlay) menuOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ---- HEADER SCROLL ----
const header = document.getElementById('header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (header) {
    header.classList.toggle('scrolled', y > 80);
  }
  lastScroll = y;
});

// ---- INTERSECTION OBSERVER (scroll reveal) ----
function observeElements() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
}

// ---- SMOOTH SCROLL ----
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 72;
      window.scrollTo({
        top: target.offsetTop - offset,
        behavior: 'smooth'
      });
    }
  });
});

// ---- CONTACT FORM ----
async function handleContactSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  const entries = Object.fromEntries(data);
  const submitBtn = form.querySelector('.btn-submit');
  
  if (submitBtn) {
    submitBtn.textContent = '전송 중...';
    submitBtn.disabled = true;
  }

  // reCAPTCHA v3 토큰 발급 (미로드 시 토큰 없이 진행 — 서버가 관용 처리)
  try {
    const g = window.grecaptcha;
    if (g && g.execute) {
      entries.recaptchaToken = await new Promise((resolve) => {
        g.ready(() => {
          g.execute('6LfNdlYsAAAAAHC5fbwGZbkcdSWaLKSEsrfTqQrb', { action: 'contact' })
            .then(resolve).catch(() => resolve(''));
        });
      });
    }
  } catch (err) { /* ignore */ }

  try {
    const response = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries)
    });

    const result = await response.json();

    if (response.ok) {
      showContactToast('문의가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.');
      form.reset();
    } else {
      showContactToast('접수 중 오류가 발생했습니다: ' + (result.error || '다시 시도해주세요.'));
    }
  } catch (error) {
    console.error('Contact Submit Error:', error);
    showContactToast('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  } finally {
    if (submitBtn) {
      submitBtn.textContent = '무료 상담 문의하기';
      submitBtn.disabled = false;
    }
  }
}

// Simple toast for main site
function showContactToast(msg) {
  const existing = document.querySelector('.contact-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'contact-toast';
  toast.innerHTML = '<span>✓</span> ' + msg;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}


// ---- STAT COUNTER ANIMATION ----
function initCounters() {
  const counters = document.querySelectorAll('.stat-number[data-target]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

function animateCounter(el) {
  const target = parseInt(el.getAttribute('data-target'));
  const duration = 1600;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutCubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  runIntro();
  renderPortfolio();
  renderColumns();
  observeElements();
  initCounters();
});
