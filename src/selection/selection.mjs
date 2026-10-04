// Selection comes from the authenticated native checkpoint, never a thread registry.
const selections = Object.freeze({
  'Astra-Jev': ['gpt-6-astra', 'luna-continuous-1'],
  'Sol-Jev': ['gpt-6-sol', 'luna-continuous-1'],
  'Sol 6.1-Ares': ['gpt-6.1-sol', 'luna-continuous-1'],
  'Sol61-Ares': ['gpt-6.1-sol', 'luna-continuous-1'], // Saved selection compatibility.
});

export function resolveSelection(checkpoint) {
  const pair = Object.hasOwn(selections, checkpoint?.selectionAlias ?? '')
    ? selections[checkpoint.selectionAlias] : null;
  if (!pair || checkpoint.project?.rootUser !== true
      || checkpoint.model !== pair[0] || checkpoint.route !== pair[1])
    throw new Error('Unsupported or mismatched native Ares selection');
  return {alias: checkpoint.selectionAlias, model: pair[0], route: pair[1]};
}

export function assertSameSelection(checkpoint, selected) {
  const next = resolveSelection(checkpoint);
  if (next.alias !== selected.alias || next.model !== selected.model || next.route !== selected.route)
    throw new Error('Native selection changed within a controller connection');
}
