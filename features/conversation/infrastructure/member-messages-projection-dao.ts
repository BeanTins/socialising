import { DynamoDBClient, ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"
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

  async getMessagesForMember(memberId: string)
  {
    let memberList = []
    try{

      const result =  await this.dynamoDB.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          memberId: memberId
        }
      }))

      logger.verbose("member get result - " + JSON.stringify(result))
      if (result.Item != undefined)
      {
        memberList = result.Item["messageIds"]
      }
    }
    catch(error)
    {
      logger.error("member " + memberId + " get failed with " + error)
    }

    return memberList
  }

  async appendMessageForMembers(messageId: string, memberIds: Set<string>)
  {
    try{
      for (const memberId of memberIds)
      {
        const retryLimit = 3
        let messageAppended = false
        let updateRetries = 0

        while(!messageAppended && (updateRetries < retryLimit))
        {
          try{

            let memberMessages: string[] = []
            let currentVersion = 0
            const result =  await this.dynamoDB.send(new GetCommand({
              TableName: this.tableName,
              Key: {
                memberId: memberId
              }
            }))

            if (result.Item != undefined)
            {
              memberMessages = result.Item["messageIds"]
              currentVersion = result.Item["version"]
            }

            if(!this.isAppendedAlready(memberMessages, messageId)) // idempotence
            {
              const result =  await this.updateMemberMessages(memberId, messageId, currentVersion)
            }
            messageAppended = true
          }
          catch(error)
          {
            if (error instanceof ConditionalCheckFailedException)
            {
              logger.verbose("optimistic locking for member " + memberId + " with message " + messageId)
              updateRetries++
            }
            else
            {
              throw error
            }
          }
        }

        if (updateRetries == retryLimit)
        {
          logger.error("member " + memberId + " exceeded optimistic lock retries for message " + messageId)
        }
      }
    }
    catch(err){
      logger.error("member messages projection add failed with " + JSON.stringify(err))
    }
  }

  private async updateMemberMessages(memberId: string, messageId: string, currentVersion: number) {

    const versionIncrement = 1
    const initialVersionNumber = 0

    return await this.dynamoDB.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        memberId: memberId
      },
      UpdateExpression: 'SET #version = if_not_exists(#version, :initialVersionNumber) + :versionIncrement, #messageIds = list_append(if_not_exists(#messageIds, :emptyList), :newMessage)',
      ExpressionAttributeNames: {
        '#messageIds': 'messageIds',
        '#version': 'version',
      },
      ExpressionAttributeValues: {
        ':newMessage': [messageId],
        ':emptyList': [],
        ":initialVersionNumber": initialVersionNumber,
        ":versionIncrement": versionIncrement,
        ":currentVersion": currentVersion
      },
      ConditionExpression: "attribute_not_exists(#version) or #version = :currentVersion"
    }))
  }

  private isAppendedAlready(memberMessages: string[], messageId: string) {
    return (memberMessages.find(message => message == messageId))
  }
}

