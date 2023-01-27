import { MemberCredentialsAccessor} from "./member-credentials-accessor"
import logger from "./service-test-logger"
import { v4 as uuidv4 } from "uuid"
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"
import { LogGroupLogDestination } from "aws-cdk-lib/aws-apigateway"

export class FakeMember
{
  memberCredentials: MemberCredentialsAccessor
  email:  string
  name: string
  password: string
  private devices: Map<string, string>
  readonly memberId: string
  private eventbridge: EventBridgeClient
  private eventBusArn: string

  
  constructor(memberCredentials: MemberCredentialsAccessor, eventBusArn: string, region: string)
  {
    this.memberCredentials = memberCredentials
    this.devices = new Map<string, string>()
    this.memberId = uuidv4()
    this.eventbridge = new EventBridgeClient({region: region})
    this.eventBusArn = eventBusArn
  }

  async activated()
  {
    const [firstDeviceId] = this.devices.values()
    logger.verbose("firstDeviceId - " + firstDeviceId)
    await this.activateMember(this.name!, this.email!, this.memberId, firstDeviceId) 
  }

  idForDevice(deviceName: string)
  {
    logger.verbose(deviceName)
    logger.verbose(JSON.stringify(Array.from(this.devices.entries())))
    return this.devices.get(deviceName)
  }

  private async activateMember(name: string, email: string, memberId: string, deviceId: string)
  {
    const params = {
    Entries: [
      {
        Detail: JSON.stringify({name: name, email: email, memberId: memberId, deviceId: deviceId}),
        DetailType: "MemberActivatedEvent",
        EventBusName: this.eventBusArn,
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

  withName(name: string)
  {
    this.name = name
    this.email = this.generateEmailFromName(name)
    return this
  }

  withDevice(name: string)
  {
    this.devices.set(name, uuidv4()) 
    return this
  }

  async authenticatedWithPassword(password: string)
  {
    this.password = password
    await this.memberCredentials.addConfirmedMember(this.email!, password)
  }

  private generateEmailFromName(enteredName: string): string {
    return enteredName.replace(/ /g, ".") + "@gmail.com"
  }
}





