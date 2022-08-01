import { Conversation } from "./conversation"

export interface ConversationRepository
{
  save(conversation: Conversation): void
  load(id: string): Promise<Conversation|null>
}

