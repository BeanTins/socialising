import  { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"
import logger from "../../../../test-helpers/service-test-logger"

export class TestEventPublisher {
  private eventbridge: EventBridgeClient
  private eventBusName: string

  constructor(region: string)
  {
    this.eventbridge = new EventBridgeClient({region: region})
    this.eventBusName = process.env.MembershipEventBusFakeArn!
  }

  async startConversation(id: string, participantIds: string[], adminIds: string[], name: string)
  {
    const params = {
    Entries: [
      {
        Detail: JSON.stringify({id: id, participantIds: participantIds, adminIds: adminIds, name: name}),
        DetailType: "ConversationStarted",
        EventBusName: this.eventBusName,
        Source: "networking.beantins.com",
      }
    ]
    }

    try
    {
       logger.verbose("post ConversationStarted - " + JSON.stringify(params))
       const result = await this.eventbridge.send(new PutEventsCommand(params))
       logger.verbose("post ConversationStarted successfully - " + JSON.stringify(result))
    }
    catch(error)
    {
      logger.error("Failed to post ConversationStarted event: " + error)
    }
  }

  async activateMember(name: string, email: string, id: string, deviceId: string)
  {
    const params = {
    Entries: [
      {
        Detail: JSON.stringify({name: name, email: email, id: id, deviceId: deviceId}),
        DetailType: "MemberActivatedEvent",
        EventBusName: this.eventBusName,
        Source: "membership.beantins.com",
      }
    ]
    }

    try
    {
       logger.verbose("post MemberActivatedEvent - " + JSON.stringify(params))
       const result = await this.eventbridge.send(new PutEventsCommand(params))
       logger.verbose("post MemberActivatedEvent successfully - " + JSON.stringify(result))
    }
    catch(error)
    {
      logger.error("Failed to post member activated event: " + error)
    }
  }

}
