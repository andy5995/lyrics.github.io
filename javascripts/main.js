'use strict'


var baseURL = 'https://api.github.com/repos/Lyrics/lyrics/contents/database/'
var debounceTime = 1000;


/* API */

function APIreadPath (path, cb) {
    Vue.http.get(baseURL + path).then(
        function(response) {
            if (response.ok) {
                cb(null, response.body)
            } else {
                cb(new Error('Empty directory'))
            }
        },
        function(response) {
            const reason = response.status == 403 ? 'API rate limit exceeded, please wait a bit before trying again' : 'Something went wrong'
            cb(new Error(reason))
        })
}

function APIreadFile (path, cb) {
    Vue.http.get(baseURL + path).then(
        function(response) {
            Vue.http.get(response.body.download_url).then(
                function (response) {
                    cb(null, response.body)
                },
                function (response) {
                    cb(new Error("Something went wrong again"))
                })
        },
        function(response) {
            const reason = response.status == 403 ? 'API rate limit exceeded, please wait a bit before trying again' : 'Something went wrong'
            cb(new Error(reason))
        })
}

function APIsearch (query, cb) {
    if (query.length < 3) {
        cb(new Error("Query too short"))
    } else {
        Vue.http.get('https://api.github.com/search/code?q=repo:Lyrics/lyrics path:database/ fork:false ' + query)
            .then(function (response) {
                cb(null, response.body.items)
            },
            function (response) {
                const reason = response.status == 403 ? 'Search API rate limit exceeded, please try searching again later' : 'Something went wrong'
                cb(new Error(reason))
            })
    }
}


/* Breadcrumbs */

var breadcrumbsData = []

function updateBreadcrumbs(route) {
    if (breadcrumbsData.length) {
        for (var i = breadcrumbsData.length; i >= 0; i--)
            Vue.delete(breadcrumbsData, i)
    }

    if (!route) return;

    var usedParams = [];
    var i = 1;
    for (var pname in route.params) {
        if (!route.params[pname]) continue;

        var path = ('/db/' + usedParams.join('/') + '/' + route.params[pname]).replace(/\/+/g, '/')
        Vue.set(breadcrumbsData, i++, { path: path, name: route.params[pname] })
        usedParams.push(route.params[pname])
    }
}


/* / */

const Home = {
    created: function () {
        document.title = 'Lyrics'
        updateBreadcrumbs()
    },
    template: '<div>Please start by picking a letter or using the search field</div>'
}


/* /db/:letter/:artist/:album */

const Path = {
    data () {
        return {
            loading: false,
            items: null,
            error: null
        }
    },
    created () {
        this.fetchData()
    },
    watch: {
        '$route': 'fetchData'
    },
    methods: {
        fetchData () {
            this.error = this.items = null
            this.loading = true

            APIreadPath([
                this.$route.params.letter,
                this.$route.params.artist,
                this.$route.params.album
            ].join('/').replace(/\/*$/, ''), (err, items) => {
                this.loading = false

                if (err) {
                    this.error = err.toString()
                } else {
                    this.items = items
                }

                var title = []

                if (this.$route.params.album)
                    title.push(this.$route.params.album)
                if (this.$route.params.artist)
                    title.push(this.$route.params.artist)
                if (this.$route.params.letter)
                    title.push(this.$route.params.letter)

                title.push('Lyrics')

                document.title = title.join(' | ')

                updateBreadcrumbs(this.$route)
            })
        }
    },
    template: `<div class="path">
                <div class="loading" v-if="loading">Loading…</div>
                <div v-if="error" class="error">{{ error }}</div>
                <transition name="slide">
                 <div v-if="items" class="content">
                  <ul id="ls">
                   <li v-for="item in items"><router-link :to="{ path: item.name }" append>{{ item.name }}</a></li>
                  </ul>
                 </div>
                </transition>
                </div>`
}


/* /db/:letter/:artist/:album/:song */

const File = {
    data () {
        return {
            loading: false,
            text: null,
            error: null
        }
    },
    created () {
        this.fetchData()
    },
    watch: {
        '$route': 'fetchData'
    },
    methods: {
        fetchData () {
            this.error = this.text = null
            this.loading = true

            APIreadFile([
                this.$route.params.letter,
                this.$route.params.artist,
                this.$route.params.album,
                this.$route.params.song
            ].join('/').replace(/\/*$/, ''), (err, text) => {
                this.loading = false

                if (err) {
                    this.error = err.toString()
                } else {
                    this.text = text
                }

                document.title = this.$route.params.song + ' – ' + this.$route.params.artist + ' |  Lyrics'

                updateBreadcrumbs(this.$route)
            })
        }
    },
    template: `<div class="file">
                 <div class="loading" v-if="loading">Loading…</div>
                 <div v-if="error" class="error">{{ error }}</div>
                 <transition name="slide">
                  <div v-if="text" class="content"><pre>{{ text }}</pre></div>
                 </transition>
               </div>`
}


Vue.component('search-query', {
    data () {
        return {
            query: '',
        }
    },
    methods: {
        find () {
            if (this.query.length) {
                this.$router.push('/search/' + this.query)
            }
        }
    },
    template: '<input id="query" type="search" v-on:input="find" v-model="query" placeholder="Search" />'
})

const Search = {
    data () {
        return {
            loading: false,
            items: null,
            error: null
        }
    },
    created () {
        document.title = 'Search | Lyrics'
        updateBreadcrumbs()
        this.fetchData()
    },
    watch: {
        '$route': 'fetchData'
    },
    methods: {
        fetchData: debounce(function () {
            this.error = this.items = null
            this.loading = true

            APIsearch(this.$route.params.query, (err, items) => {
                this.loading = false

                if (err) {
                    this.error = err.toString()
                } else {
                    this.items = items
                }
            })
        }, debounceTime)
    },
    template: `<div class="search">
                <div class="loading" v-if="loading">Loading…</div>
                <div v-if="error" class="error">{{ error }}</div>
                <transition name="slide">
                 <div v-if="items" class="content">
                  <ul id="ls">
                   <li v-for="item in items"><router-link :to="{ path: '/db' + item.path.substring(8) }">{{ item.name }}</a></li>
                  </ul>
                 </div>
                </transition>
                </div>`
}


/* Set up the routing */

Vue.use(VueRouter)

const router = new VueRouter({
    linkActiveClass: 'active',
    routes: [
        {
            path: '/',
            component: Home
        },
        {
            path: '/db/:letter/:artist?/:album?',
            component: Path
        },
        {
            path: '/db/:letter/:artist/:album/:song',
            component: File
        },
        {
            path: '/search/:query',
            component: Search
        }
    ]
})


/* Initiate the framework */

new Vue({router,
    data: function () {
        return {
            alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
            breadcrumbs: breadcrumbsData
        }
    }
}).$mount('#app')
