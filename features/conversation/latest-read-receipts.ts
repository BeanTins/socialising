import { Context, AppSyncResolverEvent } from "aws-lambda"
import logger from "./infrastructure/lambda-logger"
import { ObjectType, GraphqlType, Field } from "@aws-cdk/aws-appsync-alpha"
import { GraphQLField} from "./infrastructure/graphQL-field"
import { ConversationQuery } from "./infrastructure/conversation-query"

interface LatestReadReceiptsEvent {
  conversationId: string
}

export const MemberLatestReadMessagePairing = new ObjectType("MemberLatestReadMessagePairing", {
  definition: {
    memberId: GraphqlType.string({ isRequired: true }),
    latestReadMessageId: GraphqlType.string({ isRequired: true }),
  },
})

export const conversationLatestReadReceiptsGraphQLField: GraphQLField = {
  name: "latestReadReceipts",
  type: "Query",
  schema:  new Field({
    returnType: MemberLatestReadMessagePairing.attribute({isRequired: true, isList: true}),
    args: {
      conversationId: GraphqlType.id({isRequired: true})
    }
  })
} 

export const lambdaHandler = async (event: AppSyncResolverEvent<LatestReadReceiptsEvent>, context: Context): Promise<any|Error> => { 
  
  const query = new LatestReadReceiptsQuery(event.arguments.conversationId)

  const queryHandler = new LatestReadReceiptsQueryHandler()

  return await queryHandler.handle(query)
}


export class LatestReadReceiptsQueryHandler {
  private conversationQuery: ConversationQuery

  public constructor() {
    this.conversationQuery = new ConversationQuery(process.env.AWS_REGION!)
  }

  async handle(query: LatestReadReceiptsQuery) {

    let latestReadReceipts: Record<string, string>|undefined
    try{
      
      latestReadReceipts = await this.conversationQuery.latestReadReceipts(query.conversationId)

      if (latestReadReceipts == undefined)
      {
        throw new UnknownConversation(query.conversationId)
      }
    }
    catch(error)
    {
      logger.error("conversation latest read receipts query failed: " + JSON.stringify(query, (key, value) => value instanceof Set ? [...value]: value) + " with " + error)
      throw Error("Latest Read Receipts Error: " + error.constructor.name)
    }

    return this.buildMemberLatestReadMessagePairings(latestReadReceipts)
  }

  private buildMemberLatestReadMessagePairings(latestReadReceipts: Record<string, string>) {
    return Object.entries(latestReadReceipts).map(function (memberLatestReadMessagePairing) {
      return { memberId: memberLatestReadMessagePairing[0], latestReadMessageId: memberLatestReadMessagePairing[1] }
    })
  }
}

export class LatestReadReceiptsQuery {
  constructor(conversationId: string)
  {
    this.conversationId = conversationId
  }
  conversationId: string
}

export class UnknownConversation extends Error 
{
  constructor (conversationId: string)
  {
    super("Unknown conversation " + conversationId)
  }
}



















