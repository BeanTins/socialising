export interface EncryptedMessage {
  recipientDeviceId: string,
  message: string

}
export interface MessageAttributes {
  id: string
  date: string
  encryptions: EncryptedMessage[]
}


  