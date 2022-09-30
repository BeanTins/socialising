
import { StackProps, Stack, Duration } from "aws-cdk-lib"
import { Construct } from "constructs"
import { Function, Runtime } from "aws-cdk-lib/aws-lambda"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import * as path from "path"
import {EventBus, Rule} from "aws-cdk-lib/aws-events"
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets"

interface MemberDevicesProjectionHandlerStackProps extends StackProps {
  memberDevicesProjectionTableName: string
  membershipEventBusArn: string
}

export class MemberDevicesProjectionHandler extends Stack {

  public readonly lambda: Function

  constructor(scope: Construct, id: string, props: MemberDevicesProjectionHandlerStackProps) {
    super(scope, id, props)

    this.lambda = new NodejsFunction(this, "MemberActivatedHandlerFunction", {
      environment: {MemberDevicesProjectionTableName: props.memberDevicesProjectionTableName},
      memorySize: 1024,
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_16_X,
      handler: "lambdaHandler",
      entry: path.join(__dirname, "member-devices-projection-handler.ts"),
    })

    const membershipEventBus = EventBus.fromEventBusArn(this, "Membership-EventBus", props.membershipEventBusArn)

    const rule = new Rule(this, "MemberActivatedHandlerLambdaRule", {
        eventBus: membershipEventBus,
        eventPattern: {detailType: ["MemberActivatedEvent"]},
        targets: [new LambdaFunction(this.lambda)]
      })    
   }
} 

