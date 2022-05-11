/**
 * @author Pedro Sanders
 * @since v1
 */
const DSUtils = require('@scaipproxy/data_api/utils')
const APIBase = require('@scaipproxy/data_api/api_base')
const { Status } = require('@scaipproxy/core/status')
const foundDependentObjects = {
  status: Status.CONFLICT,
  message: Status.message[4092].value
}
const getCacheKey = j => j.spec.context.domainUri

class DomainsAPI extends APIBase {
  constructor (dataSource) {
    super(dataSource, 'domains')
  }

  createFromJSON (jsonObj) {
    const hasUnfulfilledDependency = () => false
    const alreadyExist = j => this.domainExist(j.spec.context.domainUri)
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

  getDomains (filter, page, itemsPerPage) {
    return super.getResources(filter, page, itemsPerPage)
  }

  getDomain (ref) {
    return super.getResource(ref)
  }

  getDomainByUri (domainUri) {
    let response = this.cache.getIfPresent(domainUri)

    if (response === null) {
      response = DSUtils.deepSearch(
        this.getDomains(),
        'spec.context.domainUri',
        domainUri
      )
      this.cache.put(domainUri, response)
    }
    return response
  }

  domainExist (domainUri) {
    return DSUtils.objExist(this.getDomainByUri(domainUri))
  }

  deleteDomain (ref) {
    this.invalidate(ref, getCacheKey)

    let response = this.getDomain(ref)

    if (response.status !== Status.OK) {
      return response
    }

    const domain = response.data

    response = this.ds
      .withCollection('agents')
      .find(`'${domain.spec.context.domainUri}' in @.spec.domains`)
    const agents = response.data

    return agents.length === 0
      ? this.ds.withCollection('domains').remove(ref)
      : foundDependentObjects
  }

  deleteDomainByUri (uri) {
    const response = this.getDomainByUri(uri)
    return response.status !== Status.OK
      ? response
      : this.deleteDomain(response.data.metadata.ref)
  }
}

module.exports = DomainsAPI
