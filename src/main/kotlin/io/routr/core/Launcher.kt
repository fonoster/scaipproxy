package com.fonoster.scaipproxy.core

import com.fonoster.scaipproxy.util.getVersion
import java.io.IOException
import java.util.*
import kotlin.system.exitProcess
import org.apache.logging.log4j.LogManager
import org.graalvm.polyglot.Context
import org.graalvm.polyglot.HostAccess

/**
 * @author Pedro Sanders
 * @since v1
 */
class Launcher {
  @Throws(IOException::class, InterruptedException::class)
  fun launch() {
    val mainCtx = createJSContext(serverRunner, "server")
    createJSContext(restRunner, "nop")
    val server = GRPCServer(mainCtx)
    server.start()
    server.blockUntilShutdown()
  }

  private fun createJSContext(src: String?, `var`: String?): Context {
    val ctx =
        Context.newBuilder("js")
            .allowExperimentalOptions(true)
            .allowIO(true)
            .allowHostClassLookup { true }
            .allowHostAccess(HostAccess.ALL)
            .allowCreateThread(true)
            .build()
    ctx.eval("js", baseScript)
    ctx.getBindings("js").putMember(`var`, null)

    try {
      ctx.eval("js", src)
    } catch (ex: Exception) {
      LOG.error(ex.message)
    }

    return ctx
  }

  companion object {
    private val LOG = LogManager.getLogger()
    private const val serverRunner =
        "load(System.getProperty('user.dir') + '/libs/server.bundle.js')"
    private const val restRunner = "load(System.getProperty('user.dir') + '/libs/rest.bundle.js')"
    private val baseScript =
        java.lang.String.join(
            System.getProperty("line.separator"),
            "var System = Java.type('java.lang.System')"
        )

    @Throws(IOException::class, InterruptedException::class)
    @JvmStatic
    fun main(args: Array<String>) {
      // Checks Java version and show error if 8 < version > 11
      val javaVersion = getVersion()
      if (javaVersion > 11 || javaVersion < 8) {
        LOG.fatal("ScaipProxy is only supported in Java versions 8 through 11")
        exitProcess(1)
      }
      Launcher().launch()
    }
  }
}
