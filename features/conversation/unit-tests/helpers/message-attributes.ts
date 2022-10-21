export interface EncryptedMessage {
  recipientDeviceId: string,
  recipientMemberId: string,
  encryptedMessage: string

}
export interface MessageAttributes {
  id: string
  dateTime: string
  conversationId: string
  encryptions: EncryptedMessage[]
}


  