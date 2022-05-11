/**
 * @author Pedro Sanders
 * @since v1
 */
const { connectionException } = require('@scaipproxy/utils/exception_helpers')
const { sendResponse } = require('@scaipproxy/core/processor/processor_utils')
const { Status } = require('@scaipproxy/core/status')
const config = require('@scaipproxy/core/config_util')()

const {
  getAdvertisedAddr,
  configureRoute,
  configureVia,
  configureProxyAuthorization,
  configureRequestURI,
  configureMaxForwards,
  configureRecordRoute,
  isInDialog
} = require('@scaipproxy/core/processor/request_utils')
const Request = Java.type('javax.sip.message.Request')
const Response = Java.type('javax.sip.message.Response')
const ViaHeader = Java.type('javax.sip.header.ViaHeader')
const ToHeader = Java.type('javax.sip.header.ToHeader')
const LocatorUtils = require('@scaipproxy/location/utils')

class RequestHandler {
  constructor (sipProvider, contextStorage, locator) {
    this.sipProvider = sipProvider
    this.contextStorage = contextStorage
    this.locator = locator
  }

  doProcess (transaction, request, routeInfo) {
    let requestURI = request.getRequestURI()
    const toURI = request
      .getHeader(ToHeader.NAME)
      .getAddress()
      .getURI()

    // If the requestURI has the form sip:host and the config.spec.patchRequestURI flag
    // is activated, then the server will add the user part of the toHeader as the user for the
    // requestURI
    if (config.spec.patchRequestURI && !requestURI.getUser()) {
      requestURI.setUser(toURI.getUser())
      request.setRequestURI(requestURI)
    }

    const aor = config.spec.useToAsAOR ? toURI : requestURI

    if (isInDialog(request)) {
      this.processRoute(transaction, request, null, routeInfo)
    } else {
      const response = this.locator.findEndpoint(LocatorUtils.aorAsString(aor))

      if (response.status == Status.NOT_FOUND) {
        return sendResponse(transaction, Response.TEMPORARILY_UNAVAILABLE)
      }

      this.processRoute(transaction, request, response.data, routeInfo)
    }
  }

  processRoute (transaction, request, route, routeInfo) {
    const transport = request
      .getHeader(ViaHeader.NAME)
      .getTransport()
      .toLowerCase()

    const lp = this.sipProvider.getListeningPoint(transport)
    const localAddr = { host: lp.getIPAddress().toString(), port: lp.getPort() }

    const advertisedAddr = getAdvertisedAddr(request, route, localAddr)

    let requestOut = configureMaxForwards(request)
    requestOut = configureProxyAuthorization(requestOut)
    requestOut = configureRoute(requestOut, localAddr)
    requestOut = configureVia(requestOut, advertisedAddr)

    if (!isInDialog(request)) {
      requestOut = configureRequestURI(requestOut, routeInfo, route)
      requestOut = configureRecordRoute(requestOut, advertisedAddr, localAddr)
    }

    this.sendRequest(transaction, request, requestOut)
  }

  sendRequest (serverTransaction, request, requestOut) {
    // Does not need a transaction
    if (request.getMethod().equals(Request.ACK)) {
      return this.sipProvider.sendRequest(requestOut)
    }
    try {
      // The request must be cloned or the stack will not fork the call
      const clientTransaction = this.sipProvider.getNewClientTransaction(
        requestOut.clone()
      )
      clientTransaction.sendRequest()
    } catch (e) {
      connectionException(e, requestOut.getRequestURI().getHost())
    }
  }
}

module.exports = RequestHandler
