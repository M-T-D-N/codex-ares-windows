// Selection comes from the authenticated native checkpoint, never a thread registry.
const selections = Object.freeze({
  'Astra-Jev': ['gpt-6-astra', 'luna-continuous-1'],
  'Sol-Jev': ['gpt-6-sol', 'luna-continuous-1'],
  'Astra-Jev-Main': ['gpt-6-astra', 'jev-main-1'],
  'Sol-Jev-Main': ['gpt-6-sol', 'jev-main-1'],
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
