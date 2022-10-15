import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb"
import logger from "./lambda-logger"
import { Message, MessageEncryptions} from "../domain/conversation"

interface MessageMemberInfo
{
  conversationId: string
  messageId: string
  encryptedContent: string
  dateTime: number
}

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
      const message = await this.get(messageId)

      if (message != undefined)
      {
        members.add(message.senderMemberId)
        for (const deviceMessage of message.encryptions)
        {
           members.add(deviceMessage.recipientMemberId)
        }
      }
    }
    catch(err){
      logger.error("message retrieval failed with " + JSON.stringify(err))
    }

    return members
  }

  async getInfoForDevice(messageId: string, deviceId: string)
  {
    let memberInfo: MessageMemberInfo|undefined

    const message = await this.get(messageId)

    if (message != undefined)
    {
      const encryptedDeviceMessages: MessageEncryptions = message.encryptions

      const deviceMessage = encryptedDeviceMessages.find(encryption => encryption.recipientDeviceId == deviceId)

      if (deviceMessage != undefined)
      {
        memberInfo = {
          conversationId: message.conversationId,
          messageId: message.id,
          encryptedContent: deviceMessage.encryptedMessage,
          dateTime: message.dateTime

        }
      }
    }

    return memberInfo
  }

  async get(messageId: string)
  {
    let message
    try
    {
      const result = await this.dynamoDB.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          id: messageId
        }
      }))
      message = result.Item
    } 
    catch(err)
    {
      logger.error("message retrieval failed with " + JSON.stringify(err))
    }

    return message
  } 
}

