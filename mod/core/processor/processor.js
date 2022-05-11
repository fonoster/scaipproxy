/**
 * @author Pedro Sanders
 * @since v1
 */
const config = require('@scaipproxy/core/config_util')()
const RequestProcessor = require('@scaipproxy/core/processor/request_processor')
const ResponseProcessor = require('@scaipproxy/core/processor/response_processor')
const SipListener = Java.type('javax.sip.SipListener')
const ToHeader = Java.type('javax.sip.header.ToHeader')
const FromHeader = Java.type('javax.sip.header.FromHeader')
const CallIdHeader = Java.type('javax.sip.header.CallIdHeader')
const UserAgentHeader = Java.type('javax.sip.header.UserAgentHeader')
const TelemetryClient = Java.type(
  'com.microsoft.applicationinsights.TelemetryClient'
)
const HashMap = Java.type('java.util.HashMap')
const LogManager = Java.type('org.apache.logging.log4j.LogManager')
const LOG = LogManager.getLogger()

const telemetryClient = new TelemetryClient()
const toCamelCase = str =>
  str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase()

const trackRequestEvent = request => {
  const eventProperties = new HashMap()
  eventProperties.put('SipServerVersion', config.system.version)
  eventProperties.put(
    'SipCallId',
    request.getHeader(CallIdHeader.NAME).getCallId()
  )
  eventProperties.put(
    'SipTo',
    request
      .getHeader(FromHeader.NAME)
      .getAddress()
      .getURI()
  )
  eventProperties.put(
    'SipFrom',
    request
      .getHeader(ToHeader.NAME)
      .getAddress()
      .getURI()
  )

  const userAgent = request.getHeader(UserAgentHeader.NAME)
  if (userAgent) {
    eventProperties.put('SipUserAgent', userAgent.getProduct().next())
  } else {
    eventProperties.put('SipUserAgent', 'Unknown')
  }
  const eventName =
    'ScaipProxyRequest' + toCamelCase(request.getMethod().toString())
  telemetryClient.trackEvent(eventName, eventProperties, null)
}

const trackResponseEvent = response => {
  const eventProperties = new HashMap()
  eventProperties.put(
    'SipCallId',
    response.getHeader(CallIdHeader.NAME).getCallId()
  )
  eventProperties.put(
    'SipTo',
    response
      .getHeader(FromHeader.NAME)
      .getAddress()
      .getURI()
  )
  eventProperties.put(
    'SipFrom',
    response
      .getHeader(ToHeader.NAME)
      .getAddress()
      .getURI()
  )
  if (response.getHeader(UserAgentHeader.NAME)) {
    eventProperties.put(
      'SipUserAgent',
      response
        .getHeader(UserAgentHeader.NAME)
        .getProduct()
        .next()
    )
  }
  const eventName = 'ScaipProxyResponse' + response.getStatusCode()
  telemetryClient.trackEvent(eventName, eventProperties, null)
}

class Processor {
  constructor (sipProvider, dataAPIs, contextStorage) {
    this.requestProcessor = new RequestProcessor(
      sipProvider,
      dataAPIs,
      contextStorage
    )
    this.responseProcessor = new ResponseProcessor(sipProvider, contextStorage)
  }

  get listener () {
    return new SipListener({
      processRequest: event => {
        try {
          const startTime = System.currentTimeMillis()
          this.requestProcessor.process(event)
          const endTime = System.currentTimeMillis()
          const metricName = `sip.scaipproxy.request.${event
            .getRequest()
            .getMethod()
            .toLowerCase()}.duration`
          telemetryClient.trackMetric(metricName, endTime - startTime)
          trackRequestEvent(event.getRequest())
        } catch (e) {
          LOG.error(e.message | e)
        }
      },

      processResponse: event => {
        try {
          const startTime = System.currentTimeMillis()
          this.responseProcessor.process(event)
          const endTime = System.currentTimeMillis()
          const metricName = `sip.scaipproxy.response.${event
            .getResponse()
            .getStatusCode()}.duration`
          telemetryClient.trackMetric(metricName, endTime - startTime)
          trackResponseEvent(event.getResponse())
        } catch (e) {
          LOG.error(e.message | e)
        }
      },

      processTimeout: event => {
        LOG.verbose('Entered processTimeout')
      },

      processTransactionTerminated: event => {
        LOG.verbose('Entered processTransactionTerminated')
      },

      processIOException: event => {
        telemetryClient.trackException(event)
        LOG.verbose('Entered processIOException')
      },

      processDialogTerminated: event => {
        LOG.verbose('Entered processDialogTerminated')
      }
    })
  }
}

module.exports = Processor
