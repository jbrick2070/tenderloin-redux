import { BOUNDS, OPENING_BOUNDS } from './core.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const midpoint = (bounds = OPENING_BOUNDS) => ({ x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 });

// A view transform only: walking distances and projected street geometry never change.
export class Camera {
  constructor(width, height, player) {
    this.routeOverview = false; this.center = midpoint(); this.overviewMode = true; this.following = false;
    this.resize(width, height);
    if (width < 600 || player.x < OPENING_BOUNDS.left) this.follow(player);
  }
  resize(width, height) {
    this.width = width; this.height = height;
    const fit = bounds => Math.max(.05, Math.min((width - 28) / (bounds.right - bounds.left), (height - 245) / (bounds.bottom - bounds.top)));
    this.fit = fit(OPENING_BOUNDS); this.minimum = fit(BOUNDS);
    this.maximum = Math.max(1.6, this.fit);
    this.scale = this.overviewMode ? this.routeOverview ? this.minimum : this.fit : clamp(this.scale, this.minimum, this.maximum);
    this.update();
  }
  update() {
    this.center.x = clamp(this.center.x, BOUNDS.left, BOUNDS.right);
    this.center.y = clamp(this.center.y, BOUNDS.top, BOUNDS.bottom);
    this.offset = { x: this.width / 2 - this.center.x * this.scale, y: (this.height - 45) / 2 - this.center.y * this.scale };
  }
  overview(route = false) { this.routeOverview = route; this.overviewMode = true; this.following = false; this.center = midpoint(route ? BOUNDS : OPENING_BOUNDS); this.scale = route ? this.minimum : this.fit; this.update(); }
  follow(player) { this.overviewMode = false; this.following = true; this.scale = Math.max(this.scale, .85); this.track(player); }
  track(player) { if (this.following) { this.center = { x: player.x, y: player.y - 25 }; this.update(); } }
  zoom(factor) { this.overviewMode = false; this.scale = clamp(this.scale * factor, this.minimum, this.maximum); this.update(); }
  pan(dx, dy) { this.overviewMode = false; this.following = false; this.center.x -= dx / this.scale; this.center.y -= dy / this.scale; this.update(); }
  toWorld(x, y) { return { x: (x - this.offset.x) / this.scale, y: (y - this.offset.y) / this.scale }; }
}
