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
