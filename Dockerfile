FROM node:20

COPY ./ /app
WORKDIR /app

RUN npm install
RUN npm run install-bin

RUN mkdir -p /etc/connector/
WORKDIR /etc/connector/

ENV HASURA_CONFIGURATION_DIRECTORY=/etc/connector

ENTRYPOINT [ "ndc-azure-cosmos" ]