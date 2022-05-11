/**
 * @author Pedro Sanders
 * @since v1
 */
const Rule = require('@scaipproxy/core/acl/acl_rule')
const Long = Java.type('java.lang.Long')

/**
 * Helps verify if a device is allow or not to REGISTER and place calls.
 *
 * Rules may be in CIDR, IP/Mask, or single IP format. Example
 * of rules are:
 *
 * acl:
 *  deny:
 *      0.0.0.0/1   # deny all
 *  allow
 *    - 192.168.1.0/255.255.255.0
 *    - 192.168.0.1/31
 */
class ACLHelper {
  static mostSpecific (ip, rules) {
    const r = rules
      .stream()
      .filter(rule => rule.hasIp(ip))
      .sorted((r1, r2) =>
        Long.compare(r1.getAddressCount(), r2.getAddressCount())
      )
      .findFirst()

    return r.isPresent() ? r.get() : new Rule('0.0.0.0/0', 'allow')
  }
}

module.exports = ACLHelper
