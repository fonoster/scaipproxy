#!/usr/bin/env bash

set -e

export SCAIPPROXY_VERSION=$(node -e "console.log(require('./package.json').version)")

build_for_platform() {
    PLATFORM=$1

    # SCAIPPROXY_VERSION is set at the CI/CD process
    BUILD_NAME="scaipproxy-$SCAIPPROXY_VERSION""_$PLATFORM-x64_bin"
    # Cleanup
    rm -rf $BUILD_NAME
    mkdir -p $BUILD_NAME/libs
    mkdir $BUILD_NAME/config
    mkdir $BUILD_NAME/etc

    cp -a config/*.yml $BUILD_NAME/config
    cp -a config/stack.properties $BUILD_NAME/config/stack.properties
    cp -a etc/certs $BUILD_NAME/etc
    cp -a etc/schemas $BUILD_NAME/etc
    cp libs/* $BUILD_NAME/libs
    cp scaipproxy $BUILD_NAME/
    cp README.md $BUILD_NAME/
    cp LICENSE $BUILD_NAME/
    tar -czvf $BUILD_NAME.tar.gz $BUILD_NAME
    zip -r $BUILD_NAME.zip $BUILD_NAME
    rm -rf $BUILD_NAME
}

build_for_platform 'linux' 
