// =============================================
// ASSAM CAREER PORTAL — JAVASCRIPT
// =============================================

// ---- DATA FETCHING ----
let allData = [];

// Convert ISO date (2026-04-24) → "April 24, 2026"
function isoToDisplay(iso) {
  if (!iso || iso.includes(',')) return iso; // already formatted
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[+m - 1]} ${+d}, ${y}`;
}

function normaliseDate(items) {
  if (!items) return [];
  return items.map(item => ({
    ...item,
    raw_date: item.date,
    raw_apply_date: item.apply_date,
    raw_last_date: item.last_date,
    date: isoToDisplay(item.date),
    apply_date: isoToDisplay(item.apply_date),
    last_date: isoToDisplay(item.last_date)
  }));
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
    scholarship: "badge-scholarship",
  };
  return map[badge] || "badge-new";
}

function getBadgeText(badge) {
  const map = {
    new: "NEW",
    hot: "HOT",
    admit: "ADMIT",
    scholarship: "AWARD",
  };
  return map[badge] || "NEW";
}

function getButtonText(badge) {
  const map = {
    admit: "Download Now",
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
      const btn = c.querySelector('.view-details-btn');
      if (btn) {
        btn.innerHTML = '👁️ View Details';
        btn.classList.remove('open-btn');
      }
    });

    if (!isExpanded) {
      details.classList.add('expanded');
      el.classList.add('expanded-card');
      details.style.maxHeight = details.scrollHeight + 500 + "px"; // Adding extra buffer for text wrap
      if (arrow) arrow.style.transform = 'rotate(90deg)';
      const btn = el.querySelector('.view-details-btn');
      if (btn) {
        btn.innerHTML = '❌ Close Details';
        btn.classList.add('open-btn');
      }
    }
  }
}

// ---- ACTIVE TAB SWITCHER HELPER ----
function activateTabForPostItem(postItem) {
  const tabContent = postItem.closest('.job-tab-content');
  if (!tabContent) return;
  const containerId = tabContent.id;

  if (containerId === 'expired-jobs-container') {
    const btnExpired = document.getElementById("view-expired-jobs");
    if (btnExpired) {
      btnExpired.click();
    }
  } else {
    const wrapper = tabContent.closest('.tabs-wrapper');
    if (wrapper) {
      const tabButton = wrapper.querySelector(`.job-tab[data-target="${containerId}"]`);
      if (tabButton) {
        tabButton.click();
      }
    }
  }
}

// ---- UTILS: EXPIRED CHECK ----
function isExpired(dateStr) {
  if (!dateStr) return false;
  // Try parsing the date. (e.g. '24 May 2026' or '2026-05-24')
  let d;
  if (dateStr.includes('-') && dateStr.split('-').length === 3) {
    const [y, m, day] = dateStr.split('-');
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return false;
  // Treat as expired if today is past the last date (ignoring time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return today > d;
}

function highlightExamKeywords(title) {
  const keywords = ['SSC GD', 'ASSAM POLICE', 'SSC CGL', 'SSC', 'RBI', 'INDIA POST GDS', 'BRO', 'UPSC', 'RRB', 'APSC', 'ADRE', 'Bank', 'Railway', 'SBI', 'IBPS', 'CISF', 'Indian Air Force', 'Indian Navy', 'Coal India', 'NABARD', 'Oil India'];
  let newTitle = title;
  const sortedKeywords = keywords.sort((a, b) => b.length - a.length);
  for (const kw of sortedKeywords) {
    const regex = new RegExp(`\\b(${kw})\\b`, 'i');
    if (regex.test(newTitle)) {
      newTitle = newTitle.replace(regex, `<span class="exam-highlight-badge">$1</span>`);
      break;
    }
  }
  return newTitle;
}

function wrapTablesInResponsiveDiv(html) {
  if (!html) return '';
  // Wraps tables in a responsive scrollable div if not already wrapped
  let cleanHtml = html;
  if (cleanHtml.includes('<table') && !cleanHtml.includes('table-responsive')) {
    cleanHtml = cleanHtml.replace(/<table/gi, '<div class="table-responsive"><table').replace(/<\/table>/gi, '</table></div>');
  }
  return cleanHtml;
}

// ---- SHARE ON WHATSAPP LOGIC ----
window.shareOnWhatsApp = function (uid) {
  const job = allData.find(j => j.uid === uid);
  if (!job) return;

  const title = job.title || '';
  const url = `https://newjobupdates.in/job/${uid}`;

  let text = '';
  if (job.section === "Scholarship") {
    text = `🏆 *${title}*\n\n`;
    if (job.education) text += `🎓 ${job.education}\n`;
    if (job.last_date) text += `⏰ Last Date: ${job.last_date}\n`;
    text += `\n Apply Now: ${url}\n`;
  } else {
    text = `🚨 *${title}*\n\n`;
    if (job.posts) text += `👤 ${job.posts}\n`;
    if (job.education) text += `🎓 ${job.education}\n`;
    if (job.last_date) text += `⏰ Last Date: ${job.last_date}\n`;
    text += `\n Full Details & Apply: ${url}\n`;
  }

  const encodedText = encodeURIComponent(text);
  window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
};

window.shareGeneral = function (uid) {
  const job = allData.find(j => j.uid === uid);
  if (!job) return;
  const title = job.title || 'New Job Update';
  const url = `https://newjobupdates.in/job/${uid}`;

  if (navigator.share) {
    navigator.share({
      title: title,
      url: url
    }).catch(console.error);
  } else {
    alert("Sharing is not supported on this browser.");
  }
};

window.copyJobLink = function (uid, btnElement) {
  const url = `https://newjobupdates.in/job/${uid}`;
  navigator.clipboard.writeText(url).then(() => {
    const originalHTML = btnElement.innerHTML;
    btnElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>Copied!`;
    setTimeout(() => {
      btnElement.innerHTML = originalHTML;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
};


function generatePostHTML(data) {
  return data.map(item => {
    const isPastDeadline = item.raw_last_date ? isExpired(item.raw_last_date) : false;
    const expiredClass = isPastDeadline ? "expired-card-item" : "";
    const badgeClass = isPastDeadline ? "badge-expired" : getBadgeClass(item.badge);
    const badgeText = isPastDeadline ? "CLOSED" : (item.organization || item.section || getBadgeText(item.badge));

    return `
    <div class="post-item compact-card ${expiredClass}" data-uid="${item.uid}">
      <div class="compact-card-header">
        <span class="post-badge ${badgeClass}">${badgeText}</span>
        <span class="post-meta-tag">🏷️ ${item.tag}</span>
      </div>
      
      <div class="compact-card-body">
        <h3 class="post-title">${highlightExamKeywords(item.title)}</h3>
        <div class="compact-meta">
          ${item.posts ? `<div class="meta-row"><span>👤 Vacancies:</span> <strong>${item.posts}</strong></div>` : ""}
          ${item.last_date ? `<div class="meta-row"><span>⏰ Deadline:</span> <strong style="color:var(--primary);">${item.last_date}</strong></div>` : ""}
        </div>
      </div>
      
      <div class="compact-card-footer">
        <a href="/job.html?id=${item.uid}" class="view-details-btn compact-btn">👁️ View Details</a>
        
        <div class="compact-share-actions">
          <button type="button" class="icon-btn whatsapp" onclick="event.stopPropagation(); shareOnWhatsApp('${item.uid}')" aria-label="Share on WhatsApp">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
          </button>
          <button type="button" class="icon-btn copy" onclick="event.stopPropagation(); copyJobLink('${item.uid}', this)" aria-label="Copy Link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>
      </div>
    </div>
  `}).join("");
}

function renderPosts(listId, data) {
  const container = document.getElementById(listId);
  if (!container) return;
  container.innerHTML = generatePostHTML(data);
}

function generateScholarshipHTML(data) {
  return data.map(item => {
    const isPastDeadline = item.raw_last_date ? isExpired(item.raw_last_date) : false;
    const expiredClass = isPastDeadline ? "expired-card" : "";
    const badgeText = isPastDeadline ? "CLOSED" : (item.tag || "Scholarship");
    
    return `
    <div class="scholar-card ${expiredClass}" data-uid="${item.uid}">
      <div class="scholar-card-header">
        <div class="scholar-icon-wrap">
          <span class="scholar-icon">🎓</span>
        </div>
        <span class="scholar-badge">${badgeText}</span>
      </div>
      <div class="scholar-card-body">
        <h3 class="scholar-title">${item.title}</h3>
        <div class="scholar-meta">
          ${item.education ? `<div class="s-meta-item"><span>📚</span> ${item.education}</div>` : ''}
          ${item.date ? `<div class="s-meta-item"><span>📅</span> Posted: ${item.date}</div>` : ''}
          ${item.last_date ? `<div class="s-meta-item"><span>⏰</span> Deadline: <strong style="color:var(--primary);">${item.last_date}</strong></div>` : ''}
        </div>
      </div>
      <div class="scholar-card-footer">
        <a href="${item.apply_link || '#'}" class="scholar-apply-btn" target="_blank" rel="noopener noreferrer">
          ${isPastDeadline ? "View Details" : "Apply Now"} →
        </a>
        <button type="button" class="scholar-share-btn" onclick="shareOnWhatsApp('${item.uid}')" aria-label="Share on WhatsApp">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
          </svg>
        </button>
      </div>
    </div>
  `}).join("");
}

function renderScholarships(listId, data) {
  const container = document.getElementById(listId);
  if (!container) return;
  container.innerHTML = generateScholarshipHTML(data);
}





// ---- LIVE DATE ----
function setLiveDate() {
  const el = document.getElementById("live-date");
  if (!el) return;
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
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
    resultsList.innerHTML = '<p class="no-results" id="no-results-msg">Start typing to see results...</p>';
    if (document.activeElement !== document.getElementById("overlay-search-input")) {
      overlay.classList.remove("active");
    }
    return;
  }

  const q = query.toLowerCase().trim();
  const matches = allData.filter(item =>
    item.title.toLowerCase().includes(q) ||
    (item.category && item.category.toLowerCase().includes(q)) ||
    (item.tag && item.tag.toLowerCase().includes(q))
  );

  const overlayInput = document.getElementById("overlay-search-input");
  if (overlayInput && document.activeElement !== overlayInput) {
    overlayInput.value = query;
  }

  overlay.classList.add("active");

  if (matches.length === 0) {
    resultsList.innerHTML = `<p class="no-results">No results found for "<strong>${query}</strong>"</p>`;
    return;
  }

  const highlight = (text) => {
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
    return text.replace(re, "<mark>$1</mark>");
  };

  resultsList.innerHTML = matches.map(item => {
    return `
    <div class="search-result-item" role="option" tabindex="0" onclick="handleSearchResultClick('${item.uid}')" onkeydown="if(event.key === 'Enter' || event.key === ' ') { handleSearchResultClick('${item.uid}'); event.preventDefault(); }">
      <span class="search-result-tag post-badge ${getBadgeClass(item.badge)}">${item.section}</span>
      <span class="search-result-title">${highlight(item.title)}</span>
    </div>
  `}).join("");
}

// Global handler to navigate to the clicked search result
window.handleSearchResultClick = function (uid) {
  // 1. Close overlay
  const overlay = document.getElementById("search-overlay");
  if (overlay) overlay.classList.remove("active");

  // 2. Find the card in the DOM by uid
  const post = document.querySelector(`.post-item[data-uid="${uid}"]`);
  if (post) {
    // 3. Activate tab containing the card
    activateTabForPostItem(post);

    // 4. Scroll to it
    post.scrollIntoView({ behavior: "smooth", block: "center" });

    // 5. Expand details if closed
    const details = post.querySelector('.post-details');
    if (details && !details.classList.contains('expanded')) {
      toggleJobDetails(post);
    }

    // 6. Highlight briefly to draw attention
    post.style.transition = "background-color 0.4s";
    const origBg = post.style.backgroundColor;
    post.style.backgroundColor = "#fff3e0"; // Soft orange flash
    setTimeout(() => {
      post.style.backgroundColor = origBg;
      post.style.transition = "";
    }, 1200);
  }
};

// ---- HAMBURGER MENU / TOGGLE ----
function initHamburger() {
  const hamburger = document.getElementById("hamburger-btn");
  const menu = document.getElementById("nav-menu");
  if (!hamburger || !menu) return;
  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("open");
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (menu.classList.contains("open") && !menu.contains(e.target) && e.target !== hamburger) {
      menu.classList.remove("open");
    }
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

// ---- MOBILE BOTTOM NAV ----
function initMobileNav() {
  const items = document.querySelectorAll('.mobile-nav-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
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

// ---- THEME TOGGLE ----
function initThemeToggle() {
  const toggleBtn = document.getElementById("theme-toggle");
  if (!toggleBtn) return;
  toggleBtn.addEventListener("click", () => {
    document.documentElement.classList.toggle("light-theme");
    const isLight = document.documentElement.classList.contains("light-theme");
    localStorage.setItem("theme", isLight ? "light" : "dark");
  });
}

// ---- SEARCH SETUP ----
function initSearch() {
  const input = document.getElementById("search-input");
  const btn = document.getElementById("search-btn");
  const overlay = document.getElementById("search-overlay");
  const closeBtn = document.getElementById("search-close-btn");
  const widgetInput = document.getElementById("widget-search-input");
  const widgetBtn = document.getElementById("widget-search-btn");
  const mobileToggle = document.getElementById("mobile-search-toggle");
  const overlayInput = document.getElementById("overlay-search-input");

  function clearSearchInputs() {
    if (input) input.value = "";
    if (overlayInput) overlayInput.value = "";
    if (widgetInput) widgetInput.value = "";
  }

  if (input) {
    input.addEventListener("input", (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => doSearch(e.target.value), 200);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch(input.value);
    });
  }

  if (overlayInput) {
    overlayInput.addEventListener("input", (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => doSearch(e.target.value), 200);
    });
    overlayInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch(overlayInput.value);
    });
  }

  if (btn) {
    btn.addEventListener("click", () => {
      if (input) doSearch(input.value);
    });
  }

  if (mobileToggle && overlay) {
    mobileToggle.addEventListener("click", () => {
      clearSearchInputs();
      overlay.classList.add("active");
      // Focus after CSS transitions finish
      setTimeout(() => {
        if (overlayInput) overlayInput.focus();
      }, 150);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (overlay) overlay.classList.remove("active");
      clearSearchInputs();
    });
  }

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
        clearSearchInputs();
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
      clearSearchInputs();
    }
  });
}

// ---- TAB SWITCHER LOGIC ----
function initJobTabs() {
  const wrappers = document.querySelectorAll('.tabs-wrapper');
  if (!wrappers.length) return;

  wrappers.forEach(wrapper => {
    const tabs = wrapper.querySelectorAll('.job-tab');
    const contents = wrapper.querySelectorAll('.job-tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs in this wrapper
        tabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tab.classList.add('active');

        // Hide all tab contents in this wrapper
        contents.forEach(content => {
          content.classList.remove('active');
        });

        // Show the targeted content
        const targetId = tab.getAttribute('data-target');
        const targetContent = document.getElementById(targetId);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  });
}

// ---- INTERSECTION OBSERVER (Animate cards) ----
function initAnimations() {
  if (!('IntersectionObserver' in window)) return;
  const items = document.querySelectorAll(".qnav-box, .post-item");
  const observer = new IntersectionObserver((entries) => {
    let delay = 0;
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.transitionDelay = `${delay}s, ${delay}s`;
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        observer.unobserve(entry.target);
        delay += 0.05;
      }
    });
  }, { threshold: 0.05 });
  items.forEach((item) => {
    item.style.opacity = "0";
    item.style.transform = "translateY(12px)";
    item.style.transition = `opacity 0.4s ease, transform 0.4s ease`;
    observer.observe(item);
  });
}

// ---- JOB SCHEMA GENERATION ----
function generateJobSchema(jobs) {
  if (!jobs || !jobs.length) return;
  const schema = {
    "@context": "https://schema.org",
    "@graph": jobs.filter(j => j.title).map(job => {
      const datePosted = job.raw_date ? new Date(job.raw_date) : new Date();
      let validThroughDate = job.raw_last_date && !isNaN(new Date(job.raw_last_date).getTime()) ? new Date(job.raw_last_date) :
        (job.raw_apply_date && !isNaN(new Date(job.raw_apply_date).getTime()) ? new Date(job.raw_apply_date) : null);

      // Provide a 30-day dummy fallback for "TBA" or missing dates to fix the 6th warning
      if (!validThroughDate) {
        validThroughDate = new Date(datePosted.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      return {
        "@type": "JobPosting",
        "title": job.title,
        "description": job.other_details || job.title,
        "datePosted": datePosted.toISOString(),
        "validThrough": validThroughDate.toISOString(),
        "employmentType": job.employmentType || "FULL_TIME",
        "hiringOrganization": {
          "@type": "Organization",
          "name": job.tag || "Government of India",
          "sameAs": "https://newjobupdates.in"
        },
        "jobLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": job.streetAddress || "Not specified",
            "addressLocality": job.addressLocality || "Guwahati",
            "addressRegion": job.location || "Assam",
            "postalCode": job.postalCode || "781001",
            "addressCountry": "IN"
          }
        },
        "baseSalary": {
          "@type": "MonetaryAmount",
          "currency": "INR",
          "value": {
            "@type": "QuantitativeValue",
            "value": job.baseSalary || 25000,
            "unitText": "MONTH"
          }
        }
      };
    })
  };

  const oldScript = document.getElementById('job-schema-script');
  if (oldScript) oldScript.remove();

  const script = document.createElement('script');
  script.id = 'job-schema-script';
  script.type = 'application/ld+json';
  script.text = JSON.stringify(schema);
  document.head.appendChild(script);
}

// ---- INIT ----
document.addEventListener("DOMContentLoaded", async () => {
  setLiveDate();

  // Set copyright year dynamically
  const yearSpan = document.getElementById("copyright-year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // Fetch JSON data dynamically
  const [rawJobs, rawScholarship] = await Promise.all([
    fetchSectionData('/data/jobs.json'),
    fetchSectionData('/data/scholarship.json')
  ]);

  const jobsData = normaliseDate(rawJobs).map(j => ({ ...j, section: "Govt Job", uid: `job-${j.id}` })).sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;

    const getTime = (dateStr) => {
      if (!dateStr || dateStr === 'TBA') return 0;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    const dateA = getTime(a.raw_apply_date);
    const dateB = getTime(b.raw_apply_date);
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    const postA = getTime(a.raw_date);
    const postB = getTime(b.raw_date);
    if (postA !== postB) {
      return postB - postA;
    }
    return b.id - a.id;
  });
  const scholarshipData = normaliseDate(rawScholarship).map(s => ({ ...s, section: "Scholarship", uid: `scholar-${s.id}` }));

  allData = [
    ...jobsData,
    ...scholarshipData
  ];

  const assamJobs = jobsData.filter(j => j.status !== 'upcoming' && (!j.raw_last_date || !isExpired(j.raw_last_date)) && (j.group === 'Assam' || j.tag === 'Assam' || j.tag === 'APSC'));
  const centralJobs = jobsData.filter(j => j.status !== 'upcoming' && (!j.raw_last_date || !isExpired(j.raw_last_date)) && (j.group === 'Central' || (j.tag !== 'Assam' && j.tag !== 'APSC' && j.group !== 'Assam')));
  const expiredJobs = jobsData.filter(j => j.status !== 'upcoming' && j.raw_last_date && isExpired(j.raw_last_date)).slice(0, 5);
  const upcomingJobs = jobsData.filter(j => j.status === 'upcoming');

  const activeScholarship = scholarshipData.filter(s => s.status !== 'upcoming');

  renderPosts("assam-posts-list", assamJobs);
  renderPosts("central-posts-list", centralJobs);

  if (upcomingJobs.length > 0) {
    renderPosts("upcoming-posts-list", upcomingJobs);
  }

  // We are completely removing expired jobs from the homepage logic.
  // Expired jobs will ONLY be fetched on archived-jobs.html.
  const expiredList = document.getElementById("expired-posts-list");
  if (expiredList) {
    expiredList.innerHTML = '';
  }

  renderScholarships("scholarship-list", activeScholarship);


  initTicker();
  initHamburger();
  initNewsletter();
  initNavLinks();
  initMobileNav();
  initBackToTop();
  initScrollHeader();
  initThemeToggle();
  initSearch();
  initJobTabs();

  // Delay animations slightly
  setTimeout(initAnimations, 100);

  // Generate SEO schema for loaded jobs
  generateJobSchema(jobsData);

  // SPA Routing: auto-open job from URL
  const pathParts = window.location.pathname.split('/');
  if (pathParts.length >= 3 && pathParts[1] === 'job') {
    const uid = decodeURIComponent(pathParts[2]);
    setTimeout(() => {
      const shareBtn = document.querySelector(`button[onclick="event.stopPropagation(); shareGeneral('${uid}')"]`);
      if (shareBtn) {
        const postItem = shareBtn.closest('.post-item');
        if (postItem) {
          activateTabForPostItem(postItem); // Activate containing tab first
          postItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          toggleJobDetails(postItem);
          const origBg = postItem.style.backgroundColor;
          postItem.style.transition = 'background-color 0.4s';
          postItem.style.backgroundColor = '#fff3e0';
          setTimeout(() => {
            postItem.style.backgroundColor = origBg;
            postItem.style.transition = '';
          }, 1500);
        }
      }
    }, 300);
  }

  // Header scroll style
  const style = document.createElement("style");
  style.textContent = `.header.scrolled { box-shadow: 0 4px 20px rgba(0,53,128,0.14); }`;
  document.head.appendChild(style);

  console.log("✅ New Job Portal Loaded Successfully");
});

// --- CONTACT MODAL LOGIC ---
window.openContactModal = function(e) {
  if (e) e.preventDefault();
  const modal = document.getElementById('contact-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // prevent scrolling
  }
};

window.closeContactModal = function() {
  const modal = document.getElementById('contact-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
};

window.submitContactForm = async function(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('contact-submit-btn');
  const status = document.getElementById('contact-status');
  
  btn.disabled = true;
  btn.textContent = 'Sending...';
  status.textContent = '';
  status.className = 'contact-status';
  
  const formData = new FormData(form);
  
  try {
    // Dynamically import Firebase
    const { initializeApp, getApp } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js");
    const { getFirestore, collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
    
    const firebaseConfig = {
      apiKey: "AIzaSyAh1dbSY0lLbYAZSzfPPpTlru3OmeZ3p_E",
      authDomain: "newjobupdates-c234a.firebaseapp.com",
      projectId: "newjobupdates-c234a",
      storageBucket: "newjobupdates-c234a.firebasestorage.app",
      messagingSenderId: "275056131922",
      appId: "1:275056131922:web:2b44bb31cf42e3897c448b"
    };

    let app;
    try {
      app = getApp();
    } catch (err) {
      app = initializeApp(firebaseConfig);
    }
    const db = getFirestore(app);
    
    await addDoc(collection(db, 'contact_messages'), {
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message'),
      createdAt: serverTimestamp()
    });
    
    status.textContent = 'Message sent successfully! We will get back to you soon.';
    status.className = 'contact-status success';
    form.reset();
    btn.textContent = 'Sent!';
    setTimeout(() => {
      closeContactModal();
      btn.disabled = false;
      btn.textContent = 'Send Message';
      status.textContent = '';
    }, 2000);
  } catch (error) {
    console.error("Error submitting contact form:", error);
    status.textContent = 'Oops! There was a problem saving your message.';
    status.className = 'contact-status error';
    btn.disabled = false;
    btn.textContent = 'Send Message';
  }
};

// Close modal when clicking outside of it
document.addEventListener('click', function(e) {
  const contactModal = document.getElementById('contact-modal');
  if (contactModal && !contactModal.classList.contains('hidden') && e.target === contactModal) {
    closeContactModal();
  }
  const infoModal = document.getElementById('info-modal');
  if (infoModal && !infoModal.classList.contains('hidden') && e.target === infoModal) {
    closeInfoModal();
  }
});

// --- INFO MODAL LOGIC (About, Disclaimer, Privacy, Terms, Advertise) ---
const infoPages = {
  about: {
    title: 'About Us',
    body: `
      <p><strong>NewJobUpdates.in</strong> is a dedicated career portal designed to help job seekers across India — especially from Assam and the Northeast — stay updated with the latest government job notifications, admit cards, results, and exam schedules.</p>
      <h3>Our Mission</h3>
      <p>We aim to bridge the information gap by providing timely, accurate, and well-organized job updates so that every aspirant has an equal opportunity to prepare and apply for competitive exams.</p>
      <h3>What We Offer</h3>
      <ul>
        <li>📋 Latest Govt Job Notifications (SSC, UPSC, State-level exams)</li>
        <li>📝 Free Mock Tests with instant scoring and detailed solutions</li>
        <li>🎓 Scholarship alerts for students</li>
        <li>📬 Email alerts so you never miss a deadline</li>
      </ul>
      <h3>Our Team</h3>
      <p>NewJobUpdates.in is maintained by a small, passionate team of developers and educators who believe that access to information should be free and timely. We continuously improve the platform based on user feedback.</p>
      <p>Have questions or suggestions? Feel free to reach out via the <a href="#" onclick="closeInfoModal(); setTimeout(()=>openContactModal(), 300); return false;">Contact Us</a> page.</p>
    `
  },
  disclaimer: {
    title: 'Disclaimer',
    body: `
      <p>The information provided on <strong>NewJobUpdates.in</strong> is for general informational purposes only. While we strive to keep the information up-to-date and accurate, we make no representations or warranties of any kind — express or implied — about the completeness, accuracy, reliability, or availability of the information, products, services, or related graphics contained on the website.</p>
      <h3>External Links</h3>
      <p>This website may contain links to external websites that are not operated by us. We have no control over the content, privacy policies, or practices of any third-party sites and assume no responsibility for them.</p>
      <h3>Job Notification Accuracy</h3>
      <p>All job notifications, exam dates, eligibility criteria, and other details published on this site are sourced from official government websites and public notices. However, we strongly recommend that users verify all information from the official source before taking any action (e.g., applying for a job or paying a fee).</p>
      <h3>No Professional Advice</h3>
      <p>The content on this site does not constitute professional career advice. Users should consult with appropriate professionals or official bodies for specific career-related decisions.</p>
      <p>By using this website, you acknowledge and agree that you do so at your own risk.</p>
    `
  },
  privacy: {
    title: 'Privacy Policy',
    body: `
      <p><strong>Effective Date:</strong> January 1, 2025</p>
      <p>At <strong>NewJobUpdates.in</strong>, we respect your privacy and are committed to protecting any personal information you share with us.</p>
      <h3>Information We Collect</h3>
      <ul>
        <li><strong>Contact Form:</strong> When you submit the contact form, we collect your name, email address, and message. This data is stored securely in our database and used only to respond to your inquiry.</li>
        <li><strong>Mock Test Scores:</strong> If you sign in via Google, we store your test scores linked to your account for tracking your progress.</li>
        <li><strong>Newsletter:</strong> If you subscribe to our email alerts, we store your email address to send job notifications.</li>
        <li><strong>Analytics:</strong> We use Google Analytics to understand site traffic and improve user experience. This may collect anonymized data such as browser type, device, and pages visited.</li>
      </ul>
      <h3>How We Use Your Information</h3>
      <ul>
        <li>To respond to your messages and inquiries</li>
        <li>To save and display your mock test progress</li>
        <li>To send job update emails (only if you subscribed)</li>
        <li>To improve website performance and content</li>
      </ul>
      <h3>Data Security</h3>
      <p>We use Firebase (by Google) for authentication and data storage, which provides industry-standard security measures. We do not sell, trade, or share your personal information with third parties.</p>
      <h3>Your Rights</h3>
      <p>You can request deletion of your data at any time by contacting us through the Contact form. You may also unsubscribe from our email alerts at any time.</p>
      <h3>Cookies</h3>
      <p>This website may use cookies for analytics and authentication purposes. By continuing to use the site, you consent to our use of cookies.</p>
    `
  },
  terms: {
    title: 'Terms & Conditions',
    body: `
      <p><strong>Last updated:</strong> January 1, 2025</p>
      <p>By accessing and using <strong>NewJobUpdates.in</strong>, you agree to be bound by the following terms and conditions.</p>
      <h3>Use of Content</h3>
      <p>All content on this website — including text, graphics, and data — is provided for informational purposes only. You may not reproduce, distribute, or republish any content from this site without prior written permission.</p>
      <h3>User Accounts</h3>
      <p>When you sign in using Google, you agree to provide accurate information. You are responsible for maintaining the confidentiality of your account and for all activities that occur under it.</p>
      <h3>Mock Tests</h3>
      <p>Mock tests are provided free of charge for educational purposes. We do not guarantee that these tests reflect actual exam patterns, and scores are not official. Use them as a study aid only.</p>
      <h3>Prohibited Conduct</h3>
      <ul>
        <li>Using the site for any unlawful purpose</li>
        <li>Attempting to gain unauthorized access to our systems</li>
        <li>Posting spam, offensive, or misleading content</li>
        <li>Scraping or automated data collection from the site</li>
      </ul>
      <h3>Limitation of Liability</h3>
      <p>NewJobUpdates.in shall not be liable for any direct, indirect, or consequential damages arising from the use of this website. We are not responsible for any missed deadlines or incorrect information — always verify from official sources.</p>
      <h3>Changes to Terms</h3>
      <p>We reserve the right to update these terms at any time. Continued use of the website after changes constitutes acceptance of the new terms.</p>
    `
  },
  advertise: {
    title: 'Advertise With Us',
    body: `
      <p>Looking to reach thousands of active job seekers and competitive exam aspirants? <strong>NewJobUpdates.in</strong> offers affordable advertising opportunities to help your brand connect with a highly engaged audience.</p>
      <h3>Why Advertise With Us?</h3>
      <ul>
        <li>🎯 <strong>Targeted Audience:</strong> Our visitors are students, graduates, and professionals actively seeking government jobs and career opportunities.</li>
        <li>📈 <strong>Growing Traffic:</strong> We have a steadily growing user base from Assam and across India.</li>
        <li>💰 <strong>Affordable Rates:</strong> We offer competitive pricing for banner ads, sponsored posts, and email promotions.</li>
        <li>🤝 <strong>Flexible Formats:</strong> Choose from banner placements, sponsored job listings, newsletter sponsorships, and more.</li>
      </ul>
      <h3>Ad Formats Available</h3>
      <ul>
        <li><strong>Banner Ads</strong> — Displayed across the site (header, sidebar, or footer positions)</li>
        <li><strong>Sponsored Posts</strong> — Featured job listings or educational content</li>
        <li><strong>Newsletter Ads</strong> — Reach subscribers directly in their inbox</li>
        <li><strong>Custom Campaigns</strong> — Tailored advertising solutions for your needs</li>
      </ul>
      <h3>Get in Touch</h3>
      <p>Interested? Reach out to us through the <a href="#" onclick="closeInfoModal(); setTimeout(()=>openContactModal(), 300); return false;">Contact Us</a> page with the subject "Advertising Inquiry" and we'll get back to you with pricing and placement options.</p>
    `
  }
};

window.openInfoModal = function(e, page) {
  if (e) e.preventDefault();
  const modal = document.getElementById('info-modal');
  const title = document.getElementById('info-modal-title');
  const body = document.getElementById('info-modal-body');
  const data = infoPages[page];
  if (!modal || !data) return;
  title.textContent = data.title;
  body.innerHTML = data.body;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};

window.closeInfoModal = function() {
  const modal = document.getElementById('info-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
};
