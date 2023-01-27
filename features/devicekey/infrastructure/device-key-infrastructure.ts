import { Stage } from "aws-cdk-lib"
import { DeviceKeysTable } from "./device-keys-table"
import { UploadCommand } from "../upload-stack"
import { DownloadCommand } from "../download-stack"
import { StackFactory } from "../../../provisioning/stack-factory"

export class DeviceKeyInfrastructure{
  serviceName: string | undefined
  stage: Stage
  stackFactory: StackFactory
  
  deviceKeysTable: DeviceKeysTable
  uploadCommand: UploadCommand
  downloadCommand: DownloadCommand

  public constructor(serviceName: string | undefined, stage: Stage) {
    this.serviceName = serviceName
    this.stage = stage
    this.stackFactory = new StackFactory(serviceName, "DeviceKey", stage)
  }

  build(eventBusName: string, 
    stageName: string, 
    userPoolArn: string)
  {
    this.deviceKeysTable = this.stackFactory.create(DeviceKeysTable, { stageName: stageName })

    this.buildUploadCommand(stageName, userPoolArn, eventBusName)

    this.buildDownloadCommand(stageName, userPoolArn, eventBusName)
  }

  private buildUploadCommand(stageName: string, userPoolArn: string, eventBusName: string) {
    this.uploadCommand = this.stackFactory.create(UploadCommand,
      {
        eventBusName: eventBusName,
        stageName: stageName,
        deviceKeyTableName: this.deviceKeysTable.name,
        userPoolArn: userPoolArn

      })
    this.deviceKeysTable.grantAccessTo(this.uploadCommand.lambda.grantPrincipal)
  }

  private buildDownloadCommand(stageName: string, userPoolArn: string, eventBusName: string) {
    this.downloadCommand = this.stackFactory.create(DownloadCommand,
      {
        eventBusName: eventBusName,
        stageName: stageName,
        deviceKeyTableName: this.deviceKeysTable.name,
        userPoolArn: userPoolArn

      })
    this.deviceKeysTable.grantAccessTo(this.downloadCommand.lambda.grantPrincipal)
  }

}

