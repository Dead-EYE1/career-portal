// =============================================
// ASSAM CAREER PORTAL — JAVASCRIPT
// =============================================

// ---- SUPABASE CONFIG ----
const SUPABASE_URL = 'https://bnpsnehsyjtvqtfmmjbo.supabase.co';
// Replace this with your actual Supabase Anon Key
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJucHNuZWhzeWp0dnF0Zm1tamJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDc4NTMsImV4cCI6MjA5NDcyMzg1M30.oHNiY68WiDK2BWTRdI4YrE55Gxc9xXr-E38vxLJkY2Q';
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function fetchJobs() {
  if (supabaseClient && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
    try {
      const { data, error } = await supabaseClient.from('jobs').select('*').order('id', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) return data;
    } catch (err) {
      console.error("Supabase fetch failed, falling back to JSON:", err);
    }
  }
  return fetchSectionData('data/jobs.json');
}

// ---- DATA FETCHING ----
let allData = [];

// Convert ISO date (2026-04-24) → "April 24, 2026"
function isoToDisplay(iso) {
  if (!iso || iso.includes(',')) return iso; // already formatted
  const [y,m,d] = iso.split('-');
  if (!y || !m || !d) return iso;
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[+m-1]} ${+d}, ${y}`;
}

function normaliseDate(items) {
  if (!items) return [];
  return items.map(item => ({ ...item, date: isoToDisplay(item.date) }));
}

async function fetchSectionData(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network response was not ok");
    const json = await res.json();
    return json.items || [];
  } catch (err) {
    console.error("Error fetching " + url, err);
    return [];
  }
}

// ---- UTILS ----
function getBadgeClass(badge) {
  const map = {
    new: "badge-new",
    hot: "badge-hot",
    admit: "badge-admit",
    result: "badge-result",
    scholarship: "badge-scholarship",
  };
  return map[badge] || "badge-new";
}

function getBadgeText(badge) {
  const map = {
    new: "NEW",
    hot: "HOT",
    admit: "ADMIT",
    result: "RESULT",
    scholarship: "AWARD",
  };
  return map[badge] || "NEW";
}

function getButtonText(badge) {
  const map = {
    admit: "Download Now",
    result: "Check Result",
    scholarship: "Apply Now",
    new: "Apply Now",
    hot: "Apply Now"
  };
  return map[badge] || "View Details";
}

// ---- RENDER POSTS ----
function toggleJobDetails(el) {
  const details = el.querySelector('.post-details');
  const arrow = el.querySelector('.post-arrow');
  if (details) {
    const isExpanded = details.classList.contains('expanded');
    document.querySelectorAll('.post-details.expanded').forEach(d => {
      d.classList.remove('expanded');
      d.style.maxHeight = null;
    });
    document.querySelectorAll('.post-item.expanded-card').forEach(c => {
      c.classList.remove('expanded-card');
      const arr = c.querySelector('.post-arrow');
      if (arr) arr.style.transform = 'rotate(0deg)';
    });

    if (!isExpanded) {
      details.classList.add('expanded');
      el.classList.add('expanded-card');
      details.style.maxHeight = details.scrollHeight + "px";
      if (arrow) arrow.style.transform = 'rotate(90deg)';
    }
  }
}

function renderPosts(listId, data) {
  const container = document.getElementById(listId);
  if (!container) return;
  container.innerHTML = data.map(item => `
    <div class="post-item" role="listitem" tabindex="0" aria-label="${item.title}" onclick="toggleJobDetails(this)">
      <span class="post-badge ${getBadgeClass(item.badge)}">${getBadgeText(item.badge)}</span>
      <div class="post-content">
        <div class="post-title">${item.title}</div>
        <div class="post-meta">
          <span>📅 ${item.date}</span>
          ${item.posts ? `<span>👤 ${item.posts}</span>` : ""}
          <span class="post-meta-tag">🏷️ ${item.tag}</span>
        </div>
        ${(item.apply_date || item.last_date || item.education || item.other_details || item.salary || item.location || item.application_fee) ? `
        <div class="post-details">
          <div class="post-details-grid">
            ${item.apply_date ? `<div class="detail-item"><strong>Apply Date:</strong> ${item.apply_date}</div>` : ''}
            ${item.last_date ? `<div class="detail-item"><strong>Last Date:</strong> <span class="highlight-date">${item.last_date}</span></div>` : ''}
            ${item.salary ? `<div class="detail-item"><strong>Salary:</strong> ${item.salary}</div>` : ''}
            ${item.location ? `<div class="detail-item"><strong>Location:</strong> ${item.location}</div>` : ''}
            ${item.application_fee ? `<div class="detail-item"><strong>Application Fee:</strong> ${item.application_fee}</div>` : ''}
            ${item.education ? `<div class="detail-item full-width"><strong>Education:</strong> ${item.education}</div>` : ''}
            ${item.other_details ? `<div class="detail-item full-width"><strong>Other Details:</strong> ${item.other_details}</div>` : ''}
          </div>
          <a href="${item.apply_link || '#'}" class="apply-btn" target="_blank" rel="noopener noreferrer">${getButtonText(item.badge)}</a>
        </div>
        ` : ''}
      </div>
      <span class="post-arrow">›</span>
    </div>
  `).join("");
}

// ---- CATEGORY FILTER ----
function initCategoryFilter() {
  const chips       = document.querySelectorAll(".cat-chip");
  const block       = document.getElementById("filter-results-block");
  const title       = document.getElementById("filter-results-title");
  const list        = document.getElementById("filter-results-list");
  const noResults   = document.getElementById("no-filter-results");
  const clearBtn    = document.getElementById("clear-filter-btn");

  if (!block || !title || !list || !noResults || !clearBtn) return;

  function clearFilter() {
    block.style.display = "none";
    list.innerHTML = "";
    noResults.style.display = "none";
    chips.forEach(c => c.classList.remove("active"));
  }

  chips.forEach(chip => {
    chip.addEventListener("click", (e) => {
      e.preventDefault();

      // If clicking the already-active chip, clear and hide
      if (chip.classList.contains("active")) {
        clearFilter();
        return;
      }

      // Mark active chip
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");

      const category = chip.dataset.category;
      const label    = chip.textContent.trim();

      // Filter allData — match category field (case-insensitive)
      const matches = allData.filter(item =>
        (item.category && item.category.toLowerCase().includes(category.toLowerCase())) ||
        (item.tag      && item.tag.toLowerCase().includes(category.toLowerCase()))
      );

      // Build heading with count badge
      title.innerHTML = `🔍 ${label} <span class="filter-count-badge">${matches.length}</span>`;

      // Show block
      block.style.display = "block";

      if (matches.length === 0) {
        list.innerHTML = "";
        noResults.style.display = "block";
      } else {
        noResults.style.display = "none";
        list.innerHTML = matches.map(item => `
          <div class="post-item" role="listitem" tabindex="0" aria-label="${item.title}" onclick="toggleJobDetails(this)">
            <span class="post-badge ${getBadgeClass(item.badge)}">${item.section}</span>
            <div class="post-content">
              <div class="post-title">${item.title}</div>
              <div class="post-meta">
                <span>📅 ${item.date}</span>
                ${item.posts ? `<span>👤 ${item.posts}</span>` : ""}
                <span class="post-meta-tag">🏷️ ${item.tag}</span>
              </div>
              ${(item.apply_date || item.last_date || item.education || item.other_details || item.salary || item.location || item.application_fee) ? `
              <div class="post-details">
                <div class="post-details-grid">
                  ${item.apply_date ? `<div class="detail-item"><strong>Apply Date:</strong> ${item.apply_date}</div>` : ''}
                  ${item.last_date ? `<div class="detail-item"><strong>Last Date:</strong> <span class="highlight-date">${item.last_date}</span></div>` : ''}
                  ${item.salary ? `<div class="detail-item"><strong>Salary:</strong> ${item.salary}</div>` : ''}
                  ${item.location ? `<div class="detail-item"><strong>Location:</strong> ${item.location}</div>` : ''}
                  ${item.application_fee ? `<div class="detail-item"><strong>Application Fee:</strong> ${item.application_fee}</div>` : ''}
                  ${item.education ? `<div class="detail-item full-width"><strong>Education:</strong> ${item.education}</div>` : ''}
                  ${item.other_details ? `<div class="detail-item full-width"><strong>Other Details:</strong> ${item.other_details}</div>` : ''}
                </div>
                <a href="${item.apply_link || '#'}" class="apply-btn" target="_blank" rel="noopener noreferrer">${getButtonText(item.badge)}</a>
              </div>
              ` : ''}
            </div>
            <span class="post-arrow">›</span>
          </div>
        `).join("");
      }

      // Smooth scroll to results
      block.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  clearBtn.addEventListener("click", clearFilter);
}




// ---- LIVE DATE ----
function setLiveDate() {
  const el = document.getElementById("live-date");
  if (!el) return;
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const now = new Date();
  el.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

// ---- SEARCH LOGIC ----
let searchDebounceTimer = null;

function doSearch(query) {
  const overlay = document.getElementById("search-overlay");
  const resultsList = document.getElementById("search-results-list");
  const noResults = document.getElementById("no-results-msg");
  
  if (!overlay || !resultsList) return;

  if (!query || query.trim().length < 2) {
    overlay.classList.remove("active");
    return;
  }

  const q = query.toLowerCase().trim();
  const matches = allData.filter(item =>
    item.title.toLowerCase().includes(q) ||
    (item.category && item.category.toLowerCase().includes(q)) ||
    (item.tag && item.tag.toLowerCase().includes(q))
  );

  overlay.classList.add("active");

  if (matches.length === 0) {
    resultsList.innerHTML = `<p class="no-results">No results found for "<strong>${query}</strong>"</p>`;
    return;
  }

  const highlight = (text) => {
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
    return text.replace(re, "<mark>$1</mark>");
  };

  resultsList.innerHTML = matches.map(item => `
    <div class="search-result-item" role="option" tabindex="0">
      <span class="search-result-tag post-badge ${getBadgeClass(item.badge)}">${item.section}</span>
      <span class="search-result-title">${highlight(item.title)}</span>
    </div>
  `).join("");
}

// ---- HAMBURGER MENU ----
function initHamburger() {
  const btn = document.getElementById("hamburger-btn");
  const menu = document.getElementById("nav-menu");
  if (!btn || !menu) return;
  btn.addEventListener("click", () => {
    menu.classList.toggle("open");
    btn.setAttribute("aria-expanded", menu.classList.contains("open").toString());
  });
}

// ---- TICKER DUPLICATE ----
function initTicker() {
  const track = document.getElementById("ticker-track");
  if (!track) return;
  // Duplicate items for seamless looping
  track.innerHTML += track.innerHTML;
}

// ---- NEWSLETTER FORM ----
function initNewsletter() {
  const form = document.getElementById("newsletter-form");
  const success = document.getElementById("newsletter-success");
  if (!form || !success) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("newsletter-email");
    if (email && email.value) {
      form.style.display = "none";
      success.style.display = "block";
      setTimeout(() => {
        success.style.display = "none";
        form.style.display = "flex";
        email.value = "";
      }, 4000);
    }
  });
}

// ---- NAV ACTIVE STATE ----
function initNavLinks() {
  const links = document.querySelectorAll(".nav-link");
  links.forEach(link => {
    link.addEventListener("click", (e) => {
      links.forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      // Close mobile menu
      const menu = document.getElementById("nav-menu");
      if (menu) menu.classList.remove("open");
    });
  });
}

// ---- BACK TO TOP ----
function initBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (!btn) return;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ---- SCROLL HEADER SHADOW ----
function initScrollHeader() {
  const header = document.getElementById("main-header");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 30) {
      header && header.classList.add("scrolled");
    } else {
      header && header.classList.remove("scrolled");
    }
  }, { passive: true });
}

// ---- SEARCH SETUP ----
function initSearch() {
  const input = document.getElementById("search-input");
  const btn = document.getElementById("search-btn");
  const overlay = document.getElementById("search-overlay");
  const closeBtn = document.getElementById("search-close-btn");
  const widgetInput = document.getElementById("widget-search-input");
  const widgetBtn = document.getElementById("widget-search-btn");

  if (input) {
    input.addEventListener("input", (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => doSearch(e.target.value), 200);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch(input.value);
    });
  }

  if (btn) {
    btn.addEventListener("click", () => {
      if (input) doSearch(input.value);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (overlay) overlay.classList.remove("active");
      if (input) input.value = "";
    });
  }

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
        if (input) input.value = "";
      }
    });
  }

  // Widget search
  if (widgetInput) {
    widgetInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        if (input) input.value = widgetInput.value;
        doSearch(widgetInput.value);
      }
    });
  }
  if (widgetBtn) {
    widgetBtn.addEventListener("click", () => {
      if (widgetInput) {
        if (input) input.value = widgetInput.value;
        doSearch(widgetInput.value);
      }
    });
  }

  // ESC to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay && overlay.classList.contains("active")) {
      overlay.classList.remove("active");
      if (input) input.value = "";
    }
  });
}

// ---- SMOOTH ITEM HOVER ----
function initItemHover() {
  document.addEventListener("mouseover", (e) => {
    const item = e.target.closest(".post-item");
    if (item && !item.dataset.hovered) {
      item.dataset.hovered = "1";
    }
  });
}

// ---- INTERSECTION OBSERVER (Animate cards) ----
function initAnimations() {
  if (!('IntersectionObserver' in window)) return;
  const items = document.querySelectorAll(".qnav-box, .cat-chip, .post-item");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  items.forEach((item, i) => {
    item.style.opacity = "0";
    item.style.transform = "translateY(12px)";
    item.style.transition = `opacity 0.4s ease ${i * 0.04}s, transform 0.4s ease ${i * 0.04}s`;
    observer.observe(item);
  });
}

// ---- INIT ----
document.addEventListener("DOMContentLoaded", async () => {
  setLiveDate();
  
  // Fetch JSON data dynamically
  const [rawJobs, rawAdmit, rawResult, rawScholarship] = await Promise.all([
    fetchJobs(),
    fetchSectionData('data/admit.json'),
    fetchSectionData('data/result.json'),
    fetchSectionData('data/scholarship.json')
  ]);

  const jobsData = normaliseDate(rawJobs);
  const admitData = normaliseDate(rawAdmit);
  const resultData = normaliseDate(rawResult);
  const scholarshipData = normaliseDate(rawScholarship);

  allData = [
    ...jobsData.map(j => ({ ...j, section: "Govt Job" })),
    ...admitData.map(a => ({ ...a, section: "Admit Card" })),
    ...resultData.map(r => ({ ...r, section: "Result" })),
    ...scholarshipData.map(s => ({ ...s, section: "Scholarship" })),
  ];

  renderPosts("posts-list", jobsData);
  renderPosts("admit-list", admitData);
  renderPosts("result-list", resultData);
  renderPosts("scholarship-list", scholarshipData);
  initCategoryFilter();

  initTicker();
  initHamburger();
  initNewsletter();
  initNavLinks();
  initBackToTop();
  initScrollHeader();
  initSearch();
  initItemHover();
  // Delay animations slightly
  setTimeout(initAnimations, 100);

  // Header scroll style
  const style = document.createElement("style");
  style.textContent = `.header.scrolled { box-shadow: 0 4px 20px rgba(0,53,128,0.14); }`;
  document.head.appendChild(style);

  console.log("✅ New Job Portal Loaded Successfully");
});
