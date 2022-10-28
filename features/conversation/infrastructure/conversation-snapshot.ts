import { Conversation, State } from "../domain/conversation"

export interface ConversationSnapshotAttributes {
  id: string

  initiatingMemberId: string

  name: string

  participantIds: Set<string>

  adminIds: Set<string>

  state: State

  messages: string[]

  latestReadReceipts: Record<string, string>
}

export class ConversationSnapshot implements ConversationSnapshotAttributes{

  id: string

  initiatingMemberId: string

  name: string

  participantIds: Set<string>

  adminIds: Set<string>

  state: State

  messages: string[]

  newMessage: undefined

  latestReadReceipts: Record<string, string>

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

    Object.assign(conversationSnapshot, conversation, {newMessage: undefined})
   
    return conversationSnapshot
  }

  public toConversation() : Conversation {
    var conversation: Conversation = Conversation.create(this.initiatingMemberId, this.participantIds, this.name, this.adminIds)

    Object.assign(conversation, 
      {id: this.id, 
       state: this.state, 
       latestReadReceipts: this.resolveLatestReadReceipts(), 
       messages: this.resolveMessages()
      })

    return conversation
  }

  private resolveMessages()
  {
    let messages = this.messages

    if (messages == undefined)
    {
      messages = []
    }

    return messages
  }

  private resolveLatestReadReceipts()
  {
    let latestReadReceipts = this.latestReadReceipts

    if (latestReadReceipts == undefined)
    {
      latestReadReceipts = {}
    }

    return latestReadReceipts
  }

}
