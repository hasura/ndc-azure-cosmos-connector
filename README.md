# Azure Cosmos DB Connector

The Azuer Cosmos DB connector allows you to query data present in your Azure Cosmos DB containers as NDC models
for use in your Hasura DDN subgraphs.

## Steps for setting up the local development

1. Make sure NodeJS v18+ is installed.

2. Run the following command to install all the required dependencies:

```sh
npm i
```

3. To build the connector,

```sh
npm run build
```

and to start the connector,

```sh
npm run start serve --configuration connector_config.json
```

The `connector_config.json` connects to a default Azure Cosmos DB that is already being provisioned and can
be used directly, if you choose to use another DB, you will have to change the configuration accordingly.


## Types supported

### Scalar types

Currently, the following scalar types are supported:

1. `Integer`
2. `Number`
3. `String`
4. `Boolean`
