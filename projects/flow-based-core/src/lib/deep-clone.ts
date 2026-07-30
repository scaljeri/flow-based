/**
 * Structural clone of a node type's default config, so that adding a node never
 * aliases the shared `settings.config` object from the type registry.
 *
 * This replaces a hand-rolled recursive walker that was broken two ways: on the
 * array branch it called `this.deepclone(item)` from inside a plain exported
 * function, so `this` was `undefined` *and* the name was misspelled — meaning
 * any config containing an array threw a TypeError. It also threw on `null`,
 * because `typeof null === 'object'` and `Object.keys(null)` fails.
 *
 * `structuredClone` is native in every supported browser and handles arrays,
 * nested objects, Dates, Maps and Sets. Note it rejects functions, which plain
 * JSON-shaped node configs never contain.
 */
export function deepClone<T>(obj: T): T;
export function deepClone(obj?: undefined): Record<string, unknown>;
export function deepClone<T>(obj?: T): T | Record<string, unknown> {
  // Preserves the old default-parameter behaviour: cloning nothing yields {}.
  if (obj === undefined) {
    return {};
  }

  return structuredClone(obj);
}
