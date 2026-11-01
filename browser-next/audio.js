// The music sketch is Godot's original 80 BPM sketch (godot/main.gd advance_music_clock), ported sample for
// sample in sketch-core.js and played by sketch-player.js on an AudioWorklet. MusicSketch keeps the interface
// soundtrack.js and game.js use (start, stop, setVolume, update, dispose, enabled, starting, volume) and adds
// SketchPlayer's mask, position(), mute() and ensureContext(). Pausing keeps the clock, as in Godot.
import { SketchPlayer } from './sketch-player.js';

export class MusicSketch extends SketchPlayer {}
