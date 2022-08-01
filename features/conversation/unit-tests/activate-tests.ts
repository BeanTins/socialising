import { lambdaHandler } from "../activate"
import { Context  } from "aws-lambda"
import { mockClient } from "aws-sdk-client-mock"
import {DynamoDBDocumentClient, PutCommand, GetCommand} from "@aws-sdk/lib-dynamodb"
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"

const loggerVerboseMock = jest.fn()
const loggerErrorMock = jest.fn()
jest.mock("../infrastructure/lambda-logger", () => ({ verbose: (message: string) => loggerVerboseMock(message), 
  error: (message: string) => loggerErrorMock(message) }))

const dynamoMock = mockClient(DynamoDBDocumentClient)
const eventbridgeMock = mockClient(EventBridgeClient)

beforeEach(() => {
    jest.clearAllMocks()

})

test("conversation activate validated updates domain object", async () => {

  process.env.ConversationsTableName = "ConversationsTable1"

  dynamoMock.on(GetCommand).resolves({Item: {
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
    name: "",
    initiatingMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    participantIds: new Set(["49070739-630c-2223-c8a5-2e6c9270fdb2", "79070739-630c-4423-c8a5-2e6c9270fdb2"]),
    adminIds: new Set([]),
    state: "Created"}})


  await whenConversationActivate("1234", true)

  expect(dynamoMock.commandCalls(PutCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      Item: expect.objectContaining({state: "Activated"}),
      TableName: "ConversationsTable1"
    }))
})

test("conversation activate fails if conversation is unknown", async () => {

  dynamoMock.on(GetCommand).resolves({Item: undefined})

  await whenConversationActivate("1234", true)

  expect(loggerErrorMock).toBeCalledWith("conversation activate failed for command: {\"conversationId\":\"1234\",\"validated\":true} with Error: Unknown conversation 1234 received")
})


test("conversation activate validated raises event", async () => {

  process.env.ConversationsTableName = "ConversationsTable1"
  process.env.EventBusName = "SocialisingEventBus"

  dynamoMock.on(GetCommand).resolves({Item: {
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
    name: "",
    initiatingMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    participantIds: new Set(["49070739-630c-2223-c8a5-2e6c9270fdb2", "79070739-630c-4423-c8a5-2e6c9270fdb2"]),
    adminIds: new Set([]),
    state: "Created"}})


  await whenConversationActivate("1234", true)

  expectSentEventToContain({Detail: JSON.stringify({
    conversationId: "1234"
    }),
    DetailType: "ConversationActivated",
    EventBusName: "SocialisingEventBus",
    Source: "socialising.beantins.com"
  })

})

test("conversation activate fails if conversation is invalid", async () => {

  dynamoMock.on(GetCommand).resolves({Item: undefined})

  await whenConversationActivate("1234", true)

  expect(loggerErrorMock).toBeCalledWith("conversation activate failed for command: {\"conversationId\":\"1234\",\"validated\":true} with Error: Unknown conversation 1234 received")
})

function expectSentEventToContain(matchingContent: any)
{
  expect(eventbridgeMock.commandCalls(PutEventsCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      Entries:expect.arrayContaining([
        expect.objectContaining(matchingContent)
      ])
    })
  )
}

async function whenConversationActivate(
  correlationId: string, 
  validated: boolean){
    let context: Context
    const event = {
      Records: [
        {body: JSON.stringify({correlationId: correlationId, validated: validated}),
        messageId: "",
        receiptHandle: "",
        attributes: {ApproximateReceiveCount: "", SentTimestamp: "", SenderId: "", ApproximateFirstReceiveTimestamp: ""},
        messageAttributes: {},
        md5OfBody: "",
        eventSource: "",
        eventSourceARN: "",
        awsRegion: ""
        }
      ],
  } 

  return await lambdaHandler(event, context!)
}
  
