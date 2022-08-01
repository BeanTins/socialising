import { Context, SQSEvent } from "aws-lambda"
import { ConversationActivated } from "./domain/events"
import logger from "./infrastructure/lambda-logger"
import { EventDispatcher } from "./infrastructure/event-dispatcher"
import { ConversationRepositoryDynamo} from "./infrastructure/conversation-repository-dynamo"
import { ConversationRepository } from "./domain/conversation-repository"

export const lambdaHandler = async (event: SQSEvent, context: Context): Promise<any> => {
  
  try{

    const command = CommandParser.parse(event) 

    if (command != undefined)
    {
      if (command.validated)
      {
        const commandHandler = new CreateCommandHandler()
      
        await commandHandler.handle(command)
    
        await postActivatedEvent(command)
      }
      else
      {
        throw new InvalidConversation(command.conversationId)
      }
    }
  }
  catch(error)
  {
    logger.error("Failed to publish conversation started event - " + error)
  }
}

export class CreateCommandHandler {

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
        validated = true
      }

      await this.conversationRepository.save(conversation)
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






async function postActivatedEvent(command: ActivateCommand) {
  const eventDispatcher = new EventDispatcher(process.env.AWS_REGION!)

  const event = new ConversationActivated(command.conversationId)

  await eventDispatcher.dispatch(event)
}

