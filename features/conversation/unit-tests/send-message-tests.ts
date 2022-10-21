import { lambdaHandler } from "../send-message"
import { Context  } from "aws-lambda"
import { mockClient } from "aws-sdk-client-mock"
import {DynamoDBDocumentClient, GetCommand, BatchGetCommand, TransactWriteCommand} from "@aws-sdk/lib-dynamodb"
import { MessageEncryptions } from "../domain/conversation"
import {ConversationAttributes} from "./helpers/conversation-attributes"
import {MessageAttributes} from "./helpers/message-attributes"
import {MemberDevicesAttributes} from "./helpers/member-devices-attributes"
import logger from "../infrastructure/lambda-logger"

const loggerErrorSpy = jest.spyOn(logger, "error")

const mockUUid = jest.fn()
jest.mock("uuid", () => ({ v4: () => mockUUid() }))

const JockAndRabChat = "09040739-830c-49d3-b8a5-1e6c9270fdb2"
const JockRabAndTamsChat = "27fcefea-2c04-4d7a-a038-2522c2f5a6d9"
const Jock = "464fddb3-0e8a-4503-9f72-14d02e100da7"
const JocksAndroidPhone = "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c"
const JocksWindowsLaptop = "df25d2f4-85e1-4bc0-a7e3-bc42fca247e7"
const Rab = "49070739-630c-2223-c8a5-2e6c9270fdb2"
const RabsIPad = "e85b20be-fe46-4d1c-bcae-2a5fac8dbc99"
const RabsIPhone = "916b74db-239c-47ee-9d6b-4cf68c3eea5d"
const Tam = "a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba"
const TamsIPhone = "2bb28d20-18cb-4224-97cd-2ec7bca2f58f"

const dynamoMock = mockClient(DynamoDBDocumentClient)

beforeEach(() => {
    jest.clearAllMocks()
    dynamoMock.reset()

    process.env.ConversationsTableName = "Conversations"
    process.env.MessagesTableName = "Messages"
    process.env.MemberDevicesProjectionTableName = "MemberDevicesProjectionTable"

})

test("unknown conversation throws error", async () => {

  givenConversation(undefined)
  
  await expect(async () => {
    await whenSendMessage({conversationId: JockAndRabChat,
    senderDeviceId: RabsIPad,
    senderMemberId: Rab,
    messageEncryptions: [
      {recipientDeviceId: JocksAndroidPhone, 
       recipientMemberId: Jock,
       encryptedMessage: "hello"}]})

  }).rejects.toThrow("Send Message Error: UnknownConversation")

  expectLoggerErrorEnding("Unknown conversation " + JockAndRabChat)
})

test("unactivated conversation throws error", async () => {

  givenConversation({
    id: JockAndRabChat, 
    initiatingMemberId: Rab,
    participantIds: new Set([Rab, Jock]),
    state: "Created"})

  await expect(async () => {
    await whenSendMessage({conversationId: JockAndRabChat,
    senderDeviceId: RabsIPad,
    senderMemberId: Rab,
    messageEncryptions: [
      {recipientDeviceId: JocksAndroidPhone, 
       recipientMemberId: Jock,
       encryptedMessage: "hello"}]})

  }).rejects.toThrow("Send Message Error: UnactivatedConversation")

  expectLoggerErrorEnding("Cannot send message with unactivated conversation 09040739-830c-49d3-b8a5-1e6c9270fdb2")
})

test("sender member not in conversation", async () => {

  givenJockAndRabConversation()

  await expect(async () => {
    await whenSendMessage({conversationId: JockAndRabChat,
    senderDeviceId: TamsIPhone,
    senderMemberId: Tam,
    messageEncryptions: [
      {recipientDeviceId: JocksAndroidPhone, 
       recipientMemberId: Jock,
       encryptedMessage: "hello"}]})

  }).rejects.toThrow("Send Message Error: SenderMemberNotInConversation")

  expectLoggerErrorEnding("Sender member " + Tam + " not in conversation " + JockAndRabChat)
})

test("sender device not in conversation", async () => {

  givenJockAndRabConversation()

  givenRecognisedDevices([
    {memberId: Rab, deviceIds: [RabsIPad]},
    {memberId: Jock, deviceIds: [JocksAndroidPhone]}
  ])

  await expect(async () => {
    await whenSendMessage({conversationId: JockAndRabChat,
    senderDeviceId: RabsIPhone,
    senderMemberId: Rab,
    messageEncryptions: [
      {recipientDeviceId: JocksAndroidPhone, 
       recipientMemberId: Jock,
       encryptedMessage: "hello"}]})

  }).rejects.toThrow("Send Message Error: SenderDeviceNotInConversation")

  expectLoggerErrorEnding("Sender device " + RabsIPhone + " not in conversation " + JockAndRabChat)
  
})

test("receiver member missing in conversation", async () => {

  givenConversation({
    id: JockRabAndTamsChat, 
    initiatingMemberId: Rab,
    participantIds: new Set([Rab, Tam, Jock]),
    state: "Activated"})

  givenRecognisedDevices([
    {memberId: Rab, deviceIds: [RabsIPad]},
    {memberId: Jock, deviceIds: [JocksAndroidPhone]},
    {memberId: Tam, deviceIds: [TamsIPhone]}
  ])

  await expect(async () => {
    await whenSendMessage({conversationId: JockAndRabChat,
    senderDeviceId: RabsIPad,
    senderMemberId: Rab,
    messageEncryptions: [
      {recipientDeviceId: JocksAndroidPhone, 
       recipientMemberId: Jock,
       encryptedMessage: "hello4"}       
      ]})
  }).rejects.toThrow("Send Message Error: ReceivingMemberMessageSetMismatch")

  expectLoggerErrorEnding("Receiving message member set mismatch in conversation " + JockRabAndTamsChat + ', missing members: ["' + Tam + '"], unrecognised members: []')  
})

test("receiver member unrecognised in conversation", async () => {

  givenJockAndRabConversation()

  givenRecognisedDevices([
    {memberId: Rab, deviceIds: [RabsIPad]},
    {memberId: Jock, deviceIds: [JocksAndroidPhone]},
    {memberId: Tam, deviceIds: [TamsIPhone]}
  ])

  await expect(async () => {
    await whenSendMessage({conversationId: JockAndRabChat,
    senderDeviceId: RabsIPad,
    senderMemberId: Rab,
    messageEncryptions: [
      {recipientDeviceId: JocksAndroidPhone, 
       recipientMemberId: Jock,
       encryptedMessage: "hello (encrypted with Jock's key)"},
      {recipientDeviceId: TamsIPhone, 
       recipientMemberId: Tam,
       encryptedMessage: "hello (encrypted with Tam's key)"}
    ]})       
  }).rejects.toThrow("Send Message Error: ReceivingMemberMessageSetMismatch")

  expectLoggerErrorEnding("Receiving message member set mismatch in conversation " + JockAndRabChat + ', missing members: [], unrecognised members: ["' + Tam + '"]')  
})

test("receiver device unrecognised in conversation", async () => {

  givenJockAndRabConversation()

  givenRecognisedDevices([
    {memberId: Rab, deviceIds: [RabsIPad]},
    {memberId: Jock, deviceIds: [JocksAndroidPhone]}
  ])

  await expect(async () => {
    await whenSendMessage({conversationId: JockAndRabChat,
    senderDeviceId: RabsIPad,
    senderMemberId: Rab,
    messageEncryptions: [
      {recipientDeviceId: JocksAndroidPhone, 
       recipientMemberId: Jock,
       encryptedMessage: "hello (encrypted with JocksAndroidPhone's key)"},
      {recipientDeviceId: JocksWindowsLaptop, 
       recipientMemberId: Jock,
       encryptedMessage: "hello (encrypted with JocksWindowsLaptop's key)"}]}       )
  }).rejects.toThrow("Send Message Error: ReceivingDeviceMessageSetMismatch")

  expectLoggerErrorEnding("Receiving message device set mismatch in conversation " + JockAndRabChat + ', missing devices: [], unrecognised devices: ["' + JocksWindowsLaptop + '"]')  
})

test("receiver device missing in conversation", async () => {

  givenJockAndRabConversation()

  givenRecognisedDevices([
    {memberId: Rab, deviceIds: [RabsIPad]},
    {memberId: Jock, deviceIds: [JocksAndroidPhone, JocksWindowsLaptop]}
  ])

  await expect(async () => {
    await whenSendMessage({conversationId: JockAndRabChat,
    senderDeviceId: RabsIPad,
    senderMemberId: Rab,
    messageEncryptions: [
      {recipientDeviceId: JocksWindowsLaptop, 
       recipientMemberId: Jock,
       encryptedMessage: "hello4"}]}       )
  }).rejects.toThrow("Send Message Error: ReceivingDeviceMessageSetMismatch")

  expectLoggerErrorEnding("Receiving message device set mismatch in conversation " + JockAndRabChat + ', missing devices: ["' + JocksAndroidPhone + '"], unrecognised devices: []')  
})
test("successful message returns id", async () => {

  mockUUid.mockReturnValue("57b22b8c-3656-4dcb-8188-17472042279e")

  givenJockAndRabConversation()

  givenRecognisedDevices([
    {memberId: Rab, deviceIds: [RabsIPad]},
    {memberId: Jock, deviceIds: [JocksAndroidPhone]}
  ])
    
  const messageId = await whenSendMessage({conversationId: JockAndRabChat,
    senderDeviceId: RabsIPad,
    senderMemberId: Rab,
    messageEncryptions: [
      {recipientDeviceId: JocksAndroidPhone, 
      recipientMemberId: Jock,
      encryptedMessage: "hello"}]})

  expect(messageId).toBe("57b22b8c-3656-4dcb-8188-17472042279e")
})

test("send message stored", async () => {

  mockUUid.mockReturnValue("57b22b8c-3656-4dcb-8188-17472042279e")
  jest.spyOn(Date, 'now').mockReturnValueOnce(new Date('2019-05-14T11:01:58.135Z').valueOf())

  givenJockAndRabConversation()

  givenRecognisedDevices([
    {memberId: Rab, deviceIds: [RabsIPad]},
    {memberId: Jock, deviceIds: [JocksAndroidPhone]}
  ])
    
  const messageId = await whenSendMessage({conversationId: JockAndRabChat,
    senderDeviceId: RabsIPad,
    senderMemberId: Rab,
    messageEncryptions: [
      {recipientDeviceId: JocksAndroidPhone, 
       recipientMemberId: Jock,
       encryptedMessage: "hello"}]})

  thenMessageCreated({
    id: "57b22b8c-3656-4dcb-8188-17472042279e",
    conversationId: JockAndRabChat,
    dateTime: '2019-05-14T11:01:58.135Z',
    encryptions: [
      {recipientDeviceId: JocksAndroidPhone,
       recipientMemberId: Jock, 
       encryptedMessage: "hello"}
      ]})
})

interface SendMessageEvent {
  conversationId: string
  senderMemberId: string
  senderDeviceId: string
  messageEncryptions: MessageEncryptions
}

function expectLoggerErrorEnding(endingText: string) {

  const loggedText = loggerErrorSpy.mock.calls[loggerErrorSpy.mock.calls.length - 1][0] as String

  expect(loggedText.startsWith("conversation send message failed for command")).toBe(true)

  expect(loggedText.substring(loggedText.length - endingText.length)).toBe(endingText)
}

function thenMessageCreated(message: MessageAttributes)
{
  expect(dynamoMock.commandCalls(TransactWriteCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      TransactItems:expect.arrayContaining([
        expect.objectContaining({
          Put: expect.objectContaining({
            TableName: "Conversations",
            Item: expect.objectContaining({messages: [message.id]})
          })
        }),
        expect.objectContaining({
          Put: expect.objectContaining({
            TableName: "Messages",
            Item: expect.objectContaining({id: message.id,
                                           conversationId: message.conversationId,
                                           dateTime: new Date(message.dateTime).valueOf(),
                                           encryptions: message.encryptions})
          })
        })        
      ])
    })
  )
}

function givenJockAndRabConversation()
{
  givenConversation({
    id: JockAndRabChat, 
    messages: [],
    initiatingMemberId: Rab,
    participantIds: new Set([Rab, Jock]),
    state: "Activated"})
}

function givenConversation(conversation: ConversationAttributes|undefined)
{
  dynamoMock.on(GetCommand).resolves({Item: conversation})
}

function givenRecognisedDevices(memberDevicesList: MemberDevicesAttributes[]){
  dynamoMock.on(BatchGetCommand).resolves(
    {Responses:{MemberDevicesProjectionTable: memberDevicesList},
     UnprocessedKeys:{}})
}

async function whenSendMessage(
  message: SendMessageEvent){

    let context: Context

    const event = {
      arguments: message,
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
  
