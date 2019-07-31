module.exports = [
  {id: 0x0C, name: 'Engine RPM', formula: '(256 * a + b) / 4', unit: 'rpm'},
  {id: 0x0D, name: 'Vehicle speed', formula: 'a', unit: 'km/h'},
  {id: 0x11, name: 'Throttle position', formula: 'a * 100 / 255', unit: '%'},
  {id: 0x05, name: 'Coolant temperature', formula: 'a - 40', unit: 'C'},
  {id: 0x0F, name: 'Intake air temperature', formula: 'a - 40', unit: 'C'},
  {id: 0x46, name: 'Ambient air temperature', formula: 'a - 40', unit: 'C'}
]
