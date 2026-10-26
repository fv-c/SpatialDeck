#!/usr/bin/env node
import { run } from "./index.js";

process.exitCode = await run(process.argv.slice(2), {
  out: (text) => process.stdout.write(`${text}\n`),
  log: (text) => process.stdout.write(`${text}\n`),
  warn: (text) => process.stderr.write(`${text}\n`),
});
