import  { SQSClient, 
  
  SendMessageCommand,
  ReceiveMessageCommand,
  ReceiveMessageResult, 
  DeleteMessageCommand,
  GetQueueUrlCommand } from "@aws-sdk/client-sqs"
import logger from "../../../../test-helpers/service-test-logger"

interface ValidateConnectionsResponseFakeParameters{
  queueName: string
}
export interface EventResponse
{
  type: string
  data: object
}

export class ValidateConnectionsResponseFakeClient {
  public readonly sqsClient: SQSClient
  private url: string
  private queueName: string
  constructor(region: string, parameters: ValidateConnectionsResponseFakeParameters) {
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
    
        logger.verbose("validate connections response queue url response - " + JSON.stringify(response))
        this.url = response.QueueUrl!
      }
      catch(error)
      {
        logger.error("Failed to get validate connections response queue url -  " + error)
        throw error
      }
    }

    return this.url
  }

  async notifySuccess(correlationId: string)
  {
    try {
      const params = {
        QueueUrl: await this.getUrl(),
        MessageBody: JSON.stringify({correlationId: correlationId, validated: true})
      }   
      const command = new SendMessageCommand(params)

      const response = await this.sqsClient.send(command)
    }
    catch(error)
    {
      logger.error("Failed to send event - " + error)
      throw error
    }
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

      logger.verbose("validate connections response delete message response - " + JSON.stringify(response))
    }
    catch(error)
    {
      logger.error("Failed to delete message -  " + error)
      throw error
    }
  }  
}