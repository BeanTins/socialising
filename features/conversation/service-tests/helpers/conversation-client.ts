interface SendMessageParameters{
  deviceId: string
  memberId: string
  message: string
  conversationId: string
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

export enum Result {
  Succeeded,
  Failed
}

export interface Response {
  result: Result
  message: string
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

    async waitForSubscriptionUpdate(subscriptionId: string) : Promise<string>
    {
      return await this.subscriptions.waitForUpdate(subscriptionId)
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

    async sendMessage(parameters: SendMessageParameters)
    {
      let response: string = ""
      const graphQLClient = new GraphQLClient(this.endpoint, {
        headers: {
          Authorization: parameters.idToken!,
        }
      })

      const SendMessageCommand = gql`
      mutation SendMessage($senderDeviceId: String!, $senderMemberId: String!, $message: String!, $conversationId: String!) {
        sendMessage(senderDeviceId: $senderDeviceId, senderMemberId: $senderMemberId, message: $message, conversationId: $conversationId)
      }
    `;      
      
      const variables = {
        senderDeviceId: parameters.deviceId,
        senderMemberId: parameters.memberId,
        message: parameters.message,
        conversationId: parameters.conversationId
      }
      try
      {
        const data = await graphQLClient.request(SendMessageCommand, variables)
      }
      catch(error)
      {
        logger.verbose("Send Message error - " + JSON.stringify(error, undefined, 2))
        response = error.response.errors[0].message
      }

      return response
    }
}

