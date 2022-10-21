import { ObjectType, GraphqlType, Field, Directive } from "@aws-cdk/aws-appsync-alpha"
import { GraphQLField} from "./infrastructure/graphQL-field"

export const IncomingMemberMessageResponse = new ObjectType("IncomingMemberMessageResponse", {
  definition: { 
    conversationId: GraphqlType.id({isRequired: true}),
    memberId: GraphqlType.id({isRequired: true}),
    messageId: GraphqlType.id({isRequired: true}) 
  },
  directives: [Directive.iam()]
})

export const conversationIncomingMemberMessageGraphQLField: GraphQLField = {
  name: "incomingMemberMessage",
  type: "Mutation",
  schema:  new Field({
    returnType: IncomingMemberMessageResponse.attribute({isRequired: false}),
    args: {
      conversationId: GraphqlType.id({isRequired: true}),
      memberId: GraphqlType.id({isRequired: true}),
      messageId: GraphqlType.id({isRequired: true})
    },
    directives: [Directive.iam()]
  })
}

