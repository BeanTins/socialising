import { Context, AppSyncResolverEvent } from "aws-lambda"
import { Conversation } from "./domain/conversation"
import { ConversationRepository} from "./domain/conversation-repository"
import { ConversationRepositoryDynamo} from "./infrastructure/conversation-repository-dynamo"
import logger from "./infrastructure/lambda-logger"
import { ObjectType, GraphqlType, Field } from "@aws-cdk/aws-appsync-alpha"
import { GraphQLField} from "./infrastructure/graphQL-field"

interface CreateConversationEvent {
  initiatingMemberId: string
  invitedMemberIds: string[]
  name: string | null
  adminIds: string[]
}

export const CreatedResponse = new ObjectType("CreatedResponse", {
  definition: { initiatingMemberId: GraphqlType.id(),
                id: GraphqlType.id() }
});

export const conversationCreateGraphQLField: GraphQLField = {
  name: "create",
  type: "Mutation",
  schema:  new Field({
    returnType: CreatedResponse.attribute({isRequired: false}),
    args: {
      initiatingMemberId: GraphqlType.id({isRequired: true}),
      invitedMemberIds: GraphqlType.id({isList: true, isRequired: true}),
      name: GraphqlType.string({isRequired: true}), 
      adminIds: GraphqlType.id({isList: true, isRequired: true})
    }
  })
} 

export const lambdaHandler = async (event: AppSyncResolverEvent<CreateConversationEvent>, context: Context): Promise<any|Error> => { 
  
  logger.verbose("incoming message - " + JSON.stringify(event))
  
  const command = new CreateCommand(event.arguments.initiatingMemberId, 
                                    event.arguments.invitedMemberIds, 
                                    event.arguments.name, 
                                    event.arguments.adminIds)

  const commandHandler = new CreateCommandHandler()

  return await commandHandler.handle(command)
}


export class CreateCommandHandler {

  private conversationRepository: ConversationRepository

  public constructor() {
    this.conversationRepository = new ConversationRepositoryDynamo(process.env.AWS_REGION!)
  }

  async handle(command: CreateCommand) {

    let conversation: Conversation
    try{
      
      conversation = Conversation.create(command.initiatingMemberId, new Set([...command.invitedMemberIds, command.initiatingMemberId]), command.name, new Set(command.adminIds))   

      await this.conversationRepository.save(conversation)
    }
    catch(error)
    {
      logger.error("conversation create failed for command: " + JSON.stringify(command, (key, value) => value instanceof Set ? [...value]: value) + " with " + error)
      throw error
    }

    return {initiatingMemberId: command.initiatingMemberId, id: conversation.id}
  }
}

export class CreateCommand {
  constructor(initiatingMemberId: string, invitedMemberIds: string[], name: string|null, adminIds: string[])
  {
    this.initiatingMemberId = initiatingMemberId
    this.invitedMemberIds = new Set(invitedMemberIds)
    this.name = name
    this.adminIds = new Set(adminIds)
  }
  initiatingMemberId: string
  invitedMemberIds: Set<string>
  name: string | null
  adminIds: Set<string>
}



















