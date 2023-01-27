import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, PutCommand, ScanCommandOutput } from "@aws-sdk/lib-dynamodb"
import logger from "../../../../test-helpers/service-test-logger"

interface DeviceKeyParameters{
  tableName: string
}

export class DeviceKeysAccessor {
  
  private dynamoDB: DynamoDBDocumentClient
  private tableName: string

  constructor(region: string, parameters: DeviceKeyParameters)
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
  
          logger.verbose("Clearing device keys - " + JSON.stringify(record))
          
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

  async add(deviceId: string, publicKey: string)
  {
    await this.dynamoDB.send(new PutCommand({
      TableName: this.tableName,
      Item: {id: deviceId, publicKey: publicKey}
    }))
  }

  async waitForDeviceKey(deviceId: string, retries: number = 3, retryWaitInMillisecs = 500)
  {
    let deviceKey = undefined
    var params = {
      FilterExpression: "#id = :id",
      ExpressionAttributeValues: {
        ":id": deviceId,
      },
      ExpressionAttributeNames: 
       { "#id": "id" },
      TableName: this.tableName
    }
    logger.verbose(JSON.stringify(params))
    try{
      for (let retry = 0; retry < retries; retry++) {
        let scanResult = await this.dynamoDB.send(new ScanCommand(params))
        logger.verbose("wait for device key to be added - " + JSON.stringify(scanResult))
        if((scanResult.Count != null) && scanResult.Count == 1)
        {
          deviceKey = scanResult.Items![0].publicKey
          logger.verbose("device key added - " + JSON.stringify(deviceKey))
          break
        }
        await new Promise(r => setTimeout(r, retryWaitInMillisecs * Math.pow(2, retry)))
      }
    }
    catch(err){
      logger.error(err)
    }
 
    return deviceKey
  }

}