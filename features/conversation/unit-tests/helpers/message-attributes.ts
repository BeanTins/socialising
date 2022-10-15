export interface EncryptedMessage {
  recipientDeviceId: string,
  recipientMemberId: string,
  message: string

}
export interface MessageAttributes {
  id: string
  dateTime: string
  conversationId: string
  encryptions: EncryptedMessage[]
}


  