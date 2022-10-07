import { lambdaHandler } from "../activated-publisher"
import { Context, DynamoDBStreamEvent } from "aws-lambda"
import {mockClient} from "aws-sdk-client-mock"
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"
import { ConversationAttributes } from "./helpers/conversation-attributes"

const eventbridgeMock = mockClient(EventBridgeClient)

let event: DynamoDBStreamEvent, context: Context
const testConversation: ConversationAttributes = {
    id: "dec97fc5-2ee6-4e09-81d5-35fe6acca70b",
    name: "Tuesday five-a-sides",
    initiatingMemberId: "dfcdbba9-6bcd-4786-823d-8b2c9dde85ba",
    participantIds: new Set(["dfcdbba9-6bcd-4786-823d-8b2c9dde85ba", "06667f4a-0790-4251-b74b-17d392b1fe36"]),
    adminIds: new Set<string>(),
    state: "Created"
}

beforeEach(() => {
  jest.clearAllMocks()
  eventbridgeMock.reset()
  
})

test("integration event is sent", async () => {

  process.env.EventBusName = "SocialisingEventBus"
  
  await whenConversationActivated({
    id: "dec97fc5-2ee6-4e09-81d5-35fe6acca70b",
    name: "Tuesday five-a-sides",
    initiatingMemberId: "dfcdbba9-6bcd-4786-823d-8b2c9dde85ba",
    participantIds: new Set(["dfcdbba9-6bcd-4786-823d-8b2c9dde85ba", "06667f4a-0790-4251-b74b-17d392b1fe36"]),
    adminIds: new Set<string>(),
    state: "Created"
  })

  expectSentIntegrationEventToContain({
    Detail: JSON.stringify({
      conversationId: "dec97fc5-2ee6-4e09-81d5-35fe6acca70b"
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
          SS: Array.from(conversation.adminIds)
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
          SS: Array.from(conversation.adminIds)
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



