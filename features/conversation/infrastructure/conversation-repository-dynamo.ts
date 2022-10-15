import { Conversation } from "../domain/conversation"
import { ConversationSnapshot } from "./conversation-snapshot"
import { ConversationRepository } from "../domain/conversation-repository"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb"

export class ConversationRepositoryDynamo implements ConversationRepository
{
  private dynamoDB: DynamoDBClient

  constructor(region: string) {
    const client = new DynamoDBClient({region: region})
    this.dynamoDB = DynamoDBDocumentClient.from(client, {marshallOptions: {convertEmptyValues: true, convertClassInstanceToMap:true, removeUndefinedValues: true}})
  }

  async save(conversation: Conversation)
  {
    const snapshot = ConversationSnapshot.createFromConversation(conversation)

    let writeOperations: any = [{
      Put: {
        TableName: process.env.ConversationsTableName!.repeat(1),
        Item: snapshot
      }
    }]

     if (conversation["newMessage"] != undefined) 
     {
       const newMessage = conversation["newMessage"]
       writeOperations.push({
         Put: {
           TableName: process.env.MessagesTableName!.repeat(1),
           Item: {
             id: newMessage.id, 
             senderMemberId: newMessage.senderMemberId,
             senderDeviceId: newMessage.senderDeviceId,
             dateTime: newMessage.dateTime,
             encryptions: newMessage.encryptions,
             conversationId: conversation.id
           }
         }
       })
     }

     const result = await this.dynamoDB.send(
       new TransactWriteCommand({TransactItems: writeOperations}))
  }

  async load(id: string): Promise<Conversation|null>  
  {
    let conversation: Conversation | null = null

    const result =  await this.dynamoDB.send(new GetCommand({
      TableName: process.env.ConversationsTableName!.repeat(1),
      Key: {
        id: id
      }
    }))

    if (result.Item != undefined)
    {
       let snapshot: ConversationSnapshot = ConversationSnapshot.createFromRawData(result.Item)
       conversation = snapshot.toConversation()
    }

    return conversation
  }
}

