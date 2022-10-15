import { lambdaHandler } from "../activated-publisher"
import { Context, DynamoDBStreamEvent } from "aws-lambda"
import {mockClient} from "aws-sdk-client-mock"
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"
import { ConversationAttributes } from "./helpers/conversation-attributes"

const eventbridgeMock = mockClient(EventBridgeClient)

const JockAndRabChat = "09040739-830c-49d3-b8a5-1e6c9270fdb2"
const Jock = "464fddb3-0e8a-4503-9f72-14d02e100da7"
const Rab = "49070739-630c-2223-c8a5-2e6c9270fdb2"

let event: DynamoDBStreamEvent, context: Context

beforeEach(() => {
  jest.clearAllMocks()
  eventbridgeMock.reset()
  
})

test("integration event is sent", async () => {

  process.env.EventBusName = "SocialisingEventBus"
  
  await whenConversationActivated({
    id: JockAndRabChat,
    name: "Jock & Rab Blether",
    initiatingMemberId: Jock,
    participantIds: new Set([Jock, Rab]),
    adminIds: new Set<string>(),
    state: "Created"
  })

  expectSentIntegrationEventToContain({
    Detail: JSON.stringify({
      conversationId: JockAndRabChat
    }),
    DetailType: "ConversationActivated",
    EventBusName: "SocialisingEventBus",
    Source: "socialising.beantins.com"
  })
})

async function whenConversationActivated(conversation: ConversationAttributes){
  event = 
   {Records: [{
    eventName: "MODIFY",
    dynamodb: {
      NewImage: {
        id: {
          S: conversation.id
        },
        participantIds: {
          SS: Array.from(conversation.participantIds)
        },
        name: {
          S: conversation.name
        },
        adminIds: {
          SS: Array.from(conversation.adminIds!)
        },
        messages: {
          L: []
        },
        state: {
          S: "Activated"
        }
      },
      OldImage: {
        id: {
          S: conversation.id
        },
        participantIds: {
          SS: Array.from(conversation.participantIds)
        },
        name: {
          S: conversation.name
        },
        adminIds: {
          SS: Array.from(conversation.adminIds!)
        },
        messages: {
          SS: []
        },
        state: {
          S: "Created"
        }
      }
    }
  }]
  }

  return await lambdaHandler(event, context)
}

function expectSentIntegrationEventToContain(matchingContent: any)
{
  expect(eventbridgeMock.commandCalls(PutEventsCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      Entries:expect.arrayContaining([
        expect.objectContaining(matchingContent)
      ])
    })
  )
}



