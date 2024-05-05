import type {
  ActionEntry,
  AppliesTo,
  CedarSchema,
  NamespaceEntry
} from './types/cedar-schema.js';
import { validateEntityTypeEntry } from './validators/entity-type-validator.js';

export function validateSchema(
  schema: Record<string, object>
): schema is CedarSchema {
  if (Object.values(schema).length !== 1) {
    throw new Error('Only one schema namespace is supported ');
  }
  return Object.values(schema).every((namespaceEntry) => {
    return validateNamespace(namespaceEntry);
  });
}

function validateNamespace(namespace: object): namespace is NamespaceEntry {
  const hasEntityTypes = 'entityTypes' in namespace;
  if (!hasEntityTypes) {
    throw new Error(
      'Namespace does not have required attribute: "entityTypes"'
    );
  }

  return (
    'entityTypes' in namespace &&
    namespace.entityTypes instanceof Object &&
    Object.values(namespace.entityTypes).every((entityType) =>
      validateEntityTypeEntry(entityType)
    ) &&
    'actions' in namespace &&
    namespace.actions instanceof Object &&
    Object.values(namespace.actions).every((action) =>
      validateActionEntry(action)
    )
  );
}

function validateActionEntry(actionEntry: unknown): actionEntry is ActionEntry {
  return (
    actionEntry instanceof Object &&
    'appliesTo' in actionEntry &&
    validateAppliesTo(actionEntry.appliesTo)
  );
}

function validateAppliesTo(appliesTo: unknown): appliesTo is AppliesTo {
  return (
    appliesTo instanceof Object &&
    'principalTypes' in appliesTo &&
    Array.isArray(appliesTo.principalTypes) &&
    appliesTo.principalTypes.every(
      (principalType) => typeof principalType === 'string'
    ) &&
    'resourceTypes' in appliesTo &&
    Array.isArray(appliesTo.resourceTypes) &&
    appliesTo.resourceTypes.every(
      (resourceType) => typeof resourceType === 'string'
    )
  );
}
