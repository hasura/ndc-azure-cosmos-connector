# Azure Cosmos Connector

`![Optional Logo Image](path-to-image)`

[![Docs](https://img.shields.io/badge/docs-v3.x-brightgreen.svg?style=flat)](https://hasura.io/docs/3.0/latest/connectors/azure-cosmos/)
[![ndc-hub](https://img.shields.io/badge/ndc--hub-postgres-blue.svg?style=flat)](https://hasura.io/connectors/azure-cosmos)
[![License](https://img.shields.io/badge/license-Apache--2.0-purple.svg?style=flat)](LICENSE.txt)
[![Status](https://img.shields.io/badge/status-alpha-yellow.svg?style=flat)](./readme.md)

With this connector, Hasura allows you to instantly create a real-time GraphQL API on top of your data models in Azure Cosmos Database containers. This connector supports Azure Cosmos's functionalities listed in the table below, allowing for efficient and scalable data operations.

This connector is built using the [Typescript Data Connector SDK](https://github.com/hasura/ndc-sdk-typescript) and implements the [Data Connector Spec](https://github.com/hasura/ndc-spec).

- [Connector information in the Hasura Hub](https://hasura.io/connectors/azure-cosmos)
- [Hasura V3 Documentation](https://hasura.io/docs/3.0)
- [Additional relevant links]

## Features

Below, you'll find a matrix of all supported features for the Azure Cosmos connector:

| Feature                         | Supported | Notes |
| ------------------------------- | --------- | ----- |
| Native Queries + Logical Models |    ✅     |       |
| Simple Object Query             |    ✅     |       |
| Filter / Search                 |    ✅     |       |
| Simple Aggregation              |    ✅     |       |
| Sort                            |    ✅     |       |
| Paginate                        |    ✅     |       |
| Nested Objects                  |    ✅     |       |
| Nested Arrays                   |    ✅     |       |
| Nested Filtering                |    ❌     |       |
| Nested Sorting                  |    ❌     |       |
| Nested Relationships            |    ❌     |       |


## Before you get Started

[Prerequisites or recommended steps before using the connector.]

1. Create a [Hasura Cloud account](https://console.hasura.io)
2. Install the [CLI](https://hasura.io/docs/3.0/cli/installation/)
3. Install the [Hasura VS Code extension](https://marketplace.visualstudio.com/items?itemName=HasuraHQ.hasura)
4. [Create a project](https://hasura.io/docs/3.0/getting-started/create-a-project)

## Using the connector

To use the Azure Cosmos connector, follow these steps in a Hasura project:

1. Add the connector:

   ```bash
   ddn add connector-manifest azure_cosmos_connector --subgraph app --hub-connector hasura/azure-cosmos --type cloud
   ```

   In the snippet above, we've used the subgraph `app` as it's available by default; however, you can change this
   value to match any [subgraph](https://hasura.io/docs/3.0/project-configuration/subgraphs) which you've created in your project.

2. Add your connection details:

   Open your project in your text editor and open the `base.env.yaml` file in the root of your project. Then, add the
   `AZURE_COSMOS_CONNECTOR_DB_NAME`, `AZURE_COSMOS_CONNECTOR_ENDPOINT`, `AZURE_COSMOS_CONNECTOR_KEY` and `AZURE_COSMOS_CONNECTOR_NO_OF_ROWS_TO_FETCH` environment variables with the corresponding details under the `app` subgraph:

   ```yaml
   supergraph: {}
   subgraphs:
     app:
       AZURE_COSMOS_CONNECTOR_DB_NAME: <YOUR_AZURE_DB_NAME>
       AZURE_COSMOS_CONNECTOR_ENDPOINT: <YOUR_AZURE_COSMOS_ENDPOINT>
       AZURE_COSMOS_CONNECTOR_KEY: <YOUR_AZURE_COSMOS_KEY>
       AZURE_COSMOS_CONNECTOR_NO_OF_ROWS_TO_FETCH: <NO-OF-ROWS-TO-FETCH>
   ```

   Note: If no value if provided for `AZURE_COSMOS_CONNECTOR_NO_OF_ROWS_TO_FETCH`, 100 rows will be fetched by the connector by default

   Next, update your `/app/azure_cosmos_connector/connector/azure_cosmos_connector.build.hml` file to reference this new environment
   variable:

   ```yaml
   # other configuration above
   AZURE_COSMOS_DB_NAME:
      valueFromEnv: AZURE_COSMOS_CONNECTOR_DB_NAME
   AZURE_COSMOS_ENDPOINT:
      valueFromEnv: AZURE_COSMOS_CONNECTOR_ENDPOINT
   AZURE_COSMOS_KEY:
      valueFromEnv: AZURE_COSMOS_CONNECTOR_KEY
   AZURE_COSMOS_NO_OF_ROWS_TO_FETCH:
      value: AZURE_COSMOS_CONNECTOR_NO_OF_ROWS_TO_FETCH
   ```

   Notice, when we use an environment variable, we must change the key to `valueFromEnv` instead of `value`. This tells
   Hasura DDN to look for the value in the environment variable we've defined instead of using the value directly.

3. Update the connector manifest and the connector link

   These two steps will (1) allow Hasura to introspect your data source and complete the configuration and (2) deploy the
   connector to Hasura DDN:

   ```bash
   ddn update connector-manifest azure_cosmos_connector
   ```

   ```bash
   ddn update connector-link azure_cosmos_connector
   ```

4. Create a build

   ```bash
   ddn build supergraph-manifest
   ```

   This will return information about the build:

   |               |                                                                                                   |
   | ------------- | ------------------------------------------------------------------------------------------------- |
   | Build Version | 7160058f91                                                                                        |
   | API URL       | https://<PROJECT_NAME>-7160058f91.ddn.hasura.app/graphql                                          |
   | Console URL   | https://console.hasura.io/project/<PROJECT_NAME>/environment/default/build/7160058f91/graphql     |
   | Project Name  | <PROJECT_NAME>                                                                                    |
   | Description   |                                                                                                   |

   Follow the project configuration build [guide](https://hasura.io/docs/3.0/project-configuration/builds/) to apply
   other actions on the build.

5. Test the API

   The console URL in the build information can be used to open the GraphiQL console to test out the API

## Contributing

We're happy to receive any contributions from the community. Please refer to our [development guide](./docs/development.md).

## License

The Hasura Azure Cosmos connector is available under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
