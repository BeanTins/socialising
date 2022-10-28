import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb"

export class ConversationQuery
{
  private dynamoDB: DynamoDBClient

  constructor(region: string) {
    const client = new DynamoDBClient({region: region})
    this.dynamoDB = DynamoDBDocumentClient.from(client, {marshallOptions: {convertEmptyValues: true, convertClassInstanceToMap:true, removeUndefinedValues: true}})
  }

  async latestReadReceipts(id: string)
  {
    let readRequests: Record<string, string>|undefined

    const result =  await this.dynamoDB.send(new GetCommand({
      TableName: process.env.ConversationsTableName!.repeat(1),
      Key: {
        id: id
      }
    }))

    if (result.Item != undefined)
    {
      readRequests = result.Item.latestReadReceipts
    }

    return readRequests

  }
}

