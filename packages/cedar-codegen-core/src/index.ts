import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateTypes } from './generator';
import { validateSchema } from './validator';

function readSchemaFile(path: string): Record<string, object> {
  try {
    const file = readFileSync(path);
    return JSON.parse(file.toString());
  } catch (error) {
    throw new Error(`Failed parsing schema file.\n${JSON.stringify(error)}`);
  }
}

export function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const schema = readSchemaFile(`${__dirname}/../test.cedarschema.json`);
  if (!validateSchema(schema)) {
    throw new Error('Invalid schema');
  }
  console.log('Schema is valid');

  generateTypes(schema);
}
