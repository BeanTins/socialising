import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"
import logger from "./lambda-logger"

export class EventDispatcher{
    private client: EventBridgeClient

    constructor(region: string)
    {
       this.client = new EventBridgeClient({region: region})
    }
    async dispatch(event: any) {

      const eventName = event.constructor.name

      const params = {
          Entries: [
          {
            Detail: JSON.stringify(event, (key, value) => value instanceof Set ? [...value]: value),
            DetailType: eventName,
            EventBusName: process.env.EventBusName!.repeat(1), // repeat to make deep copy because of odd issue with process.env used in unit test
            Source: "socialising.beantins.com",
          },
        ]
     }

     try{
       await this.client.send(new PutEventsCommand(params))
     }
     catch(error)
     {
       logger.error("post " + eventName + " Integration event failed for params: " + JSON.stringify(params) + "with error: " + JSON.stringify(error))
     }
  }
}
