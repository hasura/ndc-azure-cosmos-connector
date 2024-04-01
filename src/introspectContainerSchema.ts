import { Container } from "@azure/cosmos"
import * as sdk from "@hasura/ndc-sdk-typescript";
import { BuiltInScalarTypeName, ObjectTypeDefinitions, TypeDefinition, ObjectTypePropertiesMap } from "./schema";
import { InputData, jsonInputForTargetLanguage, quicktype } from "quicktype-core";
import { JSONSchema, JSONDefinitionValueObjectTypeProperty } from "./jsonSchema";
import { runSQLQuery } from "./cosmosDb"

/**
   * Fetches at-most `n` latest updated rows from the given container

   * @param n - Maximum number of rows to be fetched from the container
   * @param container - Azure Cosmos DB Container to fetch the rows from.
   * @returns The latest at-most `n` rows from the `container`.

**/
export async function fetchLatestNRowsFromContainer(n: number, container: Container): Promise<string[]> {
    const querySpec = {
        query: `SELECT * FROM ${container.id} c ORDER BY c._ts DESC OFFSET 0 LIMIT ${n}`,
        parameters: []
    }

    return await runSQLQuery<string>(querySpec, container)
}

export async function inferJSONSchemaFromContainerRows(rows: string[], containerTypeName: string): Promise<[string, JSONSchema]> {
    const jsonInput = jsonInputForTargetLanguage("schema");


    await jsonInput.addSource({
        name: containerTypeName,
        samples: rows.map(x => JSON.stringify(x))
    });

    const inputData = new InputData();
    inputData.addInput(jsonInput);

    let jsonSchema = await quicktype({
        inputData,
        lang: "schema"
    });

    console.log(jsonSchema.lines.join("\n"));

    let jsonSchemaOutput = JSON.parse(jsonSchema.lines.join(""));

    if (jsonSchemaOutput["$ref"] !== null) {
        // We need to do this because if the container name is in lowercase, quicktype
        // still capitalizes the types that it infers from the schema.
        return [((jsonSchemaOutput['$ref'] as string).split('/')[2]), jsonSchemaOutput]
    } else {
        throw new sdk.InternalServerError("Could not find the object type of the collection ${containerTypeName} while inferring the schema")
    }
}

function getPropertyTypeDefn(jsonValueTypeDefn: JSONDefinitionValueObjectTypeProperty): TypeDefinition | null {
    if (jsonValueTypeDefn.type == "null") {
        // We don't have enough information to predict anything about the property. So, just
        // return null.
        return null
    } else if (jsonValueTypeDefn.type == "array") {
        if ('$ref' in jsonValueTypeDefn.items) {
            return {
                "type": "array",
                "elementType": {
                    "type": "named",
                    "name": (jsonValueTypeDefn.items['$ref'] as string).split('/')[2],
                    "kind": "object"
                }
            }
        } else {
            let propertyTypeDefn = getPropertyTypeDefn(jsonValueTypeDefn.items);
            if (propertyTypeDefn != null) {
                return {
                    "type": "array",
                    "elementType": propertyTypeDefn
                }
            } else {
                return null
            }
        }
    } else if (jsonValueTypeDefn.type == "string") {
        return {
            "type": "named",
            name: BuiltInScalarTypeName.String,
            kind: "scalar"
        }
    } else if (jsonValueTypeDefn.type == "number") {
        return {
            "type": "named",
            name: BuiltInScalarTypeName.Number,
            kind: "scalar"
        }
    }
    else if (jsonValueTypeDefn.type == "integer") {
        return {
            "type": "named",
            name: BuiltInScalarTypeName.Number,
            kind: "scalar"
        }
    } else if (jsonValueTypeDefn.type == "boolean") {
        return {
            "type": "named",
            name: BuiltInScalarTypeName.Boolean,
            kind: "scalar"
        }
    } else if (typeof jsonValueTypeDefn === "object") {
        // Case of a reference to an object
        if (jsonValueTypeDefn['$ref'] !== null && jsonValueTypeDefn['$ref'] !== undefined) {
            return {
                type: "named",
                name: (jsonValueTypeDefn['$ref'] as string).split('/')[2],
                kind: "object"
            }
        }

    }

    return null
}

export function getObjectTypeDefinitionsFromJSONSchema(containerJSONSchema: JSONSchema): ObjectTypeDefinitions {
    var objectTypeDefinitions: ObjectTypeDefinitions = {};
    Object.entries(containerJSONSchema.definitions).forEach(([objectTypeName, objectTypeDefinition]) => {
        if (objectTypeDefinition.type == "object") {
            var objectTypeProperties: ObjectTypePropertiesMap = {};

            Object.entries(objectTypeDefinition.properties).map(([propertyName, propertyDefn]) => {

                let propertyTypeDefn = getPropertyTypeDefn(propertyDefn);

                if (propertyTypeDefn !== null) {
                    objectTypeProperties[propertyName] = {
                        propertyName: propertyName,
                        description: null,
                        type: propertyTypeDefn
                    };
                }

            })

            objectTypeDefinitions[objectTypeName] = {
                description: null,
                properties: objectTypeProperties
            }
        }
    }
    )
    return objectTypeDefinitions
}
