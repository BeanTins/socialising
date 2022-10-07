import {Table, AttributeType, StreamViewType} from "aws-cdk-lib/aws-dynamodb"
import { StackProps, RemovalPolicy } from "aws-cdk-lib"
import { Construct } from "constructs"
import {IPrincipal} from "aws-cdk-lib/aws-iam"
import {EnvvarsStack} from "../../../infrastructure/envvars-stack"

interface MemberMessagesProjectionProps extends StackProps {
  stageName: string;
}

export class MemberMessagesProjection extends EnvvarsStack {
  public readonly memberMembers: Table
  constructor(scope: Construct, id: string, props: MemberMessagesProjectionProps) {
    super(scope, id, props)
    this.memberMembers = new Table(this, "Table", {
      partitionKey: { name: "memberId", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      readCapacity: 1,
      writeCapacity: 1
    })

    this.addEnvvar("Name", this.memberMembers.tableName)
    this.addEnvvar("Arn", this.memberMembers.tableArn)
  }

  get name(): string {
    return this.memberMembers.tableName
  }

  grantAccessTo(accessor: IPrincipal){
    this.memberMembers.grantReadWriteData(accessor)
  }
}

