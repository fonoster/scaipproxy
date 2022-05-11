/**
 * @author Pedro Sanders
 * @since v1
 */
const postal = require('postal')
const AuthHelper = require('@routr/utils/auth_helper')
const { Status } = require('@routr/core/status')
const RegistrarUtils = require('@routr/registrar/utils')

const DSSelector = require('@routr/data_api/ds_selector')
const AgentsAPI = require('@routr/data_api/agents_api')
const PeersAPI = require('@routr/data_api/peers_api')
const AuthorizationHeader = Java.type('javax.sip.header.AuthorizationHeader')
const LogManager = Java.type('org.apache.logging.log4j.LogManager')
const FromHeader = Java.type('javax.sip.header.FromHeader')
const checkAuthorization = require('@routr/core/processor/auth_util')

const LOG = LogManager.getLogger()

class Registrar {
  constructor () {
    this.peersAPI = new PeersAPI(DSSelector.getDS())
    this.agentsAPI = new AgentsAPI(DSSelector.getDS())
  }

  register (request) {
    if (this.isAuthorized(request) || checkAuthorization(request)) {
      const uri = request
        .getHeader(FromHeader.NAME)
        .getAddress()
        .getURI()
      this.addEndpoint(uri.toString(), request)
      return true
    }
    return false
  }

  addEndpoint (addressOfRecord, request) {
    postal.publish({
      channel: 'locator',
      topic: 'endpoint.add',
      data: {
        addressOfRecord,
        route: RegistrarUtils.buildRoute(addressOfRecord, request)
      }
    })
  }

  getUserFromAPI (request) {
    const authHeader = request.getHeader(AuthorizationHeader.NAME)
    const host = authHeader.getRealm()
    const username = authHeader.getUsername()
    let response = this.agentsAPI.getAgent(host, username)

    if (response.status === Status.OK) {
      return response.data
    } else {
      response = this.peersAPI.getPeerByUsername(username)

      if (response.status === Status.OK) {
        return response.data
      }
    }

    LOG.debug(
      `registrar.Registrar.getUserFromAPI [Can't authenticate user => ${username} from ${host}]`
    )

    return null
  }

  isAuthorized (request) {
    const authHeader = request.getHeader(AuthorizationHeader.NAME)

    if (authHeader === null) {
      return false
    }

    const user = this.getUserFromAPI(request)

    if (user === null) {
      return false
    }

    const aHeaderJson = RegistrarUtils.buildAuthHeader(
      user,
      authHeader,
      request.getMethod()
    )
    return AuthHelper.calcFromHeader(aHeaderJson).equals(
      authHeader.getResponse()
    )
  }
}

module.exports = Registrar
