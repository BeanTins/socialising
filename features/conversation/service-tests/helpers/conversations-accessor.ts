import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, PutCommand, ScanCommandOutput } from "@aws-sdk/lib-dynamodb"
import logger from "./service-test-logger"
import { ConversationSnapshot} from "../../infrastructure/conversation-snapshot"

interface ConversationsParameters{
  tableName: string
}

interface Conversation{
  id: string
  initiatingMemberId: string
  name: string
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
              await dynamoDB.send(new DeleteCommand(record))
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

  async waitForConversation(conversationId: string, retries: number = 3, retryWaitInMillisecs = 500, conditionFunction: ConditionFunction)
  {
    let itemAdded: boolean = false
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
        if(conditionFunction(result))        {
          break
        }
        await new Promise(r => setTimeout(r, retryWaitInMillisecs * Math.pow(2, retry)))
      }
    }
    catch(err){
      logger.error(err)
    }
 
    return itemAdded
  }

}