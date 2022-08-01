import  { SQSClient, 
  
  ReceiveMessageCommand, 
  GetQueueUrlCommand, 
  ReceiveMessageResult,
  DeleteMessageCommand } from "@aws-sdk/client-sqs"
import logger from "./service-test-logger"

interface EventListenerParameters{
  queueName: string
}
export interface EventResponse
{
  type: string
  data: object
}

export class EventListenerClient {
  public readonly sqsClient: SQSClient
  private url: string
  private queueName: string
  constructor(region: string, parameters: EventListenerParameters) {
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

  async waitForEventType(detailType: string): Promise<EventResponse|undefined>
  {
    let event: EventResponse|undefined
    const url = await this.getUrl()

    try {
      const params = {
        QueueUrl: url,
        WaitTimeSeconds: 10
      }   
      const command = new ReceiveMessageCommand(params)

      logger.verbose("event listener queue command - " + JSON.stringify(command))

      let currentType: string | undefined
      let response: ReceiveMessageResult
      do
      {
        response = await this.sqsClient.send(command)
    
        logger.verbose("event listener queue response - " + JSON.stringify(response))

        if (response.Messages != undefined && response.Messages.length > 0)
        {
          const message = response.Messages[0]

          const body = message.Body!

          const bodyObject = JSON.parse(body)

          currentType = bodyObject["detail-type"]
          event = {type: bodyObject["detail-type"],
                  data: bodyObject["detail"]}

          await this.deleteMessage(message.ReceiptHandle!)
        }
      } while((response.Messages != undefined) && (currentType != detailType))
    }
    catch(error)
    {
      logger.error("Failed to receive event -  " + error)
      throw error
    }

    return event
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

      logger.verbose("event listener delete message response - " + JSON.stringify(response))
    }
    catch(error)
    {
      logger.error("Failed to delete message -  " + error)
      throw error
    }
  }  
}