
import { StepDefinitions } from "jest-cucumber"
import { TestEnvVarSetup } from "../../../../test-helpers/test-env-var-setup"
import { MemberCredentialsAccessor} from "../../../../test-helpers/member-credentials-accessor"
import logger from "../../../../test-helpers/service-test-logger"
import { FakeMember } from "../../../../test-helpers/fake-member"
import { AsymmetricEncryption } from "./asymmetric-encryption"
import { DeviceKeyClient } from "./device-keys-client"
import { DeviceKeysAccessor } from "./device-keys-accessor"
const AWS_REGION = "us-east-1"
const FirstParticipantName = "Jock the Crow"
const JockPassword = "passw0rd"

let firstParticipant: FakeMember
let memberCredentials: MemberCredentialsAccessor
let testEnvVarSetupService: TestEnvVarSetup
let testEnvVarSetupFeature: TestEnvVarSetup
let membershipEventBusFakeArn : string
let client: DeviceKeyClient
let deviceName: string
let response: any
let asymmetricEncryption: AsymmetricEncryption
let deviceKeys: DeviceKeysAccessor

beforeAll(async()=> {

  try
  {
    testEnvVarSetupService = new TestEnvVarSetup("Socialising", undefined)
    testEnvVarSetupFeature = new TestEnvVarSetup("Socialising", "DeviceKey")
  
    asymmetricEncryption = new AsymmetricEncryption("passphrase")

    membershipEventBusFakeArn = testEnvVarSetupService.resolveVariable("MembershipEventBusFakeArn")

    client = new DeviceKeyClient()    
    deviceKeys = new DeviceKeysAccessor(AWS_REGION, 
      {tableName: testEnvVarSetupFeature.resolveVariable("DeviceKeysTableName")
    })

    memberCredentials = new MemberCredentialsAccessor(AWS_REGION, {
      userPoolId: testEnvVarSetupService.resolveVariable("UserPoolId"),
      userPoolMemberClientId: testEnvVarSetupService.resolveVariable("UserPoolMemberClientId")
    })
  }
  catch(error)
  {
    console.log(error)
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

   await Promise.all([
    memberCredentials.clear(),
    deviceKeys.clear()
   ])
   jest.setTimeout(getTestTimeout(currentTestName))

})

export const conversationSteps: StepDefinitions = ({ given, and, when, then }) => {

  given(/a new member/, async () => {
    firstParticipant.withName(FirstParticipantName)
    deviceName = "iPad"
    firstParticipant.withDevice(deviceName)    
    await firstParticipant.activated()
    await firstParticipant.authenticatedWithPassword(JockPassword)
  })

  given(/a member with a registered device/, async () => {
    firstParticipant.withName(FirstParticipantName)
    deviceName = "iPad"
    firstParticipant.withDevice(deviceName)    
    await firstParticipant.activated()
    await firstParticipant.authenticatedWithPassword(JockPassword)
    await deviceKeys.add(firstParticipant.idForDevice(deviceName)!, asymmetricEncryption.publicKey)
  })

  when(/they upload their public key/, async () => {
    const idToken = await memberCredentials.requestIdToken(firstParticipant.email, JockPassword)

    response = await client.upload(
      {deviceId: firstParticipant.idForDevice(deviceName)!,
       publicKey: asymmetricEncryption.publicKey,
       endpoint: testEnvVarSetupFeature.resolveVariable("UploadCommandEndpoint"),
       idToken: idToken})

  })

  when(/I download their public key/, async () => {
    const idToken = await memberCredentials.requestIdToken(firstParticipant.email, JockPassword)

    response = await client.download(
      {deviceIds: [firstParticipant.idForDevice(deviceName)!],
       endpoint: testEnvVarSetupFeature.resolveVariable("DownloadCommandEndpoint"),
       idToken: idToken})
  })

  then(/it is uploaded/, async () => {
    expect(response.message).toBe("device key created")
    expect(await deviceKeys.waitForDeviceKey(firstParticipant.idForDevice(deviceName)!)).toBe(asymmetricEncryption.publicKey)
  })

  then(/it is downloaded/, async () => {
    const returnedKeys =  JSON.parse(response.message)

    expect(returnedKeys[0].id).toBe(firstParticipant.idForDevice(deviceName)!)
    expect(returnedKeys[0].publicKey).toBe(asymmetricEncryption.publicKey)
  })

}

