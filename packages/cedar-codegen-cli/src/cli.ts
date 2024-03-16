import { main } from '@cedar-codegen/core';
import { loadConfig } from './config';

export async function runCli() {
  const config = await loadConfig();

  await main(config);
}
