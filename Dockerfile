FROM node:20

COPY ./ /usr/src/app
WORKDIR /usr/src/app

RUN npm install
RUN npm run install-bin

RUN mkdir /etc/connector/
WORKDIR /etc/connector/

ENTRYPOINT [ "ndc-azure-cosmos" ]