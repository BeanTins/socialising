
import { StackProps, Duration, CfnOutput } from "aws-cdk-lib"
import { Construct } from "constructs"
import { Function, Runtime, StartingPosition } from "aws-cdk-lib/aws-lambda"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources"
import * as path from "path"
import {Table} from "aws-cdk-lib/aws-dynamodb"
import {EventBus} from "aws-cdk-lib/aws-events"
import { Queue } from "aws-cdk-lib/aws-sqs"
import { EnvvarsStack } from "../../infrastructure/envvars-stack"

interface ValidateConnectionsRequestPolicyProps extends StackProps {
  conversationsTable: Table
  eventBusName: string
  eventBusArn: string
  requestQueueArn: string
}

export class ValidateConnectionsRequestPolicy extends EnvvarsStack {

  public readonly lambda: Function

  constructor(scope: Construct, id: string, props: ValidateConnectionsRequestPolicyProps) {
    super(scope, id, props)

    const queue = Queue.fromQueueArn(this, "ValidateConnectionsRequestQueue", props.requestQueueArn)

    this.lambda = new NodejsFunction(this, "ValidateConnectionsRequestPolicyFunction", {
      environment: {QueueName: queue.queueName, EventBusName: props.eventBusName},
      memorySize: 1024,
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_16_X,
      handler: "lambdaHandler",
      entry: path.join(__dirname, "validate-connections-request-policy.ts"),
    })

    queue.grantSendMessages(this.lambda.grantPrincipal)

    const source = new DynamoEventSource(props.conversationsTable, {
      startingPosition: StartingPosition.LATEST,
      batchSize: 1
    })
    this.lambda.addEventSource(source)

    const eventBus = EventBus.fromEventBusArn(this, "EventBus", props.eventBusArn)

    eventBus.grantPutEventsTo(this.lambda)
  }
} 

