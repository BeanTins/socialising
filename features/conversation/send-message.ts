import { Context } from "aws-lambda"
import { v4 as uuidv4 } from "uuid"

interface SendMessageEvent {
  arguments: {
    senderDeviceId: string
    senderMemberId: string
    conversationId: string
    message: string
  }
}

export const lambdaHandler = async (event: SendMessageEvent, context: Context): Promise<string | Error> => {
  console.log(JSON.stringify(event, undefined, 2));

  try {

    throw new Error("Unknown conversation")
    return uuidv4()
  } catch (err) {
    console.error(`SOMETHING WENT WRONG: ${JSON.stringify(err, undefined, 2)}`);
    throw new Error(`${err.message}`);
  }
}