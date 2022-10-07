import  { SQSClient, 
  GetQueueUrlCommand, 
  SendMessageCommand } from "@aws-sdk/client-sqs"
import logger from "./lambda-logger"

interface ValidateConnectionsRequestClientParameters{
  region: string
  queueName: string
}

export interface ValidateConnectionRequest {
    correlationId: string
    initiatingMemberId: string
    requestedConnectionMemberIds: Set<string>
}


export class ValidateConnectionsRequestClient {
  public readonly sqsClient: SQSClient
  private url: string
  private queueName: string
  constructor(parameters: ValidateConnectionsRequestClientParameters) {
    this.sqsClient = new SQSClient({ region: parameters.region })
    this.queueName = parameters.queueName
  }

  async getUrl()
  {
    if (this.url == undefined)
    {
      const input = {
        QueueName: this.queueName,
      }
  
      try {
  
        const command = new GetQueueUrlCommand(input)
        const response = await this.sqsClient.send(command)
    
        logger.verbose("event listener queue url response - " + JSON.stringify(response))
        this.url = response.QueueUrl!
      }
      catch(error)
      {
        logger.error("Failed to get event listener queue url -  " + error)
        throw error
      }
    }

    return this.url
  }

  async send(request: ValidateConnectionRequest)
  {
    const url = await this.getUrl()

    try {
      const params = {
        QueueUrl: url,
        MessageBody: JSON.stringify(
          request,
          (_key, value) => (value instanceof Set ? [...value] : value)
        )
      }   
      const command = new SendMessageCommand(params)

      logger.verbose("validate connections request - " + JSON.stringify(params))

      const response = await this.sqsClient.send(command)
    }
    catch(error)
    {
      logger.error("Failed to send event - " + error)
      throw error
    }
  }
}