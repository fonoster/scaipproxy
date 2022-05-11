/**
 * @author Pedro Sanders
 * @since v1
 */
const postal = require('postal')
const AuthHelper = require('@scaipproxy/utils/auth_helper')
const { Status } = require('@scaipproxy/core/status')
const RegistrarUtils = require('@scaipproxy/registrar/utils')

const DSSelector = require('@scaipproxy/data_api/ds_selector')
const AgentsAPI = require('@scaipproxy/data_api/agents_api')
const PeersAPI = require('@scaipproxy/data_api/peers_api')
const AuthorizationHeader = Java.type('javax.sip.header.AuthorizationHeader')
const LogManager = Java.type('org.apache.logging.log4j.LogManager')

const LOG = LogManager.getLogger()

class Registrar {
  constructor () {
    this.peersAPI = new PeersAPI(DSSelector.getDS())
    this.agentsAPI = new AgentsAPI(DSSelector.getDS())
  }

  register (r) {
    // Prevents any chances of overwriting the original object
    const request = r.clone()
    let user

    if (this.isAuthorized(request)) {
      // Todo: Avoid making this second trip to the API
      user = this.getUserFromAPI(request)
    } else {
      return false
    }

    const aors = RegistrarUtils.generateAors(request, user)
    this.addEndpoints(aors, request, user)
    return true
  }

  addEndpoints (aors, request, user) {
    aors.forEach(addressOfRecord => {
      postal.publish({
        channel: 'locator',
        topic: 'endpoint.add',
        data: {
          addressOfRecord,
          route: RegistrarUtils.buildRoute(addressOfRecord, request, user)
        }
      })
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
