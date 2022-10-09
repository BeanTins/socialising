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

let lastCommand: SendMessageEvent
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
    await whenSendMessage({conversationId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderDeviceId: "e85b20be-fe46-4d1c-bcae-2a5fac8dbc99",
    senderMemberId: "a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba",
    messageEncryptions: [
      {recipientDeviceId: "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c", 
       recipientMemberId: "464fddb3-0e8a-4503-9f72-14d02e100da7",
       message: "hello"}]})

  }).rejects.toThrow("Send Message Error: UnknownConversation")

  expectLoggerErrorEnding("Unknown conversation 09040739-830c-49d3-b8a5-1e6c9270fdb2 received")
})

test("unactivated conversation throws error", async () => {

  givenConversation({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
    initiatingMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    participantIds: new Set(["49070739-630c-2223-c8a5-2e6c9270fdb2", "79070739-630c-4423-c8a5-2e6c9270fdb2"]),
    adminIds: new Set([]),
    state: "Created"})

  await expect(async () => {
    await whenSendMessage({conversationId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderDeviceId: "e85b20be-fe46-4d1c-bcae-2a5fac8dbc99",
    senderMemberId: "a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba",
    messageEncryptions: [
      {recipientDeviceId: "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c", 
       recipientMemberId: "464fddb3-0e8a-4503-9f72-14d02e100da7",
       message: "hello"}]})

  }).rejects.toThrow("Send Message Error: UnactivatedConversation")

  expectLoggerErrorEnding("Cannot send message with unactivated conversation 09040739-830c-49d3-b8a5-1e6c9270fdb2")
})

test("sender member not in conversation", async () => {

  givenConversation({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
    initiatingMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    participantIds: new Set(["49070739-630c-2223-c8a5-2e6c9270fdb2", "79070739-630c-4423-c8a5-2e6c9270fdb2"]),
    adminIds: new Set([]),
    state: "Activated"})

  await expect(async () => {
    await whenSendMessage({conversationId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderDeviceId: "e85b20be-fe46-4d1c-bcae-2a5fac8dbc99",
    senderMemberId: "a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba",
    messageEncryptions: [
      {recipientDeviceId: "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c", 
       recipientMemberId: "464fddb3-0e8a-4503-9f72-14d02e100da7",
       message: "hello"}]})

  }).rejects.toThrow("Send Message Error: SenderMemberNotInConversation")

  expectLoggerErrorEnding("Sender member a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba not in conversation 09040739-830c-49d3-b8a5-1e6c9270fdb2")
})

test("sender device not in conversation", async () => {

  givenConversation({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
    initiatingMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    participantIds: new Set(["49070739-630c-2223-c8a5-2e6c9270fdb2", "464fddb3-0e8a-4503-9f72-14d02e100da7"]),
    adminIds: new Set([]),
    state: "Activated"})

  givenMemberDevices([
    {memberId: "49070739-630c-2223-c8a5-2e6c9270fdb2", deviceIds: ["1aeebbd5-6428-4923-868e-ae0d51ed1cda"]},
    {memberId: "464fddb3-0e8a-4503-9f72-14d02e100da7", deviceIds: ["cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c"]}
  ])

  await expect(async () => {
    await whenSendMessage({conversationId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderDeviceId: "e85b20be-fe46-4d1c-bcae-2a5fac8dbc99",
    senderMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    messageEncryptions: [
      {recipientDeviceId: "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c", 
       recipientMemberId: "464fddb3-0e8a-4503-9f72-14d02e100da7",
       message: "hello"}]})

  }).rejects.toThrow("Send Message Error: SenderDeviceNotInConversation")

  expectLoggerErrorEnding("Sender device e85b20be-fe46-4d1c-bcae-2a5fac8dbc99 not in conversation 09040739-830c-49d3-b8a5-1e6c9270fdb2")
  
})

test("receiver member missing in conversation", async () => {

  givenConversation({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
    initiatingMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    participantIds: new Set(["49070739-630c-2223-c8a5-2e6c9270fdb2", "464fddb3-0e8a-4503-9f72-14d02e100da7", "c770a479-0154-4b29-9409-508363cfe13d"]),
    adminIds: new Set([]),
    state: "Activated"})

  givenMemberDevices([
    {memberId: "49070739-630c-2223-c8a5-2e6c9270fdb2", deviceIds: ["e85b20be-fe46-4d1c-bcae-2a5fac8dbc99"]},
    {memberId: "464fddb3-0e8a-4503-9f72-14d02e100da7", deviceIds: ["cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c"]}
  ])

  await expect(async () => {
    await whenSendMessage({conversationId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderDeviceId: "e85b20be-fe46-4d1c-bcae-2a5fac8dbc99",
    senderMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    messageEncryptions: [
      {recipientDeviceId: "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c", 
       recipientMemberId: "464fddb3-0e8a-4503-9f72-14d02e100da7",
       message: "hello4"}]})
  }).rejects.toThrow("Send Message Error: ReceivingMemberMessageSetMismatch")

  expectLoggerErrorEnding('Receiving message member set mismatch in conversation 09040739-830c-49d3-b8a5-1e6c9270fdb2, missing members: ["c770a479-0154-4b29-9409-508363cfe13d"], unrecognised members: []')  
})

test("receiver member unrecognised in conversation", async () => {

  givenConversation({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
    initiatingMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    participantIds: new Set(["49070739-630c-2223-c8a5-2e6c9270fdb2", "464fddb3-0e8a-4503-9f72-14d02e100da7"]),
    adminIds: new Set([]),
    state: "Activated"})

  givenMemberDevices([
    {memberId: "49070739-630c-2223-c8a5-2e6c9270fdb2", deviceIds: ["e85b20be-fe46-4d1c-bcae-2a5fac8dbc99"]},
    {memberId: "464fddb3-0e8a-4503-9f72-14d02e100da7", deviceIds: ["cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c"]}
  ])

  await expect(async () => {
    await whenSendMessage({conversationId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderDeviceId: "e85b20be-fe46-4d1c-bcae-2a5fac8dbc99",
    senderMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    messageEncryptions: [
      {recipientDeviceId: "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c", 
       recipientMemberId: "464fddb3-0e8a-4503-9f72-14d02e100da7",
       message: "hello4"},
      {recipientDeviceId: "b6aa6160-7115-43aa-834a-3b2ee5029718", 
       recipientMemberId: "c770a479-0154-4b29-9409-508363cfe13d",
      message: "helloc"}]}       )
  }).rejects.toThrow("Send Message Error: ReceivingMemberMessageSetMismatch")

  expectLoggerErrorEnding('Receiving message member set mismatch in conversation 09040739-830c-49d3-b8a5-1e6c9270fdb2, missing members: [], unrecognised members: ["c770a479-0154-4b29-9409-508363cfe13d"]')  
})

test("receiver device unrecognised in conversation", async () => {

  givenConversation({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
    initiatingMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    participantIds: new Set(["49070739-630c-2223-c8a5-2e6c9270fdb2", "464fddb3-0e8a-4503-9f72-14d02e100da7"]),
    adminIds: new Set([]),
    state: "Activated"})

  givenMemberDevices([
    {memberId: "49070739-630c-2223-c8a5-2e6c9270fdb2", deviceIds: ["e85b20be-fe46-4d1c-bcae-2a5fac8dbc99"]},
    {memberId: "464fddb3-0e8a-4503-9f72-14d02e100da7", deviceIds: ["cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c"]}
  ])

  await expect(async () => {
    await whenSendMessage({conversationId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderDeviceId: "e85b20be-fe46-4d1c-bcae-2a5fac8dbc99",
    senderMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    messageEncryptions: [
      {recipientDeviceId: "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c", 
       recipientMemberId: "464fddb3-0e8a-4503-9f72-14d02e100da7",
       message: "hello4"},
      {recipientDeviceId: "b6aa6160-7115-43aa-834a-3b2ee5029718", 
       recipientMemberId: "464fddb3-0e8a-4503-9f72-14d02e100da7",
      message: "hello4"}]}       )
  }).rejects.toThrow("Send Message Error: ReceivingDeviceMessageSetMismatch")

  expectLoggerErrorEnding('Receiving message device set mismatch in conversation 09040739-830c-49d3-b8a5-1e6c9270fdb2, missing devices: [], unrecognised devices: ["b6aa6160-7115-43aa-834a-3b2ee5029718"]')  
})

test("receiver device missing in conversation", async () => {

  givenConversation({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
    initiatingMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    participantIds: new Set(["49070739-630c-2223-c8a5-2e6c9270fdb2", "464fddb3-0e8a-4503-9f72-14d02e100da7"]),
    adminIds: new Set([]),
    state: "Activated"})

  givenMemberDevices([
    {memberId: "49070739-630c-2223-c8a5-2e6c9270fdb2", deviceIds: ["e85b20be-fe46-4d1c-bcae-2a5fac8dbc99"]},
    {memberId: "464fddb3-0e8a-4503-9f72-14d02e100da7", deviceIds: ["cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c", "b6aa6160-7115-43aa-834a-3b2ee5029718"]}
  ])

  await expect(async () => {
    await whenSendMessage({conversationId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderDeviceId: "e85b20be-fe46-4d1c-bcae-2a5fac8dbc99",
    senderMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    messageEncryptions: [
      {recipientDeviceId: "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c", 
       recipientMemberId: "464fddb3-0e8a-4503-9f72-14d02e100da7",
       message: "hello4"}]}       )
  }).rejects.toThrow("Send Message Error: ReceivingDeviceMessageSetMismatch")

  expectLoggerErrorEnding('Receiving message device set mismatch in conversation 09040739-830c-49d3-b8a5-1e6c9270fdb2, missing devices: ["b6aa6160-7115-43aa-834a-3b2ee5029718"], unrecognised devices: []')  
})
test("successful message returns id", async () => {

  mockUUid.mockReturnValue("57b22b8c-3656-4dcb-8188-17472042279e")

  givenConversation({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
    initiatingMemberId: "a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba",
    participantIds: new Set(["a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba", "464fddb3-0e8a-4503-9f72-14d02e100da7"]),
    adminIds: new Set([]),
    state: "Activated"})

  givenMemberDevices([
    {memberId: "a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba", deviceIds: ["e85b20be-fe46-4d1c-bcae-2a5fac8dbc99"]},
    {memberId: "464fddb3-0e8a-4503-9f72-14d02e100da7", deviceIds: ["cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c"]}
  ])
    
  const messageId = await whenSendMessage({conversationId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderDeviceId: "e85b20be-fe46-4d1c-bcae-2a5fac8dbc99",
    senderMemberId: "a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba",
    messageEncryptions: [
      {recipientDeviceId: "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c", 
      recipientMemberId: "464fddb3-0e8a-4503-9f72-14d02e100da7",
       message: "hello"}]})

  expect(messageId).toBe("57b22b8c-3656-4dcb-8188-17472042279e")
})

test("send message stored", async () => {

  mockUUid.mockReturnValue("57b22b8c-3656-4dcb-8188-17472042279e")
  jest.spyOn(Date, 'now').mockReturnValueOnce(new Date('2019-05-14T11:01:58.135Z').valueOf())
  givenConversation({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
    messages: [],
    initiatingMemberId: "a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba",
    participantIds: new Set(["a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba", "464fddb3-0e8a-4503-9f72-14d02e100da7"]),
    adminIds: new Set([]),
    state: "Activated"})

  givenMemberDevices([
    {memberId: "a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba", deviceIds: ["e85b20be-fe46-4d1c-bcae-2a5fac8dbc99"]},
    {memberId: "464fddb3-0e8a-4503-9f72-14d02e100da7", deviceIds: ["cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c"]}
  ])
    
  const messageId = await whenSendMessage({conversationId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderDeviceId: "e85b20be-fe46-4d1c-bcae-2a5fac8dbc99",
    senderMemberId: "a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba",
    messageEncryptions: [
      {recipientDeviceId: "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c", 
       recipientMemberId: "464fddb3-0e8a-4503-9f72-14d02e100da7",
       message: "hello"}]})

  thenMessageCreated({
    id: "57b22b8c-3656-4dcb-8188-17472042279e",
    date: '2019-05-14T11:01:58.135Z',
    encryptions: [
      {recipientDeviceId: "cd7346c4-fa3d-4c30-9a4e-c52c6fc5e29c",
       recipientMemberId: "464fddb3-0e8a-4503-9f72-14d02e100da7", 
       message: "hello"}
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
                                           date: new Date(message.date).valueOf(),
                                           encryptions: message.encryptions})
          })
        })        
      ])
    })
  )
}
  
function givenConversation(conversation: ConversationAttributes|undefined)
{
  dynamoMock.on(GetCommand).resolves({Item: conversation})
}

function givenMemberDevices(memberDevicesList: MemberDevicesAttributes[]){
  dynamoMock.on(BatchGetCommand).resolves(
    {Responses:{MemberDevicesProjectionTable: memberDevicesList},
     UnprocessedKeys:{}})
}

async function whenSendMessage(
  message: SendMessageEvent){

    let context: Context

    lastCommand = message
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
  
