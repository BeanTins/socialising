import { StageProps, Stage } from "aws-cdk-lib"
import { Construct } from "constructs"
import { SocialisingEventBus } from "../infrastructure/event-bus"
import { ConversationStack } from "../features/conversation/conversation-stack"
import { ConversationsTable } from "../features/conversation/infrastructure/conversations-table"
import { MessagesTable } from "../features/conversation/infrastructure/messages-table"
import { conversationCreateGraphQLField, CreatedResponse } from "../features/conversation/create"
import { conversationSendMessageGraphQLField, DeviceMessage } from "../features/conversation/send-message"
import { conversationReadReceiptGraphQLField } from "../features/conversation/read-receipt"
import { conversationLatestReadReceiptsGraphQLField, MemberLatestReadMessagePairing } from "../features/conversation/latest-read-receipts"
import { conversationIncomingMemberMessageGraphQLField, IncomingMemberMessageResponse } from "../features/conversation/incoming-member-message"
import { conversationIncomingMemberMessageReceivedGraphQLField } from "../features/conversation/incoming-member-message-received"
import { conversationLatestMessagesGraphQLField, LatestMessagesResponse } from "../features/conversation/latest-messages"
import { ValidateConnectionsRequestPolicy } from "../features/conversation/validate-connections-request-policy-stack"
import { ConversationActivateCommand } from "../features/conversation/activate-stack"
import { MemberDevicesProjection} from "../features/conversation/infrastructure/member-devices-projection"
import { MemberMessagesProjection} from "../features/conversation/infrastructure/member-messages-projection"
import { MemberDevicesProjectionHandler } from "../features/conversation/member-devices-projection-handler-stack"
import { MemberMessagesProjectionHandler } from "../features/conversation/member-messages-projection-handler-stack"
import { ConversationMessageSentPublisher } from "../features/conversation/message-sent-publisher-stack"
import { ConversationActivatedPublisher } from "../features/conversation/activated-publisher-stack"
import * as path from "path"

interface SocialisingStageProps extends StageProps{
  stageName: string
  userPoolId: string 
  stackNamePrepend?: string
  eventListenerQueueArn?: string
  validateConnectionsRequestQueueArn: string
  validateConnectionsResponseQueueArn: string
  membershipEventBusArn: string
}

export class SocialisingStage extends Stage implements Stage{
  private conversationsTable: ConversationsTable
  private messagesTable: MessagesTable
  private memberDevicesProjection: MemberDevicesProjection
  private memberMessagesProjection: MemberMessagesProjection
  private conversationGraphQL: ConversationStack
  private activateCommand: ConversationActivateCommand
  private validateConnectionsRequestPolicy: ValidateConnectionsRequestPolicy
  private memberDevicesProjectionHandler: MemberDevicesProjectionHandler
  private memberMessagesProjectionHandler: MemberMessagesProjectionHandler
  private eventBus: SocialisingEventBus
  private customStackNamePrepend: string|undefined
  private messageSentPublisher: ConversationMessageSentPublisher
  private activatedPublisher: ConversationActivatedPublisher
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
    this.messagesTable = this.createStack(MessagesTable, { stageName: props.stageName })

    this.memberDevicesProjection = this.createStack(MemberDevicesProjection, { stageName: props.stageName })
    this.memberMessagesProjection = this.createStack(MemberMessagesProjection, { stageName: props.stageName })

    this.conversationGraphQL = this.createStack(ConversationStack,
      {
        userPoolId: props.userPoolId,
      })

    this.buildMemberDevicesProjectionHandler(props.membershipEventBusArn)

    this.buildMemberMessagesProjectionHandler()

    this.buildLatestMemberMessages()

    this.buildCreateCommand()

    this.buildSendMessageCommand()

    this.buildReadReceiptCommand()

    this.buildLatestReadReceiptsQuery()    

    this.validateConnectionsRequestPolicy = this.createStack(ValidateConnectionsRequestPolicy, {
      conversationsTable: this.conversationsTable.conversations,
      eventBusName: this.eventBus.Name,
      eventBusArn: this.eventBus.Arn,
      requestQueueArn: props.validateConnectionsRequestQueueArn
     })

    this.buildMessageSentPublisher()

    this.buildActivateCommand(props.validateConnectionsResponseQueueArn)

    this.buildActivatedPublisher()
  
    this.conversationGraphQL.addType(IncomingMemberMessageResponse)

    this.conversationGraphQL.addNoneResolvedField({
      resourceLabel: "ConversationIncomingMessage",
      field: conversationIncomingMemberMessageGraphQLField
    })

    this.conversationGraphQL.addSubscription(conversationIncomingMemberMessageReceivedGraphQLField)
  }


  private buildMessageSentPublisher() {
    this.messageSentPublisher = this.createStack(ConversationMessageSentPublisher, {
      conversationsTable: this.conversationsTable.conversations,
      eventBusName: this.eventBus.Name,
      eventBusArn: this.eventBus.Arn
    })
    this.eventBus.grantAccessTo(this.messageSentPublisher.lambda.grantPrincipal)
  }

  private buildReadReceiptCommand() {
    const readReceiptCommandLambda = this.conversationGraphQL.addLambdaResolvedField({
      resourceLabel: "ConversationReadReceipt",
      functionEnvironment: {
        ConversationsTableName: this.conversationsTable.name
      },
      functionSourceLocation: path.join(__dirname, "../features/conversation/read-receipt.ts"),
      field: conversationReadReceiptGraphQLField
    })
    this.conversationsTable.grantAccessTo(readReceiptCommandLambda.grantPrincipal)
  }

  private buildLatestReadReceiptsQuery() {
    this.conversationGraphQL.addType(MemberLatestReadMessagePairing)
    const latestReadReceiptsQueryLambda = this.conversationGraphQL.addLambdaResolvedField({
      resourceLabel: "ConversationLatestReadReceipts",
      functionEnvironment: {
        ConversationsTableName: this.conversationsTable.name
      },
      functionSourceLocation: path.join(__dirname, "../features/conversation/latest-read-receipts.ts"),
      field: conversationLatestReadReceiptsGraphQLField
    })
    this.conversationsTable.grantAccessTo(latestReadReceiptsQueryLambda.grantPrincipal)
  }

  private buildActivatedPublisher() {
    this.activatedPublisher = this.createStack(ConversationActivatedPublisher, {
      conversationsTable: this.conversationsTable.conversations,
      eventBusName: this.eventBus.Name,
      eventBusArn: this.eventBus.Arn
    })
    this.eventBus.grantAccessTo(this.activatedPublisher.lambda.grantPrincipal)
  }

  private buildActivateCommand(validateConnectionsResponseQueueArn: string) {
    this.activateCommand = this.createStack(ConversationActivateCommand, {
      conversationsTable: this.conversationsTable.conversations,
      eventBusName: this.eventBus.Name,
      eventBusArn: this.eventBus.Arn,
      responseQueueArn: validateConnectionsResponseQueueArn
    })
    this.conversationsTable.grantAccessTo(this.activateCommand.lambda.grantPrincipal)
  }

  private buildSendMessageCommand() {
    this.conversationGraphQL.addType(DeviceMessage)
    const sendMessageCommandLambda = this.conversationGraphQL.addLambdaResolvedField({
      resourceLabel: "ConversationSendMessage",
      functionEnvironment: {
        ConversationsTableName: this.conversationsTable.name,
        MessagesTableName: this.messagesTable.name,
        MemberDevicesProjectionTableName: this.memberDevicesProjection.name
      },
      functionSourceLocation: path.join(__dirname, "../features/conversation/send-message.ts"),
      field: conversationSendMessageGraphQLField
    })
    this.memberDevicesProjection.grantAccessTo(sendMessageCommandLambda.grantPrincipal)
    this.conversationsTable.grantAccessTo(sendMessageCommandLambda.grantPrincipal)
    this.messagesTable.grantAccessTo(sendMessageCommandLambda.grantPrincipal)
    return sendMessageCommandLambda
  }

  private buildCreateCommand() {
    this.conversationGraphQL.addType(CreatedResponse)
    const createCommandLambda = this.conversationGraphQL.addLambdaResolvedField({
      resourceLabel: "ConversationCreate",
      functionEnvironment: {
        ConversationsTableName: this.conversationsTable.name,
        MemberDevicesProjectionTableName: this.memberDevicesProjection.name
      },
      functionSourceLocation: path.join(__dirname, "../features/conversation/create.ts"),
      field: conversationCreateGraphQLField
    })
    this.conversationsTable.grantAccessTo(createCommandLambda.grantPrincipal)
  }

  private buildLatestMemberMessages() {
    this.conversationGraphQL.addType(LatestMessagesResponse)
    const latestMessagesLambda = this.conversationGraphQL.addLambdaResolvedField({
      resourceLabel: "ConversationLatestMessages",
      functionEnvironment: {
        MemberMessagesProjectionTableName: this.memberMessagesProjection.name,
        MessagesTableName: this.messagesTable.name,
        MemberDevicesProjectionTableName: this.memberDevicesProjection.name,
      },
      functionSourceLocation: path.join(__dirname, "../features/conversation/latest-messages.ts"),
      field: conversationLatestMessagesGraphQLField
    })

    this.memberDevicesProjection.grantAccessTo(latestMessagesLambda.grantPrincipal)
    this.memberMessagesProjection.grantAccessTo(latestMessagesLambda.grantPrincipal)
    this.messagesTable.grantAccessTo(latestMessagesLambda.grantPrincipal)
  }

  private buildMemberMessagesProjectionHandler() {
    this.memberMessagesProjectionHandler = this.createStack(MemberMessagesProjectionHandler,
      {
        messagesTableName: this.messagesTable.name,
        memberMessagesProjectionTableName: this.memberMessagesProjection.name,
        membershipEventBusArn: this.eventBus.Arn,
        incomingMemberMessageMutationUrl: this.conversationGraphQL.api.graphqlUrl
      })
    this.memberMessagesProjection.grantAccessTo(this.memberMessagesProjectionHandler.lambda.grantPrincipal)
    this.messagesTable.grantAccessTo(this.memberMessagesProjectionHandler.lambda.grantPrincipal)
    this.conversationGraphQL.api.grantMutation(this.memberMessagesProjectionHandler.lambda.grantPrincipal)
  }

  private buildMemberDevicesProjectionHandler(membershipEventBusArn: string) {
    this.memberDevicesProjectionHandler = this.createStack(MemberDevicesProjectionHandler,
      {
        memberDevicesProjectionTableName: this.memberDevicesProjection.name,
        membershipEventBusArn: membershipEventBusArn
      })
    this.memberDevicesProjection.grantAccessTo(this.memberDevicesProjectionHandler.lambda.grantPrincipal)
  }
}

