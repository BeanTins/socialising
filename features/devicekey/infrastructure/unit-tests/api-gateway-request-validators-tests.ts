import {OpenAPISpecBuilder, OpenAPISpec, HttpMethod, EndpointBuilder} from "../open-api-spec"
import {APIGatewayRequestValidators} from "../api-gateway-request-validators"

let spec: OpenAPISpec
let specBuilder: OpenAPISpecBuilder
let endpoint: EndpointBuilder

beforeEach(() => {
  specBuilder = new OpenAPISpecBuilder("3.0.0")
  endpoint = specBuilder.withEndpoint("/member/signup", HttpMethod.Post)
})

function buildExtension()
{ 

}

test("extension present", async () => {

  specBuilder = new OpenAPISpecBuilder("3.0.0")
  specBuilder.withExtension(new APIGatewayRequestValidators({
    "all": {validateRequestBody: true, validateRequestParameters: true}
  }))
  
  const spec = specBuilder.build()

  expect(spec["x-amazon-apigateway-request-validators"]).toBeDefined()
})

test("validator specified", async () => {

  specBuilder = new OpenAPISpecBuilder("3.0.0")
  specBuilder.withExtension(new APIGatewayRequestValidators({
    "all": {validateRequestBody: true, validateRequestParameters: true}
  }))
  
  const spec = specBuilder.build()
  expect(spec["x-amazon-apigateway-request-validators"]).toEqual({
    "all": {validateRequestBody: true, validateRequestParameters: true}
  })
})

