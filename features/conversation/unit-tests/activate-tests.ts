import { lambdaHandler } from "../activate"
import { Context  } from "aws-lambda"
import { mockClient } from "aws-sdk-client-mock"
import {DynamoDBDocumentClient, TransactWriteCommand, GetCommand} from "@aws-sdk/lib-dynamodb"
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"
import {ConversationAttributes} from "./helpers/conversation-attributes"
import {MessageAttributes} from "./helpers/message-attributes"

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

  givenConversation({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
    name: "",
    initiatingMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    participantIds: new Set(["49070739-630c-2223-c8a5-2e6c9270fdb2", "79070739-630c-4423-c8a5-2e6c9270fdb2"]),
    adminIds: new Set([]),
    state: "Created"})

  await whenConversationActivate("1234", true)

  expect(dynamoMock.commandCalls(TransactWriteCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      TransactItems:expect.arrayContaining([
        expect.objectContaining({
          Put: expect.objectContaining({
            Item: expect.objectContaining({state: "Activated"}),
            TableName: "ConversationsTable1"
          })
        })
      ])
    })
  )

})

test("conversation activate fails if conversation is unknown", async () => {

  givenConversation(undefined)

  await whenConversationActivate("1234", true)

  expect(loggerErrorMock).toBeCalledWith("conversation activate failed for command: {\"conversationId\":\"1234\",\"validated\":true} with Error: Unknown conversation 1234 received")
})


test("conversation activate fails if conversation is invalid", async () => {

  givenConversation(undefined)

  await whenConversationActivate("1234", true)

  expect(loggerErrorMock).toBeCalledWith("conversation activate failed for command: {\"conversationId\":\"1234\",\"validated\":true} with Error: Unknown conversation 1234 received")
})

test("conversation activate fails if validation fails", async () => {

  givenConversation({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
    initiatingMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    participantIds: new Set(["49070739-630c-2223-c8a5-2e6c9270fdb2", "79070739-630c-4423-c8a5-2e6c9270fdb2"]),
    adminIds: new Set([]),
    state: "Created"})

  await whenConversationActivate("1234", false)

  expect(loggerErrorMock).toBeCalledWith("conversation activate failed for command: {\"conversationId\":\"1234\",\"validated\":false} with Error: Conversation 1234 is invalid")
})

function thenSentEventContains(matchingContent: any)
{
  expect(eventbridgeMock.commandCalls(PutEventsCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      Entries:expect.arrayContaining([
        expect.objectContaining(matchingContent)
      ])
    })
  )
}

function thenMessageCreated(message: MessageAttributes)
{
  expect(dynamoMock.commandCalls(TransactWriteCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      TransactItems:expect.arrayContaining([
        expect.objectContaining({
          Put: expect.objectContaining({
            TableName: "Conversations",
            Item: expect.objectContaining({messages: [message.id]})
          })
        }),
        expect.objectContaining({
          Put: expect.objectContaining({
            TableName: "Messages",
            Item: expect.objectContaining({id: message.id,
                                           date: new Date(message.date).valueOf(),
                                           encryptions: message.encryptions})
          })
        })        
      ])
    })
  )
}
  
function givenConversation(conversation: ConversationAttributes|undefined)
{
  dynamoMock.on(GetCommand).resolves({Item: conversation})
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
  
