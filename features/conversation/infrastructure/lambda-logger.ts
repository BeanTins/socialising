import {transports,createLogger,format, Logger} from "winston"
import * as path from "path"

const customPrintf = format.printf(info => {
  return `${info.timestamp} ${info.level}: ${info.message}`
})

const fileFormat = format.combine(
    format.errors({ stack: true }),
    format.timestamp({format: "YYYY-MM-DD HH:mm:ss"}),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
 )

const consoleFormat = format.combine(
  format.errors({ stack: true }),
  format.printf(info => `${info.message}`)
)

const runningInLambda = !!process.env.LAMBDA_TASK_ROOT;

let logger: Logger

logger = createLogger({
  format: consoleFormat,
  transports: buildTransports()
})

function buildTransports() {
  let transportList
  if (runningInLambda) {
    transportList = [
      new transports.Console({ level: "verbose", format: consoleFormat })
    ]
  }

  else {
    transportList = [
      new transports.Console({ level: "verbose", format: consoleFormat }),
      new transports.File({ filename: path.join(__dirname, "../reports/unit-tests/tests.log"), level: "verbose", format: fileFormat })
    ]
  }
  return transportList
}

export default logger
