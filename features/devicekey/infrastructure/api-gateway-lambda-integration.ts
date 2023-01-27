import {OpenAPIExtension, HttpMethod} from "./open-api-spec"

export class APIGatewayLambdaIntegration implements OpenAPIExtension{

   lambdaName: string
   httpMethod: HttpMethod
   apiRoleArn: string
   constructor(lambdaName: string, httpMethod: HttpMethod, apiRoleArn: string){
     this.lambdaName = lambdaName
     this.httpMethod = httpMethod
     this.apiRoleArn = apiRoleArn
   }

   formatHttpMethod(): string
   {
      let formattedMethod: string = ""
      if (this.httpMethod == HttpMethod.Post)
      {
         formattedMethod = "POST"
      }

      return formattedMethod
   }

   get name(): string {
     return "x-amazon-apigateway-integration"
   }
   get content(): any{
     return {uri: "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:" + this.lambdaName + "/invocations",
             passthroughBehavior: "when_no_match",
             httpMethod: this.formatHttpMethod(),
             "type": "aws_proxy",
             "credentials": this.apiRoleArn
            }
   }
}
