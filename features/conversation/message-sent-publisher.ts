import { Context, DynamoDBStreamEvent } from "aws-lambda"
import { ConversationMessageSent } from "./domain/events"
import { ConversationSnapshot } from "./infrastructure/conversation-snapshot"
import { unmarshall } from "@aws-sdk/util-dynamodb"
import { AttributeValue} from "@aws-sdk/client-dynamodb"
import logger from "./infrastructure/lambda-logger"
import { EventDispatcher } from "./infrastructure/event-dispatcher"

export const lambdaHandler = async (dynamoDBStreamEvent: DynamoDBStreamEvent, context: Context): Promise<any> => {
  
  try{
    const event = EventParser.parse(dynamoDBStreamEvent) 

    if (event != undefined)
    {
      const eventDispatcher = new EventDispatcher(process.env.AWS_REGION!)
      await eventDispatcher.dispatch(event)
    }
  }
  catch(error)
  {
    logger.error("Failed to publish conversation message sent event - " + error)
  }
}

export class EventParser{
  static parse(dynamoDBStreamEvent: DynamoDBStreamEvent){

    let event: ConversationMessageSent | undefined
    const record = dynamoDBStreamEvent.Records[0];
    const {
      // @ts-ignore
      dynamodb: { NewImage, OldImage },
      eventName,
    } = record

    if (eventName == "MODIFY")
    {
      var conversation: ConversationSnapshot = this.resolveSnapshot(NewImage)

      event = new ConversationMessageSent(conversation.id, conversation.messages[conversation.messages.length - 1])
    }

    return event
  }

  static resolveSnapshot(image: any)
  {
    const unmarshalledImage = unmarshall(
      image as {
        [key: string]: AttributeValue
      }
    )
  
    return unmarshalledImage as ConversationSnapshot
  }
}



