import { describe, expect, it } from 'vitest';
import { FbFormatRegistry, FbModule, prepareModule } from './module';

const def = (name: string, description?: string, color?: string) => ({ name, description, color });

describe('FbFormatRegistry', () => {
  it('registers a new type under its own name', () => {
    const registry = new FbFormatRegistry();

    expect(registry.register(def('score', 'A game score'), 'gm')).toBe('score');
    expect(registry.get('score')?.description).toBe('A game score');
  });

  it('shares a type whose definitions do not demonstrably differ', () => {
    const registry = new FbFormatRegistry();

    registry.seed(def('number'));

    // The seed has no description: the richer newcomer is the same type, and
    // its description is adopted as the identity from here on.
    expect(registry.register(def('number', 'A plain numeric value'), 'math')).toBe('number');
    expect(registry.get('number')?.description).toBe('A plain numeric value');
    expect(registry.register(def('number', 'A plain numeric value'), 'graph')).toBe('number');
  });

  it('prefixes a DIFFERENT type wearing an existing name', () => {
    const registry = new FbFormatRegistry();

    registry.register(def('point', 'A sampled coordinate: [x, y, ...]'), 'math');

    expect(registry.register(def('point', 'A score in tennis'), 'tennis')).toBe('tennis:point');
    // Both live side by side, each under its settled name.
    expect(registry.get('point')?.description).toContain('coordinate');
    expect(registry.get('tennis:point')?.description).toContain('tennis');
  });

  it('never lets a colour disagreement split a type', () => {
    const registry = new FbFormatRegistry();

    registry.register(def('number', 'A plain numeric value', '#111111'), 'a');

    expect(registry.register(def('number', 'A plain numeric value', '#222222'), 'b')).toBe('number');
  });
});

describe('prepareModule', () => {
  const tennis: FbModule = {
    name: 'Tennis',
    prefix: 'tennis',
    formats: [def('point', 'A score in tennis', '#ff0000')],
    types: {
      'tennis-rally': {
        component: (() => ({ destroy: () => undefined })) as never,
        settings: {
          title: 'Rally',
          sockets: [
            { type: 'in', format: 'point' },
            { type: 'out', formats: ['point', 'number'] },
          ],
        },
      },
    },
  };

  it('rewrites the sockets of a module whose type got prefixed', () => {
    const registry = new FbFormatRegistry();

    registry.register(def('point', 'A sampled coordinate: [x, y, ...]'), 'math');

    const prepared = prepareModule(tennis, registry);
    const sockets = prepared.types['tennis-rally'].settings.sockets!;

    expect(sockets[0].format).toBe('tennis:point');
    expect(sockets[1].formats).toEqual(['tennis:point', 'number']);
    // The colour follows the SETTLED name.
    expect(prepared.colors).toEqual({ 'tennis:point': '#ff0000' });
    // The module's own export is untouched: a re-enable starts clean.
    expect(tennis.types['tennis-rally'].settings.sockets![0].format).toBe('point');
  });

  it('leaves a module alone when nothing collides', () => {
    const registry = new FbFormatRegistry();
    const prepared = prepareModule(tennis, registry);

    expect(prepared.types).toBe(tennis.types);
    expect(prepared.colors).toEqual({ point: '#ff0000' });
  });
});

describe('assignable', () => {
  it('walks the refinement chain upward, never downward', () => {
    const registry = new FbFormatRegistry();

    registry.seed(def('number'));
    registry.register({ ...def('temperature', 'Degrees'), refines: 'number' }, 'th');
    registry.register({ ...def('celsius', 'Degrees Celsius'), refines: 'temperature' }, 'th');

    expect(registry.assignable('celsius', 'number')).toBe(true);
    expect(registry.assignable('celsius', 'temperature')).toBe(true);
    expect(registry.assignable('temperature', 'celsius')).toBe(false);
    expect(registry.assignable('number', 'temperature')).toBe(false);
    expect(registry.assignable('number', 'number')).toBe(true);
  });

  it('survives a cycle instead of hanging on it', () => {
    const registry = new FbFormatRegistry();

    registry.register({ ...def('a', 'A'), refines: 'b' }, 'x');
    registry.register({ ...def('b', 'B'), refines: 'a' }, 'x');

    expect(registry.assignable('a', 'c')).toBe(false);
  });

  it('treats a different base as a different type, whatever the words say', () => {
    const registry = new FbFormatRegistry();

    registry.register({ ...def('score', 'Points scored'), refines: 'number' }, 'game');

    // Same name and description, but refining something else: prefixed.
    expect(registry.register({ ...def('score', 'Points scored'), refines: 'text' }, 'quiz')).toBe('quiz:score');
  });

  it('renames a refinement whose base got prefixed', () => {
    const registry = new FbFormatRegistry();

    registry.register(def('point', 'A sampled coordinate: [x, y, ...]'), 'math');

    const tennis: FbModule = {
      name: 'Tennis',
      prefix: 'tennis',
      formats: [
        def('point', 'A score in tennis'),
        { ...def('advantage', 'Past deuce'), refines: 'point' },
      ],
      types: {},
    };

    prepareModule(tennis, registry);

    // The refinement follows its own module's PREFIXED point, not math's.
    expect(registry.get('tennis:advantage')?.refines ?? registry.get('advantage')?.refines).toBe('tennis:point');
    expect(registry.assignable('advantage', 'tennis:point')).toBe(true);
    expect(registry.assignable('advantage', 'point')).toBe(false);
  });
});
