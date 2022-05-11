/**
 * @author Pedro Sanders
 * @since v1
 */
const CoreUtils = require('@scaipproxy/core/utils')
const DSUtils = require('@scaipproxy/data_api/utils')
const FilesUtil = require('@scaipproxy/utils/files_util')
const XXH = require('xxhashjs')
const { Status } = require('@scaipproxy/core/status')
const config = require('@scaipproxy/core/config_util')()
const isEmpty = require('@scaipproxy/utils/obj_util')

const Long = Java.type('java.lang.Long')
const JsonPath = Java.type('com.jayway.jsonpath.JsonPath')
const System = Java.type('java.lang.System')
const NoSuchFileException = Java.type('java.nio.file.NoSuchFileException')
const JsonMappingException = Java.type(
  'com.fasterxml.jackson.databind.JsonMappingException'
)
const InvalidPathException = Java.type(
  'com.jayway.jsonpath.InvalidPathException'
)
const Caffeine = Java.type('com.github.benmanes.caffeine.cache.Caffeine')
const TimeUnit = Java.type('java.util.concurrent.TimeUnit')
const ReentrantLock = Java.type('java.util.concurrent.locks.ReentrantLock')
const lock = new ReentrantLock()

const LogManager = Java.type('org.apache.logging.log4j.LogManager')
const LOG = LogManager.getLogger()
const RESOURCES = ['agents', 'domains', 'peers', 'users']

class FilesDataSource {
  constructor (config = config) {
    this.cache = Caffeine.newBuilder()
      .expireAfterWrite(60, TimeUnit.MINUTES)
      .build()
    this.refs = Caffeine.newBuilder()
      .expireAfterWrite(60, TimeUnit.MINUTES)
      .build()

    if (System.getenv('DATA_SOURCE_PARAMETERS')) {
      config.spec.dataSource.parameters = {}
      const key = System.getenv('DATA_SOURCE_PARAMETERS').split('=')[0]
      if (key === 'path') {
        config.spec.dataSource.parameters.path = System.getenv(
          'DATA_SOURCE_PARAMETERS'
        ).split('=')[1]
      }
    }

    if (!config.spec.dataSource.parameters) {
      this.filesPath = 'config'
    } else {
      const parameters = DSUtils.getParametersFromString(
        config.spec.dataSource.parameters,
        ['path']
      )
      if (parameters.path) this.filesPath = parameters.path
    }

    // Static validation
    this.staticConfigValidation()
    // Check constrains
    this.resourceConstraintValidation()
    // Look for duplicate entries in all resource files
    this.checkForDuplicates()
  }

  staticConfigValidation () {
    for (const cnt in RESOURCES) {
      try {
        const res = FilesUtil.readFile(
          `${this.filesPath}/${RESOURCES[cnt]}.yml`
        )
        const jsonObjs = DSUtils.convertToJson(res)
        for (const cntObj in jsonObjs) {
          const errors = DSUtils.validateEntity(jsonObjs[cntObj])
          if (errors.length > 0) {
            throw Status.message[Status.UNPROCESSABLE_ENTITY].value
          }
        }
      } catch (e) {
        if (
          e instanceof
          Java.type(
            'com.fasterxml.jackson.dataformat.yaml.snakeyaml.error.MarkedYAMLException'
          )
        ) {
          LOG.error(
            `The format of file \`${this.filesPath}/${
              RESOURCES[CNT]
            }.yml\` is invalid`
          )
        } else {
          LOG.error(e)
        }
        System.exit(1)
      }
    }
  }

  resourceConstraintValidation () {
    // Ensure Agents have existing Domains
    let response = this.withCollection('agents').find()

    if (response.status === Status.OK) {
      response.data.forEach(agent => {
        const domains = agent.spec.domains
        for (const cnt in domains) {
          const domain = domains[cnt]
          response = this.withCollection('domains').find(
            `@.spec.context.domainUri=='${domain}'`
          )
          if (response.data.length === 0) {
            LOG.error(
              `Agent \`${agent.metadata.name}\`(${
                agent.spec.credentials.username
              }) has a non-existent domain/s`
            )
            System.exit(1)
          }
        }
      })
    }
  }

  checkForDuplicates () {
    const findDuplicates = arr =>
      arr.filter((item, index) => arr.indexOf(item) != index)
    RESOURCES.forEach(resource => {
      const response = this.withCollection(resource).find()
      if (response.status === Status.OK) {
        const refs = response.data.map(entity => entity.metadata.ref)
        if (findDuplicates(refs).length > 0) {
          LOG.error(
            `Found duplicate entries in ${this.filesPath}/${resource}.yml`
          )
          System.exit(1)
        }
      }
    })
  }

  withCollection (collection) {
    this.collection = collection
    return this
  }

  insert () {
    return {
      status: Status.NOT_SUPPORTED,
      message: Status.message[Status.NOT_SUPPORTED].value
    }
  }

  // Warn: Not very efficient. This will list all existing resources before
  // finding the one it needs
  get (ref) {
    if (ref === 'config') {
      return CoreUtils.buildResponse(Status.OK, null, config)
    }
    return DSUtils.deepSearch(
      this.find(void 0, 1, Long.MAX_VALUE),
      'metadata.ref',
      ref
    )
  }

  set (key, value) {
    return {
      status: Status.NOT_SUPPORTED,
      message: Status.message[Status.NOT_SUPPORTED].value
    }
  }

  find (filter = '*', page = 1, itemsPerPage = Long.MAX_VALUE) {
    if (!isEmpty(filter) && filter !== '*') {
      filter = `*.[?(${filter})]`
    }

    let list = []

    try {
      lock.lock()
      const filePath = `${this.filesPath}/${this.collection}.yml`
      let jsonPath = this.cache.getIfPresent(filePath)

      if (jsonPath === null) {
        const resource = DSUtils.toJsonStr(FilesUtil.readFile(filePath))
        jsonPath = JsonPath.parse(resource)
        this.cache.put(filePath, jsonPath)
      }

      // JsonPath does not parse properly when using Json objects from JavaScript
      list = JSON.parse(jsonPath.read(filter).toJSONString())

      if (isEmpty(list)) {
        return FilesDataSource.emptyResponse()
      }
    } catch (e) {
      if (
        e instanceof NoSuchFileException ||
        e instanceof JsonMappingException
      ) {
        return FilesDataSource.emptyResponse()
      }

      return e instanceof InvalidPathException
        ? CoreUtils.buildResponse(Status.BAD_REQUEST, 'Failed to parse filter')
        : CoreUtils.buildErrResponse(e)
    } finally {
      lock.unlock()
    }

    return DSUtils.paginate(this.getWithMetadata(list), page, itemsPerPage)
  }

  update () {
    return {
      status: Status.NOT_SUPPORTED,
      message: Status.message[Status.NOT_SUPPORTED].value
    }
  }

  remove () {
    return {
      status: Status.NOT_SUPPORTED,
      message: Status.message[Status.NOT_SUPPORTED].value
    }
  }

  getWithMetadata (list) {
    const date = new Date(config.system.upSince).toISOString()
    list.forEach(obj => {
      obj.metadata.createdOn = date
      obj.metadata.modifiedOn = date
      if (!obj.metadata.ref) {
        switch (obj.kind.toLowerCase()) {
          case 'agent':
            obj.metadata.ref = `ag${this.generateRef(
              obj.spec.credentials.username + obj.spec.domains[0]
            )}`
            break
          case 'domain':
            obj.metadata.ref = `dm${this.generateRef(
              obj.spec.context.domainUri
            )}`
            break
          case 'peer':
            obj.metadata.ref = `pr${this.generateRef(
              obj.spec.credentials.username
            )}`
            break
          case 'user':
            obj.metadata.ref = `ur${this.generateRef(
              obj.spec.credentials.username
            )}`
            break
        }
      }
    })
    return list
  }

  generateRef (uniqueFactor) {
    let ref = this.refs.getIfPresent(uniqueFactor)
    if (ref === null) {
      ref = XXH.h32(uniqueFactor, 0xabcd)
        .toString(16)
        .toLowerCase()
      this.refs.put(uniqueFactor, ref)
    }
    return ref
  }

  static emptyResponse () {
    return {
      status: Status.OK,
      message: Status.message[Status.OK].value,
      data: []
    }
  }
}

module.exports = FilesDataSource
