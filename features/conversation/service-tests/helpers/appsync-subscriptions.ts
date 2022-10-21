import logger from "./service-test-logger"
import { GraphQLClient, gql } from 'graphql-request'
import { v4 as uuidv4 } from "uuid"

import {WebSocket} from "ws"

export class AppsyncSubscriptions
{
    private host: string
    private realtimeEndpoint: string
    private token: string
    private subscriptionWebSocket: WebSocket
    private subscriptionIds: string[]
    constructor(endpoint: string, idToken: string)
    {
      this.host = this.generateHost(endpoint)
      this.realtimeEndpoint = this.generateRealTimeEndpoint(endpoint, idToken, this.host)
      this.token = idToken
      this.subscriptionIds = []
    }

    async connect(endpoint: string): Promise<WebSocket> {
      return new Promise(function(resolve, reject) {
        const exampleSocket = new WebSocket(endpoint, ["graphql-ws"])
      
        exampleSocket.onopen = function (event) {
          console.log("opened")
          resolve(exampleSocket)
        };
  
        exampleSocket.onerror = function(err: any) {
              reject(err);
          };
 
      });
    }    

    async sendConnectionInit(socket: WebSocket) {
      return new Promise(function(resolve, reject) {
      
      socket.onmessage = function (event) {
        const result = JSON.parse(<string>event.data)
        if (result.type == "connection_ack")
        {
           console.log("resolved")
           resolve(event.data)
        }
      }
  
      socket.onerror = function(err: any) {
           reject(err);
      }


      const message = JSON.stringify({ type: "connection_init", payload: {} })

      console.log("Sending... " + JSON.stringify(message))
      socket.send(message)
 
      })
    }    

    async subscribeToQuery(query: any): Promise<string> {

      const subscribeMessage = {

          id: uuidv4(),
          payload: {
            data: JSON.stringify(query),
            extensions: {
              authorization: {
                Authorization: this.token,
                host: this.host
              }
            }
          },
          type: "start"
        }

      const subscriptionId = await this.subscribe(JSON.stringify(subscribeMessage))
      this.subscriptionIds.push(subscriptionId)  
      return subscriptionId
    }

    async waitForUpdate(subscriptionId: any, subscriptionName: string): Promise<any> {
      const socket = this.subscriptionWebSocket
      return new Promise(function(resolve, reject) {

        console.log("waiting for update...")
        socket.onmessage = function (event) {
          console.log(event.data)
          const result = JSON.parse(<string>event.data)
          if (result.type == "data")
          {

             console.log("subscription update to " + JSON.stringify(result.payload))
             const payload = result.payload.data[subscriptionName]
             resolve(payload)
          }
        }
    
        socket.onerror = function(err: any) {
             reject(err);
        }
  
      })
    }

    async subscribe(message: string): Promise<string> {
      const socket = this.subscriptionWebSocket
      const token = this.token
      const host = this.host
      return new Promise(function(resolve, reject) {

        socket.onmessage = function (event) {
          console.log(event.data)
          const result = JSON.parse(<string>event.data)
          if (result.type == "start_ack")
          {
             console.log("subscribed to " + result.id)
             resolve(result.id)
          }
        }
    
        socket.onerror = function(err: any) {
             reject(err);
        }
  
        console.log("Sending... " + message)
        socket.send(message)

      })
    }

    async unsubscribe(subscriptionId: string, socket: WebSocket) : Promise<void>{
      return new Promise(function(resolve, reject) {

        socket.onmessage = function (event) {
          console.log(event.data)
          const result = JSON.parse(<string>event.data)
          if (result.type == "complete")
          {
             console.log("unsubscribed")
             resolve()
          }
        }
    
        socket.onerror = function(err: any) {
             reject(err);
        }
  
        const unsubscribeMessage = {
          type:"stop",
          "id": subscriptionId
        }

        console.log("Sending... " + JSON.stringify(unsubscribeMessage))
        socket.send(JSON.stringify(unsubscribeMessage))

      })
    }

    generateHost(endpoint: string)
    {
      var matches = endpoint.match(/^https:\/\/(.+)\/graphql$/)

      return matches![1]
    }

    generateRealTimeEndpoint(endpoint: string, idToken: string, host: string)
    {
      const headers: any = {
        Authorization: idToken,
        host:host
      }

      const body = {}

      return endpoint.replace ("https", "wss").replace("appsync-api", "appsync-realtime-api") + "?header=" + Buffer.from(JSON.stringify(headers), 'binary').toString('base64') + "&payload=" + Buffer.from(JSON.stringify(body), 'binary').toString('base64') 
    }

    async open()
    {
      if (this.subscriptionWebSocket == undefined)
      {
        this.subscriptionWebSocket = await this.connect(this.realtimeEndpoint)

        await this.sendConnectionInit(this.subscriptionWebSocket)
      }
    }

    async close()
    {
      const socket = this.subscriptionWebSocket
      const subscriptionIds = this.subscriptionIds
      const unsubscribe = this.unsubscribe
      return new Promise(async function(resolve, reject) {
        try{

          for (const subscriptionId of subscriptionIds)
          {
            console.log("unsubscribe - " + subscriptionId)
            await unsubscribe(subscriptionId, socket)
          }

          socket.onclose = function (event) {
            console.log("closed subscription websocket")
            resolve(event)
          };
    
          socket.onerror = function(err: any) {
                reject(err);
            }

          if (socket.readyState === WebSocket.OPEN) {
            console.log("closing subscription websocket...")
            socket.close()
          }
          else{
            resolve(0)
          }
        }
        catch(error)
        {

        }
        finally
        {
          if (socket!.readyState != 3)
          {
            socket!.terminate()
          }
        }
    })
    }

  }



