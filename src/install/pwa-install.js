export class PwaInstallController {
  constructor({ button, status } = {}) {
    this.button = button || null;
    this.status = status || null;
    this.deferredPrompt = null;
    this.installed = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    this.onBeforeInstall = this.onBeforeInstall.bind(this);
    this.onInstalled = this.onInstalled.bind(this);
  }

  start() {
    window.addEventListener('beforeinstallprompt', this.onBeforeInstall);
    window.addEventListener('appinstalled', this.onInstalled);
    this.render();
    if (this.button) this.button.addEventListener('click', () => this.prompt());
    return this;
  }

  stop() {
    window.removeEventListener('beforeinstallprompt', this.onBeforeInstall);
    window.removeEventListener('appinstalled', this.onInstalled);
  }

  onBeforeInstall(event) {
    event.preventDefault();
    this.deferredPrompt = event;
    this.render();
  }

  onInstalled() {
    this.installed = true;
    this.deferredPrompt = null;
    this.render();
  }

  async prompt() {
    if (this.installed) return { outcome: 'installed' };
    if (!this.deferredPrompt) return { outcome: 'unavailable' };
    const prompt = this.deferredPrompt;
    this.deferredPrompt = null;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    this.render();
    return choice;
  }

  render() {
    if (this.button) {
      this.button.hidden = this.installed || !this.deferredPrompt;
      this.button.disabled = !this.deferredPrompt;
    }
    if (this.status) this.status.textContent = this.installed ? 'Đã cài ứng dụng' : 'PWA sẵn sàng';
  }
}
