import type { Config } from '@cedar-codegen/common';
import { readFileSync } from 'node:fs';
import * as nodePath from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateFromSchema } from './generator.js';
import { validateSchema } from './validator.js';

async function readSchemaFile(path: string): Promise<Record<string, object>> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = nodePath.dirname(__filename);
    const file = readFileSync(__dirname + path);
    return JSON.parse(file.toString());
  } catch (error) {
    throw new Error(`Failed reading schema file.\n${JSON.stringify(error)}`);
  }
}

export async function main(config: Config) {
  const schema = await readSchemaFile(config.schema);
  if (!validateSchema(schema)) {
    throw new Error('Invalid schema');
  }
  console.log('Schema is valid');

  const startTime = performance.now();
  generateFromSchema(schema, config);
  const endTime = performance.now();
  console.log(`Generation took ${endTime - startTime}ms`);
}
