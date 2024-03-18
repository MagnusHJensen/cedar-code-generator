import type { Config } from '@cedar-codegen/common';
import { cosmiconfig, type CosmiconfigResult } from 'cosmiconfig';

const moduleName = 'cedar';

export async function loadConfig(): Promise<Config> {
  const result = await findConfig();

  if (!result) {
    throw new Error(
      `Unable to find configuration file! \n
        Make sure you have a configuration file under the current directory.
      `
    );
  }

  if (result.isEmpty) {
    throw new Error(
      `Found configuration file, but it was empty! \n
        Make sure you have a valid configuration file under the current directory.
      `
    );
  }

  return result.config as Config;
}

async function findConfig(): Promise<CosmiconfigResult> {
  const explorer = cosmiconfig(moduleName);
  const result = await explorer.search();
  return result;
}
