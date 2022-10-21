import logger from "./lambda-logger"
import {default as fetch} from "node-fetch"
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@aws-sdk/signature-v4'
import { HttpRequest } from '@aws-sdk/protocol-http'
import * as crypto from "@aws-crypto/sha256-js"
import { HeaderBag } from "@aws-sdk/types"
const { Sha256 } = crypto

export class MemberMessageNotifier
{
  private region: string
  private endpoint: string
  constructor(region: string, notifyEndpoint: string)
  {
    this.region = region
    this.endpoint = notifyEndpoint
  }

  async notify(conversationId: string, memberId: string, messageId: string)
  {
    const requestToBeSigned = this.buildRequest(conversationId, memberId, messageId)

    const signer = new SignatureV4({
      credentials: defaultProvider(),
      region: this.region,
      service: 'appsync',
      sha256: Sha256
    })

    const {headers, body, method} = await signer.sign(requestToBeSigned)

    await this.sendRequest(headers, body, method)
  }

  private buildRequest(conversationId: string, memberId: string, messageId: string) {
    const IncomingMemberMessageMutationBody = {
      query: `mutation IncomingMemberMessage($conversationId: ID!, $memberId: ID!, $messageId: ID!) {
      incomingMemberMessage(conversationId: $conversationId, memberId: $memberId, messageId: $messageId){
        conversationId,
        memberId,
        messageId
      }
    }`,
      variables: { conversationId: conversationId, memberId: memberId, messageId: messageId }
    };

    const endpointUrl = new URL(this.endpoint)

    const requestToBeSigned = new HttpRequest({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        host: endpointUrl.host
      },
      hostname: endpointUrl.host,
      body: JSON.stringify(IncomingMemberMessageMutationBody),
      path: endpointUrl.pathname
    })
    return requestToBeSigned
  }

  async sendRequest(headers: HeaderBag, body: any, method: string)
  {
    let responseBody: any
    let response
  
    try 
    {
      response = await fetch(this.endpoint, {headers, body, method})
      responseBody = await response.json()
      logger.verbose("body" + JSON.stringify(responseBody))
    } 
    catch (error) 
    {
      logger.error(JSON.stringify(error))
    }
  }
  
}

