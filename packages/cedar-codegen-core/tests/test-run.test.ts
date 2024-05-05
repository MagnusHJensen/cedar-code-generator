import { main } from '@cedar-codegen/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('matches snapshot', () => {
  main({
    output: join(__dirname, '/test-files/cedar-types.ts'),
    schema: join(__dirname, '/test-files/test.cedarschema.json')
  });

  expect(
    readFileSync(join(__dirname, '/test-files/cedar-types.ts')).toString()
  ).toMatchSnapshot();
});
