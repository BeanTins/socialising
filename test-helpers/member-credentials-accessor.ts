
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminDeleteUserCommand,
  AdminConfirmSignUpCommand,
  InitiateAuthCommand,
  SignUpCommand
} from "@aws-sdk/client-cognito-identity-provider"
import logger from "./service-test-logger"

interface CredentialParameters
{
  userPoolId: string
  userPoolMemberClientId: string
}

export class MemberCredentialsAccessor {
  private client: CognitoIdentityProviderClient
  private parameters: CredentialParameters

  constructor(region: string, parameters: CredentialParameters)
  {
    this.client = new CognitoIdentityProviderClient({region: region})
    this.parameters = parameters
  }

  async clear()
  {
    var listParams = {
      "UserPoolId": this.parameters.userPoolId
   }

   try
   {
     const response = await this.client.send(new ListUsersCommand(listParams))

     for (const user of response.Users!)
     {
       await this.deleteMember(user.Username!)
     }
   }
   catch(error)
   {
     logger.error("Failed to clear member credentials: " + error)
   }

  } 

  private async deleteMember(username: string) {
    const params = {
      Username: username,
      UserPoolId: this.parameters.userPoolId
    }

    try {
      const response = await this.client.send(new AdminDeleteUserCommand(params))
      logger.verbose("deleting user response - " + JSON.stringify(response))
    }
    catch (error) {
      logger.error("Failed to delete member credentials for " + name + " - " + error)
    }
  }

  public async confirmUser(email: string)
  {
    try
    {
      var confirmSignupParams = {
        Username: email,
        UserPoolId: this.parameters.userPoolId
      }
      logger.verbose(confirmSignupParams)
      const response = await this.client.send(new AdminConfirmSignUpCommand(confirmSignupParams))
      logger.verbose("confirmUser response - " + JSON.stringify(response))
    }
    catch(error)
    {
      logger.error("Failed to confirm signup for " + email + " - " + error)
    }

  }

  public async requestIdToken(email: string, password: string)
  {
    let idToken: string | undefined

    var authParams = {
      AuthFlow: "ADMIN_NO_SRP_AUTH",
      ClientId: this.parameters.userPoolMemberClientId,
      UserPoolId: this.parameters.userPoolId,
      AuthParameters: {
          USERNAME: email,
          PASSWORD: password
      }
    }
  
    try{
      const auth2Params = {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: this.parameters.userPoolMemberClientId,
        UserPoolId: this.parameters.userPoolId,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password
        }
      }
      
      logger.verbose("InitiateAuth with "  + JSON.stringify(auth2Params))
      const sessionData = await this.client.send(new InitiateAuthCommand(auth2Params))
      logger.verbose("session " + JSON.stringify(sessionData))
      idToken = sessionData.AuthenticationResult!.IdToken
      logger.verbose("acctok " + idToken)
    }
    catch(error)
    {
      logger.error("Failed to get access token: " + error)
    }

    return idToken
  }
  
  async addMember(email: string, password: string)
  {
    try
    {
      var params = {
        ClientId: this.parameters.userPoolMemberClientId,
        Username: email,
        Password: password
      }
  
      logger.verbose("Signup " + email + " with password " + password)
      logger.verbose(await this.client.send(new SignUpCommand(params)))
    }
    catch(error)
    {
      logger.error("Failed to signup member credentials for " + email + " - " + error)
    }
  }

  async addConfirmedMember(email: string, password: string)
  {
    await this.addMember(email, password)

    await this.confirmUser(email)
  }
}
