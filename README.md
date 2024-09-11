# Azure Cosmos DB for NoSQL Connector

[![Docs](https://img.shields.io/badge/docs-v3.x-brightgreen.svg?style=flat)](https://hasura.io/docs/3.0/latest/connectors/azure-cosmos/)
[![ndc-hub](https://img.shields.io/badge/ndc--hub-azure--cosmos-blue.svg?style=flat)](https://hasura.io/connectors/azure-cosmos)
[![License](https://img.shields.io/badge/license-Apache--2.0-purple.svg?style=flat)](LICENSE.txt)
[![Status](https://img.shields.io/badge/status-alpha-yellow.svg?style=flat)](./readme.md)

With this connector, Hasura allows you to instantly create a real-time GraphQL API on top of your data models in Azure Cosmos DB for NoSQL Database containers. This connector supports Azure Cosmos DB for NoSQL's functionalities listed in the table below, allowing for efficient and scalable data operations.

This connector is built using the [TypeScript Data Connector SDK](https://github.com/hasura/ndc-sdk-typescript) and implements the [Data Connector Spec](https://github.com/hasura/ndc-spec).

- [See the listing in the Hasura Hub](https://hasura.io/connectors/azure-cosmos)
- [Hasura V3 Documentation](https://hasura.io/docs/3.0)

## Features

Below, you'll find a matrix of all supported features for the Azure Cosmos DB for NoSQL connector:

| Feature                         | Supported | Notes |
|---------------------------------|-----------|-------|
| Native Queries + Logical Models | ✅        |       |
| Simple Object Query             | ✅        |       |
| Filter / Search                 | ✅        |       |
| Simple Aggregation              | ✅        |       |
| Sort                            | ✅        |       |
| Paginate                        | ✅        |       |
| Nested Objects                  | ✅        |       |
| Nested Arrays                   | ✅        |       |
| Nested Filtering                | ❌        |       |
| Nested Sorting                  | ❌        |       |
| Nested Relationships            | ❌        |       |


## Before you get Started

1. Create a [Hasura Cloud account](https://console.hasura.io)
2. Please ensure you have the  [DDN CLI](https://hasura.io/docs/3.0/cli/installation) and [Docker](https://docs.docker.com/engine/install/) installed
2. [Create a supergraph](https://hasura.io/docs/3.0/getting-started/init-supergraph)
3. [Create a subgraph](https://hasura.io/docs/3.0/getting-started/init-subgraph)


The steps below explain how to Initialize and configure a connector for local development. You can learn how to deploy a
connector — after it's been configured — [here](https://hasura.io/docs/3.0/getting-started/deployment/deploy-a-connector).

## Using the Azure Cosmos DB for NoSQL connector

### Step 1: Authenticate your CLI session

```bash
ddn auth login
```

### Step 2: Configure the connector

Once you have an initialized supergraph and subgraph, run the initialization command in interactive mode while
providing a name for the connector in the prompt:

```bash
ddn connector init <connector-name> -i
```

#### Step 2.1: Choose the `hasura/azure-cosmos` from the list

#### Step 2.2: Choose a port for the connector

The CLI will ask for a specific port to run the connector on. Choose a port that is not already in use or use the
default suggested port.

#### Step 2.3: Provide the env vars for the connector


| Name                             | Description                                                                   | Required | Default |
|----------------------------------|-------------------------------------------------------------------------------|----------|---------|
| AZURE_COSMOS_KEY                 | Primary/Secondary key asssociated with the Azure Cosmos DB for NoSQL          | Yes      | N/A     |
| AZURE_COSMOS_ENDPOINT            | Endpoint of the Azure Cosmos DB for NoSQL                                     | Yes      | N/A     |
| AZURE_COSMOS_DB_NAME             | Name of the Database                                                          | Yes      | N/A     |
| AZURE_COSMOS_NO_OF_ROWS_TO_FETCH | Maximum number of rows to fetch per container to infer the schema. (Optional) | No       | 100     |




## Step 3: Introspect the connector


```bash
ddn connector introspect <connector-name>
```

This will generate a `configuration.json` file that will have the schema of your Azure Cosmos DB for NoSQL.

## Step 4: Add your resources

```bash
ddn connector-link add-resources <connector-name>
```

This command will track all the containers in your Azure Cosmos DB for NoSQL as [Models](https://hasura.io/docs/3.0/supergraph-modeling/models).
## Contributing

We're happy to receive any contributions from the community. Please refer to our [development guide](./docs/development.md).

## License

The Hasura Azure Cosmos DB for NoSQL connector is available under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
