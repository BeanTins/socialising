import {StackProps} from "aws-cdk-lib"
import { Construct } from "constructs"
import {EventBus, Rule } from "aws-cdk-lib/aws-events"
import {SqsQueue} from "aws-cdk-lib/aws-events-targets"
import {Queue} from "aws-cdk-lib/aws-sqs"
import {IPrincipal} from "aws-cdk-lib/aws-iam"
import {EnvvarsStack} from "./envvars-stack"

interface EventBusProps extends StackProps {
  stageName: string
}

export class SocialisingEventBus extends EnvvarsStack {
  public readonly Arn: string
  public readonly Name: string
  private eventBus: EventBus
  constructor(scope: Construct, id: string, props: EventBusProps) {
    super(scope, id, props)

    this.eventBus = new EventBus(this, "EventBus" + props.stageName)

    this.Arn = this.eventBus.eventBusArn
    this.Name = this.eventBus.eventBusName
    this.addEnvvar("Arn", this.eventBus.eventBusArn)
  }

  grantAccessTo(accessor: IPrincipal){
    this.eventBus.grantPutEventsTo(accessor)
  }

  listenOnQueueFor(queueArn: string){

    const queue = Queue.fromQueueArn(this, "listenerQueue", queueArn)
   
    new Rule(this, "ListenerQueueRule", {
      eventBus: this.eventBus,
      eventPattern: {source: ["socialising.beantins.com"]},
      targets: [new SqsQueue(queue)]
    })
  }

}
