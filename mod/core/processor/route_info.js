/**
 * @author Pedro Sanders
 * @since v1
 */
const { RouteEntityType } = require('@scaipproxy/core/route_entity_type')
const { RoutingType } = require('@scaipproxy/core/routing_type')
const { Status } = require('@scaipproxy/core/status')
const config = require('@scaipproxy/core/config_util')()

const ToHeader = Java.type('javax.sip.header.ToHeader')
const FromHeader = Java.type('javax.sip.header.FromHeader')
const StringUtils = Java.type('org.apache.commons.lang3.StringUtils')
const SipFactory = Java.type('javax.sip.SipFactory')
const addressFactory = SipFactory.getInstance().createAddressFactory()

class RouteInfo {
  constructor (request, dataAPIs) {
    const fromHeader = request.getHeader(FromHeader.NAME)
    const toHeader = request.getHeader(ToHeader.NAME)
    const sipFactory = SipFactory.getInstance()
    this.request = request
    this._callerUser = fromHeader
      .getAddress()
      .getURI()
      .getUser()
    this._callerHost = fromHeader
      .getAddress()
      .getURI()
      .getHost()
    this._calleeUser = toHeader
      .getAddress()
      .getURI()
      .getUser()
    this._calleeHost = toHeader
      .getAddress()
      .getURI()
      .getHost()

    // Overwrites callee info if addressInfo is present
    if (config.spec.addressInfo) {
      const callee = RouteInfo.getCalleeFromAddressInfo(
        request,
        config.spec.addressInfo
      )
      this._calleeUser = callee.user
      this._calleeHost = callee.host
    }

    this.peersAPI = dataAPIs.PeersAPI
    this.domainsAPI = dataAPIs.DomainsAPI
    this.agentsAPI = dataAPIs.AgentsAPI
  }

  static getCalleeFromAddressInfo (request, addressInfo) {
    const callee = {}
    for (const x in addressInfo) {
      let info = addressInfo[x]
      if (!!request.getHeader(info)) {
        let v = request.getHeader(info).getValue()
        if (/sips?:.*@.*/.test(v)) {
          const calleeURI = addressFactory.createURI(v)
          callee.user = calleeURI.getUser()
          callee.host = calleeURI.getHost()
          break
        }
        LOG.error(`Invalid address: ${v}`)
      }
    }
    return callee
  }

  getRoutingType () {
    let routingType = RoutingType.UNKNOWN
    const callerType = this.getCallerType()
    const calleetype = this.getCalleeType()
    const belongToSameDomain = this.isSameDomain()

    if (
      callerType === RouteEntityType.AGENT &&
      calleetype === RouteEntityType.AGENT &&
      belongToSameDomain
    )
      routingType = RoutingType.INTRA_DOMAIN_ROUTING
    if (
      callerType === RouteEntityType.AGENT &&
      calleetype === RouteEntityType.PEER &&
      belongToSameDomain
    )
      routingType = RoutingType.INTRA_DOMAIN_ROUTING

    if (
      callerType === RouteEntityType.AGENT &&
      calleetype === RouteEntityType.AGENT &&
      !belongToSameDomain
    )
      routingType = RoutingType.INTER_DOMAIN_ROUTING
    if (
      callerType === RouteEntityType.AGENT &&
      calleetype === RouteEntityType.PEER &&
      !belongToSameDomain
    )
      routingType = RoutingType.INTER_DOMAIN_ROUTING
    if (
      callerType === RouteEntityType.PEER &&
      calleetype === RouteEntityType.AGENT &&
      !belongToSameDomain
    )
      routingType = RoutingType.INTER_DOMAIN_ROUTING
    if (
      callerType === RouteEntityType.PEER &&
      calleetype === RouteEntityType.AGENT &&
      belongToSameDomain
    )
      routingType = RoutingType.INTRA_DOMAIN_ROUTING

    return routingType
  }

  getRouteEntityType (domain, entity) {
    let entityType = RouteEntityType.UNKNOWN

    if (this.agentsAPI.agentExist(domain, entity)) {
      entityType = RouteEntityType.AGENT
    } else if (this.peersAPI.peerExist(entity)) {
      entityType = RouteEntityType.PEER
    }
    return entityType
  }

  getCallee () {
    const response = this.agentsAPI.getAgentByDomain(
      this.calleeDomain,
      this.calleeUser
    )
    return response.status === Status.OK ? response.data : null
  }

  getCallerType () {
    return this.getRouteEntityType(this.callerDomain, this.callerUser)
  }

  getCalleeType () {
    return this.getRouteEntityType(this.calleeDomain, this.calleeUser)
  }

  isSameDomain () {
    return this.callerDomain === this.calleeDomain
  }

  isLocalDomain () {
    return this.domainsAPI.domainExist(this.callerDomain)
  }

  get callerUser () {
    return this._callerUser
  }

  get callerDomain () {
    return this._callerHost
  }

  get calleeUser () {
    return this._calleeUser
  }

  get calleeDomain () {
    return this._calleeHost
  }
}

module.exports = RouteInfo
