import { lambdaHandler } from "../member-devices-projection-handler"
import { EventBridgeEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import { mockClient } from "aws-sdk-client-mock"
import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb"
import { conversationCreateGraphQLField } from "../create"
import {MemberDevicesAttributes} from "./helpers/member-devices-attributes"

let event: EventBridgeEvent<any, any>
let context: Context
const dynamoMock = mockClient(DynamoDBDocumentClient)

const mockUUid = jest.fn()

jest.mock("uuid", () => ({ v4: () => mockUUid() }))

beforeEach(() => {
    jest.clearAllMocks()

})

test("event stored", async () => {

  whenMemberDevices(undefined)

  process.env.MemberDevicesProjectionTableName = "MemberDevices"
  
  await whenActivatedMember({
      memberId: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
      name: "bing jacob", 
      email: "bing.jacob@hotmail.com", 
      deviceId: "fdf73659-942f-4a95-8dde-6f5f95b608a8"})
  
  thenStoredMemberDevices({
    memberId: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    deviceIds: ["fdf73659-942f-4a95-8dde-6f5f95b608a8"]
  })
})

function whenMemberDevices(memberDevices: MemberDevicesAttributes|undefined){
  dynamoMock.on(GetCommand).resolves({Item: memberDevices})
}

function thenStoredMemberDevices(memberDevices: MemberDevicesAttributes){
  expect(dynamoMock.commandCalls(PutCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      Item: memberDevices,
      TableName: "MemberDevices"
    })
  )
}
interface ActivatedMemberEvent {
    memberId: string
    name: string
    email: string
    deviceId: string
  }
  
async function whenActivatedMember(activatedMember: ActivatedMemberEvent){
  event = {
    detail: 
    {  
      memberId: activatedMember.memberId,    
      name: activatedMember.name,
      email: activatedMember.email,
      deviceId: activatedMember.deviceId
    }
  } as EventBridgeEvent<any, any>

  const result:APIGatewayProxyResult  = await lambdaHandler(event, context)
}
  
