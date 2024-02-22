export type CollectionsSchema = {
  collections: CollectionDefinitions
  objectTypes: ObjectTypeDefinitions
  scalarTypes: ScalarTypeDefinitions
}

export type CollectionDefinitions = {
  [collectionName: string]: CollectionDefinition
}

export type CollectionDefinition = {
  description: string | null,
  arguments: ArgumentDefinition[]
  resultType: TypeDefinition
}

export type ArgumentDefinition = {
  argumentName: string,
  description: string | null,
  type: TypeDefinition
}

export type ObjectTypeDefinitions = {
  [objectTypeName: string]: ObjectTypeDefinition
}

export type ObjectTypePropertiesMap = {
    [propertyName: string]: ObjectPropertyDefinition
}


export type ObjectTypeDefinition = {
    description: string | null,
    properties: ObjectTypePropertiesMap
}

export type ObjectPropertyDefinition = {
  propertyName: string,
  description: string | null,
  type: TypeDefinition,
}

export type ScalarTypeDefinitions = {
  [scalarTypeName: string]: ScalarTypeDefinition
}

export type ScalarTypeDefinition = Record<string, never> // Empty object, for now

export type TypeDefinition = ArrayTypeDefinition | NullableTypeDefinition | NamedTypeDefinition

export type ArrayTypeDefinition = {
  type: "array"
  elementType: TypeDefinition
}

export type NullableTypeDefinition = {
  type: "nullable",
  nullOrUndefinability: NullOrUndefinability
  underlyingType: TypeDefinition
}

export type NamedTypeDefinition = NamedObjectTypeDefinition | NamedScalarTypeDefinition

export type NamedObjectTypeDefinition = {
  type: "named"
  name: string
  kind: "object"
}

export type NamedScalarTypeDefinition = CustomNamedScalarTypeDefinition | BuiltInScalarTypeDefinition

export type BuiltInScalarTypeDefinition = StringScalarTypeDefinition | BooleanScalarTypeDefinition | NumberScalarTypeDefinition | DateTimeScalarTypeDefinition

export type CustomNamedScalarTypeDefinition = {
  type: "named"
  name: string
  kind: "scalar"
}

export type StringScalarTypeDefinition = {
  type: "named"
  name: BuiltInScalarTypeName.String
  kind: "scalar"
  literalValue?: string
}

export type NumberScalarTypeDefinition = {
  type: "named"
  name: BuiltInScalarTypeName.Number
  kind: "scalar"
  literalValue?: number
}

export type BooleanScalarTypeDefinition = {
  type: "named"
  name: BuiltInScalarTypeName.Boolean
  kind: "scalar"
  literalValue?: boolean
}

export type DateTimeScalarTypeDefinition = {
  type: "named"
  name: BuiltInScalarTypeName.DateTime
  kind: "scalar"
}

export enum NullOrUndefinability {
    AcceptsNullOnly = "AcceptsNullOnly",
    AcceptsUndefinedOnly = "AcceptsUndefinedOnly",
    AcceptsEither = "AcceptsEither",
}

export enum BuiltInScalarTypeName {
    String = "String",
    Number = "Number",
    Boolean = "Boolean",
    DateTime = "DateTime",
}
