import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, BatchGetCommand, PutCommand } from "@aws-sdk/lib-dynamodb"
import logger from "./lambda-logger"

export class DeviceKeyDAO
{
  private dynamoDB: DynamoDBClient
  private tableName: string

  constructor(region: string) {
    const client = new DynamoDBClient({region: region})
    this.dynamoDB = DynamoDBDocumentClient.from(client, {marshallOptions: {convertEmptyValues: true, convertClassInstanceToMap:true}})
    this.tableName = process.env.DeviceKeyTableName!
  }

  async save(deviceId: string, publicKey: string)
  {
    let message
    try
    {
      const result = await this.dynamoDB.send(new PutCommand({
        TableName: this.tableName,
        Item: {id: deviceId, publicKey: publicKey}
      }))
    } 
    catch(err)
    {
      logger.error("device key save failed " + JSON.stringify(err))
    }

    return message
  } 

  async getAll(deviceIds: string[])
  {
    let idsToPublicKeys: Record<string, any>[] = []
    try
    {
      const result = await this.dynamoDB.send(new BatchGetCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: deviceIds.map(deviceId => {
              return {id: deviceId}
          })
        }
      }
      }))

      if (result.Responses != undefined)
      {
        idsToPublicKeys = result.Responses[this.tableName]
      }
    } 
    catch(err)
    {
      logger.error("device key getAll failed " + JSON.stringify(err))
    }

    return idsToPublicKeys
  } 
}

