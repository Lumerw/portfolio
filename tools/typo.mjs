// Typografia PDF i CV: bez wiszących spójników i przyimków (jednoliterowe słowo przyklejone twardą spacją
// do następnego) i bez półpauzy na początku linii (twarda spacja przed „ - ”). Tylko tekst - znaczniki,
// atrybuty oraz zawartość <style> i <script> zostają bez zmian.
const fix = t => t
  .replace(/(^|[\s(„"])([aiouwzAIOUWZ]) /g, '$1$2 ')
  .replace(/ - /g, ' - ');

export const typo = html => html.replace(/(<(style|script)\b[\s\S]*?<\/\2>)|>([^<]+)</g,
  (m, block, tag, text) => block ?? `>${fix(fix(text))}<`);   // dwa razy: „i w ” - sąsiednie słowa
