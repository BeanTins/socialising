import { Context, AppSyncResolverEvent } from "aws-lambda"
import logger from "./infrastructure/lambda-logger"
import { GraphqlApi, AuthorizationType, ObjectType, GraphqlType, ResolvableField, Field, LambdaDataSource } from "@aws-cdk/aws-appsync-alpha"
import { GraphQLType } from "graphql"
import { GraphQLField} from "./infrastructure/graphQL-field"

interface CreateConversationEvent {
  initiatingMemberId: string
  invitedMemberIds: string[]
  name: string | null
  adminIds: string[]
}

export const LatestMessagesResponse = new ObjectType("latestMessagesResponse", {
  definition: { initiatingMemberId: GraphqlType.id(),
                id: GraphqlType.id() }
});

export const conversationLatestMessagesGraphQLField: GraphQLField = {
  name: "latestMessages",
  type: "Query",
  schema:  new Field({
    returnType: LatestMessagesResponse.attribute({isList: true, isRequired: false}),
    args: {
      memberId: GraphqlType.id({isRequired: true}),
      deviceId: GraphqlType.id({isRequired: true}),
    }
  })
} 

export const lambdaHandler = async (event: AppSyncResolverEvent<CreateConversationEvent>, context: Context): Promise<any|Error> => { 
  
}



