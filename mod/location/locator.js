/**
 * Stores information on sip devices currently registered in the server.
 * This implementation won't scale to thousands of devices.
 *
 * @author Pedro Sanders
 * @since v1
 */
const CoreUtils = require('@scaipproxy/core/utils')
const LocatorUtils = require('@scaipproxy/location/utils')
const DSSelector = require('@scaipproxy/data_api/ds_selector')
const SDSelector = require('@scaipproxy/data_api/store_driver_selector')
const StoreAPI = require('@scaipproxy/data_api/store_api')
const postal = require('postal')
const { Status } = require('@scaipproxy/core/status')

const LogManager = Java.type('org.apache.logging.log4j.LogManager')
const LOG = LogManager.getLogger()

/**
 * NOTE #1: Notice that addressOfRecord.toString !eq to
 * LocatorUtils.aorAsString(addressOfRecord). This is to ensure the location of
 * the devices regardless of any additional parameters that they may have.
 */
class Locator {
  constructor () {
    this.store = new StoreAPI(SDSelector.getDriver()).withCollection('location')
    this.subscribeToPostal()
  }

  addEndpoint (addressOfRecord, route) {
    route.contactURI = route.contactURI.toString()
    const routString = JSON.stringify(route)
    LOG.debug(
      `location.Locator.addEndpoint [adding route for aor ${addressOfRecord} => ${routString}]`
    )
    this.store.put(addressOfRecord, routString)
  }

  findEndpoint (addressOfRecord) {
    LOG.debug(
      `location.Locator.findEndpoint [lookup route for aor ${addressOfRecord}]`
    )

    const route = this.store.get(addressOfRecord)

    LOG.debug(
      `location.Locator.findEndpoint [lookup route=${JSON.stringify(route)}]`
    )

    return route !== null
      ? CoreUtils.buildResponse(Status.OK, null, JSON.parse(route))
      : CoreUtils.buildResponse(Status.NOT_FOUND)
  }

  removeEndpoint (addressOfRecord, contactURI, isWildcard) {
    LOG.info(
      `location.Locator.removeEndpoint [remove route for aor => ${addressOfRecord}, isWildcard => ${isWildcard}]`
    )

    let jsonRoutes = this.store.get(addressOfRecord)
    if (jsonRoutes) {
      let routes = JSON.parse(jsonRoutes)
      routes = routes.filter(
        route => !LocatorUtils.contactURIFilter(route.contactURI, contactURI)
      )

      // Remove all bindings
      if (routes.length === 0 || isWildcard === true) {
        this.store.remove(addressOfRecord)
        return
      }
      this.store.put(addressOfRecord, JSON.stringify(routes))
    }
  }

  subscribeToPostal () {
    const aorAsString = a => LocatorUtils.aorAsString(a)
    postal.subscribe({
      channel: 'locator',
      topic: 'endpoint.remove',
      callback: data => {
        const aor = aorAsString(data.addressOfRecord)
        this.removeEndpoint(aor, data.contactURI, data.isWildcard)
      }
    })

    postal.subscribe({
      channel: 'locator',
      topic: 'endpoint.add',
      callback: data => {
        const aor = aorAsString(data.addressOfRecord)
        this.addEndpoint(aor, data.route)
      }
    })
  }

  evictAll () {
    LOG.debug(`location.Locator.evictAll [emptying location table]`)
    // WARNING: Should we provide a way to disable this?
    const keys = this.store.keySet()
    keys.forEach(key => this.store.remove(key))
    LOG.debug(
      `location.Locator.evictAll [evicted ${
        keys.length
      } entries from location table]`
    )
  }
}

module.exports = Locator
