import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, PutCommand, ScanCommandOutput } from "@aws-sdk/lib-dynamodb"
import logger from "../../../../test-helpers/service-test-logger"

interface MessagesParameters{
  tableName: string
}

export class MessagesAccessor {
  
  private dynamoDB: DynamoDBDocumentClient
  private tableName: string

  constructor(region: string, parameters: MessagesParameters)
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
  
          logger.verbose("Clearing messages - " + JSON.stringify(record))
          
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

  async waitForMessage(messageId: string, retries: number = 3, retryWaitInMillisecs = 500)
  {
    let messageFound: boolean = false
    var params = {
      FilterExpression: "#id = :id",
      ExpressionAttributeValues: {
        ":id": messageId,
      },
      ExpressionAttributeNames: 
       { "#id": "id" },
      TableName: this.tableName
    }
    logger.verbose(JSON.stringify(params))
    try{
      for (let retry = 0; retry < retries; retry++) {
        let scanResult = await this.dynamoDB.send(new ScanCommand(params))
        logger.verbose("wait for message to be added - " + JSON.stringify(scanResult))
        if((scanResult.Count != null) && scanResult.Count == 1)
        {
          messageFound = true
        }
        await new Promise(r => setTimeout(r, retryWaitInMillisecs * Math.pow(2, retry)))
      }
    }
    catch(err){
      logger.error(err)
    }
 
    return messageFound
  }

}