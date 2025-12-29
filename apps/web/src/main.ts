import './main.css';

type ChatResponse = {
  ok: boolean;
  sessionId: string;
  message: { role: 'assistant'; text: string };
  quickReplies?: { id: string; label: string; value: string }[];
  nav?: { label: string; href: string }[];
  error?: { code: string; message: string };
};

const TOKEN_TTL_MS = 1000 * 60 * 60 * 8;
const STORAGE_KEYS = {
  auth: 'cleanai_auth_token',
  booking: 'cleanai_booking_draft',
  provider: 'cleanai_provider_wizard',
  chatSession: 'cleanai_chat_session'
};
const demoMode = Boolean(import.meta.env.VITE_DEMO_MODE);

type AuthRecord = { value: string; expiresAt: number };
type BookingDraft = {
  address: string;
  size: string;
  frequency: string;
  dateTime: string;
  notes: string;
};

type ProviderData = {
  type: 'individual' | 'company';
  serviceArea: string;
  weekdays: string;
  weekends: string;
  hourlyRate: string;
  calloutFee: string;
  bio: string;
};

type ProviderState = { step: number; data: ProviderData; feedback: string };

const defaultDraft: BookingDraft = { address: '', size: '', frequency: '', dateTime: '', notes: '' };
const defaultProvider: ProviderData = {
  type: 'individual',
  serviceArea: '',
  weekdays: '',
  weekends: '',
  hourlyRate: '',
  calloutFee: '',
  bio: ''
};

let bookingDraft: BookingDraft = readJSON(STORAGE_KEYS.booking, defaultDraft);
let assistantMessage = 'Assistant will respond here.';
let quickReplies: NonNullable<ChatResponse['quickReplies']> = [];
let navLinks: NonNullable<ChatResponse['nav']> = [];
let drawerOpen = false;
let chatSession: string | null = readJSON(STORAGE_KEYS.chatSession, null);
let providerState: ProviderState = readJSON(STORAGE_KEYS.provider, { step: 0, data: defaultProvider, feedback: '' });
let authToken: string | null = null;
let authMessage = '';
let errorBanner = '';
let providerSaveTimer: number | null = null;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.warn('Failed to parse storage', error);
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createEl<K extends keyof HTMLElementTagNameMap>(tag: K, options?: { classes?: string; text?: string }) {
  const el = document.createElement(tag);
  if (options?.classes) el.className = options.classes;
  if (options?.text) el.textContent = options.text;
  return el;
}

function debounceSaveProvider() {
  if (providerSaveTimer) window.clearTimeout(providerSaveTimer);
  providerSaveTimer = window.setTimeout(() => {
    saveJSON(STORAGE_KEYS.provider, providerState);
    providerState = { ...providerState, feedback: 'Saved locally.' };
    rerender();
  }, 300);
}

function checkAuth() {
  const stored = readJSON<AuthRecord | null>(STORAGE_KEYS.auth, null);
  if (stored?.expiresAt && stored.expiresAt < Date.now()) {
    localStorage.removeItem(STORAGE_KEYS.auth);
    authToken = null;
    authMessage = 'Session expired. Please sign in again.';
    return;
  }
  if (stored?.value) {
    authToken = stored.value;
  }
}

function setAuthToken() {
  const value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
  const auth: AuthRecord = { value, expiresAt: Date.now() + TOKEN_TTL_MS };
  saveJSON(STORAGE_KEYS.auth, auth);
  authToken = value;
  authMessage = '';
}

function clearSession() {
  authToken = null;
  localStorage.removeItem(STORAGE_KEYS.auth);
  localStorage.removeItem(STORAGE_KEYS.booking);
  localStorage.removeItem(STORAGE_KEYS.chatSession);
}

async function sendChat(text: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: chatSession,
        messages: [{ role: 'user', text }]
      }),
      signal: controller.signal
    });
    window.clearTimeout(timeout);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = (await response.json()) as ChatResponse;
    if (!data.ok || !data.sessionId || !data.message?.text) throw new Error(data.error?.message || 'Invalid response');
    chatSession = data.sessionId;
    saveJSON(STORAGE_KEYS.chatSession, chatSession);
    assistantMessage = data.message.text;
    quickReplies = data.quickReplies || [];
    navLinks = data.nav || [];
  } catch (error) {
    console.error('chat error', error);
    assistantMessage = 'Unable to reach assistant. Please retry soon.';
  }
  rerender();
}

function renderLogin(root: HTMLElement) {
  const card = createEl('div', { classes: 'card stack' });
  card.appendChild(createEl('h2', { text: 'Sign in' }));
  if (authMessage) {
    card.appendChild(createEl('p', { classes: 'helper-text', text: authMessage }));
  }
  card.appendChild(createEl('p', { classes: 'helper-text', text: 'Token expires after 8 hours.' }));
  const button = createEl('button', { classes: 'primary-btn', text: 'Generate session' });
  button.onclick = () => {
    setAuthToken();
    rerender();
  };
  card.appendChild(button);
  root.appendChild(card);
}

function renderBooking(root: HTMLElement) {
  const card = createEl('div', { classes: 'card stack' });
  const headerRow = createEl('div', { classes: 'row' });
  headerRow.style.justifyContent = 'space-between';
  headerRow.style.alignItems = 'center';
  const heading = createEl('div');
  heading.appendChild(createEl('p', { classes: 'helper-text', text: 'Booking' }));
  heading.appendChild(createEl('h2', { text: 'Chat-first draft' }));
  headerRow.appendChild(heading);
  const summaryBtn = createEl('button', { classes: 'secondary-btn', text: 'View summary' });
  summaryBtn.onclick = () => {
    drawerOpen = true;
    rerender();
  };
  headerRow.appendChild(summaryBtn);
  card.appendChild(headerRow);

  const form = createEl('form', { classes: 'stack' });
  form.onsubmit = (event) => {
    event.preventDefault();
    if (!canSubmit()) return;
    const text = `Booking draft submitted for ${bookingDraft.address}, ${bookingDraft.size}, ${bookingDraft.frequency} at ${bookingDraft.dateTime}.`;
    sendChat(text);
  };

  form.appendChild(buildInput('Address', 'address', bookingDraft.address, (value) => updateDraft('address', value)));
  form.appendChild(buildSelect('Size', 'size', bookingDraft.size, ['Small', 'Medium', 'Large'], (value) => updateDraft('size', value)));
  form.appendChild(buildSelect('Frequency', 'frequency', bookingDraft.frequency, ['One-time', 'Weekly', 'Monthly'], (value) => updateDraft('frequency', value)));
  form.appendChild(buildInput('Schedule', 'dateTime', bookingDraft.dateTime, (value) => updateDraft('dateTime', value), 'text'));
  form.appendChild(buildTextarea('Notes', bookingDraft.notes, (value) => updateDraft('notes', value)));

  form.appendChild(createEl('div', { classes: 'helper-text', text: `Assistant: ${assistantMessage}` }));
  const repliesRow = createEl('div', { classes: 'row' });
  quickReplies.forEach((reply) => {
    const btn = createEl('button', { classes: 'secondary-btn', text: reply.label });
    btn.type = 'button';
    btn.onclick = () => {
      assistantMessage = `You selected: ${reply.value || reply.label}`;
      sendChat(reply.value || reply.label);
    };
    repliesRow.appendChild(btn);
  });
  navLinks.forEach((link) => {
    const btn = createEl('button', { classes: 'secondary-btn', text: link.label });
    btn.type = 'button';
    btn.onclick = () => {
      window.location.href = link.href;
    };
    repliesRow.appendChild(btn);
  });
  form.appendChild(repliesRow);

  const submit = createEl('button', { classes: 'primary-btn', text: 'Submit booking' });
  submit.type = 'submit';
  submit.disabled = !canSubmit();
  if (!canSubmit()) submit.setAttribute('aria-disabled', 'true');
  form.appendChild(submit);
  if (!canSubmit()) {
    form.appendChild(createEl('p', { classes: 'helper-text', text: 'Fill address, size, frequency, and schedule to enable submit.' }));
  }

  card.appendChild(form);
  root.appendChild(card);

  if (drawerOpen) {
    renderDrawer(root);
  }
}

function renderDrawer(root: HTMLElement) {
  const backdrop = createEl('div', { classes: 'drawer-backdrop' });
  const panel = createEl('div', { classes: 'drawer-panel' });
  const header = createEl('div', { classes: 'row' });
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.appendChild(createEl('h3', { text: 'Booking summary' }));
  const close = createEl('button', { classes: 'secondary-btn', text: 'Close' });
  close.onclick = () => {
    drawerOpen = false;
    rerender();
  };
  header.appendChild(close);
  panel.appendChild(header);

  const content = createEl('div', { classes: 'stack' });
  content.appendChild(summaryRow('Address', bookingDraft.address || 'Add address'));
  content.appendChild(summaryRow('Size', bookingDraft.size || 'Add size'));
  content.appendChild(summaryRow('Frequency', bookingDraft.frequency || 'Select frequency'));
  content.appendChild(summaryRow('Schedule', bookingDraft.dateTime || 'Pick a time'));
  content.appendChild(summaryRow('Notes', bookingDraft.notes || 'Optional'));
  panel.appendChild(content);

  backdrop.onclick = (event) => {
    if (event.target === event.currentTarget) {
      drawerOpen = false;
      rerender();
    }
  };
  backdrop.appendChild(panel);
  root.appendChild(backdrop);

  const escHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      drawerOpen = false;
      rerender();
    }
  };
  window.addEventListener('keydown', escHandler, { once: true });
}

function summaryRow(label: string, value: string) {
  const row = createEl('div', { classes: 'row' });
  row.appendChild(createEl('strong', { text: `${label}: ` }));
  row.appendChild(createEl('span', { text: value }));
  return row;
}

function buildInput(label: string, name: keyof BookingDraft, value: string, onChange: (value: string) => void, type: string = 'text') {
  const wrapper = createEl('label');
  wrapper.textContent = label;
  const input = createEl('input');
  input.type = type;
  input.value = value;
  input.oninput = (e) => onChange((e.target as HTMLInputElement).value);
  wrapper.appendChild(input);
  return wrapper;
}

function buildSelect(label: string, name: keyof BookingDraft, value: string, options: string[], onChange: (value: string) => void) {
  const wrapper = createEl('label');
  wrapper.textContent = label;
  const select = createEl('select');
  const blank = createEl('option');
  blank.value = '';
  blank.textContent = 'Select';
  select.appendChild(blank);
  options.forEach((opt) => {
    const option = createEl('option');
    option.value = opt;
    option.textContent = opt;
    select.appendChild(option);
  });
  select.value = value;
  select.onchange = (e) => onChange((e.target as HTMLSelectElement).value);
  wrapper.appendChild(select);
  return wrapper;
}

function buildTextarea(label: string, value: string, onChange: (value: string) => void) {
  const wrapper = createEl('label');
  wrapper.textContent = label;
  const textarea = createEl('textarea');
  textarea.rows = 2;
  textarea.value = value;
  textarea.oninput = (e) => onChange((e.target as HTMLTextAreaElement).value);
  wrapper.appendChild(textarea);
  return wrapper;
}

function updateDraft(key: keyof BookingDraft, value: string) {
  bookingDraft = { ...bookingDraft, [key]: value };
  saveJSON(STORAGE_KEYS.booking, bookingDraft);
  rerender();
}

function canSubmit() {
  return Boolean(bookingDraft.address && bookingDraft.size && bookingDraft.frequency && bookingDraft.dateTime);
}

function renderProvider(root: HTMLElement) {
  const card = createEl('div', { classes: 'card stack' });
  const header = createEl('div', { classes: 'row' });
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.appendChild(createEl('div', { text: `Provider onboarding — Step ${providerState.step + 1} of 3` }));
  const badge = createEl('span', { classes: 'badge', text: providerState.feedback || 'Progress saved' });
  header.appendChild(badge);
  card.appendChild(header);

  if (providerState.step === 0) {
    card.appendChild(buildProviderInput('Type', providerState.data.type, (value) => updateProvider('type', value as ProviderData['type']), 'select', ['individual', 'company']));
    card.appendChild(buildProviderInput('Service area', providerState.data.serviceArea, (value) => updateProvider('serviceArea', value)));
  } else if (providerState.step === 1) {
    card.appendChild(buildProviderInput('Weekdays', providerState.data.weekdays, (value) => updateProvider('weekdays', value)));
    card.appendChild(buildProviderInput('Weekends', providerState.data.weekends, (value) => updateProvider('weekends', value)));
  } else {
    card.appendChild(buildProviderInput('Hourly rate', providerState.data.hourlyRate, (value) => updateProvider('hourlyRate', value), 'number'));
    card.appendChild(buildProviderInput('Call-out fee', providerState.data.calloutFee, (value) => updateProvider('calloutFee', value), 'number'));
    card.appendChild(buildProviderTextarea('Bio', providerState.data.bio, (value) => updateProvider('bio', value)));
  }

  const actions = createEl('div', { classes: 'row' });
  actions.style.justifyContent = 'space-between';
  const back = createEl('button', { classes: 'secondary-btn', text: 'Back' });
  back.disabled = providerState.step === 0;
  back.onclick = () => {
    providerState = { ...providerState, step: Math.max(providerState.step - 1, 0) };
    rerender();
  };
  actions.appendChild(back);

  const rightActions = createEl('div', { classes: 'row' });
  const saveBtn = createEl('button', { classes: 'secondary-btn', text: 'Save draft' });
  saveBtn.onclick = () => {
    providerState = { ...providerState, feedback: 'Draft saved locally.' };
    saveJSON(STORAGE_KEYS.provider, providerState);
    rerender();
  };
  rightActions.appendChild(saveBtn);
  const next = createEl('button', { classes: 'primary-btn', text: providerState.step === 2 ? 'Finish' : 'Next' });
  next.onclick = () => {
    if (!validateProviderStep()) return;
    providerState = { ...providerState, step: Math.min(providerState.step + 1, 2), feedback: '' };
    saveJSON(STORAGE_KEYS.provider, providerState);
    rerender();
  };
  rightActions.appendChild(next);
  actions.appendChild(rightActions);
  card.appendChild(actions);

  const feedback = createEl('p', { classes: 'helper-text', text: providerState.feedback });
  card.appendChild(feedback);

  if (demoMode) {
    const demoBtn = createEl('button', { classes: 'secondary-btn', text: 'Demo: mark approved' });
    demoBtn.onclick = () => {
      providerState = { ...providerState, feedback: 'Marked approved (demo).' };
      rerender();
    };
    card.appendChild(demoBtn);
  } else {
    card.appendChild(createEl('p', { classes: 'helper-text', text: 'Demo controls hidden (production mode).' }));
  }

  root.appendChild(card);
}

function buildProviderInput(label: string, value: string, onChange: (value: string) => void, type: 'text' | 'number' | 'select' = 'text', options: string[] = []) {
  const wrapper = createEl('label');
  wrapper.textContent = label;
  if (type === 'select') {
    const select = createEl('select');
    options.forEach((opt) => {
      const option = createEl('option');
      option.value = opt;
      option.textContent = opt;
      select.appendChild(option);
    });
    select.value = value;
    select.onchange = (e) => onChange((e.target as HTMLSelectElement).value);
    wrapper.appendChild(select);
  } else {
    const input = createEl('input');
    input.type = type;
    input.value = value;
    input.oninput = (e) => onChange((e.target as HTMLInputElement).value);
    wrapper.appendChild(input);
  }
  return wrapper;
}

function buildProviderTextarea(label: string, value: string, onChange: (value: string) => void) {
  const wrapper = createEl('label');
  wrapper.textContent = label;
  const textarea = createEl('textarea');
  textarea.rows = 2;
  textarea.value = value;
  textarea.oninput = (e) => onChange((e.target as HTMLTextAreaElement).value);
  wrapper.appendChild(textarea);
  return wrapper;
}

function updateProvider(key: keyof ProviderData, value: string) {
  providerState = { ...providerState, data: { ...providerState.data, [key]: value }, feedback: '' };
  debounceSaveProvider();
  rerender();
}

function validateProviderStep() {
  if (providerState.step === 0 && !providerState.data.serviceArea) {
    providerState = { ...providerState, feedback: 'Add a service area to continue.' };
    rerender();
    return false;
  }
  if (providerState.step === 2 && !providerState.data.hourlyRate) {
    providerState = { ...providerState, feedback: 'Add an hourly rate to continue.' };
    rerender();
    return false;
  }
  return true;
}

function renderApp() {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = '';

  if (!authToken) {
    renderLogin(root);
    return;
  }

  if (errorBanner) {
    const banner = createEl('div', { classes: 'error-banner', text: errorBanner });
    root.appendChild(banner);
  }

  const shell = createEl('div', { classes: 'app-shell stack' });
  const header = createEl('div', { classes: 'row' });
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.appendChild(createEl('h1', { text: 'CleanAI workspace' }));
  const sessionRow = createEl('div', { classes: 'row' });
  sessionRow.style.alignItems = 'center';
  sessionRow.appendChild(createEl('span', { classes: 'badge', text: 'Session active' }));
  const logoutBtn = createEl('button', { classes: 'secondary-btn', text: 'Logout' });
  logoutBtn.onclick = () => {
    clearSession();
    rerender();
  };
  sessionRow.appendChild(logoutBtn);
  header.appendChild(sessionRow);
  shell.appendChild(header);

  renderBooking(shell);
  renderProvider(shell);
  root.appendChild(shell);
}

function rerender() {
  renderApp();
}

function registerErrorBoundary() {
  window.addEventListener('error', (event) => {
    console.error('Error boundary', event.error || event.message);
    errorBanner = 'Something went wrong. Please refresh and try again.';
    rerender();
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection', event.reason);
    errorBanner = 'Unexpected issue occurred. Please retry your last action.';
    rerender();
  });
}

function init() {
  checkAuth();
  registerErrorBoundary();
  renderApp();
}

init();
