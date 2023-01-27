import {OpenAPISpecBuilder, OpenAPISpec, HttpMethod, EndpointBuilder} from "../open-api-spec"
import {APIGatewayRequestValidator} from "../api-gateway-request-validator"

let spec: OpenAPISpec
let specBuilder: OpenAPISpecBuilder
let endpoint: EndpointBuilder

beforeEach(() => {
  specBuilder = new OpenAPISpecBuilder("3.0.0")
  endpoint = specBuilder.withEndpoint("/member/signup", HttpMethod.Post)
})

function buildExtension()
{
  spec = specBuilder!.build()
  return spec["paths"]["/member/signup"]["post"]["x-amazon-apigateway-request-validator"]
}

test("extension present", async () => {

  endpoint.withExtension(new APIGatewayRequestValidator("all"))
  
  expect(buildExtension()).toBeDefined()
})

test("validator specified", async () => {

  endpoint.withExtension(new APIGatewayRequestValidator("all"))

  expect(buildExtension()).toBe("all")
})

