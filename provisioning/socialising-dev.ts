import { App, Fn } from "aws-cdk-lib"
import { SocialisingStage } from "./socialising-stage"
import { BeanTinsCredentials, StoreType} from "../../credentials/infrastructure/beantins-credentials"
import { EventListenerStack } from "../features/conversation/service-tests/helpers/event-listener-stack"
import { ValidateConnectionsFakeStack } from "../features/conversation/service-tests/helpers/validate-connections-fake-stack"
import { MembershipEventBusFake } from "../features/conversation/service-tests/helpers/membership-event-bus-fake"

async function main(): Promise<void> 
{
  const app = new App()

  const beantinsCredentials = new BeanTinsCredentials(app, "SocialisingDevCredentials", {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    deploymentName: "SocialisingDev",
    storeTypeForSettings: StoreType.Output 
  })

  const eventListener = new EventListenerStack(app, "SocialisingDevEventListener", {
    deploymentName: "SocialisingDev",
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  })
  
  const validateConnectionQueues = new ValidateConnectionsFakeStack(app, "SocialisingDevValidateConnections", {
    deploymentName: "SocialisingDev"
  })


  const membershipEventBus = new MembershipEventBusFake(app, "SocialisingDevMembershipEventBusFake", {
    deploymentName: "SocialisingDev",
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
  })

  const stage = new SocialisingStage(app, "SocialisingDev", {
    stageName: "dev",
    eventListenerQueueArn: Fn.importValue("SocialisingDevEventListenerQueueArn"),
    membershipEventBusArn: Fn.importValue("SocialisingDevMembershipEventBusFakeArn"),
    validateConnectionsRequestQueueArn: Fn.importValue("SocialisingDevValidateConnectionsRequestQueueArn"),
    validateConnectionsResponseQueueArn: Fn.importValue("SocialisingDevValidateConnectionsResponseQueueArn"),
    userPoolId: Fn.importValue("SocialisingDevUserPoolId"),
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    stackNamePrepend: "SocialisingDev"
  })
}

main().catch(console.error)