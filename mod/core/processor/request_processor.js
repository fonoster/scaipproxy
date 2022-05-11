/**
 * @author Pedro Sanders
 * @since v1
 */
const {
  sendResponse,
  sendUnauthorized
} = require('@scaipproxy/core/processor/processor_utils')
const RegisterHandler = require('@scaipproxy/core/processor/register_handler')
const RequestHandler = require('@scaipproxy/core/processor/request_handler')
const config = require('@scaipproxy/core/config_util')()
const FromHeader = Java.type('javax.sip.header.FromHeader')
const ViaHeader = Java.type('javax.sip.header.ViaHeader')
const SynthRegistrar = require('@scaipproxy/registrar/synth_reg')
const Registrar = require('@scaipproxy/registrar/registrar')
const Locator = require('@scaipproxy/location/locator')

const Request = Java.type('javax.sip.message.Request')
const Response = Java.type('javax.sip.message.Response')
const LogManager = Java.type('org.apache.logging.log4j.LogManager')
const LOG = LogManager.getLogger()

// Experimental features
const isEssenceMessage = r => r.getHeader(FromHeader.NAME).getTag() === '286524'
const isClimaxDevice = r =>
  r.getHeader(ViaHeader.NAME).getBranch() === 'z9hG4bK-0001'
const getXMLValue = (tagName, xmlStr) => {
  var tagValue = xmlStr.substring(
    xmlStr.lastIndexOf(tagName) + tagName.length,
    xmlStr.lastIndexOf(tagName.replace('<', '</'))
  )
  return tagValue
}

class RequestProcessor {
  constructor (sipProvider, dataAPIs, contextStorage) {
    this.sipProvider = sipProvider
    this.contextStorage = contextStorage
    this.dataAPIs = dataAPIs
    this.domainsAPI = dataAPIs.DomainsAPI
    this.synthRegistrar = new SynthRegistrar()
    this.registrar = new Registrar()
    this.messageHandler = new RequestHandler(
      this.sipProvider,
      this.contextStorage,
      new Locator()
    )
    this.registerHandler = new RegisterHandler()
  }

  process (event) {
    const request = event.getRequest()
    let transaction = event.getServerTransaction()

    if (
      transaction === null &&
      request.getMethod().equals(Request.ACK) === false
    ) {
      transaction = this.sipProvider.getNewServerTransaction(request)
    }

    LOG.debug(
      `core.processor.RequestProcessor.process [running handler for method \`${request.getMethod()}\`]`
    )

    switch (request.getMethod()) {
      case Request.MESSAGE:
        if (isClimaxDevice(request)) {
          // Get user from payload
          const user = getXMLValue(
            '<cid>',
            String.fromCharCode.apply(null, request.getContent())
          )
          // Update requrest to allow consistent messaging
          const fromHeader = request.getHeader(FromHeader.NAME)
          const address = fromHeader.getAddress()
          const uri = address.getURI()
          uri.setUser(user)
          address.setURI(uri)
          fromHeader.setAddress(address)
          request.setHeader(fromHeader)
          // Request sythetic registration since device doesn't
          // know how to REGISTEr
          this.synthRegistrar.register(request)
        } else if (isEssenceMessage(request)) {
          // Check if message is authenticated
          if (config.spec.ex_scaipAuthEnabled) {
            LOG.debug(
              `core.processor.RequestProcessor.process [scaip auth provider = ${config.spec.ex_scaipAuthProvider.toLowerCase()}]`
            )

            if (!this.registrar.isAuthorized(request)) {
              sendUnauthorized(transaction)
              break
            }
          }
          this.synthRegistrar.register(request)
        }
        this.messageHandler.doProcess(transaction, request, null)
        break
      case Request.REGISTER:
        this.registerHandler.doProcess(transaction)
        break
      default:
        sendResponse(transaction, Response.METHOD_NOT_ALLOWED)
    }
  }
}

module.exports = RequestProcessor
