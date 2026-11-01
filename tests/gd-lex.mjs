// A small GDScript lexer for drift tests: constants, function bodies and string literals,
// read from godot/*.gd at test time. Handles `const NAME := …` and `const NAME: T = …`,
// single- and double-quoted strings with escapes, comments, and Vector2/Rect2/Color calls.
import { readFileSync } from 'node:fs';

const cache = new Map();
export function gdSource(file) {
  if (!cache.has(file)) cache.set(file, readFileSync(new URL(`../godot/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n'));
  return cache.get(file);
}

const ESCAPES = { n: '\n', t: '\t', r: '\r', '"': '"', "'": "'", '\\': '\\' };
// Tokens of a GDScript fragment: strings (decoded), numbers, names and punctuation. Comments are dropped.
export function tokens(text) {
  const out = [];
  for (let i = 0; i < text.length;) {
    const ch = text[i];
    if (ch === '#') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"' || ch === "'") {
      const triple = text.startsWith(ch.repeat(3), i);
      const end = triple ? ch.repeat(3) : ch;
      let j = i + end.length, value = '';
      while (j < text.length && !text.startsWith(end, j)) {
        if (text[j] === '\\') { const e = text[j + 1]; value += Object.hasOwn(ESCAPES, e) ? ESCAPES[e] : '\\' + e; j += 2; }
        else value += text[j++];
      }
      out.push({ type: 'string', value, at: i });
      i = j + end.length; continue;
    }
    const num = /^-?(?:\d+\.\d*|\.\d+|\d+)(?:e[+-]?\d+)?/i.exec(text.slice(i));
    if (num && (ch !== '-' || !out.length || ['(', '[', '{', ',', ':', '='].includes(out.at(-1).value))) { out.push({ type: 'number', value: Number(num[0]), at: i }); i += num[0].length; continue; }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(i));
    if (name) { out.push({ type: 'name', value: name[0], at: i }); i += name[0].length; continue; }
    const op = /^(:=|==|!=|<=|>=|->|&&|\|\|)/.exec(text.slice(i));
    out.push({ type: 'punct', value: op ? op[0] : ch, at: i }); i += op ? op[0].length : 1;
  }
  return out;
}

// Parse one literal value (array, dictionary, string, number, bool, Vector2, Rect2, Color) from tokens at i.
function literal(t, i) {
  const tok = t[i];
  if (!tok) throw Error('Unexpected end of literal');
  if (tok.type === 'string' || tok.type === 'number') return [tok.value, i + 1];
  if (tok.type === 'name' && (tok.value === 'true' || tok.value === 'false')) return [tok.value === 'true', i + 1];
  if (tok.type === 'name' && ['Vector2', 'Vector2i', 'Rect2', 'Color'].includes(tok.value) && t[i + 1]?.value === '(') {
    const args = []; let j = i + 2;
    while (t[j].value !== ')') { const [v, k] = literal(t, j); args.push(v); j = t[k].value === ',' ? k + 1 : k; }
    return [args, j + 1];
  }
  if (tok.value === '[') {
    const list = []; let j = i + 1;
    while (t[j].value !== ']') { const [v, k] = literal(t, j); list.push(v); j = t[k].value === ',' ? k + 1 : k; }
    return [list, j + 1];
  }
  if (tok.value === '{') {
    const dict = {}; let j = i + 1;
    while (t[j].value !== '}') {
      const [key, k] = literal(t, j);
      if (t[k].value !== ':') throw Error(`Expected : after ${key}`);
      const [v, m] = literal(t, k + 1); dict[key] = v; j = t[m].value === ',' ? m + 1 : m;
    }
    return [dict, j + 1];
  }
  throw Error(`Unsupported literal token ${JSON.stringify(tok.value)}`);
}

// The value of `const NAME := …` or `const NAME: Type = …` in a godot/*.gd file.
export function gdConst(file, name) {
  const src = gdSource(file);
  const m = new RegExp(`^const ${name}\\s*(?::=|:[^=\\n]*=)\\s*`, 'm').exec(src);
  if (!m) throw Error(`const ${name} is missing from godot/${file}`);
  const t = tokens(src.slice(m.index + m[0].length));
  return literal(t, 0)[0];
}

// The text of `func name(` or `static func name(` up to the next top-level declaration.
export function gdFunc(file, name) {
  const src = gdSource(file);
  const m = new RegExp(`^(?:static )?func ${name}\\(`, 'm').exec(src);
  if (!m) throw Error(`func ${name} is missing from godot/${file}`);
  // The body ends at the first unindented line outside a triple-quoted string.
  let at = src.indexOf('\n', m.index) + 1, open = false;
  while (at > 0 && at < src.length) {
    const next = src.indexOf('\n', at), line = src.slice(at, next < 0 ? src.length : next);
    if (!open && /^\S/.test(line)) break;
    if ((line.match(/"""/g) || []).length % 2) open = !open;
    if (next < 0) { at = src.length; break; }
    at = next + 1;
  }
  return src.slice(m.index, at);
}

// Every string literal of a fragment, decoded, in source order.
export const gdStrings = text => tokens(text).filter(tok => tok.type === 'string').map(tok => tok.value);
// Code lines of a fragment, trimmed, without blank or comment lines.
export const gdLines = text => text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
