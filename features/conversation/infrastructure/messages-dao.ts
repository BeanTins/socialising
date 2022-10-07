import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb"
import logger from "./lambda-logger"
import { Message } from "../domain/conversation"

export class MessagesDAO
{
  private dynamoDB: DynamoDBClient
  private tableName: string

  constructor(region: string) {
    const client = new DynamoDBClient({region: region})
    this.dynamoDB = DynamoDBDocumentClient.from(client, {marshallOptions: {convertEmptyValues: true, convertClassInstanceToMap:true}})
    this.tableName = process.env.MessagesTableName!
  }

  async getMembersInMessage(messageId: string)
  {
    let members: Set<string> = new Set()
    try{
      const result =  await this.dynamoDB.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          id: messageId
        }
      }))

      if (result.Item != undefined)
      {
        const message = result.Item as Message

        members.add(message.senderMemberId)
        for (const encryptedMessage of message.encryptions)
        {
           members.add(encryptedMessage.recipientMemberId)
        }
      }
    }
    catch(err){
      logger.error("message retrieval failed with " + JSON.stringify(err))
    }

    return members
  }
}

