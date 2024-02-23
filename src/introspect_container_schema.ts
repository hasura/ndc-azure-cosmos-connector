import { Container, JSONObject, JSONValue } from "@azure/cosmos"
import { ArrayTypeDefinition, BooleanScalarTypeDefinition, BuiltInScalarTypeName, CollectionDefinition, NamedObjectTypeDefinition, NullableTypeDefinition, NumberScalarTypeDefinition, ObjectTypeDefinition, ObjectTypeDefinitions, ObjectTypePropertiesMap, StringScalarTypeDefinition, TypeDefinition } from "./schema";

/**
   * Fetches at-most `n` latest rows from the given container

   * @param n - Maximum number of rows to be fetched from the container
   * @param container - Azure Cosmos DB Container to fetch the rows from.
   * @returns The latest at-most `n` rows from the `container`.

**/
export async function fetch_n_rows_from_container(n: number, container: Container): Promise<JSONObject[]> {
    const querySpec = {
        query: `SELECT * FROM ${container.id} c ORDER BY c._ts DESC OFFSET 0 LIMIT ${n}`,
        parameters: []
    }
    var response = await container.items.query(querySpec).fetchAll();

    return response.resources
}


function infer_schema_of_json_value(jsonValue: JSONValue, objectTypeName: string, containerPrefix: string, objectTypeDefinitionMap: ObjectTypeDefinitions): [TypeDefinition, ObjectTypeDefinitions] {
    if (Array.isArray(jsonValue)) {
        if (jsonValue.length > 0 && jsonValue != null) {
            const [typeDefn, objectTypeDefns] = infer_schema_of_json_value(jsonValue[0], objectTypeName, containerPrefix, objectTypeDefinitionMap);
            const arrayTypeDefn: ArrayTypeDefinition = {
                type: "array",
                elementType: typeDefn
            };
            return [arrayTypeDefn, objectTypeDefns]
        }
    } else if (typeof jsonValue === "object") {
        var objPropertyDefns: ObjectTypePropertiesMap = {};
        let objTypeDefns: ObjectTypeDefinitions = {};

        let existingObjectTypeDefinition = objectTypeDefinitionMap[containerPrefix + objectTypeName];

        Object.keys(jsonValue as JSONObject).map(key => {
            const value: JSONValue = (jsonValue as JSONObject)[key];
            if (value != null && value != undefined) {
                const [fieldTypeDefinition, currentObjTypeDefns] = infer_schema_of_json_value(value, key, containerPrefix, objectTypeDefinitionMap);

                objPropertyDefns[key] = {
                    propertyName: key,
                    description: null,
                    type: fieldTypeDefinition
                };

                objTypeDefns = { ...objTypeDefns, ...currentObjTypeDefns };
            }
        })
        const currentNamedObjTypeDefn: NamedObjectTypeDefinition = {
            type: "named",
            name: containerPrefix + objectTypeName,
            kind: "object"
        };

        if (existingObjectTypeDefinition != null) {
            // Add the keys that were accumulated
            for (const k in existingObjectTypeDefinition.properties) {
                const currentPropertyTypeDef = objPropertyDefns[k];
                if (currentPropertyTypeDef == null) {
                    var existingObjectPropertyDefn = existingObjectTypeDefinition.properties[k];
                    // Making this property of the object as nullable, because we didn't find this
                    // key in the earlier rows, which means it should be a nullable field.
                    existingObjectPropertyDefn.type = {
                        type: "nullable",
                        underlyingType: existingObjectPropertyDefn.type
                    } as NullableTypeDefinition as TypeDefinition;
                    objPropertyDefns[k] = existingObjectPropertyDefn
                }
            }
        }

        const currentObjTypeDefinition: ObjectTypeDefinition = {
            description: null,
            properties: objPropertyDefns
        };


        objTypeDefns = { ...objTypeDefns, [containerPrefix + objectTypeName]: currentObjTypeDefinition };

        return [currentNamedObjTypeDefn, objTypeDefns]

    } else if (typeof jsonValue === "string") {
        let stringScalarTypeDefinition: StringScalarTypeDefinition = {
            type: "named",
            name: BuiltInScalarTypeName.String,
            kind: "scalar",
            literalValue: jsonValue as string
        };
        return [stringScalarTypeDefinition as TypeDefinition, {}]
    } else if (typeof jsonValue == "number") {
        let numberScalarTypeDefinition: NumberScalarTypeDefinition = {
            type: "named",
            name: BuiltInScalarTypeName.Number,
            kind: "scalar",
            literalValue: jsonValue as number
        };
        return [numberScalarTypeDefinition as TypeDefinition, {}]
    } else if (typeof jsonValue == "boolean") {
        let booleanScalarTypeDefinition: BooleanScalarTypeDefinition = {
            type: "named",
            name: BuiltInScalarTypeName.Boolean,
            kind: "scalar",
            literalValue: jsonValue as boolean
        };
        return [booleanScalarTypeDefinition as TypeDefinition, {}]
    }

    // TODO: I'm not sure how to handle this.
    return [{} as TypeDefinition, {}]
}

export function infer_schema_from_container_rows(rows: JSONObject[], containerName: string): [CollectionDefinition, ObjectTypeDefinitions] {
    var objectTypeDefnsAccumulator = {};
    var collectionObjectType: NamedObjectTypeDefinition = {
        type: "named",
        name: containerName + "_" + containerName,
        kind: "object"
    };
    rows.forEach(row => {
        const [_containerObjTypeDefinition, objTypeDefns] = infer_schema_of_json_value(row, containerName, containerName + "_", objectTypeDefnsAccumulator);
        objectTypeDefnsAccumulator = objTypeDefns;
    }

    )

    let collectionDefinition: CollectionDefinition = {
        description: null,
        arguments: [],
        resultType: collectionObjectType
    }
    return [collectionDefinition, objectTypeDefnsAccumulator]
}
