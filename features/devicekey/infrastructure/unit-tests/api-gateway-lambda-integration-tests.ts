import {OpenAPISpecBuilder, OpenAPISpec, HttpMethod, EndpointBuilder} from "../open-api-spec"
import {APIGatewayLambdaIntegration} from "../api-gateway-lambda-integration"

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
  return spec["paths"]["/member/signup"]["post"]["x-amazon-apigateway-integration"]
}

test("extension present", async () => {

  endpoint.withExtension(new APIGatewayLambdaIntegration("arn:test", HttpMethod.Post, "arn:IAMRoleArn"))
  
  expect(buildExtension()).toBeDefined()
})

test("uri specified with lambda name", async () => {

  endpoint.withExtension(new APIGatewayLambdaIntegration("arn:test", HttpMethod.Post, "arn:IAMRoleArn"))

  expect(buildExtension()["uri"]).
  toBe("arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:arn:test/invocations")
})

test("http method specified", async () => {

  endpoint.withExtension(new APIGatewayLambdaIntegration("arn:test", HttpMethod.Post, "arn:IAMRoleArn"))

  expect(buildExtension()["httpMethod"]).toBe("POST")
})

test("passthrough behaviour specified", async () => {

  endpoint.withExtension(new APIGatewayLambdaIntegration("arn:test", HttpMethod.Post, "arn:IAMRoleArn"))

  expect(buildExtension()["passthroughBehavior"]).toBe("when_no_match")
})

test("type specified", async () => {

  endpoint.withExtension(new APIGatewayLambdaIntegration("arn:test", HttpMethod.Post, "arn:IAMRoleArn"))

  expect(buildExtension()["type"]).toBe("aws_proxy")
})

test("iam role specified", async () => {

  endpoint.withExtension(new APIGatewayLambdaIntegration("arn:test", HttpMethod.Post, "arn:IAMRoleArn"))

  expect(buildExtension()["credentials"]).toBe("arn:IAMRoleArn")
})
