import * as sdk from "@hasura/ndc-sdk-typescript";
import { createConnector } from "./connector"

sdk.start(createConnector({ configFilePath: "config.json" }))
