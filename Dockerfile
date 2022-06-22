FROM adoptopenjdk/openjdk11:debian
LABEL maintainer="Pedro Sanders <psanders@fonoster.com>"

ENV LANG C.UTF-8
ARG ROUTR_VERSION=1.0.0

RUN mkdir -p /opt/routr
WORKDIR /opt/routr

COPY routr-${ROUTR_VERSION}_linux-x64_bin.tar.gz .

RUN apt-get update \
    && tar xvf routr-${ROUTR_VERSION}_linux-x64_bin.tar.gz \
    && mv routr-${ROUTR_VERSION}_linux-x64_bin/* . \
    && rm -rf routr-${ROUTR_VERSION}_linux-x64_bin.tar.gz \
       routr-${ROUTR_VERSION}_linux-x64_bin \
       routr.bat \
    && apt-get install curl -y \
    && curl -qL -o /usr/bin/netdiscover https://github.com/CyCoreSystems/netdiscover/releases/download/v1.2.5/netdiscover.linux.amd64 \
    && chmod +x /usr/bin/netdiscover \
    && apt-get remove curl -y \
    && apt-get autoremove -y \
    && touch /.dockerenv

EXPOSE 4567
EXPOSE 5060/udp

CMD ["./routr"]

HEALTHCHECK --interval=5s --timeout=5s --retries=3 \
  CMD ["curl", "-k", "--fail", "--silent", "--show-error", "--connect-timeout", "2", "-L", "https://localhost:4567/api/v1beta1/system/status"]