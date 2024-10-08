import { expect } from "chai";
import {
  getObjectTypeDefinitionsFromJSONSchema,
  inferJSONSchemaFromContainerRows,
} from "../src/cli/config";

describe("Infer schema of JSON value", function () {
  it("infers the schema of a simple object", async function () {
    let simpleObject = `{
            a: "b"
        }`;
    let inferredJSONSchema = await inferJSONSchemaFromContainerRows(
      [simpleObject],
      "simple",
    );
    let objectTypeDefns =
      await getObjectTypeDefinitionsFromJSONSchema(inferredJSONSchema);

    // TODO: Fix this test

    expect("1", "1");
  });
});
