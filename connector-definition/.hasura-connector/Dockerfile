# Use Node.js 20 as the base image
FROM ghcr.io/hasura/ndc-azure-cosmos:v0.1.1

WORKDIR /app

# Define the environment variable for configuration directory with a default value, which can be overridden
ENV HASURA_CONFIGURATION_DIRECTORY=/etc/connector

# Set the default port environment variable and allow it to be overridden
ENV HASURA_CONNECTOR_PORT=8080

# Expose the port specified by the HASURA_CONNECTOR_PORT environment variable
EXPOSE $HASURA_CONNECTOR_PORT

ENTRYPOINT [ "./dist/cli/index.js", "start" ]