import { GraphqlApi, Schema, AuthorizationType, ResolvableField, ObjectType } from "@aws-cdk/aws-appsync-alpha"
import { StackProps, Stack, Duration, CfnOutput } from "aws-cdk-lib"
import { Construct } from "constructs"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import { Runtime } from "aws-cdk-lib/aws-lambda"
import * as path from "path"
import { UserPool} from "aws-cdk-lib/aws-cognito"
import { EnvvarsStack } from "../../infrastructure/envvars-stack"

interface SendMessageProps extends StackProps {
  userPoolId: string
}

export class SendMessageCommand extends EnvvarsStack {

  public readonly lambda: NodejsFunction

  constructor(scope: Construct, id: string, props: SendMessageProps) {
    super(scope, id, props)

    // const userPool = UserPool.fromUserPoolId(this, "UserPool", props.userPoolId);
    // const api = new GraphqlApi(this, 'Api', {
    //     name: 'socialising',
    //     schema: Schema.fromAsset(path.join(__dirname, 'schema.graphql')),
    //     authorizationConfig: {
    //       defaultAuthorization: {
    //           authorizationType: AuthorizationType.USER_POOL,
    //           userPoolConfig: {
    //             userPool: userPool,
    //           },
    //       },
    //     }
    // })

    // this.lambda = new NodejsFunction(this, "SendMessageCommandFunction", {
    //   environment: {},
    //   memorySize: 1024,
    //   timeout: Duration.seconds(5),
    //   runtime: Runtime.NODEJS_16_X,
    //   handler: "lambdaHandler",
    //   entry: path.join(__dirname, "send-message.ts"),
    // })

    // const sendMessageDataSource = api.addLambdaDataSource("sendMessageDataSource", this.lambda);

    // sendMessageDataSource.createResolver({
    //   typeName: "Mutation",
    //   fieldName: "sendMessage"
    // })

    // this.addEnvvar("apiURL", api.graphqlUrl)
    // this.addEnvvar("apiId", api.apiId)

    // let filmNode: ObjectType;
    // let dummyRequest: appsync.MappingTemplate;
    // let dummyResponse: appsync.MappingTemplate;

    // api.addMutation("sendMessage", new ResolvableField({
    //   returnType: filmNode.attribute(),
    //   args: { name: string, film_number: int },
    //   dataSource: api.addNoneDataSource('none')
    // }))

    

    
   }
}