import {default as fetch} from "node-fetch"
import logger from "../../../../test-helpers/service-test-logger"

interface UploadParameters{
  endpoint: string
  deviceId: string
  publicKey: string
  idToken: string | undefined
}

interface DownloadParameters{
    endpoint: string
    deviceIds: string[]
    idToken: string | undefined
}
  
export class DeviceKeyClient
{
    async upload(parameters: UploadParameters)
    {
        let responseBody: any = {}

        try{
            const url = parameters.endpoint

            logger.verbose("device key upload at url - " + url)

            let headers = {}
            if (parameters.idToken != undefined)
            {
                headers = {Authorization: "Bearer " + parameters.idToken}
            }
            
            const response = await fetch(url, {
                method: 'post',
                headers: headers,
                body: JSON.stringify({deviceId: parameters.deviceId, publicKey: parameters.publicKey}),
            })

            responseBody = await response.json()
            logger.verbose("Device Key upload response1 - " + JSON.stringify(responseBody))
            logger.verbose("Device Key upload response status - " + response.status)
            logger.verbose("Device Key upload response - " + responseBody.message)
        }
        catch(error)
        {
            logger.error("Error from device key upload" + JSON.stringify(error))
            throw error
        }

        return responseBody
    }

    async download(parameters: DownloadParameters)
    {
        let responseBody: any = {}

        try{
            logger.verbose("device key download at url - " + parameters.endpoint)

            let headers = {}
            if (parameters.idToken != undefined)
            {
                headers = {Authorization: "Bearer " + parameters.idToken}
            }
            
            const response = await fetch(this.buildUrl(parameters.endpoint, parameters.deviceIds), {
                method: 'get',
                headers: headers,
            })

            responseBody = await response.json()
            logger.verbose("Device Key download response - " + responseBody.message)
        }
        catch(error)
        {
            logger.error("Error from device key download" + JSON.stringify(error))
            throw error
        }

        return responseBody
    }

    buildUrl(urlBase: string, deviceIds: string[])
    {
        let url: string  = urlBase + deviceIds.map(x => "?id=" + x).join(",")
        logger.verbose(url)
        //logger.verbose(urlBase.replace("{deviceIds}", deviceIds[0] + "," + "1234"))
        return url
    }


}

