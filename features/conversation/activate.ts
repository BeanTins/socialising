import { Context, SQSEvent } from "aws-lambda"
import logger from "./infrastructure/lambda-logger"
import { ConversationRepositoryDynamo} from "./infrastructure/conversation-repository-dynamo"
import { ConversationRepository } from "./domain/conversation-repository"

export const lambdaHandler = async (event: SQSEvent, context: Context): Promise<any> => {
  
  try{

    const command = CommandParser.parse(event) 

    if (command != undefined)
    {
      const commandHandler = new ActivateCommandHandler()
    
      await commandHandler.handle(command)
    }
  }
  catch(error)
  {
    logger.error("Failed to  conversation activated event - " + error)
  }
}

export class ActivateCommandHandler {

  private conversationRepository: ConversationRepository

  public constructor() {
    this.conversationRepository = new ConversationRepositoryDynamo(process.env.AWS_REGION!)
  }

  async handle(command: ActivateCommand) {

    let validated = false

    try{

      const conversation = await this.conversationRepository.load(command.conversationId)

      if (conversation == null)
      {
        throw new UnknownConversation(command.conversationId)
      }

      if (command.validated)
      {
        conversation.activate()
        await this.conversationRepository.save(conversation)
        validated = true
      }
      else
      {
         throw new InvalidConversation(command.conversationId)
      }
    }
    catch(error)
    {
      logger.error("conversation activate failed for command: " + JSON.stringify(command) + " with " + error)
      throw error
    }

    return validated
  }
}

class ActivateCommand {
  constructor(conversationId: string, validated: boolean)
  {
    this.conversationId = conversationId
    this.validated = validated
  }
  conversationId: string
  validated: boolean
}

class CommandParser{
  static parse(event: SQSEvent){

    const commandDTO = JSON.parse(event.Records[0].body)

    const command = new ActivateCommand(commandDTO.correlationId, commandDTO.validated)

    return command
  }
}

export class UnknownConversation extends Error 
{
  constructor (conversationId: string)
  {
    super("Unknown conversation " + conversationId + " received")
  }
}

export class InvalidConversation extends Error 
{
  constructor (conversationId: string)
  {
    super("Conversation " + conversationId + " is invalid")
  }
}

