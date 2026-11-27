function normalize(character) {
  return character.normalize('NFKC').toLowerCase()
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[\s\u00ad]/g, '');
}

export function findResumeAnchor(runs, quote) {
  const positions = [];
  let text = '';
  runs.forEach((run, index) => {
    let offset = 0;
    for (const character of run) {
      const normalized = normalize(character);
      text += normalized;
      for (let i = 0; i < normalized.length; i++) {
        positions.push({ index, start: offset, end: offset + character.length });
      }
      offset += character.length;
    }
  });

  const target = Array.from(quote, normalize).join('');
  if (!target) return [];
  const start = text.indexOf(target);
  if (start < 0 || text.indexOf(target, start + 1) >= 0) return [];

  const spans = [];
  for (const position of positions.slice(start, start + target.length)) {
    const previous = spans.at(-1);
    if (previous?.index === position.index) previous.end = position.end;
    else spans.push({ ...position });
  }
  return spans;
}
