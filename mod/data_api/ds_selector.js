const FilesDataSource = require('@scaipproxy/data_api/files_datasource')
const RedisDataSource = require('@scaipproxy/data_api/redis_datasource')
const config = require('@scaipproxy/core/config_util')()

class DSSelector {
  constructor () {
    if (config.spec.dataSource.provider === 'files_data_provider') {
      this.dataSource = new FilesDataSource(config)
    } else if (config.spec.dataSource.provider === 'redis_data_provider') {
      this.dataSource = new RedisDataSource(config)
    } else {
      throw 'Invalid datasource provider'
    }
  }

  getDS () {
    return this.dataSource
  }
}

const instace = new DSSelector()
Object.freeze(instace)
module.exports = instace
