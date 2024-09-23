// Generate test cases for generateSqlQuerySpec function

import {
  constructSqlQuery,
  SqlQueryContext,
} from "../src/connector/sql/sqlGeneration";
import { SqlQuerySpec } from "@azure/cosmos";

import { expect } from "chai";

// write a function that removes all whitespace from a string
function removeWhitespace(s: string): string {
  return s.replace(/\s/g, "");
}

function normalizeSQL(sql: string): string {
  return sql
    .replace(/\s+/g, " ") // Replace multiple whitespace characters with a single space
    .replace(/\s*([(),])\s*/g, "$1") // Remove spaces around parentheses and commas
    .trim() // Remove leading and trailing whitespace
    .toLowerCase(); // Convert to lowercase for case-insensitive comparison
}

function assertSQLEqual(actual: string, expected: string) {
  const normalizedActual = normalizeSQL(actual);
  const normalizedExpected = normalizeSQL(expected);

  expect(normalizedActual).to.equal(normalizedExpected);
}

describe("constructSqlQuery", () => {
  it("should construct a basic SQL query with select and from clauses", () => {
    const sqlQueryCtx: SqlQueryContext = {
      kind: "sqlQueryContext",
      select: {
        id: { kind: "column", column: { name: "id", prefix: "u" } },
        name: { kind: "column", column: { name: "name", prefix: "u" } },
      },
      from: { source: "users", sourceAlias: "u" },
      selectAsValue: false,
      isAggregateQuery: false,
    };

    const result: SqlQuerySpec = constructSqlQuery(sqlQueryCtx, "u", null);

    assertSQLEqual(
      result.query,
      `SELECT  u.id ?? null as id,u.name ?? null as name FROM users u`,
    );

    expect(result.parameters?.length).to.equals(0);
  });

  it("should handle a query with a where clause and parameters", () => {
    const sqlQueryCtx: SqlQueryContext = {
      kind: "sqlQueryContext",
      select: {
        id: { kind: "column", column: { name: "id", prefix: "u" } },
      },
      from: { source: "users", sourceAlias: "u" },
      predicate: {
        kind: "and",
        expressions: [
          {
            kind: "simpleWhereExpression",
            column: { name: "age", prefix: "u" },
            operator: { name: ">", isInfix: true, isUnary: false },
            value: { type: "scalar", value: 19 },
          },
          {
            kind: "simpleWhereExpression",
            column: { name: "age", prefix: "u" },
            operator: { name: ">", isInfix: true, isUnary: false },
            value: {
              type: "scalar",
              value: 18,
            },
          },
        ],
      },
      selectAsValue: false,
      isAggregateQuery: false,
    };

    const result: SqlQuerySpec = constructSqlQuery(sqlQueryCtx, "u", null);

    assertSQLEqual(
      result.query,
      `SELECT  u.id ?? null as id
                       FROM users u
                       WHERE (u.age > @age_0) AND (u.age > @age_1)`,
    );

    expect(result.parameters).to.deep.equal([
      { name: "@age_0", value: 19 },
      { name: "@age_1", value: 18 },
    ]);
  });

  it("should construct a query with orderBy, offset, and limit clauses", () => {
    const sqlQueryCtx: SqlQueryContext = {
      kind: "sqlQueryContext",
      select: {
        name: { kind: "column", column: { name: "name", prefix: "u" } },
      },
      from: { source: "users", sourceAlias: "u" },
      orderBy: {
        elements: [
          {
            order_direction: "asc",
            target: {
              type: "column",
              name: "name",
              path: [],
            },
          },
        ],
      },
      offset: 10,
      limit: 5,
      selectAsValue: false,
      isAggregateQuery: false,
    };

    const result: SqlQuerySpec = constructSqlQuery(sqlQueryCtx, "u", null);

    assertSQLEqual(
      result.query,
      `SELECT u.name ?? null as name
                      FROM users u
                      ORDER BY u.name ASC
                      OFFSET 10
                      LIMIT 5`,
    );
  });

  it("should handle a query with an aggregate function", () => {
    const sqlQueryCtx: SqlQueryContext = {
      kind: "sqlQueryContext",
      select: {
        total: {
          kind: "aggregate",
          column: { name: "amount", prefix: "o" },
          aggregateFunction: "SUM",
        },
      },
      from: { source: "orders", sourceAlias: "o" },
      selectAsValue: false,
      isAggregateQuery: true,
    };

    const result: SqlQuerySpec = constructSqlQuery(sqlQueryCtx, "orders", null);

    assertSQLEqual(result.query, `SELECT SUM(o.amount) as total FROM orders o`);
  });

  it("should handle a query with selectAsValue set to true", () => {
    const sqlQueryCtx: SqlQueryContext = {
      kind: "sqlQueryContext",
      select: {
        id: { kind: "column", column: { name: "id", prefix: "u" } },
      },
      from: { source: "users", sourceAlias: "u" },
      selectAsValue: true,
      isAggregateQuery: false,
    };

    const result: SqlQuerySpec = constructSqlQuery(sqlQueryCtx, "u", null);

    assertSQLEqual(
      result.query,
      `SELECT VALUE u.id ?? null as id FROM users u`,
    );
  });

  it("should handle a query with a predicate on a column with a nested field", () => {
    const sqlQueryCtx: SqlQueryContext = {
      kind: "sqlQueryContext",
      select: {
        id: { kind: "column", column: { name: "id", prefix: "u" } },
      },
      from: { source: "users", sourceAlias: "u" },
      predicate: {
        kind: "simpleWhereExpression",
        column: {
          name: "nested_array_object_object_array",
          prefix: "u",
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
                    type: "Integer",
                    field: "d",
                  },
                },
              },
            },
          },
        },
        operator: { name: "=", isInfix: true, isUnary: false },
        value: { type: "scalar", value: "Seattle" },
      },
      selectAsValue: false,
      isAggregateQuery: false,
    };

    const result: SqlQuerySpec = constructSqlQuery(sqlQueryCtx, "u", null);

    assertSQLEqual(
      result.query,
      `SELECT  u.id ?? null as id
        FROM users u
        WHERE EXISTS(
                SELECT 1
                FROM array_element_1 IN u.nested_array_object_object_array
                WHERE EXISTS(
                SELECT 1
                FROM array_element_2 IN array_element_1.b.c
                WHERE array_element_2.d = @d_0))`,
    );

    expect(result.parameters).to.deep.equal([
      { name: "@d_0", value: "Seattle" },
    ]);
  });
});
