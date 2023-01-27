
import { Duration, StackProps, CfnOutput} from "aws-cdk-lib"
import { Construct } from "constructs"
import { SpecRestApi, ApiDefinition } from "aws-cdk-lib/aws-apigateway"
import { Function, Runtime } from "aws-cdk-lib/aws-lambda"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {EnvvarsStack} from "../../../infrastructure/envvars-stack"
import {OpenAPISpecBuilder, HttpMethod} from "./open-api-spec"
import { APIGatewayRequestValidator } from "./api-gateway-request-validator"
import { APIGatewayRequestValidators } from "./api-gateway-request-validators"
import { APIGatewayLambdaIntegration } from "./api-gateway-lambda-integration"
import { Role, ServicePrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam"

interface LambdaEndpointProps extends StackProps {
  name: string
  environment: {[key: string]: string}
  stageName: string
  entry: string
  openAPISpec: OpenAPISpecBuilder
  stackName: string|undefined
}

export class LambdaEndpoint extends EnvvarsStack {
  private restApi: SpecRestApi
  public readonly lambda: Function
    
  constructor(scope: Construct, id: string, props: LambdaEndpointProps) {
    super(scope, id, props)
    const specBuilder = props.openAPISpec
  
    this.lambda = new NodejsFunction(this, this.buildConstructName("Function", props), {
      memorySize: 1024,
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_16_X,
      handler: "lambdaHandler",
      entry: props.entry,
      environment: props.environment
    })

    const apiRole = this.creatIAMRoleForAPIAccessingLambda(props)    

    this.generateAWSOpenAPIExtensions(apiRole, specBuilder)

    const openAPI = specBuilder.build()
    
    this.restApi = new SpecRestApi(
      this, 
      this.buildConstructName("Api", props),
      {
        apiDefinition: ApiDefinition.fromInline(openAPI),
        deployOptions: {
          stageName: props.stageName
        }
      }
    ) 

    this.restApi.node.addDependency(this.lambda)

    const endpointPath = Object.keys(openAPI.paths)[0]
    
    this.addEnvvar("Endpoint", this.restApi.urlForPath(endpointPath))
  }

  private buildConstructName(constructType: string, props: LambdaEndpointProps) {
    return (props.name + constructType + props.stageName)
  }

  private creatIAMRoleForAPIAccessingLambda(props: LambdaEndpointProps) {
    const apiRole = new Role(this, this.buildConstructName("RestApiRole", props), {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    })

    apiRole.addToPolicy(new PolicyStatement({
      resources: [this.lambda.functionArn],
      actions: ['lambda:InvokeFunction']
    }))
    return apiRole
  }

  private generateAWSOpenAPIExtensions(apiRole: Role, specBuilder: OpenAPISpecBuilder) {
    specBuilder.withExtension(new APIGatewayRequestValidators({
      "all": { validateRequestBody: true, validateRequestParameters: true }
    }))

    const [endpoint] = specBuilder.getEndpoints().values()

    endpoint.withExtension(new APIGatewayRequestValidator("all"))

    const integration = new APIGatewayLambdaIntegration(this.lambda.functionName, HttpMethod.Post, apiRole.roleArn)

    endpoint.withExtension(integration)
  }
} 

