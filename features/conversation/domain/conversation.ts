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
  message: string
}

export type MessageEncryptions = EncryptedDeviceMessage[]

interface Message{
  id: string
  date: number
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
      throw new MessageSendWithUnactivatedConversation(this.id)
    }

    if (!this.participantIds.has(senderMemberId))
    {
      throw new SenderMemberNotInConversation(senderMemberId, this.id)
    }

    if (!conversationDevices.has(senderDeviceId))
    {
      throw new SenderDeviceNotInConversation(senderDeviceId, this.id)
    }
    
    const messageId = uuidv4()
     this.newMessage = {
       id: messageId,
       date: Date.now(),
       encryptions: messageEncryptions
      }

     this.messages.push(messageId)
     return messageId
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

export class MessageSendWithUnactivatedConversation extends Error 
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
