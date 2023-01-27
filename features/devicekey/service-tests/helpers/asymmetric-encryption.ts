import { StringAttribute } from "aws-cdk-lib/aws-cognito"
import {publicEncrypt, privateDecrypt, generateKeyPairSync} from "crypto"

export class AsymmetricEncryption
{
  readonly publicKey: string
  private privateKey: string
  private passphrase: string

  constructor(passphrase: string)
  {
    const {publicKey, privateKey} = this.generateKeys(passphrase)
    this.publicKey = publicKey
    this.privateKey = privateKey
    this.passphrase = passphrase

  }
  generateKeys(passphrase: string){
  const {publicKey, privateKey} = generateKeyPairSync('rsa', {
    // modulusLength: 530,
    //   publicKeyEncoding: {
    //      type: 'spki',
    //      format: 'pem'
    //   },
    //   privateKeyEncoding: {
    //      type: 'pkcs8',
    //      format: 'pem',
    //      cipher: 'aes-256-cbc',
    //      passphrase: ''
    //   }
      modulusLength: 530,    // options
      publicExponent: 0x10101,
      publicKeyEncoding: {
        type: 'pkcs1',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: passphrase
      }
    })

    return {publicKey, privateKey}
  }

  encrypt(toEncrypt: string) {
    const buffer = Buffer.from(toEncrypt, 'utf8')
    const encrypted = publicEncrypt(this.publicKey, buffer)
    return encrypted.toString('base64')
  }

  decrypt(toDecrypt: string) {
    const buffer = Buffer.from(toDecrypt, 'base64')
    const decrypted = privateDecrypt(
      {
        key: this.privateKey.toString(),
        passphrase: this.passphrase,
      },
      buffer,
    )
    return decrypted.toString('utf8')
  }
}
