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
  providerData: {}
};

const defaultBookingDraft = {
  status: 'draft',
  category: null,
  address: '',
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
  return `${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`;
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
  const name = user?.name || 'there';
  appendAssistant(`<span class="badge">Step 0/${chatSteps.length}</span> Hi ${name}, let’s book your cleaning. I’ll keep this guided.`);
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
      showTypingIndicator();
      setTimeout(() => {
        clearTypingIndicator();
        appendAssistant('Noted. I’ve added this to your booking draft.');
        setComposerPending(false);
      }, 450);
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
    <p class="font-semibold text-white">Welcome to CleanAI!</p>
    <p class="text-sm text-gray-300">We’ll keep this structured—reply with quick chips, and we’ll update your booking draft live.</p>
    <div class="action-card mt-3 text-sm text-gray-200">
      <div class="flex items-center justify-between">
        <p class="font-semibold text-white">How we keep you on track</p>
        <span class="badge badge-emerald">Live draft</span>
      </div>
      <ul class="mt-2 list-disc list-inside text-gray-200/90">
        <li>Guided prompts for address, size, cadence, and schedule.</li>
        <li>Quick replies mirror chip controls for keyboard users.</li>
        <li>Quote summary updates instantly on the right or in the drawer.</li>
      </ul>
    </div>
  `;
  stream.appendChild(intro);
}

function presentStep() {
  const step = chatSteps[chatState.step];
  if (!step) return;
  const progressLabel = `Step ${chatState.step + 1}/${chatSteps.length}`;
  appendAssistant(`<span class="badge">${progressLabel}</span> ${step.prompt}`);
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
  showTypingIndicator();
  setTimeout(() => {
    clearTypingIndicator();
    moveToNextStep();
  }, 450);
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
      <p><strong>Duration:</strong> ${estimate.durationLabel}</p>
      <p><strong>Price estimate:</strong> €${estimate.price}</p>
      <p class="text-xs text-gray-400">Base: ${estimate.baseHours}h x €${estimate.baseRate}/h · Extras: ${estimate.extrasHours}h</p>
      <p class="text-xs text-gray-400">Repeats: ${estimate.frequencyNote}</p>
    `;
  });

  const policies = document.getElementById('summary-policies');
  if (policies) {
    policies.innerHTML = `
      <p>Arrival window: ${draft.dateTime || 'Set during chat'}.</p>
      <p>Change anytime; a CleanAI coordinator confirms before charging.</p>
      <p>We pair you with verified cleaners. Reschedule up to 24h in advance.</p>
    `;
  }

  const segment = document.getElementById('summary-segment');
  if (segment) segment.textContent = draft.category ? `${draft.category} segment` : 'Segment pending';

  const status = document.getElementById('draft-status');
  if (status) status.textContent = draft.status === 'submitted' ? 'Submitted' : 'Draft';
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
        <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Booking Draft</p>
        <p class="text-lg font-semibold text-white">${draft.category || 'Cleaning'} quote</p>
      </div>
      <span class="pill">Draft</span>
    </div>
    <div class="mt-3 space-y-2 text-sm text-gray-300">
      <p><strong>Address:</strong> ${draft.address || 'Pending'}</p>
      <p><strong>Size:</strong> ${draft.propertySize || 'Pending'}</p>
      <p><strong>Frequency:</strong> ${draft.frequency || 'Pending'}</p>
      <p><strong>Schedule:</strong> ${draft.dateTime || 'Pending'}</p>
      <p><strong>Extras:</strong> ${draft.extras.length ? draft.extras.join(', ') : 'None'}</p>
      <p><strong>Notes:</strong> ${draft.notes || '—'}</p>
    </div>
    <div class="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-black/20 p-3 text-sm text-gray-200 sm:grid-cols-2">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Duration</p>
        <p class="font-semibold text-white">${estimate.durationLabel}</p>
      </div>
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Est. price</p>
        <p class="font-semibold text-white">€${estimate.price}</p>
        <p class="text-xs text-gray-400">${estimate.frequencyNote}</p>
      </div>
    </div>
    <div class="action-card mt-3 text-sm text-gray-200">
      <p class="font-semibold text-white">Next steps</p>
      <ul class="mt-1 list-disc list-inside text-gray-200/80">
        <li>Review the summary card on the right or open the drawer on mobile.</li>
        <li>Tap Submit to send the draft. We’ll ping the AI endpoint if reachable.</li>
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
  const frequencyNote = discount > 0 ? `${Math.round(discount * 100)}% repeat discount` : 'standard rate';
  return {
    durationLabel: `${totalHours.toFixed(1)} hours est.`,
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
      feedbackEls.forEach((el) => el && (el.textContent = 'Submitted draft. Awaiting confirmation.'));
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
      body: JSON.stringify({ message: 'Booking submitted' }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    await response.json();
    clearTypingIndicator();
    appendAssistant('AI assistant acknowledged your booking.');
  } catch (error) {
    console.warn('AI chat error', error);
    clearTypingIndicator();
    appendAssistant('We could not reach the AI right now. Continuing with the guided draft.');
    appendRetryCard();
  }
}

function appendRetryCard() {
  const stream = document.getElementById('chat-stream');
  if (!stream) return;
  const card = document.createElement('div');
  card.className = 'assistant-bubble';
  card.innerHTML = `
    <p class="text-sm text-gray-200">Retry AI acknowledgement?</p>
    <button type="button" class="btn-ghost mt-2 w-full rounded-xl text-sm font-semibold" id="retry-chat">Retry now</button>
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

  if (providerStatusEl) providerStatusEl.textContent = profile.providerStatus || 'Draft';
  if (providerBadge) providerBadge.textContent = profile.providerStatus || 'Draft';

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
    providerFeedback.textContent = 'Draft saved locally. Resume anytime.';
    providerStatusEl.textContent = 'Draft';
    providerBadge.textContent = 'Draft';
  });

  document.getElementById('submit-provider')?.addEventListener('click', () => {
    const data = collectProviderData(form);
    setProfile({ providerData: data, providerStatus: 'pending', onboardingComplete: true });
    providerFeedback.textContent = 'Submitted for review. Feed remains locked until approved.';
    providerStatusEl.textContent = 'Pending review';
    providerBadge.textContent = 'Pending';
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

  markApproved?.addEventListener('click', () => {
    setProfile({ providerStatus: 'approved' });
    badge.textContent = 'Approved';
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
      <p class="mt-2 text-emerald-200 text-xs">Visible only after approval</p>
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
