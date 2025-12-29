import { initI18n, t, onLanguageChange, openLanguageSelector, getCurrentLanguage, formatWithLocale, applyTranslations } from './i18n.js';
import { requestLocationAutofill, attachLandingLocationAutofill } from './useLocationAutofill.ts';
import { detectIntent } from './nlp/intentEngine.ts';
import { getGuidedPrompt, shouldStayInFlow } from './dialog/flowManager.ts';

const storageKeys = {
  user: 'cleanai_user',
  auth: 'cleanai_auth_token',
  profile: 'cleanai_profile',
  booking: 'cleanai_booking_draft'
};
const sessionKeys = {
  rolePreference: 'cleanai_role_pref',
  landingSegment: 'cleanai_landing_segment',
  landingLocation: 'cleanai_landing_location'
};

const defaultProfile = {
  role: null,
  customerCategory: null,
  onboardingComplete: false,
  providerStatus: 'draft',
  providerData: {},
  language: 'en'
};

const defaultBookingDraft = {
  status: 'draft',
  category: null,
  address: '',
  locationConsent: false,
  propertySize: '',
  frequency: '',
  dateTime: '',
  extras: [],
  notes: ''
};

const chatStepDefinitions = [
  {
    key: 'address',
    promptKey: 'chat.steps.address.prompt',
    options: ['chat.steps.address.option.home', 'chat.steps.address.option.office', 'chat.steps.address.option.hotel']
  },
  {
    key: 'propertySize',
    promptKey: 'chat.steps.size.prompt',
    options: ['chat.steps.size.option.studio', 'chat.steps.size.option.small', 'chat.steps.size.option.large', 'chat.steps.size.option.over200']
  },
  {
    key: 'frequency',
    promptKey: 'chat.steps.frequency.prompt',
    options: ['chat.steps.frequency.option.once', 'chat.steps.frequency.option.weekly', 'chat.steps.frequency.option.biweekly', 'chat.steps.frequency.option.monthly']
  },
  {
    key: 'dateTime',
    promptKey: 'chat.steps.schedule.prompt',
    options: [
      () => formatRelativeDate(1, '09:00'),
      () => formatRelativeDate(2, '13:00'),
      () => formatRelativeDate(3, '18:00'),
      'chat.steps.schedule.option.share'
    ]
  },
  {
    key: 'extras',
    promptKey: 'chat.steps.extras.prompt',
    options: ['chat.steps.extras.option.deep', 'chat.steps.extras.option.kitchen', 'chat.steps.extras.option.laundry', 'chat.steps.extras.option.none']
  },
  {
    key: 'notes',
    promptKey: 'chat.steps.notes.prompt',
    options: ['chat.steps.notes.option.access', 'chat.steps.notes.option.pets', 'chat.steps.notes.option.fragile'],
    allowCustom: true
  }
];

function getChatSteps() {
  return chatStepDefinitions.map((step) => {
    const options = step.options.map((option) => option);
    return { ...step, options, prompt: t(step.promptKey) };
  });
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
  localStorage.setItem(storageKeys.auth, token);
  return token;
}

function getAuthToken() {
  return localStorage.getItem(storageKeys.auth);
}

function clearSession() {
  localStorage.removeItem(storageKeys.auth);
  localStorage.removeItem(storageKeys.user);
  localStorage.removeItem(storageKeys.profile);
  localStorage.removeItem(storageKeys.booking);
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
  const label = formatWithLocale(date, getCurrentLanguage(), { weekday: 'short', month: 'short', day: 'numeric' });
  return `${label} · ${time}`;
}

function showError(target, message) {
  const el = document.getElementById(target);
  if (el) {
    el.textContent = message;
  }
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

function bindLanguageLauncher() {
  const buttons = Array.from(document.querySelectorAll('#language-launcher'));
  buttons.forEach((btn) => {
    if (!btn.dataset.bound) {
      btn.addEventListener('click', () => openLanguageSelector());
      btn.dataset.bound = 'true';
    }
    btn.textContent = t('language.switch', 'Language');
  });
}

function initAuthPage(type) {
  const formId = type === 'login' ? 'login-form' : 'register-form';
  const form = document.getElementById(formId);
  const errorTarget = `${type}-error`;
  if (!form) return;

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
      showError(errorTarget, t('auth.error.email', 'Please enter a valid email.'));
      return;
    }
    if (!password || password.length < 8) {
      showError(errorTarget, t('auth.error.password', 'Password must be at least 8 characters.'));
      return;
    }
    if (type === 'register' && !name) {
      showError(errorTarget, t('auth.error.name', 'Add your name so we can personalize the chat.'));
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
    userLabel.textContent = user?.email || t('onboarding.loggedIn', 'Logged in');
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
        categoryStatus.textContent = t('status.na', 'N/A');
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
      errorEl.textContent = t('onboarding.error.role', 'Choose a role to continue.');
      return;
    }
    if (current.role === 'customer' && !current.customerCategory) {
      errorEl.textContent = t('onboarding.error.category', 'Pick what you need cleaned to continue to chat.');
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
  const roleLabel = profile.role ? t('status.captured', 'Captured') : t('status.pending', 'Pending');
  const categoryLabel =
    profile.role === 'customer' && profile.customerCategory
      ? profile.customerCategory
      : profile.role === 'provider'
        ? t('status.na', 'N/A')
        : t('status.pending', 'Pending');
  const onboardingLabel =
    profile.role === 'customer' && profile.customerCategory
      ? t('status.ready', 'Ready')
      : profile.role === 'provider' && profile.providerStatus !== 'draft'
        ? t(`status.${profile.providerStatus}`, profile.providerStatus)
        : t('status.draft', 'Draft');
  const providerLabel = profile.providerStatus ? t(`status.${profile.providerStatus}`, profile.providerStatus) : t('status.draft', 'Draft');

  if (onboardingStatus) onboardingStatus.textContent = onboardingLabel;
  if (roleStatus) roleStatus.textContent = roleLabel;
  if (categoryStatus) categoryStatus.textContent = categoryLabel;
  if (providerStatus) providerStatus.textContent = providerLabel;
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
  if (subtitle) {
    const categoryLabel = profile.customerCategory || t('booking.category.default', 'cleaning');
    subtitle.textContent = t('booking.subtitle', 'We’ll keep your {category} booking structured.').replace('{category}', categoryLabel);
  }

  setupSummaryToggle();
  renderDraftPanels();
  setupChatExperience();
  initBookingConfirm();
}

function setupSummaryToggle() {
  const toggle = document.getElementById('toggle-summary');
  const mobileDrawer = document.getElementById('mobile-summary');
  const close = document.getElementById('close-mobile-summary');
  toggle?.addEventListener('click', () => {
    mobileDrawer?.classList.remove('hidden');
    mobileDrawer?.setAttribute('aria-hidden', 'false');
  });
  close?.addEventListener('click', () => {
    mobileDrawer?.classList.add('hidden');
    mobileDrawer?.setAttribute('aria-hidden', 'true');
  });
}

let chatState = { step: 0, started: false, typingNode: null };

function setupChatExperience() {
  const startBtn = document.getElementById('start-booking');
  const chatRegion = document.getElementById('chat-region');
  const emptyState = document.getElementById('chat-empty-state');
  const draft = getBookingDraft();
  const hasProgress = Boolean(draft.address || draft.propertySize || draft.frequency || draft.dateTime || draft.notes || draft.extras.length);

  if (hasProgress) {
    startGuidedChat();
  } else {
    chatRegion?.classList.add('hidden');
    emptyState?.classList.remove('hidden');
  }

  startBtn?.addEventListener('click', () => startGuidedChat());
}

function startGuidedChat() {
  const chatRegion = document.getElementById('chat-region');
  const emptyState = document.getElementById('chat-empty-state');
  chatState = { step: 0, started: true, typingNode: null };
  resetChatStream();
  chatRegion?.classList.remove('hidden');
  emptyState?.classList.add('hidden');
  setComposerPending(false);

  const user = getUser();
  const name = user?.name || t('chat.fallbackName', 'there');
  const steps = getChatSteps();
  const progressLabel = t('chat.stepProgress', 'Step {current}/{total}').replace('{current}', 0).replace('{total}', steps.length);
  const greeting = t('chat.greeting', 'Hi {name}, let’s book your cleaning. I’ll keep this guided.').replace('{name}', name);
  appendAssistant(`<span class=\"badge\">${progressLabel}</span> ${greeting}`);
  presentStep();

  const form = document.getElementById('chat-input');
  if (form && !form.dataset.bound) {
    form.dataset.bound = 'true';
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = document.getElementById('custom-reply');
      if (!input?.value || chatState.typingNode) return;
      const message = input.value.trim();
      if (!message) return;
      setComposerPending(true);
      appendUser(message);
      const draft = setBookingDraft({ notes: `${getBookingDraft().notes ? getBookingDraft().notes + ' ' : ''}${message}`.trim() });
      renderDraftPanels(draft);
      input.value = '';

      const language = getCurrentLanguage();
      console.log('[chat] user message', { message, language });
      const detected = detectIntent(message, language);
      if (detected) console.log('[chat] intent detected', detected);
      if (detected) {
        handleLocalIntent(detected);
        setComposerPending(false);
        return;
      }

      sendMessageToAI(message);
    });
  }
}

function resetChatStream() {
  const stream = document.getElementById('chat-stream');
  if (!stream) return;
  stream.innerHTML = '';
  const intro = document.createElement('div');
  intro.className = 'assistant-bubble';
  intro.innerHTML = `
    <p class="font-semibold text-white">${t('booking.chat.welcome.title', 'Welcome to CleanAI!')}</p>
    <p class="text-sm text-gray-300">${t('booking.chat.welcome.subtitle', 'We’ll keep this structured—reply with quick chips, and we’ll update your booking draft live.')}</p>
    <div class="action-card mt-3 text-sm text-gray-200">
      <div class="flex items-center justify-between">
        <p class="font-semibold text-white">${t('booking.chat.card.title', 'How we keep you on track')}</p>
        <span class="badge badge-emerald">${t('booking.chat.card.badge', 'Live draft')}</span>
      </div>
      <ul class="mt-2 list-disc list-inside text-gray-200/90">
        <li>${t('booking.chat.card.point1', 'Guided prompts for address, size, cadence, and schedule.')}</li>
        <li>${t('booking.chat.card.point2', 'Quick replies mirror chip controls for keyboard users.')}</li>
        <li>${t('booking.chat.card.point3', 'Quote summary updates instantly on the right or in the drawer.')}</li>
      </ul>
    </div>
  `;
  stream.appendChild(intro);
}

function presentStep() {
  const steps = getChatSteps();
  const step = steps[chatState.step];
  if (!step) return;
  const progressLabel = t('chat.stepProgress', 'Step {current}/{total}').replace('{current}', chatState.step + 1).replace('{total}', steps.length);
  appendAssistant(`<span class=\"badge\">${progressLabel}</span> ${step.prompt}`);
  const replies = document.getElementById('quick-replies');
  replies.innerHTML = '';
  step.options.forEach((option) => {
    const label = typeof option === 'function' ? option() : t(option, option);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-reply';
    button.textContent = label;
    button.addEventListener('click', () => handleStepSelection(step, label));
    replies.appendChild(button);
  });

  if (step.key === 'address') {
    const locationBtn = document.createElement('button');
    locationBtn.type = 'button';
    locationBtn.className = 'quick-reply';
    locationBtn.textContent = t('chat.location.useMyLocation', 'Use my location');
    locationBtn.addEventListener('click', () => requestLocationForAddress());
    replies.appendChild(locationBtn);
  }
}

function handleStepSelection(step, value) {
  appendUser(value);
  const draft = getBookingDraft();
  const nextDraft = { ...draft };
  if (step.key === 'extras') {
    nextDraft.extras = value === t('chat.steps.extras.option.none', 'No extras') ? [] : [value];
  } else if (step.key === 'notes') {
    nextDraft.notes = value;
  } else {
    nextDraft[step.key] = value;
  }
  setBookingDraft(nextDraft);
  renderDraftPanels(nextDraft);
  showTypingIndicator();
  setTimeout(() => {
    clearTypingIndicator();
    moveToNextStep();
  }, 450);
}

function moveToNextStep() {
  const steps = getChatSteps();
  if (chatState.step < steps.length - 1) {
    chatState.step += 1;
    presentStep();
  } else {
    appendAssistant(t('chat.complete', 'Thanks! Here is your booking draft. Submit when ready.'));
    injectDraftCard();
    document.getElementById('quick-replies').innerHTML = '';
  }
}

function showTypingIndicator() {
  const stream = document.getElementById('chat-stream');
  if (!stream) return;
  clearTypingIndicator();
  const bubble = document.createElement('div');
  bubble.className = 'typing-bubble';
  bubble.innerHTML = `<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>`;
  stream.appendChild(bubble);
  stream.scrollTop = stream.scrollHeight;
  chatState.typingNode = bubble;
}

function clearTypingIndicator() {
  if (chatState.typingNode?.parentNode) {
    chatState.typingNode.parentNode.removeChild(chatState.typingNode);
  }
  chatState.typingNode = null;
}

function setComposerPending(pending) {
  const input = document.getElementById('custom-reply');
  const button = document.getElementById('send-note');
  const spinner = document.getElementById('send-spinner');
  if (input) input.disabled = pending;
  if (button) button.disabled = pending;
  if (spinner) spinner.classList.toggle('hidden', !pending);
}

function appendAssistant(message) {
  const stream = document.getElementById('chat-stream');
  if (!stream) return;
  const bubble = document.createElement('div');
  bubble.className = 'assistant-bubble';
  bubble.innerHTML = `<p>${message}</p>`;
  stream.appendChild(bubble);
  stream.scrollTop = stream.scrollHeight;
}

function appendIntentFeedback(message) {
  const stream = document.getElementById('chat-stream');
  if (!stream) return;
  const bubble = document.createElement('div');
  bubble.className = 'assistant-bubble intent-feedback';
  bubble.innerHTML = `<p>${message}</p>`;
  stream.appendChild(bubble);
  stream.scrollTop = stream.scrollHeight;
}

async function handleFaqIntent(intent, language) {
  try {
    const langKey = language === 'se' ? 'se' : language === 'sv' ? 'sv' : language;
    const faqModule = await import(`./faq/${langKey}.json`).catch(() => null);
    const svFallback = langKey !== 'sv' ? await import('./faq/sv.json').catch(() => null) : null;
    const seFallback = langKey !== 'se' ? await import('./faq/se.json').catch(() => null) : null;
    const enFallback = langKey !== 'en' ? await import('./faq/en.json') : null;
    const answer =
      faqModule?.default?.[intent] ||
      svFallback?.default?.[intent] ||
      seFallback?.default?.[intent] ||
      enFallback?.default?.[intent];
    clearTypingIndicator();
    appendAssistant(answer || t('chat.intent.generic', 'Got it — handling that now.'));
  } catch (error) {
    console.warn('faq intent load error', error);
    clearTypingIndicator();
    appendAssistant(t('chat.intent.generic', 'Got it — handling that now.'));
  }
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

function handleLocalIntent(detected) {
  const intent = detected.intent;
  const intentMessages = {
    'booking.create': t('chat.intent.bookingCreate', 'Starting your booking details now.'),
    'booking.cancel': t('chat.intent.bookingCancel', 'I’ll guide a cancellation on this draft.'),
    'quote.request': t('chat.intent.quoteRequest', 'Here is a quick price and duration snapshot.'),
    'support.complaint': t('chat.intent.support', 'I’ll log your concern and keep support in the loop.'),
    greet: t('chat.intent.greet', 'Hi there! I can start or update your booking. What do you need?')
  };

  console.log('[chat] handling local intent', intent, detected.match, detected.language);
  appendIntentFeedback(intentMessages[intent] || t('chat.intent.generic', 'Got it — handling that now.'));

  if (intent.startsWith('faq.')) {
    showTypingIndicator();
    handleFaqIntent(intent, detected.language);
    return;
  }

  if (intent === 'booking.create' && !chatState.started) {
    startGuidedChat();
  }

  if (intent === 'booking.cancel') {
    const draft = setBookingDraft({ status: 'cancellation-request' });
    renderDraftPanels(draft);
  }

  if (intent === 'quote.request') {
    const draft = getBookingDraft();
    const estimate = buildEstimate(draft);
    appendAssistant(
      `<strong>${t('booking.summary.price', 'Price estimate:')}</strong> €${estimate.price} · ${estimate.durationLabel}<br>${t('booking.frequency.standard', 'standard rate')}`
    );
  }

  if (intent === 'greet' && !chatState.started) {
    startGuidedChat();
  }
}

function requestLocationForAddress() {
  requestLocationAutofill({
    language: getCurrentLanguage(),
    onAddress: (address) => {
      const draft = setBookingDraft({ address, locationConsent: true });
      renderDraftPanels(draft);
      appendAssistant(t('chat.location.filled', 'Got it — I’ve autofilled your address from your location.'));
      const input = document.getElementById('custom-reply');
      if (input) input.value = address;
    },
    onPolicy: () => {
      const draft = setBookingDraft({ locationConsent: true });
      renderDraftPanels(draft);
    }
  });
}

async function sendMessageToAI(message) {
  showTypingIndicator();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const user = getUser();
    const ctx = {
      userId: user?.email || 'guest',
      sessionId: getAuthToken() || 'anonymous',
      step: chatState.step,
      bookingDraft: getBookingDraft()
    };
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, lang: getCurrentLanguage(), context: ctx }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    clearTypingIndicator();
    appendAssistant(data?.message || t('chat.notes.added', 'Noted. I’ve added this to your booking draft.'));
  } catch (error) {
    console.warn('AI chat send error', error);
    clearTypingIndicator();
    appendAssistant(t('chat.api.error.short', 'We could not reach the AI right now. Staying in the guided flow.'));
  } finally {
    setComposerPending(false);
  }
}

function renderDraftPanels(draftOverride) {
  const draft = draftOverride || getBookingDraft();
  const fields = [
    { label: t('booking.fields.category', 'Category'), value: draft.category || t('booking.fields.category.pending', 'Not set') },
    { label: t('booking.fields.address', 'Address'), value: draft.address || t('booking.fields.address.pending', 'Add address') },
    { label: t('booking.fields.size', 'Size'), value: draft.propertySize || t('booking.fields.size.pending', 'Choose size') },
    { label: t('booking.fields.frequency', 'Frequency'), value: draft.frequency || t('booking.fields.frequency.pending', 'Select cadence') },
    { label: t('booking.fields.schedule', 'Schedule'), value: draft.dateTime || t('booking.fields.schedule.pending', 'Pick a time') },
    { label: t('booking.fields.extras', 'Extras'), value: draft.extras.length ? draft.extras.join(', ') : t('booking.fields.extras.none', 'No extras') },
    { label: t('booking.fields.notes', 'Notes'), value: draft.notes || t('booking.fields.notes.pending', 'Optional notes') }
  ];
  const panels = [
    document.getElementById('draft-fields'),
    document.getElementById('draft-fields-mobile')
  ];

  panels.forEach((panel) => {
    if (!panel) return;
    panel.innerHTML = '';
    fields.forEach((field) => {
      const row = document.createElement('div');
      row.className = 'draft-row';
      row.innerHTML = `<div><p class="text-white">${field.label}</p><p class="text-gray-400">${field.value}</p></div>`;
      panel.appendChild(row);
    });
  });

  const estimate = buildEstimate(draft);
  const estimateTargets = [document.getElementById('summary-estimate'), document.getElementById('summary-estimate-mobile')];
  estimateTargets.forEach((target) => {
    if (!target) return;
    target.innerHTML = `
      <p><strong>${t('booking.summary.duration', 'Duration:')}</strong> ${estimate.durationLabel}</p>
      <p><strong>${t('booking.summary.price', 'Price estimate:')}</strong> €${estimate.price}</p>
      <p class="text-xs text-gray-400">${t('booking.summary.base', 'Base: {hours}h x €{rate}/h · Extras: {extras}h')
        .replace('{hours}', estimate.baseHours)
        .replace('{rate}', estimate.baseRate)
        .replace('{extras}', estimate.extrasHours)}</p>
      <p class="text-xs text-gray-400">${t('booking.summary.repeats', 'Repeats: {frequency}').replace('{frequency}', estimate.frequencyNote)}</p>
    `;
  });

  const policies = document.getElementById('summary-policies');
  if (policies) {
    policies.innerHTML = `
      <p>${t('booking.policy.arrival', 'Arrival window: {value}.').replace('{value}', draft.dateTime || t('booking.fields.schedule.pending', 'Set during chat'))}</p>
      <p>${t('booking.policy.changes', 'Change anytime; a CleanAI coordinator confirms before charging.')}</p>
      <p>${t('booking.policy.verified', 'We pair you with verified cleaners. Reschedule up to 24h in advance.')}</p>
      ${draft.locationConsent ? `<p>${t('booking.policy.location', 'User allowed location access to autofill address.')}</p>` : ''}
    `;
  }

  const segment = document.getElementById('summary-segment');
  if (segment) segment.textContent = draft.category ? `${draft.category} ${t('booking.fields.segment', 'segment')}` : t('booking.fields.segment.pending', 'Segment pending');

  const status = document.getElementById('draft-status');
  if (status) status.textContent = draft.status === 'submitted' ? t('status.submitted', 'Submitted') : t('status.draft', 'Draft');
}

function injectDraftCard() {
  const stream = document.getElementById('chat-stream');
  const draft = getBookingDraft();
  if (!stream) return;
  const estimate = buildEstimate(draft);
  const card = document.createElement('div');
  card.className = 'quote-card';
  card.innerHTML = `
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-gray-400">${t('booking.summary.title', 'Booking Draft')}</p>
        <p class="text-lg font-semibold text-white">${draft.category || t('booking.category.default', 'Cleaning')} ${t('booking.quote', 'quote')}</p>
      </div>
      <span class="pill">${t('status.draft', 'Draft')}</span>
    </div>
    <div class="mt-3 space-y-2 text-sm text-gray-300">
      <p><strong>${t('booking.fields.address', 'Address')}:</strong> ${draft.address || t('status.pending', 'Pending')}</p>
      <p><strong>${t('booking.fields.size', 'Size')}:</strong> ${draft.propertySize || t('status.pending', 'Pending')}</p>
      <p><strong>${t('booking.fields.frequency', 'Frequency')}:</strong> ${draft.frequency || t('status.pending', 'Pending')}</p>
      <p><strong>${t('booking.fields.schedule', 'Schedule')}:</strong> ${draft.dateTime || t('status.pending', 'Pending')}</p>
      <p><strong>${t('booking.fields.extras', 'Extras')}:</strong> ${draft.extras.length ? draft.extras.join(', ') : t('booking.fields.extras.none', 'None')}</p>
      <p><strong>${t('booking.fields.notes', 'Notes')}:</strong> ${draft.notes || '—'}</p>
    </div>
    <div class="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-black/20 p-3 text-sm text-gray-200 sm:grid-cols-2">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-gray-400">${t('booking.summary.durationLabel', 'Duration')}</p>
        <p class="font-semibold text-white">${estimate.durationLabel}</p>
      </div>
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-gray-400">${t('booking.summary.priceLabel', 'Est. price')}</p>
        <p class="font-semibold text-white">€${estimate.price}</p>
        <p class="text-xs text-gray-400">${estimate.frequencyNote}</p>
      </div>
    </div>
    <div class="action-card mt-3 text-sm text-gray-200">
      <p class="font-semibold text-white">${t('booking.nextSteps.title', 'Next steps')}</p>
      <ul class="mt-1 list-disc list-inside text-gray-200/80">
        <li>${t('booking.nextSteps.summary', 'Review the summary card on the right or open the drawer on mobile.')}</li>
        <li>${t('booking.nextSteps.submit', 'Tap Submit to send the draft. We’ll ping the AI endpoint if reachable.')}</li>
      </ul>
    </div>
  `;
  stream.appendChild(card);
  stream.scrollTop = stream.scrollHeight;
}

function buildEstimate(draft) {
  const sizeHours = {
    'Studio or 1 bedroom': 2,
    '2-3 bedrooms': 3,
    '4+ bedrooms / large office': 4,
    'Over 200 sqm': 5
  };
  const baseHours = sizeHours[draft.propertySize] || 2;
  const extrasHours = draft.extras.length ? draft.extras.length * 0.5 : 0;
  const totalHours = baseHours + extrasHours;
  const baseRate = 45;
  const subtotal = totalHours * baseRate;
  let discount = 0;
  if (draft.frequency === 'Weekly') discount = 0.1;
  else if (draft.frequency === 'Every 2 weeks') discount = 0.05;
  else if (draft.frequency === 'Monthly') discount = 0.03;
  const price = Math.max(60, Math.round(subtotal * (1 - discount)));
  const frequencyNote =
    discount > 0
      ? t('booking.frequency.discount', '{discount}% repeat discount').replace('{discount}', Math.round(discount * 100))
      : t('booking.frequency.standard', 'standard rate');
  return {
    durationLabel: t('booking.duration.estimate', '{hours} hours est.').replace('{hours}', totalHours.toFixed(1)),
    price,
    baseRate,
    frequencyNote,
    baseHours: baseHours.toFixed(1),
    extrasHours: extrasHours.toFixed(1),
    discount
  };
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
      confirmButtons.forEach((button) => button && (button.disabled = true));
      setBookingDraft({ status: 'submitted' });
      feedbackEls.forEach((el) => el && (el.textContent = t('booking.feedback.submitted', 'Submitted draft. Awaiting confirmation.')));
      await safeChatPing();
      injectDraftCard();
      renderDraftPanels();
      confirmButtons.forEach((button) => button && (button.disabled = false));
    });
  });
}

async function safeChatPing() {
  showTypingIndicator();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: t('chat.api.submit', 'Booking submitted'), lang: getCurrentLanguage() }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    await response.json();
    clearTypingIndicator();
    appendAssistant(t('chat.api.success', 'AI assistant acknowledged your booking.'));
  } catch (error) {
    console.warn('AI chat error', error);
    clearTypingIndicator();
    appendAssistant(t('chat.api.error', 'We could not reach the AI right now. Continuing with the guided draft.'));
    appendRetryCard();
  }
}

function appendRetryCard() {
  const stream = document.getElementById('chat-stream');
  if (!stream) return;
  const card = document.createElement('div');
  card.className = 'assistant-bubble';
  card.innerHTML = `
    <p class="text-sm text-gray-200">${t('chat.api.retry.title', 'Retry AI acknowledgement?')}</p>
    <button type="button" class="btn-ghost mt-2 w-full rounded-xl text-sm font-semibold" id="retry-chat">${t('chat.api.retry.cta', 'Retry now')}</button>
  `;
  stream.appendChild(card);
  stream.scrollTop = stream.scrollHeight;
  card.querySelector('#retry-chat')?.addEventListener('click', () => {
    card.remove();
    safeChatPing();
  });
}

function initProviderOnboarding() {
  if (!requireAuth()) return;
  if (!requireRole('provider')) return;
  attachLogout();

  const profile = getProfile();
  const steps = ['basics', 'availability', 'pricing', 'verification', 'profile'];
  let currentStep = 0;
  const form = document.getElementById('provider-form');
  const progressBar = document.getElementById('provider-progress-bar');
  const progressLabel = document.getElementById('provider-progress-label');
  const providerStatusEl = document.getElementById('provider-status');
  const providerBadge = document.getElementById('provider-badge');
  const providerFeedback = document.getElementById('provider-feedback');
  const providerError = document.getElementById('provider-error');

  if (providerStatusEl) providerStatusEl.textContent = profile.providerStatus || t('status.draft', 'Draft');
  if (providerBadge) providerBadge.textContent = profile.providerStatus || t('status.draft', 'Draft');

  restoreProviderForm(profile.providerData || {});
  updateStep();

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
    providerFeedback.textContent = t('provider.feedback.draft', 'Draft saved locally. Resume anytime.');
    providerStatusEl.textContent = t('status.draft', 'Draft');
    providerBadge.textContent = t('status.draft', 'Draft');
  });

  document.getElementById('submit-provider')?.addEventListener('click', () => {
    const data = collectProviderData(form);
    setProfile({ providerData: data, providerStatus: 'pending', onboardingComplete: true });
    providerFeedback.textContent = t('provider.feedback.submitted', 'Submitted for review. Feed remains locked until approved.');
    providerStatusEl.textContent = t('provider.status.pendingReview', 'Pending review');
    providerBadge.textContent = t('status.pending', 'Pending');
  });

  function updateStep() {
    const active = steps[currentStep];
    form.querySelectorAll('.step-card').forEach((card) => {
      card.classList.toggle('hidden', card.dataset.step !== active);
    });
    const progress = Math.round(((currentStep + 1) / steps.length) * 100);
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressLabel) progressLabel.textContent = `Step ${currentStep + 1} of ${steps.length}`;
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
      errorEl.textContent = t('provider.error.serviceArea', 'Add a service area to continue.');
      return false;
    }
  }
  if (step === 'pricing') {
    if (!data.hourlyRate) {
      errorEl.textContent = t('provider.error.hourlyRate', 'Share an hourly rate to continue.');
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
  const statusLabel = profile.providerStatus ? t(`status.${profile.providerStatus}`, profile.providerStatus) : t('status.pending', 'Pending');
  badge.textContent = approved ? t('status.approved', 'Approved') : statusLabel;

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

  markApproved?.addEventListener('click', () => {
    setProfile({ providerStatus: 'approved' });
    badge.textContent = t('status.approved', 'Approved');
    locked?.classList.add('hidden');
    renderFeed(list);
  });
}

function renderFeed(container) {
  if (!container) return;
  container.innerHTML = '';
  const items = [
    { title: 'Weekly home clean', location: 'Berlin-Mitte', budget: '€120', start: 'Tue · 09:00' },
    { title: 'Office refresh', location: 'Amsterdam Zuid', budget: '€220', start: 'Wed · 18:00' },
    { title: 'Hotel turnover', location: 'Lisbon', budget: '€180', start: 'Fri · 14:00' }
  ];
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'surface-card rounded-2xl p-4 text-sm';
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <p class="text-white font-semibold">${item.title}</p>
        <span class="pill">${item.budget}</span>
      </div>
      <p class="text-gray-300">${item.location}</p>
      <p class="text-gray-400 text-xs">${item.start}</p>
      <p class="mt-2 text-emerald-200 text-xs">${t('provider.feed.lockedHint', 'Visible only after approval')}</p>
    `;
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
  const locationInput = form?.querySelector('input[name=\"location\"]');
  if (savedLocation && locationInput) {
    locationInput.value = savedLocation;
  } else if (locationInput) {
    attachLandingLocationAutofill();
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
      if (errorEl) errorEl.textContent = t('landing.error.location', 'Add your ZIP or city to get availability.');
      return;
    }
    if (!activeSegment) {
      if (errorEl) errorEl.textContent = t('landing.error.segment', 'Choose Home, Office, or Hotel to continue.');
      return;
    }
    sessionStorage.setItem(sessionKeys.landingLocation, location);
    sessionStorage.setItem(sessionKeys.landingSegment, activeSegment);
    sessionStorage.setItem(sessionKeys.rolePreference, 'customer');
    window.location.href = '/register.html';
  });
}

function refreshLanguage(page) {
  applyTranslations();
  bindLanguageLauncher();
  if (getAuthToken()) {
    const profile = getProfile();
    if (profile.language !== getCurrentLanguage()) {
      setProfile({ language: getCurrentLanguage() });
    }
  }
  if (page === 'book') {
    const profile = getProfile();
    const subtitle = document.getElementById('booking-subtitle');
    if (subtitle) {
      const categoryLabel = profile.customerCategory || t('booking.category.default', 'cleaning');
      subtitle.textContent = t('booking.subtitle', 'We’ll keep your {category} booking structured.').replace('{category}', categoryLabel);
    }
    renderDraftPanels();
    if (chatState.started) {
      startGuidedChat();
    } else {
      resetChatStream();
    }
  }
  if (page === 'onboarding') {
    const onboardingStatus = document.getElementById('onboarding-status');
    const roleStatus = document.getElementById('role-status');
    const categoryStatus = document.getElementById('category-status');
    const providerStatus = document.getElementById('provider-status');
    updateOnboardingBadges(getProfile(), { onboardingStatus, roleStatus, categoryStatus, providerStatus });
  }
  if (page === 'provider-feed') {
    const list = document.getElementById('feed-list');
    if (list) renderFeed(list);
    const badge = document.getElementById('feed-status');
    if (badge) badge.textContent = getProfile().providerStatus || t('status.pending', 'Pending');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;
  await initI18n();
  bindLanguageLauncher();
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
  refreshLanguage(page);
  onLanguageChange(() => refreshLanguage(page));
});
