# Azure Cosmos DB Connector

Instructions for developers who wish to contribute or build upon the connector:

## Prerequisites

1. Make sure NodeJS v18+ is installed.
2. Install [Docker](https://www.docker.com/)

## Steps for building and running the connector

### Using Docker

1. Build the dockerfile present in `connector-definition/.hasura-connector`:

```sh
cd connector-definition/.hasura-connector
docker build docker build -t <docker-image-name> .
```

2. Run the `update` command to create a configuration file:

```sh
docker run --rm -v ./:/etc/connector/ -e AZURE_COSMOS_KEY=<YOUR_AZURE_COSMOS_KEY> -e AZURE_COSMOS_ENDPOINT=<YOUR_AZURE_COSMOS_ENDPOINT> -e AZURE_COSMOS_DB_NAME=<YOUR_AZURE_DB_NAME> <docker-image-name> update
```

3. Run the connector:

```sh
docker run --rm -p 8080:8080 -v ./:/etc/connector -e AZURE_COSMOS_KEY=<YOUR_AZURE_COSMOS_KEY> -e AZURE_COSMOS_ENDPOINT=<YOUR_AZURE_COSMOS_ENDPOINT> -e AZURE_COSMOS_DB_NAME=<YOUR_AZURE_DB_NAME> <docker-image-name>
```

Note, to stop the connector:

1. Run 
    ```sh
    docker ps -a
    ```
    and get the connector-name for the <docker-image-name>

2. Run 
    ```sh
    docker stop <connector-name>
    ```

### Using CLI

1. Run the following command to install all the required dependencies:

```sh
npm i
```

2. To build the connector,

```sh
npm run build
```

3. Set the following environment variables:

```sh
export AZURE_COSMOS_ENDPOINT=<YOUR_AZURE_COSMOS_ENDPOINT>
export AZURE_COSMOS_KEY=<YOUR_AZURE_COSMOS_KEY>
export AZURE_COSMOS_DB_NAME=<YOUR_AZURE_DB_NAME>
```

4. Generate the configuration required to run the connector:

```sh
npm install -g
ndc-azure-cosmos update
```

This will generate a `config.json` file in the root directory, by default. The
location of this file can be configured by providing the `--output-directory` command.

5. To start the connector,

```sh
npm run start serve -- --configuration .
```

The `--configuration` directory should contain the configuration file generated in the previous step.

Alternatively, to use a local Azure Cosmos emulator, start the connector with the following command,

```sh
npm run start serve -- --configuration connector_config_emulator.json
```

The emulator can be setup by following [this](https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-develop-emulator?pivots=api-nosql&tabs=windows%2Ccsharp) link.

## Steps to test the connector (ndc-test via emulator)

1. Make sure that the Azure Cosmos emulator is up and running.

2. Create a database contaner and upload data into the emulator,

```sh
cd script
npm i
node app.js
```

3. Start the connector using,

```sh
npm run build
npm run start serve -- --configuration connector_config_emulator.json
```

4. Checkout to the [ndc-spec repository](https://github.com/hasura/ndc-spec) and run

```sh
cargo run --bin ndc-test -- replay --endpoint http://localhost:8080 --snapshots-dir ../ndc-azure-cosmos-connector/ndc-test-snapshots --no-validate-responses
```

Note:

1. The `snapshot-dir` is the relative path from the ndc-spec repository to the `ndc-test-snapshots` folder in the `ndc-azure-cosmos-connector` repository.

2. `--endpoint` is the URL at which the connector is running.


## Types supported

### Scalar types

Currently, the following scalar types are supported:

1. `Integer`
2. `Number`
3. `String`
4. `Boolean`
