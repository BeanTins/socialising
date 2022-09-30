
import { loadFeatures, autoBindSteps } from "jest-cucumber";

import { conversationSteps } from "./helpers/conversation.steps";

let options:any = {}

if (process.env.filter != undefined)
{
    options = {tagFilter: process.env.filter}
}

const features = loadFeatures("**/*.feature", options);
autoBindSteps(features, [ conversationSteps ]);

jest.setTimeout(30000)

