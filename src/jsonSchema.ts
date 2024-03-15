export interface JSONDefinitionValueStringType {
    type: "string"
}

export interface JSONDefinitionValueNumberType {
    type: "number"
}

export interface JSONDefinitionValueIntegerType {
    type: "integer"
}


export interface JSONDefinitionValueBooleanType {
    type: "boolean"
}

export interface JSONDefinitionValueObjectTypeProperties {
    [propertyName: string]: JSONDefinitionValueType
}

export interface JSONDefinitionValueObjectType {
    type: "object",
    properties: JSONDefinitionValueObjectTypeProperties
}

export interface JSONDefinitionValueArrayType {
    type: "array",
    items: JSONDefinitionValueObjectTypeProperty
}

export interface JSONDefinitionValueNullType {
    type: "null"
}

export interface JSONDefinitionValueObjectTypePropertyRef {
    type?: "ref"
    '$ref': string
}


export type JSONDefinitionValueType
    = JSONDefinitionValueStringType
    | JSONDefinitionValueArrayType
    | JSONDefinitionValueBooleanType
    | JSONDefinitionValueNumberType
    | JSONDefinitionValueIntegerType
    | JSONDefinitionValueObjectType
    | JSONDefinitionValueNullType

export type JSONDefinitionValueObjectTypeProperty = JSONDefinitionValueType | JSONDefinitionValueObjectTypePropertyRef

export type JSONSchemaDefinitionValues = {
    [typeName: string]: JSONDefinitionValueType
}

export type JSONSchema = {
    definitions: JSONSchemaDefinitionValues
}
