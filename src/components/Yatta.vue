<template>
  <div class="container">
    <g-signin-button
      :params="googleSignInParams"
      @success="onSignInSuccess"
      @error="onSignInError"
      v-if="!signedIn">
      Sign in with Google
    </g-signin-button>
    <div v-if="playlist.length > 0">
      <youtube
        :video-id="playlist[0].id.videoId"
        @ready="videoReady"
        @paused="videoPaused"
        @ended="videoEnded">
      </youtube>
      <button @click="videoSkip">Skip</button>
      <div>
        Up Next
      </div>
      <ol>
        <li v-for="(video, index) in playlist">
          <div v-if="index >= 1">
            {{ video.snippet.channelTitle }} - {{ video.snippet.title }}
            <img :src="video.snippet.thumbnails.default.url">
          </div>
        </li>
      </ol>
    </div>
  </div>
</template>

<script src="https://apis.google.com/js/platform.js" async defer></script>
<script>

import Vue from 'vue'
import VueResource from 'vue-resource'
import GoogleSignInButton from 'vue-google-signin-button'
import VueYouTubeEmbed from 'vue-youtube-embed'
import _ from 'lodash'

const SUBS   = 'https://www.googleapis.com/youtube/v3/subscriptions'
const SEARCH = 'https://www.googleapis.com/youtube/v3/search'

const PLAYLIST_LENGTH = 10

Vue.use(GoogleSignInButton)
Vue.use(VueResource)
Vue.use(VueYouTubeEmbed)

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

export default {
  name: 'Yatta',
  components: {
    GoogleSignInButton,
    VueYouTubeEmbed
  },
  data () {
    return {
      user: null,
      signedIn: false,
      gotAllChannels: false,
      playlist: [],
      channelData: [],
      channelIds: [],
      requestData: {},
      player: null,
      nextToken: null,
      googleSignInParams: {
        client_id: '276948334679-5av2u6kdbp3t2cubjkl8d2989f0l23nt.apps.googleusercontent.com'
      }
    }
  },

  methods: {
    onSignInSuccess (googleUser) {
      this.user = googleUser
      this.signedIn = true

      const vm = this

      this.$watch('gotAllChannels', newValue => {
        this.channelIds = _.map(this.channelData, channelDatum => {
          return channelDatum.snippet.resourceId.channelId
        })

        this.getRandomVideo()
      })

      this.$watch('playlist', newVideo => {
        if (this.playlist.length < 10) this.getRandomVideo()
      })

      this.$watch('nextToken', newToken => {
        var requestData = {
          headers: {
            Authorization: `${this.user.Zi.token_type} ${this.user.Zi.access_token}`
          },
          params: {
            part: 'snippet',
            maxResults: 50
          }
        }

        this.requestData = _.cloneDeep(requestData)

        requestData.params.mine = true

        if (vm.nextToken) requestData.params.pageToken = vm.nextToken

        this.$http.get(SUBS, requestData)
        .then(response => {
          response.body.items.forEach(item => vm.channelData.push(item))

          let hasNext = _.has(response.body, 'nextPageToken')

          if (hasNext) {
            vm.nextToken = response.body.nextPageToken
          } else {
            this.gotAllChannels = true
          }
        })
      })

      this.nextToken = false
    },

    onSignInError (error) {
      console.err(error)
    },

    getRandomVideo() {
      let selectedChannel = this.channelIds[Math.floor(Math.random() * this.channelIds.length)]

      const vm = this

      Promise.all([
        // Get first video from channel
        new Promise((resolve, reject) => {
          let params = {
            part: 'snippet',
            channelId: selectedChannel,
            publishedAfter: (new Date(0)).toISOString(),
            maxResults: 1
          },
          requestData = _.cloneDeep(vm.requestData)

          requestData.params = params

          vm.$http.get(SEARCH, requestData)
          .then(response => {
            resolve(new Date(response.body.items[0].snippet.publishedAt))
          })
        }),
        // Get most recent video from channel
        new Promise((resolve, reject) => {
          let params = {
            part: 'snippet',
            channelId: selectedChannel,
            publishedBefore: (new Date()).toISOString(),
            maxResults: 1,
            order: 'date'
          },
          requestData = _.cloneDeep(vm.requestData)

          requestData.params = params

          vm.$http.get(SEARCH, requestData)
          .then(response => {
            resolve(new Date(response.body.items[0].snippet.publishedAt))
          })
        })
      ])
      .then(values => {
        let startTime = values[0],
            endTime   = values[1]

        let requestData = _.cloneDeep(vm.requestData)
        requestData.params = {
          part: 'snippet',
          channelId: selectedChannel,
          publishedAfter: randomDate(startTime, endTime).toISOString(),
          maxResults: 50
        }

        vm.$http.get(SEARCH, requestData)
        .then(response => {
          let idx = Math.floor(Math.random() * response.body.items.length)
          vm.playlist.push(response.body.items[idx])
        })
      })
    },

    videoReady (player) {
      this.player = player
      this.player.playVideo()

      const vm = this
      this.$watch('playlist', () => {
        vm.player.playVideo()
      })
    },

    videoPaused () {

    },

    videoEnded () {
      this.getRandomVideo()
      this.playlist.shift()
    },

    videoSkip () {
      this.playlist.shift()
      this.getRandomVideo()
      this.player.playVideo()
    }
  }
}
</script>

<style scoped>
h1, h2 {
  font-weight: normal;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}

.g-signin-button {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 3px;
    background-color: #3c82f7;
    color: #fff;
    box-shadow: 0 3px 0 #0f69ff;
    cursor: pointer;
}
</style>
