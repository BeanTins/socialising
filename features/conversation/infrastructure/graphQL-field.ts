import { Field, GraphqlApi } from "@aws-cdk/aws-appsync-alpha"

export interface GraphQLField {
    name: string
    type: "Query"|"Mutation"|"Subscription"
    schema: Field
}

export function addField(api: GraphqlApi, field: GraphQLField)
{
  var addField = {
    "Query": (fieldName: string, field: Field) => {api.addQuery(fieldName, field)},
    "Mutation": (fieldName: string, field: Field) => {api.addMutation(fieldName, field)},
    "Subscription": (fieldName: string, field: Field) => {api.addSubscription(fieldName, field)}
  }

  addField[field.type](field.name, field.schema)
}

  
    