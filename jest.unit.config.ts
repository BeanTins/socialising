
import type {Config} from "@jest/types";

// Sync object
const config: Config.InitialOptions = {
verbose: true,
displayName: "Unit Tests",
preset: "ts-jest",
testMatch: ["**/unit-tests/*tests.ts"],
reporters: [
    'default',
    [ 'jest-junit', {
      outputDirectory: "./reports/unit-tests",
      outputName: "test-results.xml",
    } ]
  ]
}

export default config;

