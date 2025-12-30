import { bindThemeToggle, initTheme } from '../scripts/theme.js';
import { setLanguage } from '../scripts/i18n.js';
import { exchangeCodeForSession, getSession, signOut, updateUserMetadata } from '../lib/auth.ts';
import {
  AvailabilityException,
  AvailabilityRule,
  Booking,
  ChatMessage,
  ChatThread,
  CustomerRequest,
  Proposal,
  ProviderProfile,
  confirmBooking,
  createCustomerRequest,
  createThread,
  fetchMessages,
  fetchProviderProfile,
  fetchRequestWithProposals,
  fetchThread,
  listOpenRequests,
  saveAvailabilityException,
  saveAvailabilityRule,
  sendMessage,
  submitProposal,
  subscribeToMessages,
  updateRequestStatus,
  upsertProviderProfile
} from '../lib/data.ts';

let currentSession: any = null;
let messageSubscription: any = null;
const envOk = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
let lastError = '';
let lastSessionEmail = '';

function parseRoute() {
  const hash = window.location.hash || '#/onboarding';
  const [path, queryString] = hash.slice(1).split('?');
  const params = new URLSearchParams(queryString || '');
  return { path: `/${path}`, params };
}

function setView(html: string) {
  const container = document.getElementById('app');
  if (container) container.innerHTML = html;
  else console.error('App container missing');
}

function setActiveNav(target: string) {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    const nav = (btn as HTMLElement).dataset.nav || '';
    btn.classList.toggle('active', nav === target);
  });
}

function showEnvWarning() {
  if (envOk) return;
  console.error('Supabase env vars missing: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY');
  const banner = document.getElementById('env-error');
  if (banner) banner.classList.remove('hidden');
}

function updateDebug() {
  const debug = document.getElementById('auth-debug');
  if (!debug) return;
  if (!import.meta.env.DEV && !new URLSearchParams(window.location.search).has('debug')) return;
  debug.classList.remove('hidden');
  const originEl = document.getElementById('debug-origin');
  const envEl = document.getElementById('debug-env');
  const emailEl = document.getElementById('debug-email');
  const errorEl = document.getElementById('debug-error');
  if (originEl) originEl.textContent = window.location.origin;
  if (envEl) envEl.textContent = envOk ? 'yes' : 'missing';
  if (emailEl) emailEl.textContent = lastSessionEmail || '—';
  if (errorEl) errorEl.textContent = lastError || '—';
}

async function renderOnboarding() {
  setActiveNav('#/onboarding');
  setView(`
    <section class="stack">
      <div class="glass-card rounded-3xl p-6">
        <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-300">AI router</p>
        <h1 class="text-2xl font-semibold">What are you looking for?</h1>
        <p class="text-sm text-gray-600 dark:text-gray-300">Pick a path to continue. You can switch later.</p>
        <div class="mt-6 grid gap-3 md:grid-cols-2" id="onboarding-choices">
          <button class="chip" data-role="provider">I’m looking for work</button>
          <button class="chip" data-role="customer" data-target="new">I need help cleaning</button>
          <button class="chip" data-role="customer" data-target="new">I need a specialist</button>
          <button class="chip" data-role="customer" data-target="new">Just want a quote</button>
        </div>
      </div>
    </section>
  `);

  document.querySelectorAll('[data-role]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const role = (btn as HTMLElement).dataset.role;
      const target = (btn as HTMLElement).dataset.target;
      try {
        await updateUserMetadata({ role });
      } catch (error: any) {
        lastError = error?.message || 'Failed to update role';
        console.error(lastError, error);
        updateDebug();
      }
      if (role === 'provider') {
        window.location.hash = '#/provider/profile';
      } else if (target === 'new') {
        window.location.hash = '#/customer/new';
      }
    });
  });
}

async function renderCustomerNew() {
  setActiveNav('#/customer/new');
  setView(`
    <section class="stack">
      <div class="glass-card rounded-3xl p-6">
        <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-300">Request</p>
        <h1 class="text-2xl font-semibold">Tell us what you need</h1>
        <form id="customer-request" class="mt-4 grid gap-4">
          <label class="form-label">Segment
            <select name="segment" class="form-input mt-2" required>
              <option value="home">Home</option>
              <option value="office">Office</option>
              <option value="hotel">Hotel</option>
            </select>
          </label>
          <label class="form-label">Service type
            <input class="form-input mt-2" name="service_type" placeholder="Deep cleaning, windows, move-out" required />
          </label>
          <label class="form-label">Location
            <input class="form-input mt-2" name="location" placeholder="Postcode / city" required />
          </label>
          <label class="form-label">Date/time window
            <input class="form-input mt-2" name="time_window" placeholder="Tomorrow 2-5pm" required />
          </label>
          <label class="form-label">Size
            <input class="form-input mt-2" name="size" placeholder="e.g., 3 rooms or 80 sqm" required />
          </label>
          <label class="form-label">Details
            <textarea class="form-input mt-2" name="details" placeholder="Access, pets, preferences"></textarea>
          </label>
          <button class="btn-primary rounded-full" type="submit">Create request</button>
          <p id="customer-request-status" class="form-error"></p>
        </form>
      </div>
    </section>
  `);

  const form = document.getElementById('customer-request') as HTMLFormElement | null;
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = document.getElementById('customer-request-status');
      const formData = new FormData(form);
      if (!currentSession?.user?.id) {
        lastError = 'Missing session user';
        console.error(lastError);
        updateDebug();
        return;
      }
      const request: CustomerRequest = {
        customer_user_id: currentSession.user.id,
        segment: String(formData.get('segment') || 'home'),
        service_type: String(formData.get('service_type') || ''),
        location: String(formData.get('location') || ''),
        time_window: String(formData.get('time_window') || ''),
        size: String(formData.get('size') || ''),
        details: String(formData.get('details') || ''),
        status: 'open'
      };
      try {
        const created = await createCustomerRequest(request);
        if (created?.id) {
          window.location.hash = `#/customer/request?id=${created.id}`;
        }
      } catch (error: any) {
        lastError = error?.message || 'Failed to create request';
        console.error(lastError, error);
        status && (status.textContent = lastError);
        updateDebug();
      }
    });
  } else {
    console.error('Customer request form missing');
  }
}

async function renderCustomerRequest(id: string | null) {
  setActiveNav('#/customer/new');
  if (!id) {
    setView('<p class="form-error">Missing request id.</p>');
    return;
  }
  setView('<div class="glass-card rounded-3xl p-6">Loading request...</div>');
  try {
    const data = await fetchRequestWithProposals(id);
    const proposals: Proposal[] = data?.proposals || [];
    const request: CustomerRequest = data || {};
    setView(`
      <section class="stack">
        <div class="glass-card rounded-3xl p-6">
          <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-300">Request</p>
          <h1 class="text-2xl font-semibold">${request.segment || ''} · ${request.service_type || ''}</h1>
          <p class="text-sm text-gray-600 dark:text-gray-300">${request.location || ''} • ${request.time_window || ''}</p>
          <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">${request.details || ''}</p>
          <div class="mt-6">
            <h2 class="text-lg font-semibold">Proposals</h2>
            <div class="grid gap-3" id="proposal-cards"></div>
          </div>
          <p id="customer-request-status" class="form-error"></p>
        </div>
      </section>
    `);
    const container = document.getElementById('proposal-cards');
    if (container) {
      if (!proposals.length) {
        container.innerHTML = '<p class="text-sm text-gray-500">No proposals yet.</p>';
      } else {
        proposals.forEach((proposal) => {
          const card = document.createElement('div');
          card.className = 'surface-card rounded-2xl p-4';
          card.innerHTML = `
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="font-semibold">${proposal.price ? `€${proposal.price}` : 'Proposed'}</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">${proposal.eta || ''}</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">${proposal.note || ''}</p>
              </div>
              <button class="btn-primary rounded-full" data-proposal="${proposal.id}">Select</button>
            </div>
          `;
          container.appendChild(card);
        });
      }
    }
    document.querySelectorAll('[data-proposal]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const proposalId = (btn as HTMLElement).dataset.proposal;
        const proposal = proposals.find((p) => p.id === proposalId);
        const status = document.getElementById('customer-request-status');
        if (!proposal || !currentSession?.user?.id) return;
        try {
          await updateRequestStatus(id, 'confirmed');
          const booking: Booking | null = await confirmBooking({
            request_id: id,
            customer_user_id: currentSession.user.id,
            provider_id: proposal.provider_id,
            proposal_id: proposal.id,
            price: proposal.price,
            status: 'confirmed'
          });
          const thread: ChatThread | null = await createThread({
            booking_id: booking?.id,
            customer_user_id: currentSession.user.id,
            provider_user_id: data?.provider_id || proposal.provider_id
          });
          if (thread?.id) window.location.hash = `#/chat?thread=${thread.id}`;
        } catch (error: any) {
          status && (status.textContent = error?.message || 'Failed to confirm booking');
        }
      });
    });
  } catch (error: any) {
    setView(`<p class="form-error">${error?.message || 'Unable to load request'}</p>`);
  }
}

async function renderProviderProfile() {
  setActiveNav('#/provider/profile');
  setView('<div class="glass-card rounded-3xl p-6">Loading profile...</div>');
  const userId = currentSession?.user?.id;
  if (!userId) return;
  const existing = await fetchProviderProfile(userId);
  setView(`
    <section class="stack">
      <div class="glass-card rounded-3xl p-6">
        <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-300">Provider profile</p>
        <h1 class="text-2xl font-semibold">Tell customers about you</h1>
        <form id="provider-form" class="mt-4 grid gap-4">
          <label class="form-label">Display name
            <input class="form-input mt-2" name="display_name" value="${existing?.display_name || ''}" required />
          </label>
          <label class="form-label">Area
            <input class="form-input mt-2" name="area" value="${existing?.area || ''}" placeholder="City or postcode" required />
          </label>
          <label class="form-label">Radius (km)
            <input class="form-input mt-2" type="number" name="radius_km" value="${existing?.radius_km || 10}" />
          </label>
          <label class="form-label">Services (comma separated)
            <input class="form-input mt-2" name="services" value="${(existing?.services || []).join(', ')}" />
          </label>
          <label class="form-label">Languages (comma separated)
            <input class="form-input mt-2" name="languages" value="${(existing?.languages || []).join(', ')}" />
          </label>
          <label class="form-label">Experience years
            <input class="form-input mt-2" type="number" name="experience_years" value="${existing?.experience_years || ''}" />
          </label>
          <label class="form-label">Hourly rate (€)
            <input class="form-input mt-2" type="number" step="1" name="hourly_rate" value="${existing?.hourly_rate || ''}" />
          </label>
          <button class="btn-primary rounded-full" type="submit">Save profile</button>
          <p id="provider-status" class="form-error"></p>
        </form>
      </div>
    </section>
  `);

  const form = document.getElementById('provider-form') as HTMLFormElement | null;
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('provider-status');
    const formData = new FormData(form);
    const payload: ProviderProfile = {
      user_id: userId,
      display_name: String(formData.get('display_name') || ''),
      area: String(formData.get('area') || ''),
      radius_km: Number(formData.get('radius_km') || 10),
      services: String(formData.get('services') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      languages: String(formData.get('languages') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      experience_years: Number(formData.get('experience_years') || 0),
      hourly_rate: Number(formData.get('hourly_rate') || 0)
    };
    try {
      await upsertProviderProfile(payload);
      status && (status.textContent = 'Saved');
      window.location.hash = '#/provider/schedule';
    } catch (error: any) {
      status && (status.textContent = error?.message || 'Failed to save');
    }
  });
}

async function renderProviderSchedule() {
  setActiveNav('#/provider/profile');
  setView('<div class="glass-card rounded-3xl p-6">Loading schedule...</div>');
  const userId = currentSession?.user?.id;
  const profile = userId ? await fetchProviderProfile(userId) : null;
  if (!profile?.id) {
    setView('<p class="form-error">Complete your profile first.</p>');
    return;
  }
  setView(`
    <section class="stack">
      <div class="glass-card rounded-3xl p-6">
        <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-300">Availability</p>
        <h1 class="text-2xl font-semibold">Set your weekly hours</h1>
        <form id="rule-form" class="grid gap-3 md:grid-cols-2">
          <label class="form-label">Day of week
            <select name="day" class="form-input mt-2">
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </select>
          </label>
          <label class="form-label">Start
            <input class="form-input mt-2" name="start" placeholder="09:00" />
          </label>
          <label class="form-label">End
            <input class="form-input mt-2" name="end" placeholder="17:00" />
          </label>
          <button class="btn-primary rounded-full" type="submit">Add weekly rule</button>
        </form>
        <form id="exception-form" class="mt-6 grid gap-3 md:grid-cols-2">
          <label class="form-label">Date
            <input class="form-input mt-2" name="date" type="date" />
          </label>
          <label class="form-label">Start
            <input class="form-input mt-2" name="start" placeholder="12:00" />
          </label>
          <label class="form-label">End
            <input class="form-input mt-2" name="end" placeholder="14:00" />
          </label>
          <label class="form-label">Type
            <select class="form-input mt-2" name="type">
              <option value="blocked">Blocked</option>
              <option value="extra">Extra</option>
            </select>
          </label>
          <button class="btn-secondary rounded-full" type="submit">Add exception</button>
        </form>
        <p id="schedule-status" class="form-error mt-3"></p>
      </div>
    </section>
  `);

  const ruleForm = document.getElementById('rule-form') as HTMLFormElement | null;
  ruleForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('schedule-status');
    const formData = new FormData(ruleForm);
    const rule: AvailabilityRule = {
      provider_id: profile.id,
      day_of_week: Number(formData.get('day') || 0),
      start_time: String(formData.get('start') || ''),
      end_time: String(formData.get('end') || '')
    };
    try {
      await saveAvailabilityRule(rule);
      status && (status.textContent = 'Rule added');
    } catch (error: any) {
      lastError = error?.message || 'Failed to add rule';
      console.error(lastError, error);
      status && (status.textContent = lastError);
      updateDebug();
    }
  });

  const exceptionForm = document.getElementById('exception-form') as HTMLFormElement | null;
  exceptionForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('schedule-status');
    const formData = new FormData(exceptionForm);
    const exception: AvailabilityException = {
      provider_id: profile.id,
      date: String(formData.get('date') || ''),
      start_time: String(formData.get('start') || ''),
      end_time: String(formData.get('end') || ''),
      type: (String(formData.get('type') || 'blocked') as 'blocked' | 'extra')
    };
    try {
      await saveAvailabilityException(exception);
      status && (status.textContent = 'Exception added');
    } catch (error: any) {
      lastError = error?.message || 'Failed to add exception';
      console.error(lastError, error);
      status && (status.textContent = lastError);
      updateDebug();
    }
  });
}

async function renderProviderRequests() {
  setActiveNav('#/customer/new');
  setView('<div class="glass-card rounded-3xl p-6">Loading open requests...</div>');
  try {
    const requests = await listOpenRequests();
    setView(`
      <section class="stack">
        <div class="glass-card rounded-3xl p-6">
          <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-300">Open requests</p>
          <div class="grid gap-3" id="provider-requests"></div>
        </div>
      </section>
    `);
    const container = document.getElementById('provider-requests');
    if (container) {
      if (!requests.length) {
        container.innerHTML = '<p class="text-sm text-gray-500">No open requests yet.</p>';
      } else {
        requests.forEach((req) => {
          const card = document.createElement('div');
          card.className = 'surface-card rounded-2xl p-4';
          card.innerHTML = `
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="font-semibold">${req.segment || ''} · ${req.service_type || ''}</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">${req.location || ''}</p>
              </div>
              <a class="btn-secondary rounded-full" href="#/provider/request?id=${req.id}">View</a>
            </div>
          `;
          container.appendChild(card);
        });
      }
    }
  } catch (error: any) {
    setView(`<p class="form-error">${error?.message || 'Unable to load requests'}</p>`);
  }
}

async function renderProviderRequest(id: string | null) {
  setActiveNav('#/customer/new');
  if (!id) {
    setView('<p class="form-error">Missing request id.</p>');
    return;
  }
  setView('<div class="glass-card rounded-3xl p-6">Loading request...</div>');
  const userId = currentSession?.user?.id;
  const profile = userId ? await fetchProviderProfile(userId) : null;
  if (!profile?.id) {
    setView('<p class="form-error">Complete your provider profile first.</p>');
    return;
  }
  try {
    const data = await fetchRequestWithProposals(id);
    const request: CustomerRequest = data || {};
    setView(`
      <section class="stack">
        <div class="glass-card rounded-3xl p-6">
          <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-300">Submit proposal</p>
          <h1 class="text-2xl font-semibold">${request.segment || ''} · ${request.service_type || ''}</h1>
          <p class="text-sm text-gray-600 dark:text-gray-300">${request.location || ''}</p>
          <form id="proposal-form" class="mt-4 grid gap-3">
            <label class="form-label">Price (€)
              <input class="form-input mt-2" name="price" type="number" step="1" required />
            </label>
            <label class="form-label">Proposed time/ETA
              <input class="form-input mt-2" name="eta" placeholder="Tomorrow 10:00" />
            </label>
            <label class="form-label">Note
              <textarea class="form-input mt-2" name="note" placeholder="What’s included"></textarea>
            </label>
            <button class="btn-primary rounded-full" type="submit">Send proposal</button>
            <p id="proposal-status" class="form-error"></p>
          </form>
        </div>
      </section>
    `);
    const form = document.getElementById('proposal-form') as HTMLFormElement | null;
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = document.getElementById('proposal-status');
      const formData = new FormData(form);
      const payload: Proposal = {
        request_id: id,
        provider_id: profile.id,
        price: Number(formData.get('price') || 0),
        eta: String(formData.get('eta') || ''),
        note: String(formData.get('note') || '')
      };
      try {
        await submitProposal(payload);
        status && (status.textContent = 'Proposal sent');
        window.location.hash = '#/provider/requests';
      } catch (error: any) {
        lastError = error?.message || 'Failed to submit proposal';
        console.error(lastError, error);
        status && (status.textContent = lastError);
        updateDebug();
      }
    });
  } catch (error: any) {
    lastError = error?.message || 'Unable to load request';
    console.error(lastError, error);
    setView(`<p class="form-error">${lastError}</p>`);
    updateDebug();
  }
}

async function renderChat(threadId: string | null) {
  setActiveNav('#/chat');
  if (!threadId) {
    setView('<p class="form-error">No chat selected.</p>');
    return;
  }
  setView('<div class="glass-card rounded-3xl p-6">Loading chat...</div>');
  const thread = await fetchThread(threadId);
  if (!thread) {
    setView('<p class="form-error">Thread not found.</p>');
    return;
  }
  const userId = currentSession?.user?.id;
  if (thread.customer_user_id !== userId && thread.provider_user_id !== userId) {
    setView('<p class="form-error">You do not have access to this chat.</p>');
    return;
  }
  const messages = await fetchMessages(threadId);
  setView(`
    <section class="stack">
      <div class="glass-card rounded-3xl p-6 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-300">Booking chat</p>
            <h1 class="text-xl font-semibold">Thread ${thread.id?.slice(0, 6) || ''}</h1>
          </div>
        </div>
        <div id="chat-messages" class="chat-window">
          ${(messages || [])
            .map((msg) => `<div class="chat-bubble ${msg.sender_user_id === userId ? 'self' : ''}"><p>${msg.text || ''}</p><span>${msg.created_at || ''}</span></div>`)
            .join('')}
        </div>
        <form id="chat-form" class="chat-form">
          <input class="form-input flex-1" name="message" placeholder="Type a message" autocomplete="off" />
          <button class="btn-primary rounded-full" type="submit">Send</button>
        </form>
      </div>
    </section>
  `);

  if (messageSubscription) {
    await messageSubscription.unsubscribe?.();
  }
  messageSubscription = await subscribeToMessages(threadId, (msg: ChatMessage) => {
    const wrap = document.getElementById('chat-messages');
    if (!wrap) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${msg.sender_user_id === userId ? 'self' : ''}`;
    bubble.innerHTML = `<p>${msg.text || ''}</p><span>${msg.created_at || ''}</span>`;
    wrap.appendChild(bubble);
    wrap.scrollTop = wrap.scrollHeight;
  });

  const form = document.getElementById('chat-form') as HTMLFormElement | null;
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = form.querySelector('input[name="message"]') as HTMLInputElement;
    if (!input?.value) return;
    await sendMessage({ thread_id: threadId, sender_user_id: userId, text: input.value });
    input.value = '';
  });
}

async function renderRoute() {
  const { path, params } = parseRoute();
  if (messageSubscription) {
    await messageSubscription.unsubscribe?.();
    messageSubscription = null;
  }
  switch (path) {
    case '/onboarding':
      await renderOnboarding();
      break;
    case '/customer/new':
      await renderCustomerNew();
      break;
    case '/customer/request':
      await renderCustomerRequest(params.get('id'));
      break;
    case '/provider/profile':
      await renderProviderProfile();
      break;
    case '/provider/schedule':
      await renderProviderSchedule();
      break;
    case '/provider/requests':
      await renderProviderRequests();
      break;
    case '/provider/request':
      await renderProviderRequest(params.get('id'));
      break;
    case '/chat':
      await renderChat(params.get('thread'));
      break;
    default:
      window.location.hash = '#/onboarding';
      break;
  }
}

function initNav() {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = (btn as HTMLElement).dataset.nav;
      if (target) window.location.hash = target;
    });
  });
}

async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return;
  try {
    const session = await exchangeCodeForSession(code);
    lastSessionEmail = session?.user?.email || '';
    const clean = new URL(window.location.href);
    clean.searchParams.delete('code');
    clean.searchParams.delete('state');
    window.history.replaceState({}, '', clean.toString());
    if (session) {
      window.location.hash = '#/onboarding';
    }
  } catch (error: any) {
    lastError = error?.message || 'OAuth exchange failed';
    console.error(lastError, error);
    updateDebug();
  }
}

async function init() {
  initTheme();
  bindThemeToggle();
  const storedLocale = localStorage.getItem('helpro.locale') || 'en';
  await setLanguage(storedLocale, false);
  showEnvWarning();
  if (!envOk) {
    lastError = 'Supabase env vars missing';
    setView(`<p class="form-error">${lastError}</p>`);
    updateDebug();
    return;
  }

  try {
    await handleOAuthCallback();
    currentSession = await getSession();
  } catch (error: any) {
    lastError = error?.message || 'Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
    console.error(lastError, error);
    setView(`<p class="form-error">${lastError}</p>`);
    updateDebug();
    return;
  }
  if (!currentSession) {
    window.location.href = '/auth.html';
    return;
  }
  lastSessionEmail = currentSession.user?.email || '';
  const emailEl = document.getElementById('session-email');
  if (emailEl) emailEl.textContent = currentSession.user?.email || '';

  document.getElementById('logout')?.addEventListener('click', async () => {
    await signOut();
    window.location.href = '/auth.html';
  });

  initNav();
  await renderRoute();
  updateDebug();
  window.addEventListener('hashchange', renderRoute);
}

document.addEventListener('DOMContentLoaded', init);
