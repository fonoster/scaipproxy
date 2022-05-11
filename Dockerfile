FROM adoptopenjdk/openjdk11:debian
LABEL maintainer="Pedro Sanders <psanders@fonoster.com>"

ENV LANG C.UTF-8
ARG SCAIPPROXY_VERSION=1.0.0

RUN mkdir -p /opt/scaipproxy
WORKDIR /opt/scaipproxy

COPY scaipproxy-${SCAIPPROXY_VERSION}_linux-x64_bin.tar.gz .

RUN apt-get update \
    && tar xvf scaipproxy-${SCAIPPROXY_VERSION}_linux-x64_bin.tar.gz \
    && mv scaipproxy-${SCAIPPROXY_VERSION}_linux-x64_bin/* . \
    && rm -rf scaipproxy-${SCAIPPROXY_VERSION}_linux-x64_bin.tar.gz \
       scaipproxy-${SCAIPPROXY_VERSION}_linux-x64_bin \
       scaipproxy.bat \
    && apt-get install curl -y \
    && curl -qL -o /usr/bin/netdiscover https://github.com/CyCoreSystems/netdiscover/releases/download/v1.2.5/netdiscover.linux.amd64 \
    && chmod +x /usr/bin/netdiscover \
    && apt-get remove curl -y \
    && apt-get autoremove -y \
    && touch /.dockerenv

EXPOSE 4567
EXPOSE 5060/udp
EXPOSE 5060
EXPOSE 5061
EXPOSE 5062
EXPOSE 5063

CMD ["./scaipproxy"]
