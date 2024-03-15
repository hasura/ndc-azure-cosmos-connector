import * as sdk from "@hasura/ndc-sdk-typescript";
import * as cosmos from "@azure/cosmos";
import { SqlQuerySpec } from "@azure/cosmos";

export type SelectContainerColumn = {
    kind: 'column',
    columnName: string
}

export type SelectAggregate = {
    kind: 'aggregate',
    columnName: string,
    aggregateFunction: string
}

/*
  The key represents the alias of the request field and the
  value represents the value to be selected from the container.
*/
export type SelectColumns = {
    [alias: string]: (SelectContainerColumn | SelectAggregate)
}

export type SqlQueryGenerationContext = {
    selectFields: SelectColumns,
    limit?: number | null,
    offset?: number | null,
    orderBy?: sdk.OrderBy | null,
    predicate?: sdk.Expression | null,
    isAggregateQuery: boolean,
}

/*
  Type to track the parameters used in the SQL query.
 */
type SqlParameters = {
    [column: string]: any[]
}

export function generateSqlQuery(sqlGenCtx: SqlQueryGenerationContext, containerName: string, containerAlias: string): SqlQuerySpec {
    let sqlQueryParts: string[] = []
    let selectColumns: string = formatSelectColumns(sqlGenCtx.selectFields, containerAlias)

    sqlQueryParts.push(["SELECT", selectColumns].join(" "));
    sqlQueryParts.push(["FROM", containerName, containerAlias].join(" "));

    let predicateParameters: SqlParameters = {};
    if (sqlGenCtx.predicate != null && sqlGenCtx.predicate != undefined) {
        const whereExp = visitExpression(predicateParameters, sqlGenCtx.predicate, containerAlias);
        sqlQueryParts.push(`WHERE ${whereExp}`);
    }


    if (sqlGenCtx.orderBy != null && sqlGenCtx.orderBy != null && sqlGenCtx.orderBy.elements.length > 0) {
        const orderByClause = visitOrderByElements(sqlGenCtx.orderBy.elements, containerAlias);
        sqlQueryParts.push(["ORDER BY", orderByClause].join(" "))
    }

    if (sqlGenCtx.offset != undefined && sqlGenCtx.offset != null) {
        sqlQueryParts.push(["OFFSET", `${sqlGenCtx.offset}`].join(" "))
    }

    if (sqlGenCtx.limit != undefined && sqlGenCtx.limit != null) {
        sqlQueryParts.push(["LIMIT", `${sqlGenCtx.limit}`].join(" "))
    }

    const query = sqlQueryParts.join("\n");

    return {
        query,
        parameters: serializeSqlParameters(predicateParameters)
    };

}

function formatSelectColumns(fieldsToSelect: SelectColumns, containerAlias: string): string {
    return Object.entries(fieldsToSelect).map(([alias, selectColumn]) => {
        switch (selectColumn.kind) {
            case 'column':
                return `${containerAlias}.${selectColumn.columnName} ?? null as ${alias}`
            case 'aggregate':
                return `${selectColumn.aggregateFunction}(${containerAlias}.${selectColumn.columnName}) as ${alias}`
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
                return `${containerAlias}.${value.target.name} ${direction}`
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
function visitExpressionWithParentheses(parameters: SqlParameters, expression: sdk.Expression, containerAlias: string): string {
    return `(${visitExpression(parameters, expression, containerAlias)})`
}

function visitExpression(parameters: SqlParameters, expression: sdk.Expression, containerAlias: string): String {
    switch (expression.type) {
        case "and":
            if (expression.expressions.length > 0) {
                return expression.expressions.map(expr => visitExpressionWithParentheses(parameters, expr, containerAlias)).join(" AND ")
            } else {
                return "true"
            };

        case "or":
            if (expression.expressions.length > 0) {
                return expression.expressions.map(expr => visitExpressionWithParentheses(parameters, expr, containerAlias)).join(" OR ")
            } else {
                return "false"
            };
        case "not":
            return `NOT ${visitExpressionWithParentheses(parameters, expression.expression, containerAlias)}`
        case "unary_comparison_operator":
            switch (expression.operator) {
                case "is_null":
                    return `IS_NULL(${visitComparisonTarget(expression.column, containerAlias)})`
                default:
                    throw new sdk.BadRequest("Unknown unary comparison operator")

            }
        case "binary_comparison_operator":
            const comparisonTarget = visitComparisonTarget(expression.column, containerAlias);
            switch (expression.operator) {
                case "eq":
                    return `${comparisonTarget} = ${visitComparisonValue(parameters, expression.value, comparisonTarget)}`
                case "neq":
                    return `${comparisonTarget} != ${visitComparisonValue(parameters, expression.value, comparisonTarget)}`
                case "gte":
                    return `${comparisonTarget} >= ${visitComparisonValue(parameters, expression.value, comparisonTarget)}`
                case "gt":
                    return `${comparisonTarget} > ${visitComparisonValue(parameters, expression.value, comparisonTarget)}`
                case "lte":
                    return `${comparisonTarget} <= ${visitComparisonValue(parameters, expression.value, comparisonTarget)}`
                case "lt":
                    return `${comparisonTarget} < ${visitComparisonValue(parameters, expression.value, comparisonTarget)}`
                default:
                    throw new sdk.BadRequest(`Unknown binary comparison operator ${expression.operator} found`)
            }


        case "exists":
            throw new sdk.NotSupported('EXISTS operator is not supported.')

    }
}

function visitComparisonTarget(target: sdk.ComparisonTarget, containerAlias: string): string {
    switch (target.type) {
        case 'column':
            if (target.path.length > 0) {
                throw new sdk.NotSupported("Relationships are not supported");
            }
            return `${containerAlias}.${target.name}`;
        case 'root_collection_column':
            throw new sdk.NotSupported("Relationships are not supported");
    }
}

function visitComparisonValue(parameters: SqlParameters, target: sdk.ComparisonValue, comparisonTarget: string): string {
    switch (target.type) {
        case 'scalar':
            const comparisonTargetName = comparisonTarget.replace(".", "_");
            const comparisonTargetParameterValues = parameters[comparisonTargetName];
            if (comparisonTargetParameterValues != null) {
                const index = comparisonTargetParameterValues.findIndex((element) => element === target.value);
                if (index !== -1) {
                    return `@${comparisonTargetName}${index}`
                } else {
                    let newIndex = parameters[comparisonTargetName].push(target.value);
                    return `@${comparisonTargetName}${newIndex}`
                }
            } else {
                parameters[comparisonTargetName] = [target.value];
                return `@${comparisonTargetName}0`
            }

        case 'column':
            throw new sdk.NotSupported("Column comparisons are not supported in field predicates yet");
        case 'variable':
            throw new sdk.NotSupported("Variables are not supported yet")
    }
}

function serializeSqlParameters(parameters: SqlParameters): cosmos.SqlParameter[] {
    let sqlParameters: cosmos.SqlParameter[] = [];

    for (const comparisonTarget in parameters) {
        const comparisonTargetValues = parameters[comparisonTarget];

        for (let i = 0; i < comparisonTargetValues.length; i++) {
            sqlParameters.push({
                name: `@${comparisonTarget}${i}`,
                value: comparisonTargetValues[i]
            })
        }
    }

    return sqlParameters
}
