import {OpenAPISpecBuilder, OpenAPISpec} from "../open-api-spec"
import {CognitoAuthorizer} from "../cognito-authorizer"

let spec: OpenAPISpec
let specBuilder: OpenAPISpecBuilder

beforeEach(() => {
  specBuilder = new OpenAPISpecBuilder("3.0.0")
})

test("name specified", async () => {

  specBuilder.withSecurityExtension(new CognitoAuthorizer("Authy", ""))

  spec = specBuilder.build()
  expect(spec["components"]["securitySchemes"]["Authy"]).toBeDefined()
})

test("userPoolArn specified", async () => {

  specBuilder.withSecurityExtension(new CognitoAuthorizer("Authy", "TestUserPoolArn"))

  spec = specBuilder.build()

  const extensionBody = spec["components"]["securitySchemes"]["Authy"]

  expect(extensionBody["x-amazon-apigateway-authorizer"]["providerARNs"][0]).toBe("TestUserPoolArn")
})

test("templated information present", async () => {

  specBuilder.withSecurityExtension(new CognitoAuthorizer("Authy", "TestUserPoolArn"))

  spec = specBuilder.build()

  const extensionBody = spec["components"]["securitySchemes"]["Authy"]

  expect(extensionBody["type"]).toBe("apiKey")
  expect(extensionBody["name"]).toBe("Authorization")
  expect(extensionBody["in"]).toBe("header")
  expect(extensionBody["x-amazon-apigateway-authtype"]).toBe("cognito_user_pools")
  expect(extensionBody["x-amazon-apigateway-authorizer"]["type"]).toBe("cognito_user_pools")
})


