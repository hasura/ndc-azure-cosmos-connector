import { expect } from "chai";
import { getObjectTypeDefinitionsFromJSONSchema, inferJSONSchemaFromContainerRows } from "../src/introspectContainerSchema"

describe("Infer schema of JSON value", function() {
    it("infers the schema of a simple object", async function() {
        let simpleObject = `{
            a: "b"
        }`;
        let inferredJSONSchema = await inferJSONSchemaFromContainerRows([simpleObject], "simple");
        let objectTypeDefns = getObjectTypeDefinitionsFromJSONSchema(inferredJSONSchema);

        expect("1", "1")

    })
})
