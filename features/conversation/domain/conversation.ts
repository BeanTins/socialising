import { v4 as uuidv4 } from "uuid"

export class Entity{
  
  readonly id: string

  constructor (id: string|null = null){
    if (id == null)
    {
      this.id = uuidv4()
    }
    else
    {
      this.id = id
    }
  }
}

export enum State{
    Created = "Created",
    Activated = "Activated"
}

export interface EncryptedDeviceMessage{
  recipientDeviceId: string
  recipientMemberId: string
  encryptedMessage: string
}

export type MessageEncryptions = EncryptedDeviceMessage[]

export interface Message{
  id: string
  senderMemberId: string
  senderDeviceId: string
  dateTime: number
  encryptions: MessageEncryptions
}

export class Conversation extends Entity {

  private initiatingMemberId: string
  private name: string
  readonly participantIds: Set<string>
  private adminIds: Set<string>
  private state: State
  private messages: string[]
  private newMessage: Message | undefined

  private constructor(initiatingMemberId: string, name: string|null, participantIds: Set<string>, adminIds: Set<string>, id: string|null) {
    super(id)
    this.initiatingMemberId = initiatingMemberId
    this.name = name ?? ""
    this.participantIds = participantIds
    this.adminIds = adminIds
    this.state = State.Created
    this.messages = []
  }

  public static create(initiatingMemberId: string, participantIds: Set<string>, name: string|null = null, adminIds: Set<string> = new Set()): Conversation
  {
    const adminsNotInConversation = [...adminIds].filter(x => !participantIds.has(x))

    if (participantIds.size < 2)
    {
      throw new BelowMinimumParticipants()
    }

    if (initiatingMemberId.length < 1)
    {
      throw new InitiatorNotDefined()
    }    

    if (adminsNotInConversation.length > 0)
    {
      throw new AdminsNotInConversation(adminsNotInConversation)
    }

    if (!participantIds.has(initiatingMemberId))
    {
      throw new InitiatorNotInConversation(initiatingMemberId)
    }

    return new Conversation(initiatingMemberId, name, participantIds, adminIds, null)
  }

  public activate()
  {
    this.state = State.Activated
  }

  public sendMessage(
    senderMemberId: string, 
    senderDeviceId: string, 
    conversationDevices: Set<string>, 
    messageEncryptions: MessageEncryptions)
  {
    if (this.state != "Activated")
    {
      throw new UnactivatedConversation(this.id)
    }

    if (!this.participantIds.has(senderMemberId))
    {
      throw new SenderMemberNotInConversation(senderMemberId, this.id)
    }

    if (!conversationDevices.has(senderDeviceId))
    {
      throw new SenderDeviceNotInConversation(senderDeviceId, this.id)
    }

    this.validateMessageMembers(senderMemberId, messageEncryptions)
    this.validateMessageDevices(senderDeviceId, messageEncryptions, conversationDevices)
    
    const messageId = uuidv4()
     this.newMessage = {
       id: messageId,
       senderMemberId: senderMemberId,
       senderDeviceId: senderDeviceId,
       dateTime: Date.now(),
       encryptions: messageEncryptions
      }

     this.messages.push(messageId)
     return messageId
  }

  private validateMessageMembers(senderMemberId: string, messageEncryptions: MessageEncryptions) {
    const messageMembers = new Set<string>()

    messageMembers.add(senderMemberId)

    for (const messageEncryption of messageEncryptions) {
      messageMembers.add(messageEncryption.recipientMemberId)
    }

    const unrecognisedMemberIds = [...messageMembers].filter((x) => !this.participantIds.has(x))
    const missingMemberIds = [...this.participantIds].filter((x) => !messageMembers.has(x))

    if ((missingMemberIds.length > 0) ||
      (unrecognisedMemberIds.length > 0)) {
      throw new ReceivingMemberMessageSetMismatch(this.id, missingMemberIds, unrecognisedMemberIds)
    }
  }

  private validateMessageDevices(senderDeviceId: string, messageEncryptions: MessageEncryptions, conversationDevices: Set<string>) {
    const messageDevices = new Set<string>()

    messageDevices.add(senderDeviceId)

    for (const messageEncryption of messageEncryptions) {
      messageDevices.add(messageEncryption.recipientDeviceId)
    }

    const unrecognisedDeviceIds = [...messageDevices].filter((x) => !conversationDevices.has(x))
    const missingDeviceIds = [...conversationDevices].filter((x) => !messageDevices.has(x))

    if ((missingDeviceIds.length > 0) ||
      (unrecognisedDeviceIds.length > 0)) {
      throw new ReceivingDeviceMessageSetMismatch(this.id, missingDeviceIds, unrecognisedDeviceIds)
    }
  }

}

export class AdminsNotInConversation extends Error 
{
  constructor (adminIds: string[])
  {
    super("Admin Ids: [" + adminIds + "] not in the conversation")
  }
}

export class InitiatorNotInConversation extends Error 
{
  constructor (initiator: string)
  {
    super("Initiator " + initiator + " not in the conversation")
  }
}

export class InitiatorNotDefined extends Error 
{
  constructor ()
  {
    super("Initiator is not defined")
  }
}

export class BelowMinimumParticipants extends Error 
{
  constructor ()
  {
    super("Conversation must have at least 2 participants")
  }
}

export class UnactivatedConversation extends Error 
{
  constructor (conversationId: string)
  {
    super("Cannot send message with unactivated conversation " + conversationId)
  }
}

export class SenderDeviceNotInConversation extends Error 
{
  constructor (senderDeviceId: string, conversationId: string)
  {
    super("Sender device " + senderDeviceId + " not in conversation " + conversationId)
  }
}

export class SenderMemberNotInConversation extends Error 
{
  constructor (senderMemberId: string, conversationId: string)
  {
    super("Sender member " + senderMemberId + " not in conversation " + conversationId)
  }
}

export class ReceivingMemberMessageSetMismatch extends Error 
{
  constructor (conversationId: string, missingMemberIds: string[], unrecognisedMemberIds: string[])
  {
    super("Receiving message member set mismatch in conversation " + conversationId + ", missing members: " + 
    JSON.stringify(missingMemberIds) + ", unrecognised members: " + JSON.stringify(unrecognisedMemberIds))
  }
}

export class ReceivingDeviceMessageSetMismatch extends Error 
{
  constructor (conversationId: string, missingDevices: string[], unrecognisedDevices: string[])
  {
    super("Receiving message device set mismatch in conversation " + conversationId + ", missing devices: " + 
    JSON.stringify(missingDevices) + ", unrecognised devices: " + JSON.stringify(unrecognisedDevices))
  }
}
