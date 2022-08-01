import  { SQSClient, 
  
  ReceiveMessageCommand, 
  GetQueueUrlCommand, 
  ReceiveMessageResult,
  DeleteMessageCommand } from "@aws-sdk/client-sqs"
import logger from "./service-test-logger"

interface ValidateConnectionsRequestListenerParameters{
  queueName: string
}
export interface EventResponse
{
  type: string
  data: object
}

export class ValidateConnectionsRequestListenerClient {
  public readonly sqsClient: SQSClient
  private url: string
  private queueName: string
  constructor(region: string, parameters: ValidateConnectionsRequestListenerParameters) {
    this.sqsClient = new SQSClient({ region: region })
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
    
        logger.verbose("validate connections request listener queue url response - " + JSON.stringify(response))
        this.url = response.QueueUrl!
      }
      catch(error)
      {
        logger.error("Failed to get validate connections request listener queue url -  " + error)
        throw error
      }
    }

    return this.url
  }

  async waitForRequest()
  {
    let request: any
    const url = await this.getUrl()

    try {
      const params = {
        QueueUrl: url,
        WaitTimeSeconds: 10
      }   
      const command = new ReceiveMessageCommand(params)

      logger.verbose("validate connections request listener queue command - " + JSON.stringify(command))

      let response: ReceiveMessageResult
      response = await this.sqsClient.send(command)
  
      logger.verbose("validate connections request listener queue response - " + JSON.stringify(response))

      if (response.Messages != undefined && response.Messages.length > 0)
      {
        const message = response.Messages[0]

        request = message.Body!

        await this.deleteMessage(message.ReceiptHandle!)
      }
    }
    catch(error)
    {
      logger.error("Failed to receive event -  " + error)
      throw error
    }

    return request
  }

  async clear()
  {
    const url = await this.getUrl()

    try {
      const params = {
        QueueUrl: url,
        MaxNumberOfMessages: 10
      }   
      const command = new ReceiveMessageCommand(params)
    
      let response: ReceiveMessageResult
      do
      {
        response = await this.sqsClient.send(command)
  
        if (response.Messages != undefined && response.Messages.length > 0)
        {
          for (const message of response.Messages)
          {
            await this.deleteMessage(message.ReceiptHandle!)
            logger.verbose("Deleted event - " + JSON.stringify(message))
          }
        }
      } while((response.Messages != undefined) && (response.Messages.length < 10))
    }
    catch(error)
    {
      logger.error("Failed to receive event -  " + error)
      throw error
    }
  }  

  async deleteMessage(receiptHandle: string)
  {
    const url = await this.getUrl()

    try {
      const params = {
        QueueUrl: url,
        ReceiptHandle: receiptHandle
      }   
  
      const command = new DeleteMessageCommand(params)

      const response = await this.sqsClient.send(command)

      logger.verbose("validate connections request listener delete message response - " + JSON.stringify(response))
    }
    catch(error)
    {
      logger.error("Failed to delete message -  " + error)
      throw error
    }
  }  
}