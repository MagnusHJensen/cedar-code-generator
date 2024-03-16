import type { Config } from '@cedar-codegen/common';
import { readFileSync } from 'node:fs';
import { generateFromSchema } from './generator';
import { validateSchema } from './validator';

async function readSchemaFile(path: string): Promise<Record<string, object>> {
  try {
    const file = readFileSync(path);
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
