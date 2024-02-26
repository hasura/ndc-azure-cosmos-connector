import { Container, JSONObject, JSONValue } from "@azure/cosmos"
import { ArrayTypeDefinition, BooleanScalarTypeDefinition, BuiltInScalarTypeName, CollectionDefinition, CollectionsSchema, NamedObjectTypeDefinition, NullableTypeDefinition, NumberScalarTypeDefinition, ObjectTypeDefinition, ObjectTypeDefinitions, ObjectTypePropertiesMap, StringScalarTypeDefinition, TypeDefinition } from "./schema";
import { InputData, SerializedRenderResult, jsonInputForTargetLanguage, quicktype } from "quicktype-core";

/**
   * Fetches at-most `n` latest rows from the given container

   * @param n - Maximum number of rows to be fetched from the container
   * @param container - Azure Cosmos DB Container to fetch the rows from.
   * @returns The latest at-most `n` rows from the `container`.

**/
export async function fetch_n_rows_from_container(n: number, container: Container): Promise<string[]> {
    const querySpec = {
        query: `SELECT * FROM ${container.id} c ORDER BY c._ts DESC OFFSET 0 LIMIT ${n}`,
        parameters: []
    }
    var response = await container.items.query(querySpec).fetchAll();

    return response.resources
}

interface JSONDefinitionValueStringType {
    type: "string"
}

interface JSONDefinitionValueNumberType {
    type: "number"
}

interface JSONDefinitionValueIntegerType {
    type: "integer"
}


interface JSONDefinitionValueBooleanType {
    type: "boolean"
}

interface JSONDefinitionValueObjectTypeProperties {
    [propertyName: string]: JSONDefinitionValueType
}

interface JSONDefinitionValueObjectType {
    type: "object",
    properties: JSONDefinitionValueObjectTypeProperties
}

interface JSONDefinitionValueArrayType {
    type: "array",
    items: JSONDefinitionValueObjectTypeProperty
}

interface JSONDefinitionValueNullType {
    type: "null"
}

interface JSONDefinitionValueObjectTypePropertyRef {
    type: "ref"
    '$ref': string
}


type JSONDefinitionValueType
    = JSONDefinitionValueStringType
    | JSONDefinitionValueArrayType
    | JSONDefinitionValueBooleanType
    | JSONDefinitionValueNumberType
    | JSONDefinitionValueIntegerType
    | JSONDefinitionValueObjectType
    | JSONDefinitionValueNullType

type JSONDefinitionValueObjectTypeProperty = JSONDefinitionValueType | JSONDefinitionValueObjectTypePropertyRef

type JSONSchemaDefinitionValues = {
    [typeName: string]: JSONDefinitionValueType
}

type JSONSchema = {
    definitions: JSONSchemaDefinitionValues
}

export async function infer_schema_from_container_rows_quick_type(rows: string[], containerTypeName: string): Promise<JSONSchema> {
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

    return JSON.parse(jsonSchema.lines.join(""))

}

function getPropertyTypeDefn(jsonValueTypeDefn: JSONDefinitionValueObjectTypeProperty): TypeDefinition | null {
    if (jsonValueTypeDefn.type == "ref") {
        // Case of a reference to an object.
        return {
            type: "named",
            name: (jsonValueTypeDefn['$ref'] as string).split('/')[2],
            kind: "object"

        }
    } else if (jsonValueTypeDefn.type == "null") {
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

const Artist = `
[
{
  "Albums": [
    {
      "AlbumId": 1,
      "Name": "Album 1",
      "Artist": {
        "Name": "Artist 1",
        "Albums": [
          {
            "AlbumId": 1,
            "Name": "Album 1"
          }
        ]
      }
    }
  ]
}
]
`


async function run() {
    const containerJSONSchema = await infer_schema_from_container_rows_quick_type(JSON.parse(Artist), "Artist");

    const objectTypes = getObjectTypeDefinitionsFromJSONSchema(containerJSONSchema);



}

run()
