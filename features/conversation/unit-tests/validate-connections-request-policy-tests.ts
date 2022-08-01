import { lambdaHandler } from "../validate-connections-request-policy"
import { Context, DynamoDBStreamEvent  } from "aws-lambda"
import { mockClient } from "aws-sdk-client-mock"
import { SQSClient, SendMessageCommand, GetQueueUrlCommand } from "@aws-sdk/client-sqs"
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"



const loggerVerboseMock = jest.fn()
const loggerErrorMock = jest.fn()
jest.mock("../infrastructure/lambda-logger", () => ({ verbose: (message: string) => loggerVerboseMock(message), 
  error: (message: string) => loggerErrorMock(message) }))

const mockUUid = jest.fn()
jest.mock("uuid", () => ({ v4: () => mockUUid() }))


const sqsMock = mockClient(SQSClient)
const eventbridgeMock = mockClient(EventBridgeClient)

beforeEach(() => {
    jest.clearAllMocks()

})

test("conversation request validate connections", async () => {

  process.env.QueueName = "ValidateConnectionsRequestQueue"
  mockUUid.mockReturnValue("09040739-830c-49d3-b8a5-1e6c9270fdb2")
  sqsMock.on(GetQueueUrlCommand).resolves({QueueUrl: "http://queue.com"})

  await whenConversationCreateRequest("1234", new Set(["1234", "9012"]))

  expect(sqsMock.commandCalls(SendMessageCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      "MessageBody": JSON.stringify({"correlationId": "09040739-830c-49d3-b8a5-1e6c9270fdb2",
               "initiatingMemberId": "1234",
               "requestedConnectionMemberIds": ["9012"],
              }),
      QueueUrl: "http://queue.com"
    })
  )
})

test("conversation request raises event", async () => {

  process.env.EventBusName = "SocialisingEventBus"
  mockUUid.mockReturnValue("09040739-830c-49d3-b8a5-1e6c9270fdb2")
  sqsMock.on(GetQueueUrlCommand).resolves({QueueUrl: "http://queue.com"})

  await whenConversationCreateRequest("1234", new Set(["1234", "9012"]))

  expectSentEventToContain({
    Detail: JSON.stringify({
      id: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
      initiatorId: "1234",
      participantIds: ["1234", "9012"],
      adminIds: [],
      name: ""
    }),
    DetailType: "ConversationCreated",
    EventBusName: "SocialisingEventBus",
    Source: "socialising.beantins.com"
  })
})

async function whenConversationCreateRequest(initiatingMemberId: string, 
  participantIds: Set<string>,
  adminIds: Set<string> = new Set(),
  name: string = "",
  id: string = "09040739-830c-49d3-b8a5-1e6c9270fdb2"){
  let context: Context
  const event: DynamoDBStreamEvent = 
   {Records: [{
    eventName: "INSERT",
    dynamodb: {
      NewImage: {
        id: {
          S: id
        },
        initiatingMemberId: {
          S: initiatingMemberId
        },
        participantIds: {
          SS: Array.from(participantIds)
        },
        adminIds: {
          SS: Array.from(adminIds)
        },
        name:{
          S: name
        }
      },
      OldImage: {}
    }
  }]
  }

  return await lambdaHandler(event, context!)
}

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

  
