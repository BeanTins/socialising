import { Conversation, State } from "../domain/conversation"

export interface ConversationSnapshotAttributes {
  id: string

  initiatingMemberId: string

  name: string

  participantIds: Set<string>

  adminIds: Set<string>

  state: State
}

export class ConversationSnapshot implements ConversationSnapshotAttributes{

  id: string

  initiatingMemberId: string

  name: string

  participantIds: Set<string>

  adminIds: Set<string>

  state: State

  public static createFromRawData(snapshot: Record<string, any>)
  {
    var conversationSnapshot: ConversationSnapshot = new ConversationSnapshot()

    Object.assign(conversationSnapshot, snapshot)

    if (conversationSnapshot.adminIds == null)
    {
      conversationSnapshot.adminIds = new Set([])
    }

    return conversationSnapshot
  }

  public static createFromConversation(conversation: Conversation) : ConversationSnapshot  {

    var conversationSnapshot: ConversationSnapshot = new ConversationSnapshot()

    Object.assign(conversationSnapshot, conversation)
   
    return conversationSnapshot
  }

  public toConversation() : Conversation {
    var conversation: Conversation = Conversation.create(this.initiatingMemberId, this.participantIds, this.name, this.adminIds)

    Object.assign(conversation, {id: this.id, state: this.state})

    return conversation
  }
}
