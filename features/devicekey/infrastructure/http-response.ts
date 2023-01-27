export class HttpResponse{
    static created(item: string){
      return HttpResponse.build(201, item + " created")
    }

    static ok(message: string){
      return HttpResponse.build(200, message)
    }
    
    static error(error: any, statusCodeMap : Map<any, number>){
      
      let statusCode = 500
      let message: string = ""
  
      for (let [key, value] of statusCodeMap) {
        if (error instanceof key)
        {
          statusCode = value
          message = formatCamelCaseToSpaceSeparated(key)
        }
      }
  
      return HttpResponse.build(statusCode, message)
    }

    static build(statusCode: Number, message: string)
    {
      return {
        statusCode: statusCode,
        body: JSON.stringify({
          message: message
        }) 
      }
    }
}

function formatCamelCaseToSpaceSeparated(key: any): string {
  return key.name.replace(/([A-Z])/g, " $1").substring(1).toLowerCase()
}
  