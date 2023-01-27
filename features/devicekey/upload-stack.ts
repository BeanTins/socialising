
import { StackProps } from "aws-cdk-lib"
import { Construct } from "constructs"
import * as path from "path"
import { SpecBuilderFactory} from "./upload"
import { CognitoAuthorizer} from "./infrastructure/cognito-authorizer"
import { LambdaEndpoint } from "./infrastructure/lambda-endpoint"


interface UploadProps extends StackProps {
  stageName: string
  deviceKeyTableName: string
  userPoolArn: string
  eventBusName: string
}

export class UploadCommand extends LambdaEndpoint {
  
  constructor(scope: Construct, id: string, props: UploadProps) {

    const authorizerName = "CognitoAuthorizer"
    const authorizerSpec = new CognitoAuthorizer(authorizerName, props.userPoolArn)
    const specBuilder = SpecBuilderFactory.create()

    specBuilder.withSecurityExtension(authorizerSpec)
    specBuilder.selectingSecurity(authorizerName)
 
    super(scope, id, 
      {name: "DeviceKeyUpload",
       environment: {DeviceKeyTableName: props.deviceKeyTableName},
       stageName: props.stageName,
       entry: path.join(__dirname, "./upload.ts"),
       openAPISpec: specBuilder,
       stackName: props.stackName})
    }
} 

