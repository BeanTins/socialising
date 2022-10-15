import { lambdaHandler } from "../member-devices-projection-handler"
import { EventBridgeEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import { mockClient } from "aws-sdk-client-mock"
import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb"
import {MemberDevicesAttributes} from "./helpers/member-devices-attributes"

let event: EventBridgeEvent<any, any>
let context: Context
const dynamoMock = mockClient(DynamoDBDocumentClient)

const mockUUid = jest.fn()
jest.mock("uuid", () => ({ v4: () => mockUUid() }))

const Jock = "464fddb3-0e8a-4503-9f72-14d02e100da7"
const JocksWindowsLaptop = "df25d2f4-85e1-4bc0-a7e3-bc42fca247e7"

beforeEach(() => {
    jest.clearAllMocks()

})

test("event stored", async () => {

  whenMemberDevices(undefined)

  process.env.MemberDevicesProjectionTableName = "MemberDevices"
  
  await whenActivatedMember({
      memberId: Jock, 
      name: "Jock Crow", 
      email: "jock.crow@hotmail.com", 
      deviceId: JocksWindowsLaptop})
  
  thenStoredMemberDevices({
    memberId: Jock,
    deviceIds: [JocksWindowsLaptop]
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
  
