// MIB OSINT Storefront Application Logic

// Read environment variables
const SUPABASE_URL = window.__env?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.__env?.SUPABASE_ANON_KEY || '';

// Fallback for local testing (allows passing via query params)
const urlParams = new URLSearchParams(window.location.search);
const activeUrl = SUPABASE_URL || urlParams.get('supabase_url') || '';
const activeKey = SUPABASE_ANON_KEY || urlParams.get('supabase_anon_key') || '';

let supabaseClient = null;

// HTML escaping helper to prevent Stored XSS
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// URL protocol validator
function sanitizeURL(url) {
  if (!url) return '#';
  const trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith('http://') || trimmed.toLowerCase().startsWith('https://')) {
    return trimmed;
  }
  return '#';
}

// Date formatter helper (DD.MM.YYYY)
function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

// Full time formatter (DD.MM.YYYY HH:MM МСК)
function formatFullTimeMSK(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  // Moscow is UTC+3
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const mskTime = new Date(utc + (3600000 * 3));
  
  const dd = String(mskTime.getDate()).padStart(2, '0');
  const mm = String(mskTime.getMonth() + 1).padStart(2, '0');
  const yyyy = mskTime.getFullYear();
  const hh = String(mskTime.getHours()).padStart(2, '0');
  const min = String(mskTime.getMinutes()).padStart(2, '0');
  
  return `${dd}.${mm}.${yyyy} ${hh}:${min} МСК`;
}

// Get badge color and emoji for composite score
function getScoreBadge(score) {
  const numScore = parseFloat(score || 0);
  if (numScore >= 0.70) return { emoji: '🔴', label: 'Критическая', class: 'badge-critical' };
  if (numScore >= 0.50) return { emoji: '🧡', label: 'Высокая', class: 'badge-high' };
  if (numScore >= 0.30) return { emoji: '💛', label: 'Средняя', class: 'badge-medium' };
  if (numScore >= 0.15) return { emoji: '⚫', label: 'Низкая', class: 'badge-low' };
  return { emoji: '⚪', label: 'Минимальная', class: 'badge-minimal' };
}

// Get category display name and emoji
function getCategoryInfo(category) {
  const cat = String(category || '').trim();
  if (cat.includes('ИИ') || cat.includes('технологии') || cat === 'analytics') {
    return { name: 'ИИ и технологии', emoji: '🤖', class: 'cat-tech' };
  }
  if (cat.includes('Кибербезопасность') || cat === 'news') {
    return { name: 'Кибербезопасность', emoji: '🔐', class: 'cat-cyber' };
  }
  if (cat.includes('Геополитика') || cat === 'gov') {
    return { name: 'Геополитика и МИБ', emoji: '🌍', class: 'cat-geo' };
  }
  return { name: category || 'Прочее', emoji: '🔍', class: 'cat-other' };
}

// Extract first sentence of summary
function getFirstSentence(text) {
  if (!text) return '';
  // Split by sentence terminators followed by spaces
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences[0] ? sentences[0].trim() : text.trim();
}

// Count-up animation helper
function animateValue(obj, start, end, duration, isDate = false, suffix = '', decimals = 0) {
  if (isDate) {
    obj.innerHTML = end + suffix;
    return;
  }
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const val = progress * (end - start) + start;
    obj.innerHTML = val.toFixed(decimals) + suffix;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.innerHTML = end.toFixed(decimals) + suffix;
    }
  };
  window.requestAnimationFrame(step);
}

// Initialize Supabase Client
function initSupabase() {
  if (!activeUrl || !activeKey) {
    console.warn('Supabase credentials missing. Showing configuration instructions.');
    showErrorState('Параметры Supabase не настроены. Пожалуйста, добавьте SUPABASE_URL и SUPABASE_ANON_KEY в window.__env или передайте их как query-параметры (?supabase_url=...&supabase_anon_key=...)');
    return false;
  }
  try {
    supabaseClient = supabase.createClient(activeUrl, activeKey);
    return true;
  } catch (err) {
    console.error('Supabase initialization failed:', err);
    showErrorState('Не удалось инициализировать клиент Supabase. Проверьте правильность URL и Anon Key.');
    return false;
  }
}

// Show error state on page
function showErrorState(message) {
  document.querySelectorAll('.loading-skeleton').forEach(el => el.style.display = 'none');
  const errorElements = document.querySelectorAll('.error-placeholder');
  errorElements.forEach(el => {
    el.innerHTML = `
      <div class="error-banner">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="error-icon"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <div class="error-text">
          <strong>Данные временно недоступны</strong>
          <p>${message}</p>
        </div>
      </div>
    `;
    el.style.display = 'block';
  });
}

// Load Hero stats and Statistics cards
async function loadStats() {
  try {
    const { data, error } = await supabaseClient
      .from('public_digest_stats')
      .select('*')
      .single();

    if (error) throw error;

    // 1. Hero stats
    const totalArticlesEl = document.getElementById('hero-stat-articles');
    const totalDigestsEl = document.getElementById('hero-stat-digests');
    const lastUpdateEl = document.getElementById('hero-stat-updated');

    if (totalArticlesEl) animateValue(totalArticlesEl, 0, data.total_articles, 1200);
    if (totalDigestsEl) animateValue(totalDigestsEl, 0, data.total_digests, 1200);
    if (lastUpdateEl) lastUpdateEl.innerText = formatFullTimeMSK(data.last_updated);

    // 2. Statistics cards
    const statSourcesEl = document.getElementById('card-stat-sources');
    const statWeekEl = document.getElementById('card-stat-week');
    const statRelEl = document.getElementById('card-stat-relevance');
    const statImportanceEl = document.getElementById('card-stat-importance');

    if (statSourcesEl) animateValue(statSourcesEl, 0, data.total_sources, 1000);
    if (statWeekEl) animateValue(statWeekEl, 0, data.articles_last_7_days, 1000);
    if (statRelEl) animateValue(statRelEl, 0, parseFloat(data.relevance_rate || 0), 1000, false, '%', 1);
    if (statImportanceEl) {
      const avgImp = parseFloat(data.avg_importance || 0).toFixed(2);
      statImportanceEl.innerText = `${avgImp} / 5.0`;
    }

    // Hide skeleton of stats
    document.getElementById('hero-stats-skeleton')?.remove();
    document.getElementById('stats-grid-skeleton')?.remove();
    document.getElementById('hero-stats-row')?.classList.remove('hidden');
    document.getElementById('stats-grid-row')?.classList.remove('hidden');
  } catch (err) {
    console.error('Failed to load stats:', err);
    showErrorState('Ошибка при получении системной статистики из базы данных.');
  }
}

// Render article card markup
function renderArticleCard(article) {
  const badgeInfo = getScoreBadge(article.composite_score);
  const catInfo = getCategoryInfo(article.category);
  
  // Handle summary rendering rules based on importance:
  // importance >= 3: show fully
  // importance == 2: show first sentence only
  // importance == 1: hide summary
  let summaryHTML = '';
  const importance = parseInt(article.importance || 1);
  
  if (importance >= 3 && article.summary_ru) {
    summaryHTML = `<p class="article-summary">${escapeHTML(article.summary_ru)}</p>`;
  } else if (importance === 2 && article.summary_ru) {
    const firstSentence = getFirstSentence(article.summary_ru);
    if (firstSentence) {
      summaryHTML = `<p class="article-summary">${escapeHTML(firstSentence)}</p>`;
    }
  }

  // Handle source domain extract if source_url is available
  let domainLabel = escapeHTML(article.source_name || 'Источник');
  const safeURL = sanitizeURL(article.url);
  const titleText = escapeHTML(article.title_ru || article.title_original || 'Без названия');
  const importanceReasonText = escapeHTML(article.importance_reason);
  
  return `
    <article class="article-card">
      <div class="article-card-header">
        <div class="article-badges">
          <span class="score-badge ${badgeInfo.class}" title="Composite Score: ${(parseFloat(article.composite_score || 0)).toFixed(3)}">
            <span class="badge-dot">${badgeInfo.emoji}</span> ${badgeInfo.label}
          </span>
          <span class="category-badge ${catInfo.class}">
            ${catInfo.emoji} ${catInfo.name}
          </span>
        </div>
        <span class="article-date">${formatDate(article.sent_at)}</span>
      </div>
      <h3 class="article-title">
        <a href="${safeURL}" target="_blank" rel="noopener noreferrer">
          ${titleText}
        </a>
      </h3>
      ${summaryHTML}
      <div class="article-footer">
        <span class="article-source-link">
          Источник: <a href="${safeURL}" target="_blank" rel="noopener noreferrer">${domainLabel}</a>
        </span>
        ${importanceReasonText ? `<span class="importance-reason-tip" title="${importanceReasonText}">👁️ Причина отбора</span>` : ''}
      </div>
    </article>
  `;
}

// Load Latest Digest (Top 10 articles)
async function loadLatestDigest() {
  const container = document.getElementById('latest-digest-container');
  try {
    const { data, error } = await supabaseClient
      .from('public_digest')
      .select('*')
      .order('sent_at', { ascending: false })
      .order('composite_score', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="no-data">На данный момент опубликованных материалов нет.</div>';
      return;
    }

    container.innerHTML = data.map(article => renderArticleCard(article)).join('');
  } catch (err) {
    console.error('Failed to load latest digest:', err);
    container.innerHTML = `
      <div class="error-banner">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="error-icon"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <div class="error-text">
          <strong>Не удалось загрузить последний дайджест</strong>
          <p>Пожалуйста, обновите страницу позже.</p>
        </div>
      </div>
    `;
  }
}

// Cache for loaded archive days to avoid repeating requests
const archiveCache = {};

// Load Archive Accordion List
async function loadArchive() {
  const accordionContainer = document.getElementById('archive-accordion');
  try {
    const { data, error } = await supabaseClient
      .from('public_digest_archive')
      .select('*')
      .limit(30); // Show last 30 days of digests

    if (error) throw error;

    if (!data || data.length === 0) {
      accordionContainer.innerHTML = '<div class="no-data">Архив дайджестов пуст.</div>';
      return;
    }

    accordionContainer.innerHTML = data.map(item => {
      const dateVal = item.digest_date; // YYYY-MM-DD format
      const formatted = formatDate(dateVal);
      return `
        <div class="accordion-item" data-date="${dateVal}">
          <button class="accordion-trigger" aria-expanded="false" onclick="toggleAccordion('${dateVal}')">
            <span class="accordion-date">📅 Дайджест от ${formatted}</span>
            <span class="accordion-count-badge">${item.articles_count} мат. <span class="arrow-icon">▼</span></span>
          </button>
          <div class="accordion-panel" style="max-height: 0px;">
            <div class="accordion-content">
              <div class="panel-loading-skeleton">
                <div class="shimmer-line"></div>
                <div class="shimmer-line"></div>
                <div class="shimmer-line"></div>
              </div>
              <div class="archive-articles-list" id="archive-list-${dateVal}"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load archive:', err);
    accordionContainer.innerHTML = `
      <div class="error-banner">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="error-icon"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <div class="error-text">
          <strong>Не удалось загрузить архив дат</strong>
          <p>Не удалось подключиться к архиву публикаций.</p>
        </div>
      </div>
    `;
  }
}

// Toggle Accordion Panel open/close and load content
async function toggleAccordion(dateVal) {
  const item = document.querySelector(`.accordion-item[data-date="${dateVal}"]`);
  if (!item) return;

  const trigger = item.querySelector('.accordion-trigger');
  const panel = item.querySelector('.accordion-panel');
  const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

  // Close all other accordions for clean UX
  document.querySelectorAll('.accordion-item').forEach(otherItem => {
    if (otherItem !== item) {
      otherItem.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
      otherItem.querySelector('.accordion-panel').style.maxHeight = '0px';
    }
  });

  if (isExpanded) {
    trigger.setAttribute('aria-expanded', 'false');
    panel.style.maxHeight = '0px';
  } else {
    trigger.setAttribute('aria-expanded', 'true');
    panel.style.maxHeight = panel.scrollHeight + 500 + 'px'; // Allow expansion space for dynamic content
    
    // Load articles if not already cached
    await loadArchiveArticles(dateVal);
    // Re-adjust max-height to exact scroll height now that content is loaded
    panel.style.maxHeight = panel.scrollHeight + 'px';
  }
}

// Load articles of specific date
async function loadArchiveArticles(dateVal) {
  const listContainer = document.getElementById(`archive-list-${dateVal}`);
  const item = document.querySelector(`.accordion-item[data-date="${dateVal}"]`);
  const skeleton = item.querySelector('.panel-loading-skeleton');
  const panel = item.querySelector('.accordion-panel');

  if (archiveCache[dateVal]) {
    // Already loaded, just display
    if (skeleton) skeleton.style.display = 'none';
    listContainer.innerHTML = archiveCache[dateVal].map(art => renderArticleCard(art)).join('');
    return;
  }

  try {
    // Query public_digest for articles sent on this day
    const startOfDay = `${dateVal}T00:00:00.000Z`;
    const endOfDay = `${dateVal}T23:59:59.999Z`;

    const { data, error } = await supabaseClient
      .from('public_digest')
      .select('*')
      .gte('sent_at', startOfDay)
      .lte('sent_at', endOfDay)
      .order('composite_score', { ascending: false });

    if (error) throw error;

    // Cache the retrieved data
    archiveCache[dateVal] = data || [];
    
    if (skeleton) skeleton.style.display = 'none';

    if (!data || data.length === 0) {
      listContainer.innerHTML = '<div class="no-data">Нет статей в дайджесте за этот день.</div>';
    } else {
      listContainer.innerHTML = data.map(art => renderArticleCard(art)).join('');
    }
  } catch (err) {
    console.error(`Failed to load articles for ${dateVal}:`, err);
    if (skeleton) skeleton.style.display = 'none';
    listContainer.innerHTML = `
      <div class="error-banner">
        <p>Не удалось загрузить статьи за этот день. Попробуйте еще раз.</p>
      </div>
    `;
  }
}

// Start app once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  if (initSupabase()) {
    loadStats();
    loadLatestDigest();
    loadArchive();
  }
});
