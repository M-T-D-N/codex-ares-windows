// Standard Node implementation of the documented child-environment contract.
// No registry reads, shared workspace import, or mutation of the parent environment.
export function normalizeEnvironment(source, {windows = process.platform === 'win32'} = {}) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new TypeError('Environment must be a mapping');
  const env = Object.create(null);
  for (const [name, value] of Object.entries(source)) {
    if (!name || /[\0=]/.test(name) || typeof value !== 'string' || value.includes('\0')) throw new TypeError('Invalid environment entry');
    const key = windows ? name.toUpperCase() : name;
    if (Object.hasOwn(env, key) && env[key] !== value) throw new TypeError('Conflicting environment aliases');
    env[key] = value;
  }
  return env;
}
export function buildEnvironment(base, overrides = {}, {remove = [], prependPath = [], windows = process.platform === 'win32'} = {}) {
  if (typeof remove === 'string' || typeof prependPath === 'string') throw new TypeError('Environment operations require lists');
  const env = normalizeEnvironment(base, {windows});
  for (const name of remove) {
    const key = Object.keys(normalizeEnvironment({[name]: ''}, {windows}))[0];
    delete env[key];
  }
  Object.assign(env, normalizeEnvironment(overrides, {windows}));
  const separator = windows ? ';' : ':';
  const paths = Array.from(prependPath);
  if (paths.some(p => typeof p !== 'string' || !p || p.includes('\0') || p.includes(separator))) throw new TypeError('Invalid PATH prefix');
  if (paths.length) env.PATH = paths.join(separator) + (env.PATH ? separator + env.PATH : '');
  return env;
}
