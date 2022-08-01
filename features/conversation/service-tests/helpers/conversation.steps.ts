
import { StepDefinitions } from "jest-cucumber"
import { TestEnvVarSetup } from "./test-env-var-setup"
import { MemberCredentialsAccessor} from "./member-credentials-accessor"
import { ConversationClient, Response, Result} from "./conversation-client"
import logger from "./service-test-logger"
import { FakeMemberDevice } from "./fake-member-device"
import { ConversationsAccessor } from "./conversations-accessor"
import { EventListenerClient } from "./event-listener-client"
import { ValidateConnectionsRequestListenerClient } from "./validate-connections-request-listener-client"
import { ValidateConnectionsResponseFakeClient } from "./validate-connections-response-fake-client"
import { ConversationActivated } from "../../domain/events"

const AWS_REGION = "us-east-1"

let client: ConversationClient
let testEnvVarSetup: TestEnvVarSetup
let memberCredentials: MemberCredentialsAccessor
let expectedFailureResponse: string
let eventListener: EventListenerClient
let firstParticipant: FakeMemberDevice
let secondParticipant: FakeMemberDevice
let response: Response
let invitedMemberIds: string[]
let conversations: ConversationsAccessor
let validateConnectionsRequestListener: ValidateConnectionsRequestListenerClient
let validateConnectionsResponse: ValidateConnectionsResponseFakeClient
let validateResponse: boolean
let conversationId: string

beforeAll(async()=> {

  try
  {
    testEnvVarSetup = new TestEnvVarSetup("Socialising")
    memberCredentials = new MemberCredentialsAccessor(AWS_REGION, {
      userPoolId: testEnvVarSetup.resolveVariable("UserPoolId"),
      userPoolMemberClientId: testEnvVarSetup.resolveVariable("UserPoolMemberClientId")
    })

    conversations = new ConversationsAccessor(AWS_REGION, {
      tableName: testEnvVarSetup.resolveVariable("ConversationsTableName")
    })

    client = new ConversationClient(testEnvVarSetup.resolveVariable("ConversationStackapiURL"))

    eventListener = new EventListenerClient(AWS_REGION, {
      queueName: testEnvVarSetup.resolveVariable("EventListenerQueueName")
    })

    validateConnectionsRequestListener = new ValidateConnectionsRequestListenerClient(AWS_REGION, {
      queueName: testEnvVarSetup.resolveVariable("ValidateConnectionsRequestQueueName")
    })

    validateConnectionsResponse = new ValidateConnectionsResponseFakeClient(AWS_REGION, {
      queueName: testEnvVarSetup.resolveVariable("ValidateConnectionsResponseQueueName")
    })
  } 
  catch(error)
  {
    logger.error("beforeAll failed with - " + error.message)
  }
})

function getTestTimeout(scenarioDescription: string)
{
  const TenSeconds = 10000
  let timeout: number | undefined = TenSeconds
  var match = scenarioDescription.match(/\(timeout: (?<timeout>[0-9]+) seconds\)/)

  if (match != undefined)
  {
    timeout = parseInt(match?.groups!.timeout) * 1000
  } 
 
  return timeout
}

beforeEach(async () => {

  const currentTestName = expect.getState().currentTestName

  console.log("Running test: " + currentTestName)
  logger.verbose("*** Running test - " + currentTestName + " ***")
  
  firstParticipant = new FakeMemberDevice(memberCredentials)
  secondParticipant = new FakeMemberDevice(memberCredentials)
  invitedMemberIds = []
  validateResponse = false
  conversationId = ""
   await Promise.all([
    memberCredentials.clear(),
    conversations.clear(),
    eventListener.clear(),
    validateConnectionsRequestListener.clear(),
    validateConnectionsResponse.clear()
   ])
   jest.setTimeout(getTestTimeout(currentTestName))

})

afterAll(async() => {
  await client.closeAnySubscriptions()
})


export const conversationSteps: StepDefinitions = ({ given, and, when, then }) => {

  given(/(\w+) wants a conversation on their own/, async (firstParticipantName) => {
    expectedFailureResponse = "Conversation must have at least 2 participants"
    firstParticipant.withName(firstParticipantName)

    await firstParticipant.authenticatedWithPassword("passw0rd")
  })

  given(/a pending conversation instigated by (.+) with their connection (.+)/, async (firstParticipantName, secondParticipantName) => {
    
    conversationId = "f28f14fd-177c-4bc3-a599-4f194e032667"

    firstParticipant.withName(firstParticipantName)
    secondParticipant.withName(secondParticipantName)

    await conversations.add({id: conversationId,
      initiatingMemberId: firstParticipant.memberId,
      name: "",
      participantIds: new Set([firstParticipant.memberId, secondParticipant.memberId]),
      adminIds: new Set()})

    validateResponse = true
  })

  given(/(\w+) wants a conversation with (\w+)/, async (firstParticipantName, secondParticipantName) => {

    jest.setTimeout(20000)
    firstParticipant.withName(firstParticipantName)
    secondParticipant.withName(secondParticipantName)

    invitedMemberIds = [secondParticipant.memberId]
    await firstParticipant.authenticatedWithPassword("passw0rd")
  })

  when(/a request is made to create the conversation/, async () => {

    const idToken = await memberCredentials.requestIdToken(firstParticipant.email, "passw0rd")

    response = await client.create(
      {initiatingMemberId: firstParticipant.memberId, 
       invitedMemberIds: invitedMemberIds, 
       name: "", 
       adminIds: [],
       idToken: idToken})
  })

  when(/a validation connection response is received/, async () => {

    await validateConnectionsResponse.notifySuccess(conversationId)
  })
  
  then(/the request is rejected/, () => {
    expect(response.result).toBe(Result.Failed)
    expect(expectedFailureResponse).toBe(response.message)
  })

  then(/the conversation is created/, async () => {
    expect(response.result).toBe(Result.Succeeded)

    conversationId = response.message

    await conversations.waitForAddition(conversationId)

    await expectValidateConnectionsRequest(conversationId)

    await expectPublishedEvent(conversationId)
  })

  then(/the conversation is activated/, async () => {

    await conversations.waitForActivation(conversationId)

    await expectPublishedEvent(conversationId)
  })

}

async function expectValidateConnectionsRequest(conversationId: string) {
  const request = JSON.parse(await validateConnectionsRequestListener.waitForRequest())
  expect(request.correlationId).toBe(conversationId)
  expect(request.initiatingMemberId).toBe(firstParticipant.memberId)
  expect(request.requestedConnectionMemberIds).toEqual([secondParticipant.memberId])
}

async function expectPublishedEvent(conversationId: string) {
  const event = await eventListener.waitForEventType("ConversationActivated")

  const eventData: ConversationActivated = <ConversationActivated>event!.data

  expect(eventData.conversationId).toBe(conversationId)
}

function generateEmailFromName(enteredName: string): string {
  return enteredName.replace(/ /g, ".") + "@gmail.com"
}



