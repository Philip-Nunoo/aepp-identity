import { mapState } from 'vuex'
import { focus } from 'vue-focus'
import Bignumber from 'bignumber.js'
import Web from 'web3'

const {
  fromWei, toHex, fromHex
}= Web.prototype

import {
  AeModal,
  AeHeaderButton,
  AeAmount,
  AeButton,
  AeAppIcon,
  AeIcon,
  AeIdentityAvatar
} from '@aeternity/aepp-components'

export default {
  name: 'approve',
  props: {
    appName: {
      type: String,
      default: ''
    },
    transaction: {
      type: Object
    }
  },
  components: {
    AeModal,
    AeHeaderButton,
    AeAmount,
    AeButton,
    AeAppIcon,
    AeIcon,
    AeIdentityAvatar
  },
  computed: {
    amount () {
      return fromWei(this.transaction.value, 'ether')
    },
    from () {
      return this.transaction.from
    },
    to () {
      return this.transaction.to
    },
    gas () {
      const gas = this.transaction.gas
      return gas ? new Bignumber(gas) : ''
    },
    gasPrice () {
      const gasPrice = this.transaction.gasPrice
      return gasPrice ? new Bignumber(gasPrice) : ''
    },
    nonce(){
      return this.transaction.nonce
    }
  },
  methods:{
    reject(){
      this.$close(false)
    },
    accept(){
      this.$close(true)
    }
  }
};
