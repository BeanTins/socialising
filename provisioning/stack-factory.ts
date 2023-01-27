import { Stage } from "aws-cdk-lib"
import { Construct } from "constructs"

export class StackFactory{
  private serviceName: string | undefined
  private featureName: string | undefined
  private stage: Stage
  private _envvars: string[]

  public constructor(serviceName: string | undefined, featureName: string | undefined, stage: Stage) {
    this.serviceName = serviceName
    this.featureName = featureName
    this.stage = stage
    this._envvars = []
  }

  public get envvars(): string[] {
    return this._envvars
  }
  
  create<Type, PropType>(type: (new (scope: Construct, id: string, props: PropType) => Type), props?: PropType): Type {
    
    if (this.serviceName != undefined)
    {
      let stackName = this.serviceName

      if (this.featureName != undefined)
      {
        stackName += this.featureName
      } 

      stackName += type.name

      //@ts-ignore
      props.stackName = stackName
    }

    let passedInProperties = props
    if (props == undefined)
    {
      //@ts-ignore
      passedInProperties = {}
    }
    const stack = new type(this.stage, type.name, passedInProperties!)

    //@ts-ignore
    if (stack.envvars != undefined)
    {
      // @ts-ignore
      this._envvars = this._envvars.concat(stack.envvars)
    }

    return stack
  }
}

