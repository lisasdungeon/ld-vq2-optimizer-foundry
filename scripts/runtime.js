/**
 * Lisa's Dungeon VQ2 bounded Foundry runtime adapter.
 * Copyright © 2026 Lisa's Dungeon
 * Contributor: Lisa's Dungeon
 *
 * This adapter applies validated, module-owned controls only. It does not
 * change OS scheduler priority, allocate arbitrary browser memory, modify GPU
 * drivers, or touch Foundry/user files and caches outside this module.
 */

export const MODULE_ID = 'ld-vq2-optimizer';
export const RUNTIME_STATE_KEY = 'runtimeState';
const MAX_ACTIONS = 24;
const ACTION_KEYS = Object.freeze({
  'set-quality': Object.freeze({ 'render.distance': [2, 32], 'render.resolution': [0.5, 2] }),
  'set-cache-size': Object.freeze({ 'cache.size': [0, 4096] }),
  'set-batch-size': Object.freeze({ 'batch.size': [1, 256] }),
  'set-fps-cap': Object.freeze({ 'fps.cap': [15, 240] }),
  'set-effect-budget': Object.freeze({ 'effects.budget': [0, 100] }),
  'set-animation-budget': Object.freeze({ 'animation.budget': [0, 100] }),
  'set-network-batch': Object.freeze({ 'network.batch': [1, 128] })
});
const ACTION_TYPES = new Set([
  ...Object.keys(ACTION_KEYS),
  'set-runtime-variant',
  'enable-component',
  'disable-component',
  'clear-cache'
]);
const VARIANTS = new Set(['lite', 'standard', 'wasm', 'server']);
const COMPONENT_KEY = /^[a-z0-9][a-z0-9-]{0,63}$/;

const DEFAULT_STATE = Object.freeze({
  settings: {},
  runtime: {
    fpsCap: null,
    effectsBudget: null,
    animationBudget: null,
    networkBatch: null,
    runtimeVariant: null
  },
  disabledComponents: [],
  lastCacheClearAt: null
});

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function finite(value) {
  return Number.isFinite(value) ? value : null;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stateStore(globalRef = globalThis) {
  if (!record(globalRef.__LD_VQ2_RUNTIME_STATE)) globalRef.__LD_VQ2_RUNTIME_STATE = clone(DEFAULT_STATE);
  return globalRef.__LD_VQ2_RUNTIME_STATE;
}

function normalizeState(value) {
  const source = record(value) ? value : {};
  const settings = record(source.settings) ? source.settings : {};
  const runtime = record(source.runtime) ? source.runtime : {};
  return {
    settings: Object.fromEntries(Object.entries(settings)
      .filter(([key, item]) => typeof key === 'string' && key.length <= 64 && Number.isFinite(item))),
    runtime: {
      fpsCap: finite(runtime.fpsCap),
      effectsBudget: finite(runtime.effectsBudget),
      animationBudget: finite(runtime.animationBudget),
      networkBatch: finite(runtime.networkBatch),
      runtimeVariant: typeof runtime.runtimeVariant === 'string' ? runtime.runtimeVariant.slice(0, 32) : null
    },
    disabledComponents: Array.isArray(source.disabledComponents)
      ? source.disabledComponents.filter((item) => typeof item === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(item)).slice(0, 64)
      : [],
    lastCacheClearAt: typeof source.lastCacheClearAt === 'string' ? source.lastCacheClearAt : null
  };
}

export function normalizeRuntimeAction(action) {
  if (!record(action) || !ACTION_TYPES.has(action.type)) throw new TypeError('Unsupported optimizer action');
  if (ACTION_KEYS[action.type]) {
    const bounds = ACTION_KEYS[action.type][action.key];
    if (!bounds || typeof action.value !== 'number' || !Number.isFinite(action.value)) {
      throw new TypeError('Bounded optimizer action is invalid');
    }
    if (action.value < bounds[0] || action.value > bounds[1]) throw new RangeError('Optimizer action is out of bounds');
    return { type: action.type, key: action.key, value: action.value };
  }
  if (action.type === 'clear-cache') {
    if (action.key !== 'module-cache') throw new Error('Cache target is not allowed');
    return { type: action.type, key: action.key };
  }
  if (action.type === 'set-runtime-variant' && !VARIANTS.has(action.key)) {
    throw new Error('Runtime variant is invalid');
  }
  if ((action.type === 'enable-component' || action.type === 'disable-component')
    && (typeof action.key !== 'string' || !COMPONENT_KEY.test(action.key))) {
    throw new Error('Component key is invalid');
  }
  return { type: action.type, key: action.key };
}

export function normalizeRuntimeActions(actions = []) {
  if (!Array.isArray(actions) || actions.length > MAX_ACTIONS) throw new RangeError('Requested action count is invalid');
  return actions.map(normalizeRuntimeAction);
}

export async function loadRuntimeState({ game = globalThis.game, globalRef = globalThis } = {}) {
  const stored = await Promise.resolve(game?.settings?.get?.(MODULE_ID, RUNTIME_STATE_KEY));
  const state = normalizeState(stored);
  globalRef.__LD_VQ2_RUNTIME_STATE = state;
  return clone(state);
}

async function persistRuntimeState(game, state) {
  const settings = game?.settings;
  if (typeof settings?.set !== 'function') return false;
  await settings.set(MODULE_ID, RUNTIME_STATE_KEY, clone(state));
  return true;
}

function setValue(state, key, value) {
  state.settings[key] = value;
}

function applyDirect(action, { canvas = globalThis.canvas, globalRef = globalThis } = {}) {
  const state = stateStore(globalRef);
  switch (action.type) {
    case 'set-quality':
    case 'set-cache-size':
    case 'set-batch-size':
      setValue(state, action.key, action.value);
      if (action.key === 'render.resolution' && record(canvas?.app?.renderer)) {
        canvas.app.renderer.resolution = action.value;
      }
      break;
    case 'set-fps-cap':
      setValue(state, action.key, action.value);
      state.runtime.fpsCap = action.value;
      if (record(canvas?.app?.ticker)) canvas.app.ticker.maxFPS = action.value;
      break;
    case 'set-effect-budget':
      setValue(state, action.key, action.value);
      state.runtime.effectsBudget = action.value;
      globalRef.__LD_VQ2_EFFECT_BUDGET = action.value;
      break;
    case 'set-animation-budget':
      setValue(state, action.key, action.value);
      state.runtime.animationBudget = action.value;
      globalRef.__LD_VQ2_ANIMATION_BUDGET = action.value;
      break;
    case 'set-network-batch':
      setValue(state, action.key, action.value);
      state.runtime.networkBatch = action.value;
      globalRef.__LD_VQ2_NETWORK_BATCH = action.value;
      break;
    case 'set-runtime-variant':
      setValue(state, 'runtime.variant', action.key);
      state.runtime.runtimeVariant = action.key;
      break;
    case 'enable-component':
      state.disabledComponents = state.disabledComponents.filter((key) => key !== action.key);
      break;
    case 'disable-component':
      if (!state.disabledComponents.includes(action.key)) state.disabledComponents.push(action.key);
      state.disabledComponents = state.disabledComponents.slice(0, 64);
      break;
    case 'clear-cache':
      throw new Error('Cache clearing requires the asynchronous runtime adapter');
    default:
      throw new Error(`Unsupported Foundry optimizer action: ${action.type}`);
  }
  return { type: action.type, key: action.key, ...(action.value === undefined ? {} : { value: action.value }) };
}

async function clearOwnedCaches({ game = globalThis.game, canvas = globalThis.canvas, globalRef = globalThis } = {}) {
  let cleared = 0;
  const cacheStorage = globalRef.caches;
  if (typeof cacheStorage?.keys === 'function' && typeof cacheStorage.delete === 'function') {
    const keys = await cacheStorage.keys();
    for (const key of keys.filter((item) => typeof item === 'string' && item.startsWith(`${MODULE_ID}:`))) {
      if (await cacheStorage.delete(key)) cleared += 1;
    }
  }
  const localCache = globalRef.__LD_VQ2_CACHE;
  if (typeof localCache?.clear === 'function') {
    localCache.clear();
    cleared += 1;
  }
  const moduleCache = game?.modules?.get?.(MODULE_ID)?.optimizerCache;
  if (typeof moduleCache?.clear === 'function') {
    moduleCache.clear();
    cleared += 1;
  }
  const textureGc = canvas?.app?.renderer?.textureGC;
  if (typeof textureGc?.run === 'function') {
    try {
      textureGc.run();
      cleared += 1;
    } catch {
      // Renderer cache collection is optional and must not widen cache scope.
    }
  }
  const state = stateStore(globalRef);
  state.lastCacheClearAt = new Date().toISOString();
  return cleared;
}

export async function applyFoundryAction(action, {
  game = globalThis.game,
  canvas = globalThis.canvas,
  globalRef = globalThis
} = {}) {
  const safe = normalizeRuntimeAction(action);
  if (safe.type === 'clear-cache') {
    const cleared = await clearOwnedCaches({ game, canvas, globalRef });
    await persistRuntimeState(game, stateStore(globalRef));
    return { ...safe, cleared }; 
  }
  const result = applyDirect(safe, { canvas, globalRef });
  if (safe.type === 'set-fps-cap') {
    const setting = game?.settings?.settings?.get?.('core.maxFPS');
    if (setting && typeof game?.settings?.set === 'function') {
      await game.settings.set('core', 'maxFPS', safe.value);
    }
  }
  await persistRuntimeState(game, stateStore(globalRef));
  return result;
}

export function readFoundryRuntimeState({ canvas = globalThis.canvas, globalRef = globalThis } = {}) {
  const state = stateStore(globalRef);
  return {
    ...clone(state),
    tickerMaxFPS: finite(canvas?.app?.ticker?.maxFPS),
    rendererResolution: finite(canvas?.app?.renderer?.resolution)
  };
}
