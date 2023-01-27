import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, PutCommand, ScanCommandOutput } from "@aws-sdk/lib-dynamodb"
import logger from "../../../../test-helpers/service-test-logger"
import { ConversationSnapshot } from "../../infrastructure/conversation-snapshot"
import {State } from "../../domain/conversation"

interface ConversationsParameters{
  tableName: string
}

interface Conversation{
  id: string
  initiatingMemberId: string
  name: string
  state: "Created" | "Activated"
  messages: string[]
  participantIds: Set<string>
  adminIds: Set<string>
}

type ConditionFunction = (scanResult: ScanCommandOutput) => boolean;

export class ConversationsAccessor {
  
  private dynamoDB: DynamoDBDocumentClient
  private tableName: string

  constructor(region: string, parameters: ConversationsParameters)
  {
    const client = new DynamoDBClient({region: region})
    this.dynamoDB = DynamoDBDocumentClient.from(client, {marshallOptions: {convertEmptyValues: true, convertClassInstanceToMap:true}})
    this.tableName = parameters.tableName
  }

  async clear()
  {
    const queryTableName = {
        TableName: this.tableName
    }
    
    const items =  await this.dynamoDB.send(new ScanCommand(queryTableName))
    const tableName = this.tableName
    const dynamoDB = this.dynamoDB
  
    if (items.Items) {
      for await (const item of items.Items){
  
          var record = {
              TableName: tableName,
              Key: {"id": item["id"]}
          };
  
          logger.verbose("Clearing conversations - " + JSON.stringify(record))
          
          try
          {
            const result = await dynamoDB.send(new DeleteCommand(record))
            logger.verbose("Delete conversation - " + JSON.stringify(result))
          }
          catch(error)
          {
            logger.error("Failed to clear record from " + tableName + " - " + error)
          }
      }
    }
  } 

  async add(conversation: Conversation)
  {
    await this.dynamoDB.send(new PutCommand({
      TableName: this.tableName,
      Item: this.createSnapshot(conversation)
    }))
  }

  private createSnapshot(conversation: Conversation) {
    const snapshot = new ConversationSnapshot

    snapshot.id = conversation.id
    snapshot.adminIds = conversation.adminIds
    snapshot.name = conversation.name
    snapshot.initiatingMemberId = conversation.initiatingMemberId
    snapshot.participantIds = conversation.participantIds
    snapshot.state = <State>conversation.state

    return snapshot
  }

  async waitForAddition(conversationId: string, retries: number = 3, retryWaitInMillisecs = 500)
  {

    await this.waitForConversation(conversationId, retries, retryWaitInMillisecs, (scanResult)=>{
      let matched = false
      if((scanResult.Count != null) && scanResult.Count == 1)
      {
        matched = true
      }

      return matched
    })
  }

  async waitForActivation(conversationId: string, retries: number = 3, retryWaitInMillisecs = 500)
  {

    await this.waitForConversation(conversationId, retries, retryWaitInMillisecs, (scanResult)=>{
      let matched = false
      if((scanResult.Count != null) && scanResult.Count == 1)
      {
        const conversation = scanResult.Items![0]

        if (conversation.state == "Activated")
        {
          matched = true
        }
      }

      return matched
    })
  }

  async waitForReadReceipt(conversationId: string, memberId: string, latestReadMessageId: string, retries: number = 3, retryWaitInMillisecs = 500)
  {
    return await this.waitForConversation(conversationId, retries, retryWaitInMillisecs, (scanResult)=>{
      let matched = false
      if((scanResult.Count != null) && scanResult.Count == 1)
      {
        const conversation = scanResult.Items![0]

        logger.verbose("Found latestReadReceipt - " + conversation.latestReadReceipts[memberId] + " for member " + memberId + " whilst looking for message " + latestReadMessageId)

        if ((conversation.latestReadReceipts[memberId] != undefined) &&
            (conversation.latestReadReceipts[memberId] == latestReadMessageId))
        {
          matched = true
        }
      }

      return matched
    })
  }


  async waitForMessage(conversationId: string, retries: number = 3, retryWaitInMillisecs = 500): Promise<string|undefined>
  {
    let messageId: string|undefined
    const messageFound = await this.waitForConversation(conversationId, retries, retryWaitInMillisecs, (scanResult)=>{
      let matched = false
      if((scanResult.Count != null) && scanResult.Count == 1)
      {
        const conversation = scanResult.Items![0]

        if (conversation.messages.length > 0)
        {
          messageId = conversation.messages[conversation.messages.length - 1] as string
          matched = true
        }
      }

      return matched
    })
    
    return messageId
  }

  async waitForConversation(conversationId: string, retries: number = 3, retryWaitInMillisecs = 500, conditionFunction: ConditionFunction)
  {
    let conditionMet: boolean = false
    var params = {
      FilterExpression: "#id = :id",
      ExpressionAttributeValues: {
        ":id": conversationId,
      },
      ExpressionAttributeNames: 
       { "#id": "id" },
      TableName: this.tableName
    }
    logger.verbose(JSON.stringify(params))
    try{
      for (let retry = 0; retry < retries; retry++) {
        let result = await this.dynamoDB.send(new ScanCommand(params))
        logger.verbose("wait for conversation to be added/updated - " + JSON.stringify(result))
        if(conditionFunction(result)) 
        {
          conditionMet = true

          break
        }
        await new Promise(r => setTimeout(r, retryWaitInMillisecs * Math.pow(2, retry)))
      }
    }
    catch(err){
      logger.error(err)
    }
 
    return conditionMet
  }

}