import { lambdaHandler } from "../latest-messages"
import { Context  } from "aws-lambda"
import { mockClient } from "aws-sdk-client-mock"
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb"
import {MemberMessagesAttributes} from "./helpers/member-messages-attributes"

const mockUUid = jest.fn()
jest.mock("uuid", () => ({ v4: () => mockUUid() }))

const JockAndRabBletherId = "09040739-830c-49d3-b8a5-1e6c9270fdb2"
const JockRabAndTamsChat = "27fcefea-2c04-4d7a-a038-2522c2f5a6d9"
const Jock = "464fddb3-0e8a-4503-9f72-14d02e100da7"
const JocksAndroidPhone = "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c"
const Rab = "a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba"
const RabsIPad = "e85b20be-fe46-4d1c-bcae-2a5fac8dbc99"
const HelloMessage = "67a607f0-a6a9-42ce-b609-17510bc10534"
const HelloMessageTime = new Date('2019-05-14T11:01:58.135Z').valueOf()
const GoodbyeMessage = "d663166c-5bf9-402c-a5d9-9bdcb1be7a84"
const GoodbyeMessageTime = new Date('2019-05-14T11:32:58.135Z').valueOf()
const WhereWillWeMeet = "99557a95-a076-4b35-8224-f021085f6ac3"
const OutsideTheGroundMessage = "1aef25c7-dd1a-4cb2-aeda-d5c3925e05f6"
const IAmHereMessage = "942f9f80-77b6-4b6c-b917-477bc7563972"
const IAmHereMessageTime = new Date('2019-05-14T11:22:58.135Z').valueOf()

const dynamoMock = mockClient(DynamoDBDocumentClient)

beforeEach(() => {
    jest.clearAllMocks()
    process.env.MemberMessagesProjectionTableName = "MemberMessages"
    process.env.MessagesTableName = "Messages"
})

test("no projected messages for member", async () => {

  const result = await whenRequestLatestMessages({
    memberId: Rab,
    deviceId: RabsIPad
  })

  expect(result.length).toBe(0)
})

test("one message from start of conversation", async () => {

  givenMemberMessages({memberId: Jock,
                       messageIds: [HelloMessage],
                       version: 1})

  givenMessage({id: HelloMessage,
                dateTime: HelloMessageTime,
                conversationId: JockAndRabBletherId,
                senderDeviceId: RabsIPad,
                senderMemberId: Rab,
                encryptions: [
                  {recipientDeviceId: JocksAndroidPhone, 
                   recipientMemberId: Jock,
                   message: "hello"}]})

  const result = await whenRequestLatestMessages({
    memberId: Jock,
    deviceId: JocksAndroidPhone
  })

  expect(result.length).toBe(1)
  expect(result[0]).toEqual({
        conversationId: JockAndRabBletherId,
        messageId: HelloMessage,
        message: "hello",
        dateTime: HelloMessageTime
  })
})

test("one message from two conversations", async () => {

  givenMemberMessages({memberId: Jock,
                       messageIds: [HelloMessage, WhereWillWeMeet, OutsideTheGroundMessage, IAmHereMessage, GoodbyeMessage],
                       version: 1})

  givenMessage({id: GoodbyeMessage,
                dateTime: GoodbyeMessageTime,
                conversationId: JockAndRabBletherId,
                senderDeviceId: RabsIPad,
                senderMemberId: Rab,
                encryptions: [
                  {recipientDeviceId: JocksAndroidPhone, 
                   recipientMemberId: Jock,
                   message: "goodbye"}]})

  givenMessage({id: IAmHereMessage,
                dateTime: IAmHereMessageTime,
                conversationId: JockRabAndTamsChat,
                senderDeviceId: RabsIPad,
                senderMemberId: Rab,
                encryptions: [
                  {recipientDeviceId: JocksAndroidPhone, 
                    recipientMemberId: Jock,
                    message: "I am here"
                  }
                ]})
    
  const result = await whenRequestLatestMessages({
    memberId: Jock,
    deviceId: JocksAndroidPhone,
    lastReceivedMessageIds: OutsideTheGroundMessage
  })

  expect(result.length).toBe(2)
  expect(result[0]).toEqual({
    conversationId: JockRabAndTamsChat,
    messageId: IAmHereMessage,
    message: "I am here",
    dateTime: IAmHereMessageTime
  })
  expect(result[1]).toEqual({
    conversationId: JockAndRabBletherId,
    messageId: GoodbyeMessage,
    message: "goodbye",
    dateTime: GoodbyeMessageTime
  })

})

test("one message from offset of conversation", async () => {

  givenMemberMessages({memberId: Jock,
                       messageIds: [HelloMessage, GoodbyeMessage],
                       version: 1})

  givenMessage({id: GoodbyeMessage,
                dateTime: HelloMessageTime,
                conversationId: JockAndRabBletherId,
                senderDeviceId: RabsIPad,
                senderMemberId: Rab,
                encryptions: [
                  {recipientDeviceId: JocksAndroidPhone, 
                   recipientMemberId: Jock,
                   message: "goodbye"}]})

  const result = await whenRequestLatestMessages({
    memberId: Jock,
    deviceId: JocksAndroidPhone,
    lastReceivedMessageIds: HelloMessage
  })

  expect(result.length).toBe(1)
  expect(result[0]).toEqual({
        conversationId: JockAndRabBletherId,
        messageId: GoodbyeMessage,
        message: "goodbye",
        dateTime: HelloMessageTime
  })
})

test("up-to-date", async () => {

  givenMemberMessages({memberId: Jock,
                       messageIds: [HelloMessage],
                       version: 1})

  givenMessage({id: HelloMessage,
                dateTime: HelloMessageTime,
                conversationId: JockAndRabBletherId,
                senderDeviceId: RabsIPad,
                senderMemberId: Rab,
                encryptions: [
                  {recipientDeviceId: JocksAndroidPhone, 
                   recipientMemberId: Jock,
                   message: "hello"}]})

  const result = await whenRequestLatestMessages({
    memberId: Jock,
    deviceId: JocksAndroidPhone,
    lastReceivedMessageIds: HelloMessage
  })

  expect(result.length).toBe(0)
})

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

export interface EncryptedDeviceMessage{
  recipientDeviceId: string
  recipientMemberId: string
  message: string
}

export type MessageEncryptions = EncryptedDeviceMessage[]

export interface Message{
  id: string
  conversationId: string
  senderMemberId: string
  senderDeviceId: string
  dateTime: number
  encryptions: MessageEncryptions
}
interface LatestMessageRequest{
  memberId: string, 
  deviceId: string,   
  lastReceivedMessageIds?: string
}

async function givenMessage(message: Message)
{
  dynamoMock
    .on(GetCommand, {
      TableName: "Messages",
      Key: {
        id : message.id,
      }
    }
    ).resolves({Item: message})
}

async function whenRequestLatestMessages(request: LatestMessageRequest){
    let context: Context
    const event = {
      arguments: {  
        memberId: request.memberId,    
        deviceId: request.deviceId,
        lastReceivedMessageId: request.lastReceivedMessageIds,
      },
        source: {},
        request: {headers: {}},
        info: {
          selectionSetList: [],
          selectionSetGraphQL: "",
          parentTypeName: "",
          fieldName: "",
          variables: {}
        },
        prev: {result: {}},
        stash: {}
 
  } 

  return await lambdaHandler(event, context!)
}
  
