const split = require('split')
const execa = require('execa')
const pids = require('./all-pids')
const { config } = require('./package.json')
const {
  vin,
  chunkSize,
  tickResolution,
  interfaceName,
  sourceId,
  destinationId
} = config

const isotpSend = async (serviceIdentifier, response) => {
  const formattedResponse = response.length ? response.toString('hex').match(/.{1,2}/g).join(' ').trim() : ''
  const formattedBody = `${serviceIdentifier.toString(16).padStart(2, '0')} ${formattedResponse}`
  const subprocess = execa('isotpsend', [interfaceName, '-s', sourceId, '-d', destinationId, '-p', 'AA:AA'])
  subprocess.stdin.end(formattedBody.trim())
  await subprocess
}

const readDataByIdentifier = async (parameterIdentifier) => {
  await isotpSend(0x22, Buffer.from([
    parameterIdentifier >> 8,
    parameterIdentifier & 0xFF
  ]))
}

const requestPidsLoop = async () => {
  console.error(`requestPidsLoop: ${Date.now()} start`)
  for (let i = 0; i < pids.length; i += chunkSize) {
    const pidsChunk = pids.slice(i, i + chunkSize)
    await Promise.all(pidsChunk.map(pid => readDataByIdentifier(pid)))
    await new Promise(resolve => setTimeout(resolve, tickResolution))
  }
  console.error(`requestPidsLoop: ${Date.now()} end`)
  requestPidsLoop()
}

const initRecvSubprocess = () => {
  const subprocess = execa('isotprecv', [
    interfaceName,
    '-l',
    '-s', sourceId,
    '-d', destinationId,
    '-p', 'AA:AA'
  ])
  subprocess.stdin
    .pipe(split())
    .on('data', (data) => {
      data = Buffer.from(data.replace(/ /g, ''), 'hex')
      const responseServiceIdentifier = data[0]
      if (responseServiceIdentifier === 0x62) {
        const pid = data.slice(1, 3).toString('hex')
        const value = data.slice(3).toString('hex')
        const time = (new Date()).toISOString()
        console.log(JSON.stringify({ vin, pid, value, time }))
      }
    })
}

initRecvSubprocess()
logsPids()
