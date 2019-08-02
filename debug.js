const split = require('split')
const execa = require('execa')
const low = require('lowdb')
const Adapter = require('lowdb/adapters/FileSync')

const logs = {}
const pids = require('./pids-that-dont-change')

const interfaceName = process.env.npm_package_config_interface_name
const sourceId = process.env.npm_package_config_source_id
const destinationId = process.env.npm_package_config_destination_id

const initDb = () => {
  const db = low(new Adapter('db.json'))
  db.defaults({ logs: [] })
    .write()
  return db
}

const send = async (serviceIdentifier, response) => {
  const formattedResponse = response.length ? response.toString('hex').match(/.{1,2}/g).join(' ').trim() : ''
  const formattedBody = `${serviceIdentifier.toString(16).padStart(2, '0')} ${formattedResponse}`
  const subprocess = execa('isotpsend', [interfaceName, '-s', sourceId, '-d', destinationId, '-p', 'AA:AA'])
  subprocess.stdin.end(formattedBody.trim())
  await subprocess
}

const showCurrentData = async (parameterIdentifier) => {
  await send(0x22, Buffer.from([parameterIdentifier >> 8, parameterIdentifier & 0xFF]))
}

const run = async () => {
  for (;;) {
    for (let i = 0; i < pids.length; ++i) {
      const pid = pids[i]
      await showCurrentData(pid)
      await new Promise(resolve => setTimeout(resolve, 25))
    }
  }
}

const db = initDb()

process.stdin
  .pipe(split())
  .on('data', (data) => {
    data = Buffer.from(data.replace(/ /g, ''), 'hex')
    const responseServiceIdentifier = data[0]
    if (responseServiceIdentifier === 0x62) {
      const pid = data.slice(1, 3).toString('hex')
      const value = data.slice(3).toString('hex')
      if (!logs[pid]) {
        logs[pid] = new Set()
      }
      if (!logs[pid].has(value)) {
        console.log({ pid, value, time: Date.now() })
        logs[pid].add(value)
      }
      db.get('logs')
        .push({ pid, value, time: Date.now() })
        .write()
    }
  })

run()
