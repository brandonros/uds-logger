const EventEmitter = require('events')
const split = require('split')
const execa = require('execa')
const assert = require('assert')
const parameters = require('./parameters')

const interfaceName = process.env.npm_package_config_interface_name
const sourceId = process.env.npm_package_config_source_id
const destinationId = process.env.npm_package_config_destination_id

const emitter = new EventEmitter()

const send = async (serviceIdentifier, response) => {
  await new Promise(resolve => setTimeout(resolve, 10))
  console.log(`Sending request... interfaceName=${interfaceName} sourceId=${sourceId} destinationId=${destinationId}`)
  console.log(`${serviceIdentifier.toString(16).padStart(2, '0')}${response.toString('hex')}`)
  const formattedResponse = response.length ? response.toString('hex').match(/.{1,2}/g).join(' ').trim() : ''
  const formattedBody = `${serviceIdentifier.toString(16).padStart(2, '0')} ${formattedResponse}`
  const subprocess = execa('isotpsend', [interfaceName, '-s', sourceId, '-d', destinationId, '-p', 'AA:AA'])
  subprocess.stdin.end(formattedBody.trim())
  await subprocess
}

const showCurrentData = async (parameterIdentifier) => {
  await send(0x01, Buffer.from([parameterIdentifier]))
  return new Promise(resolve => emitter.once(`showCurrentData:${parameterIdentifier.toString(16).padStart(2, '0')}`, resolve))
}

const calculateValue = (input, formula) => {
  const a = input[0]
  const b = input[1]
  return eval(formula)
}

const loggingLoop = async (parameterIdentifier, name, formula, unit) => {
  for (;;) {
    const response = await showCurrentData(parameterIdentifier)
    console.log(`parameterIdentifier=${parameterIdentifier.toString(16).padStart(2, '0')} name=${name} formula=${formula} unit=${unit} value=${calculateValue(response, formula)}`)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

const run = async () => {
  for (let i = 0; i < 2; ++i) {
    const parameter = parameters[i]
    loggingLoop(parameter.id, parameter.name, parameter.formula, parameter.unit)
  }
}

process.stdin
  .pipe(split())
  .on('data', (data) => {
    data = Buffer.from(data.replace(/ /g, ''), 'hex')
    const responseServiceIdentifier = data[0]
    if (responseServiceIdentifier === 0x41) {
      const parameterIdentifier = data[1].toString(16).padStart(2, '0')
      console.log(`showCurrentData:${parameterIdentifier}`)
      emitter.emit(`showCurrentData:${parameterIdentifier}`, data.slice(2))
    }
  })

run()
