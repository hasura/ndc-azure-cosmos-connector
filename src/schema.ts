import * as sdk from "@hasura/ndc-sdk-typescript";
import { mapObjectValues } from "./utils";

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

export type ScalarTypeDefinition = BuiltInScalarTypeDefinition // Empty object, for now

export type TypeDefinition = ArrayTypeDefinition | NullableTypeDefinition | NamedTypeDefinition

export type ArrayTypeDefinition = {
    type: "array"
    elementType: TypeDefinition
}

export type NullableTypeDefinition = {
    type: "nullable",
    underlyingType: TypeDefinition
}

export type NamedTypeDefinition = NamedObjectTypeDefinition | NamedScalarTypeDefinition

export type NamedObjectTypeDefinition = {
    type: "named"
    name: string
    kind: "object"
}

export type NamedScalarTypeDefinition = CustomNamedScalarTypeDefinition | BuiltInScalarTypeDefinition

export type BuiltInScalarTypeDefinition = StringScalarTypeDefinition | BooleanScalarTypeDefinition | IntegerScalarTypeDefinition | NumberScalarTypeDefinition | DateTimeScalarTypeDefinition

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

export type IntegerScalarTypeDefinition = {
    type: "named"
    name: BuiltInScalarTypeName.Integer
    kind: "scalar"
}


export enum BuiltInScalarTypeName {
    String = "String",
    Number = "Number",
    Boolean = "Boolean",
    DateTime = "DateTime",
    Integer = "Integer"
}

export function getJSONScalarTypes(): ScalarTypeDefinitions {
    var scalarTypeDefinitions: ScalarTypeDefinitions = {};
    scalarTypeDefinitions["Integer"] = {
        type: "named",
        name: BuiltInScalarTypeName.Integer,
        kind: "scalar"
    };
    scalarTypeDefinitions["Number"] = {
        type: "named",
        name: BuiltInScalarTypeName.Number,
        kind: "scalar"
    };
    scalarTypeDefinitions["Boolean"] = {
        type: "named",
        name: BuiltInScalarTypeName.Boolean,
        kind: "scalar"
    };
    scalarTypeDefinitions["String"] = {
        type: "named",
        name: BuiltInScalarTypeName.String,
        kind: "scalar"
    };


    return scalarTypeDefinitions
}




export function getNdcSchemaResponse(collectionsSchema: CollectionsSchema): sdk.SchemaResponse {
    const collections = Object.entries(collectionsSchema.collections);

    var collectionInfos = collections.map(([collectionName, collectionInfo]) => {
        return {
            name: collectionName,
            description: null,
            arguments: {},
            type: getBaseNamedType(collectionInfo.resultType),
            uniqueness_constraints: {},
            foreign_keys: {}
        }
    })


    const objectTypes = mapObjectValues(collectionsSchema.objectTypes, objDef => {
        return {
            fields: Object.fromEntries(Object.values(objDef.properties).map(propDef => {
                const objField: sdk.ObjectField = {
                    type: convertTypeReferenceToSdkType(propDef.type),
                    description: null
                }
                return [propDef.propertyName, objField];
            })),
            ...(objDef.description ? { description: objDef.description } : {})
        }
    });

    const scalarTypes = mapObjectValues(collectionsSchema.scalarTypes, _scalar_def => {
        return {
            aggregate_functions: {},
            comparison_operators: {},
        }
    })

    return {
        functions: [],
        procedures: [],
        collections: collectionInfos,
        object_types: objectTypes,
        scalar_types: scalarTypes,
    }
}

function convertTypeReferenceToSdkType(typeRef: TypeDefinition): sdk.Type {
    switch (typeRef.type) {
        case "array": return { type: "array", element_type: convertTypeReferenceToSdkType(typeRef.elementType) }
        case "nullable": return { type: "nullable", underlying_type: convertTypeReferenceToSdkType(typeRef.underlyingType) }
        case "named": return { type: "named", name: typeRef.name }
    }
}

export function getBaseNamedType(typeRef: TypeDefinition): string {
    switch (typeRef.type) {
        case "array": return getBaseNamedType(typeRef.elementType)
        case "nullable": return getBaseNamedType(typeRef.underlyingType)
        case "named": return typeRef.name
    }
}
