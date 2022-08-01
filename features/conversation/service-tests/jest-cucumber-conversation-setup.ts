
import { loadFeatures, autoBindSteps } from "jest-cucumber";

import { conversationSteps } from "./helpers/conversation.steps";

const features = loadFeatures("**/*.feature");
autoBindSteps(features, [ conversationSteps ]);

jest.setTimeout(30000)

