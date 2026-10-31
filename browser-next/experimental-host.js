// Core-owned lifetime. Optional modules receive a generation-scoped resource registry.
export class ExperimentHost {
  constructor({ load, onChange = () => {}, onDisable = () => {}, present = () => {}, closeView = () => {}, timeout = 10000 }) {
    this.load = load; this.onChange = onChange; this.onDisable = onDisable; this.present = present; this.closeView = closeView; this.timeout = timeout;
    this.enabled = false; this.status = 'off'; this.generation = 0; this.errors = []; this.instance = null; this.lifetime = null; this.pending = null;
  }
  snapshot() { return { enabled: this.enabled, status: this.status, resources: this.lifetime?.resources.size || 0, audio: this.lifetime?.audio.size || 0, cleanupErrors: this.errors.length }; }
  safe(fn) { try { const result = fn(); if (result?.catch) result.catch(error => this.record(error)); } catch (error) { this.record(error); } }
  record(error) { this.errors.push(String(error?.message || error).slice(0, 180)); this.errors = this.errors.slice(-20); }
  notify() { this.safe(() => this.onChange(this.snapshot())); }
  stopAudio(audio) {
    // Pause first; later cleanup errors must not skip other audio or resources.
    for (const fn of [() => audio.pause(), () => audio.removeAttribute('src'), () => audio.load()]) this.safe(fn);
  }
  release() {
    const life = this.lifetime; this.lifetime = null; this.instance = null;
    if (!life) return;
    for (const audio of life.audio) this.stopAudio(audio);
    life.audio.clear();
    this.safe(() => life.controller.abort());
    for (const dispose of [...life.resources].reverse()) this.safe(dispose);
    life.resources.clear();
  }
  silence() { for (const audio of this.lifetime?.audio || []) this.stopAudio(audio); }
  suspend() { ++this.generation; this.release(); this.pending = null; this.status = !this.enabled ? 'off' : this.status === 'error' ? 'error' : 'paused'; this.notify(); }
  resume() { return this.enabled && this.status === 'paused' ? this.activate() : Promise.resolve(false); }
  setEnabled(enabled) {
    if (enabled !== true) {
      const wasEnabled = this.enabled;
      this.enabled = false; ++this.generation; this.status = 'off'; this.release(); this.pending = null;
      if (wasEnabled) this.safe(this.onDisable);
      this.notify(); return Promise.resolve(false);
    }
    if (this.enabled) return this.pending || Promise.resolve(this.status === 'ready');
    this.enabled = true; return this.activate();
  }
  retry() { return this.enabled && this.status === 'error' ? this.activate() : this.pending || Promise.resolve(false); }
  activate() {
    if (!this.enabled) return Promise.resolve(false);
    this.release(); const generation = ++this.generation;
    const life = { controller: new AbortController(), resources: new Set(), audio: new Set() };
    this.lifetime = life; this.status = 'loading';
    const active = () => this.enabled && this.generation === generation && this.lifetime === life && !life.controller.signal.aborted;
    const own = fn => {
      let disposed = false;
      const release = () => { if (disposed) return; disposed = true; life.resources.delete(release); this.safe(fn); };
      if (active()) life.resources.add(release); else release();
      return release;
    };
    const scope = {
      signal: life.controller.signal, active, generation, own,
      listen: (target, type, handler) => { if (!active()) return () => {}; target.addEventListener(type, handler); return own(() => target.removeEventListener(type, handler)); },
      ownAudio: audio => { if (active()) life.audio.add(audio); else this.stopAudio(audio); return audio; },
      present: html => { if (active()) this.present(html); },
      close: () => { if (active()) this.closeView(); },
      disable: () => { if (active()) this.setEnabled(false); },
    };
    const abort = new Promise((_, reject) => life.controller.signal.addEventListener('abort', () => reject(Error('Optional load stopped')), { once: true }));
    const timer = setTimeout(() => life.controller.abort(), this.timeout);
    const clearTimer = own(() => clearTimeout(timer));
    // Attach cleanup before the race, so a late loader result is also disposed.
    const work = Promise.resolve().then(() => active() ? this.load(scope) : null).then(instance => {
      if (instance?.dispose) own(() => instance.dispose());
      return instance;
    });
    const pending = (async () => {
      try {
        const instance = await Promise.race([work, abort]);
        if (!active()) return false;
        if (!instance || typeof instance.open !== 'function') throw Error('Optional module unavailable');
        this.instance = instance; this.status = 'ready'; return true;
      } catch {
        if (this.enabled && this.generation === generation && this.lifetime === life) { this.status = 'error'; this.release(); }
        return false;
      } finally {
        clearTimer();
        if (this.generation === generation) { this.pending = null; this.notify(); }
      }
    })();
    this.pending = pending; this.notify(); return pending;
  }
  open() {
    if (!this.enabled || this.status !== 'ready') return false;
    try { this.instance.open(); return true; }
    catch (error) { this.record(error); ++this.generation; this.status = 'error'; this.release(); this.notify(); return false; }
  }
  dismiss() { if (this.instance?.dismiss) this.safe(() => this.instance.dismiss()); }
}
