interface SendMessageParameters{
  senderDeviceId: string
  senderMemberId: string
  message: string
  recipientDeviceId: string
  recipientMemberId: string
  conversationId: string
  idToken: string | undefined
}

interface LatestMessagesParameters{
  deviceId: string
  memberId: string
  lastReceivedMessageId?: string
  idToken: string | undefined
}

interface CreateParameters{
  initiatingMemberId: string 
  invitedMemberIds: string[] 
  name: string 
  adminIds: string[]
  idToken: string | undefined
}

interface CreatedSubscriptionParameters{
  idToken: string | undefined
  initiatingMemberId: string
}

interface IncomingMessageSubscriptionParameters{
  idToken: string | undefined
  memberId: string
}

export enum Result {
  Succeeded,
  Failed
}

export interface Response {
  result: Result
  message: string
}

export interface LatestMessagesResponse {
  result: Result
  messages?: any[]
  errorMessage?: string
}

import logger from "./service-test-logger"
import { GraphQLClient, gql } from 'graphql-request'
import { AppsyncSubscriptions } from "./appsync-subscriptions"

export class ConversationClient
{
    private endpoint: string
    private subscriptions: AppsyncSubscriptions
    constructor(endpoint: string)
    {
      this.endpoint = endpoint
    }

    async closeAnySubscriptions() : Promise<void>
    {
       if (this.subscriptions != undefined)
       {
         await this.subscriptions.close()
       }
    }

    async subscribeToCreated(parameters: CreatedSubscriptionParameters) : Promise<string>
    {
      let subscriptionId: string

      try{
        this.subscriptions = new AppsyncSubscriptions(this.endpoint, parameters.idToken!)

         await this.subscriptions.open()


        const subscribeQuery = {
          query: `subscription Created {
            created(initiatingMemberId:"${parameters.initiatingMemberId}"){
              __typename,
              initiatingMemberId,
              id
            }
           }`
          }
  
         subscriptionId = await this.subscriptions.subscribeToQuery(subscribeQuery)
  
      } 
      catch(error)
      {

      }
      
      return subscriptionId!

    }

    async subscribeToIncomingMemberMessage(parameters: IncomingMessageSubscriptionParameters) : Promise<string>
    {
      let subscriptionId: string

      try{
        this.subscriptions = new AppsyncSubscriptions(this.endpoint, parameters.idToken!)

         await this.subscriptions.open()


        const subscribeQuery = {
          query: `subscription IncomingMemberMessageReceived {
            incomingMemberMessageReceived(memberId:"${parameters.memberId}"){
              __typename,
              conversationId,
              messageId
            }
           }`
          }
  
         subscriptionId = await this.subscriptions.subscribeToQuery(subscribeQuery)
  
      } 
      catch(error)
      {

      }
      
      return subscriptionId!

    }


    async waitForSubscriptionUpdate(subscriptionId: string, subscriptionName: string)
    {
      return await this.subscriptions.waitForUpdate(subscriptionId, subscriptionName)
    }

    async create(parameters: CreateParameters) : Promise<Response>
    {
      let response: Response
      const graphQLClient = new GraphQLClient(this.endpoint, {
        headers: {
          Authorization: parameters.idToken!,
        }
      })

      const CreateCommand = gql`
      mutation Create($initiatingMemberId: ID!, $invitedMemberIds: [ID!], $name: String!, $adminIds: [ID!]) {
        create(initiatingMemberId: $initiatingMemberId, invitedMemberIds: $invitedMemberIds, name: $name, adminIds: $adminIds) {
          initiatingMemberId,
          id
        }
      }
    `;      
      
      const variables = {
        initiatingMemberId: parameters.initiatingMemberId,
        invitedMemberIds: parameters.invitedMemberIds,
        name: parameters.name,
        adminIds: parameters.adminIds
      }
      try
      {
        const data = await graphQLClient.request(CreateCommand, variables)
        logger.verbose("create responded with - " + JSON.stringify(data))
        response = {result: Result.Succeeded, message: data.create.id}
      }
      catch(error)
      {
        logger.verbose("Create error - " + JSON.stringify(error, undefined, 2))
        response = {result: Result.Failed, message: error.response.errors[0].message}
      }

      return response
    }

    async latestMessages(parameters: LatestMessagesParameters)
    {
      let response: LatestMessagesResponse
      const graphQLClient = new GraphQLClient(this.endpoint, {
        headers: {
          Authorization: parameters.idToken!,
        }
      })

      const LatestMessagesCommand = gql`
      query LatestMessages($memberId: ID!, $deviceId: ID!, $lastReceivedMessageId: ID) {
        latestMessages(memberId: $memberId, deviceId: $deviceId, lastReceivedMessageId: $lastReceivedMessageId) {
          conversationId
          messageId
          message
          dateTime
        }
      }
    `;      
      
      const variables = {
        memberId: parameters.memberId,
        deviceId: parameters.deviceId,
        lastReceivedMessageId: parameters.lastReceivedMessageId
      }

      try
      {
        const data = await graphQLClient.request(LatestMessagesCommand, variables)
        logger.verbose("latest messages - " + JSON.stringify(data))
        response = {result: Result.Succeeded, messages: data.latestMessages}
      }
      catch(error)
      {
        logger.verbose("Latest Messages error - " + JSON.stringify(error, undefined, 2))
        response = {result: Result.Failed, errorMessage: error.response.errors[0].message}
      }

      return response

    }

    async sendMessage(parameters: SendMessageParameters)
    {
      let response: Response
      const graphQLClient = new GraphQLClient(this.endpoint, {
        headers: {
          Authorization: parameters.idToken!,
        }
      })

      const SendMessageCommand = gql`
      mutation SendMessage($conversationId: ID!, $senderMemberId: ID!, $senderDeviceId: ID!, $messageEncryptions: [DeviceMessage!]) {
        sendMessage(conversationId: $conversationId, senderMemberId: $senderMemberId, senderDeviceId: $senderDeviceId, messageEncryptions: $messageEncryptions)
      }
    `;      
      
      const variables = {
        conversationId: parameters.conversationId,
        senderMemberId: parameters.senderMemberId,
        senderDeviceId: parameters.senderDeviceId,
        messageEncryptions: [{recipientDeviceId: parameters.recipientDeviceId, recipientMemberId: parameters.recipientMemberId, encryptedMessage: parameters.message}]
      }

      try
      {
        const data = await graphQLClient.request(SendMessageCommand, variables)
        response = {result: Result.Succeeded, message: data.sendMessage.id}
      }
      catch(error)
      {
        logger.verbose("Send Message error - " + JSON.stringify(error, undefined, 2))
        response = {result: Result.Failed, message: error.response.errors[0].message}
      }

      return response
    }
}

