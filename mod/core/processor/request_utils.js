const LocatorUtils = require('@scaipproxy/location/utils')
const { isLocalnet } = require('@scaipproxy/core/ip_util')
const { fixPort } = require('@scaipproxy/utils/misc_utils')
const config = require('@scaipproxy/core/config_util')()
const Request = Java.type('javax.sip.message.Request')
const ContactHeader = Java.type('javax.sip.header.ContactHeader')
const RouteHeader = Java.type('javax.sip.header.RouteHeader')
const CSeqHeader = Java.type('javax.sip.header.CSeqHeader')
const ViaHeader = Java.type('javax.sip.header.ViaHeader')
const ToHeader = Java.type('javax.sip.header.ToHeader')
const FromHeader = Java.type('javax.sip.header.FromHeader')
const MaxForwardsHeader = Java.type('javax.sip.header.MaxForwardsHeader')
const SipFactory = Java.type('javax.sip.SipFactory')
const headerFactory = SipFactory.getInstance().createHeaderFactory()
const addressFactory = SipFactory.getInstance().createAddressFactory()

const isExternalDevice = r =>
  r && (!r.sentByAddress || r.sentByAddress.endsWith('.invalid'))
const isPublicAddress = h => !isLocalnet(config.spec.localnets, h)
const needsExternAddress = (route, host) =>
  isExternalDevice(route) || isPublicAddress(host)
const addrHost = a => (a.contains(':') ? a.split(':')[0] : a)
const addrPort = (a, p) => (a.contains(':') ? a.split(':')[1] : p.port)
const ownedAddresss = localAddr =>
  config.spec.externAddr
    ? [
        localAddr,
        {
          host: addrHost(config.spec.externAddr),
          port: addrPort(config.spec.externAddr, localAddr)
        }
      ]
    : [localAddr]
const getAdvertisedAddr = (request, route, localAddr) => {
  // After the initial invite the route object will be null
  // and we need to the the target address from the request uri.
  // If the routing is type IDR the initial request uri will be a local
  // domain and the isLocalnet function will return a wrong result.
  /*const targetAddr =
    route && route.contactURI
      ? LocatorUtils.aorAsObj(route.contactURI).getHost()
      : request.getRequestURI().getHost()*/
  const targetAddr = request.getRequestURI().getHost()
  const externAddr = config.spec.externAddr
  return config.spec.externAddr && needsExternAddress(route, targetAddr)
    ? { host: addrHost(externAddr), port: addrPort(externAddr, localAddr) }
    : localAddr
}
const configureMaxForwards = request => {
  const requestOut = request.clone()
  const maxForwardsHeader = requestOut.getHeader(MaxForwardsHeader.NAME)
  maxForwardsHeader.decrementMaxForwards()
  return requestOut
}
const configureContact = request => {
  const requestOut = request.clone()
  const contactHeader = requestOut.getHeader(ContactHeader.NAME)
  if (
    contactHeader &&
    config.spec.externAddr &&
    isPublicAddress(requestOut.getRequestURI().getHost())
  ) {
    contactHeader
      .getAddress()
      .getURI()
      .setHost(config.spec.externAddr)
    requestOut.setHeader(contactHeader)
  }
  return requestOut
}
const configureCSeq = request => {
  const requestOut = request.clone()
  // Lower the cseq to match the original request
  if (requestOut.getMethod().equals(Request.INVITE)) {
    const cseq = requestOut.getHeader(CSeqHeader.NAME).getSeqNumber() - 1
    requestOut.getHeader(CSeqHeader.NAME).setSeqNumber(cseq)
  }
  return requestOut
}
const configureProxyAuthorization = request => {
  const requestOut = request.clone()
  requestOut.removeHeader('Proxy-Authorization')
  return requestOut
}
const configureRoute = (request, localAddr) => {
  const requestOut = request.clone()
  const routeHeader = request.getHeader(RouteHeader.NAME)
  if (routeHeader) {
    const host = routeHeader
      .getAddress()
      .getURI()
      .getHost()
    const port = fixPort(
      routeHeader
        .getAddress()
        .getURI()
        .getPort()
    )
    const c = ownedAddresss(localAddr, config.spec.externAddr).filter(
      a => a.host === host && a.port === port
    ).length
    if (c > 0) {
      requestOut.removeFirst(RouteHeader.NAME)
      requestOut.removeFirst(RouteHeader.NAME)
    }
  }
  return requestOut
}
const configureVia = (request, advertisedAddr) => {
  const requestOut = request.clone()
  const transport = requestOut
    .getHeader(ViaHeader.NAME)
    .getTransport()
    .toLowerCase()
  const viaHeader = headerFactory.createViaHeader(
    advertisedAddr.host,
    advertisedAddr.port,
    transport,
    null
  )
  viaHeader.setRPort()
  requestOut.addFirst(viaHeader)
  return requestOut
}
const configureRecordRoute = (request, advertisedAddr, localAddr) => {
  const requestOut = request.clone()
  if (config.spec.recordRoute) {
    const p1 = addressFactory.createSipURI(null, localAddr.host)
    p1.setLrParam()
    p1.setPort(localAddr.port)
    const pa1 = addressFactory.createAddress(p1)
    const rr1 = headerFactory.createRecordRouteHeader(pa1)
    requestOut.addHeader(rr1)

    if (config.spec.externAddr && isPublicAddress(advertisedAddr.host)) {
      const p2 = addressFactory.createSipURI(
        null,
        addrHost(config.spec.externAddr)
      )
      p2.setLrParam()
      p2.setPort(addrPort(config.spec.externAddr, localAddr))
      const pa2 = addressFactory.createAddress(p2)
      const rr2 = headerFactory.createRecordRouteHeader(pa2)
      requestOut.addFirst(rr2)
    }
  }
  return requestOut
}
const configureRequestURI = (request, routeInfo, route) => {
  const requestOut = request.clone()
  requestOut.setRequestURI(LocatorUtils.aorAsObj(route.contactURI))
  return requestOut
}
const isInDialog = request =>
  request.getHeader(ToHeader.NAME).getTag() !== null &&
  request.getHeader(FromHeader.NAME).getTag() !== null

module.exports.getAdvertisedAddr = getAdvertisedAddr
module.exports.configureRoute = configureRoute
module.exports.configureVia = configureVia
module.exports.configureProxyAuthorization = configureProxyAuthorization
module.exports.configureRequestURI = configureRequestURI
module.exports.configureMaxForwards = configureMaxForwards
module.exports.configureContact = configureContact
module.exports.configureRecordRoute = configureRecordRoute
module.exports.configureCSeq = configureCSeq
module.exports.isInDialog = isInDialog
