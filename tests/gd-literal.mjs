// GDScript literals for the browser-next visit drift tests. Builds on tests/gd-lex.mjs (tokens,
// gdSource, gdFunc, gdStrings) and adds what the side-story files use: Vector3/Vector3i, null,
// `const NAME: Array[T] = …` and typed dictionaries. Vectors become arrays, Color("…") its string.
import { tokens, gdSource, gdFunc, gdStrings } from './gd-lex.mjs';

export { gdSource, gdFunc, gdStrings };

const CALLS = ['Vector2', 'Vector2i', 'Vector3', 'Vector3i', 'Rect2', 'Color'];
function literal(t, i) {
  const tok = t[i];
  if (!tok) throw Error('Unexpected end of literal');
  if (tok.type === 'string' || tok.type === 'number') return [tok.value, i + 1];
  if (tok.type === 'punct' && tok.value === '-' && t[i + 1]?.type === 'number') return [-t[i + 1].value, i + 2];
  if (tok.type === 'name' && (tok.value === 'true' || tok.value === 'false')) return [tok.value === 'true', i + 1];
  if (tok.type === 'name' && tok.value === 'null') return [null, i + 1];
  if (tok.type === 'name' && CALLS.includes(tok.value) && t[i + 1]?.value === '(') {
    const args = []; let j = i + 2;
    while (t[j].value !== ')') { const [v, k] = literal(t, j); args.push(v); j = t[k].value === ',' ? k + 1 : k; }
    return [tok.value === 'Color' && args.length === 1 ? args[0] : args, j + 1];
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

// The value of `const NAME := …`, `const NAME = …` or `const NAME: Type = …` in godot/<file>.
export function gdConst(file, name) {
  const src = gdSource(file);
  const m = new RegExp(`^const ${name}\\s*(?::=|=|:[^=\\n]*=)\\s*`, 'm').exec(src);
  if (!m) throw Error(`const ${name} is missing from godot/${file}`);
  return literal(tokens(src.slice(m.index + m[0].length)), 0)[0];
}

// The value of a script-level `var NAME := …`, `var NAME = …` or `var NAME: Type = …` in godot/<file>, read as gdConst reads a
// const: a literal initializer only (main.gd's `neighbors` table, for one).
export function gdVar(file, name) {
  const src = gdSource(file);
  const m = new RegExp(`^var ${name}\\s*(?::=|=|:[^=\\n]*=)\\s*`, 'm').exec(src);
  if (!m) throw Error(`var ${name} is missing from godot/${file}`);
  return literal(tokens(src.slice(m.index + m[0].length)), 0)[0];
}

// String literals of a JavaScript function's source (from fn.toString()), decoded, in order.
// Skips // and /* */ comments; template literals are read without interpolation.
const JS_ESCAPES = { n: '\n', t: '\t', r: '\r', '0': '\0' };
export function jsStrings(source) {
  const out = [];
  for (let i = 0; i < source.length;) {
    if (source.startsWith('//', i)) { while (i < source.length && source[i] !== '\n') i++; continue; }
    if (source.startsWith('/*', i)) { const e = source.indexOf('*/', i + 2); i = e < 0 ? source.length : e + 2; continue; }
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1, value = '';
      while (j < source.length && source[j] !== ch) {
        if (source[j] === '\\') { const e = source[j + 1]; value += Object.hasOwn(JS_ESCAPES, e) ? JS_ESCAPES[e] : e; j += 2; }
        else value += source[j++];
      }
      out.push(value); i = j + 1; continue;
    }
    i++;
  }
  return out;
}

// Each wanted value appears in `have` in this order (a subsequence); returns the first miss or null.
export function firstMissingInOrder(have, wanted) {
  let at = -1;
  for (const want of wanted) {
    const i = have.findIndex((v, j) => j > at && v === want);
    if (i < 0) return want;
    at = i;
  }
  return null;
}
