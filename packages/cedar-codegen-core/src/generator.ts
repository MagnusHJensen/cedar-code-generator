import { appendFileSync, writeFileSync } from 'node:fs';
/**
 * This file is responsible for generating the TypeScript file from the parsed cedar schema.
 */
import type { Config } from '@cedar-codegen/common';
import ts from 'typescript';
import {
  STRING_KEYWORD,
  constVariable,
  func,
  identifier,
  literalTypeReference,
  parameter,
  quotedTypeReference,
  stringEnum,
  typeAlias
} from './helpers/compiler-helpers.js';
import {
  AttributeType,
  type Attributes,
  type CedarSchema,
  type EntityType
} from './types/cedar-schema.js';

type GeneratedTypes = {
  namespace: string;
  entityTypes: EntityType;
  actions: string[];
};

const principals = new Set<string>();
const resources = new Set<string>();

// Store global variables to avoid passing them around
let generatorConfig: Pick<Config, 'output'>;
let printer: ts.Printer;
let file: ts.SourceFile;

export function generateFromSchema(schema: CedarSchema, config: Config) {
  generatorConfig = config;
  file = ts.createSourceFile(
    'still-not-sure-what-this-file-is.ts',
    '',
    ts.ScriptTarget.ES2022,
    false,
    ts.ScriptKind.TS
  );
  printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  // Write initial file, then append to it through out the generation process
  writeFileSync(generatorConfig.output, '');

  const generatedNamespaces: GeneratedTypes[] = [];

  for (const namespace in schema) {
    const entityTypes = schema[namespace].entityTypes;
    const actions = Object.keys(schema[namespace].actions);
    for (const action of Object.values(schema[namespace].actions)) {
      // biome-ignore lint/complexity/noForEach: <explanation>
      action.appliesTo.principalTypes.forEach((principal) =>
        principals.add(principal)
      );
      // biome-ignore lint/complexity/noForEach: <explanation>
      action.appliesTo.resourceTypes.forEach((resource) =>
        resources.add(resource)
      );
    }
    generatedNamespaces.push({
      namespace,
      entityTypes,
      actions
    });
  }

  const namespaceVariableDecl = constVariable(
    'schemaNamespace',
    STRING_KEYWORD,
    ts.factory.createStringLiteral(generatedNamespaces[0].namespace),
    { export: true }
  );
  writeToFile(namespaceVariableDecl);

  generateActionTypes(generatedNamespaces[0].actions);

  const principalEnumDecl = stringEnum('CedarPrincipal', principals, {
    export: true
  });
  writeToFile(principalEnumDecl);

  const resourceEnumDecl = stringEnum('CedarResource', resources, {
    export: true
  });
  writeToFile(resourceEnumDecl);

  generateEntityTypeAttributes(generatedNamespaces[0].entityTypes);

  generateHelperMethods();
}

function generateActionTypes(actions: string[]) {
  const actionMap = new Map<string, string[]>();

  for (const action of actions) {
    const foundResource = Array.from(resources).find((resource) =>
      action.includes(resource)
    );

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
      const unionType = ts.factory.createUnionTypeNode(
        actions.map((action) => quotedTypeReference(action))
      );
      return typeAlias(`${resource}Actions`, unionType, {
        export: true
      });
    });

  for (const resourceUnionType of resourceUnionTypes) {
    writeToFile(resourceUnionType);
  }

  const noResourceActions = actionMap.get('NO_RESOURCE') ?? [];

  const actionsUnionType = ts.factory.createUnionTypeNode([
    ...noResourceActions.map((action) => quotedTypeReference(action)),
    ...resourceUnionTypes.map((typeAlias) =>
      literalTypeReference(typeAlias.name)
    )
  ]);
  const actionsUnionTypeDecl = typeAlias('CedarActions', actionsUnionType, {
    export: true
  });

  writeToFile(actionsUnionTypeDecl);
}

function generateEntityTypeAttributes(entityTypes: EntityType) {
  const entityTypesWithData: string[] = [];
  for (const entityType in entityTypes) {
    const entityTypeEntry = entityTypes[entityType];
    if (entityTypeEntry.shape) {
      const innerObject = generateAttributeEntry(
        entityType,
        entityTypeEntry.shape.attributes ?? {}
      );

      if (!innerObject) {
        continue; // Skip empty objects.
      }
      entityTypesWithData.push(entityType);

      const typeAliasDecl = ts.factory.createInterfaceDeclaration(
        [],
        `${entityType}Data`,
        [],
        undefined,
        [
          ts.factory.createPropertySignature(
            undefined,
            'principalType',
            undefined,
            literalTypeReference(
              `${
                principals.has(entityType) ? 'CedarPrincipal' : 'CedarResource'
              }.${entityType.toUpperCase()}`
            )
          ),
          ...innerObject
        ]
      );
      writeToFile(typeAliasDecl);
    }
  }

  // Write union type for all entity types
  if (entityTypesWithData.some((type) => principals.has(type))) {
    const unionPrincipalTypes = typeAlias(
      'CedarPrincipalDataTypes',
      ts.factory.createUnionTypeNode(
        entityTypesWithData
          .filter((type) => principals.has(type))
          .map((entityType) => literalTypeReference(`${entityType}Data`))
      )
    );
    writeToFile(unionPrincipalTypes);
  }

  if (entityTypesWithData.some((type) => resources.has(type))) {
    const unionResourceTypes = typeAlias(
      'CedarResourceDataTypes',
      ts.factory.createUnionTypeNode(
        entityTypesWithData
          .filter((type) => resources.has(type))
          .map((entityType) => literalTypeReference(`${entityType}Data`))
      )
    );
    writeToFile(unionResourceTypes);
  }
}

function generateAttributeEntry(
  entityTypeName: string,
  entry: Attributes
): ts.PropertySignature[] | null {
  if (Object.keys(entry).length === 0) {
    return null;
  }

  const attributeNames = Object.keys(entry);
  const properties = [];
  for (const attributeName of attributeNames) {
    const inner = entry[attributeName];

    const questionToken = inner.required
      ? undefined
      : ts.factory.createToken(ts.SyntaxKind.QuestionToken);

    switch (inner.type) {
      case AttributeType.RECORD: {
        const nestedProps = generateAttributeEntry(
          entityTypeName,
          inner.attributes
        );
        if (!nestedProps) {
          break;
        }
        const nestedInterface = ts.factory.createInterfaceDeclaration(
          [],
          `${entityTypeName}${attributeName.charAt(0).toUpperCase() + attributeName.slice(1)}Data`,
          undefined,
          undefined,
          nestedProps
        );
        writeToFile(nestedInterface);

        properties.push(
          ts.factory.createPropertySignature(
            [],
            attributeName,
            questionToken,
            ts.factory.createTypeReferenceNode(
              ts.factory.createIdentifier(nestedInterface.name.text)
            )
          )
        );
        break;
      }
      case AttributeType.BOOLEAN: {
        properties.push(
          ts.factory.createPropertySignature(
            [],
            attributeName,
            questionToken,
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
          )
        );
        break;
      }
      case AttributeType.STRING: {
        properties.push(
          ts.factory.createPropertySignature(
            [],
            attributeName,
            questionToken,
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
          )
        );
        break;
      }
      case AttributeType.LONG: {
        properties.push(
          ts.factory.createPropertySignature(
            [],
            attributeName,
            questionToken,
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
          )
        );
        break;
      }
    }
  }

  return properties;
}

function generateHelperMethods() {
  const methodSectionComment = ts.factory.createJSDocComment(
    'Helper methods to prefix actions and enums with namespace'
  );

  writeToFile(methodSectionComment);

  const namespaceParam = parameter(
    'namespace',
    ts.factory.createUnionTypeNode([
      literalTypeReference('CedarResource'),
      literalTypeReference('CedarPrincipal')
    ])
  );
  const namespacedEnumBody = ts.factory.createBlock([
    ts.factory.createReturnStatement(
      ts.factory.createAdd(
        ts.factory.createAdd(
          identifier('schemaNamespace'),
          ts.factory.createStringLiteral('::')
        ),
        namespaceParam.ref
      )
    )
  ]);
  const namespacedEnumFunction = func(
    'prefixEnumWithNamespace',
    [namespaceParam.decl],
    STRING_KEYWORD,
    namespacedEnumBody,
    {
      export: true
    }
  );

  const actionParam = parameter('action', literalTypeReference('CedarActions'));
  const namespacedActionBody = ts.factory.createBlock([
    ts.factory.createReturnStatement(
      ts.factory.createAdd(
        ts.factory.createAdd(
          identifier('schemaNamespace'),
          ts.factory.createStringLiteral('::Action::')
        ),
        actionParam.ref
      )
    )
  ]);
  const namespacedActionFunction = func(
    'prefixActionWithNamespace',
    [actionParam.decl],
    STRING_KEYWORD,
    namespacedActionBody,
    {
      export: true
    }
  );

  writeToFile(namespacedEnumFunction);
  writeToFile(namespacedActionFunction);
}

function writeToFile(type: ts.Node, appendNewLine = true) {
  const content = printer.printNode(ts.EmitHint.Unspecified, type, file);
  appendFileSync(
    generatorConfig.output,
    `${content}${appendNewLine ? '\n\n' : ''}`
  );
}
