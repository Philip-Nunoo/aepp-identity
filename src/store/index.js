import Vue from 'vue'
import Vuex from 'vuex'
import aeAbi from '../abi/aeternity-token-abi.json'
import BigNumber from 'bignumber.js'

const ProviderEngine = require('web3-provider-engine')
const CacheSubprovider = require('web3-provider-engine/subproviders/cache.js')
const FixtureSubprovider = require('web3-provider-engine/subproviders/fixture.js')
const FilterSubprovider = require('web3-provider-engine/subproviders/filters.js')
// const VmSubprovider = require('web3-provider-engine/subproviders/vm.js')
const HookedWalletSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js')
const NonceSubprovider = require('web3-provider-engine/subproviders/nonce-tracker.js')
const RpcSubprovider = require('web3-provider-engine/subproviders/rpc.js')

import lightwallet from 'eth-lightwallet'
import Web3 from 'web3'
var BN = Web3.utils.BN;
import Transaction from 'ethereumjs-tx'
import {
  approveTransaction as approveTransactionDialog,
  approveMessage as approveMessageDialog
} from "@/dialogs/index"
import {logTx} from '@/lib/logging'
import {getEstimatedGas, getGasPrice} from "@/lib/remoteGetters"
import abiDecoder from 'abi-decoder'
var util = require('ethereumjs-util')

Vue.use(Vuex)

const APP_TYPES = {
  INTERNAL : 0,
  EXTERNAL : 1,
}

const store = (function () {
  var aeContract
  var derivedKey
  let web3
  return new Vuex.Store({
    state: {
      title: '',
      selectedIdentityIdx: 0,
      unlocked: false,
      identityCollapsed: true,
      showIdManager: false,
      token: {
        address: '0x35d8830ea35e6Df033eEdb6d5045334A4e34f9f9',
        decimals: new BigNumber(10).pow(18)
      },
      balances: [],
      rpcUrl: 'https://kovan.infura.io/',
      infuraAPI: 'iSq28wXQFMrsqk1g8atF',
      keystore: null,
      apps : [
        {
          type : APP_TYPES.EXTERNAL,
          name : 'Notary',
          icon : 'static/icons/notary.svg',
          main : 'https://notary.aepps.com'
        },
        {
          type : APP_TYPES.INTERNAL,
          name : 'Transfer',
          icon : 'static/icons/notary.svg',
          main : '/transfer'
        },
        {
          type : APP_TYPES.EXTERNAL,
          name : 'Wall',
          icon : 'static/icons/wall.svg',
          main : 'https://wall.aepps.com'
        },
        {
          type : APP_TYPES.INTERNAL,
          name : 'Network',
          icon : 'static/icons/notary.svg',
          main : '/network'
        },
      ],
    },
    mutations: {
      updateRPC (state, rpcUrl) {
        state.rpcUrl = rpcUrl + state.infuraAPI
      },
      title (state, newtitle) {
        state.title = newtitle
      },
      appClass (state, newClass) {
        state.appClass = newClass
      },
      identityCollapsed (state, collapse) {
        state.identityCollapsed = collapse
      },
      setAccount (state, account) {
        state.identity.address = account
      },
      setKeystore (state, keystore) {
        state.keystore = keystore
      },
      addApp (state, app) {
        this.state.apps.push(app)
        localStorage.setItem('apps', JSON.stringify(this.state.apps))
      },
      setApps (state, apps) {
        this.state.apps = apps
      },
      setUnlocked (state, unlocked) {
        state.unlocked = unlocked
      },
      selectIdentity (state, selectedIdentityIdx) {
        state.selectedIdentityIdx = selectedIdentityIdx
      },
      setBalance (state, {address, balance, tokenBalance}) {
        console.log('setBalance', address, balance, tokenBalance)
        if (!address) {
          return
        }
        let balanceObj = state.balances.find(b => b.address === address)
        if (balanceObj) {
          if (balance) {
            balanceObj.balance = balance
          }
          if (tokenBalance) {
            balanceObj.tokenBalance = tokenBalance
          }
        } else {
          state.balances.push({
            address: address,
            balance: balance ? balance : 0,
            tokenBalance: tokenBalance ? tokenBalance : 0
          })
        }
      }
    },
    getters: {
      web3 () {
        return web3 || global.web3
      },
      addresses: state => {
        if (!state.keystore) {
          return
        }
        return state.keystore.getAddresses().map(function (e) { return e })
      },
      activeIdentity: (state, getters) => {
        if (!state.keystore || !getters.identities.length) {
          return
        }
        if (!state.selectedIdentityIdx === null) {
          return
        }
        return getters.identities[state.selectedIdentityIdx]
      },
      identities: (state, getters) => {
        if (!state.keystore) {
          return []
        }
        return state.keystore.getAddresses().map(e => {
          return {
            address: e,
            name: e.substr(0, 6),
            balance: getters.balanceByAddress(e),
            tokenBalance: getters.tokenBalanceByAddress(e)
          }
        })
      },
      balanceByAddress: (state, getters) => (address) => {
        let balanceObj = state.balances.find(balance => balance.address === address)
        if (balanceObj) {
          return balanceObj.balance
        }
        return 0
      },
      tokenBalanceByAddress: (state, getters) => (address) => {
        let balanceObj = state.balances.find(balance => balance.address === address)
        if (balanceObj) {
          return balanceObj.tokenBalance
        }
        return 0
      }
    },
    actions: {
      updateRPC ({commit, dispatch}, rpcURL) {
        console.log(rpcURL)
        commit('updateRPC', rpcURL)
        dispatch('logout')
      },
      aeContract: () => {
        return aeContract
      },
      addApp({commit}, url) {
        const CORS = 'https://cors-anywhere.herokuapp.com/'
        fetch(CORS + url)
          .then(function (response) {
            return response.text();
          })
          .then(function (text) {
            var el = document.createElement('html')
            el.innerHTML = text
            var title = el.getElementsByTagName('title')[0].innerText
            commit('addApp',
              {
                type: APP_TYPES.EXTERNAL,
                name: title,
                icon: 'static/icons/notary.svg',
                main: url
              }
            )
          })
          .catch(function (reason) {
            let title = prompt('Enter Title')
            if (title) {
              commit('addApp',
                {
                  type: APP_TYPES.EXTERNAL,
                  name: title,
                  icon: 'static/icons/notary.svg',
                  main: url
                }
              )
            }
          })
      },
      logout ({getters, dispatch, state, commit}) {
        aeContract = null
        derivedKey = null
        web3 = null
        dispatch('setUnlocked', false)
      },

      generateAddress ({dispatch, commit, state}, numAddresses = 1) {
        if (state.keystore === null) {
          return
        }
        state.keystore.generateNewAddress(derivedKey, numAddresses)
        let addrList = state.keystore.getAddresses().map(function (e) { return e })
        localStorage.setItem('numUnlockedAddresses', addrList.length)
        dispatch('updateAllBalances')
      },
      changeUser ({commit, state}, address) {
        commit('setAccount', address)
        commit('setName', address.substr(0, 6))
      },
      setAcountInterval ({dispatch, commit, state, getters}) {
        // console.log('setAcountInterval')
        setInterval(() => {
          // console.log('Check Accounts')
          if (!web3) {
            return
          }
          if (!getters.identities || getters.identities.length <= 0) {
            console.log('no accounts found')
            return
          }
          let address = getters.activeIdentity.address
          dispatch('updateBalance', address)
        }, 3000)
      },
      updateAllBalances ({getters, dispatch, commit, state}) {
        getters.identities.forEach(identitiy => {
          let address = identitiy.address
          dispatch('updateBalance', address)
        })
      },
      updateBalance ({getters, dispatch, commit, state}, address) {
        if (!web3 || !address) {
          return
        }
        web3.eth.getBalance(address).then((balance) => {
          balance = new BN(balance)
          if (balance !== null && !balance.eq(getters.balanceByAddress(address))) {
            commit('setBalance', {address: address, balance: balance})
          }
        }).catch((err) => {
          console.log(err)
        })

        if (aeContract) {
          aeContract.methods.balanceOf(address).call().then((balance) => {
            balance = new BN(balance)
            if (balance !== null && !balance.eq(getters.tokenBalanceByAddress(address))) {
              commit('setBalance', {address: address, tokenBalance: balance})
            }
          }).catch((err) => {
            console.log(err)
          })
        }
      },
      setUnlocked({commit}, isUnlocked) {
        commit('setUnlocked', isUnlocked)
      },
      restoreAddresses ({getters, dispatch, commit, state}) {
        let numUnlockedAddresses = localStorage.getItem('numUnlockedAddresses')
        let alreadyUnlocked = state.keystore.getAddresses().map(function (e) { return e })
        let toUnlock = numUnlockedAddresses - alreadyUnlocked
        if (toUnlock > 0) {
          console.log('generate how many?', toUnlock)
          dispatch('generateAddress', toUnlock)
        }
      },
      initWeb3({getters, dispatch, commit, state}, pwDerivedKey) {

        console.log('initweb3')
        if (!state.keystore) {
          return
        }
        console.log('initweb3-', state.rpcUrl)
        derivedKey = pwDerivedKey
        const opts = {
          getAccounts: function (cb) {
            cb(null, getters.addresses)
          },
          signTransaction: function (tx, cb) {
            const t = new Transaction(tx)
            console.log('sign', tx, t)
            var signed = lightwallet.signing.signTx(state.keystore, pwDerivedKey, t.serialize().toString('hex'), tx.from)
            cb(null, '0x' + signed)
          },
          approveTransaction: function (tx, cb) {
            console.log('approve', tx)
            cb(null, true)
          },
          signMessage: function (msg, cb) {
            console.log(msg)
            var signed = lightwallet.signing.signMsg(state.keystore, pwDerivedKey, msg.data, msg.from)
            cb(null, lightwallet.signing.concatSig(signed))
          },
          signPersonalMessage: function (msg, cb) {
            console.log(msg)
            var signed = lightwallet.signing.signMsg(state.keystore, pwDerivedKey, msg.data, msg.from)
            cb(null, lightwallet.signing.concatSig(signed))
          },
          rpcUrl: state.rpcUrl
        }

        var engine = new ProviderEngine()
        var web3 = new Web3(engine)
        global.web3 = web3

        // static results
        // engine.addProvider(new FixtureSubprovider({
        //   web3_clientVersion: 'ProviderEngine/v0.0.0/javascript',
        //   net_listening: true,
        //   eth_hashrate: '0x00',
        //   eth_mining: false,
        //   eth_syncing: true,
        // }))

        // cache layer
        // engine.addProvider(new CacheSubprovider())

        // filters
        // engine.addProvider(new FilterSubprovider())

        // pending nonce
        // engine.addProvider(new NonceSubprovider())

        // vm
        // engine.addProvider(new VmSubprovider())

        // id mgmt
        engine.addProvider(new HookedWalletSubprovider(opts))

        // data source
        engine.addProvider(new RpcSubprovider({
          rpcUrl: opts.rpcUrl,
        }))


        // network connectivity error
        engine.on('error', function(err){
          // report connectivity errors
          console.error(err.stack)
        })

        // start polling for blocks
        engine.stop()

        // web3 = new Web3(new Web3.providers.HttpProvider(state.rpcUrl))

        if (!web3) {  
          return
        }
        aeContract = new web3.eth.Contract(aeAbi, state.token.address)
        window.globalTokenContract = aeContract

        dispatch('setUnlocked', true)

        // dispatch('generateAddress', web3);
        dispatch('setAcountInterval')
        dispatch('restoreAddresses')
      },
      init({commit, state}) {
        if (localStorage.getItem('ks')) {
          commit('setKeystore', lightwallet.keystore.deserialize(localStorage.getItem('ks')))
        }
        if (localStorage.getItem('apps')) {
          let saved = JSON.parse(localStorage.getItem('apps'))
          let std = state.apps;
          let apps = std.concat(saved)
          apps = apps.filter((app, index, self) => self.findIndex(t => t.name === app.name && t.main === app.main) === index)
          commit('setApps', apps)
        }
      },
      createKeystore ({commit, dispatch, state}, {seed, password}) {
        return new Promise(function (resolve, reject) {
          lightwallet.keystore.createVault({
            password: password,
            seedPhrase: seed,
            hdPathString: "m/44'/60'/0'/0"
          }, function (err, keystore) {
            if (err) {
              return reject(err)
            }
            commit('setKeystore', keystore)
            localStorage.setItem('ks', keystore.serialize())
            keystore.keyFromPassword(password, (err, pwDerivedKey) => {
              if (err) {
                return reject(err)
              }
              if (!keystore.isDerivedKeyCorrect(pwDerivedKey)) {
                return reject(new Error('Wrong password'))
              }
              dispatch('initWeb3', pwDerivedKey)
              // generate the first address
              dispatch('generateAddress')
              // since we created a new account, show the id manager
              dispatch('setShowIdManager', true)
              return resolve()
            })
          })
        })
      },

      async signTransaction ({state}, {tx, appName}) {
        const tokenAddress = Web3.utils.toHex(state.token.address).toLowerCase()
        const to = tx.to ? Web3.utils.toHex(tx.to).toLowerCase() : null
        const isAeTokenTx = to === tokenAddress
        logTx(tx, tokenAddress)
        console.log(web3)
        const estimateGas = getEstimatedGas.bind(undefined, web3, tx)
        const _getGasPrice = getGasPrice.bind(undefined, web3)
        let aeTokenTx = {}

        tx.gas = tx.gas || await new Promise((resolve, reject) => {
          Web3.eth.estimateGas(tx, (error, result) => error ? reject(error) : resolve(result))
        })

        if (isAeTokenTx) {
          let data = tx.data ? tx.data : null // data sent to contract
          // it is a call to our token contract
          abiDecoder.addABI(aeAbi)
          const decodedData = abiDecoder.decodeMethod(data)
          if (decodedData) {
            console.log('decodedData', JSON.stringify(decodedData))
            let method = decodedData.name
            // e.g. callAndApprove, transfer, ...
            let params = decodedData.params
            // e.g. [{"name":"_spender","value":"0x000....","type":"address"},{"name":"_value","value":"1000000000000000000","type":"uint256"}]
            // methods which transfer tokens or allow transferring of tokens are:
            // approve(_spender, _value)
            // transferFrom(_from, _to, _value)
            // transfer(_to, _value)
            // approveAndCall(_spender, _value, _data)
            if (method === 'approveAndCall' || method === 'approve' || method === 'transfer') {
              let value = Web3.utils.toBN(params.find(param => param.name === '_value').value)
              // confirmMessage += ' which transfers ' + web3.utils.fromWei(value.toString(), 'ether') + ' Æ-Token'
            }
            aeTokenTx = decodedData
          } else {
            console.log('could not decode data')
          }
        }

        return new Promise((resolve, reject) => {
          approveTransactionDialog(
            tx,
            estimateGas,
            _getGasPrice,
            appName,
            isAeTokenTx,
            aeTokenTx
          ).then(approved => {
            if (approved) {
              const t = new Transaction(tx)
              console.log('sign', tx, t)
              const signed = lightwallet.signing.signTx(state.keystore, derivedKey, t.serialize().toString('hex'), tx.from)
              console.log('signed', signed)
              resolve(signed)
            } else {
              reject(new Error('Payment rejected by user'))
            }
          })
        })
      },
      signPersonalMessage (store, { msg, appName }) {
        const asText = Web3.utils.hexToAscii(msg.data)
        const state = store.state
        const activeIdentity = store.getters.activeIdentity;
        return new Promise((resolve, reject) => {
          approveMessageDialog(activeIdentity, asText, appName).then(approved =>{
            if (approved) {
              const data = asText
              let privateKey = state.keystore.exportPrivateKey(util.stripHexPrefix(msg.from), derivedKey)
              let privateKeyBuffer = new Buffer(privateKey, 'hex')
              const messageHash = util.hashPersonalMessage(util.toBuffer(data))
              const signed = util.ecsign(messageHash, privateKeyBuffer)
              const combined = Buffer.concat([
                Buffer.from(signed.r),
                Buffer.from(signed.s),
                Buffer.from([signed.v])
              ])
              const signedHex = util.addHexPrefix(combined.toString('hex'))
              // TODO confirm screen like in signTransaction
              resolve(signedHex)
            } else {
              reject(new Error('Signing rejected by user'))
            }
          })
        })
      },
      setShowIdManager ({state, dispatch}, showIdManager) {
        if (showIdManager) {
          dispatch('updateAllBalances')
        }
        state.showIdManager = showIdManager
      }
    }
  })
})()
window.s = store

export default store
