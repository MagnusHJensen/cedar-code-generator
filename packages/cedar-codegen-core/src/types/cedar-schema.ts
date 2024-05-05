export type CedarSchema = {
  [namespace: string]: NamespaceEntry;
};

export type NamespaceEntry = {
  entityTypes: EntityType;
  actions: Action;
};

export type EntityType = {
  [name: string]: EntityTypeEntry;
};

export type EntityTypeEntry = {
  memberOfTypes?: string[];
  shape?: ShapeEntry;
};

export type ShapeEntry = {
  type: AttributeType.RECORD;
  attributes?: Attributes;
};

export type Attributes = {
  [name: string]: AttributeEntry | RecordAttributeEntry;
};

export type AttributeEntry = {
  type: Exclude<AttributeType, AttributeType.RECORD>;
  required: boolean; // Defaults to true
};

export type RecordAttributeEntry = {
  type: AttributeType.RECORD;
  required: boolean; // Defaults to true
  attributes: Attributes;
};

export type Action = {
  [name: string]: ActionEntry;
};

export type ActionEntry = {
  appliesTo: AppliesTo;
};

export type AppliesTo = {
  principalTypes: string[];
  resourceTypes: string[];
};

export enum AttributeType {
  RECORD = 'Record',
  BOOLEAN = 'Boolean',
  STRING = 'String',
  LONG = 'Long'
}
