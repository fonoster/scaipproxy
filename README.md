# Scaip Server

To build the Scaip Server you need to:

```bash
npm test
npm run pack
docker-compose build scaipproxy
```

> Ensure GRAALVM_HOME and JAVA_HOME are set and Java version is 11+