/**
 * This file provides wrapper and helper functions for the TypeScript compiler API.
 */
import ts from 'typescript';

type ModifierObject = {
  export?: boolean;
};

export const STRING_KEYWORD = ts.factory.createKeywordTypeNode(
  ts.SyntaxKind.StringKeyword
);

export function quotedTypeReference(literal: string): ts.TypeReferenceNode {
  return ts.factory.createTypeReferenceNode(`"${literal}"`);
}

export function literalTypeReference(
  literal: string | ts.Identifier
): ts.TypeReferenceNode {
  return ts.factory.createTypeReferenceNode(literal);
}

export function typeAlias(
  typeName: string,
  type: ts.TypeNode,
  modifiers?: ModifierObject
): ts.TypeAliasDeclaration {
  const modifiersArray = createModifiers(modifiers);

  return ts.factory.createTypeAliasDeclaration(
    modifiersArray,
    identifier(typeName),
    undefined,
    type
  );
}

export function stringEnum(
  enumName: string,
  entries: Iterable<string>,
  modifiers?: ModifierObject
): ts.EnumDeclaration {
  const modifiersArray = createModifiers(modifiers);
  const members = Array.from(entries).map((entry) =>
    ts.factory.createEnumMember(
      entry.toUpperCase(),
      ts.factory.createStringLiteral(entry)
    )
  );

  return ts.factory.createEnumDeclaration(
    modifiersArray,
    identifier(enumName),
    members
  );
}

export function parameter(
  paramName: string,
  type: ts.TypeNode
): { decl: ts.ParameterDeclaration; ref: ts.Identifier } {
  const ref = identifier(paramName);
  const decl = ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    ref,
    undefined,
    type
  );

  return { decl, ref };
}

export function func(
  name: string,
  parameters: ts.ParameterDeclaration[],
  returnType: ts.TypeNode,
  body: ts.Block,
  modifiers?: ModifierObject
): ts.FunctionDeclaration {
  const modifiersArray = createModifiers(modifiers);
  return ts.factory.createFunctionDeclaration(
    modifiersArray,
    undefined,
    identifier(name),
    undefined,
    parameters,
    returnType,
    body
  );
}

export function constVariable(
  name: string,
  type: ts.TypeNode,
  assignment: ts.Expression,
  modifiers?: ModifierObject
): ts.VariableStatement {
  const modifiersArray = createModifiers(modifiers);

  const declaration = ts.factory.createVariableDeclaration(
    identifier(name),
    undefined,
    type,
    assignment
  );
  const declarationList = ts.factory.createVariableDeclarationList(
    [declaration],
    ts.NodeFlags.Const
  );
  return ts.factory.createVariableStatement(modifiersArray, declarationList);
}

export function identifier(name: string): ts.Identifier {
  return ts.factory.createIdentifier(name);
}

function createModifiers(modifiers?: ModifierObject): ts.Modifier[] {
  const modifierArray: ts.Modifier[] = [];

  if (!modifiers) {
    return [];
  }

  if (modifiers.export) {
    modifierArray.push(ts.factory.createModifier(ts.SyntaxKind.ExportKeyword));
  }

  return modifierArray;
}
