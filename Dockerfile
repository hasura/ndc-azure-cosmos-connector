FROM node:20

COPY ./ /app
WORKDIR /app

RUN npm install
RUN npm run build
RUN npm run install-bin

RUN mkdir /etc/connector/

ENV HASURA_CONFIGURATION_DIRECTORY=/etc/connector
ENV HASURA_CONNECTOR_PORT=8080

EXPOSE $HASURA_CONNECTOR_PORT

ENTRYPOINT [ "ndc-azure-cosmos" ]