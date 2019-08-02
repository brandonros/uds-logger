const EventEmitter = require('events')
const split = require('split')
const execa = require('execa')
const assert = require('assert')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const parameters = require('./parameters')
const pids = require('./pids')

const interfaceName = process.env.npm_package_config_interface_name
const sourceId = process.env.npm_package_config_source_id
const destinationId = process.env.npm_package_config_destination_id

const adapter = new FileSync('db.json')
const db = low(adapter)
db.defaults({ logs: [] })
  .write()

const emitter = new EventEmitter()

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
  await send(0x22, Buffer.from([parameterIdentifier >> 8, parameterIdentifier & 0xFF]))
  //return new Promise(resolve => emitter.once(`showCurrentData:${parameterIdentifier.toString(16).padStart(2, '0')}`, resolve))
}

const run = async () => {
  for (let i = 0; i < pids.length; ++i) {
    const pid = pids[i]
    await showCurrentData(pid)
    await new Promise(resolve => setTimeout(resolve, 25))
  }
}

process.stdin
  .pipe(split())
  .on('data', (data) => {
    data = Buffer.from(data.replace(/ /g, ''), 'hex')
    const responseServiceIdentifier = data[0]
    if (responseServiceIdentifier === 0x62) {
      const pid = data.slice(1, 3).toString('hex').padStart(4, '0')
      const value = data.slice(4).toString('hex')
      console.log({ pid, value, time: Date.now() })
      db.get('logs')
        .push({ pid, value, time: Date.now() })
        .write()
      /*const parameterIdentifier = data[1]
      const parameter = parameters.find(parameter => parameter.id === parameterIdentifier)
      if (parameter) {
        logs.push({
          parameter: parameter.name,
          value: calculateValue(data.slice(2), parameter.formula),
          time: Date.now()
        })
        console.log(logs)*
      }*/
    }
  })

run()
