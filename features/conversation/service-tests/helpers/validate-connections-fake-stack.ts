
import { StackProps } from "aws-cdk-lib"
import { Construct } from "constructs"
import { Queue } from "aws-cdk-lib/aws-sqs"
import { EnvvarsStack } from "../../../../infrastructure/envvars-stack"

interface ActivateProps extends StackProps {
  deploymentName: string
}

export class ValidateConnectionsFakeStack extends EnvvarsStack {

  public readonly requestQueue: Queue
  public readonly responseQueue: Queue

  constructor(scope: Construct, id: string, props: ActivateProps) {
    super(scope, id, props)

    this.requestQueue = this.createQueue("Request")
    this.responseQueue = this.createQueue("Response")
  }

  private createQueue(direction: "Request"|"Response") {
    const queue = new Queue(this, "ValidateConnections " + direction, { })

    this.addEnvvar(direction + "QueueName", queue.queueName)
    this.addEnvvar(direction + "QueueArn", queue.queueArn)

    return queue
  }
} 

