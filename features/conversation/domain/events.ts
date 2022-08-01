export class ConversationCreated {
    id: string
    initiatorId: string
    participantIds: Set<string>
    adminIds: Set<string>
    name: string

    constructor(id: string, initiatorId: string, participantIds: Set<string>, adminIds: Set<string>, name: string){
        this.id = id
        this.initiatorId = initiatorId
        this.participantIds = participantIds
        this.adminIds = adminIds
        this.name = name
    }
}
  
export class ConversationActivated {
    conversationId: string

    constructor(conversationId: string){
      this.conversationId = conversationId
    }
}
    
