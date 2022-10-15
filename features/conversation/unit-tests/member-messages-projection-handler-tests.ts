import { lambdaHandler } from "../member-messages-projection-handler"
import { EventBridgeEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import { mockClient } from "aws-sdk-client-mock"
import {ConditionalCheckFailedException} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, GetCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {Message} from "../domain/conversation"
import logger from "../infrastructure/lambda-logger"
import {MemberMessagesAttributes} from "./helpers/member-messages-attributes"

const loggerErrorSpy = jest.spyOn(logger, "error")
const loggerVerboseSpy = jest.spyOn(logger, "verbose")

let event: EventBridgeEvent<any, any>
let context: Context
const dynamoMock = mockClient(DynamoDBDocumentClient)

const JockRabAndTamsChat = "27fcefea-2c04-4d7a-a038-2522c2f5a6d9"
const Jock = "464fddb3-0e8a-4503-9f72-14d02e100da7"
const JocksAndroidPhone = "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c"
const Rab = "49070739-630c-2223-c8a5-2e6c9270fdb2"
const RabsIPhone = "916b74db-239c-47ee-9d6b-4cf68c3eea5d"
const Tam = "a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba"
const TamsIPhone = "2bb28d20-18cb-4224-97cd-2ec7bca2f58f"

beforeEach(() => {
    jest.clearAllMocks()
    dynamoMock.reset()
    process.env.MemberMessagesProjectionTableName = "MemberMessages"
    process.env.MessagesTableName = "MessagesTable"
 })

test("append message to sender and recipients member projection", async () => {

  givenMessage({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderMemberId: Jock,
    senderDeviceId: JocksAndroidPhone,
    dateTime: 0,
    encryptions: [
      {recipientDeviceId: TamsIPhone,
       recipientMemberId: Tam,
       encryptedMessage: "garbled encryption"},
       {recipientDeviceId: RabsIPhone,
       recipientMemberId: Rab,
       encryptedMessage: "garbled encryption"},
    ]
  })

  givenMemberMessagesUndefinedForMember(Jock)

  givenMemberMessages({
    memberId: Tam,
    messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff", "e989bd3e-7c00-4326-9f19-30c252e760e4"],
    version: 2})

  givenMemberMessagesUndefinedForMember(Rab)
  
  await whenMessageSent({
      messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
      conversationId: "fdf73659-942f-4a95-8dde-6f5f95b608a8"})
  
  thenMemberMessagesUpdate({
    memberId: Tam,
    messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    version: 2
  })

  thenMemberMessagesUpdate({
    memberId: Rab,
    messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    version: 0
  })

  thenMemberMessagesUpdate({
    memberId: Jock,
    messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    version: 0
  })
})

test("only append message to sender and recipients member projection if not already done (idempotence)", async () => {

  givenMessage({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderMemberId: Jock,
    senderDeviceId: JocksAndroidPhone,
    dateTime: 0,
    encryptions: [
      {recipientDeviceId: TamsIPhone,
       recipientMemberId: Tam,
       encryptedMessage: "garbled encryption"},
       {recipientDeviceId: RabsIPhone,
       recipientMemberId: Rab,
       encryptedMessage: "garbled encryption"},
    ]
  })

  givenMemberMessages(
    {memberId: Jock,
      messageIds: ["09040739-830c-49d3-b8a5-1e6c9270fdb2"],
      version: 1
    })

  givenMemberMessages(
    {memberId: Tam,
     messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff", "09040739-830c-49d3-b8a5-1e6c9270fdb2"],
     version: 2
    })

  givenMemberMessagesUndefinedForMember(Rab)
  
  await whenMessageSent({
      messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
      conversationId: JockRabAndTamsChat})
  
  thenMemberMessagesNotUpdated(Jock)

  thenMemberMessagesNotUpdated(Tam)

  thenMemberMessagesUpdate({
    memberId: Rab,
    messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    version: 0
  })
})

test("optimistic locking", async () => {

  givenMessage({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderMemberId: Jock,
    senderDeviceId: JocksAndroidPhone,
    dateTime: 0,
    encryptions: [
      {recipientDeviceId: TamsIPhone,
       recipientMemberId: Tam,
       encryptedMessage: "garbled encryption"}
    ]
  })

  givenMemberMessages(
    {memberId: Tam,
     messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff", "22d75e76-c38d-4231-a5f3-040afb0c55fa"],
     version: 1
    })
  
  givenMemberMessageUpdateOptimisticLocks({
    memberId: Jock,
    messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff"],
    version: 1
  },
  {
    memberId: Jock,
    messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff", "22d75e76-c38d-4231-a5f3-040afb0c55fa"],
    version: 2
  })

  await whenMessageSent({
      messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
      conversationId: JockRabAndTamsChat})
  
  thenMemberMessagesNthUpdateIs(0, {
    memberId: Jock,
    messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    version: 1
  })

  thenMemberMessagesNthUpdateIs(1, {
    memberId: Jock,
    messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    version: 2
  })
  expect(loggerVerboseSpy).toBeCalledWith("optimistic locking for member " + Jock + " with message 09040739-830c-49d3-b8a5-1e6c9270fdb2")
})

test("optimistic locking retries exceeded", async () => {

  givenMessage({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderMemberId: Jock,
    senderDeviceId: JocksAndroidPhone,
    dateTime: 0,
    encryptions: [
      {recipientDeviceId: TamsIPhone,
       recipientMemberId: Tam,
       encryptedMessage: "garbled encryption"}
    ]
  })

  givenMemberMessages(
    {memberId: Tam,
     messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff", "22d75e76-c38d-4231-a5f3-040afb0c55fa"],
     version: 2
    })
  
  givenMemberMessageUpdateOptimisticLocksIndefinitely({
    memberId: Jock,
    messageIds: ["47017043-ef04-46f7-b669-b8293ef04aff", "22d75e76-c38d-4231-a5f3-040afb0c55fa"],
    version: 2
   })

  await whenMessageSent({
      messageId: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
      conversationId: JockRabAndTamsChat})

  expect(loggerErrorSpy).toBeCalledWith("member " + Jock + " exceeded optimistic lock retries for message 09040739-830c-49d3-b8a5-1e6c9270fdb2")

})

interface MessageSent {
    conversationId: string
    messageId: string
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

function givenMemberMessageUpdateOptimisticLocks(initialMessages: MemberMessagesAttributes, afterLockMessages: MemberMessagesAttributes)
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

function givenMemberMessageUpdateOptimisticLocksIndefinitely(memberMessages: MemberMessagesAttributes)
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



function givenMemberMessages(memberMessages: MemberMessagesAttributes)
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

  
