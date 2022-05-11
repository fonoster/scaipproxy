/**
 * @author Pedro Sanders
 * @since v1
 */
const ACLHelper = require('@scaipproxy/core/acl/acl_helper')
const Rule = require('@scaipproxy/core/acl/acl_rule')
const ArrayList = Java.type('java.util.ArrayList')

class AclUtil {
  constructor (accessControlList) {
    this.rules = new ArrayList()

    if (accessControlList) {
      this.addRules(accessControlList.allow, 'allow')
      this.addRules(accessControlList.deny, 'deny')
    }
  }

  addRules (nets, action) {
    if (nets.length > 0) {
      nets.forEach(net => this.rules.add(new Rule(net, action)))
    }
  }

  isIpAllowed (ip) {
    return ACLHelper.mostSpecific(ip, this.rules).action === 'allow'
  }
}

module.exports = AclUtil
