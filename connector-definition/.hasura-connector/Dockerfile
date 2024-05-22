# Use Node.js 20 as the base image
FROM ghcr.io/hasura/ndc-azure-cosmos:v0.1.0 as build-stage

WORKDIR /usr/src/app

COPY package*.json ./

# Install dependencies only first
RUN npm install

RUN npm install -g typescript

COPY . .

RUN tsc

FROM ghcr.io/hasura/ndc-azure-cosmos:v0.1.0 as production

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY --from=build-stage /usr/src/app/dist ./dist

RUN mkdir /etc/connector

# Define the environment variable for configuration directory with a default value, which can be overridden
ENV HASURA_CONFIGURATION_DIRECTORY=/etc/connector

# Set the default port environment variable and allow it to be overridden
ENV HASURA_CONNECTOR_PORT=8080

# Expose the port specified by the HASURA_CONNECTOR_PORT environment variable
EXPOSE $HASURA_CONNECTOR_PORT

ENTRYPOINT [ "./dist/cli/index.js" ]