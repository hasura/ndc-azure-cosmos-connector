import * as sql from "../src/sqlGeneration";
import { expect } from "chai";

/*
[
    {
        "a": [
            {
                "b": [
                    {
                        "c": 3
                    },
                    {
                        "c": 4
                    }
                ]
            }
        ]
    }
]
*/
let nestedArrayColumn: sql.Column = {
  name: "a",
  prefix: "users",
  nestedField: {
    kind: "array",
    nestedField: {
      kind: "object",
      field: "b",
      nestedField: {
        kind: "array",
        nestedField: {
          kind: "scalar",
          field: "c",
        },
      },
    },
  },
};

let lteComparisonOperator: sql.ComparisonScalarDbOperator = {
  name: "<=",
  isInfix: true,
  isUnary: false,
};

/*
  {
  "a": {
    "b": {
      "c": 3
    }
    }
    }
  */
let nestedObjectColumn: sql.Column = {
  name: "a",
  prefix: "users",
  nestedField: {
    kind: "object",
    field: "b",
    nestedField: {
      kind: "scalar",
      field: "c",
    },
  },
};

/*
{
        "nested_array_object_object_array": [
            {
                "b": {
                    "c": [
                        {
                            "d": 1
                        }
                    ]
                }
            },
            {
                "b": {
                    "c": [
                        {
                            "d": 2
                        }
                    ]
                }
            }
        ]
    }

  */
let nestedArrayObjectObjectArray: sql.Column = {
  name: "nested_array_object_object_array",
  prefix: "users",
  nestedField: {
    kind: "array",
    nestedField: {
      kind: "object",
      field: "b",
      nestedField: {
        kind: "object",
        field: "c",
        nestedField: {
          kind: "array",
          nestedField: {
            kind: "scalar",
            field: "d",
          },
        },
      },
    },
  },
};

/*
      {
        "nested_object_object_object": {
            "b": {
                "c": {
                    "d": 2
                }
            }
        }
    }

    */
let nestedObjectObjectObject: sql.Column = {
  name: "nested_object_object_object",
  prefix: "users",
  nestedField: {
    kind: "object",
    field: "b",
    nestedField: {
      kind: "object",
      field: "c",
      nestedField: {
        kind: "scalar",
        field: "d",
      },
    },
  },
};

// Generate test cases for translateWhereExpression

describe("Nested filtering", function () {
  it("deeply nested array object object array predicate", async function () {
    let variableMap = {};
    let parameterMap = {};
    let query = sql.translateWhereExpression(
      {
        kind: "simpleWhereExpression",
        column: nestedArrayObjectObjectArray,
        operator: lteComparisonOperator,
        value: {
          type: "scalar",
          value: 2,
        },
      },
      parameterMap,
      variableMap,
    );
    expect(query).to.equal(
      `EXISTS(
                SELECT 1
                FROM array_element_1 IN users.nested_array_object_object_array
                WHERE EXISTS(
                SELECT 1
                FROM array_element_2 IN array_element_1.b.c
                WHERE array_element_2.d <= @d_0))`,
    );

    expect(parameterMap).to.deep.equal({ d: [2] });
  });

  it("deeply nested object filtering predicate", async function () {
    let variableMap = {};
    let parameterMap = {};
    let query = sql.translateWhereExpression(
      {
        kind: "simpleWhereExpression",
        column: nestedObjectObjectObject,
        operator: lteComparisonOperator,
        value: {
          type: "scalar",
          value: 2,
        },
      },
      parameterMap,
      variableMap,
    );

    expect(query).to.equal(`users.nested_object_object_object.b.c.d <= @d_0`);

    expect(parameterMap).to.deep.equal({ d: [2] });
  });

  it("Compound predicates combined using AND", async function () {
    let variableMap = {};
    let parameterMap = {};
    let query = sql.translateWhereExpression(
      {
        kind: "and",
        expressions: [
          {
            kind: "simpleWhereExpression",
            column: nestedObjectObjectObject,
            operator: lteComparisonOperator,
            value: {
              type: "scalar",
              value: 2,
            },
          },
          {
            kind: "simpleWhereExpression",
            column: nestedObjectObjectObject,
            operator: lteComparisonOperator,
            value: {
              type: "scalar",
              value: 3,
            },
          },
          {
            kind: "simpleWhereExpression",
            column: {
              name: "username",
              prefix: "users",
            },
            operator: {
              name: "=",
              isInfix: true,
              isUnary: false,
            },
            value: {
              type: "scalar",
              value: "Kacie-Leffler",
            },
          },
        ],
      },
      parameterMap,
      variableMap,
    );

    expect(query).to.eq(
      `(users.nested_object_object_object.b.c.d <= @d_0) AND (users.nested_object_object_object.b.c.d <= @d_2) AND (users.username = @username_0)`,
    );

    expect(parameterMap).to.deep.equal({
      d: [2, 3],
      username: ["Kacie-Leffler"],
    });
  });
});
