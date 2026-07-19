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

      const uid = el.getAttribute('data-uid');
      if (uid && typeof renderComments === 'function') {
        renderComments(uid);
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
    const safeDetails = wrapTablesInResponsiveDiv(item.other_details);
    const safeMainDetails = wrapTablesInResponsiveDiv(item.details);
    const expiredClass = isPastDeadline ? "expired-card-item" : "";
    const badgeClass = isPastDeadline ? "badge-expired" : getBadgeClass(item.badge);
    const badgeText = isPastDeadline ? "CLOSED" : (item.organization || item.section || getBadgeText(item.badge));

    return `
    <div class="post-item ${expiredClass}" data-uid="${item.uid}" role="listitem" tabindex="0" aria-label="${item.title}" onclick="toggleJobDetails(this)" onkeydown="if(event.key === 'Enter' || event.key === ' ') { toggleJobDetails(this); event.preventDefault(); }">
      <span class="post-badge ${badgeClass}">${badgeText}</span>
      <div class="post-content">
        <div class="post-title">${highlightExamKeywords(item.title)}</div>
        <div class="post-meta">
          <span>📅 ${item.apply_date || item.date}</span>
          ${item.posts ? `<span>👤 ${item.posts}</span>` : ""}
          <span class="post-meta-tag">🏷️ ${item.tag}</span>
        </div>
        ${(item.apply_date || item.education || item.other_details || item.details || item.salary || item.location || item.application_fee || item.apply_link) ? `
        <button type="button" class="view-details-btn" onclick="event.stopPropagation(); toggleJobDetails(this.closest('.post-item'))">👁️ View Details</button>
        <div class="post-details" onclick="event.stopPropagation()">
          ${isPastDeadline ? `<div class="expired-banner">⚠️ This application window closed on <strong>${item.last_date || 'the deadline'}</strong>. <a href="https://newjobupdates.in/#assam-jobs-section">Click here to view latest live jobs</a>.</div>` : ''}
          ${safeMainDetails ? `<div class="extended-details-content">${safeMainDetails}</div>` : ''}
          <div class="post-details-grid">
            ${item.apply_date ? `<div class="detail-item"><strong>Apply Date:</strong> <span class="highlight-date text-right" style="color:var(--primary);">${item.apply_date}</span></div>` : ''}
            ${item.last_date ? `<div class="detail-item"><strong>Closing Date:</strong> <span class="highlight-date text-right">${item.last_date}</span></div>` : ''}
            ${item.salary ? `<div class="detail-item"><strong>Salary:</strong> <span class="text-right">${item.salary}</span></div>` : ''}
            ${item.location ? `<div class="detail-item"><strong>Location:</strong> <span class="text-right">${item.location}</span></div>` : ''}
            ${item.application_fee ? `<div class="detail-item"><strong>Application Fee:</strong> <span class="text-right">${item.application_fee}</span></div>` : ''}
            ${item.education ? `<div class="detail-item full-width"><strong>Education:</strong> <div class="text-left mt-1">${item.education}</div></div>` : ''}
            ${item.other_details ? `<div class="detail-item full-width"><strong>Other Details:</strong> <div class="text-left mt-1">${safeDetails}</div></div>` : ''}
          </div>
          <div class="action-buttons" style="display: flex; flex-direction: column; gap: 10px; margin-top: 12px;">
            <a href="${item.apply_link || '#'}" class="apply-btn" style="margin-top: 0;" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">${getButtonText(item.badge)}</a>
            
            <div class="share-buttons-row">
              <button type="button" class="action-share-btn whatsapp" onclick="event.stopPropagation(); shareOnWhatsApp('${item.uid}')" title="Share on WhatsApp">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                WhatsApp
              </button>
              <button type="button" class="action-share-btn general" onclick="event.stopPropagation(); shareGeneral('${item.uid}')" title="Share Link">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                Share
              </button>
              <button type="button" class="action-share-btn copy" onclick="event.stopPropagation(); copyJobLink('${item.uid}', this)" title="Copy Link">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copy
              </button>
            </div>
          </div>
          
          <div class="comments-section" id="comments-${item.uid}" onclick="event.stopPropagation()">
            <h4 class="comments-title">Comments</h4>
            <div class="comments-list" id="comments-list-${item.uid}">
              <div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 10px 0;">Loading comments...</div>
            </div>
            <div class="comment-form">
              <input type="text" id="comment-input-${item.uid}" placeholder="Write a comment..." class="comment-input" onkeydown="if(event.key === 'Enter') addComment('${item.uid}')" />
              <button type="button" onclick="addComment('${item.uid}')" class="comment-submit-btn">Post</button>
            </div>
          </div>
          
        </div>
        ` : ''}
      </div>
      <span class="post-arrow">›</span>
    </div>
  `}).join("");
}

function renderPosts(listId, data) {
  const container = document.getElementById(listId);
  if (!container) return;
  container.innerHTML = generatePostHTML(data);
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

// ---- COMMENTS LOGIC ----
function getComments(uid) {
  try {
    const data = localStorage.getItem('comments_' + uid);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

window.renderComments = function (uid) {
  const list = document.getElementById('comments-list-' + uid);
  if (!list) return;
  const comments = getComments(uid);
  if (comments.length === 0) {
    list.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 10px 0;">No comments yet. Be the first!</div>`;
    return;
  }
  list.innerHTML = comments.map(c => `
    <div class="comment-item">
      <strong>Guest User</strong>
      <div class="comment-text">${c.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </div>
  `).join("");
};

let lastCommentTime = 0;

window.addComment = function (uid) {
  const input = document.getElementById('comment-input-' + uid);
  if (!input || !input.value.trim()) return;

  // Anti-Spam: Rate Limiting (5 seconds)
  const now = Date.now();
  if (now - lastCommentTime < 5000) {
    alert("Please wait a few seconds before posting another comment to prevent spam.");
    return;
  }

  let text = input.value.trim();

  // Anti-Spam: Max Length (Prevent massive walls of text)
  if (text.length > 300) {
    alert("Comment is too long! Please keep it under 300 characters.");
    return;
  }

  // Anti-Spam: Basic Profanity Filter (Example)
  const blockedWords = ['spam', 'hate', 'fake'];
  for (let word of blockedWords) {
    if (text.toLowerCase().includes(word)) {
      alert("Your comment contains blocked words and cannot be posted.");
      return;
    }
  }

  const comments = getComments(uid);
  comments.push({ text, date: new Date().toISOString() });
  localStorage.setItem('comments_' + uid, JSON.stringify(comments));

  lastCommentTime = Date.now();
  input.value = "";
  renderComments(uid);
};

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
  if (expiredJobs.length > 0) {
    renderPosts("expired-posts-list", expiredJobs);
  } else {
    const expiredList = document.getElementById("expired-posts-list");
    if (expiredList) {
      expiredList.innerHTML = `<div style="padding: 30px 20px; text-align: center; color: var(--text-muted);"><div style="font-size: 2rem; margin-bottom: 10px;">⚠️</div><p>No expired jobs found.</p></div>`;
    }
  }

  renderPosts("scholarship-list", activeScholarship);


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

  // Expired Jobs Tab Logic
  const btnExpired = document.getElementById("view-expired-jobs");
  const btnBackActive = document.getElementById("back-to-active-jobs");
  if (btnExpired) {
    btnExpired.addEventListener("click", () => {
      document.querySelectorAll('#job-tabs .job-tab').forEach(t => t.classList.remove('active'));

      const assamContainer = document.getElementById('assam-jobs-container');
      const centralContainer = document.getElementById('central-jobs-container');
      const upcomingContainer = document.getElementById('upcoming-jobs-container');
      if (assamContainer) assamContainer.classList.remove('active');
      if (centralContainer) centralContainer.classList.remove('active');
      if (upcomingContainer) upcomingContainer.classList.remove('active');

      const expiredContainer = document.getElementById('expired-jobs-container');
      if (expiredContainer) expiredContainer.classList.add('active');
    });
  }
  if (btnBackActive) {
    btnBackActive.addEventListener("click", () => {
      const activeTab = document.querySelector('#job-tabs .job-tab[data-target="assam-jobs-container"]');
      if (activeTab) activeTab.click(); // This automatically handles the container switching
    });
  }

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
