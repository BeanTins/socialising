
import { APIGatewayEvent, Context, APIGatewayProxyResult } from "aws-lambda"
import { OpenAPISpecBuilder, HttpMethod} from "./infrastructure/open-api-spec"
import { HttpResponse } from "./infrastructure/http-response"
import { DeviceKeyDAO } from "./infrastructure/device-key-dao"
import logger  from "./infrastructure/lambda-logger"

export class SpecBuilderFactory
{
  static create()
  {
    const specBuilder = new OpenAPISpecBuilder("3.0.0")

    specBuilder.describedAs("device key download", "download public keys for other member devices to allow encryption of messages to them", "1.9.0")
  
    const endpoint = specBuilder.withEndpoint("/devicekey", HttpMethod.Get)
    endpoint.withStringQueryParameter({name: "id", description: "query one or more device ids for their public keys"})
    endpoint.withResponse("200", "download succeeded")
    endpoint.withResponse("400", "download failed")
  
    return specBuilder
  }
}

export const lambdaHandler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => { 
    var controller: DownloadController = new DownloadController()
  
    return await controller.request(event.multiValueQueryStringParameters)
  }
  
export class DownloadController {

async request(downloadDTO: any) {
    var response: any

    try {
      logger.verbose("incoming request - " + JSON.stringify(downloadDTO))
      
      const command: DownloadCommand = new DownloadCommand(downloadDTO.id)

      console.log("command - " + JSON.stringify(command))
      const commandHandler = new DownloadCommandHandler()

      const requestedIdTokeys = await commandHandler.handle(command)

      response = HttpResponse.ok(JSON.stringify(requestedIdTokeys))
    }
    catch (error) {

      const statusCodeMap = new Map<any, number>([
      ])

      logger.error(error)

      response = HttpResponse.error(error, statusCodeMap)
    }

    return response
}
}

export class DownloadCommandHandler {

  private deviceKeysDAO: DeviceKeyDAO

  public constructor() {
    this.deviceKeysDAO = new DeviceKeyDAO(process.env.AWS_REGION!)
  }

  async handle(command: DownloadCommand) {

    return await this.deviceKeysDAO.getAll(command.deviceIds)
  }
}

export class DownloadCommand {

  public constructor(deviceIds: string[])
  {
    this.deviceIds = deviceIds
  }

  deviceIds: string[]
}
  

  
  
