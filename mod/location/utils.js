/**
 * @author Pedro Sanders
 * @since v1
 */
const { buildAddr, fixPort } = require('@routr/utils/misc_utils')
const StringBuilder = Java.type('java.lang.StringBuilder')
const SipFactory = Java.type('javax.sip.SipFactory')
const addressFactory = SipFactory.getInstance().createAddressFactory()

class LocatorUtils {
  static getPort (uri) {
    const uriObj = LocatorUtils.aorAsObj(uri)
    return fixPort(uriObj.getPort())
  }

  static expiredRouteFilter (r) {
    const elapsed = (Date.now() - r.registeredOn) / 1000
    return r.expires - elapsed <= 0
  }

  static sameSourceFilter (r1, r2) {
    return r1.received === r2.received && r1.sentByPort === r2.sentByPort
  }

  static contactURIFilter (c1, c2) {
    return c1 === c2
  }

  static aorAsString (addressOfRecord) {
    if (addressOfRecord instanceof Java.type('javax.sip.address.SipURI')) {
      const strBuilder = new StringBuilder(
        addressOfRecord.isSecure() ? 'sips:' : 'sip:'
      )

      if (addressOfRecord.getUser()) {
        strBuilder.append(addressOfRecord.getUser()).append('@')
      }

      return strBuilder.append(addressOfRecord.getHost()).toString()
    } else if (
      addressOfRecord instanceof Java.type('javax.sip.address.TelURL')
    ) {
      return 'tel:' + addressOfRecord.getPhoneNumber()
    } else if (
      typeof addressOfRecord === 'string' ||
      addressOfRecord instanceof String
    ) {
      if (
        /sips?:.*@.*/.test(addressOfRecord) ||
        /tel:\d+/.test(addressOfRecord)
      ) {
        return addressOfRecord
      }
    }
  }

  static aorAsObj (addressOfRecord) {
    const addr = addressOfRecord.split('sip:')[1].split('@')
    return addressFactory.createSipURI(addr[0], addr[1])
  }

  static buildEgressRoute (addressOfRecord, gateway, number, domain) {
    const username = gateway.spec.credentials
      ? gateway.spec.credentials.username
      : null
    const route = {
      addressOfRecord: addressOfRecord,
      isLinkAOR: false,
      thruGw: true,
      gwUsername: username,
      gwRef: gateway.metadata.ref,
      gwHost: buildAddr(gateway.spec.host, gateway.spec.port),
      numberRef: number.metadata.ref,
      number: number.spec.location.telUrl.split(':')[1],
      expires: -1
    }
    if (domain) {
      route.rule = domain.spec.context.egressPolicy.rule
    }
    return route
  }
}

module.exports = LocatorUtils
