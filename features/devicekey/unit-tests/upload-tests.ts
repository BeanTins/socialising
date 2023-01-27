import { lambdaHandler } from "../upload"
import { APIGatewayEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb"
import { mockClient } from "aws-sdk-client-mock"

const JocksAndroidPhone = "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c"
const JocksPublicKey = `AAAAB3NzaC1yc2EAAAABJQAAAQB/nAmOjTmezNUDKYvEeIRf2YnwM9/uUG1d0BYs
c8/tRtx+RGi7N2lUbp728MXGwdnL9od4cItzky/zVdLZE2cycOa18xBK9cOWmcKS
0A8FYBxEQWJ/q9YVUgZbFKfYGaGQxsER+A0w/fX8ALuk78ktP31K69LcQgxIsl7r
NzxsoOQKJ/CIxOGMMxczYTiEoLvQhapFQMs3FL96didKr/QbrfB1WT6s3838SEaX
fgZvLef1YB2xmfhbT9OXFE3FXvh2UPBfN+ffE7iiayQf/2XR+8j4N4bW30DiPtOQ
LGUrH1y5X/rpNZNlWW2+jGIxqZtgWg7lTy3mXy5x836Sj/6L`

let event: APIGatewayEvent, context: Context
const dynamoMock = mockClient(DynamoDBDocumentClient)

beforeEach(() => {
    jest.clearAllMocks()
    dynamoMock.reset()
    process.env.DeviceKeyTableName = "DeviceKeyTable"
})

test("upload returns successful code", async () => {

    const result:APIGatewayProxyResult  = await whenUpload("1234", "5678")
  
    expect(result.statusCode).toBe(201)
})

test("upload stores key", async () => {

  await whenUpload(JocksAndroidPhone, JocksPublicKey)

  thenKeyStored(JocksAndroidPhone, JocksPublicKey)
})

async function whenUpload(deviceId: string, publicKey: string){
  event = {
    body: JSON.stringify(
    {  
      deviceId: deviceId,    
      publicKey: publicKey
    })
  } as APIGatewayEvent

  return await lambdaHandler(event, context)
}

function givenDeviceKey(deviceId: string, publicKey: string)
{
  dynamoMock.on(GetCommand).resolves({Item: {deviceId: deviceId, publicKey: publicKey}})
}

function thenKeyStored(deviceId: string, publicKey: string)
{
  expect(dynamoMock.commandCalls(PutCommand).length).toBe(1)
  expect(dynamoMock.commandCalls(PutCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      Item: {id: deviceId, publicKey: publicKey},
      TableName: "DeviceKeyTable"
    })
  )
}


