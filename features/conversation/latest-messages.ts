import { Context, AppSyncResolverEvent } from "aws-lambda"
import logger from "./infrastructure/lambda-logger"
import { ObjectType, GraphqlType, Field } from "@aws-cdk/aws-appsync-alpha"
import { GraphQLField} from "./infrastructure/graphQL-field"
import { MemberMessagesProjectionDAO } from "./infrastructure/member-messages-projection-dao"
import { MessagesDAO } from "./infrastructure/messages-dao"

interface latestMessagesEvent {
  memberId: string
  deviceId: string
  lastReceivedMessageId: string|undefined
}

export const LatestMessagesResponse = new ObjectType("latestMessagesResponse", {
  definition: { conversationId: GraphqlType.id(),
                messageId: GraphqlType.id(),
                message: GraphqlType.string(),
                dateTime: GraphqlType.awsDateTime() }

});

export const conversationLatestMessagesGraphQLField: GraphQLField = {
  name: "latestMessages",
  type: "Query",
  schema:  new Field({
    returnType: LatestMessagesResponse.attribute({isList: true, isRequired: false}),
    args: {
      memberId: GraphqlType.id({isRequired: true}),
      deviceId: GraphqlType.id({isRequired: true}),
      lastReceivedMessageId: GraphqlType.id({isRequired: false})
    }
  })
} 

export const lambdaHandler = async (event: AppSyncResolverEvent<latestMessagesEvent>, context: Context): Promise<any|Error> => { 

  const command = new LatestMessagesQuery(
    event.arguments.memberId, 
    event.arguments.deviceId, 
    event.arguments.lastReceivedMessageId)

  const commandHandler = new LatestMessagesQueryHandler()

  return await commandHandler.handle(command)
}

export class LatestMessagesQueryHandler {

  private memberMessages: MemberMessagesProjectionDAO
  private messages: MessagesDAO

  public constructor() {
    this.memberMessages = new MemberMessagesProjectionDAO(process.env.AWS_REGION!)
    this.messages = new MessagesDAO(process.env.AWS_REGION!)
  }

  async handle(command: LatestMessagesQuery) {
    let latestMessages = []

    try
    {
      const messageIds = await this.memberMessages.getMessagesForMember(command.memberId)

      const latestMessageIds = this.resolveLatestMessages(command.lastReceivedMessageId, messageIds)

      for (const messageId of latestMessageIds)
      {
        const message = await this.messages.getInfoForDevice(messageId, command.deviceId)

        if (message != undefined)
        {
          latestMessages.push({
            conversationId: message.conversationId,
            messageId: message.messageId,
            message: message.encryptedContent,
            dateTime: new Date(message.dateTime).toISOString()})
        }
      }
    }
    catch(error)
    {
      logger.error("conversation latest messages failed for command: " + JSON.stringify(command, (key, value) => value instanceof Set ? [...value]: value) + " with " + error)
      throw error
    }

    return latestMessages
  }

  private resolveLatestMessages(lastReceivedMessageId: string|undefined, messageIds: any) {
    
    let latestMessageIds = messageIds
    if (lastReceivedMessageId != undefined) {
      const lastReceivedMessageIndex = messageIds.indexOf(lastReceivedMessageId)

      if (lastReceivedMessageIndex != -1) {
        latestMessageIds = messageIds.slice(lastReceivedMessageIndex + 1)
      }
    }
    return latestMessageIds
  }
}

export class LatestMessagesQuery {
  constructor(memberId: string, deviceId: string, lastReceivedMessageId: string|undefined)
  {
    this.memberId = memberId
    this.deviceId = deviceId
    this.lastReceivedMessageId = lastReceivedMessageId
  }
  memberId: string
  deviceId: string
  lastReceivedMessageId: string|undefined
}



