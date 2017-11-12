import Web3 from 'web3'
import ZeroClientProvider from 'web3-provider-engine/zero'

export class Rejection extends Error {
  constructor (msg = 'The user did not accept') {
    super(msg)
  }
}

export const createProxyGuards = function (prompt, web3) {
  return {
    sendTransaction (argsObj, callback) {
      const {to, value: amount} = argsObj
      const accepted = prompt(`Do you agree to send ${amount} to ${to}?`)
      if (accepted) {
        return web3.sendTransaction(argsObj, callback)
      } else {
        const rejection = new Rejection('The user did not confirm the transaction')
        if (typeof callback === 'function') {
          callback(rejection)
        } else {
          throw rejection
        }
      }
    }
  }
}

export const createWeb3GuardProxy = function (
  providerOptions,
  createProxyGuards_ = createProxyGuards.bind(undefined, window.confirm.bind(window)),
  Proxy = window.Proxy,
  ClientProvider = ZeroClientProvider
) {
  const _guardedWeb3 = new Web3(new ClientProvider(providerOptions))
  const proxyGuards = createProxyGuards_(_guardedWeb3)
  const guardConfiguration = {
    get (target, name) {
      if (proxyGuards[name] === 'function' && target[name] === 'function'){
        return proxyGuards[name]
      } else {
        return target[name].bind(target)
      }
    }
  }

  return new Proxy(_guardedWeb3, guardConfiguration)
}
