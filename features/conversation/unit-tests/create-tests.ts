import { lambdaHandler } from "../create"
import { Context  } from "aws-lambda"
import { mockClient } from "aws-sdk-client-mock"
import {DynamoDBDocumentClient, TransactWriteCommand} from "@aws-sdk/lib-dynamodb"
import { ConversationAttributes } from "./helpers/conversation-attributes"

const loggerVerboseMock = jest.fn()
const loggerErrorMock = jest.fn()
jest.mock("../infrastructure/lambda-logger", () => ({ verbose: (message: string) => loggerVerboseMock(message), 
  error: (message: string) => loggerErrorMock(message) }))

const mockUUid = jest.fn()
jest.mock("uuid", () => ({ v4: () => mockUUid() }))


const dynamoMock = mockClient(DynamoDBDocumentClient)

beforeEach(() => {
    jest.clearAllMocks()

})

test("conversation create fails as only one participant", async () => {

  await expect(async () => {
    await whenConversationCreate("1234", [], [], "surrey coding kata")
  }).rejects.toThrow("Conversation must have at least 2 participants")

  expect(loggerErrorMock).toBeCalledWith("conversation create failed for command: {\"initiatingMemberId\":\"1234\",\"invitedMemberIds\":[],\"name\":\"surrey coding kata\",\"adminIds\":[]} with Error: Conversation must have at least 2 participants")
})

test("conversation create fails as admins not subset of participants", async () => {

  await expect(async () => {
    await whenConversationCreate("1234", ["5678", "9012"], ["1234", "6789"], "surrey coding kata")
  }).rejects.toThrow("Admin Ids: [6789] not in the conversation")

  expect(loggerErrorMock).toBeCalledWith("conversation create failed for command: {\"initiatingMemberId\":\"1234\",\"invitedMemberIds\":[\"5678\",\"9012\"],\"name\":\"surrey coding kata\",\"adminIds\":[\"1234\",\"6789\"]} with Error: Admin Ids: [6789] not in the conversation")
})

test("conversation create fails if initiator is empty", async () => {

  await expect(async () => {
    await whenConversationCreate("", ["5678", "9012"], ["1234", "6789"], "surrey coding kata")
  }).rejects.toThrow("Initiator is not defined")

  expect(loggerErrorMock).toBeCalledWith("conversation create failed for command: {\"initiatingMemberId\":\"\",\"invitedMemberIds\":[\"5678\",\"9012\"],\"name\":\"surrey coding kata\",\"adminIds\":[\"1234\",\"6789\"]} with Error: Initiator is not defined")
})

test("conversation create stored", async () => {

  process.env.ConversationsTableName = "ConversationsTable1"
  mockUUid.mockReturnValue("09040739-830c-49d3-b8a5-1e6c9270fdb2")

  await whenConversationCreate("1234", ["5678", "9012"], [], "surrey coding kata")

  thenConversationCreatedAs({
    adminIds: new Set(),
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    initiatingMemberId: "1234",
    name: "surrey coding kata",
    messages: [],
    participantIds: new Set(["5678", "9012", "1234"]),
    state: "Created"
  })

})

function thenConversationCreatedAs(conversation: ConversationAttributes) {
  expect(dynamoMock.commandCalls(TransactWriteCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      TransactItems: expect.arrayContaining([
        expect.objectContaining({
          Put: expect.objectContaining({
            Item: conversation,
            TableName: "ConversationsTable1"
          })
        })
      ])
    })
  )
}

async function whenConversationCreate(
  initiatingMemberId: string, 
  invitedMemberIds: string[],
  adminIds: string[] = [],
  name: string | null = null){
    let context: Context
    const event = {
      arguments: {  
        initiatingMemberId: initiatingMemberId,    
        invitedMemberIds: invitedMemberIds,
        adminIds: adminIds,
        name: name
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
  
