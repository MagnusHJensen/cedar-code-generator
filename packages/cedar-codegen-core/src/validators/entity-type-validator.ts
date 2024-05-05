import {
  AttributeType,
  type AttributeEntry,
  type Attributes,
  type EntityTypeEntry,
  type RecordAttributeEntry,
  type ShapeEntry
} from '../types/cedar-schema.js';

export function validateEntityTypeEntry(
  entityTypeEntry: unknown
): entityTypeEntry is EntityTypeEntry {
  if (!(entityTypeEntry instanceof Object)) {
    throw new Error('EntityTypeEntry is not of expected type: "object"');
  }

  if (
    'memberOfTypes' in entityTypeEntry &&
    !validateMemberOfTypes(entityTypeEntry.memberOfTypes)
  ) {
    throw new Error(
      'memberOfTypes is not of expected type: "array" containg only strings'
    );
  }

  if ('shape' in entityTypeEntry && !validateShape(entityTypeEntry.shape)) {
    throw new Error('Shape is not of expected type: "object"');
  }

  return true;
}

function validateMemberOfTypes(
  memberOfTypes: unknown
): memberOfTypes is string[] {
  return (
    Array.isArray(memberOfTypes) &&
    memberOfTypes.every((memberOfType) => typeof memberOfType === 'string')
  );
}

function validateShape(shape: unknown): shape is ShapeEntry {
  if (!(shape instanceof Object)) {
    throw new Error('Shape is not of expected type: "object"');
  }
  if (
    'type' in shape &&
    (typeof shape.type !== 'string' || shape.type !== AttributeType.RECORD)
  ) {
    throw new Error(
      'Shape type is not of expected type: "string" or expected type value: "Record"'
    );
  }

  if ('attributes' in shape && !validateAttributes(shape.attributes)) {
    throw new Error('attributes is not of expected type: "object"');
  }

  return true;
}

function validateAttributes(attributes: unknown): attributes is Attributes {
  if (!(attributes instanceof Object)) {
    throw new Error('Attributes is not of expected type: "object"');
  }

  return Object.values(attributes).every((attribute) => {
    const validated = validateAttribute(attribute);

    if (validated) {
      attribute.required = attribute.required ?? true;
    }

    return validated;
  });
}

function validateAttribute(
  attribute: unknown
): attribute is AttributeEntry | RecordAttributeEntry {
  if (!(attribute instanceof Object)) {
    throw new Error('Attribute is not of expected type: "object"');
  }

  // Recursively validate attributes if type is record
  if (
    'type' in attribute &&
    attribute.type === AttributeType.RECORD &&
    'attributes' in attribute &&
    !validateAttributes(attribute.attributes)
  ) {
    throw new Error('attributes is not of expected type: "object"');
  }

  // TODO: Validate other attributes.

  if ('required' in attribute && typeof attribute.required !== 'boolean') {
    throw new Error('Attribute required is not of expected type: "boolean"');
  }

  return true;
}
