# @spatialdeck/editor

React editor of [SpatialDeck](https://github.com/fv-c/SpatialDeck) Studio: the `Studio` component, the command store with atomic undo/redo, the commands an integrator applies through it and IndexedDB recovery. React and React DOM (`^19.3.1`) are peer dependencies; core and player never depend on React.

```tsx
import { createRoot } from "react-dom/client";
import { Studio, EditorStore, emptyProject } from "@spatialdeck/editor";
import "@spatialdeck/editor/style.css";
import "@spatialdeck/plugins/style.css";
import "@spatialdeck/player/fonts.css";

createRoot(root).render(<Studio store={new EditorStore(emptyProject())} />);
```

The public API is delimited since 0.6 (see `dist/index.d.ts`); components and storage internals are private. The interface is in English (G0 decision 3).

Not yet published to npm (scope verification pending). Licence: GPL-3.0-or-later. Guide: [AUTHORING.md](https://github.com/fv-c/SpatialDeck/blob/main/docs/AUTHORING.md).
