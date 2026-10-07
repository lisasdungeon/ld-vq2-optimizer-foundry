/**
 * Lisa's Dungeon VQ2 bounded Foundry client dispatch.
 * Copyright © 2026 Lisa's Dungeon
 * Contributor: Lisa's Dungeon
 *
 * The relay authorizes the plan once. Foundry's documented module socket then
 * delivers the already-validated data-only plan to matching clients. No
 * server credential, code, setting path, or document data is sent.
 */

import { validatePlan } from './api.js';
import { applyFoundryAction } from './runtime.js?rev=0.2.1';

export const SOCKET_CHANNEL = 'module.ld-vq2-optimizer';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function notify(game, message, level = 'info') {
  const method = game?.ui?.notifications?.[level];
  if (typeof method === 'function') method(message);
}

function targetsClient(plan, clientId) {
  if (plan.scope === 'all') return true;
  return plan.scope === 'selected' && plan.targetClientIds.includes(clientId);
}

export function registerFoundryPlanSocket({ game = globalThis.game, api } = {}) {
  const socket = game?.socket;
  if (typeof socket?.on !== 'function') return false;
  const handler = async (message = {}) => {
    if (!isRecord(message) || message.type !== 'vq2.apply-plan') return false;
    const sender = game?.users?.get?.(message.senderUserId);
    if (sender?.isGM !== true || typeof api?.clientId !== 'string') return false;
    let plan;
    try {
      plan = validatePlan(message.plan);
    } catch {
      return false;
    }
    if (!targetsClient(plan, api.clientId)) return false;
    const applied = [];
    const rejected = [];
    for (const action of plan.actions) {
      try {
        applied.push(await applyFoundryAction(action, { game }));
      } catch (error) {
        rejected.push({ action, reason: error?.message || 'Action was rejected' });
      }
    }
    notify(game, `VQ2 plan applied: ${applied.length} applied, ${rejected.length} rejected`, rejected.length ? 'warn' : 'info');
    return { planId: plan.planId, applied, rejected };
  };
  socket.on(SOCKET_CHANNEL, handler);
  return handler;
}

export function broadcastFoundryPlan({ game = globalThis.game, plan } = {}) {
  if (!isRecord(plan) || !['all', 'selected'].includes(plan.scope)) {
    throw new Error('Only all-client or selected-client plans may be broadcast');
  }
  const safePlan = validatePlan(plan);
  if (typeof game?.user?.id !== 'string' || typeof game?.socket?.emit !== 'function') {
    throw new Error('Foundry plan socket is unavailable');
  }
  game.socket.emit(SOCKET_CHANNEL, {
    type: 'vq2.apply-plan',
    senderUserId: game.user.id,
    plan: safePlan
  });
  return { dispatched: true, planId: safePlan.planId, scope: safePlan.scope };
}
