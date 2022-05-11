/**
 * @author Pedro Sanders
 * @since v1
 */
const postal = require('postal')
const Registrar = require('@scaipproxy/registrar/registrar')
const {
  sendOk,
  sendUnauthorized,
  getExpires
} = require('@scaipproxy/core/processor/processor_utils')

const ToHeader = Java.type('javax.sip.header.ToHeader')
const ContactHeader = Java.type('javax.sip.header.ContactHeader')

class RegisterHandler {
  constructor () {
    this.registrar = new Registrar()
  }

  doProcess (transaction) {
    const request = transaction.getRequest()
    // See: Removing bindings -> https://tools.ietf.org/html/rfc3261#section-10.2.2
    if (getExpires(request) <= 0) {
      const contactHeader = request.getHeader(ContactHeader.NAME)
      const toHeader = request.getHeader(ToHeader.NAME)
      const addressOfRecord = toHeader.getAddress().getURI()

      postal.publish({
        channel: 'locator',
        topic: 'endpoint.remove',
        data: {
          addressOfRecord: addressOfRecord,
          contactURI: contactHeader
            .getAddress()
            .getURI()
            .toString(),
          isWildcard: contactHeader.getAddress().isWildcard()
        }
      })

      sendOk(transaction)
    } else {
      this.registrar.register(request)
        ? sendOk(transaction)
        : sendUnauthorized(transaction)
    }
  }
}

module.exports = RegisterHandler
