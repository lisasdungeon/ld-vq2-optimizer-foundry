# Lisa's Dungeon VQ2 Optimizer for Foundry VTT

This public module targets Foundry VTT V14 and contains only the client API bridge,
bounded GM Hub, runtime adapter, socket bridge, and module-owned styles.
It does not include VQ2 engines, libraries, turbos, server credentials, raw
chat or document data, executable plans, or arbitrary setting paths.

## Installation

In Foundry VTT, install the module from this manifest URL:

`https://github.com/lisasdungeon/ld-vq2-optimizer-foundry/releases/latest/download/module.json`

For a manual install, download the `ld-vq2-optimizer-foundry-1.0.0.zip` asset
from the `v1.0.0` GitHub release and extract the `ld-vq2-optimizer` directory
into the Foundry `Data/modules` directory.

After `ready`, the module exposes:

```js
game.modules.get('ld-vq2-optimizer').api
```

The API supports bounded status, client, telemetry, plan, cleanup, and apply
requests. The default relay endpoint is `/optimizer/v1`, which requires the
same-origin server reverse-proxy route to the private VQ2 relay. Plan previews
are explicitly read-only; cleanup and apply calls remain client-gated and
server-authenticated. The module never carries the server credential.

GMs can open `VQ2 Optimizer GM Hub` from the module settings menu. The hub is
preview-first: status, telemetry, cleanup recommendations, and plan previews
are trigger-based. The selected profile supplies bounded actions for FPS,
render/GPU quality, CPU workload, module cache/RAM budget, effects, animations,
runtime variant, and application network batching. Explicit Hub fields override
profile values. Applying a plan requires GM relay authorization; module-owned
cache clearing also requires a separate confirmation.

After apply, the Hub reports each action as applied and verified, rejected, or
remote-pending. The Foundry browser can control the bounded ticker, renderer,
module budgets, and module-owned caches. It cannot assign OS CPU priority,
reserve arbitrary RAM, tune GPU drivers, or rewrite the operating-system
network stack; those remain outside a browser module by design. No user files,
Foundry document data, or arbitrary setting paths are touched.

The module is not complete or release-certified until Odinn signs off.
