
import { StackProps, Duration } from "aws-cdk-lib"
import { Construct } from "constructs"
import { Runtime } from "aws-cdk-lib/aws-lambda"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import { EnvvarsStack } from "../../infrastructure/envvars-stack"
import { GraphqlApi, AuthorizationType, IIntermediateType, MappingTemplate } from "@aws-cdk/aws-appsync-alpha"
import { UserPool} from "aws-cdk-lib/aws-cognito"
import { GraphQLField, addField} from "./infrastructure/graphQL-field"

interface CreateCommandProps extends StackProps {
  userPoolId: string
}

interface LambdaResolvedField {
  resourceLabel: string
  functionEnvironment: any
  functionSourceLocation: string
  field: GraphQLField
}

interface NoneResolvedField {
  resourceLabel: string
  field: GraphQLField
}

export class ConversationStack extends EnvvarsStack {

  public readonly api: GraphqlApi
  private readonly userPoolId: string

  constructor(scope: Construct, id: string, props: CreateCommandProps) {
    super(scope, id, props)

    const userPool = UserPool.fromUserPoolId(this, "UserPool", props.userPoolId);

    this.userPoolId = props.userPoolId
    this.api = new GraphqlApi(this, 'Api', {
      name: 'socialising',
      authorizationConfig: {
        defaultAuthorization: {
            authorizationType: AuthorizationType.USER_POOL,
            userPoolConfig: {
              userPool: userPool,
            },
        },
        additionalAuthorizationModes: [{
          authorizationType: AuthorizationType.IAM
        }]
      }
      
     })

    this.addEnvvar("apiURL", this.api.graphqlUrl)
    this.addEnvvar("apiId", this.api.apiId)
  }


  addLambdaResolvedField(props: LambdaResolvedField)
  {
    const lambda = new NodejsFunction(this, props.resourceLabel + "Function", {
      environment: props.functionEnvironment,
      memorySize: 1024,
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_16_X,
      handler: "lambdaHandler",
      entry: props.functionSourceLocation,
    })

    const dataSource = this.api.addLambdaDataSource(props.resourceLabel + "DataSource", lambda);

    dataSource.createResolver({
      typeName: props.field.type,
      fieldName: props.field.name
    })

    addField(this.api, props.field)

    return lambda
  }

  addNoneResolvedField(props: NoneResolvedField)
  {
    const dataSource = this.api.addNoneDataSource(props.resourceLabel + "DataSource")

    dataSource.createResolver({
      typeName: props.field.type,
      fieldName: props.field.name,
       requestMappingTemplate: MappingTemplate.fromString(`
       {
         "version": "2018-05-29",
         "payload": $util.toJson($context.arguments)
       }
       `),
       responseMappingTemplate: MappingTemplate.fromString(`
         $util.toJson($context.result)
       `),       
    })
    addField(this.api, props.field)
  }

  addSubscription(subscriptionField: GraphQLField)
  {
    this.api.addSubscription(subscriptionField.name, subscriptionField.schema)
  }

  addType(type: IIntermediateType){
    this.api.addType(type)
  }
} 


