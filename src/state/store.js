const STORAGE_KEY = 'helpro.state';
const CURRENT_USER_KEY = 'helpro.currentUser';
const OTP_KEY = 'helpro.otp';
export const LOCALE_KEY = 'helpro.locale';

const devStore = {
  users: [
    {
      id: 'user-1',
      name: 'Tara Rahimi',
      email: 'tara@example.com',
      role: 'customer',
      verified: true,
      locale: 'fa',
      phone: '+46 70 000 00 00'
    },
    {
      id: 'user-2',
      name: 'Lars Svensson',
      email: 'lars@example.com',
      role: 'customer',
      verified: true,
      locale: 'sv',
      phone: '+46 73 123 45 67'
    }
  ],
  requests: [
    {
      id: 'req-1',
      userId: 'user-2',
      status: 'quoted',
      summary: '2 bed weekly upkeep · Stockholm',
      locale: 'sv',
      createdAt: new Date().toISOString()
    }
  ],
  proposals: [
    {
      id: 'prop-1',
      requestId: 'req-1',
      providerId: 'pro-22',
      price: 135,
      currency: 'EUR',
      notes: 'Recurring rate with linens. Can start next week.',
      status: 'sent'
    }
  ],
  bookings: [
    {
      id: 'book-1',
      requestId: 'req-1',
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      address: 'Sveavägen 12, Stockholm'
    }
  ],
  chatThreads: [
    {
      id: 'thread-1',
      requestId: 'req-1',
      participants: ['user-2', 'coordinator'],
      lastMessageAt: Date.now() - 3600000,
      messages: [
        { id: 'm-1', sender: 'coordinator', text: 'Hej Lars! Vi fick din förfrågan för veckostädning.', ts: Date.now() - 7200000 },
        { id: 'm-2', sender: 'user-2', text: 'Toppen, kan ni starta nästa tisdag kl 09?', ts: Date.now() - 6500000 },
        { id: 'm-3', sender: 'coordinator', text: 'Ja! Jag håller ett förslag och skickar OTP för verifiering.', ts: Date.now() - 3600000 }
      ]
    }
  ]
};

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('[store] failed to parse state', error);
    return null;
  }
}

function persistStore(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

export function initializeStore() {
  if (!readStore()) {
    persistStore(devStore);
  }
}

export function getStore() {
  return readStore() || { users: [], requests: [], proposals: [], bookings: [], chatThreads: [] };
}

export function upsertUser(user) {
  const store = getStore();
  const index = store.users.findIndex((u) => u.id === user.id);
  if (index >= 0) store.users[index] = { ...store.users[index], ...user };
  else store.users.push(user);
  persistStore(store);
  return user;
}

export function getUserByEmail(email) {
  if (!email) return null;
  const store = getStore();
  return store.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function registerUser({ name, email, password, role = 'customer' }) {
  const existing = getUserByEmail(email);
  if (existing) return existing;
  const user = {
    id: `user-${Date.now()}`,
    name,
    email,
    role,
    password,
    verified: false,
    locale: localStorage.getItem(LOCALE_KEY) || 'en'
  };
  const store = getStore();
  store.users.push(user);
  persistStore(store);
  return user;
}

export function setCurrentUser(userId) {
  localStorage.setItem(CURRENT_USER_KEY, userId);
}

export function getCurrentUser() {
  const id = localStorage.getItem(CURRENT_USER_KEY);
  if (!id) return null;
  const store = getStore();
  return store.users.find((u) => u.id === id) || null;
}

export function markUserVerified(email) {
  const store = getStore();
  store.users = store.users.map((u) => (u.email === email ? { ...u, verified: true } : u));
  persistStore(store);
}

export function createOtp(email) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const payload = {
    email,
    code,
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000,
    resendAvailableAt: Date.now() + 30 * 1000
  };
  localStorage.setItem(OTP_KEY, JSON.stringify(payload));
  return payload;
}

export function getOtpState() {
  const raw = localStorage.getItem(OTP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[store] failed to parse OTP', error);
    return null;
  }
}

export function verifyOtp(email, code) {
  const otp = getOtpState();
  if (!otp || otp.email !== email) return false;
  const isValid = otp.code === code && Date.now() < otp.expiresAt;
  if (isValid) clearOtp();
  return isValid;
}

export function clearOtp() {
  localStorage.removeItem(OTP_KEY);
}

export function canResendOtp() {
  const otp = getOtpState();
  if (!otp) return true;
  return Date.now() >= (otp.resendAvailableAt || 0);
}

export function touchOtpResend(email) {
  const otp = createOtp(email);
  return otp;
}

export function createThreadForRequest(requestId, userId) {
  const store = getStore();
  const existing = store.chatThreads.find((t) => t.requestId === requestId && t.participants.includes(userId));
  if (existing) return existing;
  const thread = {
    id: `thread-${Date.now()}`,
    requestId,
    participants: [userId, 'coordinator'],
    lastMessageAt: Date.now(),
    messages: [
      { id: `m-${Date.now()}`, sender: 'coordinator', text: 'We started a new thread for your onboarding.', ts: Date.now() }
    ]
  };
  store.chatThreads.push(thread);
  persistStore(store);
  return thread;
}

export function createAdhocThread(userId, summary = 'New request captured') {
  const store = getStore();
  const request = {
    id: `req-${Date.now()}`,
    userId,
    status: 'draft',
    summary,
    locale: localStorage.getItem(LOCALE_KEY) || 'en',
    createdAt: new Date().toISOString()
  };
  store.requests.unshift(request);
  const booking = {
    id: `book-${Date.now()}`,
    requestId: request.id,
    status: 'pending',
    scheduledAt: null,
    address: ''
  };
  store.bookings.unshift(booking);
  const thread = {
    id: `thread-${Date.now()}`,
    requestId: request.id,
    participants: [userId, 'coordinator'],
    lastMessageAt: Date.now(),
    messages: [
      { id: `m-${Date.now()}`, sender: 'coordinator', text: 'Tell us when and where you need cleaning.', ts: Date.now() }
    ]
  };
  store.chatThreads.unshift(thread);
  persistStore(store);
  return { request, booking, thread };
}

export function getThreadsForUser(userId) {
  const store = getStore();
  return store.chatThreads.filter((t) => t.participants.includes(userId)).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

export function getRequestById(id) {
  const store = getStore();
  return store.requests.find((r) => r.id === id) || null;
}

export function getBookingByRequestId(requestId) {
  const store = getStore();
  return store.bookings.find((b) => b.requestId === requestId) || null;
}

export function addMessageToThread(threadId, sender, text) {
  const store = getStore();
  const thread = store.chatThreads.find((t) => t.id === threadId);
  if (!thread) return null;
  const message = { id: `m-${Date.now()}`, sender, text, ts: Date.now() };
  thread.messages.push(message);
  thread.lastMessageAt = message.ts;
  persistStore(store);
  return message;
}

export function resetStore() {
  persistStore(devStore);
  localStorage.removeItem(CURRENT_USER_KEY);
  clearOtp();
}
