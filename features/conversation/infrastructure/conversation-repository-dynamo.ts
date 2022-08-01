import { Conversation } from "../domain/conversation"
import { ConversationSnapshot, ConversationSnapshotAttributes } from "./conversation-snapshot"
import { ConversationRepository } from "../domain/conversation-repository"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb"

export class ConversationRepositoryDynamo implements ConversationRepository
{
  private dynamoDB: DynamoDBClient

  constructor(region: string) {
    const client = new DynamoDBClient({region: region})
    this.dynamoDB = DynamoDBDocumentClient.from(client, {marshallOptions: {convertEmptyValues: true, convertClassInstanceToMap:true}})
  }

  async save(conversation: Conversation)
  {
    const snapshot = ConversationSnapshot.createFromConversation(conversation)

    await this.dynamoDB.send(new PutCommand({
      TableName: process.env.ConversationsTableName!.repeat(1),
      Item: snapshot
    }))
  }

  async load(id: string): Promise<Conversation|null>  
  {
    let conversation: Conversation | null = null

    const result =  await this.dynamoDB.send(new GetCommand({
      TableName: process.env.ConversationsTableName!.repeat(1),
      Key: {
        id: id
      },
    }))
    
    if (result.Item != undefined)
    {
       let snapshot: ConversationSnapshot = ConversationSnapshot.createFromRawData(result.Item)
       conversation = snapshot.toConversation()
    }

    return conversation
  }
}

