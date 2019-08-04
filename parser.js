const fs = require('fs')
const pids = require('./all-pids')
const db = JSON.parse(fs.readFileSync('db.json'))

const map = {}

db.logs.forEach(log => {
  const key = log.pid
  if (!map[key]) {
    map[key] = []
  }
  map[key].push(log.value)
})

pids.sort((a, b) => {
  a = a.toString(16).padStart(4, '0')
  b = b.toString(16).padStart(4, '0')
  const aValues = map[a] || []
  const bValues = map[b] || []
  return bValues.length - aValues.length
})

pids.forEach(pid => {
  pid = pid.toString(16).padStart(4, '0')
  const values = map[pid] || []
  console.log({
    pid,
    values
  })
})
