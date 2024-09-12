import * as sdk from "@hasura/ndc-sdk-typescript";
import { createConnector } from "./connector/connector";

sdk.start(createConnector());
