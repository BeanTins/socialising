import { Context, EventBridgeEvent } from "aws-lambda"
import logger from "./infrastructure/lambda-logger"
import { MemberMessagesProjectionDAO } from "./infrastructure/member-messages-projection-dao"
import { MessagesDAO } from "./infrastructure/messages-dao"
import { ConversationMessageSent } from "./domain/events"
import { MemberMessageNotifier} from "./infrastructure/member-message-notifier"

export const lambdaHandler = async (event: EventBridgeEvent<any, any>, context: Context): Promise<any> => {
  
  try{
    const handler = new NotificationHandler()

    await handler.handle(new ConversationMessageSent(event.detail.conversationId, event.detail.messageId))
  }
  catch(error)
  {
    logger.error("member messages projection handler failed for : " + JSON.stringify(event) + " with error:" + error)
    throw error
  }
}

class NotificationHandler
{
  private memberMessagesProjection: MemberMessagesProjectionDAO
  private messages: MessagesDAO
  private notifier: MemberMessageNotifier
  constructor()
  {
    this.memberMessagesProjection = new MemberMessagesProjectionDAO(process.env.AWS_REGION!)
    this.messages = new MessagesDAO(process.env.AWS_REGION!)
    this.notifier = new MemberMessageNotifier(process.env.AWS_REGION!, process.env.IncomingMemberMessageMutationUrl!)
  }

  async handle(event: ConversationMessageSent)
  {
    const memberIds = await this.messages.getMembersInMessage(event.messageId)

    await this.memberMessagesProjection.appendMessageForMembers(event.messageId, memberIds)

    for (const memberId of memberIds)
    {
      await this.notifier.notify(event.conversationId, memberId, event.messageId)
    }
  }
}
