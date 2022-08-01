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

export const conversationLatestMessagesGraphQLField: GraphQLField = {
  name: "latestMessages",
  type: "Query",
  schema:  new Field({
    returnType: GraphqlType.id(),
    args: {
      initiatingMemberId: GraphqlType.id({isRequired: true}),
      invitedMemberIds: GraphqlType.id({isList: true, isRequired: true}),
      name: GraphqlType.string({isRequired: true}), 
      adminIds: GraphqlType.id({isList: true, isRequired: true})
    }
  })
} 

export const lambdaHandler = async (event: AppSyncResolverEvent<CreateConversationEvent>, context: Context): Promise<any|Error> => { 
  
}



