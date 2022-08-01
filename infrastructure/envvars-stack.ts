import {CfnOutput, Stack, StackProps} from "aws-cdk-lib"
import {Construct} from "constructs"

export class EnvvarsStack extends Stack {
  private _envvars: string[]

  constructor(scope: Construct, id: string, props: StackProps)
  {
    super(scope, id, props)

    this._envvars = []
  }

  get envvars() : string[] {
    return this._envvars
  }

  addEnvvar(key: string, value: string)
  {
    const compositeKey = this.stackName + key
    new CfnOutput(this, compositeKey, {value: value, exportName: compositeKey})
    this._envvars.push(this.stackName + key)
  }
}

