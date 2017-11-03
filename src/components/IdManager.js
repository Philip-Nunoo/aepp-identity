import aeIdentity from './aeIdentity/aeIdentity.vue'
import aeButton from './aeButton/aeButton.vue'
import aeButtonIcon from './aeButtonIcon/aeButtonIcon.vue'
import { swiper as Swiper, swiperSlide as SwiperSlide } from 'vue-awesome-swiper'

const commonSwiperOptions = {
  grabCursor: true,
  setWrapperSize: false,
  autoHeight: false,
  paginationClickable: true,
  mousewheelControl: true,
  observeParents: true,
  debugger: true
}

export default {
  name: 'IdManager',
  data () {
    return {
      notNextTick: true,
      swiperOptions: {
        '_direction_vertical': {
          ...commonSwiperOptions,
          direction: 'vertical',
          spaceBetween: 0,
          centeredSlides: false,
          slidesPerView: 1.2,
          roundLengths: true,
          pagination: '.swiper-pagination._direction_vertical'
        },
        '_direction_horizontal': {
          ...commonSwiperOptions,
          direction: 'horizontal',
          spaceBetween: 0,
          centeredSlides: true,
          slidesPerView: 2,
          roundLengths: true,
          pagination: '.swiper-pagination._direction_horizontal'
        }
      }
    }
  },
  props: {
    title: String
  },
  components: {
    'ae-identity': aeIdentity,
    'ae-button': aeButton,
    'ae-button-icon': aeButtonIcon,
    'swiper': Swiper,
    'swiper-slide': SwiperSlide
  },
  computed: {
    activeIdentity () {
      return this.$store.getters.activeIdentity
    },
    addresses () {
      return this.$store.getters.addresses
    },
    identities () {
      return this.$store.getters.identities
    }
  },
  methods: {
    activateId (id) {
      this.$store.commit('selectIdentity', this.identities.indexOf(id))
    },
    generateFirstAddress () {
      console.log('generateFirstAddress')
      this.$store.dispatch('generateAddress')
    },
    generateNewIdentity () {
      console.log('generateNewIdentity')
      this.$store.dispatch('generateAddress')
    },
    goBack () {
      // this.$router.push('/app-browser')
      this.$store.commit('setShowIdManager', false)
    },
    isActive (id) {
      return id.address === this.activeIdentity.address
    },
    copyAddress (address) {
      let textArea = document.createElement('textarea')
      textArea.value = address
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
      } catch (err) {
        console.log('Copy failed')
      }
      document.body.removeChild(textArea)
    },
    swipeTo (index) {
      if (index >= 0 && index < this.identities.length) {
        this.$refs.mySwiper.swiper.slideTo(index)
      }
    }
  },
  created () {
    if (!this.$store.state.unlocked) {
      this.$router.push({ path: 'unlock' })
    }
    if (this.addresses && this.addresses.length < 1) {
      this.generateFirstAddress()
    }
  },
  mounted () {
    this.$refs.mySwiper.swiper.slideTo(this.$store.state.selectedIdentityIdx)
  }
}
