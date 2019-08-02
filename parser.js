const fs = require('fs')
const db = JSON.parse(fs.readFileSync('db.json'))

const pids = {}

db.logs.forEach(log => {
  const key = log.pid
  if (!pids[key]) {
    pids[key] = []
  }
  pids[key].push(log.value)
})

const keys = Object.keys(pids)
keys.sort()

keys.forEach(key => {
  const values = Array.from(new Set(pids[key]))
  if (values.length === 1) {
    console.log(key)
    console.log(values)
  }
})
