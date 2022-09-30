import { Conversation } from "../domain/conversation"
import { ConversationSnapshot, ConversationSnapshotAttributes } from "./conversation-snapshot"
import { ConversationRepository } from "../domain/conversation-repository"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand, GetCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb"
import { write } from "fs"

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
       writeOperations.push({
         Put: {
           TableName: process.env.MessagesTableName!.repeat(1),
           Item: {
             id: conversation["newMessage"].id, 
             date: conversation["newMessage"].date,
             encryptions: conversation["newMessage"].encryptions
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

