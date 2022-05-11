# ScaipProxy Server

ScaipProxy is a lightweight sip proxy, location server, and registrar that provides a reliable and scalable SIP infrastructure for telephony carriers, communication service providers, and integrators.

## Introduction

This chart bootstraps the ScaipProxy for deployment on a [Kubernetes](http://kubernetes.io/) cluster using the [Helm](https://helm.sh/) package manager.

## Prerequisites

- Kubernetes 1.16+
- Helm 3.0-beta3+
- PV provisioner support in the underlying infrastructure


## Installing the Chart

To install the chart with the release name my-release:

```bash
$ kubectl create namespace scaipproxy
$ helm install my-release scaipproxy/scaipproxy --namespace scaipproxy
```

The command deploys ScaipProxy Server in the `default` namespace on the Kubernetes cluster in the default configuration.

We recommend using a namespace for easy upgrades.

The [configuration](https://hub.helm.sh/#configuration) section lists the parameters that can be configured during installation.

## Uninstalling the Chart

To uninstall/delete the `my-release` deployment:

```bash
$ helm uninstall my-release
```

The command removes all the Kubernetes components associated with the chart and eliminates the release.

## Changelog

The [CHANGELOG](https://github.com/fonoster/scaipproxy/tree/gh-pages/charts/CHANGELOG.md) provides notable changes on the chart.

## Parameters

The following table lists the configurable parameters of the ScaipProxy chart and their default values.

### ScaipProxy Services

| Parameter | Description | Default |
| --- | --- | --- |
| adminService.enabled | Enable or disable Service | `true` |
| adminService.type | Type of Service| `ClusterIP` |
| adminService.name | Service name | `<RELEASE>-api` |
| adminService.port | Service port | `4567` |
| adminService.externalIPs | Admin Service external IPs | `[]` |
| udpSignalingService.enabled | Enable disable or signaling UDP Service | `true` |
| udpSignalingService.type | Type for UDP signaling Service | `ClusterIP` |
| udpSignalingService.name | Name for UDP signaling Service | `<RELEASE>siptcp` |
| udpSignalingService.port | Port for UDP signaling Service | `5060` |
| udpSignalingService.externalTrafficPolicy | Route external traffic to node-local or cluster-wide endpoints | `Local` |
| udpSignalingService.externalIPs | UDP Signaling Service external IPs | `[]` |
| tcpSignalingService.enabled | Enable disable signaling Service | `true` |
| tcpSignalingService.type | Type for TCP signaling Service | `ClusterIP` |
| tcpSignalingService.name | Name for TCP signaling service | `<RELEASE>-siptcp` |
| tcpSignalingService.ports | Ports for TCP signaling Service | `[{name: siptcp, port: 5060}]` |
| tcpSignalingService.externalTrafficPolicy | Route external traffic to node-local or cluster-wide endpoints | `Local` |
| tcpSignalingService.externalIPs | TCP Signaling Service external IPs | `[]` |

### ScaipProxy parameters (optional)

| Parameter | Description | Default |
| --- | --- | --- |
| scaipproxy.userAgent| Sets sip header `User-Agent` to the desired value | `ScaipProxy v<VERSION>` |
| scaipproxy.bindAddr | Default stack IP address  | "" |
| scaipproxy.externAddr | IP address to advertise. Typically a LoadBalancer's public IP | "" |
| scaipproxy.localnets | Local networks in CIDR format. Use in combination with `externAddr` | [] |
| scaipproxy.recordRoute | Stay within the signaling path | `false` |
| scaipproxy.useToAsAOR | Uses the `To` header, instead of `Request-URI`, to locate endpoints | `false` |
| scaipproxy.patchRequestURI | Uses the user part of the `To` header to ammend the `Request-URI` if it doesn't have user| `false` |
| scaipproxy.registrarIntf | `Internal` causes the server to use the IP and port it "sees"(received & rport) from a device attempting to register | `External` |
| scaipproxy.accessControlList.deny | Deny incoming traffic from network list. Must be valid CIDR values | [] |
| scaipproxy.accessControlList.allow | Allow incoming traffic from network list. Must be valid CIDR values | [] |
| scaipproxy.restService.bindAddr | Restful service listening address | `0.0.0.0` |
| scaipproxy.restService.port | Restful service port | `4567` |
| scaipproxy.restService.minThreads | Minimum thread allocation | `8` |
| scaipproxy.restService.maxThreads | Maximum thread allocation | `200` |
| scaipproxy.restService.timeoutMillis | Will reject requests that last more than this value | `5000` |
| scaipproxy.restService.unsecured | Disabled https for restful calls. Not recommended in production | `false` |
| scaipproxy.restService.keyStore | Path to keyStore | `/opt/scaipproxy/etc/certs/api-cert.jks` |
| scaipproxy.restService.trueStore | Path to trueStore | `/opt/scaipproxy/etc/certs/api-cert.jks` |
| scaipproxy.restService.keyStorePassword | Password for keyStore | `changeit` |
| scaipproxy.restService.trueStorePassword | Password for trueStore | `changeit` |
| scaipproxy.securityContext.keyStore | Path to keyStore | `/opt/scaipproxy/etc/certs/domain-cert.jks` |
| scaipproxy.securityContext.trustStore | Path to trueStore | `/opt/scaipproxy/etc/certs/domain-cert.jks` |
| scaipproxy.securityContext.keyStorePassword | Password for keyStore | `changeit` |
| scaipproxy.securityContext.keyStoreType | KeyStore type | `jks` |
| scaipproxy.securityContext.client.authType | Type of client authentication. See https://goo.gl/1vKbXW for more options | `DisabledAll` |
| scaipproxy.securityContext.client.protocols.[*] | Accepted TLS protocols |`[TLSv1.2, TLSv1.1, TLSv1]` |
| scaipproxy.securityContext.debugging | Turns `ON` or `OFF` SSL debugging | `false` |
| scaipproxy.logLevel | ScaipProxy's logging level  | `info` |

### ScaipProxy Images [advanced] (optional)

ScaipProxy Images are loaded from DockerHub by default. Images are public and by default latest images are downloaded. We recommend following this tag.

```
image:
  registry: docker.io # Docker Registry where to pull images from.
  repository: fonoster/scaipproxy # ScaipProxy docker repository.
  tag: latest # We recommend `latest` tag.
  pullPolicy: Always # We recommend Always
```  

### Redis Values

This is taken from Bitnami Helm Chart. Please refer to https://bitnami.com/stack/redis/helm

Here are default values:

```
redis:
  redisPort: 6379
  image:
    registry: docker.io
    repository: bitnami/redis
    tag: latest
    pullPolicy: Always
  usePassword: false
  cluster:
    enabled: false  
  persistence:
    enabled: true
    mountPath: /bitnami/redis
    size: 5Gi
```

## Specifying Values

Specify each parameter using the --set key=value[,key=value] argument to helm install. For example,

```bash
$ helm install --wait my-release \
  --set scaipproxy.logLevel=debug \
  scaipproxy/scaipproxy
```

Alternatively, you can provide a YAML file that specifies the above parameters' values while installing the chart. For example:

```bash
$ helm install --wait my-release -f values.yaml scaipproxy/scaipproxy
```
