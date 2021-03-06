const EventEmitter = require('events')
const split = require('split')
const execa = require('execa')
const assert = require('assert')
const parameters = require('./parameters')

const interfaceName = process.env.npm_package_config_interface_name
const sourceId = process.env.npm_package_config_source_id
const destinationId = process.env.npm_package_config_destination_id

const emitter = new EventEmitter()

const queue = []
const logs = []

const send = async (serviceIdentifier, response) => {
  //console.log(`Sending request... interfaceName=${interfaceName} sourceId=${sourceId} destinationId=${destinationId}`)
  //console.log(`${serviceIdentifier.toString(16).padStart(2, '0')}${response.toString('hex')}`)
  const formattedResponse = response.length ? response.toString('hex').match(/.{1,2}/g).join(' ').trim() : ''
  const formattedBody = `${serviceIdentifier.toString(16).padStart(2, '0')} ${formattedResponse}`
  const subprocess = execa('isotpsend', [interfaceName, '-s', sourceId, '-d', destinationId, '-p', 'AA:AA'])
  subprocess.stdin.end(formattedBody.trim())
  await subprocess
}

const showCurrentData = async (parameterIdentifier) => {
  await send(0x01, Buffer.from([parameterIdentifier]))
  //return new Promise(resolve => emitter.once(`showCurrentData:${parameterIdentifier.toString(16).padStart(2, '0')}`, resolve))
}

const calculateValue = (input, formula) => {
  const a = input[0]
  const b = input[1]
  return eval(formula)
}

const requestLogsLoop = (parameterIdentifier) => {
  setInterval(async () => {
    await showCurrentData(parameterIdentifier)
  }, 1000)
}

const run = async () => {
  for (let i = 0; i < parameters.length; ++i) {
    const parameter = parameters[i]
    requestLogsLoop(parameter.id)
  }
}

process.stdin
  .pipe(split())
  .on('data', (data) => {
    data = Buffer.from(data.replace(/ /g, ''), 'hex')
    const responseServiceIdentifier = data[0]
    if (responseServiceIdentifier === 0x41) {
      const parameterIdentifier = data[1]
      const parameter = parameters.find(parameter => parameter.id === parameterIdentifier)
      if (parameter) {
        logs.push({
          parameter: parameter.name,
          value: calculateValue(data.slice(2), parameter.formula),
          time: Date.now()
        })
        console.log(logs)
      }
    }
  })

run()
