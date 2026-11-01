// Play the 3D edition: the fork's link to the Godot web build and the guard that decides whether a click may follow it.
// Both editions read and write the one shared save (tenderloin-redux.godot.save.v1), and the 3D edition reads it only when it
// starts, so a page load is the whole swap. Pages and the local server both serve the Godot build at godot/ beside browser-next/,
// so the link is relative and opens in the same tab; a modifier or middle click keeps the browser's own new tab.
// Fork-authored text: Godot has no such link (tests/next-edition.test.mjs checks that none of it is a Godot line).

export const EDITION_URL = '../godot/';

// What a click on the link does. The fork writes on every change, so leaving loses nothing ('go'), unless:
// - recovery: this tab holds progress the stored save lacks (a pending recovery offer), and the 3D edition would load the shared
//   save as it is. The offer comes first ('recover').
// - held: the stored save could not be read, so nothing was written over it, and the 3D edition would start fresh and replace it
//   with its first change. A confirmation comes first ('confirm').
// A save refused as full, or storage that is unavailable, goes: the receipt already said those changes were visit-only.
export function swapAction({ recovery = null, held = false } = {}) {
  if (recovery) return 'recover';
  if (held) return 'confirm';
  return 'go';
}

export const EDITION_TEXT = Object.freeze({
  link: 'Play the 3D edition',
  help: 'The 3D edition opens in this tab and reads the same shared save.',
  recover: 'Choose what to keep before switching editions: the 3D edition would load the shared save as it is.',
  eyebrow: 'SWITCHING EDITIONS',
  title: 'Start the 3D edition fresh?',
  confirm: 'The shared save could not be read. The 3D edition will start fresh and replace it with its first change.',
  open: 'Open the 3D edition',
  stay: 'Stay here',
});
