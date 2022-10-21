import { GraphqlType, Field, Directive } from "@aws-cdk/aws-appsync-alpha"
import { GraphQLField} from "./infrastructure/graphQL-field"
import { IncomingMemberMessageResponse } from "./incoming-member-message"

export const conversationIncomingMemberMessageReceivedGraphQLField: GraphQLField = {
  name: "incomingMemberMessageReceived",
  type: "Subscription",
  schema:  new Field({
    returnType: IncomingMemberMessageResponse.attribute({isRequired: false}),
    args:
    {
      memberId: GraphqlType.id({isRequired: false}),
    },
    directives: [Directive.subscribe('incomingMemberMessage')],
  })
}

