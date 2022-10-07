import { Context, EventBridgeEvent } from "aws-lambda"
import logger from "./infrastructure/lambda-logger"
import { MemberDevicesProjectionDAO } from "./infrastructure/member-devices-projection-dao"

export const lambdaHandler = async (event: EventBridgeEvent<any, any>, context: Context): Promise<any> => {
  
  try{
    const handler = new NotificationHandler()

    await handler.handle(new MemberActivatedEvent(event.detail.email, event.detail.memberId, event.detail.deviceId, event.detail.name))
  }
  catch(error)
  {
    logger.error("member device projection handler failed for : " + JSON.stringify(event) + " with error:" + error)
    throw error
  }
}

class NotificationHandler
{
  private memberDevicesProjection: MemberDevicesProjectionDAO
  constructor()
  {
    this.memberDevicesProjection = new MemberDevicesProjectionDAO(process.env.AWS_REGION!)
  }

  async handle(event: MemberActivatedEvent)
  {
    await this.memberDevicesProjection.addDeviceToMember(event.memberId, event.deviceId)
  }
}

export class MemberActivatedEvent {
  memberId: string
  deviceId: string
  name: string
  email: string

  constructor(email: string, memberId: string, deviceId: string, name: string){
    if (!email)
    {
      throw new Error("MemberActivatedEvent missing field email")
    }
    if (!memberId)
    {
      throw new Error("MemberActivatedEvent missing field memberId")
    }

    if (!deviceId)
    {
      throw new Error("MemberActivatedEvent missing field deviceId")
    }

    if (!name)
    {
      throw new Error("MemberActivatedEvent missing field name")
    }

    this.email = email
    this.memberId = memberId
    this.deviceId = deviceId
    this.name = name
  }
}

