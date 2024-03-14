/**
 * Generates the types from the parsed cedar schema
 */
import { appendFile, writeFileSync } from 'node:fs';
import ts from 'typescript';
import type { CedarSchema } from './types/schema-types';

type GeneratedTypes = {
  namespace: string;
  entityTypes: string[];
  actions: string[];
};

const principals = new Set<string>();
const resources = new Set<string>();
const filePath = './packages/cedar-codegen-core/src/cedar-types.ts';

export function generateTypes(schema: CedarSchema) {
  const generatedNamespaces: GeneratedTypes[] = [];

  for (const namespace in schema) {
    const entityTypes = Object.keys(schema[namespace].entityTypes);
    const actions = Object.keys(schema[namespace].actions);
    for (const action of Object.values(schema[namespace].actions)) {
      // biome-ignore lint/complexity/noForEach: <explanation>
      action.appliesTo.principalTypes.forEach((principal) => principals.add(principal));
      // biome-ignore lint/complexity/noForEach: <explanation>
      action.appliesTo.resourceTypes.forEach((resource) => resources.add(resource));
    }
    generatedNamespaces.push({ namespace, entityTypes, actions });
  }

  // Write initial file, then append to it
  writeFileSync(filePath, '');

  const generatedFile = ts.createSourceFile(
    filePath,
    '',
    ts.ScriptTarget.ES2022,
    false,
    ts.ScriptKind.TS
  );
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  const namespaceVariableDecl = ts.factory.createVariableStatement(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          'namespace',
          undefined,
          ts.factory.createTypeReferenceNode('string'),
          ts.factory.createStringLiteral(generatedNamespaces[0].namespace)
        ),
      ],
      ts.NodeFlags.Const
    )
  );
  appendToGeneratedFile(
    printer.printNode(ts.EmitHint.Unspecified, namespaceVariableDecl, generatedFile)
  );

  generateActionTypes(printer, generatedFile, generatedNamespaces[0].actions);

  const principalEnumDecl = ts.factory.createEnumDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier('CedarPrincipal'),
    Array.from(principals).map((principal) =>
      ts.factory.createEnumMember(
        principal.toUpperCase(),
        ts.factory.createStringLiteral(principal)
      )
    )
  );

  const principalEnumResult = printer.printNode(
    ts.EmitHint.Unspecified,
    principalEnumDecl,
    generatedFile
  );
  appendToGeneratedFile(principalEnumResult);

  const resourceEnumDecl = ts.factory.createEnumDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier('CedarResource'),
    Array.from(resources).map((resource) =>
      ts.factory.createEnumMember(resource.toUpperCase(), ts.factory.createStringLiteral(resource))
    )
  );
  appendToGeneratedFile(
    printer.printNode(ts.EmitHint.Unspecified, resourceEnumDecl, generatedFile)
  );

  testMethodWriting(printer, generatedFile);
}

function generateActionTypes(printer: ts.Printer, file: ts.SourceFile, actions: string[]) {
  const actionMap = new Map<string, string[]>();

  for (const action of actions) {
    const foundResource = Array.from(resources).find((resource) => action.includes(resource));

    if (!foundResource) {
      if (!actionMap.has('NO_RESOURCE')) {
        actionMap.set('NO_RESOURCE', []);
      }

      actionMap.get('NO_RESOURCE')?.push(action);
    } else {
      if (!actionMap.has(foundResource)) {
        actionMap.set(foundResource, []);
      }

      actionMap.get(foundResource)?.push(action);
    }
  }

  const resourceUnionTypes = Array.from(actionMap)
    .filter(([resource]) => resource !== 'NO_RESOURCE')
    .map(([resource, actions]) => {
      return ts.factory.createTypeAliasDeclaration(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createIdentifier(`${resource}Actions`),
        undefined,
        ts.factory.createUnionTypeNode(actions.map((action) => quotedTypeReference(action)))
      );
    });

  for (const resourceUnionType of resourceUnionTypes) {
    const resourceActionResult = printer.printNode(
      ts.EmitHint.Unspecified,
      resourceUnionType,
      file
    );
    appendToGeneratedFile(resourceActionResult);
  }

  const noResourceActions = actionMap.get('NO_RESOURCE') ?? [];

  const actionsUnionType = ts.factory.createTypeAliasDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier('CedarActions'),
    undefined,
    ts.factory.createUnionTypeNode([
      ...noResourceActions.map((action) => quotedTypeReference(action)),
      ...resourceUnionTypes.map((typeAlias) => ts.factory.createTypeReferenceNode(typeAlias.name)),
    ])
  );

  const combinedActionsResult = printer.printNode(ts.EmitHint.Unspecified, actionsUnionType, file);
  appendToGeneratedFile(combinedActionsResult);
}

function quotedTypeReference(literal: string): ts.TypeReferenceNode {
  return ts.factory.createTypeReferenceNode(`"${literal}"`);
}

function appendToGeneratedFile(content: string, appendNewLine = true) {
  appendFile(filePath, `${content}${appendNewLine ? '\n\n' : ''}`, (err) => {
    if (err) throw err;
  });
}

function testMethodWriting(printer: ts.Printer, file: ts.SourceFile) {
  const paramName = ts.factory.createIdentifier('resource');

  const namespacedResource = ts.factory.createFunctionDeclaration(
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    undefined,
    'getNamespacedResource',
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        paramName,
        undefined,
        ts.factory.createTypeReferenceNode('CedarResource'),
        undefined
      ),
    ],
    ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    ts.factory.createBlock([
      ts.factory.createReturnStatement(
        ts.factory.createAdd(
          ts.factory.createAdd(
            ts.factory.createIdentifier('namespace'),
            ts.factory.createStringLiteral('::')
          ),
          paramName
        )
      ),
    ])
  );

  const result = printer.printNode(ts.EmitHint.Unspecified, namespacedResource, file);
  appendToGeneratedFile(result);
}
