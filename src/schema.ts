import * as sdk from "@hasura/ndc-sdk-typescript";
import { mapObjectValues } from "./utils";
import { ScalarType } from "@hasura/ndc-sdk-typescript";

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

    type ScalarTypes = {
        [k: string]: ScalarType;
    };
    const scalarTypes : ScalarTypes = {
        "Integer": {
            aggregate_functions: {
                "count": {
                    result_type: {
                        type: "named",
                        name: BuiltInScalarTypeName.Integer,
                    }
                },
                "sum": {
                    result_type: {
                        type: "named",
                        name: BuiltInScalarTypeName.Integer,
                    }
                },
                "avg": {
                    result_type: {
                        type: "named",
                        name: BuiltInScalarTypeName.Integer,
                    }
                },
                "min": {
                    result_type: {
                        type: "named",
                        name: BuiltInScalarTypeName.Integer,
                    }
                },
                "max": {
                    result_type: {
                        type: "named",
                        name: BuiltInScalarTypeName.Integer,
                    }
                }
            },
            comparison_operators: {
                eq: {
                    type: "equal"
                },
                neq: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "Integer"
                    }
                },
                gt: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "Integer"
                    }
                },
                lt: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "Integer"
                    }
                },
                gte: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "Integer"
                    }
                },
                lte: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "Integer"
                    }
                }
            },
        },
        "Number": {
            aggregate_functions: {
                "count": {
                    result_type: {
                        type: "named",
                        name: BuiltInScalarTypeName.Number,
                    }
                },
                "sum": {
                    result_type: {
                        type: "named",
                        name: BuiltInScalarTypeName.Number,
                    }
                },
                "avg": {
                    result_type: {
                        type: "named",
                        name: BuiltInScalarTypeName.Number,
                    }
                },
                "min": {
                    result_type: {
                        type: "named",
                        name: BuiltInScalarTypeName.Number,
                    }
                },
                "max": {
                    result_type: {
                        type: "named",
                        name: BuiltInScalarTypeName.Number,
                    }
                }
            },
            comparison_operators: {
                eq: {
                    type: "equal"
                },
                neq: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "Number"
                    }
                },
                gt: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "Number"
                    }
                },
                lt: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "Number"
                    }
                },
                gte: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "Number"
                    }
                },
                lte: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "Number"
                    }
                }
            },
        },
        "Boolean": {
            aggregate_functions: {
                "bool_and": {
                    result_type: {
                        type: "named",
                        name: BuiltInScalarTypeName.Boolean,
                    }
                },
                "bool_or": {
                    result_type: {
                        type: "named",	
                        name: BuiltInScalarTypeName.Boolean,
                    }
                },
                "bool_not": {
                    result_type: {
                        type: "named",
                        name: BuiltInScalarTypeName.Boolean,
                    }
                }
            },
            comparison_operators: {
                eq: {
                    type: "equal"
                },
                neq: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "Boolean"
                    }
                }
            },
        },
        "String": {
            aggregate_functions: {},
            comparison_operators: {
                eq: {
                    type: "equal"
                },
                neq: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "String"
                    }
                },
                gt: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "String"
                    }
                },
                lt: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "String"
                    }
                },
                gte: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "String"
                    }
                },
                lte: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "String"
                    }
                },
                contains: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "String"
                    }
                },
                endswith: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "String"
                    }
                },
                regexmatch: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "String"
                    }
                },
                startswith: {
                    type: "custom",
                    argument_type: {
                        type: "named",
                        name: "String"
                    }
                }
            },
        }
    };

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
