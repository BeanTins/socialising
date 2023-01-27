import {OpenAPIExtension} from "./open-api-spec"

export class APIGatewayRequestValidator implements OpenAPIExtension{

   validatorName: string
   constructor(validatorName: string){
     this.validatorName = validatorName
   }

   get name(): string {
     return "x-amazon-apigateway-request-validator"
   }
   get content(): any{
     return this.validatorName
   }
}
