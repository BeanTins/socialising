import { lambdaHandler } from "../download"
import { APIGatewayEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import {DynamoDBDocumentClient, BatchGetCommand, PutCommand} from "@aws-sdk/lib-dynamodb"
import { mockClient } from "aws-sdk-client-mock"

const JocksAndroidPhone = "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c"
const RabsIPhone = "916b74db-239c-47ee-9d6b-4cf68c3eea5d"
const JocksPublicKey = `AAAAB3NzaC1yc2EAAAABJQAAAQB/nAmOjTmezNUDKYvEeIRf2YnwM9/uUG1d0BYs
c8/tRtx+RGi7N2lUbp728MXGwdnL9od4cItzky/zVdLZE2cycOa18xBK9cOWmcKS
0A8FYBxEQWJ/q9YVUgZbFKfYGaGQxsER+A0w/fX8ALuk78ktP31K69LcQgxIsl7r
NzxsoOQKJ/CIxOGMMxczYTiEoLvQhapFQMs3FL96didKr/QbrfB1WT6s3838SEaX
fgZvLef1YB2xmfhbT9OXFE3FXvh2UPBfN+ffE7iiayQf/2XR+8j4N4bW30DiPtOQ
LGUrH1y5X/rpNZNlWW2+jGIxqZtgWg7lTy3mXy5x836Sj/6L`
const RabsPublicKey = `-----BEGIN RSA PUBLIC KEY-----\nMEoCQwNqzE4sreqrHGqKhaWfCJdt4Go3O
pWLhu6dMZNZFON81Nw3z9YB/jJ24nUp\nN6yiKrsuiN5EkgGiwh+BmI1bn5bpYgECAwEBAQ
==\n-----END RSA PUBLIC KEY-----\n`

let event: APIGatewayEvent, context: Context
const dynamoMock = mockClient(DynamoDBDocumentClient)

beforeEach(() => {
    jest.clearAllMocks()
    dynamoMock.reset()
    process.env.DeviceKeyTableName = "DeviceKeyTable"
})

test("download one match", async () => {

  givenDeviceKeys([{id: JocksAndroidPhone, publicKey: JocksPublicKey}])

  const result:APIGatewayProxyResult  = await whenDownload([JocksAndroidPhone])
  
  const body = JSON.parse(result.body) 
  expect(body.message).toBe(JSON.stringify([{id: JocksAndroidPhone, publicKey: JocksPublicKey}]))
})

test("download two matches", async () => {

  givenDeviceKeys([
    {id: JocksAndroidPhone, publicKey: JocksPublicKey},
    {id: RabsIPhone, publicKey: RabsPublicKey}
  ])

  const result:APIGatewayProxyResult  = await whenDownload([JocksAndroidPhone])
  
  const body = JSON.parse(result.body) 
  expect(body.message).toBe(JSON.stringify([
    {id: JocksAndroidPhone, publicKey: JocksPublicKey},
    {id: RabsIPhone, publicKey: RabsPublicKey}]))
})

async function whenDownload(deviceIds: string[]){
  event = {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "get",
    isBase64Encoded: false,
    path: "",
    pathParameters: null,
    queryStringParameters: null,
    stageVariables: null,
    requestContext: {  
      accountId: "",
      apiId: "",
      authorizer: {},
      protocol: "",
      httpMethod: "",
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: "",
        user: null,
        userAgent: null,
        userArn: null
      },
      path: "",
      stage: "",
      requestId: "",
      requestTimeEpoch: 0,
      resourceId: "",
      resourcePath: ""
    },
    resource: "",
    multiValueQueryStringParameters: {id: deviceIds}
    } as APIGatewayEvent

  return await lambdaHandler(event, context)
}

interface IdKeyPairing{
  id: string,
  publicKey: string
}

function givenDeviceKeys(keys: IdKeyPairing[])
{
  dynamoMock.on(BatchGetCommand).resolves({Responses: {DeviceKeyTable: keys}})
}



