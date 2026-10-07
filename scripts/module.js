/**
 * Lisa's Dungeon VQ2 Foundry V14 module entry point.
 * Copyright © 2026 Lisa's Dungeon
 * Contributor: Lisa's Dungeon
 *
 * Only the API bridge is loaded. The VQ2 implementation remains server-side.
 */

export const MODULE_ID = 'ld-vq2-optimizer';
export const RELAY_SETTING = 'relayEndpoint';
export const GM_HUB_SETTING = 'gmHub';
export const RUNTIME_STATE_SETTING = 'runtimeState';
const ASSET_REVISION = '1.0.0';

function createGMHubType() {
  const ApplicationV2 = globalThis.foundry?.applications?.api?.ApplicationV2;
  if (typeof ApplicationV2 !== 'function') throw new TypeError('Foundry ApplicationV2 API is unavailable');
  return class GMHubApplication extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-gm-hub`,
      classes: [`${MODULE_ID}-window`],
      window: { title: 'VQ2 Optimizer GM Hub', resizable: true },
      position: { width: 900, height: 820 }
    };

    async _renderHTML(_context, _options) {
      const root = document.createElement('div');
      const module = globalThis.game?.modules?.get?.(MODULE_ID);
      const { renderGMHub } = await import(`./gm-hub.js?rev=${ASSET_REVISION}`);
      await renderGMHub({ root, game: globalThis.game, api: module?.api });
      return root;
    }

    _replaceHTML(result, content) {
      content.replaceChildren(result);
    }
  };
}

export function registerSettings({ game = globalThis.game } = {}) {
  if (typeof game?.settings?.register !== 'function') throw new TypeError('Foundry settings API is unavailable');
  if (typeof game.settings.registerMenu !== 'function') throw new TypeError('Foundry settings menu API is unavailable');
  game.settings.register(MODULE_ID, RELAY_SETTING, {
    name: 'VQ2 relay endpoint',
    hint: 'Use /optimizer/v1 for a same-origin Foundry reverse proxy.',
    scope: 'world',
    config: true,
    type: String,
    default: '/optimizer/v1'
  });
  game.settings.register(MODULE_ID, RUNTIME_STATE_SETTING, {
    name: 'VQ2 runtime state',
    scope: 'client',
    config: false,
    type: Object,
    default: {}
  });
  game.settings.registerMenu(MODULE_ID, GM_HUB_SETTING, {
    name: 'VQ2 Optimizer GM Hub',
    label: 'Open GM Hub',
    hint: 'Preview bounded telemetry and relay plans. GM control operations remain server-authenticated.',
    icon: 'fas fa-gauge-high',
    type: createGMHubType(),
    restricted: true
  });
}

export async function installApi({ game = globalThis.game, fetchFn = globalThis.fetch?.bind(globalThis) } = {}) {
  const module = game?.modules?.get?.(MODULE_ID);
  if (!module) throw new Error('VQ2 Foundry module is not registered');
  const baseUrl = game.settings.get(MODULE_ID, RELAY_SETTING);
  const { FoundryOptimizerApi, collectFoundryTelemetry } = await import(`./api.js?rev=${ASSET_REVISION}`);
  const api = new FoundryOptimizerApi({ baseUrl, fetchFn, gmCheck: () => game?.user?.isGM === true });
  module.api = Object.freeze({
    status: () => api.status(),
    clients: () => api.clients(),
    telemetry: (snapshot) => api.telemetry(snapshot || collectFoundryTelemetry()),
    plan: (options) => api.plan(options),
    cleanup: (options) => api.cleanup(options),
    apply: (plan) => api.apply(plan),
    snapshot: () => collectFoundryTelemetry()
  });
  return module.api;
}

export function registerHooks({ Hooks = globalThis.Hooks, game } = {}) {
  if (typeof Hooks?.once !== 'function') return false;
  const resolveGame = () => game ?? globalThis.game;
  Hooks.once('init', () => registerSettings({ game: resolveGame() }));
  Hooks.once('ready', async () => {
    try {
      const api = await installApi({ game: resolveGame() });
      await api.telemetry();
      const { registerFoundryPlanSocket } = await import(`./foundry-socket.js?rev=${ASSET_REVISION}`);
      registerFoundryPlanSocket({ game: resolveGame(), api });
    } catch (error) {
      console.warn(`[${MODULE_ID}] relay telemetry unavailable:`, error?.message || error);
    }
  });
  return true;
}

registerHooks();
