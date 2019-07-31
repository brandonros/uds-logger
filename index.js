const EventEmitter = require('events')
const split = require('split')
const execa = require('execa')

const interfaceName = process.env.INTERFACE_NAME
const sourceId = process.env.SOURCE_ID
const destinationId = process.env.DESTINATION_ID

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

const recv = () => new Promise(resolve => emitter.once('message', resolve))

const readDataByIdentifier = async (dataIdentifier) => {
  await send(0x22, Buffer.from([dataIdentifier >> 8, dataIdentifier & 0xFF]))
  return recv()
}

const loggingLoop = async (dataIdentifier) => {
  for (;;) {
    const response = await readDataByIdentifier(dataIdentifier)
    console.log(response)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

const run = async () => {
  const parameters = [
    {id: 0x000C, name: 'Engine RPM', formula: '(256 * a + b) / 4', unit: 'rpm'},
    {id: 0x000D, name: 'Vehicle speed', formula: 'a', unit: 'km/h'},
    {id: 0x0011, name: 'Throttle position', formula: 'a * 100 / 255', unit: '%'},
    {id: 0x0005, name: 'Coolant temperature', formula: 'a - 40', unit: 'C'},
    {id: 0x000F, name: 'Intake air temperature', formula: 'a - 40', unit: 'C'},
    {id: 0x0046, name: 'Ambient air temperature', formula: 'a - 40', unit: 'C'}
  ]
  for (let i = 0; i < parameters.length; ++i) {
    const parameter = parameters[i]
    loggingLoop(parameter.id)
  }
}

process.stdin
  .pipe(split())
  .on('data', (data) => emitter.emit('message', Buffer.from(data.replace(/ /g, ''), 'hex')))

run()
