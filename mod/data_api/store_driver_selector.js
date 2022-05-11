const RedisStore = require('@scaipproxy/data_api/redis_store')
const FilesStore = require('@scaipproxy/data_api/files_store')
const config = require('@scaipproxy/core/config_util')()

class StoreDriverSelector {
  constructor () {
    if (config.spec.dataSource.provider === 'redis_data_provider') {
      this.storeDriver = new RedisStore()
    } else {
      this.storeDriver = new FilesStore()
    }
  }

  getDriver () {
    return this.storeDriver
  }
}

const instace = new StoreDriverSelector()
Object.freeze(instace)
module.exports = instace
