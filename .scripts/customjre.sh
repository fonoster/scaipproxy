#!/usr/bin/env bash

[ -z "$JAVA_HOME" ] && {
  echo "Could not find a runtime environment. Please setup the JAVA_HOME environment variable"
  exit 1
}

# Set if your target OS is different from your current OS
# TARGET_HOME=

rm -rf etc/customjre

echo "Creating custom Java Runtime..."
echo ""
echo "JAVA_HOME: $JAVA_HOME"
echo "TARGET_HOME: $TARGET_HOME"
echo ""

$JAVA_HOME/bin/jlink -c --no-man-pages --no-header-files -G \
  --module-path $TARGET_HOME/jmods/ \
  --add-modules \
  java.base,java.management,java.naming,java.sql,java.instrument,jdk.crypto.cryptoki,jdk.scripting.nashorn,jdk.unsupported,jdk.management.agent,jdk.unsupported.desktop \
  --output etc/customjre
