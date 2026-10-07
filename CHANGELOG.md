# VQ2 Foundry API Module Changelog

## 1.1.0

- Added Foundry VTT V13 compatibility while retaining V14 support.
- Updated the manifest to the V13/V14 numeric compatibility format and added the public repository URL.
- Bumped revisioned assets and the public download artifact to `1.1.0`.

## 1.0.0

- Prepared the Foundry VTT V14 module for public distribution as a standalone download.
- Added stable manifest and versioned release download URLs for the public repository.
- Kept the module limited to the API bridge, bounded GM Hub, runtime adapter, socket bridge, and module-owned styles.

## 0.2.2

- Replaced numeric Foundry control fields with bounded sliders and live value readouts.
- Loaded profile defaults into the sliders and reapplied them when the profile changes.

## 0.2.1

- Removed the Hub and runtime's static dependency on the revision-sensitive API validator so a stale Foundry API asset cannot prevent the application from rendering.
- Kept runtime action validation local and bounded, including cache-target, component-key, runtime-variant, numeric-range, and action-count checks.
- Bumped all revisioned Foundry assets and the module package to 0.2.1.

## 0.2.0

- Added profile-generated bounded controls for FPS, render/GPU quality, CPU workload, module cache/RAM budget, effects, animations, runtime variant, and network batching.
- Added explicit GM Hub controls for every allow-listed action and module-owned cache clearing.
- Added a persisted Foundry runtime adapter with per-action verification and GM socket dispatch for all-client and selected-client plans.
- Added opaque relay client identity capture for selected-client targeting.

## 0.1.5

- Added visible optimization coverage for FPS, CPU, RAM, GPU, network, cleanup, and unsupported settings.
- Added live FPS-limit verification after self-client apply, with remote-scope results marked unverified locally.
- Added cache-busting revision for the verification UI.

## 0.1.4

- Added bounded profile FPS actions with explicit FPS-cap override behavior.
- Increased the GM Hub default size and added scroll containment for plan review.
- Clarified that an FPS cap limits rendering and cannot guarantee hardware-limited frames.

## 0.1.3

- Added revisioned module and dynamic-import URLs so Foundry reloads updated Hub assets instead of retaining an older ESM cache entry.
- Kept the manifest entry as a plain file path for Foundry V14 metadata validation.

## 0.1.2

- Added a bounded 15-240 FPS-cap control to the GM Hub.
- Added explicit plan-action review output and self-client FPS application after relay authorization.
- Added read-only preview requests so plan review does not require the server-side GM credential.
- Kept cleanup and apply operations server-side GM-authenticated.

## 0.1.1

- Added the required ApplicationV2 HTML replacement implementation for GM Hub rendering.
- Documented the private mesh relay bind and same-origin proxy requirement.

## 0.1.0

- Implemented the V14 ApplicationV2 HTML replacement contract for the GM Hub.
- Added the Foundry VTT V14 API-only bridge.
- Added bounded telemetry, status, plan, cleanup, and apply calls.
- Added a V14 ApplicationV2 GM Hub through the module settings menu.
- Kept VQ2 engines, libraries, turbos, and server credentials outside the module.
- GM control operations fail closed until the server-side relay authenticates the request.

Release status: pending Odinn sign-off.
