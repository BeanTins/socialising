import {Table, AttributeType, StreamViewType} from "aws-cdk-lib/aws-dynamodb"
import { StackProps, RemovalPolicy } from "aws-cdk-lib"
import { Construct } from "constructs"
import {IPrincipal} from "aws-cdk-lib/aws-iam"
import {EnvvarsStack} from "../../../infrastructure/envvars-stack"

interface MemberDevicesProjectionProps extends StackProps {
  stageName: string;
}

export class MemberDevicesProjection extends EnvvarsStack {
  public readonly memberDevices: Table
  constructor(scope: Construct, id: string, props: MemberDevicesProjectionProps) {
    super(scope, id, props)
    this.memberDevices = new Table(this, "Table", {
      partitionKey: { name: "memberId", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      readCapacity: 1,
      writeCapacity: 1
    })

    this.addEnvvar("Name", this.memberDevices.tableName)
    this.addEnvvar("Arn", this.memberDevices.tableArn)
  }

  get name(): string {
    return this.memberDevices.tableName
  }

  grantAccessTo(accessor: IPrincipal){
    this.memberDevices.grantReadWriteData(accessor)
  }
}

