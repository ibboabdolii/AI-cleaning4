import { t } from './i18n.js';

async function reverseGeocode(lat: number, lon: number, lang: string) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': lang || 'en' } });
    const payload = await res.json().catch(() => null);
    const address = payload?.address || {};
    const city = address.city || address.town || address.village || address.hamlet || address.municipality || '';
    const postcode = address.postcode || '';
    const label = [postcode, city].filter(Boolean).join(' ').trim() || payload?.display_name || '';
    return { label: label.trim(), raw: payload, status: res.status };
  } catch (error) {
    console.warn('reverseGeocode error', error);
    return { label: '', raw: null, status: 0 };
  }
}

export function requestLocationAutofill({
  language,
  onAddress,
  onPolicy,
  onDebug
}: {
  language: string;
  onAddress: (address: string) => void;
  onPolicy?: () => void;
  onDebug?: (info: { coords?: GeolocationCoordinates; result?: { label: string; raw: unknown; status: number } }) => void;
}) {
  if (!('geolocation' in navigator)) {
    alert(t('chat.location.unsupported', 'Location is not supported on this device. Please enter your address manually.'));
    return;
  }

  const proceed = window.confirm(t('chat.location.request', 'Please allow location to autofill your address.'));
  if (!proceed) return;

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      onDebug?.({ coords: pos.coords });
      const result = await reverseGeocode(pos.coords.latitude, pos.coords.longitude, language || 'en');
      onDebug?.({ coords: pos.coords, result });
      const { label } = result;
      if (label) {
        onAddress(label);
        onPolicy?.();
      } else {
        alert(t('chat.location.noAddress', 'Could not resolve your location to an address. Please type it manually.'));
      }
    },
    () => {
      alert(t('chat.location.denied', 'Location access denied. Please enter your address manually.'));
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

export function attachLandingLocationAutofill() {
  const input = document.querySelector('input[name="location"]');
  const trigger = document.getElementById('landing-use-location');
  if (!input) return;
  const runAutofill = () =>
    requestLocationAutofill({
      language: document.documentElement.lang || 'en',
      onAddress: (addr) => {
        (input as HTMLInputElement).value = addr;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        sessionStorage.setItem('cleanai_landing_location', addr);
      }
    });

  if (trigger) {
    trigger.addEventListener('click', () => runAutofill());
  } else {
    // fallback: attempt when no explicit trigger is present
    runAutofill();
  }
}
