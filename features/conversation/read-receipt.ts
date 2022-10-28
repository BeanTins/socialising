import { Context, AppSyncResolverEvent } from "aws-lambda"
import { ConversationRepository} from "./domain/conversation-repository"
import { ConversationRepositoryDynamo} from "./infrastructure/conversation-repository-dynamo"
import logger from "./infrastructure/lambda-logger"
import { ObjectType, GraphqlType, Field } from "@aws-cdk/aws-appsync-alpha"
import { GraphQLField} from "./infrastructure/graphQL-field"

interface ReadReceiptEvent {
  memberId: string
  conversationId: string
  latestReadMessageId: string
}

export const conversationReadReceiptGraphQLField: GraphQLField = {
  name: "readReceipt",
  type: "Mutation",
  schema:  new Field({
    returnType: GraphqlType.id({isRequired: false}),
    args: {
      memberId: GraphqlType.id({isRequired: true}),
      conversationId: GraphqlType.id({isRequired: true}),
      latestReadMessageId: GraphqlType.id({isRequired: true})
    }
  })
} 

export const lambdaHandler = async (event: AppSyncResolverEvent<ReadReceiptEvent>, context: Context): Promise<any|Error> => { 
  
  logger.verbose("incoming message - " + JSON.stringify(event))
  
  const command = new ReadReceiptCommand(event.arguments.memberId, 
                                    event.arguments.conversationId, 
                                    event.arguments.latestReadMessageId)

  const commandHandler = new ReadReceiptCommandHandler()

  return await commandHandler.handle(command)
}


export class ReadReceiptCommandHandler {
  private conversationRepository: ConversationRepository

  public constructor() {
    this.conversationRepository = new ConversationRepositoryDynamo(process.env.AWS_REGION!)
  }

  async handle(command: ReadReceiptCommand) {

    try{
      
      const conversation = await this.conversationRepository.load(command.conversationId)

      if (conversation == null)
      {
         throw new UnknownConversation(command.conversationId)
      }

      if(conversation.acknowledgeReadReceipt(
        command.memberId, 
        command.latestReadMessageId))
      {
        await this.conversationRepository.save(conversation)
      }
    }
    catch(error)
    {
      logger.error("conversation read receipt failed for command: " + JSON.stringify(command, (key, value) => value instanceof Set ? [...value]: value) + " with " + error)
      throw Error("Read Receipt Error: " + error.constructor.name)
    }

    return command.memberId
  }
}

export class ReadReceiptCommand {
  constructor(memberId: string, conversationId: string, latestReadMessageId: string)
  {
    this.memberId = memberId
    this.conversationId = conversationId
    this.latestReadMessageId = latestReadMessageId
  }
  memberId: string
  conversationId: string
  latestReadMessageId: string
}

export class UnknownConversation extends Error 
{
  constructor (conversationId: string)
  {
    super("Unknown conversation " + conversationId)
  }
}



















