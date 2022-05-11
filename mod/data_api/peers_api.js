/**
 * @author Pedro Sanders
 * @since v1
 */
const DSUtils = require('@scaipproxy/data_api/utils')
const APIBase = require('@scaipproxy/data_api/api_base')
const { Status } = require('@scaipproxy/core/status')
const getCacheKey = j => j.spec.credentials.username

class PeersAPI extends APIBase {
  constructor (dataSource) {
    super(dataSource, 'peers')
  }

  createFromJSON (jsonObj) {
    const hasUnfulfilledDependency = () => false
    const alreadyExist = j => this.peerExist(getCacheKey(j))
    return super.createFromJSON(
      jsonObj,
      alreadyExist,
      hasUnfulfilledDependency,
      getCacheKey
    )
  }

  updateFromJSON (jsonObj) {
    return super.updateFromJSON(jsonObj, getCacheKey)
  }

  getPeers (filter, page, itemsPerPage) {
    return super.getResources(filter, page, itemsPerPage)
  }

  getPeer (ref) {
    return super.getResource(ref)
  }

  peerExist (username) {
    return DSUtils.objExist(this.getPeerByUsername(username))
  }

  getPeerByUsername (username) {
    let response = this.cache.getIfPresent(username)

    if (response === null) {
      response = DSUtils.deepSearch(
        this.getPeers(),
        'spec.credentials.username',
        username
      )
      this.cache.put(username, response)
    }

    return response
  }

  deletePeer (ref) {
    if (this.cache.getIfPresent(ref)) {
      this.cache.invalidate(ref)
    }

    return this.ds.withCollection('peers').remove(ref)
  }
}

module.exports = PeersAPI
