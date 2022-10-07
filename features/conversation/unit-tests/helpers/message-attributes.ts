export interface EncryptedMessage {
  recipientDeviceId: string,
  recipientMemberId: string,
  message: string

}
export interface MessageAttributes {
  id: string
  date: string
  encryptions: EncryptedMessage[]
}


  