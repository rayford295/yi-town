// A new version of the site: told, not forced. The service worker is in 'prompt' mode so an open
// page is never reloaded underneath someone half-way through a level; a bar at the bottom offers
// the update and one tap takes it. The check runs when the tab comes back into view and hourly.
import { registerSW } from 'virtual:pwa-register';
import { t } from './i18n';

export function watchForUpdates(): void {
  const update = registerSW({
    onNeedRefresh() {
      if (document.querySelector('.update-bar')) return;
      const bar = document.createElement('div');
      bar.className = 'update-bar';
      bar.setAttribute('role', 'status');
      bar.innerHTML = `<span>${t('update.ready')}</span><button type="button" class="btn">${t('update.go')}</button>`;
      bar.querySelector('button')!.addEventListener('click', () => { bar.querySelector('button')!.disabled = true; void update(true); });
      document.body.appendChild(bar);
      requestAnimationFrame(() => bar.classList.add('in'));
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => { void reg.update().catch(() => undefined); };
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      window.setInterval(check, 60 * 60 * 1000);
    },
  });
}
