#!/usr/bin/env node
/* eslint-disable no-console */

const lines = [
  "Smoke UI checklist (manual):",
  "1. Open Studio: /create/studio?section=photo",
  "2. Gallery zoom: reduce to ~70% -> image should stay top-left (no centering).",
  "3. Generate while scrolled to top -> gallery should auto-scroll to newest results.",
  "4. Download from a generated card -> file downloads (no error).",
  "5. Regenerate/Repeat -> fields are filled, but no auto-generation.",
  "6. Grok Imagine -> run once, confirm multiple outputs saved.",
  "7. Topaz Upscale -> requires input, output saved in Library.",
];

for (const line of lines) console.log(line);
