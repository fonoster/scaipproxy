/**
 * @author Pedro Sanders
 * @since v1
 */
const {
  getExpires,
  isBehindNat
} = require('@scaipproxy/core/processor/processor_utils')
const isEmpty = require('@scaipproxy/utils/obj_util')
const config = require('@scaipproxy/core/config_util')()

const ViaHeader = Java.type('javax.sip.header.ViaHeader')
const ContactHeader = Java.type('javax.sip.header.ContactHeader')
const FromHeader = Java.type('javax.sip.header.FromHeader')
const SipFactory = Java.type('javax.sip.SipFactory')
const addressFactory = SipFactory.getInstance().createAddressFactory()
const LogManager = Java.type('org.apache.logging.log4j.LogManager')
const LOG = LogManager.getLogger()

function getNonceCount (d) {
  const h = Java.type('java.lang.Integer').toHexString(d)
  const cSize = 8 - h.toString().length
  let nc = ''
  let cnt = 0

  while (cSize > cnt) {
    nc += '0'
    cnt++
  }

  return nc + h
}

function useInternalInterface (request) {
  const viaHeader = request.getHeader(ViaHeader.NAME)
  return (
    config.spec.registrarIntf.equalsIgnoreCase('Internal') ||
    viaHeader.getTransport().equalsIgnoreCase('udp')
  )
}

function getUpdatedContactURI (request, user) {
  const contactHeader = request.getHeader(ContactHeader.NAME)
  const contactURI = contactHeader.getAddress().getURI()
  const viaHeader = request.getHeader(ViaHeader.NAME)

  if (user.kind.equalsIgnoreCase('peer') && !isEmpty(user.spec.contactAddr)) {
    if (user.spec.contactAddr.contains(':')) {
      contactURI.setHost(user.spec.contactAddr.split(':')[0])
      contactURI.setPort(user.spec.contactAddr.split(':')[1])
    } else {
      contactURI.setHost(user.spec.contactAddr)
    }
  } else if (useInternalInterface(request)) {
    if (viaHeader.getReceived() !== null) {
      contactURI.setHost(viaHeader.getReceived())
    }

    if (viaHeader.getRPort() !== -1) {
      contactURI.setPort(viaHeader.getRPort())
    }
  }
  return contactURI
}

class RegistrarUtils {
  static getHost (r) {
    return r
      .getHeader(FromHeader.NAME)
      .getAddress()
      .getURI()
      .getHost()
  }

  static generateAors (request, user) {
    const contactHeader = request.getHeader(ContactHeader.NAME)
    const contactURI = contactHeader.getAddress().getURI()
    const aors = []

    if (user.kind.equalsIgnoreCase('peer')) {
      const peerHost = isEmpty(user.spec.device)
        ? this.getHost(request)
        : user.spec.device
      const addressOfRecord = addressFactory.createSipURI(
        user.spec.credentials.username,
        peerHost
      )
      addressOfRecord.setSecure(contactURI.isSecure())
      aors.push(addressOfRecord.toString())
    } else {
      user.spec.domains.forEach(domain => {
        const addressOfRecord = addressFactory.createSipURI(
          user.spec.credentials.username,
          domain
        )
        addressOfRecord.setSecure(contactURI.isSecure())
        aors.push(addressOfRecord.toString())
      })
    }
    return aors
  }

  // TODO: Please consolidate all the route builders :(
  static buildRoute (addressOfRecord, request, user) {
    const viaHeader = request.getHeader(ViaHeader.NAME)
    return {
      addressOfRecord: addressOfRecord,
      isLinkAOR: false,
      thruGw: false,
      sentByAddress: viaHeader.getHost(),
      sentByPort: viaHeader.getPort() === -1 ? 5060 : viaHeader.getPort(),
      received: viaHeader.getReceived(),
      rport: viaHeader.getRPort(),
      contactURI: getUpdatedContactURI(request, user),
      registeredOn: Date.now(),
      expires: getExpires(request),
      nat: isBehindNat(request)
    }
  }

  static buildAuthHeader (user, authHeader, method) {
    return {
      username: user.spec.credentials.username,
      secret: user.spec.credentials.secret,
      realm: authHeader.getRealm(),
      nonce: authHeader.getNonce(),
      // For some weird reason the interface value is an int while the value original value is a string
      nc: getNonceCount(authHeader.getNonceCount()),
      cnonce: authHeader.getCNonce(),
      uri: authHeader.getURI().toString(),
      method,
      qop: authHeader.getQop(),
      response: authHeader.getResponse(),
      opaque: authHeader.getOpaque()
    }
  }
}

module.exports = RegistrarUtils
