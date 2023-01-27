import { StageProps, Stage } from "aws-cdk-lib"
import { Construct } from "constructs"
import { SocialisingEventBus } from "../infrastructure/event-bus"
import { StackFactory } from "./stack-factory"
import { ConversationInfrastructure } from "../features/conversation/infrastructure/conversation-infrastructure"
import { DeviceKeyInfrastructure } from "../features/devicekey/infrastructure/device-key-infrastructure"

interface SocialisingStageProps extends StageProps{
  stageName: string
  userPoolId: string 
  userPoolArn: string 
  stackNamePrepend?: string
  eventListenerQueueArn?: string
  validateConnectionsRequestQueueArn: string
  validateConnectionsResponseQueueArn: string
  membershipEventBusArn: string
}

export class SocialisingStage extends Stage implements Stage{
  private eventBus: SocialisingEventBus
  private stackFactory: StackFactory
  private conversationInfrastructure: ConversationInfrastructure
  private deviceKeyInfrastructure: DeviceKeyInfrastructure

  get envvars(): string[] {
    return this.stackFactory.envvars
  }

  constructor(scope: Construct, id: string, props: SocialisingStageProps) {
    
    super(scope, id, props)

    this.stackFactory = new StackFactory(props.stackNamePrepend, undefined, this)

    this.eventBus = this.stackFactory.create(SocialisingEventBus, { stageName: props.stageName })

    if (props.eventListenerQueueArn != undefined) {
      this.eventBus.listenOnQueueFor(props.eventListenerQueueArn)
    }

    this.conversationInfrastructure = new ConversationInfrastructure(props.stackNamePrepend, this)

    this.conversationInfrastructure.build(props.membershipEventBusArn, 
      props.stageName, 
      this.eventBus, 
      props.validateConnectionsRequestQueueArn,
      props.validateConnectionsResponseQueueArn,
      props.userPoolId)

    this.deviceKeyInfrastructure = new DeviceKeyInfrastructure(props.stackNamePrepend, this)

    this.deviceKeyInfrastructure.build(this.eventBus.Name, props.stageName, props.userPoolArn)
        
  }



}

