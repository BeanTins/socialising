
import {readFileSync, readdirSync} from "fs"
import * as path from "path"

export class TestEnvVarSetup{
  
  private serviceName: string
  private featureName: string | undefined
  constructor(serviceName: string, featureName: string | undefined)
  {
    this.serviceName = serviceName
    this.featureName = featureName
  }

  resolveVariableWithAppendedStage(envVarBaseName: string) {
    let variable: string
    const envVarName = envVarBaseName + this.getStage()
  
    if (process.env[envVarName] == undefined) {
      variable = this.resolveOutput(envVarName)
    }
    else {
      variable = process.env[envVarName]!
    }

    return variable
  }
  
  resolveVariable(envVarName: string)
  {
    let variable: string
    const compositeEnvVarName = this.getDeploymentName() + envVarName
    if (process.env[compositeEnvVarName] == undefined)
    {
      variable = this.resolveOutput(compositeEnvVarName)
    }
    else
    {
      variable = process.env[compositeEnvVarName]!
    }

    return variable
  }

  getStage()
  {
    let stage:string

    if (process.env.PipelineStage != undefined)
    {
        stage = process.env.PipelineStage 
    }
    else 
    {
        stage = "dev"
    }

    return stage
  }

  getDeploymentName()
  {
    let deploymentName: string = this.serviceName
    const stage = this.getStage()

    if (stage == "dev")
    {
      deploymentName+= "Dev"
    }
    if (stage == "test")
    {
      deploymentName+= "Test"
    }
    if (stage == "prod")
    {
      deploymentName+= "Prod"
    }

    if (this.featureName != undefined)
    {
      deploymentName += this.featureName
    }

    return deploymentName 
  }

  resolveOutput(targetOutputName: string)
  {
    var output: string | undefined
    let allDeployOutputs: string[] = []

    const outputFileList = readdirSync(path.join(__dirname, "../")).filter(fn => fn.endsWith("_outputs.json"))

    console.log(targetOutputName)
    if (outputFileList.length > 0)
    {
        for (const outputFile of outputFileList)
        {
            const deployOutputs = JSON.parse(readFileSync(outputFile).toString())

            for (const stackName in deployOutputs)
            {
                for (const outputName in deployOutputs[stackName])
                {
                  allDeployOutputs.push(outputName)
                  if (targetOutputName == outputName)
                  {
                      output = deployOutputs[stackName][outputName]
                      break
                  }
                }
            }
        }
    }
    else
    {
        throw Error("No matches for " + targetOutputName + " using path " + outputFileList.toString())
    }

    if (output == undefined)
    {
        throw Error(targetOutputName + " undefined amongst choices " + JSON.stringify(allDeployOutputs))
    }

    return output
  }
}

