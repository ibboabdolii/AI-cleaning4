import { LOCALE_KEY } from '../state/store.js';

const translations = {
  en: {
    'app.brand': 'Helpro Concierge',
    'app.subtitle': 'Tiptapp-inspired onboarding',
    'language.title': 'Choose your language',
    'language.subtitle': 'We’ll remember this device preference for all future visits.',
    'language.cta': 'Continue with',
    'language.fa': 'Farsi',
    'language.sv': 'Swedish',
    'language.en': 'English',
    'language.skip': 'Locale saved — taking you to auth…',
    'auth.title': 'Continue to Helpro',
    'auth.subtitle': 'Use email to receive a verification code. Google is stubbed for now.',
    'auth.tab.login': 'Login',
    'auth.tab.register': 'Register',
    'auth.google': 'Continue with Google (stub)',
    'auth.or': 'or',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.name': 'Full name',
    'auth.login.cta': 'Login',
    'auth.register.cta': 'Register & send OTP',
    'auth.forgot': 'Forgot password? Coming soon.',
    'auth.validation.email': 'Enter a valid email.',
    'auth.validation.password': 'Password must be at least 8 characters.',
    'auth.validation.name': 'Add your name so we can personalize chat.',
    'auth.validation.missingLocale': 'Choose a language first.',
    'auth.otp.created': 'OTP created and stored locally.',
    'auth.verified': 'Email verified. Continue with login.',
    'verify.title': 'Check your inbox',
    'verify.subtitle': 'We sent a 6-digit code. Use the same device to continue.',
    'verify.label': '6-digit code',
    'verify.resend': 'Resend code',
    'verify.cooldown': 'Resend available in',
    'verify.submit': 'Verify & return to login',
    'verify.edit': 'Edit email',
    'verify.error': 'Invalid or expired code.',
    'verify.sent': 'Sent to',
    'chat.title': 'Onboarding chat',
    'chat.subtitle': 'Threads are seeded with dev data and draft bookings.',
    'chat.newThread': 'Start a fresh thread',
    'chat.activeRequest': 'Active request',
    'chat.bookingStatus': 'Booking status',
    'chat.lastMessage': 'Last message',
    'chat.empty': 'No threads yet. Start one to chat with ops.',
    'chat.resume': 'Resume thread',
    'chat.logout': 'Reset demo session'
  },
  sv: {
    'app.brand': 'Helpro Concierge',
    'app.subtitle': 'Tiptapp-inspirerad onboarding',
    'language.title': 'Välj språk',
    'language.subtitle': 'Vi sparar valet på denna enhet.',
    'language.cta': 'Fortsätt med',
    'language.fa': 'Farsi',
    'language.sv': 'Svenska',
    'language.en': 'Engelska',
    'language.skip': 'Språk sparat — skickar dig till auth…',
    'auth.title': 'Fortsätt till Helpro',
    'auth.subtitle': 'Använd e-post för att få en kod. Google är en stub.',
    'auth.tab.login': 'Logga in',
    'auth.tab.register': 'Registrera',
    'auth.google': 'Fortsätt med Google (stub)',
    'auth.or': 'eller',
    'auth.email': 'E-post',
    'auth.password': 'Lösenord',
    'auth.name': 'Fullständigt namn',
    'auth.login.cta': 'Logga in',
    'auth.register.cta': 'Registrera och skicka OTP',
    'auth.forgot': 'Glömt lösenord? Kommer snart.',
    'auth.validation.email': 'Ange en giltig e-post.',
    'auth.validation.password': 'Lösenordet måste vara minst 8 tecken.',
    'auth.validation.name': 'Lägg till ditt namn för att personifiera chatten.',
    'auth.validation.missingLocale': 'Välj språk först.',
    'auth.otp.created': 'OTP skapad och sparad lokalt.',
    'auth.verified': 'E-post verifierad. Fortsätt med inloggning.',
    'verify.title': 'Kontrollera din inkorg',
    'verify.subtitle': 'Vi skickade en 6-siffrig kod. Använd samma enhet.',
    'verify.label': '6-siffrig kod',
    'verify.resend': 'Skicka igen',
    'verify.cooldown': 'Skicka igen om',
    'verify.submit': 'Verifiera och tillbaka till inloggning',
    'verify.edit': 'Redigera e-post',
    'verify.error': 'Ogiltig eller utgången kod.',
    'verify.sent': 'Skickat till',
    'chat.title': 'Onboarding-chat',
    'chat.subtitle': 'Trådar är seedade med demodata och utkastbokningar.',
    'chat.newThread': 'Starta en ny tråd',
    'chat.activeRequest': 'Aktiv förfrågan',
    'chat.bookingStatus': 'Bokningsstatus',
    'chat.lastMessage': 'Senaste meddelande',
    'chat.empty': 'Inga trådar ännu. Starta en för att chatta.',
    'chat.resume': 'Återuppta tråd',
    'chat.logout': 'Nollställ demosession'
  },
  fa: {
    'app.brand': 'هلپرو',
    'app.subtitle': 'ورود سبک تیپ‌تپ',
    'language.title': 'زبان را انتخاب کنید',
    'language.subtitle': 'ترجیح زبان در این دستگاه ذخیره می‌شود.',
    'language.cta': 'ادامه با',
    'language.fa': 'فارسی',
    'language.sv': 'سوئدی',
    'language.en': 'انگلیسی',
    'language.skip': 'زبان ذخیره شد — به احراز هویت می‌رویم…',
    'auth.title': 'ادامه به هلپرو',
    'auth.subtitle': 'با ایمیل یک کد دریافت کنید. دکمه گوگل شبیه‌سازی است.',
    'auth.tab.login': 'ورود',
    'auth.tab.register': 'ثبت‌نام',
    'auth.google': 'ادامه با گوگل (شبیه‌سازی)',
    'auth.or': 'یا',
    'auth.email': 'ایمیل',
    'auth.password': 'رمز عبور',
    'auth.name': 'نام کامل',
    'auth.login.cta': 'ورود',
    'auth.register.cta': 'ثبت‌نام و ارسال کد',
    'auth.forgot': 'فراموشی رمز؟ به‌زودی.',
    'auth.validation.email': 'یک ایمیل معتبر وارد کنید.',
    'auth.validation.password': 'رمز باید حداقل ۸ کاراکتر باشد.',
    'auth.validation.name': 'لطفاً نام خود را بنویسید.',
    'auth.validation.missingLocale': 'ابتدا زبان را انتخاب کنید.',
    'auth.otp.created': 'کد ذخیره شد.',
    'auth.verified': 'ایمیل تایید شد. ورود کنید.',
    'verify.title': 'ایمیل خود را چک کنید',
    'verify.subtitle': 'کد ۶ رقمی ارسال شد. با همین دستگاه ادامه دهید.',
    'verify.label': 'کد ۶ رقمی',
    'verify.resend': 'ارسال مجدد',
    'verify.cooldown': 'ارسال مجدد در',
    'verify.submit': 'تایید و بازگشت به ورود',
    'verify.edit': 'ویرایش ایمیل',
    'verify.error': 'کد نامعتبر یا منقضی.',
    'verify.sent': 'ارسال شده به',
    'chat.title': 'گفتگو برای آنبوردینگ',
    'chat.subtitle': 'رشته‌ها با داده نمونه و رزرو پیش‌نویس پر شده‌اند.',
    'chat.newThread': 'شروع رشته جدید',
    'chat.activeRequest': 'درخواست فعال',
    'chat.bookingStatus': 'وضعیت رزرو',
    'chat.lastMessage': 'آخرین پیام',
    'chat.empty': 'هنوز رشته‌ای نیست. یکی بسازید.',
    'chat.resume': 'ادامه گفتگو',
    'chat.logout': 'بازنشانی جلسه'
  }
};

const rtlLocales = ['fa'];

export function getLocale() {
  return localStorage.getItem(LOCALE_KEY);
}

export function applyDirection(locale) {
  const dir = rtlLocales.includes(locale) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.body.dir = dir;
  document.documentElement.dataset.lang = locale;
  document.body.dataset.lang = locale;
  document.body.classList.toggle('rtl', dir === 'rtl');
}

export function setLocale(locale) {
  const next = translations[locale] ? locale : 'en';
  localStorage.setItem(LOCALE_KEY, next);
  applyDirection(next);
  return next;
}

export function ensureLocale(defaultLocale = 'en') {
  const stored = getLocale();
  const active = stored || defaultLocale;
  applyDirection(active);
  if (!stored) localStorage.setItem(LOCALE_KEY, active);
  return active;
}

export function t(key) {
  const locale = getLocale() || 'en';
  const table = translations[locale] || translations.en;
  return table[key] || translations.en[key] || key;
}

export function applyI18n(scope = document) {
  scope.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
}

export function isRtl() {
  const locale = getLocale();
  return rtlLocales.includes(locale || '');
}
