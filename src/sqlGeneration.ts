import * as sdk from "@hasura/ndc-sdk-typescript";

/*
  The key represents the alias of the request field and the
  value represents the name of the column present in the container.
*/
export type AliasColumnMapping = {
    [alias: string]: string
}


export type SqlQueryGenerationContext = {
    fieldsToSelect: AliasColumnMapping,
    limit?: number | null,
    offset?: number | null,
    orderBy?: sdk.OrderBy | null
}

function formatSQLQuery(selectColumns: string, fromContainer: string, containerAlias: string, limit?: number | null, offset?: number | null): string {
    let sqlQuery: string[] = []
    sqlQuery.push(["SELECT", selectColumns].join(" "));
    sqlQuery.push(["FROM", fromContainer, containerAlias].join(" "));

    if (offset != undefined && offset != null) {
        sqlQuery.push(["OFFSET", `${offset}`].join(" "))
    }

    if (limit != undefined && limit != null) {
        sqlQuery.push(["LIMIT", `${limit}`].join(" "))
    }

    return sqlQuery.join("\n")
}

function generateSQLQuery(ctx: SqlQueryGenerationContext, containerName: string): string {
    return formatSQLQuery()
}
