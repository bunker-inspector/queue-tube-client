import Vue from 'vue'
import Router from 'vue-router'
import Yatta from '@/components/Yatta'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Yatta',
      component: Yatta
    }
  ]
})
