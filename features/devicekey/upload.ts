
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

    specBuilder.describedAs("device key upload", "member device upload their public key for other members to use to encrypt messages to them", "1.9.0")
  
    const endpoint = specBuilder.withEndpoint("/devicekey/upload", HttpMethod.Post)
    endpoint.withRequestBodyStringProperty({name: "deviceId", required: true})
    endpoint.withRequestBodyStringProperty({name: "publicKey", required: true})
    endpoint.withResponse("201", "upload succeeded")
    endpoint.withResponse("400", "upload failed")
  
    return specBuilder
  }
}

export const lambdaHandler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => { 
    var controller: UploadController = new UploadController()
  
    return await controller.request(event.body)
  }
  
export class UploadController {

async request(uploadDTO: any) {
    var response: any

    try {
      logger.verbose("incoming request - " + JSON.stringify(uploadDTO))
      
      const command = JSON.parse(uploadDTO)

      const commandHandler = new UploadCommandHandler()

      await commandHandler.handle(command)

      response = HttpResponse.created("device key")
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

export class UploadCommandHandler {

  private deviceKeysDAO: DeviceKeyDAO

  public constructor() {
    this.deviceKeysDAO = new DeviceKeyDAO(process.env.AWS_REGION!)
  }

  async handle(command: UploadCommand) {

    await this.deviceKeysDAO.save(command.deviceId, command.publicKey)
  }
}

export class UploadCommand {
  deviceId: string
  publicKey: string
}

  
  
