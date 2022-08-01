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

export class Conversation extends Entity {

  private initiatingMemberId: string
  private name: string
  private participantIds: Set<string>
  private adminIds: Set<string>
  private state: State

  private constructor(initiatingMemberId: string, name: string|null, participantIds: Set<string>, adminIds: Set<string>, id: string|null) {
    super(id)
    this.initiatingMemberId = initiatingMemberId
    this.name = name ?? ""
    this.participantIds = participantIds
    this.adminIds = adminIds
    this.state = State.Created
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



