
import { StackProps, Duration } from "aws-cdk-lib"
import { Construct } from "constructs"
import { Runtime } from "aws-cdk-lib/aws-lambda"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import { EnvvarsStack } from "../../infrastructure/envvars-stack"
import { GraphqlApi, AuthorizationType, Directive, GraphqlType, Field, IIntermediateType } from "@aws-cdk/aws-appsync-alpha"
import { UserPool} from "aws-cdk-lib/aws-cognito"
import { GraphQLField, addField} from "./infrastructure/graphQL-field"
import { CreatedResponse} from "./create"

interface CreateCommandProps extends StackProps {
  userPoolId: string
}

interface GraphAPIProps {
  resourceLabel: string
  functionEnvironment: any
  functionSourceLocation: string
  field: GraphQLField
}

export class ConversationStack extends EnvvarsStack {

  public readonly api: GraphqlApi

  constructor(scope: Construct, id: string, props: CreateCommandProps) {
    super(scope, id, props)

    const userPool = UserPool.fromUserPoolId(this, "UserPool", props.userPoolId);

    this.api = new GraphqlApi(this, 'Api', {
      name: 'socialising',
      authorizationConfig: {
        defaultAuthorization: {
            authorizationType: AuthorizationType.USER_POOL,
            userPoolConfig: {
              userPool: userPool,
            },
        },
      }
     })


    this.addEnvvar("apiURL", this.api.graphqlUrl)
    this.addEnvvar("apiId", this.api.apiId)
  }
  addField(props: GraphAPIProps)
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

  addSubscription()
  {
    const createSubscriptionGraphQLField: GraphQLField = {
      name: "created",
      type: "Subscription",
      schema:  new Field({
        returnType: CreatedResponse.attribute({isRequired: false}),
        args: { initiatingMemberId: GraphqlType.id({ isRequired: false }) },
        directives: [Directive.subscribe('create')],
      })
    } 

    this.api.addSubscription("created", createSubscriptionGraphQLField.schema)
  }

  addType(type: IIntermediateType){
    this.api.addType(type)
  }
} 


