
export function cyan(str) {
  return `\u001b[38;5;6m${str}`
}

export function red(str) {
  return `\u001b[38;2;255;0;0m${str}`
}

export function yellow(str) {
  return `\u001b[33m${str}`
}
