import { lambdaHandler } from "../read-receipt"
import { Context  } from "aws-lambda"
import { mockClient } from "aws-sdk-client-mock"
import {DynamoDBDocumentClient, GetCommand, TransactWriteCommand} from "@aws-sdk/lib-dynamodb"
import { ConversationAttributes } from "./helpers/conversation-attributes"

const loggerVerboseMock = jest.fn()
const loggerErrorMock = jest.fn()
jest.mock("../infrastructure/lambda-logger", () => ({ verbose: (message: string) => loggerVerboseMock(message), 
  error: (message: string) => loggerErrorMock(message) }))

const mockUUid = jest.fn()
jest.mock("uuid", () => ({ v4: () => mockUUid() }))

const dynamoMock = mockClient(DynamoDBDocumentClient)

const JockAndRabChat = "09040739-830c-49d3-b8a5-1e6c9270fdb2"
const Jock = "464fddb3-0e8a-4503-9f72-14d02e100da7"
const Rab = "49070739-630c-2223-c8a5-2e6c9270fdb2"
const ItsYourBirthdayTomorrowMessageId = "f8621a76-de79-45d5-acca-e4dcd3195419"
const HappyBirthdayPalMessageId = "4636be89-f952-4af4-abeb-557cd8d877e7"

beforeEach(() => {
  jest.clearAllMocks()
  dynamoMock.reset()
  process.env.ConversationsTableName = "ConversationsTable1"
})

test("conversation create fails as only one participant", async () => {

  givenConversation(undefined)

  await expect(async () => {
    await whenReadReceipt(JockAndRabChat, Jock, HappyBirthdayPalMessageId)
  }).rejects.toThrow("Read Receipt Error: UnknownConversation")

  expect(loggerErrorMock).toBeCalledWith("conversation read receipt failed for command: " + 
  JSON.stringify({memberId: Jock, conversationId: JockAndRabChat, latestReadMessageId: HappyBirthdayPalMessageId}) + 
  " with Error: Unknown conversation " + JockAndRabChat)
})

test("unactivated conversation throws error", async () => {

  givenConversation({
    id: JockAndRabChat, 
    initiatingMemberId: Rab,
    participantIds: new Set([Rab, Jock]),
    state: "Created"})

  await expect(async () => {
    await whenReadReceipt(JockAndRabChat, Jock, HappyBirthdayPalMessageId)
  }).rejects.toThrow("Read Receipt Error: UnactivatedConversation")

  expect(loggerErrorMock).toBeCalledWith("conversation read receipt failed for command: " + 
  JSON.stringify({memberId: Jock, conversationId: JockAndRabChat, latestReadMessageId: HappyBirthdayPalMessageId}) + 
  " with Error: Cannot send message with unactivated conversation " + JockAndRabChat)
})

test("read receipt updated when no current message", async () => {

  givenConversation({
    id: JockAndRabChat, 
    initiatingMemberId: Rab,
    participantIds: new Set([Rab, Jock]),
    state: "Activated",
    latestReadReceipts: {}})

  await whenReadReceipt(JockAndRabChat, Jock, HappyBirthdayPalMessageId)

  thenReadReceiptUpdatedAs({[Jock]: HappyBirthdayPalMessageId})
})

test("read receipt not updated when latest message not found", async () => {

  givenConversation({
    id: JockAndRabChat, 
    initiatingMemberId: Rab,
    participantIds: new Set([Rab, Jock]),
    state: "Activated",
    latestReadReceipts: {[Jock]: ItsYourBirthdayTomorrowMessageId}})

  await whenReadReceipt(JockAndRabChat, Jock, HappyBirthdayPalMessageId)

  thenReadReceiptNotUpdated()
})

test("read receipt not updated when latest message is before current", async () => {

  givenConversation({
    id: JockAndRabChat, 
    initiatingMemberId: Rab,
    participantIds: new Set([Rab, Jock]),
    state: "Activated",
    latestReadReceipts: {[Jock]: HappyBirthdayPalMessageId},
    messages: [ItsYourBirthdayTomorrowMessageId, HappyBirthdayPalMessageId]})

  await whenReadReceipt(JockAndRabChat, Jock, ItsYourBirthdayTomorrowMessageId)

  thenReadReceiptNotUpdated()
})

test("read receipt updated when latest message is after current", async () => {

  givenConversation({
    id: JockAndRabChat, 
    initiatingMemberId: Rab,
    participantIds: new Set([Rab, Jock]),
    state: "Activated",
    latestReadReceipts: {[Jock]: ItsYourBirthdayTomorrowMessageId},
    messages: [ItsYourBirthdayTomorrowMessageId, HappyBirthdayPalMessageId]})

  await whenReadReceipt(JockAndRabChat, Jock, HappyBirthdayPalMessageId)

  thenReadReceiptUpdatedAs({[Jock]: HappyBirthdayPalMessageId})
})

function givenConversation(conversation: ConversationAttributes|undefined)
{
  dynamoMock.on(GetCommand).resolves({Item: conversation})
}

function thenReadReceiptUpdatedAs(latestReadReceipts: any)
{
  expect(dynamoMock.commandCalls(TransactWriteCommand).length).toBe(1)
  expect(dynamoMock.commandCalls(TransactWriteCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      TransactItems:expect.arrayContaining([
        expect.objectContaining({
          Put: expect.objectContaining({
            Item: expect.objectContaining({latestReadReceipts: latestReadReceipts}),
            TableName: "ConversationsTable1"
          })
        })
      ])
    })
  )
}

function thenReadReceiptNotUpdated()
{
  expect(dynamoMock.commandCalls(TransactWriteCommand).length).toBe(0)
}

async function whenReadReceipt(
  conversationId: string, 
  memberId: string,
  latestReadMessageId: string){
    let context: Context
    const event = {
      arguments: {  
        conversationId: conversationId,    
        memberId: memberId,    
        latestReadMessageId: latestReadMessageId
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
  
