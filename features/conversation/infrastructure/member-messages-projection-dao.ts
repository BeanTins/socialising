import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb"
import logger from "./lambda-logger"

export class MemberMessagesProjectionDAO
{
  private dynamoDB: DynamoDBClient
  private tableName: string

  constructor(region: string) {
    const client = new DynamoDBClient({region: region})
    this.dynamoDB = DynamoDBDocumentClient.from(client, {marshallOptions: {convertEmptyValues: true, convertClassInstanceToMap:true}})
    this.tableName = process.env.MemberMessagesProjectionTableName!
  }

  async appendMessageForMembers(messageId: string, memberIds: Set<string>)
  {
    try{
      for (const memberId of memberIds)
      {
        let memberMessages: string[] = []

        const result =  await this.dynamoDB.send(new GetCommand({
          TableName: this.tableName,
          Key: {
            memberId: memberId
          }
        }))

        if (result.Item != undefined)
        {
          memberMessages = result.Item["messageIds"]
        }

        memberMessages.push(messageId)

        await this.dynamoDB.send(new PutCommand({
          TableName: this.tableName,
          Item: {
            memberId : memberId,
            messageIds : memberMessages
          }
        }))
      }
    }
    catch(err){
      logger.error("member messages projection add failed with " + JSON.stringify(err))
    }
  }
}

