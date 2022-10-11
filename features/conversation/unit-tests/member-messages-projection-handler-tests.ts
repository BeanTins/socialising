import { lambdaHandler } from "../member-messages-projection-handler"
import { EventBridgeEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import { mockClient } from "aws-sdk-client-mock"
import {ConditionalCheckFailedException} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, GetCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {Message} from "../domain/conversation"
import logger from "../infrastructure/lambda-logger"

const loggerErrorSpy = jest.spyOn(logger, "error")
const loggerVerboseSpy = jest.spyOn(logger, "verbose")

let event: EventBridgeEvent<any, any>
let context: Context
const dynamoMock = mockClient(DynamoDBDocumentClient)

beforeEach(() => {
    jest.clearAllMocks()
    dynamoMock.reset()
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

  givenMemberMessagesUndefinedForMember("ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21")

  givenMemberMessages({
    memberId: "eda0eabe-6c2b-474f-9dde-d6a67232721a",
    messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff", "e989bd3e-7c00-4326-9f19-30c252e760e4"],
    version: 2})

  givenMemberMessagesUndefinedForMember("6f4386fe-bbff-4684-b0f7-698600ba8eb9")
  
  await whenMessageSent({
      messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
      conversationId: "fdf73659-942f-4a95-8dde-6f5f95b608a8"})
  
  thenMemberMessagesUpdate({
    memberId: "eda0eabe-6c2b-474f-9dde-d6a67232721a",
    messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    version: 2
  })

  thenMemberMessagesUpdate({
    memberId: "6f4386fe-bbff-4684-b0f7-698600ba8eb9",
    messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    version: 0
  })

  thenMemberMessagesUpdate({
    memberId: "ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21",
    messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    version: 0
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
      messageIds: ["09040739-830c-49d3-b8a5-1e6c9270fdb2"],
      version: 1
    })

  givenMemberMessages(
    {memberId: "eda0eabe-6c2b-474f-9dde-d6a67232721a",
     messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff", "09040739-830c-49d3-b8a5-1e6c9270fdb2"],
     version: 2
    })

  givenMemberMessagesUndefinedForMember("6f4386fe-bbff-4684-b0f7-698600ba8eb9")
  
  await whenMessageSent({
      messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
      conversationId: "fdf73659-942f-4a95-8dde-6f5f95b608a8"})
  
  thenMemberMessagesNotUpdated("ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21")

  thenMemberMessagesNotUpdated("eda0eabe-6c2b-474f-9dde-d6a67232721a")

  thenMemberMessagesUpdate({
    memberId: "6f4386fe-bbff-4684-b0f7-698600ba8eb9",
    messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    version: 0
  })
})

test("optimistic locking", async () => {

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
       message: "garbled encryption"}
    ]
  })

  givenMemberMessages(
    {memberId: "eda0eabe-6c2b-474f-9dde-d6a67232721a",
     messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff", "22d75e76-c38d-4231-a5f3-040afb0c55fa"],
     version: 1
    })
  
  givenMemberMessageUpdateOptimisticLocks({
    memberId: "ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21",
    messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff"],
    version: 1
  },
  {
    memberId: "ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21",
    messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff", "22d75e76-c38d-4231-a5f3-040afb0c55fa"],
    version: 2
  })

  await whenMessageSent({
      messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
      conversationId: "fdf73659-942f-4a95-8dde-6f5f95b608a8"})
  
  thenMemberMessagesNthUpdateIs(0, {
    memberId: "ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21",
    messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    version: 1
  })

  thenMemberMessagesNthUpdateIs(1, {
    memberId: "ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21",
    messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    version: 2
  })
  expect(loggerVerboseSpy).toBeCalledWith("optimistic locking for member ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21 with message 09040739-830c-49d3-b8a5-1e6c9270fdb2")
})

test("optimistic locking retries exceeded", async () => {

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
       message: "garbled encryption"}
    ]
  })

  givenMemberMessages(
    {memberId: "eda0eabe-6c2b-474f-9dde-d6a67232721a",
     messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff", "22d75e76-c38d-4231-a5f3-040afb0c55fa"],
     version: 2
    })
  
  givenMemberMessageUpdateOptimisticLocksIndefinitely({
    memberId: "ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21",
    messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff", "22d75e76-c38d-4231-a5f3-040afb0c55fa"],
    version: 2
   })

  await whenMessageSent({
      messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
      conversationId: "fdf73659-942f-4a95-8dde-6f5f95b608a8"})

  expect(loggerErrorSpy).toBeCalledWith("member ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21 exceeded optimistic lock retries for message 09040739-830c-49d3-b8a5-1e6c9270fdb2")

})

interface MessageSent {
    conversationId: string
    messageId: string
  }

interface MemberMessages {
  memberId: string
  messageIds: string[]
  version: number
}
  
interface MemberMessagesUpdate {
  memberId: string
  messageId: string
  version: number
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

function givenMemberMessagesUndefinedForMember(memberId: string)
{
  dynamoMock
  .on(GetCommand, {
    TableName: "MemberMessages",
    Key: {
      memberId : memberId,
    }
  }
  ).resolves({Item: undefined})
}

function givenMemberMessageUpdateOptimisticLocks(initialMessages: MemberMessages, afterLockMessages: MemberMessages)
{
  dynamoMock
  .on(GetCommand, {
    TableName: "MemberMessages",
    Key: {
      memberId : initialMessages.memberId,
    }
  }
  ).resolvesOnce({Item: initialMessages}
  ).resolvesOnce({Item: afterLockMessages})

  dynamoMock
  .on(UpdateCommand, {
    TableName: "MemberMessages",
    Key: {
      memberId : initialMessages.memberId,
    }
  }
  ).callsFakeOnce(input => {
    throw new ConditionalCheckFailedException({"$metadata": {}})
});
}

function givenMemberMessageUpdateOptimisticLocksIndefinitely(memberMessages: MemberMessages)
{
  dynamoMock
  .on(GetCommand, {
    TableName: "MemberMessages",
    Key: {
      memberId : memberMessages.memberId,
    }
  }
  ).resolves({Item: memberMessages})

  dynamoMock
  .on(UpdateCommand, {
    TableName: "MemberMessages",
    Key: {
      memberId : memberMessages.memberId,
    }
  }
  ).callsFake(input => {
    throw new ConditionalCheckFailedException({"$metadata": {}})
});
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

function thenMemberMessagesUpdate(memberMessages: MemberMessagesUpdate){
  thenMemberMessagesNthUpdateIs(0, memberMessages)
}

function thenMemberMessagesNthUpdateIs(updateIndex: number, memberMessages: MemberMessagesUpdate){
  expect(dynamoMock.commandCalls(UpdateCommand, {Key:{memberId: memberMessages.memberId}})[updateIndex].args[0].input).toEqual(
    expect.objectContaining(
    {  
      TableName: "MemberMessages",
      ExpressionAttributeValues: expect.objectContaining({
        ':newMessage': [memberMessages.messageId],
        ":currentVersion": memberMessages.version
      })
    })
  )
}

function thenMemberMessagesNotUpdated(memberId: string){
  expect(dynamoMock.commandCalls(UpdateCommand, {Key:{memberId: memberId}}).length).toBe(0)
}

  
