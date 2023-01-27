import { Authorization } from "aws-cdk-lib/aws-events"

 export enum HttpMethod{
   Post = "post",
   Get = "get"
 }

class EndpointDefinition{
  summary?: string
  description?: string
  requestBody?: RequestBodyDefinition
  responses?: NamedResponse
  [name: string]: any
}

interface InfoDefinition{
   title: string
   description: string
   version: string
}

type NamedResponseDescription = Record<string, string>
type NamedResponse = Record<string, NamedResponseDescription>
type NamedEndpoint = Record<string, EndpointDefinition>
type NamedPath = Record<string, NamedEndpoint>

export class OpenAPISpec{
   openapi: string
   paths: NamedPath
   info: InfoDefinition
   [name: string]: any
}

class SchemaDefinition{
   type?: string
   properties?: NamedProperty
   required?: string[]
}


class ContentDefinition{
   schema?: SchemaDefinition
}

export enum ContentType{
   JSON = "application/json"
}

type NamedContentDefinition = Record<ContentType, ContentDefinition>

class RequestBodyDefinition {
   required?: boolean
   content?: NamedContentDefinition 
}

class StringPropertyDefinition {
   minLength?: number
   maxLength?: number
   type: string
}

class IntegerPropertyDefinition {
   type: string
}

class ArrayItemsDefinition {
   type: string
   uniqueItems?: boolean
}

class ArrayPropertyDefinition {

   items: ArrayItemsDefinition
   type: string
}

export interface OpenAPIExtension{
   name: string
   content: any
}

export class Property{
   name: string
   required?: boolean
}

export class StringProperty extends Property{
   minLength?: number
   maxLength?: number
}

export class ArrayProperty extends Property{
   type: "string"
}

export class Parameter {
   name: string
   description: string
   enum?: string[]
}

export class ArrayParameter {
   name: string
   description: string
   type: "string"
}

type NamedProperty = Record<string, StringPropertyDefinition|IntegerPropertyDefinition|ArrayPropertyDefinition>

export class EndpointBuilder{

   private endpoint: EndpointDefinition

   constructor(){
      this.endpoint = new EndpointDefinition()
   }

   describedAs(summary: string, description: string)
   {
     this.endpoint.summary = summary
     this.endpoint.description = description
   }

   withExtension(extension: OpenAPIExtension)
   {
     this.endpoint[extension.name] = extension.content
   }

   withResponse(code: string, message: string)
   {
      if (this.endpoint.responses == undefined)
      {
         this.endpoint.responses = {}
      }

      this.endpoint.responses[code] = {}
      
      this.endpoint.responses[code].description = message
   }

   withStringPathParameter(param: Parameter)
   {
      if (this.endpoint.parameters == undefined)
      {
         this.endpoint.parameters = []
      }

      let formattedParam: any = {
         in: "path",
         type: "string",
         name: param.name,
         description: param.description,
         required: true
      }

      if (param.enum != undefined)
      {
         formattedParam["enum"] = param.enum
      }

      this.endpoint.parameters.push(formattedParam)
   }

   withStringQueryParameter(param: Parameter)
   {
      if (this.endpoint.parameters == undefined)
      {
         this.endpoint.parameters = []
      }

      let formattedParam: any = {
         in: "query",
         name: param.name ,
         description: param.description,
         required: true,
         type: "string",
      }

      this.endpoint.parameters.push(formattedParam)
   }

   withRequestBodyStringProperty(param: StringProperty)
   {
      this.withProperty(param, "string")

      if (param.minLength != undefined)
      {
         (this.endpoint.requestBody!.content![ContentType.JSON].schema!.properties![param.name] as StringPropertyDefinition).minLength = param.minLength
      }

      if (param.maxLength != undefined)
      {
         (this.endpoint.requestBody!.content![ContentType.JSON].schema!.properties![param.name] as StringPropertyDefinition).maxLength = param.maxLength
      }
      
   }

   withRequestBodySetProperty(param: ArrayProperty)
   {
      this.withRequestBodyArrayProperty(param)
      const property: ArrayPropertyDefinition = <ArrayPropertyDefinition>this.endpoint.requestBody!.content![ContentType.JSON].schema!.properties![param.name]
      property.items.uniqueItems = true
   }

   withRequestBodyArrayProperty(param: ArrayProperty)
   {
      this.withProperty(param, "array")

      const property: ArrayPropertyDefinition = <ArrayPropertyDefinition>this.endpoint.requestBody!.content![ContentType.JSON].schema!.properties![param.name]
      property.items = {type: param.type}
   }

   private withProperty(param: Property, type: "array"|"string") {
      if (this.endpoint.requestBody == undefined) {
         this.endpoint.requestBody = { required: true }
      }

      if (this.endpoint.requestBody.content == undefined) {
         this.endpoint.requestBody.content = {
            [ContentType.JSON]: {
               schema: { type: "object" }
            }
         }
      }

      if (this.endpoint.requestBody.content[ContentType.JSON].schema!.properties == undefined) {
         this.endpoint.requestBody.content[ContentType.JSON].schema!.properties = {}
      }

      this.endpoint.requestBody.content[ContentType.JSON].schema!.properties![param.name] = { type: type }

      if (param.required) {
         if (this.endpoint.requestBody.content[ContentType.JSON].schema!.required == undefined) {
            this.endpoint.requestBody.content[ContentType.JSON].schema!.required = []
         }

         this.endpoint.requestBody.content[ContentType.JSON].schema!.required?.push(param.name)
      }
   }

   build(): EndpointDefinition{

      return this.endpoint
   }
 }
 
export class OpenAPISpecBuilder{
   private spec: OpenAPISpec
   private endpoints: Map<[string, HttpMethod], EndpointBuilder>

   constructor(version: string)
   {
      this.spec = new OpenAPISpec()
      this.spec.openapi = version
      this.spec.paths = {}
      this.endpoints = new Map<[string, HttpMethod], EndpointBuilder>()
   }

   withEndpoint(path: string, method: HttpMethod){
     const endpoint = new EndpointBuilder()
     this.endpoints.set([path, method], endpoint)
   
     return endpoint
   }

   getEndpoints(): Map<[string, HttpMethod], EndpointBuilder>
   {
      return this.endpoints
   }

   describedAs(title: string, description: string, version: string){
     this.spec.info = {title: title, description: description, version: version}
   }

   withSecurityExtension(extension: OpenAPIExtension)
   {
     this.spec.components = {securitySchemes: {[extension.name]:extension.content}}
   }

   selectingSecurity(securityScheme: string, scopes = [])
   {
     this.spec.security = [{[securityScheme]: scopes}]
   }
   
   withExtension(extension: OpenAPIExtension)
   {
     this.spec[extension.name] = extension.content
   }

   build(): any
   {
      this.endpoints.forEach((endpoint: EndpointBuilder, pathAndMethod: [string, HttpMethod]) => {
        const path = pathAndMethod[0]
        const method = pathAndMethod[1]
        this.spec.paths[path] = {[method]: endpoint.build()}
      })

     return this.spec
   }
}
