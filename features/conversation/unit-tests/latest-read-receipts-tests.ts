import { lambdaHandler } from "../latest-read-receipts"
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
    await whenLatestReadReceipts(JockAndRabChat)
  }).rejects.toThrow("Latest Read Receipts Error: UnknownConversation")

  expect(loggerErrorMock).toBeCalledWith("conversation latest read receipts query failed: " + 
  JSON.stringify({conversationId: JockAndRabChat}) + 
  " with Error: Unknown conversation " + JockAndRabChat)
})

test("latest read receipts", async () => {

  givenConversation({
    id: JockAndRabChat, 
    initiatingMemberId: Rab,
    participantIds: new Set([Rab, Jock]),
    state: "Activated",
    latestReadReceipts: {[Rab]: HappyBirthdayPalMessageId, [Jock]: HappyBirthdayPalMessageId}})

  const latestReadReceipts = await whenLatestReadReceipts(JockAndRabChat)

  expect(latestReadReceipts).toEqual([
    {memberId: Rab, latestReadMessageId: HappyBirthdayPalMessageId},
    {memberId: Jock, latestReadMessageId: HappyBirthdayPalMessageId}])
})

function givenConversation(conversation: ConversationAttributes|undefined)
{
  dynamoMock.on(GetCommand).resolves({Item: conversation})
}

async function whenLatestReadReceipts(
  conversationId: string){
    let context: Context
    const event = {
      arguments: {  
        conversationId: conversationId
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
  
