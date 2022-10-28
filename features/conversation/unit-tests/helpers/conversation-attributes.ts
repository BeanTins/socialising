export interface ConversationAttributes {
    id: string
    name?: string
    initiatingMemberId: string
    participantIds: Set<string>,
    adminIds?: Set<string>,
    messages?: string[]
    state: "Activated" | "Created"
    latestReadReceipts?: Record<string, string>
  }
  