
import { StepDefinitions } from "jest-cucumber"
import { TestEnvVarSetup } from "./test-env-var-setup"
import { MemberCredentialsAccessor} from "./member-credentials-accessor"
import { ConversationClient, Response, Result} from "./conversation-client"
import logger from "./service-test-logger"
import { FakeMember } from "./fake-member"
import { ConversationsAccessor } from "./conversations-accessor"
import { EventListenerClient } from "./event-listener-client"
import { ValidateConnectionsRequestListenerClient } from "./validate-connections-request-listener-client"
import { ValidateConnectionsResponseFakeClient } from "./validate-connections-response-fake-client"
import { ConversationActivated,ConversationCreated, ConversationMessageSent } from "../../domain/events"
import { MemberDevicesProjectionAccessor } from "./member-devices-projection-accessor"
import { MemberMessagesProjectionAccessor } from "./member-messages-projection-accessor"
import { v4 as uuidv4 } from "uuid"
import { MessagesAccessor } from "./messages-accessor"

const AWS_REGION = "us-east-1"

let client: ConversationClient
let testEnvVarSetup: TestEnvVarSetup
let memberCredentials: MemberCredentialsAccessor
let expectedFailureResponse: string
let eventListener: EventListenerClient
let firstParticipant: FakeMember
let secondParticipant: FakeMember
let response: Response
let invitedMemberIds: string[]
let conversations: ConversationsAccessor
let validateConnectionsRequestListener: ValidateConnectionsRequestListenerClient
let validateConnectionsResponse: ValidateConnectionsResponseFakeClient
let validateResponse: boolean
let conversationId: string
let deviceName: string
let memberDevicesProjection: MemberDevicesProjectionAccessor 
let memberMessagesProjection: MemberMessagesProjectionAccessor 
let membershipEventBusFakeArn: string
let messages: MessagesAccessor

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

    messages = new MessagesAccessor(AWS_REGION, {
      tableName: testEnvVarSetup.resolveVariable("MessagesTableName")
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

    memberDevicesProjection = new MemberDevicesProjectionAccessor(AWS_REGION, {
      tableName: testEnvVarSetup.resolveVariable("MemberDevicesProjectionName")
    })

    memberMessagesProjection = new MemberMessagesProjectionAccessor(AWS_REGION, {
      tableName: testEnvVarSetup.resolveVariable("MemberMessagesProjectionName")
    })

    membershipEventBusFakeArn = testEnvVarSetup.resolveVariable("MembershipEventBusFakeArn")

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
  
  firstParticipant = new FakeMember(memberCredentials, membershipEventBusFakeArn, AWS_REGION)
  secondParticipant = new FakeMember(memberCredentials, membershipEventBusFakeArn, AWS_REGION)
  invitedMemberIds = []
  validateResponse = false
  conversationId = ""
   await Promise.all([
    memberCredentials.clear(),
    conversations.clear(),
    eventListener.clear(),
    validateConnectionsRequestListener.clear(),
    validateConnectionsResponse.clear(),
    memberDevicesProjection.clear(),
    memberMessagesProjection.clear(),
    messages.clear()
   ])
   jest.setTimeout(getTestTimeout(currentTestName))

})

afterAll(async() => {
  await client.closeAnySubscriptions()
})


export const conversationSteps: StepDefinitions = ({ given, and, when, then }) => {

  given(/a new member (\w+) using a (\w+)/, async (firstParticipantName, theDeviceName) => {
    firstParticipant.withName(firstParticipantName)
    deviceName = theDeviceName
    firstParticipant.withDevice(theDeviceName)
  })

  given(/(\w+) wants a conversation on their own/, async (firstParticipantName) => {
    expectedFailureResponse = "Conversation must have at least 2 participants"
    firstParticipant.withName(firstParticipantName)

    await firstParticipant.authenticatedWithPassword("passw0rd")
  })

  given(/a pending conversation instigated by (.+) with their connection (.+)/, async (firstParticipantName, secondParticipantName) => {
    
    conversationId = uuidv4()

    firstParticipant.withName(firstParticipantName)
    secondParticipant.withName(secondParticipantName)

    await conversations.add({id: conversationId,
      initiatingMemberId: firstParticipant.memberId,
      name: "",
      state: "Created",
      messages: [],
      participantIds: new Set([firstParticipant.memberId, secondParticipant.memberId]),
      adminIds: new Set()})

    const event = await eventListener.waitForEventType("ConversationCreated")
    
    validateResponse = true
  })

  given(/(\w+) wants a conversation with (\w+)/, async (firstParticipantName, secondParticipantName) => {

    jest.setTimeout(20000)
    firstParticipant.withName(firstParticipantName)
    secondParticipant.withName(secondParticipantName)

    invitedMemberIds = [secondParticipant.memberId]
    await firstParticipant.authenticatedWithPassword("passw0rd")
  })

  given(/an existing conversation between (\w+)'s (\w+) and (\w+)'s (\w+)/, 
      async (firstParticipantName: string, 
             firstParticipantDevice: string,
             secondParticipantName: string,
             secondParticipantDevice: string) => {

    firstParticipant.withName(firstParticipantName)
    firstParticipant.withDevice(firstParticipantDevice)
    secondParticipant.withName(secondParticipantName)
    secondParticipant.withDevice(secondParticipantDevice)
    await firstParticipant.activated()
    await secondParticipant.activated()
    conversationId = uuidv4() 

    invitedMemberIds = [secondParticipant.memberId]
    
    Promise.all([
      await memberDevicesProjection.waitForDeviceToBeStored(firstParticipant.memberId, firstParticipant.idForDevice(firstParticipantDevice)!),
      await memberDevicesProjection.waitForDeviceToBeStored(secondParticipant.memberId, secondParticipant.idForDevice(secondParticipantDevice)!),   
      await conversations.add({
        id: conversationId,
        initiatingMemberId: firstParticipant.memberId,
        name: "",
        state: "Activated",
        messages: [],
        participantIds: new Set([firstParticipant.memberId, secondParticipant.memberId]),
        adminIds: new Set([])
      }),
      await firstParticipant.authenticatedWithPassword("passw0rd")
    ])
    
  })

  given(/an unactivated conversation between (\w+)'s (\w+) and (\w+)'s (\w+)/, 
      async (firstParticipantName: string, 
             firstParticipantDevice: string,
             secondParticipantName: string,
             secondParticipantDevice: string) => {

    firstParticipant.withName(firstParticipantName)
    firstParticipant.withDevice(firstParticipantDevice)
    secondParticipant.withName(secondParticipantName)
    secondParticipant.withDevice(secondParticipantDevice)
    await firstParticipant.activated()
    await secondParticipant.activated()
    conversationId = uuidv4() 

    invitedMemberIds = [secondParticipant.memberId]
    
    Promise.all([
      await memberDevicesProjection.waitForDeviceToBeStored(firstParticipant.memberId, firstParticipant.idForDevice(firstParticipantDevice)!),
      await memberDevicesProjection.waitForDeviceToBeStored(secondParticipant.memberId, secondParticipant.idForDevice(secondParticipantDevice)!),   
      await conversations.add({
        id: conversationId,
        initiatingMemberId: firstParticipant.memberId,
        name: "",
        state: "Created",
        messages: [],
        participantIds: new Set([firstParticipant.memberId, secondParticipant.memberId]),
        adminIds: new Set([])
      }),
      await firstParticipant.authenticatedWithPassword("passw0rd")
    ])
    
    expectedFailureResponse = "Send Message Error: UnactivatedConversation"
  })

  when(/(\w+)'s (\w+) sends the message "(.+)" to (\w+)'s (\w+)/, 
  async (sender: string, senderDevice: string, message: string, receiver: string, receiverDevice: string) => {

    const idToken = await memberCredentials.requestIdToken(firstParticipant.email, "passw0rd")

    response = await client.sendMessage(
      {senderMemberId: firstParticipant.memberId, 
       senderDeviceId: firstParticipant.idForDevice(senderDevice)!, 
       recipientMemberId: secondParticipant.memberId,
       recipientDeviceId: secondParticipant.idForDevice(receiverDevice)!,
       conversationId: conversationId, 
       message,
       idToken: idToken})
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

  when(/they are activated/, async () => {

    await firstParticipant.activated()
    
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

    await expectPublishedCreatedEvent(conversationId)
  })

  then(/the conversation is activated/, async () => {

    await conversations.waitForActivation(conversationId)

    await expectPublishedActivatedEvent(conversationId)
  })

  then(/in future they are recognised/, async() => {

    expect(await memberDevicesProjection.waitForDeviceToBeStored(firstParticipant.memberId, firstParticipant.idForDevice(deviceName)!)).toBe(true)
  })

  then(/the message is rejected/, async () => {
    expect(response.result).toBe(Result.Failed)
    expect(response.message).toBe(expectedFailureResponse)
  })

  then(/the message is accepted/, async () => {
    expect(response.result).toBe(Result.Succeeded)
    const messageId = await conversations.waitForMessage(conversationId)
    expect(messageId).toBeDefined()

    expect(await messages.waitForMessage(messageId!)).toBe(true)
    await expectMessageSentEvent(conversationId, messageId!)
    expect(await memberMessagesProjection.waitForMessagesToBeStored(firstParticipant.memberId, [messageId!])).toBe(true)
    expect(await memberMessagesProjection.waitForMessagesToBeStored(secondParticipant.memberId, [messageId!])).toBe(true)
  })

}

async function expectValidateConnectionsRequest(conversationId: string) {
  const request = JSON.parse(await validateConnectionsRequestListener.waitForRequest(conversationId))
  expect(request).toBeDefined()
  expect(request.correlationId).toBe(conversationId)
  expect(request.initiatingMemberId).toBe(firstParticipant.memberId)
  expect(request.requestedConnectionMemberIds).toEqual([secondParticipant.memberId])
}

async function expectMessageSentEvent(conversationId: string, messageId: string) {
  const event = await eventListener.waitForEventType("ConversationMessageSent")

  const eventData: ConversationMessageSent = <ConversationMessageSent>event!.data

  expect(eventData.conversationId).toBe(conversationId)
  expect(eventData.messageId).toBe(messageId)
}

async function expectPublishedCreatedEvent(conversationId: string) {
  const event = await eventListener.waitForEventType("ConversationCreated")

  const eventData: ConversationCreated = <ConversationCreated>event!.data

  expect(eventData.id).toBe(conversationId)
}

async function expectPublishedActivatedEvent(conversationId: string) {
  const event = await eventListener.waitForEventType("ConversationActivated")

  const eventData: ConversationActivated = <ConversationActivated>event!.data

  expect(eventData.conversationId).toBe(conversationId)
}

function generateEmailFromName(enteredName: string): string {
  return enteredName.replace(/ /g, ".") + "@gmail.com"
}



