import {OpenAPIExtension} from "./open-api-spec"

interface ValidationCategories{
  validateRequestBody: boolean
  validateRequestParameters: boolean
}

export class APIGatewayRequestValidators implements OpenAPIExtension{

   validatorCategories: Record<string, ValidationCategories>
   constructor(validatorCategories: Record<string, ValidationCategories>){
     this.validatorCategories = validatorCategories
   }

   get name(): string {
     return "x-amazon-apigateway-request-validators"
   }
   get content(): any{
     return this.validatorCategories
   }
}
