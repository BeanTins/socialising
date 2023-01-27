import {OpenAPIExtension} from "./open-api-spec"

export class CognitoAuthorizer implements OpenAPIExtension{

   private _name: string
   private userPoolArn: string

   constructor(name: string, userPoolArn: string){
     this._name = name
     this.userPoolArn = userPoolArn
   }

   get name(): string {
     return this._name
   }

   get content(): any{
     return {
      type: "apiKey",
      name: "Authorization",
      in: "header",
      "x-amazon-apigateway-authtype": "cognito_user_pools",
      "x-amazon-apigateway-authorizer": {
         type: "cognito_user_pools",
         providerARNs: [this.userPoolArn] 
      } 
    }
  }
}

