import { StageProps, Stage } from "aws-cdk-lib"
import { Construct } from "constructs"
import { SocialisingEventBus } from "../infrastructure/event-bus"
import { SendMessageCommand } from "../features/conversation/send-message-stack"
import { ConversationStack } from "../features/conversation/conversation-stack"
import { ConversationsTable } from "../features/conversation/infrastructure/conversations-table"
import { conversationCreateGraphQLField, CreatedResponse } from "../features/conversation/create"
import { conversationLatestMessagesGraphQLField } from "../features/conversation/latest-messages"
import { ValidateConnectionsRequestPolicy } from "../features/conversation/validate-connections-request-policy-stack"
import { ConversationActivateCommand } from "../features/conversation/activate-stack"
import * as path from "path"

interface SocialisingStageProps extends StageProps{
  stageName: string
  userPoolId: string 
  stackNamePrepend?: string
  eventListenerQueueArn?: string
  validateConnectionsRequestQueueArn: string
  validateConnectionsResponseQueueArn: string
}

export class SocialisingStage extends Stage implements Stage{
  private conversationsTable: ConversationsTable
  private conversationGraphQL: ConversationStack
  private sendMessageCommand: SendMessageCommand
  private activateCommand: ConversationActivateCommand
  private validateConnectionsRequestPolicy: ValidateConnectionsRequestPolicy
  private eventBus: SocialisingEventBus
  private customStackNamePrepend: string|undefined
  private _envvars: string[]

  get envvars(): string[] {
    return this._envvars
  }
  
  createStack<Type, PropType>(type: (new (scope: Construct, id: string, props: PropType) => Type), props?: PropType): Type {
    
    if (this.customStackNamePrepend != undefined)
    {
      //@ts-ignore
      props.stackName = this.customStackNamePrepend + type.name
    }

    let passedInProperties = props
    if (props == undefined)
    {
      //@ts-ignore
      passedInProperties = {}
    }
    const stack = new type(this, type.name, passedInProperties!)

    //@ts-ignore
    if (stack.envvars != undefined)
    {
      // @ts-ignore
      this._envvars = this._envvars.concat(stack.envvars)
    }

    return stack
  }

  constructor(scope: Construct, id: string, props: SocialisingStageProps) {
    
    super(scope, id, props)

    this._envvars = []
    this.customStackNamePrepend = props.stackNamePrepend

    this.eventBus = this.createStack(SocialisingEventBus, { stageName: props.stageName })

    if (props.eventListenerQueueArn != undefined) {
      this.eventBus.listenOnQueueFor(props.eventListenerQueueArn)
    }

    this.conversationsTable = this.createStack(ConversationsTable, { stageName: props.stageName })

    this.conversationGraphQL = this.createStack(ConversationStack,
      {
        userPoolId: props.userPoolId,
      })

    const latestMessagesLambda = this.conversationGraphQL.addField({
      resourceLabel: "ConversationLatestMessages",
      functionEnvironment: {},
      functionSourceLocation: path.join(__dirname, "../features/conversation/latest-messages.ts"),
      field: conversationLatestMessagesGraphQLField})

    this.conversationGraphQL.addType(CreatedResponse)
    
    const createCommandLambda = this.conversationGraphQL.addField({
      resourceLabel: "ConversationCreate",
      functionEnvironment: {ConversationsTableName: this.conversationsTable.name},
      functionSourceLocation: path.join(__dirname, "../features/conversation/create.ts"),
      field: conversationCreateGraphQLField})
    this.conversationsTable.grantAccessTo(createCommandLambda.grantPrincipal)

    this.validateConnectionsRequestPolicy = this.createStack(ValidateConnectionsRequestPolicy, {
      conversationsTable: this.conversationsTable.conversations,
      eventBusName: this.eventBus.Name,
      eventBusArn: this.eventBus.Arn,
      requestQueueArn: props.validateConnectionsRequestQueueArn
     })

     this.activateCommand = this.createStack(ConversationActivateCommand, {
      conversationsTable: this.conversationsTable.conversations,
      eventBusName: this.eventBus.Name,
      eventBusArn: this.eventBus.Arn,
      responseQueueArn: props.validateConnectionsResponseQueueArn
     })
    this.conversationsTable.grantAccessTo(this.activateCommand.lambda.grantPrincipal)
  
    this.conversationGraphQL.addSubscription()
  }

}

