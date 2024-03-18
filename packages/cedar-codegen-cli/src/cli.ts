import { main } from '@cedar-codegen/core';
import { loadConfig } from './config.js';

export async function runCli() {
  const config = await loadConfig();

  await main(config);
}
