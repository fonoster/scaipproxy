/**
 * @author Pedro Sanders
 * @since v1
 *
 * Unit Test for the "Registrar Module"
 */
const assert = require('assert')
const { createRequest } = require('@scaipproxy/utils/test_util')
const { getExpires } = require('@scaipproxy/core/processor/processor_utils')
const RegistrarUtils = require('@scaipproxy/registrar/utils')

describe('Registrar checks', () => {
  it('Get expires', function (done) {
    const request1 = createRequest('1001@sip.local', '1002@sip.local')
    const request2 = createRequest('1001@sip.local', '1002@sip.local', true)
    assert.equal(getExpires(request1), 3600)
    assert.equal(getExpires(request2), 3601)
    done()
  })
})
