// ===== SUPABASE CONFIG =====
const SUPABASE_URL = 'https://rmbrqlsbbsyxpwesjdbf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtYnJxbHNiYnN5eHB3ZXNqZGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTUxNTgsImV4cCI6MjA5NzA5MTE1OH0.1OaOUr_mZ29mxqesF0MzhYb0f7qyZTNev4phOwWXXxU';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== DOM ELEMENTS =====
const grid              = document.getElementById('opportunities-grid');
const emptyState        = document.getElementById('empty-state');
const loading           = document.getElementById('loading');
const modalOverlay      = document.getElementById('modal-overlay');
const form              = document.getElementById('opportunity-form');
const btnOpenForm       = document.getElementById('btn-open-form');
const btnCloseModal     = document.getElementById('btn-close-modal');
const btnClearFilters   = document.getElementById('btn-clear-filters');
const filterCity        = document.getElementById('filter-city');
const filterCountry     = document.getElementById('filter-country');
const filterCategory    = document.getElementById('filter-category');
const statTotal         = document.getElementById('stat-total');
const statCities        = document.getElementById('stat-cities');
const statCountries     = document.getElementById('stat-countries');
const statLikes         = document.getElementById('stat-likes');

// ===== STATE =====
let allOpportunities = [];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadOpportunities();
  bindEvents();
});

// ===== EVENTS =====
function bindEvents() {
  btnOpenForm.addEventListener('click', () => openModal());
  btnCloseModal.addEventListener('click', () => closeModal());
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  form.addEventListener('submit', handleSubmit);

  filterCity.addEventListener('change', renderFiltered);
  filterCountry.addEventListener('change', renderFiltered);
  filterCategory.addEventListener('change', renderFiltered);
  btnClearFilters.addEventListener('click', clearFilters);

  // ESC to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ===== LOAD OPPORTUNITIES =====
async function loadOpportunities() {
  loading.style.display = '';
  emptyState.style.display = 'none';
  grid.innerHTML = '';

  const { data, error } = await db
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false });

  loading.style.display = 'none';

  if (error) {
    showToast('Error al cargar oportunidades', 'error');
    console.error(error);
    return;
  }

  allOpportunities = data || [];
  populateFilters();
  renderFiltered();
  updateStats();
}

// ===== POPULATE FILTER DROPDOWNS =====
function populateFilters() {
  const cities     = [...new Set(allOpportunities.map(o => o.city))].sort();
  const countries  = [...new Set(allOpportunities.map(o => o.country))].sort();
  const categories = [...new Set(allOpportunities.map(o => o.category))].sort();

  fillSelect(filterCity, cities, 'Todas');
  fillSelect(filterCountry, countries, 'Todos');
  fillSelect(filterCategory, categories, 'Todas');
}

function fillSelect(select, items, allLabel) {
  const current = select.value;
  select.innerHTML = `<option value="">${allLabel}</option>`;
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });
  // Restore previous selection if still valid
  if (items.includes(current)) select.value = current;
}

// ===== RENDER =====
function renderFiltered() {
  const cityVal     = filterCity.value;
  const countryVal  = filterCountry.value;
  const categoryVal = filterCategory.value;

  let filtered = allOpportunities;
  if (cityVal)     filtered = filtered.filter(o => o.city === cityVal);
  if (countryVal)  filtered = filtered.filter(o => o.country === countryVal);
  if (categoryVal) filtered = filtered.filter(o => o.category === categoryVal);

  grid.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.style.display = '';
    return;
  }

  emptyState.style.display = 'none';

  filtered.forEach((opp, i) => {
    const card = createCard(opp);
    card.style.animationDelay = `${i * 0.06}s`;
    grid.appendChild(card);
  });
}

function createCard(opp) {
  const card = document.createElement('article');
  card.className = 'card';

  const potentialClass = `card__potential--${opp.potential.toLowerCase().replace(/\s/g, '-')}`;
  const categoryIcons = {
    'Salud': '🏥', 'Educación': '📚', 'Finanzas': '💰', 'Turismo': '✈️',
    'Logística': '📦', 'Alimentación': '🍽️', 'Energía': '⚡', 'Retail': '🛒',
    'Inmobiliaria': '🏠', 'Tecnología': '💻', 'Otro': '🔧'
  };
  const catIcon = categoryIcons[opp.category] || '📂';
  const dateStr = new Date(opp.created_at).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  card.innerHTML = `
    <div class="card__header">
      <span class="card__name">${escapeHtml(opp.name)}</span>
      <span class="card__badge">${catIcon} ${escapeHtml(opp.category)}</span>
    </div>
    <span class="card__location">📍 ${escapeHtml(opp.city)}, ${escapeHtml(opp.country)}</span>

    <span class="card__section-label">Problema</span>
    <p class="card__text">${escapeHtml(opp.problem)}</p>

    <span class="card__section-label">Solución con IA</span>
    <p class="card__text">${escapeHtml(opp.ai_solution)}</p>

    <div class="card__footer">
      <span class="card__potential ${potentialClass}">⚡ ${escapeHtml(opp.potential)}</span>
      <button class="card__like-btn" data-id="${opp.id}">
        ❤️ <span>${opp.likes}</span>
      </button>
    </div>
    <span class="card__date">${dateStr}</span>
  `;

  // Like button
  const likeBtn = card.querySelector('.card__like-btn');
  likeBtn.addEventListener('click', () => handleLike(opp.id, likeBtn));

  return card;
}

// ===== STATS =====
function updateStats() {
  const opps = allOpportunities;
  statTotal.textContent     = opps.length;
  statCities.textContent    = new Set(opps.map(o => o.city)).size;
  statCountries.textContent = new Set(opps.map(o => o.country)).size;
  statLikes.textContent     = opps.reduce((sum, o) => sum + (o.likes || 0), 0);
}

// ===== SUBMIT NEW OPPORTUNITY =====
async function handleSubmit(e) {
  e.preventDefault();

  const btn = document.getElementById('btn-submit');
  btn.disabled = true;
  btn.textContent = 'Publicando...';

  const newOpp = {
    name:        document.getElementById('input-name').value.trim(),
    city:        document.getElementById('input-city').value.trim(),
    country:     document.getElementById('input-country').value.trim(),
    problem:     document.getElementById('input-problem').value.trim(),
    ai_solution: document.getElementById('input-solution').value.trim(),
    category:    document.getElementById('input-category').value,
    potential:   document.getElementById('input-potential').value,
    likes:       0,
  };

  const { error } = await db.from('opportunities').insert([newOpp]);

  btn.disabled = false;
  btn.textContent = 'Publicar Oportunidad';

  if (error) {
    showToast('Error al publicar', 'error');
    console.error(error);
    return;
  }

  showToast('¡Oportunidad publicada! 🎉', 'success');
  form.reset();
  closeModal();
  await loadOpportunities();
}

// ===== LIKE =====
async function handleLike(id, btn) {
  btn.disabled = true;
  btn.classList.add('liked');

  // Read current likes first
  const { data: current, error: readErr } = await db
    .from('opportunities')
    .select('likes')
    .eq('id', id)
    .single();

  if (readErr) {
    showToast('Error al dar like', 'error');
    btn.disabled = false;
    return;
  }

  const newLikes = (current.likes || 0) + 1;

  const { error } = await db
    .from('opportunities')
    .update({ likes: newLikes })
    .eq('id', id);

  btn.disabled = false;

  if (error) {
    showToast('Error al dar like', 'error');
    console.error(error);
    return;
  }

  // Update UI immediately
  btn.querySelector('span').textContent = newLikes;

  // Refresh data in background
  await loadOpportunities();
}

// ===== MODAL =====
function openModal() {
  modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  // Focus first input
  setTimeout(() => document.getElementById('input-name').focus(), 300);
}

function closeModal() {
  modalOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ===== FILTERS =====
function clearFilters() {
  filterCity.value = '';
  filterCountry.value = '';
  filterCategory.value = '';
  renderFiltered();
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  // Remove existing toast if any
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `${type === 'success' ? '✅' : '❌'} ${message}`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== UTILS =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
