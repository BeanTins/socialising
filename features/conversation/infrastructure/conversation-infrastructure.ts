import { Stage } from "aws-cdk-lib"
import { SocialisingEventBus } from "../../../infrastructure/event-bus"
import { ConversationStack } from "../conversation-stack"
import { ConversationsTable } from "./conversations-table"
import { MessagesTable } from "./messages-table"
import { conversationCreateGraphQLField, CreatedResponse } from "../create"
import { conversationSendMessageGraphQLField, DeviceMessage } from "../send-message"
import { conversationReadReceiptGraphQLField } from "../read-receipt"
import { conversationLatestReadReceiptsGraphQLField, MemberLatestReadMessagePairing } from "../latest-read-receipts"
import { conversationIncomingMemberMessageGraphQLField, IncomingMemberMessageResponse } from "../incoming-member-message"
import { conversationIncomingMemberMessageReceivedGraphQLField } from "../incoming-member-message-received"
import { conversationLatestMessagesGraphQLField, LatestMessagesResponse } from "../latest-messages"
import { ValidateConnectionsRequestPolicy } from "../validate-connections-request-policy-stack"
import { ActivateCommand } from "../activate-stack"
import { MemberDevicesProjection} from "./member-devices-projection"
import { MemberMessagesProjection} from "./member-messages-projection"
import { MemberDevicesProjectionHandler } from "../member-devices-projection-handler-stack"
import { MemberMessagesProjectionHandler } from "../member-messages-projection-handler-stack"
import { MessageSentPublisher } from "../message-sent-publisher-stack"
import { ActivatedPublisher } from "../activated-publisher-stack"
import * as path from "path"
import { StackFactory } from "../../../provisioning/stack-factory"

export class ConversationInfrastructure{
  serviceName: string | undefined
  stage: Stage
  stackFactory: StackFactory
  
  conversationsTable: ConversationsTable
  messagesTable: MessagesTable
  memberDevicesProjection: MemberDevicesProjection
  memberMessagesProjection: MemberMessagesProjection
  conversationGraphQL: ConversationStack
  activateCommand: ActivateCommand
  validateConnectionsRequestPolicy: ValidateConnectionsRequestPolicy
  memberDevicesProjectionHandler: MemberDevicesProjectionHandler
  memberMessagesProjectionHandler: MemberMessagesProjectionHandler
  messageSentPublisher: MessageSentPublisher
  activatedPublisher: ActivatedPublisher

  public constructor(serviceName: string | undefined, stage: Stage) {
    this.serviceName = serviceName
    this.stage = stage
    this.stackFactory = new StackFactory(serviceName, "Conversation", stage)
  }

  build(membershipEventBusArn: string, 
    stageName: string, 
    eventBus: SocialisingEventBus, 
    validateConnectionsRequestQueueArn: string,
    validateConnectionsResponseQueueArn: string,
    userPoolId: string)
  {
    this.conversationsTable = this.stackFactory.create(ConversationsTable, { stageName: stageName })

    this.conversationGraphQL = this.stackFactory.create(ConversationStack,
      {
        userPoolId: userPoolId,
      })

    this.memberDevicesProjection = this.stackFactory.create(MemberDevicesProjection, { stageName: stageName })
    this.messagesTable = this.stackFactory.create(MessagesTable, { stageName: stageName })
    this.memberMessagesProjection = this.stackFactory.create(MemberMessagesProjection, { stageName: stageName })

    this.buildMemberDevicesProjectionHandler(membershipEventBusArn)

    this.buildMemberMessagesProjectionHandler(eventBus)

    this.buildLatestMemberMessages()

    this.buildCreateCommand()

    this.buildSendMessageCommand()

    this.buildReadReceiptCommand()

    this.buildLatestReadReceiptsQuery()    

    this.validateConnectionsRequestPolicy = this.stackFactory.create(ValidateConnectionsRequestPolicy, {
      conversationsTable: this.conversationsTable.conversations,
      eventBusName: eventBus.Name,
      eventBusArn: eventBus.Arn,
      requestQueueArn: validateConnectionsRequestQueueArn
     })

    this.buildMessageSentPublisher(eventBus)

    this.buildActivateCommand(validateConnectionsResponseQueueArn, eventBus)

    this.buildActivatedPublisher(eventBus)
  
    this.conversationGraphQL.addType(IncomingMemberMessageResponse)

    this.conversationGraphQL.addNoneResolvedField({
      resourceLabel: "ConversationIncomingMessage",
      field: conversationIncomingMemberMessageGraphQLField
    })

    this.conversationGraphQL.addSubscription(conversationIncomingMemberMessageReceivedGraphQLField)
  }

  private buildMemberDevicesProjectionHandler(membershipEventBusArn: string) {
    this.memberDevicesProjectionHandler = this.stackFactory.create(MemberDevicesProjectionHandler,
      {
        memberDevicesProjectionTableName: this.memberDevicesProjection.name,
        membershipEventBusArn: membershipEventBusArn
      })
    this.memberDevicesProjection.grantAccessTo(this.memberDevicesProjectionHandler.lambda.grantPrincipal)
  }

  private buildMessageSentPublisher(eventBus: SocialisingEventBus) {
    this.messageSentPublisher = this.stackFactory.create(MessageSentPublisher, {
      conversationsTable: this.conversationsTable.conversations,
      eventBusName: eventBus.Name,
      eventBusArn: eventBus.Arn
    })
    eventBus.grantAccessTo(this.messageSentPublisher.lambda.grantPrincipal)
  }

  private buildReadReceiptCommand() {
    const readReceiptCommandLambda = this.conversationGraphQL.addLambdaResolvedField({
      resourceLabel: "ConversationReadReceipt",
      functionEnvironment: {
        ConversationsTableName: this.conversationsTable.name
      },
      functionSourceLocation: path.join(__dirname, "../read-receipt.ts"),
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
      functionSourceLocation: path.join(__dirname, "../latest-read-receipts.ts"),
      field: conversationLatestReadReceiptsGraphQLField
    })
    this.conversationsTable.grantAccessTo(latestReadReceiptsQueryLambda.grantPrincipal)
  }

  private buildActivatedPublisher(eventBus: SocialisingEventBus) {
    this.activatedPublisher = this.stackFactory.create(ActivatedPublisher, {
      conversationsTable: this.conversationsTable.conversations,
      eventBusName: eventBus.Name,
      eventBusArn: eventBus.Arn
    })
    eventBus.grantAccessTo(this.activatedPublisher.lambda.grantPrincipal)
  }

  private buildActivateCommand(validateConnectionsResponseQueueArn: string, eventBus: SocialisingEventBus) {
    this.activateCommand = this.stackFactory.create(ActivateCommand, {
      conversationsTable: this.conversationsTable.conversations,
      eventBusName: eventBus.Name,
      eventBusArn: eventBus.Arn,
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
      functionSourceLocation: path.join(__dirname, "../send-message.ts"),
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
      functionSourceLocation: path.join(__dirname, "../create.ts"),
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
      functionSourceLocation: path.join(__dirname, "../latest-messages.ts"),
      field: conversationLatestMessagesGraphQLField
    })

    this.memberDevicesProjection.grantAccessTo(latestMessagesLambda.grantPrincipal)
    this.memberMessagesProjection.grantAccessTo(latestMessagesLambda.grantPrincipal)
    this.messagesTable.grantAccessTo(latestMessagesLambda.grantPrincipal)
  }

  private buildMemberMessagesProjectionHandler(eventBus: SocialisingEventBus) {
    this.memberMessagesProjectionHandler = this.stackFactory.create(MemberMessagesProjectionHandler,
      {
        messagesTableName: this.messagesTable.name,
        memberMessagesProjectionTableName: this.memberMessagesProjection.name,
        membershipEventBusArn: eventBus.Arn,
        incomingMemberMessageMutationUrl: this.conversationGraphQL.api.graphqlUrl
      })
    this.memberMessagesProjection.grantAccessTo(this.memberMessagesProjectionHandler.lambda.grantPrincipal)
    this.messagesTable.grantAccessTo(this.memberMessagesProjectionHandler.lambda.grantPrincipal)
    this.conversationGraphQL.api.grantMutation(this.memberMessagesProjectionHandler.lambda.grantPrincipal)
  }

}

