import { MemberCredentialsAccessor} from "./member-credentials-accessor"
import logger from "./service-test-logger"
import { v4 as uuidv4 } from "uuid"

export class FakeMemberDevice
{
  memberCredentials: MemberCredentialsAccessor
  email:  string
  password: string
  readonly deviceId: string
  readonly memberId: string

  
  constructor(memberCredentials: MemberCredentialsAccessor)
  {
    this.memberCredentials = memberCredentials
    this.deviceId = uuidv4()
    this.memberId = uuidv4()
  }

  withName(name: string)
  {
    this.email = this.generateEmailFromName(name)
    return this
  }

  async authenticatedWithPassword(password: string)
  {
    this.password = password
    await this.memberCredentials.addConfirmedMember(this.email!, password)
  }

  private generateEmailFromName(enteredName: string): string {
    return enteredName.replace(/ /g, ".") + "@gmail.com"
  }
}





