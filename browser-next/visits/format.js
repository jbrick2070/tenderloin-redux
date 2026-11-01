// GDScript string formatting for copied Godot templates. Pure; no DOM.

// Godot 4 prints a float with up to 14 significant decimals, trailing zeros removed, and
// keeps ".0" on a whole number (String::num, then Variant's num_real). Wrap a value with
// gdFloat() wherever Godot formats a float (Vector2 components, float vars) with %s.
export function gdFloat(value) {
  const v = Number(value);
  if (Number.isNaN(v)) return 'nan';
  if (!Number.isFinite(v)) return v > 0 ? 'inf' : '-inf';
  if (Number.isInteger(v)) return `${v}.0`;
  let decimals = 14;
  const abs = Math.abs(v);
  if (abs > 10) decimals -= Math.floor(Math.log10(abs));
  decimals = Math.max(0, Math.min(16, decimals));
  let s = v.toFixed(decimals);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.includes('.') ? s : `${s}.0`;
}
// Godot Vector2 components are 32-bit floats.
export const f32 = Math.fround;

// `template % args` with %d, %s, %.Nf and %%. %d truncates toward zero; %s is String(v).
export function gdf(template, args = []) {
  const list = Array.isArray(args) ? args : [args];
  let i = 0;
  return template.replace(/%(%|d|s|\.(\d+)f)/g, (spec, kind, decimals) => {
    if (kind === '%') return '%';
    if (i >= list.length) throw Error(`Not enough arguments for ${JSON.stringify(template)}`);
    const v = list[i++];
    if (kind === 'd') return String(Math.trunc(Number(v)));
    if (kind === 's') return String(v);
    return Number(v).toFixed(Number(decimals));
  });
}

// Godot String.capitalize(): split camelCase, letter/digit boundaries and underscores into
// words, lowercase them, then uppercase each word's first letter ("1961 live jazz LP" -> "1961 Live Jazz Lp").
export function gdCapitalize(text) {
  const s = String(text), isUpper = c => c !== c.toLowerCase() && c === c.toUpperCase(), isLower = c => c !== c.toUpperCase() && c === c.toLowerCase(), isDigit = c => c >= '0' && c <= '9';
  let snake = '', start = 0;
  for (let i = 1; i < s.length; i++) {
    const p = s[i - 1], c = s[i], n = s[i + 1] ?? '';
    const a = isLower(p) && isUpper(c), b = (isUpper(p) || isDigit(p)) && isUpper(c) && isLower(n), cc = isDigit(p) && isLower(c) && isLower(n), d = (isUpper(p) || isLower(p)) && isDigit(c);
    if (a || b || cc || d) { snake += s.slice(start, i) + '_'; start = i; }
  }
  snake = (snake + s.slice(start)).toLowerCase().replace(/_/g, ' ').trim();
  return snake.split(' ').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}
