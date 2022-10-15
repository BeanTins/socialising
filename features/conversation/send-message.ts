import { Context, AppSyncResolverEvent } from "aws-lambda"
import { Conversation, MessageEncryptions } from "./domain/conversation"
import { ConversationRepository} from "./domain/conversation-repository"
import { ConversationRepositoryDynamo} from "./infrastructure/conversation-repository-dynamo"
import logger from "./infrastructure/lambda-logger"
import { GraphqlType, Field, InputType } from "@aws-cdk/aws-appsync-alpha"
import { GraphQLField} from "./infrastructure/graphQL-field"
import { MemberDevicesProjectionDAO } from "./infrastructure/member-devices-projection-dao"

interface SendMessageEvent {
  conversationId: string
  senderMemberId: string
  senderDeviceId: string
  messageEncryptions: MessageEncryptions
}

export const DeviceMessage = new InputType("DeviceMessage", {
  definition: { recipientDeviceId: GraphqlType.string(),
                recipientMemberId: GraphqlType.string(),
                encryptedMessage: GraphqlType.string() }
})

export const conversationSendMessageGraphQLField: GraphQLField = {
  name: "sendMessage",
  type: "Mutation",
  schema:  new Field({
    returnType: GraphqlType.id({isRequired: false}),
    args: {
      conversationId: GraphqlType.id({isRequired: true}),
      senderMemberId: GraphqlType.id({isRequired: true}),
      senderDeviceId: GraphqlType.id({isRequired: true}),
      messageEncryptions: DeviceMessage.attribute({isRequired: true, isList: true})
    }
  })
} 

export const lambdaHandler = async (event: AppSyncResolverEvent<SendMessageEvent>, context: Context): Promise<any|Error> => { 
  
  const command = new SendMessageCommand(event.arguments.senderMemberId, 
                                         event.arguments.senderDeviceId, 
                                         event.arguments.conversationId,
                                         event.arguments.messageEncryptions)

  const commandHandler = new SendMessageCommandHandler()

  return await commandHandler.handle(command)
}


export class SendMessageCommandHandler {

  private conversationRepository: ConversationRepository
  private memberDevices: MemberDevicesProjectionDAO

  public constructor() {
    this.conversationRepository = new ConversationRepositoryDynamo(process.env.AWS_REGION!)
    this.memberDevices = new MemberDevicesProjectionDAO(process.env.AWS_REGION!)
  }

  async handle(command: SendMessageCommand) {

    let messageId

    try{
      
      const conversation = await this.conversationRepository.load(command.conversationId)

      if (conversation == null)
      {
         throw new UnknownConversation(command.conversationId)
      }

      const conversationDevices = await this.memberDevices.allDevicesForMembers(Array.from(conversation.participantIds!))

      messageId = conversation.sendMessage(
        command.senderMemberId, 
        command.senderDeviceId, 
        new Set(conversationDevices),
        command.messageEncryptions)   

      await this.conversationRepository.save(conversation)
    }
    catch(error)
    {
      logger.error("conversation send message failed for command: " + JSON.stringify(command, (key, value) => value instanceof Set ? [...value]: value) + " with " + error)
      throw Error("Send Message Error: " + error.constructor.name)
    }

    return messageId
  }
}

export class SendMessageCommand {
  constructor(senderMemberId: string, senderDeviceId: string, conversationId: string, messageEncryptions: MessageEncryptions)
  {
    this.senderMemberId = senderMemberId
    this.senderDeviceId = senderDeviceId
    this.conversationId = conversationId
    this.messageEncryptions = messageEncryptions
  }
  senderMemberId: string
  senderDeviceId: string
  conversationId: string
  messageEncryptions: MessageEncryptions
}

export class UnknownConversation extends Error 
{
  constructor (conversationId: string)
  {
    super("Unknown conversation " + conversationId)
  }
}




















