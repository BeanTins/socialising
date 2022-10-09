import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, BatchGetCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb"
import logger from "./lambda-logger"

export class MemberDevicesProjectionDAO
{
  private dynamoDB: DynamoDBClient
  private tableName: string

  constructor(region: string) {
    const client = new DynamoDBClient({region: region})
    this.dynamoDB = DynamoDBDocumentClient.from(client, {marshallOptions: {convertEmptyValues: true, convertClassInstanceToMap:true}})
    this.tableName = process.env.MemberDevicesProjectionTableName!
  }

  calculateKeys(memberIds: string[])
  {
    let keys = []

    for (const memberId of memberIds)
    keys.push({memberId: memberId})

    return keys
  }

  async addDeviceToMember(memberId: string, deviceId: string)
  {
    try{
      let deviceIds: string[] = []

      const result =  await this.dynamoDB.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          memberId: memberId
        }
      }))

      if (result.Item != undefined)
      {
        deviceIds = result.Item["deviceIds"]
      }

      deviceIds.push(deviceId)

      await this.dynamoDB.send(new PutCommand({
        TableName: this.tableName,
        Item: {
          memberId : memberId,
          deviceIds : deviceIds
        }
      }))
    }
    catch(err){
      logger.error("member devices projection add failed with " + JSON.stringify(err))
    }
  }

  async allDevicesForMembers(memberIds: string[]): Promise<string[]>
  {
    let devices: string[] = []

    try{
      const params = {
        RequestItems: {
         [this.tableName]: {
           Keys: this.calculateKeys(memberIds)
         }}}
  
      let result = await this.dynamoDB.send(new BatchGetCommand(params))

      if (result.Responses != undefined)
      {
        for (const response of result.Responses[this.tableName])
        {
          devices = devices.concat(response["deviceIds"])
        }
      }
    }
    catch(err){
      logger.error("member devices projection query failed with " + JSON.stringify(err))
    }

    return devices
  }
}

