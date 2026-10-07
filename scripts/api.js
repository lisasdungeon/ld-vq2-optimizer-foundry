/**
 * Lisa's Dungeon VQ2 Foundry API bridge.
 * Copyright © 2026 Lisa's Dungeon
 * Contributor: Lisa's Dungeon
 *
 * This file is transport and validation only. VQ2 engines never ship in the
 * Foundry module and no server credential is stored or sent by this client.
 */

export const MODULE_ID = 'ld-vq2-optimizer';
export const PROTOCOL_VERSION = 1;
export const MAX_ACTIONS = 24;
export const FPS_CAP_MIN = 15;
export const FPS_CAP_MAX = 240;
export const PROFILES = Object.freeze(['power', 'balanced', 'performance', 'low-latency', 'battery-mobile']);
export const SCOPES = Object.freeze(['self', 'all', 'selected']);
const OPAQUE_CLIENT_ID = /^client_[A-Za-z0-9_-]{20,}$/;

const PATHS = Object.freeze({
  status: '/status',
  clients: '/clients',
  telemetry: '/telemetry',
  plan: '/plan',
  cleanup: '/cleanup/recommend',
  apply: '/control/apply'
});
const ACTION_KEYS = Object.freeze({
  'set-quality': Object.freeze({ 'render.distance': [2, 32], 'render.resolution': [0.5, 2] }),
  'set-cache-size': Object.freeze({ 'cache.size': [0, 4096] }),
  'set-batch-size': Object.freeze({ 'batch.size': [1, 256] }),
  'set-fps-cap': Object.freeze({ 'fps.cap': [FPS_CAP_MIN, FPS_CAP_MAX] }),
  'set-effect-budget': Object.freeze({ 'effects.budget': [0, 100] }),
  'set-animation-budget': Object.freeze({ 'animation.budget': [0, 100] }),
  'set-network-batch': Object.freeze({ 'network.batch': [1, 128] })
});
const KEY_ONLY_ACTIONS = Object.freeze({ 'clear-cache': new Set(['module-cache']) });
const ACTION_TYPES = new Set([
  ...Object.keys(ACTION_KEYS),
  'set-runtime-variant',
  'enable-component',
  'disable-component',
  'clear-cache'
]);
const VARIANTS = new Set(['lite', 'standard', 'wasm', 'server']);
const COMPONENT_KEY = /^[a-z0-9][a-z0-9-]{0,63}$/;

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function finite(value, min, max) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : null;
}

function safeString(value, max = 64) {
  return typeof value === 'string' && value.length <= max ? value : null;
}

export function normalizeBaseUrl(input = '/optimizer/v1') {
  const value = String(input || '/optimizer/v1').trim();
  if (value.startsWith('/')) {
    if (!/^\/optimizer\/v1\/?$/.test(value)) throw new TypeError('Relay endpoint must be /optimizer/v1');
    return '/optimizer/v1';
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError('Relay endpoint must be an HTTP(S) URL or /optimizer/v1');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.search || parsed.hash) {
    throw new TypeError('Relay endpoint URL is not allowed');
  }
  if (!/^\/optimizer\/v1\/?$/.test(parsed.pathname)) {
    throw new TypeError('Relay endpoint URL must end in /optimizer/v1');
  }
  return `${parsed.origin}/optimizer/v1`;
}

export function collectFoundryTelemetry({
  navigatorRef = globalThis.navigator,
  canvasRef = globalThis.canvas,
  wasmRef = globalThis.WebAssembly,
  performanceRef = globalThis.performance
} = {}) {
  const ticker = canvasRef?.app?.ticker;
  const connection = navigatorRef?.connection;
  const average = finite(ticker?.FPS, 0, 10000);
  const heap = performanceRef?.memory;
  return {
    fps: {
      average,
      frameTimeMs: finite(ticker?.deltaMS, 0, 600000)
    },
    memory: {
      ...(heap ? {
        usedMB: finite(heap.usedJSHeapSize / (1024 * 1024), 0, 1024 * 1024),
        limitMB: finite(heap.jsHeapSizeLimit / (1024 * 1024), 0, 1024 * 1024)
      } : {})
    },
    network: {
      latencyMs: finite(connection?.rtt, 0, 600000),
      jitterMs: null,
      effectiveType: safeString(connection?.effectiveType),
      saveData: connection?.saveData === true
    },
    workload: { tickerFPS: average },
    runtime: {
      mobile: navigatorRef?.userAgentData?.mobile === true,
      cores: finite(navigatorRef?.hardwareConcurrency, 0, 4096),
      deviceMemoryGB: finite(navigatorRef?.deviceMemory, 0, 4096),
      webgpu: Boolean(navigatorRef?.gpu),
      wasm: Boolean(wasmRef)
    }
  };
}

function validateAction(action) {
  if (!record(action) || !ACTION_TYPES.has(action.type)) throw new TypeError('Unsupported optimizer action');
  if (ACTION_KEYS[action.type]) {
    const bounds = ACTION_KEYS[action.type][action.key];
    if (!bounds || typeof action.value !== 'number' || !Number.isFinite(action.value)) {
      throw new TypeError('Bounded optimizer action is invalid');
    }
    if (action.value < bounds[0] || action.value > bounds[1]) throw new RangeError('Optimizer action is out of bounds');
    return { type: action.type, key: action.key, value: action.value };
  }
  if (KEY_ONLY_ACTIONS[action.type]) {
    if (!KEY_ONLY_ACTIONS[action.type].has(action.key)) throw new Error('Cache target is not allowed');
    return { type: action.type, key: action.key };
  }
  if (action.type === 'set-runtime-variant' && !VARIANTS.has(action.key)) throw new Error('Runtime variant is invalid');
  if ((action.type === 'enable-component' || action.type === 'disable-component')
    && (typeof action.key !== 'string' || !COMPONENT_KEY.test(action.key))) {
    throw new Error('Component key is invalid');
  }
  return { type: action.type, key: action.key };
}

export function validatePlan(plan, { now = Date.now } = {}) {
  if (!record(plan) || plan.protocolVersion !== PROTOCOL_VERSION) throw new TypeError('Optimizer plan protocol mismatch');
  if (!PROFILES.includes(plan.profile) || !SCOPES.includes(plan.scope)) throw new Error('Optimizer plan profile or scope is invalid');
  if (!Array.isArray(plan.actions) || plan.actions.length > MAX_ACTIONS) throw new RangeError('Optimizer plan action count is invalid');
  const timestamp = now();
  if (!Number.isFinite(timestamp)) throw new TypeError('Optimizer plan clock is invalid');
  const expiresAt = plan.expiresAt ? Date.parse(plan.expiresAt) : timestamp + 30000;
  if (!Number.isFinite(expiresAt) || expiresAt <= timestamp || expiresAt > timestamp + 30000) throw new Error('Optimizer plan expiration is invalid');
  return Object.freeze({
    protocolVersion: PROTOCOL_VERSION,
    planId: safeString(plan.planId, 128),
    profile: plan.profile,
    scope: plan.scope,
    targetClientIds: Array.isArray(plan.targetClientIds)
      ? plan.targetClientIds.filter((id) => typeof id === 'string' && OPAQUE_CLIENT_ID.test(id)).slice(0, 128)
      : [],
    expiresAt: new Date(expiresAt).toISOString(),
    actions: Object.freeze(plan.actions.map(validateAction)),
    recommendations: Object.freeze(Array.isArray(plan.recommendations)
      ? plan.recommendations.filter((item) => typeof item === 'string').slice(0, 32)
      : [])
  });
}

export function validateRequestedActions(actions = []) {
  if (!Array.isArray(actions) || actions.length > MAX_ACTIONS) throw new RangeError('Requested action count is invalid');
  return actions.map(validateAction);
}

function validateTargetClientIds(targetClientIds) {
  if (!Array.isArray(targetClientIds) || targetClientIds.length > 128) {
    throw new RangeError('Target client IDs must contain 0-128 opaque IDs');
  }
  if (targetClientIds.some((id) => typeof id !== 'string' || !OPAQUE_CLIENT_ID.test(id))) {
    throw new TypeError('Target client IDs must be opaque relay IDs');
  }
  return targetClientIds.slice();
}

function defaultGMCheck() {
  return globalThis.game?.user?.isGM === true;
}

export class FoundryOptimizerError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'FoundryOptimizerError';
    this.status = status;
  }
}

export class FoundryOptimizerApi {
  constructor({ baseUrl = '/optimizer/v1', fetchFn, gmCheck = defaultGMCheck, now = Date.now } = {}) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.fetchFn = fetchFn || globalThis.fetch?.bind(globalThis);
    this.gmCheck = gmCheck;
    this.now = now;
    this.clientId = null;
    if (typeof this.fetchFn !== 'function') throw new TypeError('FoundryOptimizerApi requires fetch');
    if (typeof this.gmCheck !== 'function') throw new TypeError('FoundryOptimizerApi requires a GM check');
    if (typeof this.now !== 'function') throw new TypeError('FoundryOptimizerApi requires a clock');
  }

  _url(path) {
    if (!Object.values(PATHS).includes(path)) throw new Error('Relay path is not allowed');
    return `${this.baseUrl}${path}`;
  }

  async _request(path, { method = 'GET', body } = {}) {
    const response = await this.fetchFn(this._url(path), {
      method,
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new FoundryOptimizerError('Relay returned invalid JSON', response.status);
    }
    if (!response.ok) throw new FoundryOptimizerError(data?.error || `Relay request failed: HTTP ${response.status}`, response.status);
    return data;
  }

  _requireGM() {
    if (this.gmCheck() !== true) throw new FoundryOptimizerError('GM access is required', 403);
  }

  status() { return this._request(PATHS.status); }
  clients() { return this._request(PATHS.clients); }

  async telemetry(snapshot = collectFoundryTelemetry()) {
    const response = await this._request(PATHS.telemetry, {
      method: 'POST',
      body: { protocolVersion: PROTOCOL_VERSION, telemetry: snapshot }
    });
    if (typeof response?.clientId === 'string' && OPAQUE_CLIENT_ID.test(response.clientId)) this.clientId = response.clientId;
    return response;
  }

  plan({ profile = 'balanced', scope = 'self', targetClientIds = [], telemetry = collectFoundryTelemetry(), requestedActions = [] } = {}) {
    this._requireGM();
    if (!PROFILES.includes(profile) || !SCOPES.includes(scope)) throw new Error('Plan profile or scope is invalid');
    return this._request(PATHS.plan, {
      method: 'POST',
      body: {
        protocolVersion: PROTOCOL_VERSION,
        previewOnly: true,
        profile,
        scope,
        targetClientIds: validateTargetClientIds(targetClientIds),
        telemetry,
        requestedActions: validateRequestedActions(requestedActions)
      }
    }).then((response) => validatePlan(response.plan, { now: this.now }));
  }

  cleanup({ categories = [], telemetry = collectFoundryTelemetry() } = {}) {
    this._requireGM();
    return this._request(PATHS.cleanup, {
      method: 'POST',
      body: { protocolVersion: PROTOCOL_VERSION, categories: Array.isArray(categories) ? categories.slice(0, 16) : [], telemetry }
    });
  }

  apply(plan) {
    this._requireGM();
    const safePlan = validatePlan(plan, { now: this.now });
    if (!safePlan.planId) throw new Error('Plan ID is required for apply');
    return this._request(PATHS.apply, {
      method: 'POST',
      body: { protocolVersion: PROTOCOL_VERSION, planId: safePlan.planId, scope: safePlan.scope, actionCount: safePlan.actions.length }
    });
  }
}
