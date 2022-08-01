
import { StackProps, Duration } from "aws-cdk-lib"
import { Construct } from "constructs"
import { Function, Runtime } from "aws-cdk-lib/aws-lambda"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources"
import * as path from "path"
import {Table} from "aws-cdk-lib/aws-dynamodb"
import {EventBus} from "aws-cdk-lib/aws-events"
import { Queue } from "aws-cdk-lib/aws-sqs"
import { EnvvarsStack } from "../../infrastructure/envvars-stack"

interface ActivateProps extends StackProps {
  conversationsTable: Table
  eventBusName: string
  eventBusArn: string
  responseQueueArn: string
}

export class ConversationActivateCommand extends EnvvarsStack {

  public readonly lambda: Function

  constructor(scope: Construct, id: string, props: ActivateProps) {
    super(scope, id, props)

    const queue = Queue.fromQueueArn(this, "ValidateConnectionsResponseQueue", props.responseQueueArn)

    this.lambda = new NodejsFunction(this, "ActivateFunction", {
      environment: {QueueName: queue.queueName, EventBusName: props.eventBusName, ConversationsTableName: props.conversationsTable.tableName},
      memorySize: 1024,
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_16_X,
      handler: "lambdaHandler",
      entry: path.join(__dirname, "activate.ts"),
    })

    queue.grantSendMessages(this.lambda.grantPrincipal)

    this.lambda.addEventSource(new SqsEventSource(queue))

    const eventBus = EventBus.fromEventBusArn(this, "EventBus", props.eventBusArn)

    eventBus.grantPutEventsTo(this.lambda)
  }
} 

