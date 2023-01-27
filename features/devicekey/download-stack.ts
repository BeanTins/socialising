
import { StackProps } from "aws-cdk-lib"
import { Construct } from "constructs"
import * as path from "path"
import { SpecBuilderFactory} from "./download"
import { CognitoAuthorizer} from "./infrastructure/cognito-authorizer"
import { LambdaEndpoint } from "./infrastructure/lambda-endpoint"


interface DownloadProps extends StackProps {
  stageName: string
  deviceKeyTableName: string
  userPoolArn: string
  eventBusName: string
}

export class DownloadCommand extends LambdaEndpoint {
  
  constructor(scope: Construct, id: string, props: DownloadProps) {

    const authorizerName = "CognitoAuthorizer"
    const authorizerSpec = new CognitoAuthorizer(authorizerName, props.userPoolArn)
    const specBuilder = SpecBuilderFactory.create()

    specBuilder.withSecurityExtension(authorizerSpec)
    specBuilder.selectingSecurity(authorizerName)
 
    super(scope, id, 
      {name: "DeviceKeyDownload",
       environment: {DeviceKeyTableName: props.deviceKeyTableName},
       stageName: props.stageName,
       entry: path.join(__dirname, "./download.ts"),
       openAPISpec: specBuilder,
       stackName: props.stackName})
    }
} 

