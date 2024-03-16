import { main } from '@cedar-codegen/core';
import { readFileSync } from 'node:fs';

test('matches snapshot', () => {
  main({
    output: `${__dirname}/test-files/cedar-types.ts`,
    schema: `${__dirname}/test-files/test.cedarschema.json`,
  });

  expect(readFileSync(`${__dirname}/test-files/cedar-types.ts`).toString()).toMatchSnapshot();
});
