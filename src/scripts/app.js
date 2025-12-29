/**
 * @typedef {{ ok: boolean; sessionId: string; message: { role: 'assistant'; text: string }; quickReplies?: { id: string; label: string; value: string }[]; nav?: { label: string; href: string }[]; error?: { code: string; message: string } }} ChatResponse
 */

const storageKeys = {
  user: 'cleanai_user',
  auth: 'cleanai_auth_token',
  profile: 'cleanai_profile',
  booking: 'cleanai_booking_draft',
  providerWizard: 'cleanai_provider_wizard',
  chatSession: 'cleanai_chat_session'
};
const sessionKeys = {
  rolePreference: 'cleanai_role_pref',
  landingSegment: 'cleanai_landing_segment',
  landingLocation: 'cleanai_landing_location',
  sessionAlert: 'cleanai_session_alert'
};

const TOKEN_TTL_MS = 1000 * 60 * 60 * 8;
const AUTO_SAVE_DEBOUNCE_MS = 400;
const demoMode = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.VITE_DEMO_MODE);

const defaultProfile = {
  role: null,
  customerCategory: null,
  onboardingComplete: false,
  providerStatus: 'draft',
  providerData: {}
};

const defaultBookingDraft = {
  status: 'draft',
  category: null,
  address: '',
  locationType: '',
  propertySize: '',
  frequency: '',
  dateTime: '',
  extras: [],
  notes: ''
};

const chatSteps = [
  {
    key: 'address',
    prompt: 'Where should we send your cleaner?',
    options: ['Primary home address', 'New office location', 'Hotel room (include room #)']
  },
  {
    key: 'propertySize',
    prompt: 'How large is the space?',
    options: ['Studio or 1 bedroom', '2-3 bedrooms', '4+ bedrooms / large office', 'Over 200 sqm']
  },
  {
    key: 'frequency',
    prompt: 'How often do you want this cleaning?',
    options: ['One-time', 'Weekly', 'Every 2 weeks', 'Monthly']
  },
  {
    key: 'dateTime',
    prompt: 'When should we start?',
    options: [
      () => formatRelativeDate(1, '09:00'),
      () => formatRelativeDate(2, '13:00'),
      () => formatRelativeDate(3, '18:00'),
      'Share another time'
    ]
  },
  {
    key: 'extras',
    prompt: 'Any extras for this visit?',
    options: ['Deep clean', 'Fridge & oven', 'Laundry', 'No extras']
  },
  {
    key: 'notes',
    prompt: 'Add any access notes or preferences (optional).',
    options: ['Access code ready', 'Pets at home', 'Fragile items – handle with care'],
    allowCustom: true
  }
];

function sanitizeText(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function debounce(fn, wait) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), wait);
  };
}

/** @param {unknown} payload */
function isValidChatResponse(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const data = /** @type {Record<string, unknown>} */ (payload);
  const message = /** @type {Record<string, unknown> | undefined} */ (data.message);
  return (
    typeof data.ok === 'boolean' &&
    typeof data.sessionId === 'string' &&
    message &&
    message.role === 'assistant' &&
    typeof message.text === 'string'
  );
}

function renderQuickReplies(quickReplies) {
  const container = document.getElementById('quick-replies');
  if (!container || !Array.isArray(quickReplies)) return;
  container.innerHTML = '';
  quickReplies.forEach((item) => {
    if (!item || typeof item.label !== 'string') return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-reply';
    button.textContent = item.label;
    button.addEventListener('click', () => {
      appendUser(item.value || item.label);
      safeChatPing(item.value || item.label);
    });
    container.appendChild(button);
  });
}

function renderNavLinks(nav) {
  if (!Array.isArray(nav) || !nav.length) return;
  const stream = document.getElementById('chat-stream');
  if (!stream) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-wrap gap-2';
  nav.forEach((item) => {
    if (!item || typeof item.label !== 'string' || typeof item.href !== 'string') return;
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'rounded-full border border-white/20 px-3 py-1 text-xs text-white hover:border-white/40';
    link.textContent = item.label;
    link.addEventListener('click', () => {
      window.location.href = item.href;
    });
    wrapper.appendChild(link);
  });
  stream.appendChild(wrapper);
  stream.scrollTop = stream.scrollHeight;
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn('Unable to parse storage', error);
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getUser() {
  return readJSON(storageKeys.user, null);
}

function setUser(user) {
  saveJSON(storageKeys.user, user);
}

function getProfile() {
  return { ...defaultProfile, ...readJSON(storageKeys.profile, {}) };
}

function setProfile(update) {
  const profile = { ...getProfile(), ...update };
  saveJSON(storageKeys.profile, profile);
  return profile;
}

function getBookingDraft() {
  const saved = readJSON(storageKeys.booking, {});
  return { ...defaultBookingDraft, ...saved };
}

function setBookingDraft(update) {
  const draft = { ...getBookingDraft(), ...update };
  saveJSON(storageKeys.booking, draft);
  return draft;
}

function setAuthToken() {
  const token = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  const auth = { value: token, expiresAt: Date.now() + TOKEN_TTL_MS };
  localStorage.setItem(storageKeys.auth, JSON.stringify(auth));
  return auth;
}

function getAuthToken() {
  const auth = readJSON(storageKeys.auth, null);
  if (!auth) return null;
  if (auth.expiresAt && Date.now() > auth.expiresAt) {
    sessionStorage.setItem(sessionKeys.sessionAlert, 'Session expired. Please log in again.');
    clearSession();
    return null;
  }
  return auth.value;
}

function clearSession() {
  localStorage.removeItem(storageKeys.auth);
  localStorage.removeItem(storageKeys.user);
  localStorage.removeItem(storageKeys.profile);
  localStorage.removeItem(storageKeys.booking);
  localStorage.removeItem(storageKeys.providerWizard);
  localStorage.removeItem(storageKeys.chatSession);
}

function requireAuth() {
  if (!getAuthToken()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

function requireRole(role) {
  const profile = getProfile();
  if (profile.role !== role) {
    window.location.href = '/onboarding.html';
    return false;
  }
  return true;
}

function isCustomerOnboarded() {
  const profile = getProfile();
  return profile.role === 'customer' && Boolean(profile.customerCategory);
}

function isProviderOnboarded() {
  const profile = getProfile();
  return profile.role === 'provider' && profile.providerStatus !== 'draft';
}

function formatRelativeDate(daysAhead, time) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return `${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`;
}

function getLocaleStrings() {
  const isSwedish = (navigator.language || '').toLowerCase().startsWith('sv');
  return {
    locationPrompt: isSwedish ? 'Tillåt platsåtkomst för att fylla i din adress.' : 'Please allow location access to fill your address.',
    locationError: isSwedish ? 'Kunde inte hämta plats. Ange adress manuellt.' : 'Could not fetch your location. Please enter the address manually.',
    locationAdded: (address) => (isSwedish ? `La till din plats: ${address}` : `Added your location: ${address}`),
    locationChip: isSwedish ? 'Använd min plats' : 'Use my location'
  };
}

function showError(target, message) {
  const el = document.getElementById(target);
  if (el) {
    el.textContent = message;
  }
}

function attachErrorBoundary() {
  const renderError = (message) => {
    let banner = document.getElementById('app-error-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'app-error-banner';
      banner.className = 'fixed inset-x-0 top-0 z-50 bg-rose-900/80 px-4 py-2 text-sm text-white';
      document.body.appendChild(banner);
    }
    banner.textContent = message;
  };
  window.addEventListener('error', (event) => {
    console.error('App error boundary', event.error || event.message);
    renderError('Something went wrong. Please refresh and try again.');
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection', event.reason);
    renderError('Unexpected issue occurred. Please retry your last action.');
  });
}

function attachLogout() {
  const logoutButtons = Array.from(document.querySelectorAll('#logout'));
  logoutButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      clearSession();
      window.location.href = '/login.html';
    });
  });
}

function initAuthPage(type) {
  const formId = type === 'login' ? 'login-form' : 'register-form';
  const form = document.getElementById(formId);
  const errorTarget = `${type}-error`;
  if (!form) return;
  const expiredMessage = sessionStorage.getItem(sessionKeys.sessionAlert);
  if (expiredMessage) {
    showError(errorTarget, expiredMessage);
    sessionStorage.removeItem(sessionKeys.sessionAlert);
  }

  if (window.location.hash.includes('provider')) {
    sessionStorage.setItem(sessionKeys.rolePreference, 'provider');
  }

  if (getAuthToken()) {
    window.location.href = '/onboarding.html';
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    showError(errorTarget, '');

    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '').trim();
    const name = String(formData.get('name') || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError(errorTarget, 'Please enter a valid email.');
      return;
    }
    if (!password || password.length < 8) {
      showError(errorTarget, 'Password must be at least 8 characters.');
      return;
    }
    if (type === 'register' && !name) {
      showError(errorTarget, 'Add your name so we can personalize the chat.');
      return;
    }

    setAuthToken();
    const nextProfile = type === 'register' ? { ...defaultProfile } : getProfile();
    setProfile(nextProfile);
    setUser({ email, name: name || 'CleanAI user' });
    window.location.href = '/onboarding.html';
  });
}

function initOnboardingPage() {
  if (!requireAuth()) return;
  const user = getUser();
  const profile = getProfile();

  const userLabel = document.getElementById('onboarding-user');
  if (userLabel) {
    userLabel.textContent = user?.email || 'Logged in';
  }

  const roleCards = document.querySelectorAll('.role-card');
  const categorySection = document.getElementById('category-section');
  const continueBtn = document.getElementById('continue-onboarding');
  const onboardingStatus = document.getElementById('onboarding-status');
  const roleStatus = document.getElementById('role-status');
  const categoryStatus = document.getElementById('category-status');
  const providerStatus = document.getElementById('provider-status');
  const errorEl = document.getElementById('onboarding-error');
  const preferredRole = sessionStorage.getItem(sessionKeys.rolePreference);

  if (!profile.role && preferredRole) {
    const updated = setProfile({ role: preferredRole });
    profile.role = updated.role;
    sessionStorage.removeItem(sessionKeys.rolePreference);
  }

  roleCards.forEach((card) => {
    if (card.dataset.role === profile.role) {
      card.classList.add('active');
      if (profile.role === 'customer') categorySection?.classList.remove('hidden');
    }
  });

  if (profile.customerCategory) {
    document.querySelectorAll('.category-card').forEach((button) => {
      if (button.dataset.category === profile.customerCategory) button.classList.add('active');
    });
    categorySection?.classList.remove('hidden');
  }

  roleCards.forEach((card) => {
    card.addEventListener('click', () => {
      const role = card.dataset.role;
      const updated = setProfile({ role, onboardingComplete: false });
      card.classList.add('active');
      roleCards.forEach((c) => {
        if (c !== card) c.classList.remove('active');
      });
      if (role === 'customer') {
        categorySection?.classList.remove('hidden');
      } else {
        categorySection?.classList.add('hidden');
        categoryStatus.textContent = 'N/A';
      }
      updateOnboardingBadges(updated, { onboardingStatus, roleStatus, categoryStatus, providerStatus });
      if (errorEl) errorEl.textContent = '';
    });
  });

  document.querySelectorAll('.category-card').forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.category;
      const updated = setProfile({ customerCategory: category, onboardingComplete: true });
      document.querySelectorAll('.category-card').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      updateOnboardingBadges(updated, { onboardingStatus, roleStatus, categoryStatus, providerStatus });
      if (errorEl) errorEl.textContent = '';
    });
  });

  continueBtn?.addEventListener('click', () => {
    const current = getProfile();
    if (!current.role) {
      errorEl.textContent = 'Choose a role to continue.';
      return;
    }
    if (current.role === 'customer' && !current.customerCategory) {
      errorEl.textContent = 'Pick what you need cleaned to continue to chat.';
      return;
    }
    if (current.role === 'customer') {
      setProfile({ onboardingComplete: true });
      window.location.href = '/book.html';
    } else {
      setProfile({ providerStatus: current.providerStatus || 'draft' });
      window.location.href = '/provider-onboarding.html';
    }
  });

  updateOnboardingBadges(profile, { onboardingStatus, roleStatus, categoryStatus, providerStatus });
  attachLogout();
}

function updateOnboardingBadges(profile, refs) {
  const { onboardingStatus, roleStatus, categoryStatus, providerStatus } = refs;
  const roleLabel = profile.role ? 'Captured' : 'Pending';
  const categoryLabel = profile.role === 'customer' && profile.customerCategory ? profile.customerCategory : profile.role === 'provider' ? 'N/A' : 'Pending';
  const onboardingLabel = profile.role === 'customer' && profile.customerCategory ? 'Ready' : profile.role === 'provider' && profile.providerStatus !== 'draft' ? profile.providerStatus : 'Draft';

  if (onboardingStatus) onboardingStatus.textContent = onboardingLabel;
  if (roleStatus) roleStatus.textContent = roleLabel;
  if (categoryStatus) categoryStatus.textContent = categoryLabel;
  if (providerStatus) providerStatus.textContent = profile.providerStatus || 'Draft';
}

function initBookingPage() {
  if (!requireAuth()) return;
  if (!requireRole('customer')) return;
  if (!isCustomerOnboarded()) {
    window.location.href = '/onboarding.html';
    return;
  }
  attachLogout();

  const profile = getProfile();
  const draft = setBookingDraft({ category: profile.customerCategory });
  const categoryPill = document.getElementById('customer-category-pill');
  const subtitle = document.getElementById('booking-subtitle');
  if (categoryPill) {
    categoryPill.textContent = profile.customerCategory || 'Customer';
    categoryPill.classList.remove('hidden');
  }
  if (subtitle) subtitle.textContent = `We’ll keep your ${profile.customerCategory} booking structured.`;

  setupSummaryToggle();
  renderDraftPanels();
  startChatFlow();
  initBookingConfirm();
}

function setupSummaryToggle() {
  const toggle = document.getElementById('toggle-summary');
  const mobileDrawer = document.getElementById('mobile-summary');
  const close = document.getElementById('close-mobile-summary');
  toggle?.addEventListener('click', () => mobileDrawer?.classList.remove('hidden'));
  close?.addEventListener('click', () => mobileDrawer?.classList.add('hidden'));
  mobileDrawer?.addEventListener('click', (event) => {
    if (event.target === mobileDrawer) mobileDrawer.classList.add('hidden');
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') mobileDrawer?.classList.add('hidden');
  });
}

let chatState = { step: 0 };

function startChatFlow() {
  const user = getUser();
  const name = user?.name || 'there';
  appendAssistant(`Hi ${name}, let’s book your cleaning. I’ll keep this guided.`);
  chatState.step = 0;
  presentStep();
  const form = document.getElementById('chat-input');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('custom-reply');
    if (!input?.value) return;
    const message = input.value.trim();
    if (!message) return;
    appendUser(message);
    const draft = setBookingDraft({ notes: `${getBookingDraft().notes ? getBookingDraft().notes + ' ' : ''}${message}`.trim() });
    renderDraftPanels(draft);
    input.value = '';
    appendAssistant('Noted. I’ve added this to your booking draft.');
  });
}

function presentStep() {
  const step = chatSteps[chatState.step];
  if (!step) return;
  appendAssistant(step.prompt);
  const replies = document.getElementById('quick-replies');
  replies.innerHTML = '';
  step.options.forEach((option) => {
    const label = typeof option === 'function' ? option() : option;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-reply';
    button.textContent = label;
    button.addEventListener('click', () => handleStepSelection(step, label));
    replies.appendChild(button);
  });
  if (step.key === 'address') {
    const locButton = document.createElement('button');
    locButton.type = 'button';
    locButton.className = 'quick-reply';
    locButton.textContent = getLocaleStrings().locationChip;
    locButton.addEventListener('click', () => handleLocationAutofill(step));
    replies.appendChild(locButton);
  }
}

function handleStepSelection(step, value) {
  appendUser(value);
  const draft = getBookingDraft();
  const nextDraft = { ...draft };
  if (step.key === 'extras') {
    nextDraft.extras = value === 'No extras' ? [] : [value];
  } else if (step.key === 'notes') {
    nextDraft.notes = value;
  } else {
    nextDraft[step.key] = value;
  }
  setBookingDraft(nextDraft);
  renderDraftPanels(nextDraft);
  moveToNextStep();
}

async function reverseGeocode(lat, lon) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
      headers: { 'Accept-Language': navigator.language || 'en' },
      signal: controller.signal
    });
    window.clearTimeout(timeout);
    if (!response.ok) throw new Error(`Reverse geocode failed with status ${response.status}`);
    const data = await response.json();
    const address = data?.address || {};
    const postcode = address.postcode || '';
    const city = address.city || address.town || address.village || address.hamlet || '';
    let computed = `${postcode} ${city}`.trim();
    if (!computed && data?.display_name) {
      computed = String(data.display_name).split(',').slice(0, 3).join(', ').trim();
    }
    if (!computed) throw new Error('Unable to parse address');
    return computed;
  } finally {
    window.clearTimeout(timeout);
  }
}

function applyLocationAddress(step, address) {
  const draftUpdate = setBookingDraft({ address, locationType: 'home' });
  sessionStorage.setItem(sessionKeys.landingLocation, address);
  renderDraftPanels(draftUpdate);
  const landingInput = document.querySelector('input[name="location"]');
  if (landingInput) {
    landingInput.value = address;
    landingInput.dispatchEvent(new Event('input', { bubbles: true }));
    landingInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
  appendAssistant(getLocaleStrings().locationAdded(address));
  handleStepSelection(step, address);
}

function handleLocationAutofill(step) {
  const { locationPrompt, locationError } = getLocaleStrings();
  appendAssistant(locationPrompt);
  if (!navigator.geolocation) {
    appendAssistant(locationError);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const address = await reverseGeocode(latitude, longitude);
        applyLocationAddress(step, address);
      } catch (error) {
        console.error('Reverse geocode failed', error);
        appendAssistant(locationError);
      }
    },
    (error) => {
      console.error('Geolocation error', error);
      appendAssistant(locationError);
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
  );
}

function moveToNextStep() {
  if (chatState.step < chatSteps.length - 1) {
    chatState.step += 1;
    presentStep();
  } else {
    appendAssistant('Thanks! Here is your booking draft. Submit when ready.');
    injectDraftCard();
    document.getElementById('quick-replies').innerHTML = '';
  }
}

function appendAssistant(message) {
  const stream = document.getElementById('chat-stream');
  if (!stream) return;
  const bubble = document.createElement('div');
  bubble.className = 'assistant-bubble';
  const p = document.createElement('p');
  p.textContent = message;
  bubble.appendChild(p);
  stream.appendChild(bubble);
  stream.scrollTop = stream.scrollHeight;
}

function appendUser(message) {
  const stream = document.getElementById('chat-stream');
  if (!stream) return;
  const bubble = document.createElement('div');
  bubble.className = 'user-bubble';
  bubble.textContent = message;
  stream.appendChild(bubble);
  stream.scrollTop = stream.scrollHeight;
}

function renderDraftPanels(draftOverride) {
  const draft = draftOverride || getBookingDraft();
  const fields = [
    { label: 'Category', value: draft.category || 'Not set' },
    { label: 'Address', value: draft.address || 'Add address' },
    { label: 'Size', value: draft.propertySize || 'Choose size' },
    { label: 'Frequency', value: draft.frequency || 'Select cadence' },
    { label: 'Schedule', value: draft.dateTime || 'Pick a time' },
    { label: 'Extras', value: draft.extras.length ? draft.extras.join(', ') : 'No extras' },
    { label: 'Notes', value: draft.notes || 'Optional notes' }
  ];
  const panels = [document.getElementById('draft-fields'), document.getElementById('draft-fields-mobile')];
  panels.forEach((panel) => {
    if (!panel) return;
    panel.innerHTML = '';
    fields.forEach((field) => {
      const row = document.createElement('div');
      row.className = 'draft-row';
      const container = document.createElement('div');
      const labelEl = document.createElement('p');
      labelEl.className = 'text-white';
      labelEl.textContent = field.label;
      const valueEl = document.createElement('p');
      valueEl.className = 'text-gray-400';
      valueEl.textContent = field.value;
      container.appendChild(labelEl);
      container.appendChild(valueEl);
      row.appendChild(container);
      panel.appendChild(row);
    });
  });
  updateSubmitState(draft);
}

function injectDraftCard() {
  const stream = document.getElementById('chat-stream');
  const draft = getBookingDraft();
  if (!stream) return;
  const card = document.createElement('div');
  card.className = 'quote-card';
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between';
  const left = document.createElement('div');
  const badgeTitle = document.createElement('p');
  badgeTitle.className = 'text-xs uppercase tracking-[0.2em] text-gray-400';
  badgeTitle.textContent = 'Booking Draft';
  const quoteTitle = document.createElement('p');
  quoteTitle.className = 'text-lg font-semibold text-white';
  quoteTitle.textContent = `${draft.category || 'Cleaning'} quote`;
  left.appendChild(badgeTitle);
  left.appendChild(quoteTitle);
  const statusPill = document.createElement('span');
  statusPill.className = 'pill';
  statusPill.textContent = 'Draft';
  header.appendChild(left);
  header.appendChild(statusPill);

  const details = document.createElement('div');
  details.className = 'mt-3 space-y-2 text-sm text-gray-300';
  const detailRows = [
    ['Address', draft.address || 'Pending'],
    ['Size', draft.propertySize || 'Pending'],
    ['Frequency', draft.frequency || 'Pending'],
    ['Schedule', draft.dateTime || 'Pending'],
    ['Extras', draft.extras.length ? draft.extras.join(', ') : 'None'],
    ['Notes', draft.notes || '—']
  ];
  detailRows.forEach(([label, value]) => {
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = `${label}: `;
    p.appendChild(strong);
    p.appendChild(document.createTextNode(value));
    details.appendChild(p);
  });

  card.appendChild(header);
  card.appendChild(details);
  stream.appendChild(card);
  stream.scrollTop = stream.scrollHeight;
}

function updateSubmitState(draft) {
  const canSubmit = Boolean(draft.address && draft.propertySize && draft.frequency && draft.dateTime);
  const submitButtons = [
    document.getElementById('confirm-booking'),
    document.getElementById('confirm-booking-mobile')
  ];
  submitButtons.forEach((btn) => {
    if (!btn) return;
    btn.disabled = !canSubmit;
    btn.classList.toggle('opacity-50', !canSubmit);
    btn.classList.toggle('cursor-not-allowed', !canSubmit);
  });
  const feedbackEls = [
    document.getElementById('draft-feedback'),
    document.getElementById('draft-feedback-mobile')
  ];
  const missingMessage = canSubmit ? '' : 'Complete address, size, frequency, and schedule to submit.';
  feedbackEls.forEach((el) => {
    if (!el) return;
    if (el.textContent?.includes('Submitted')) return;
    el.textContent = missingMessage;
  });
}

function initBookingConfirm() {
  const confirmButtons = [
    document.getElementById('confirm-booking'),
    document.getElementById('confirm-booking-mobile')
  ];
  const feedbackEls = [
    document.getElementById('draft-feedback'),
    document.getElementById('draft-feedback-mobile')
  ];

  confirmButtons.forEach((btn) => {
    btn?.addEventListener('click', async () => {
      setBookingDraft({ status: 'submitted' });
      feedbackEls.forEach((el) => el && (el.textContent = 'Submitted draft. Awaiting confirmation.'));
      await safeChatPing();
      injectDraftCard();
      renderDraftPanels();
    });
  });
}

async function safeChatPing(text = 'Booking submitted') {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const sessionId = readJSON(storageKeys.chatSession, null);
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        messages: [{ role: 'user', text }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    if (!isValidChatResponse(data)) throw new Error('Invalid response schema');
    if (!data.ok) {
      appendAssistant(data.error?.message || 'Assistant unavailable.');
      return;
    }
    saveJSON(storageKeys.chatSession, data.sessionId);
    appendAssistant(data.message.text);
    renderQuickReplies(data.quickReplies);
    renderNavLinks(data.nav);
  } catch (error) {
    console.warn('AI chat error', error);
    appendAssistant('We could not reach the AI right now. Continuing with the guided draft.');
  }
}

function initProviderOnboarding() {
  if (!requireAuth()) return;
  if (!requireRole('provider')) return;
  attachLogout();

  const profile = getProfile();
  const steps = ['basics', 'availability', 'pricing', 'verification', 'profile'];
  const savedWizard = readJSON(storageKeys.providerWizard, { step: 0, data: null });
  let currentStep = Math.min(Math.max(Number(savedWizard.step) || 0, 0), steps.length - 1);
  const form = document.getElementById('provider-form');
  const progressBar = document.getElementById('provider-progress-bar');
  const progressLabel = document.getElementById('provider-progress-label');
  const providerStatusEl = document.getElementById('provider-status');
  const providerBadge = document.getElementById('provider-badge');
  const providerFeedback = document.getElementById('provider-feedback');
  const providerError = document.getElementById('provider-error');

  if (providerStatusEl) providerStatusEl.textContent = profile.providerStatus || 'Draft';
  if (providerBadge) providerBadge.textContent = profile.providerStatus || 'Draft';

  restoreProviderForm(savedWizard.data || profile.providerData || {});
  updateStep();

  const autoSave = debounce(() => {
    const data = collectProviderData(form);
    saveJSON(storageKeys.providerWizard, { step: currentStep, data });
    setProfile({ providerData: data });
    if (providerFeedback) providerFeedback.textContent = 'Saved locally.';
  }, AUTO_SAVE_DEBOUNCE_MS);

  form?.addEventListener('input', autoSave);
  form?.addEventListener('change', autoSave);

  document.getElementById('prev-step')?.addEventListener('click', () => {
    currentStep = Math.max(0, currentStep - 1);
    updateStep();
  });

  document.getElementById('next-step')?.addEventListener('click', () => {
    const data = collectProviderData(form);
    setProfile({ providerData: data });
    if (!validateStep(steps[currentStep], data, providerError)) return;
    currentStep = Math.min(steps.length - 1, currentStep + 1);
    updateStep();
  });

  document.getElementById('save-draft')?.addEventListener('click', () => {
    const data = collectProviderData(form);
    setProfile({ providerData: data, providerStatus: 'draft' });
    providerFeedback.textContent = 'Draft saved locally. Resume anytime.';
    providerStatusEl.textContent = 'Draft';
    providerBadge.textContent = 'Draft';
    saveJSON(storageKeys.providerWizard, { step: currentStep, data });
  });

  document.getElementById('submit-provider')?.addEventListener('click', () => {
    const data = collectProviderData(form);
    setProfile({ providerData: data, providerStatus: 'pending', onboardingComplete: true });
    providerFeedback.textContent = 'Submitted for review. Feed remains locked until approved.';
    providerStatusEl.textContent = 'Pending review';
    providerBadge.textContent = 'Pending';
    saveJSON(storageKeys.providerWizard, { step: currentStep, data });
  });

  function updateStep() {
    const active = steps[currentStep];
    form.querySelectorAll('.step-card').forEach((card) => {
      card.classList.toggle('hidden', card.dataset.step !== active);
    });
    const progress = Math.round(((currentStep + 1) / steps.length) * 100);
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressLabel) progressLabel.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    const data = collectProviderData(form);
    saveJSON(storageKeys.providerWizard, { step: currentStep, data });
  }

  function restoreProviderForm(data) {
    if (!form) return;
    const categories = data.categories || [];
    form.elements['type'].value = data.type || 'individual';
    form.elements['serviceArea'].value = data.serviceArea || '';
    form.elements['weekdays'].value = data.weekdays || '';
    form.elements['weekends'].value = data.weekends || '';
    form.elements['hourlyRate'].value = data.hourlyRate || '';
    form.elements['calloutFee'].value = data.calloutFee || '';
    form.elements['bio'].value = data.bio || '';
    form.elements['languages'].value = data.languages || '';
    form.elements['portfolio'].value = data.portfolio || '';
    form.querySelectorAll('input[name="categories"]').forEach((input) => {
      input.checked = categories.includes(input.value);
    });
  }

  function collectProviderData(formEl) {
    if (!formEl) return getProfile().providerData || {};
    const data = {
      type: formEl.elements['type'].value,
      serviceArea: formEl.elements['serviceArea'].value,
      categories: Array.from(formEl.querySelectorAll('input[name="categories"]')).filter((c) => c.checked).map((c) => c.value),
      weekdays: formEl.elements['weekdays'].value,
      weekends: formEl.elements['weekends'].value,
      hourlyRate: formEl.elements['hourlyRate'].value,
      calloutFee: formEl.elements['calloutFee'].value,
      verificationFile: formEl.elements['verificationFile']?.value || '',
      bio: formEl.elements['bio'].value,
      languages: formEl.elements['languages'].value,
      portfolio: formEl.elements['portfolio'].value
    };
    return data;
  }
}

function validateStep(step, data, errorEl) {
  if (!errorEl) return true;
  errorEl.textContent = '';
  if (step === 'basics') {
    if (!data.serviceArea) {
      errorEl.textContent = 'Add a service area to continue.';
      return false;
    }
  }
  if (step === 'pricing') {
    if (!data.hourlyRate) {
      errorEl.textContent = 'Share an hourly rate to continue.';
      return false;
    }
  }
  return true;
}

function initProviderFeed() {
  if (!requireAuth()) return;
  if (!requireRole('provider')) return;
  attachLogout();

  const profile = getProfile();
  const locked = document.getElementById('feed-locked');
  const list = document.getElementById('feed-list');
  const badge = document.getElementById('feed-status');
  const markApproved = document.getElementById('mark-approved');

  const approved = profile.providerStatus === 'approved';
  badge.textContent = approved ? 'Approved' : profile.providerStatus || 'Pending';

  if (profile.providerStatus === 'draft') {
    window.location.href = '/provider-onboarding.html';
    return;
  }

  if (approved) {
    locked?.classList.add('hidden');
    renderFeed(list);
  } else {
    locked?.classList.remove('hidden');
    list.innerHTML = '';
  }

  if (markApproved && demoMode) {
    markApproved.addEventListener('click', () => {
      setProfile({ providerStatus: 'approved' });
      badge.textContent = 'Approved';
      locked?.classList.add('hidden');
      renderFeed(list);
    });
  } else if (markApproved) {
    markApproved.remove();
  }
}

function renderFeed(container) {
  if (!container) return;
  container.innerHTML = '';
  const items = demoMode
    ? [
        { title: 'Weekly home clean', location: 'Berlin-Mitte', budget: '€120', start: 'Tue · 09:00' },
        { title: 'Office refresh', location: 'Amsterdam Zuid', budget: '€220', start: 'Wed · 18:00' },
        { title: 'Hotel turnover', location: 'Lisbon', budget: '€180', start: 'Fri · 14:00' }
      ]
    : [];
  if (!items.length) {
    const note = document.createElement('p');
    note.className = 'text-sm text-gray-400';
    note.textContent = 'Feed will populate after approval. No demo data in production mode.';
    container.appendChild(note);
    return;
  }
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'surface-card rounded-2xl p-4 text-sm';
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between';
    const title = document.createElement('p');
    title.className = 'text-white font-semibold';
    title.textContent = item.title;
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = item.budget;
    header.appendChild(title);
    header.appendChild(pill);

    const location = document.createElement('p');
    location.className = 'text-gray-300';
    location.textContent = item.location;
    const start = document.createElement('p');
    start.className = 'text-gray-400 text-xs';
    start.textContent = item.start;
    const note = document.createElement('p');
    note.className = 'mt-2 text-emerald-200 text-xs';
    note.textContent = 'Visible only after approval';

    card.appendChild(header);
    card.appendChild(location);
    card.appendChild(start);
    card.appendChild(note);
    container.appendChild(card);
  });
}

function routeGuard(page) {
  if (page === 'book') {
    if (!requireAuth()) return false;
    if (!requireRole('customer')) return false;
    if (!isCustomerOnboarded()) {
      window.location.href = '/onboarding.html';
      return false;
    }
  }
  if (page === 'provider-onboarding' || page === 'provider-feed') {
    if (!requireAuth()) return false;
    if (!requireRole('provider')) return false;
  }
  if (page === 'onboarding') {
    if (!requireAuth()) return false;
  }
  return true;
}

function initNavLinks() {
  document.querySelectorAll('.nav-link').forEach((link) => {
    const isActive = window.location.pathname.includes(link.getAttribute('href'));
    if (isActive) link.classList.add('nav-active');
  });
}

function initLandingPage() {
  const form = document.getElementById('landing-intake');
  const errorEl = document.getElementById('landing-error');
  const chips = Array.from(document.querySelectorAll('[data-segment]'));
  const savedSegment = sessionStorage.getItem(sessionKeys.landingSegment);
  const savedLocation = sessionStorage.getItem(sessionKeys.landingLocation);

  if (savedSegment) {
    const match = chips.find((c) => c.dataset.segment === savedSegment);
    if (match) match.classList.add('active');
  }
  if (savedLocation) {
    const input = form?.querySelector('input[name=\"location\"]');
    if (input) input.value = savedLocation;
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      sessionStorage.setItem(sessionKeys.landingSegment, chip.dataset.segment);
    });
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const location = form.elements['location']?.value?.trim();
    const activeSegment = chips.find((c) => c.classList.contains('active'))?.dataset.segment;
    if (!location) {
      if (errorEl) errorEl.textContent = 'Add your ZIP or city to get availability.';
      return;
    }
    if (!activeSegment) {
      if (errorEl) errorEl.textContent = 'Choose Home, Office, or Hotel to continue.';
      return;
    }
    sessionStorage.setItem(sessionKeys.landingLocation, location);
    sessionStorage.setItem(sessionKeys.landingSegment, activeSegment);
    sessionStorage.setItem(sessionKeys.rolePreference, 'customer');
    window.location.href = '/register.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  attachErrorBoundary();
  const page = document.body.dataset.page;
  initNavLinks();
  switch (page) {
    case 'landing':
      initLandingPage();
      break;
    case 'login':
      initAuthPage('login');
      break;
    case 'register':
      initAuthPage('register');
      break;
    case 'onboarding':
      if (routeGuard('onboarding')) initOnboardingPage();
      break;
    case 'book':
      if (routeGuard('book')) initBookingPage();
      break;
    case 'provider-onboarding':
      if (routeGuard('provider-onboarding')) initProviderOnboarding();
      break;
    case 'provider-feed':
      if (routeGuard('provider-feed')) initProviderFeed();
      break;
    default:
      break;
  }
});
