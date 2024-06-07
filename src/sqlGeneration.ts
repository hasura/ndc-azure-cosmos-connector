import * as sdk from "@hasura/ndc-sdk-typescript";
import * as cosmos from "@azure/cosmos";
import { SqlQuerySpec } from "@azure/cosmos";
import * as schema from "./schema";

export type Column = {
    name: string,
    prefix: string,
}

export type SelectContainerColumn = {
    kind: 'column',
    column: Column
}

export type SelectAggregate = {
    kind: 'aggregate',
    column: Column,
    aggregateFunction: string
}

export type SelectColumn = SelectContainerColumn | SelectAggregate | SqlQueryContext

/*
  The key represents the alias of the request field and the
  value represents the value to be selected from the container.
*/
export type SelectColumns = {
    [alias: string]: SelectColumn
}

export type QueryVariable = {
    [k: string]: unknown
}

export type QueryVariables = QueryVariable[] | null | undefined

/*
  Type to track the parameters used in the SQL query.
 */
type SqlParameters = {
    [column: string]: any[]
}

export type FromClause = {
    source: string,
    sourceAlias: string,
    in?: string,
}

export type ContainerExpression = {
    kind: 'containerExpression',
    containerExpression: string
}

export type SqlExpression = {
    kind: 'sqlExpression',
    sqlExpression: SqlQueryContext
}

export type ArrayJoinTarget = ContainerExpression | SqlExpression

export type ArrayJoinClause = {
    type: 'array',
    joinIdentifier: string,
    arrayJoinTarget: ArrayJoinTarget,
}

export type SubqueryJoinClause = {
    type: 'subquery',
    from: string,
    subQuery: SqlQueryContext,
    subQueryAs: string,
}

export type JoinClause = ArrayJoinClause | SubqueryJoinClause;

type ScalarDbOperator = {
    name: string,
    isInfix: boolean
}

// Defines how the NDC's scalar operators map to the DB operators
type ScalarDBOperatorMappings = {
    comparison: {
        [operatorName: string]: ScalarDbOperator
    },
    aggregate?: {
        [operatorName: string]: ScalarDbOperator
    } | undefined

};

type ScalarOperatorMappings = {
    [scalarTypeName: string]: ScalarDBOperatorMappings
}


export const scalarComparisonOperatorMappings: ScalarOperatorMappings = {

    "Integer": {
        "comparison": {
            "eq": {
                "name": "=",
                "isInfix": true
            },
            "neq": {
                "name": "!=",
                "isInfix": true
            },
            "gt": {
                "name": ">",
                "isInfix": true
            },
            "lt": {
                "name": "<",
                "isInfix": true
            },
            "gte": {
                "name": ">=",
                "isInfix": true
            },
            "lte": {
                "name": "<=",
                "isInfix": true
            }
        }

    },
    "Number": {
        "comparison": {
            "eq": {
                "name": "=",
                "isInfix": true
            },
            "neq": {
                "name": "!=",
                "isInfix": true
            },
            "gt": {
                "name": ">",
                "isInfix": true
            },
            "lt": {
                "name": "<",
                "isInfix": true
            },
            "gte": {
                "name": ">=",
                "isInfix": true
            },
            "lte": {
                "name": "<=",
                "isInfix": true
            }
        }

    },
    "Boolean": {
        "comparison": {
            "eq": {
                "name": "=",
                "isInfix": true
            },
            "neq": {
                "name": "!=",
                "isInfix": true
            }
        }

    },
    "String": {
        "comparison": {
            "eq": {
                "name": "=",
                "isInfix": true
            },
            "neq": {
                "name": "!=",
                "isInfix": true
            },
            "gt": {
                "name": ">",
                "isInfix": true
            },
            "lt": {
                "name": "<",
                "isInfix": true
            },
            "gte": {
                "name": ">=",
                "isInfix": true
            },
            "lte": {
                "name": "<=",
                "isInfix": true
            },
            "contains": {
                "name": "CONTAINS",
                "isInfix": false,
            },
            "endswith": {
                "name": "ENDSWITH",
                "isInfix": false,
            },
            "regexmatch": {
                "name": "REGEXMATCH",
                "isInfix": false,
            },
            "startswith": {
                "name": "STARTSWITH",
                "isInfix": false
            }
        }

    },
};

export function getDbComparisonOperator(scalarTypeName: string, operator: string): ScalarDbOperator {
    const scalarOperators = scalarComparisonOperatorMappings[scalarTypeName];

    if (scalarOperators === undefined && scalarOperators === null) {
        throw new sdk.BadRequest(`Couldn't find scalar type: ${scalarTypeName} in the schema`)
    } else {
        const scalarDbOperator = scalarOperators.comparison[operator];

        if (scalarDbOperator) {
            return scalarDbOperator
        } else {
            throw new sdk.BadRequest(`Comparison Operator ${operator} is not supported on type ${scalarTypeName}`)
        }
    }


}


export type ComparisonTarget =
    | {
        type: "column";
        /**
         * The name of the column
         */
        name: string;
    }
    | {
        type: "root_collection_column";
        /**
         * The name of the column
         */
        name: string;
    };

export type ComparisonValue =
    | {
        type: "column";
        column: string;
    }
    | {
        type: "scalar";
        value: unknown;
    }
    | {
        type: "variable";
        name: string;
    };

export type Expression =
    | {
        type: "and";
        expressions: Expression[];
    }
    | {
        type: "or";
        expressions: Expression[];
    }
    | {
        type: "not";
        expression: Expression;
    }
    | {
        type: "unary_comparison_operator";
        column: string;
        operator: "is_null";
    }
    | {
        type: "binary_comparison_operator";
        column: string;
        value: ComparisonValue;
        dbOperator: ScalarDbOperator;
    };




export type SqlQueryContext = {
    kind: 'sqlQueryContext',
    select: SelectColumns,
    /* Set to `true` to prevent the wrapping of the results into another JSON object. */
    selectAsValue: boolean,
    from?: FromClause | null,
    join?: JoinClause[] | null,
    predicate?: Expression | null,
    offset?: number | null,
    limit?: number | null,
    orderBy?: sdk.OrderBy | null,
    isAggregateQuery: boolean,
    selectAsArray?: boolean | undefined
}

type VariablesMappings = {
    /*
      The variableTarget will be the name of the column
      which gets the value of the variable
     */
    [variableTarget: string]: string
}

function formatJoinClause(joinClause: JoinClause): string {
    if (joinClause.type === "array") {
        let joinTarget =
            joinClause.arrayJoinTarget.kind === 'containerExpression'
                ? joinClause.arrayJoinTarget.containerExpression
                : constructSqlQuery(joinClause.arrayJoinTarget.sqlExpression, joinClause.joinIdentifier, null);

        return `${joinClause.joinIdentifier} in (${joinTarget})`
    } else {
        return `(${constructSqlQuery(joinClause.subQuery, joinClause.from, null).query}) ${joinClause.subQueryAs}`;
    }

}

function formatFromClause(fromClause: FromClause): string {
    if (fromClause.in !== undefined) {
        return `${fromClause.in} IN ${fromClause.source}`
    } else {
        return `${fromClause.source} ${fromClause.sourceAlias}`
    }
}

/** Constructs a SQL query from the given `sqlQueryContext`
   * @param sqlQueryCtx - `SqlQueryContext` which contains the data required to generate the SQL query.
   * @param source - `source` to run the query on. Note that, the source can be a container or a nested field of a document of a container.
   * @param queryVariables - values of the variables provided with the request.

 */
function constructSqlQuery(sqlQueryCtx: SqlQueryContext, source: string, queryVariables: QueryVariables): cosmos.SqlQuerySpec {
    let selectColumns = formatSelectColumns(sqlQueryCtx.select);

    let fromClause =
        sqlQueryCtx.from === null || sqlQueryCtx.from === undefined
            ? null :
            formatFromClause(sqlQueryCtx.from);

    let whereClause = null;
    let predicateParameters: SqlParameters = {};
    let utilisedVariables: VariablesMappings = {}; // This will be used to add the join mappings to the where expression.

    let parameters: cosmos.SqlParameter[] = [];

    if (sqlQueryCtx.predicate != null && sqlQueryCtx.predicate != undefined) {

        const whereExp = visitExpression(predicateParameters, utilisedVariables, sqlQueryCtx.predicate, source);

        whereClause = `WHERE ${whereExp}`

        parameters = serializeSqlParameters(predicateParameters);

        if (Object.keys(utilisedVariables).length > 0) {
            if (queryVariables === null || queryVariables === undefined) {
                throw new sdk.BadRequest(`The variables (${JSON.stringify(Object.values(utilisedVariables))}) were referenced in the variable, but their values were not provided`)
            } else {
                parameters.push({
                    name: '@vars',
                    value: queryVariables as cosmos.JSONValue
                });
            }

        }
    }

    let joinClause = null;

    if (Object.keys(utilisedVariables).length > 0) {
        let variablesJoinTarget: ArrayJoinTarget = {
            kind: 'containerExpression',
            containerExpression: 'SELECT VALUE @vars'
        };
        let joinExp: JoinClause = {
            type: 'array',
            joinIdentifier: "vars",
            arrayJoinTarget: variablesJoinTarget,
        };
        joinClause = `JOIN ${formatJoinClause(joinExp)}`
    }

    let orderByClause = null;

    if (sqlQueryCtx.orderBy != null && sqlQueryCtx.orderBy != null && sqlQueryCtx.orderBy.elements.length > 0) {
        orderByClause = visitOrderByElements(sqlQueryCtx.orderBy.elements, source);
    }

    let offsetClause = null;

    if (sqlQueryCtx.offset != undefined && sqlQueryCtx.offset != null) {
        offsetClause = `${sqlQueryCtx.offset}`;
    }

    let limitClause = null;

    if (sqlQueryCtx.limit != undefined && sqlQueryCtx.limit != null) {
        limitClause = `${sqlQueryCtx.limit}`

    }

    let query =
        `SELECT ${sqlQueryCtx.selectAsValue ? 'VALUE' : ''} ${selectColumns}
        ${fromClause ? 'FROM ' + fromClause : ''}
        ${joinClause ?? ''}
        ${whereClause ?? ''}
        ${orderByClause ? 'ORDER BY ' + orderByClause : ''}
        ${offsetClause ? 'OFFSET ' + offsetClause : ''}
        ${limitClause ? 'LIMIT ' + limitClause : ''}`;


    return {
        query,
        parameters
    }
}

export function generateSqlQuerySpec(sqlGenCtx: SqlQueryContext, containerName: string, queryVariables: QueryVariables, schema: schema.CollectionsSchema): SqlQuerySpec {

    return constructSqlQuery(sqlGenCtx, `root_${containerName}`, queryVariables);

}

export function formatColumn(column: Column) {
    return `${column.prefix}.${column.name}`
}


function formatSelectColumns(fieldsToSelect: SelectColumns): string {
    if (Object.keys(fieldsToSelect).length === 0) {
        return "VALUE {}"
    }
    return Object.entries(fieldsToSelect).map(([alias, selectColumn]) => {
        switch (selectColumn.kind) {
            case 'column':
                return `${formatColumn(selectColumn.column)} ?? null as ${alias}`
            case 'sqlQueryContext':
                let query = constructSqlQuery(selectColumn, alias, null).query.trim();
                if (selectColumn.selectAsArray) {
                    return `(ARRAY(${query})) as ${alias}`
                } else {
                    return `(${query}) as ${alias}`
                }
            case 'aggregate':
                return `${selectColumn.aggregateFunction} (${formatColumn(selectColumn.column)}) as ${alias} `
        }
    }).join(",");

}

/*
  Traverses over the order by elements and generates the ORDER BY clause.
  NOTE that this function expects the `values` parameter to be a non-empty list.
 */
function visitOrderByElements(values: sdk.OrderByElement[], containerAlias: string): string {
    if (values.length === 0) {
        throw new sdk.InternalServerError("visit_order_by_elements called with an empty list")
    }
    return values.map(element => visitOrderByElement(element, containerAlias)).join(", ");

}

function visitOrderByElement(value: sdk.OrderByElement, containerAlias: string): string {
    const direction = value.order_direction === 'asc' ? 'ASC' : 'DESC';

    switch (value.target.type) {
        case 'column':
            if (value.target.path.length > 0) {
                throw new sdk.NotSupported("Relationships are not supported in order_by.")
            } else {
                return `${containerAlias}.${value.target.name} ${direction} `
            }

        case 'single_column_aggregate':
            throw new sdk.NotSupported("Order by aggregate is not supported")

        case 'star_count_aggregate':
            throw new sdk.NotSupported("Order by aggregate is not supported")
    }
}

/*
  Wraps the expression in parantheses to avoid generating SQL with wrong operator precedence.
 */
function visitExpressionWithParentheses(parameters: SqlParameters, variables: VariablesMappings, expression: Expression, containerAlias: string): string {
    return `(${visitExpression(parameters, variables, expression, containerAlias)})`
}

function visitExpression(parameters: SqlParameters, variables: VariablesMappings, expression: Expression, containerAlias: string): string {
    switch (expression.type) {
        case "and":
            if (expression.expressions.length > 0) {
                return expression.expressions.map(expr => visitExpressionWithParentheses(parameters, variables, expr, containerAlias)).join(" AND ")
            } else {
                return "true"
            };

        case "or":
            if (expression.expressions.length > 0) {
                return expression.expressions.map(expr => visitExpressionWithParentheses(parameters, variables, expr, containerAlias)).join(" OR ")
            } else {
                return "false"
            };

        case "not":
            return `NOT ${visitExpressionWithParentheses(parameters, variables, expression.expression, containerAlias)} `

        case "unary_comparison_operator":
            switch (expression.operator) {
                case "is_null":
                    return `IS_NULL(${expression.column})`
            }

        case "binary_comparison_operator":
            const comparisonValue = visitComparisonValue(parameters, variables, expression.value, expression.column, containerAlias);

            if (expression.dbOperator.isInfix) {
                return `${containerAlias}.${expression.column} ${expression.dbOperator.name} ${comparisonValue}`
            } else {
                return `${expression.dbOperator.name}(${containerAlias}.${expression.column}, ${comparisonValue}) `
            }

    }
}

export function visitComparisonTarget(target: sdk.ComparisonTarget): string {
    switch (target.type) {
        case 'column':
            if (target.path.length > 0) {
                throw new sdk.NotSupported("Relationship fields are not supported in predicates.");
            }
            return target.name;
        case 'root_collection_column':
            throw new sdk.NotSupported("Root collection column comparison is not supported");
    }
}

function visitComparisonValue(parameters: SqlParameters, variables: VariablesMappings, target: ComparisonValue, comparisonTarget: string, containerAlias: string): string {
    switch (target.type) {
        case 'scalar':
            const comparisonTargetName = comparisonTarget.replace(".", "_");
            const comparisonTargetParameterValues = parameters[comparisonTargetName];
            if (comparisonTargetParameterValues != null) {
                const index = comparisonTargetParameterValues.findIndex((element) => element === target.value);
                if (index !== -1) {
                    return `@${comparisonTargetName}_${index} `
                } else {
                    let newIndex = parameters[comparisonTargetName].push(target.value);
                    return `@${comparisonTargetName}_${newIndex} `
                }
            } else {
                parameters[comparisonTargetName] = [target.value];
                return `@${comparisonTargetName}_0`
            }

        case 'column':
            return `${containerAlias}.${target.column}`

        case 'variable':
            variables[comparisonTarget] = `vars["${target.name}"]`
            return `vars["${target.name}"]`

    }
}

function serializeSqlParameters(parameters: SqlParameters): cosmos.SqlParameter[] {
    let sqlParameters: cosmos.SqlParameter[] = [];

    for (const comparisonTarget in parameters) {
        const comparisonTargetValues = parameters[comparisonTarget];

        for (let i = 0; i < comparisonTargetValues.length; i++) {
            sqlParameters.push({
                name: `@${comparisonTarget}_${i}`,
                value: comparisonTargetValues[i]
            })
        }
    }

    return sqlParameters
}
