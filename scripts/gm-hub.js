/**
 * Lisa's Dungeon VQ2 Foundry GM Hub.
 * Copyright © 2026 Lisa's Dungeon
 * Contributor: Lisa's Dungeon
 *
 * This file is loaded only when the settings-menu application is opened.
 * It renders controls for the bounded API and never handles documents,
 * chat, credentials, arbitrary paths, or executable code.
 */

import {
  applyFoundryAction as applyFoundryRuntimeAction,
  loadRuntimeState,
  normalizeRuntimeAction,
  readFoundryRuntimeState
} from './runtime.js?rev=0.2.1';
import { broadcastFoundryPlan } from './foundry-socket.js?rev=0.2.1';

export const GM_HUB_MARKUP = `
  <section class="ld-vq2-hub" aria-label="VQ2 optimizer GM hub">
    <header class="ld-vq2-hub__header">
      <div>
        <h2>VQ2 Optimizer</h2>
        <p>Preview telemetry and bounded relay plans before applying anything.</p>
      </div>
      <span class="ld-vq2-hub__badge" data-value="gateway">unknown</span>
    </header>
    <div class="ld-vq2-hub__notice" data-value="message" role="status">Ready.</div>
    <div class="ld-vq2-hub__grid">
      <section class="ld-vq2-hub__card">
        <h3>Runtime snapshot</h3>
        <dl class="ld-vq2-hub__facts">
          <div><dt>FPS</dt><dd data-value="fps">unknown</dd></div>
          <div><dt>FPS limit</dt><dd data-value="fps-cap">unknown</dd></div>
          <div><dt>Frame time</dt><dd data-value="frame-time">unknown</dd></div>
          <div><dt>Cores</dt><dd data-value="cores">unknown</dd></div>
          <div><dt>Device memory</dt><dd data-value="device-memory">unknown</dd></div>
          <div><dt>WebGPU</dt><dd data-value="webgpu">unknown</dd></div>
          <div><dt>WASM</dt><dd data-value="wasm">unknown</dd></div>
        </dl>
        <div class="ld-vq2-hub__actions">
          <button type="button" data-vq2-action="refresh">Refresh status</button>
          <button type="button" data-vq2-action="telemetry">Send telemetry</button>
        </div>
      </section>
      <section class="ld-vq2-hub__card">
        <h3>Preview plan</h3>
        <label>Profile<select data-field="profile">
          <option value="balanced">Balanced</option>
          <option value="power">Power</option>
          <option value="performance">Performance</option>
          <option value="low-latency">Low latency</option>
          <option value="battery-mobile">Battery / mobile</option>
        </select></label>
        <label>Scope<select data-field="scope">
          <option value="self">This client</option>
          <option value="all">All clients</option>
          <option value="selected">Selected opaque client IDs</option>
        </select></label>
        <label data-field-wrap="targets">Client IDs<input data-field="targets" type="text" maxlength="1024" placeholder="id-one, id-two"></label>
        <fieldset class="ld-vq2-hub__fieldset">
          <legend>Foundry controls</legend>
          <label class="ld-vq2-hub__range"><span>FPS target / ticker limit <output data-range-value="fps-cap">60 FPS</output></span><input data-field="fps-cap" type="range" min="15" max="240" step="1" value="60"></label>
          <label class="ld-vq2-hub__range"><span>Render distance <output data-range-value="render-distance">16</output></span><input data-field="render-distance" type="range" min="2" max="32" step="1" value="16"></label>
          <label class="ld-vq2-hub__range"><span>Render resolution <output data-range-value="render-resolution">1.00x</output></span><input data-field="render-resolution" type="range" min="0.5" max="2" step="0.05" value="1"></label>
          <label class="ld-vq2-hub__range"><span>Module cache budget (MB) <output data-range-value="cache-size">512 MB</output></span><input data-field="cache-size" type="range" min="0" max="4096" step="1" value="512"></label>
          <label class="ld-vq2-hub__range"><span>CPU workload batch <output data-range-value="batch-size">16</output></span><input data-field="batch-size" type="range" min="1" max="256" step="1" value="16"></label>
          <label class="ld-vq2-hub__range"><span>Effects budget (%) <output data-range-value="effects-budget">60%</output></span><input data-field="effects-budget" type="range" min="0" max="100" step="1" value="60"></label>
          <label class="ld-vq2-hub__range"><span>Animation budget (%) <output data-range-value="animation-budget">60%</output></span><input data-field="animation-budget" type="range" min="0" max="100" step="1" value="60"></label>
          <label class="ld-vq2-hub__range"><span>Network batch budget <output data-range-value="network-batch">16</output></span><input data-field="network-batch" type="range" min="1" max="128" step="1" value="16"></label>
          <label>Runtime variant<select data-field="runtime-variant">
            <option value="">Profile default</option>
            <option value="lite">Lite</option>
            <option value="standard">Standard</option>
            <option value="wasm">WASM</option>
            <option value="server">Server</option>
          </select></label>
          <label>Component<select data-field="component">
            <option value="">No component change</option>
            <option value="effects">Effects</option>
            <option value="animations">Animations</option>
            <option value="shadows">Shadows</option>
            <option value="post-processing">Post-processing</option>
            <option value="lighting">Lighting</option>
            <option value="grid">Grid</option>
            <option value="audio">Audio</option>
          </select></label>
          <label>Component action<select data-field="component-action">
            <option value="disable">Disable selected component</option>
            <option value="enable">Enable selected component</option>
          </select></label>
          <label class="ld-vq2-hub__checkbox"><input data-field="clear-cache" type="checkbox"> Clear module-owned caches (explicit apply)</label>
        </fieldset>
        <p class="ld-vq2-hub__hint">Sliders start at the selected profile defaults and reset to that profile when it changes. These controls change bounded Foundry/module runtime budgets; they do not change OS driver settings, user files, or arbitrary Foundry setting paths. FPS sets the Foundry ticker target/limit and cannot create frames beyond the client hardware or display.</p>
        <button type="button" data-vq2-action="plan">Preview plan</button>
      </section>
    </div>
    <section class="ld-vq2-hub__card">
      <h3>Plan review</h3>
      <pre data-value="plan-actions">No actions proposed.</pre>
      <pre data-value="plan">No plan previewed.</pre>
      <h3>Optimization coverage</h3>
      <pre data-value="optimization-status">No optimization status available.</pre>
      <div class="ld-vq2-hub__actions">
        <button type="button" data-vq2-action="cleanup">Review cleanup candidates</button>
        <button type="button" data-vq2-action="apply" disabled>Apply reviewed plan</button>
      </div>
      <pre data-value="verification">No applied setting verified.</pre>
      <pre data-value="runtime-state">No runtime state.</pre>
    </section>
    <details class="ld-vq2-hub__details">
      <summary>Relay details</summary>
      <pre data-value="clients">No client snapshot.</pre>
      <pre data-value="result">No operation result.</pre>
    </details>
  </section>`;

const PROFILES = Object.freeze(['power', 'balanced', 'performance', 'low-latency', 'battery-mobile']);
const SCOPES = Object.freeze(['self', 'all', 'selected']);
const OPAQUE_CLIENT_ID = /^client_[A-Za-z0-9_-]{20,}$/;
const FPS_CAP_MIN = 15;
const FPS_CAP_MAX = 240;
const RANGE_FIELDS = Object.freeze(['fps-cap', 'render-distance', 'render-resolution', 'cache-size', 'batch-size', 'effects-budget', 'animation-budget', 'network-batch']);
const PROFILE_DEFAULTS = Object.freeze({
  power: Object.freeze({ 'fps-cap': 120, 'render-distance': 24, 'render-resolution': 1.25, 'cache-size': 1024, 'batch-size': 32, 'effects-budget': 85, 'animation-budget': 85, 'network-batch': 32, 'runtime-variant': 'standard' }),
  balanced: Object.freeze({ 'fps-cap': 60, 'render-distance': 16, 'render-resolution': 1, 'cache-size': 512, 'batch-size': 16, 'effects-budget': 60, 'animation-budget': 60, 'network-batch': 16, 'runtime-variant': 'standard' }),
  performance: Object.freeze({ 'fps-cap': 144, 'render-distance': 24, 'render-resolution': 1.25, 'cache-size': 1024, 'batch-size': 32, 'effects-budget': 85, 'animation-budget': 85, 'network-batch': 32, 'runtime-variant': 'wasm' }),
  'low-latency': Object.freeze({ 'fps-cap': 144, 'render-distance': 16, 'render-resolution': 1, 'cache-size': 512, 'batch-size': 64, 'effects-budget': 60, 'animation-budget': 40, 'network-batch': 64, 'runtime-variant': 'wasm' }),
  'battery-mobile': Object.freeze({ 'fps-cap': 30, 'render-distance': 8, 'render-resolution': 0.75, 'cache-size': 256, 'batch-size': 8, 'effects-budget': 25, 'animation-budget': 25, 'network-batch': 8, 'runtime-variant': 'lite' })
});

function field(root, name) {
  return root.querySelector(`[data-field="${name}"]`);
}

function value(root, name) {
  return field(root, name)?.value || '';
}
function rangeText(name, rawValue) {
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return 'profile default';
  if (name === 'fps-cap') return `${numeric} FPS`;
  if (name === 'render-resolution') return `${numeric.toFixed(2)}x`;
  if (name === 'cache-size') return `${numeric} MB`;
  if (name === 'effects-budget' || name === 'animation-budget') return `${numeric}%`;
  return String(numeric);
}
function updateRangeOutput(root, name) {
  const outputNode = root.querySelector(`[data-range-value="${name}"]`);
  if (outputNode) outputNode.textContent = rangeText(name, value(root, name));
}

function applyProfileDefaults(root, profile) {
  const defaults = PROFILE_DEFAULTS[profile];
  if (!defaults) return;
  for (const name of RANGE_FIELDS) {
    const input = field(root, name);
    if (input) input.value = String(defaults[name]);
    updateRangeOutput(root, name);
  }
  const runtimeVariant = field(root, 'runtime-variant');
  if (runtimeVariant) runtimeVariant.value = defaults['runtime-variant'];
}

function bindRangeControls(root) {
  for (const name of RANGE_FIELDS) {
    field(root, name)?.addEventListener('input', () => updateRangeOutput(root, name));
    updateRangeOutput(root, name);
  }
}

function checked(root, name) {
  return field(root, name)?.checked === true;
}

function output(root, name, text) {
  const node = root.querySelector(`[data-value="${name}"]`);
  if (node) node.textContent = String(text);
}

export function json(valueToPrint) {
  try {
    return JSON.stringify(valueToPrint ?? {}, null, 2);
  } catch {
    return '{}';
  }
}

export function parseClientIds(input) {
  return String(input || '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => OPAQUE_CLIENT_ID.test(item))
    .slice(0, 128);
}

export function parseFpsCap(input) {
  const valueToParse = String(input ?? '').trim();
  if (!valueToParse) return null;
  const parsed = Number(valueToParse);
  if (!Number.isInteger(parsed) || parsed < FPS_CAP_MIN || parsed > FPS_CAP_MAX) {
    throw new RangeError(`FPS cap must be an integer from ${FPS_CAP_MIN}-${FPS_CAP_MAX}`);
  }
  return parsed;
}

export function parseOptionalNumber(input, label) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new RangeError(`${label} must be a finite number`);
  return parsed;
}

export function buildPlanRequest(root, telemetry) {
  const profile = value(root, 'profile') || 'balanced';
  const scope = value(root, 'scope') || 'self';
  if (!PROFILES.includes(profile) || !SCOPES.includes(scope)) throw new Error('Invalid GM Hub plan selection');
  const requestedActions = [];
  const numericFields = [
    ['fps-cap', 'set-fps-cap', 'fps.cap', parseFpsCap],
    ['render-distance', 'set-quality', 'render.distance', (input) => parseOptionalNumber(input, 'Render distance')],
    ['render-resolution', 'set-quality', 'render.resolution', (input) => parseOptionalNumber(input, 'Render resolution')],
    ['cache-size', 'set-cache-size', 'cache.size', (input) => parseOptionalNumber(input, 'Cache size')],
    ['batch-size', 'set-batch-size', 'batch.size', (input) => parseOptionalNumber(input, 'Batch size')],
    ['effects-budget', 'set-effect-budget', 'effects.budget', (input) => parseOptionalNumber(input, 'Effects budget')],
    ['animation-budget', 'set-animation-budget', 'animation.budget', (input) => parseOptionalNumber(input, 'Animation budget')],
    ['network-batch', 'set-network-batch', 'network.batch', (input) => parseOptionalNumber(input, 'Network batch')]
  ];
  for (const [fieldName, type, key, parser] of numericFields) {
    const parsed = parser(value(root, fieldName));
    if (parsed !== null) requestedActions.push({ type, key, value: parsed });
  }
  const runtimeVariant = value(root, 'runtime-variant');
  if (runtimeVariant) requestedActions.push({ type: 'set-runtime-variant', key: runtimeVariant });
  const component = value(root, 'component');
  if (component) {
    requestedActions.push({
      type: value(root, 'component-action') === 'enable' ? 'enable-component' : 'disable-component',
      key: component
    });
  }
  if (checked(root, 'clear-cache')) requestedActions.push({ type: 'clear-cache', key: 'module-cache' });
  return {
    profile,
    scope,
    targetClientIds: scope === 'selected' ? parseClientIds(value(root, 'targets')) : [],
    requestedActions: requestedActions.map(normalizeRuntimeAction),
    telemetry
  };
}

export function formatPlanActions(actions) {
  if (!Array.isArray(actions) || actions.length === 0) return 'No actions proposed.';
  return actions.map((action, index) => {
    const valueText = action?.value === undefined ? '' : ` = ${action.value}`;
    return `${index + 1}. ${action?.type || 'unknown'} ${action?.key || 'unknown'}${valueText}`;
  }).join('\n');
}

export function applyFoundryAction(action, { ticker = globalThis.canvas?.app?.ticker } = {}) {
  if (action?.type !== 'set-fps-cap' || action.key !== 'fps.cap'
    || !Number.isInteger(action.value) || action.value < FPS_CAP_MIN || action.value > FPS_CAP_MAX) {
    throw new Error('Unsupported Foundry optimizer action');
  }
  if (!ticker || typeof ticker !== 'object') throw new Error('Foundry canvas ticker is unavailable');
  ticker.maxFPS = action.value;
  return { type: action.type, key: action.key, value: action.value };
}

export function readFoundryFpsCap(ticker = globalThis.canvas?.app?.ticker) {
  return Number.isFinite(ticker?.maxFPS) ? ticker.maxFPS : null;
}

function observed(value, suffix = '') {
  return Number.isFinite(value) ? `${value}${suffix}` : 'unavailable';
}

function actionMatches(action, predicate) {
  return typeof predicate === 'function' && predicate(action);
}

function coverageStatus(actions, verification, predicate) {
  const selected = actions.filter((action) => actionMatches(action, predicate));
  if (!selected.length) return 'NOT IN PLAN';
  if (!Array.isArray(verification?.actions)) return `PLANNED (${selected.length} action${selected.length === 1 ? '' : 's'})`;
  const verified = selected.every((action) => verification.actions.some((item) => (
    item.type === action.type && item.key === action.key && item.matches === true
  )));
  return verified ? 'VERIFIED' : `APPLY PENDING (${selected.length} action${selected.length === 1 ? '' : 's'})`;
}

export function describeOptimizationStatus({ telemetry = {}, plan = null, verification = null } = {}) {
  const runtime = telemetry?.runtime || {};
  const fps = telemetry?.fps || {};
  const actions = Array.isArray(plan?.actions) ? plan.actions : [];
  const fpsStatus = verification?.matches === true
    ? 'VERIFIED'
    : coverageStatus(actions, verification, (action) => action?.type === 'set-fps-cap');
  const cpuStatus = coverageStatus(actions, verification, (action) => [
    'set-batch-size', 'set-effect-budget', 'set-animation-budget'
  ].includes(action?.type));
  const ramStatus = coverageStatus(actions, verification, (action) => action?.type === 'set-cache-size');
  const gpuStatus = coverageStatus(actions, verification, (action) => action?.type === 'set-quality');
  const networkStatus = coverageStatus(actions, verification, (action) => action?.type === 'set-network-batch');
  const cacheStatus = coverageStatus(actions, verification, (action) => action?.type === 'clear-cache');
  const foundryStatus = coverageStatus(actions, verification, (action) => [
    'set-runtime-variant', 'enable-component', 'disable-component'
  ].includes(action?.type));
  const networkType = telemetry?.network?.effectiveType || 'unavailable';
  return [
    `FPS / frame pacing: ${fpsStatus} (live ${observed(fps.average)} FPS)`,
    `CPU workload: ${cpuStatus} (${observed(runtime.cores, ' logical cores')}; Foundry workload budgets)`,
    `RAM / module cache: ${ramStatus} (${observed(runtime.deviceMemoryGB, ' GB browser-reported')}; bounded module cache budget)`,
    `GPU / rendering: ${gpuStatus} (WebGPU ${runtime.webgpu === true ? 'available' : 'unavailable'}; renderer controls)`,
    `Network batching: ${networkStatus} (${networkType}; application batch budget)`,
    `Cache clear: ${cacheStatus} (module-owned caches only)`,
    `Runtime / components: ${foundryStatus}; no arbitrary setting paths`
  ].join('\n');
}

function notify(game, message, level = 'info') {
  const notification = game?.ui?.notifications?.[level];
  if (typeof notification === 'function') notification(message);
}

function busy(root, active) {
  for (const button of root.querySelectorAll('[data-vq2-action]')) button.disabled = active || button.dataset.action === 'apply';
}

function renderSnapshot(root, telemetry) {
  const fps = telemetry?.fps || {};
  const runtime = telemetry?.runtime || {};
  output(root, 'fps', fps.average ?? 'unknown');
  const currentCap = readFoundryFpsCap();
  output(root, 'fps-cap', currentCap === null ? 'uncapped or unavailable' : currentCap);
  output(root, 'frame-time', fps.frameTimeMs == null ? 'unknown' : `${fps.frameTimeMs} ms`);
  output(root, 'cores', runtime.cores ?? 'unknown');
  output(root, 'device-memory', runtime.deviceMemoryGB == null ? 'unknown' : `${runtime.deviceMemoryGB} GB`);
  output(root, 'webgpu', runtime.webgpu === true ? 'yes' : 'no');
  output(root, 'wasm', runtime.wasm === true ? 'yes' : 'no');
}

function actualForAction(action, runtimeState) {
  if (action.type === 'set-fps-cap') return runtimeState.tickerMaxFPS;
  if (action.type === 'set-runtime-variant') return runtimeState.runtime.runtimeVariant;
  if (action.type === 'enable-component') return !runtimeState.disabledComponents.includes(action.key);
  if (action.type === 'disable-component') return runtimeState.disabledComponents.includes(action.key);
  if (action.type === 'clear-cache') return Boolean(runtimeState.lastCacheClearAt);
  return runtimeState.settings[action.key];
}

function verifyActions(actions, runtimeState) {
  return actions.map((action) => {
    const actual = actualForAction(action, runtimeState);
    const expected = action.type === 'enable-component' ? true
      : action.type === 'disable-component' ? true
        : action.type === 'clear-cache' ? true : action.value ?? action.key;
    return { type: action.type, key: action.key, expected, actual, matches: actual === expected };
  });
}

function renderState(root, state) {
  output(root, 'gateway', state.status?.gateway || 'unknown');
  output(root, 'message', state.message);
  renderSnapshot(root, state.telemetry);
  output(root, 'plan-actions', formatPlanActions(state.plan?.actions));
  output(root, 'plan', state.plan ? json(state.plan) : 'No plan previewed.');
  output(root, 'optimization-status', describeOptimizationStatus(state));
  output(root, 'verification', state.verification ? json(state.verification) : 'No applied setting verified.');
  output(root, 'runtime-state', state.runtime ? json(state.runtime) : 'No runtime state.');
  output(root, 'clients', state.clients ? json(state.clients) : 'No client snapshot.');
  output(root, 'result', state.result ? json(state.result) : 'No operation result.');
  const apply = root.querySelector('[data-vq2-action="apply"]');
  if (apply) apply.disabled = !state.plan || state.busy;
  const targets = root.querySelector('[data-field="targets"]');
  if (targets) targets.disabled = value(root, 'scope') !== 'selected' || state.busy;
}

export async function renderGMHub({ root, game = globalThis.game, api } = {}) {
  if (!root || typeof root.querySelector !== 'function') throw new TypeError('GM Hub requires a root element');
  if (game?.user?.isGM !== true) {
    root.textContent = 'GM access is required.';
    return root;
  }
  if (!api) {
    root.textContent = 'VQ2 relay API is unavailable.';
    return root;
  }
  root.innerHTML = GM_HUB_MARKUP;
  await loadRuntimeState({ game });
  const state = {
    status: null, clients: null, telemetry: api.snapshot(), plan: null, result: null,
    runtime: readFoundryRuntimeState(), verification: null, message: 'Ready.', busy: false
  };
  const run = async (operation, successMessage) => {
    state.busy = true;
    state.message = 'Working...';
    renderState(root, state);
    busy(root, true);
    const finish = () => {
      state.busy = false;
      busy(root, false);
      renderState(root, state);
    };
    try {
      const result = await operation();
      state.message = successMessage;
      finish();
      return result;
    } catch (error) {
      state.message = error?.message || 'Relay operation failed.';
      notify(game, state.message, 'error');
      finish();
      return null;
    }
  };
  const refresh = () => run(async () => {
    const [status, clients] = await Promise.all([api.status(), api.clients()]);
    state.status = status;
    state.clients = clients;
    state.telemetry = api.snapshot();
    state.result = { status: 'refreshed' };
  }, 'Status refreshed.');
  const sendTelemetry = () => run(async () => {
    state.telemetry = api.snapshot();
    state.result = await api.telemetry(state.telemetry);
  }, 'Telemetry sent.');
  const previewPlan = () => run(async () => {
    state.plan = await api.plan(buildPlanRequest(root, state.telemetry));
    state.result = { status: 'preview-only', actionCount: state.plan.actions.length };
  }, 'Plan preview received.');
  const reviewCleanup = () => run(async () => {
    state.result = await api.cleanup({ categories: [], telemetry: state.telemetry });
  }, 'Cleanup candidates reviewed.');
  const applyPlan = () => run(async () => {
    if (!state.plan) throw new Error('Preview a plan before applying it');
    if (typeof globalThis.confirm !== 'function') throw new Error('Apply confirmation is unavailable');
    if (state.plan.actions.some((action) => action.type === 'clear-cache')
      && !globalThis.confirm('This plan will clear module-owned caches only. Continue?')) {
      state.message = 'Cache clear cancelled.';
      return;
    }
    if (!globalThis.confirm('Apply this reviewed VQ2 plan?')) {
      state.message = 'Apply cancelled.';
      return;
    }
    const relayResult = await api.apply(state.plan);
    const broadcast = state.plan.scope === 'self' ? null : broadcastFoundryPlan({ game, plan: state.plan });
    const applied = [];
    const rejected = [];
    if (state.plan.scope === 'self') {
      for (const action of state.plan.actions) {
        try {
          applied.push(await applyFoundryRuntimeAction(action, { game }));
        } catch (error) {
          rejected.push({ action, reason: error?.message || 'Action was rejected' });
        }
      }
    }
    state.runtime = readFoundryRuntimeState();
    const verificationActions = state.plan.scope === 'self'
      ? verifyActions(state.plan.actions, state.runtime)
      : state.plan.actions.map((action) => ({ type: action.type, key: action.key, matches: null, local: false }));
    state.result = {
      status: 'applied',
      relay: relayResult,
      broadcast,
      applied,
      rejected,
      deferred: state.plan.scope === 'self' ? [] : state.plan.actions
    };
    const expectedFpsCap = state.plan.actions.find((action) => action.type === 'set-fps-cap' && action.key === 'fps.cap')?.value ?? null;
    const currentFpsCap = state.plan.scope === 'self' ? readFoundryFpsCap() : null;
    state.verification = {
      relayAccepted: relayResult?.accepted === true,
      localClientVerified: state.plan.scope === 'self',
      actions: verificationActions,
      allMatched: state.plan.scope === 'self' && verificationActions.every((item) => item.matches === true),
      expectedFpsCap,
      currentFpsCap,
      matches: expectedFpsCap === null || state.plan.scope !== 'self' ? null : currentFpsCap === expectedFpsCap
    };
  }, 'Reviewed plan applied.');
  root.querySelector('[data-vq2-action="refresh"]')?.addEventListener('click', refresh);
  root.querySelector('[data-vq2-action="telemetry"]')?.addEventListener('click', sendTelemetry);
  root.querySelector('[data-vq2-action="plan"]')?.addEventListener('click', previewPlan);
  root.querySelector('[data-vq2-action="cleanup"]')?.addEventListener('click', reviewCleanup);
  root.querySelector('[data-vq2-action="apply"]')?.addEventListener('click', applyPlan);
  field(root, 'scope')?.addEventListener('change', () => renderState(root, state));
  field(root, 'profile')?.addEventListener('change', () => {
    applyProfileDefaults(root, value(root, 'profile'));
    renderState(root, state);
  });
  bindRangeControls(root);
  renderState(root, state);
  await refresh();
  return root;
}
