import { Queue } from "aws-cdk-lib/aws-sqs"
import { Stack, App, StackProps, CfnOutput, Duration} from "aws-cdk-lib"
import {ServicePrincipal} from "aws-cdk-lib/aws-iam"

interface EventListenerQueueProps extends StackProps {
  deploymentName: string
}

export class EventListenerStack extends Stack {
  public readonly queue: Queue
  constructor(scope: App, id: string, props: EventListenerQueueProps) {
    super(scope, id, props)

    this.queue = new Queue(this, props.deploymentName + "EventListener", {retentionPeriod: Duration.hours(1)});

    this.queue.grantSendMessages(new ServicePrincipal("events.amazonaws.com"))

    const queueName = props.deploymentName + "EventListenerQueueName"

    new CfnOutput(this, queueName, {
      value: this.queue.queueName,
      exportName: queueName, 
      description: 'name of the queue used during testing for listening to events'
    })

    const queueArn = props.deploymentName + "EventListenerQueueArn"

    new CfnOutput(this, queueArn, {
      value: this.queue.queueArn,
      exportName: queueArn, 
      description: 'ARN of the queue used during testing for listening to events'
    })

  }
}