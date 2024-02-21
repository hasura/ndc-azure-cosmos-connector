import { Container, JSONObject, JSONValue } from "@azure/cosmos"
import { ArrayTypeDefinition, BooleanScalarTypeDefinition, BuiltInScalarTypeName, NamedObjectTypeDefinition, NamedTypeDefinition, NumberScalarTypeDefinition, ObjectPropertyDefinition, ObjectTypeDefinition, StringScalarTypeDefinition, TypeDefinition } from "./schema";

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

function infer_schema_of_json_value(jsonValue: JSONValue, objectTypeName: string): [TypeDefinition, ObjectTypeDefinition[]] {
    if (Array.isArray(jsonValue)) {
        if (jsonValue.length > 0)  {
            const [typeDefn, objectTypeDefns] = infer_schema_of_json_value(jsonValue[0], objectTypeName); // TODO: check if the `objectTypeName` makes sense here?
            const arrayTypeDefn: ArrayTypeDefinition = {
                type: "array",
                elementType: typeDefn
            };
            return [arrayTypeDefn, objectTypeDefns]
        }
    } else if (typeof jsonValue === "object") {
        var objPropertyDefns: ObjectPropertyDefinition[] = [];
        var objTypeDefns: ObjectTypeDefinition[] = [];
        Object.keys(jsonValue as JSONObject).map(key => {
            const value: JSONValue = (jsonValue as JSONObject)[key];
            if (value != null && value != undefined) {
                const [fieldTypeDefinition, currentObjTypeDefns] = infer_schema_of_json_value(value, key);
                objPropertyDefns.push({
                    propertyName: key,
                    description: null,
                    type: fieldTypeDefinition
                });
                objTypeDefns = objTypeDefns.concat(currentObjTypeDefns);
            }
        })
        const currentNamedObjTypeDefn: NamedObjectTypeDefinition = {
            type: "named",
            name: objectTypeName,
            kind: "object"
        };

        const currentObjTypeDefinition: ObjectTypeDefinition = {
            description: null,
            properties: objPropertyDefns
        };

        objTypeDefns.push(currentObjTypeDefinition);

        return [(currentNamedObjTypeDefn as NamedTypeDefinition) as TypeDefinition, objTypeDefns]
    } else if (typeof jsonValue === "string") {
        let stringScalarTypeDefinition: StringScalarTypeDefinition = {
            type: "named",
            name: BuiltInScalarTypeName.String,
            kind: "scalar",
            literalValue: jsonValue as string
        };
        return [stringScalarTypeDefinition as TypeDefinition, []]
    } else if (typeof jsonValue == "number") {
        let numberScalarTypeDefinition: NumberScalarTypeDefinition = {
            type: "named",
            name: BuiltInScalarTypeName.Number,
            kind: "scalar",
            literalValue: jsonValue as number
        };
        return [numberScalarTypeDefinition as TypeDefinition, []]
    } else if (typeof jsonValue == "boolean") {
        let numberScalarTypeDefinition: BooleanScalarTypeDefinition = {
            type: "named",
            name: BuiltInScalarTypeName.Boolean,
            kind: "scalar",
            literalValue: jsonValue as boolean
        };
        return [numberScalarTypeDefinition as TypeDefinition, []]
    }

    // TODO: I'm not sure how to handle this.
    return [{} as TypeDefinition, []]
}

export function infer_schema_from_container_rows(rows: JSONObject[], container_name: string) {

    rows.forEach(row => {
        const [containerObjTypeDefinition, objTypeDefns] = infer_schema_of_json_value(row, container_name)
        console.log(`containerObjTypeDefinition is ${JSON.stringify(containerObjTypeDefinition, null, 2)} \n and object type definitions are ${JSON.stringify(objTypeDefns, null, 2) }`)
    }

    )
}

const sampleRow = `
[
{"hello": [[1]] }
]
`;

infer_schema_from_container_rows(JSON.parse(sampleRow) , "Artists");
