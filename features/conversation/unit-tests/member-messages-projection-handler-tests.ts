import { lambdaHandler } from "../member-messages-projection-handler"
import { EventBridgeEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import { mockClient } from "aws-sdk-client-mock"
import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb"
import {Message} from "../domain/conversation"

let event: EventBridgeEvent<any, any>
let context: Context
const dynamoMock = mockClient(DynamoDBDocumentClient)

beforeEach(() => {
    jest.clearAllMocks()

})

test("append message to sender and recipients member projection", async () => {

  process.env.MemberMessagesProjectionTableName = "MemberMessages"
  process.env.MessagesTableName = "MessagesTable"
  givenMessage({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderMemberId: "ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21",
    senderDeviceId: "c834163e-502b-4e63-8cab-294bf13a560b",
    date: 0,
    encryptions: [
      {recipientDeviceId: "5b74b221-1be7-4c18-91ac-0121ae0cee77",
       recipientMemberId: "eda0eabe-6c2b-474f-9dde-d6a67232721a",
       message: "garbled encryption"},
       {recipientDeviceId: "5a072b0f-2d69-4809-acb7-f408cafed0db",
       recipientMemberId: "6f4386fe-bbff-4684-b0f7-698600ba8eb9",
       message: "garbled encryption"},
    ]
  })

  givenMemberMessages(
    {memberId: "ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21",
      messageIds: []
    })

  givenMemberMessages(
    {memberId: "eda0eabe-6c2b-474f-9dde-d6a67232721a",
     messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff"]
    })

  givenMemberMessages(
    {memberId: "6f4386fe-bbff-4684-b0f7-698600ba8eb9",
      messageIds: []
    })
  
  await whenMessageSent({
      messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
      conversationId: "fdf73659-942f-4a95-8dde-6f5f95b608a8"})
  
  thenMemberMessages({
    memberId: "eda0eabe-6c2b-474f-9dde-d6a67232721a",
    messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff","09040739-830c-49d3-b8a5-1e6c9270fdb2"]
  })

  thenMemberMessages({
    memberId: "6f4386fe-bbff-4684-b0f7-698600ba8eb9",
    messageIds: ["09040739-830c-49d3-b8a5-1e6c9270fdb2"]
  })

  thenMemberMessages({
    memberId: "ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21",
    messageIds: ["09040739-830c-49d3-b8a5-1e6c9270fdb2"]
  })
})

test("only append message to sender and recipients member projection if not already done (idempotence)", async () => {

  process.env.MemberMessagesProjectionTableName = "MemberMessages"
  process.env.MessagesTableName = "MessagesTable"
  givenMessage({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderMemberId: "ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21",
    senderDeviceId: "c834163e-502b-4e63-8cab-294bf13a560b",
    date: 0,
    encryptions: [
      {recipientDeviceId: "5b74b221-1be7-4c18-91ac-0121ae0cee77",
       recipientMemberId: "eda0eabe-6c2b-474f-9dde-d6a67232721a",
       message: "garbled encryption"},
       {recipientDeviceId: "5a072b0f-2d69-4809-acb7-f408cafed0db",
       recipientMemberId: "6f4386fe-bbff-4684-b0f7-698600ba8eb9",
       message: "garbled encryption"},
    ]
  })

  givenMemberMessages(
    {memberId: "ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21",
      messageIds: ["09040739-830c-49d3-b8a5-1e6c9270fdb2"]
    })

  givenMemberMessages(
    {memberId: "eda0eabe-6c2b-474f-9dde-d6a67232721a",
     messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff", "09040739-830c-49d3-b8a5-1e6c9270fdb2"]
    })

  givenMemberMessages(
    {memberId: "6f4386fe-bbff-4684-b0f7-698600ba8eb9",
      messageIds: []
    })
  
  await whenMessageSent({
      messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
      conversationId: "fdf73659-942f-4a95-8dde-6f5f95b608a8"})
  
  thenMemberMessages({
    memberId: "eda0eabe-6c2b-474f-9dde-d6a67232721a",
    messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff","09040739-830c-49d3-b8a5-1e6c9270fdb2"]
  })

  thenMemberMessages({
    memberId: "6f4386fe-bbff-4684-b0f7-698600ba8eb9",
    messageIds: ["09040739-830c-49d3-b8a5-1e6c9270fdb2"]
  })

  thenMemberMessages({
    memberId: "ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21",
    messageIds: ["09040739-830c-49d3-b8a5-1e6c9270fdb2"]
  })
})

interface MessageSent {
    conversationId: string
    messageId: string
  }

interface MemberMessages {
  memberId: string
  messageIds: string[]
}

function givenMessage(message: Message)
{
  dynamoMock
    .on(GetCommand, {
      TableName: "MessagesTable",
      Key: {
        id: message.id
      }
    }
    ).resolves({Item: message})
}

function givenMemberMessages(memberMessages: MemberMessages)
{
  dynamoMock
    .on(GetCommand, {
      TableName: "MemberMessages",
      Key: {
        memberId : memberMessages.memberId,
      }
    }
    ).resolves({Item: memberMessages})
}

async function whenMessageSent(messageSent: MessageSent){
  event = {
    detail: 
    {  
      messageId: messageSent.messageId,    
      conversationId: messageSent.conversationId
    }
  } as EventBridgeEvent<any, any>

  const result:APIGatewayProxyResult  = await lambdaHandler(event, context)
}

function thenMemberMessages(memberMessages: MemberMessages){
  expect(dynamoMock.commandCalls(PutCommand, {Item:{memberId: memberMessages.memberId}})[0].args[0].input).toEqual(
    expect.objectContaining({
      Item: memberMessages,
      TableName: "MemberMessages"
    })
  )
}


  
