import * as sdk from "@hasura/ndc-sdk-typescript";
import { createConnector } from "./connector"

export function startConnector() {
    sdk.start(createConnector())
}
