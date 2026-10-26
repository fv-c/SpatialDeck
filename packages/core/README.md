# @spatialdeck/core

Pure TypeScript domain of [SpatialDeck](https://github.com/fv-c/SpatialDeck): the project document (schema 1.0.0–1.3.0, current 1.3.0), validation with JSON Pointer diagnostics, migration in copy, camera and frame math, the navigation machine, the transition sampler and, since 0.6, export itineraries and capture plans. No DOM, no network, no filesystem.

```ts
import {
  validateDocument,
  planCapture,
  sampleCapture,
  publicDocument,
} from "@spatialdeck/core";

const result = validateDocument(json); // migrated 1.3.0 copy or diagnostics
if (!result.ok) console.error(result.diagnostics);
const plan = planCapture(result.value, itinerary, { reducedMotion: false });
```

- JSON Schemas: `@spatialdeck/core/schema` (current) and `@spatialdeck/core/schema/1.0.0` … `/1.3.0`.
- Runtime dependencies: `gl-matrix` and the Ajv runtime helpers (`ajv`), imported, never copied into `dist`.
- ESM only, `sideEffects: false`. Tested with Node 24.22.0 and the browsers listed in the repository.

Not yet published to npm: publication waits for the verification of the `@spatialdeck` scope. Licence: GPL-3.0-or-later. Documentation: [DEVELOPMENT.md](https://github.com/fv-c/SpatialDeck/blob/main/docs/DEVELOPMENT.md).
