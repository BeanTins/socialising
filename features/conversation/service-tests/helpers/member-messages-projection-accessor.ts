import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb"
import logger from "./service-test-logger"

interface MemberMessagesProjectionParameters{
  tableName: string
}

export class MemberMessagesProjectionAccessor {
  
  private dynamoDB: DynamoDBDocumentClient
  private tableName: string

  constructor(region: string, parameters: MemberMessagesProjectionParameters)
  {
    const client = new DynamoDBClient({region: region})
    this.dynamoDB = DynamoDBDocumentClient.from(client, {marshallOptions: 
      {convertEmptyValues: true, 
        convertClassInstanceToMap:true,
        removeUndefinedValues:true}})
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
              Key: {"memberId": item["memberId"]}
          };
  
          logger.verbose("Clearing member messages projection - " + JSON.stringify(record))
          
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

  async waitForMessagesToBeStored(memberId: string, messageIds: string[], retries: number = 3, retryWaitInMillisecs = 500)
  {
    let messagesFound = false
    var params = {
      FilterExpression: "#memberId = :memberId",
      ExpressionAttributeValues: {
        ":memberId": memberId,
      },
      ExpressionAttributeNames: 
       { "#memberId": "memberId" },
      TableName: this.tableName
    }
    logger.verbose(JSON.stringify(params))
    try{
      for (let retry = 0; retry < retries; retry++) {
        let result = await this.dynamoDB.send(new ScanCommand(params))
        logger.verbose("wait for member messages to be added/updated - " + JSON.stringify(result))
        if((result.Count != null) && (result.Count == 1))
        {
          const storedMessageIds = result.Items![0]["messageIds"]

          if (messageIds.every(e => storedMessageIds.includes(e)))
          {
            logger.verbose("Found " + JSON.stringify(storedMessageIds) + " in " + JSON.stringify(messageIds))
            messagesFound = true
            break
          }
        }
        await new Promise(r => setTimeout(r, retryWaitInMillisecs * Math.pow(2, retry)))
      }
    }
    catch(err){
      logger.error(err)
    }
 
    return messagesFound
  }

}