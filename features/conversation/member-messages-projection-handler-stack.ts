
import { StackProps, Stack, Duration } from "aws-cdk-lib"
import { Construct } from "constructs"
import { Function, Runtime } from "aws-cdk-lib/aws-lambda"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import * as path from "path"
import {EventBus, Rule} from "aws-cdk-lib/aws-events"
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets"

interface MemberMessagesProjectionHandlerStackProps extends StackProps {
  memberMessagesProjectionTableName: string
  messagesTableName: string
  membershipEventBusArn: string
}

export class MemberMessagesProjectionHandler extends Stack {

  public readonly lambda: Function

  constructor(scope: Construct, id: string, props: MemberMessagesProjectionHandlerStackProps) {
    super(scope, id, props)

    this.lambda = new NodejsFunction(this, "MemberMessagesProjectionHandlerFunction", {
      environment: 
      {  
        MemberMessagesProjectionTableName: props.memberMessagesProjectionTableName,
        MessagesTableName: props.messagesTableName
      },
      memorySize: 1024,
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_16_X,
      handler: "lambdaHandler",
      entry: path.join(__dirname, "member-messages-projection-handler.ts"),
    })

    const membershipEventBus = EventBus.fromEventBusArn(this, "Membership-EventBus", props.membershipEventBusArn)

    const rule = new Rule(this, "MemberMessagesProjectionHandlerLambdaRule", {
        eventBus: membershipEventBus,
        eventPattern: {detailType: ["ConversationMessageSent"]},
        targets: [new LambdaFunction(this.lambda)]
      })    
   }
} 

