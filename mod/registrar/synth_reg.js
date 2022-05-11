/**
 * @author Pedro Sanders
 * @since v1
 */
const postal = require('postal')
const DSSelector = require('@scaipproxy/data_api/ds_selector')
const AgentsAPI = require('@scaipproxy/data_api/agents_api')
const FromHeader = Java.type('javax.sip.header.FromHeader')
const ToHeader = Java.type('javax.sip.header.ToHeader')
const LogManager = Java.type('org.apache.logging.log4j.LogManager')
const ViaHeader = Java.type('javax.sip.header.ViaHeader')
const SipFactory = Java.type('javax.sip.SipFactory')
const { isBehindNat } = require('@scaipproxy/core/processor/processor_utils')

const LOG = LogManager.getLogger()

// Experimental feature to cover SCAIP protocol
class SynthRegistrar {
  constructor () {
    this.agentsAPI = new AgentsAPI(DSSelector.getDS())
    this.headerFactory = SipFactory.getInstance().createHeaderFactory()
    this.addressFactory = SipFactory.getInstance().createAddressFactory()
  }

  register (r) {
    const request = r.clone()
    const username = request
      .getHeader(FromHeader.NAME)
      .getAddress()
      .getURI()
      .getUser()
    // We need the host from the To header
    // because the From doesn't have a FQDN
    const host = request
      .getHeader(ToHeader.NAME)
      .getAddress()
      .getURI()
      .getHost()
    const aor = `sip:${username}@${host}`

    this.addEndpoint(aor, request)
    return true
  }

  addEndpoint (aor, request) {
    postal.publish({
      channel: 'locator',
      topic: 'endpoint.add',
      data: {
        addressOfRecord: aor,
        route: this.buildRoute(aor, request)
      }
    })
  }

  buildRoute (addressOfRecord, request) {
    const viaHeader = request.getHeader(ViaHeader.NAME)
    return {
      addressOfRecord,
      isLinkAOR: false,
      thruGw: false,
      sentByAddress: viaHeader.getHost(),
      sentByPort: viaHeader.getPort() === -1 ? 5060 : viaHeader.getPort(),
      received: viaHeader.getReceived(),
      rport: viaHeader.getRPort(),
      contactURI: this.createContactURI(request),
      registeredOn: Date.now(),
      expires: 30,
      nat: isBehindNat(request)
    }
  }

  createContactURI (request) {
    const username = request
      .getHeader(FromHeader.NAME)
      .getAddress()
      .getURI()
      .getUser()
    const viaHeader = request.getHeader(ViaHeader.NAME)

    const contactAddress = this.addressFactory.createAddress(
      `sip:${username}@${viaHeader.getReceived()}:${viaHeader.getRPort()}`
    )
    const contactHeader = this.headerFactory.createContactHeader(contactAddress)
    return contactHeader.getAddress().getURI()
  }
}

module.exports = SynthRegistrar
