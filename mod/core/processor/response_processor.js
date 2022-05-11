/**
 * @author Pedro Sanders
 * @since v1
 */
const {
  isStackJob,
  isTransactional
} = require('@scaipproxy/core/processor/processor_utils')
const ViaHeader = Java.type('javax.sip.header.ViaHeader')
const SipFactory = Java.type('javax.sip.SipFactory')
const LogManager = Java.type('org.apache.logging.log4j.LogManager')
const LOG = LogManager.getLogger()
const headerFactory = SipFactory.getInstance().createHeaderFactory()

class ResponseProcessor {
  constructor (sipProvider, contextStorage) {
    this.sipProvider = sipProvider
    this.contextStorage = contextStorage
  }

  process (event) {
    if (isStackJob(event.getResponse())) {
      return
    }
    this.sendResponse(event)
  }

  sendResponse (event) {
    const response = event.getResponse().clone()
    const viaHeader = response.getHeader(ViaHeader.NAME)
    const xReceivedHeader = headerFactory.createHeader(
      'X-Inf-Received',
      viaHeader.getReceived()
    )
    const xRPortHeader = headerFactory.createHeader(
      'X-Inf-RPort',
      `${viaHeader.getRPort()}`
    )
    response.addHeader(xReceivedHeader)
    response.addHeader(xRPortHeader)
    response.removeFirst(ViaHeader.NAME)
    if (isTransactional(event)) {
      if (response.getHeader(ViaHeader.NAME) !== null) {
        this.sipProvider.sendResponse(response)
      }
    } else if (response.getHeader(ViaHeader.NAME) !== null) {
      // Could be a BYE due to Record-Route
      this.sipProvider.sendResponse(response)
    }
    LOG.debug(response)
  }
}

module.exports = ResponseProcessor
