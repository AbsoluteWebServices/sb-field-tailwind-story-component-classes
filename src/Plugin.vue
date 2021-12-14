<template>
  <div>
    <template v-if="blocks.length">
      <TextField
        v-for="name in blocks"
        :key="name"
        :value="model.classes[name]"
        :name="name"
        :label="name"
        @input="(e) => onInput(name, e)"
      />
    </template>
  </div>
</template>

<script>
import { createGenerator } from '@unocss/core'
import presetWind from '@unocss/preset-wind'
import debounce from 'lodash-es/debounce'
import TextField from 'storyblok-design-system/src/components/TextField'

const union = (setA, setB) => {
  let _union = new Set(setA)
  for (let elem of setB) {
    _union.add(elem)
  }
  return _union
}

const blocksBlacklist = ['BreakpointValue', 'BreakpointBoolean', 'ProductsQuery']

export default {
  name: 'TailwindStoryComponentClassesPlugin',
  mixins: [window.Storyblok.plugin],
  components: {
    TextField
  },
  data() {
    return {
      blocksSet: null,
      styles: {},
      uno: null,
    }
  },
  methods: {
    initWith() {
      return {
        plugin: 'tailwind-story-component-classes',
        classes: {},
        css: '',
      }
    },
    removeUiKit() {
      this.removeStyleByHref(
        "https://app.storyblok.com/assets/css/index-latest.css"
      ); // in local dev mode
      this.removeStyleByHref(
        "https://plugins.storyblok.com/assets/css/index-latest.css"
      ); // built plugin
    },
    removeStyleByHref(href) {
      const style = document.querySelector(`link[href="${href}"]`);

      if (style) {
        style.parentNode.removeChild(style);
      }
    },
    pluginCreated() {
      this.removeUiKit()
      this.crawlStory()

      setInterval(() => {
        this.$emit('get-context')
      }, 100)

      if (this.options && this.options.themeUrl) {
        fetch(this.options.themeUrl)
          .then(res => res.json())
          .then(theme => {
            if (theme.screens) {
              theme.breakpoints = theme.screens
              delete theme.screens
            }
            this.uno = createGenerator({ presets: [presetWind()], theme })
            this.generateStyles()
          })
      } else {
        this.uno = createGenerator({ presets: [presetWind()] })
        this.generateStyles()
      }
    },
    crawlRecursive (item) {
      let tokens = new Set()

      if (item && typeof item === 'object') {
        if (item.component && !item.component.startsWith('_') && !blocksBlacklist.includes(item.component)) {
          tokens.add(`sb-${item.component}`)
        }

        for (const key in item) {
          if (Object.hasOwnProperty.call(item, key) && item[key]) {
            const prop = item[key]

            if (typeof prop === 'object') {
              if (Array.isArray(prop)) {
                prop.forEach(block => {
                  tokens = union(tokens, this.crawlRecursive(block))
                })
              } else {
                tokens = union(tokens, this.crawlRecursive(prop))
              }
            } 
          }
        }
      }
      
      return tokens
    },
    crawlStory () {
      this.blocksSet = this.crawlRecursive(this.storyItem.content)
    },
    async generateStyles () {
      let css = ''
      if (this.uno && this.model.classes && typeof this.model.classes === 'object') {
        this.uno.setConfig({
          ...this.uno.config,
          shortcuts: this.model.classes
        })
        const result = await this.uno.generate(new Set(Object.keys(this.model.classes)), { scope: `.story-${this.storyId}` })
        css = result.css
      }
      this.model.css = css
    },
    onInput: debounce(async function (name, value) {
      if (typeof this.model.classes !== 'object') {
        this.model.classes = {}
      }
      this.$set(this.model.classes, name, value)
      await this.generateStyles()
    }, 500),
  },
  computed: {
    blocks() {
      return Array.from(this.blocksSet || [])
    }
  },
  watch: {
    model: {
      handler(value) {
        this.$emit('changed-model', value)
      },
      deep: true,
    },
    storyItem: function(old, newVal) {
      if (window.JSON.stringify(old) != window.JSON.stringify(newVal)) {
        this.crawlStory()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.sb-textfield {
  margin-bottom: 2rem;

  ::v-deep &__input {
    font-size: 16px;
  }
}
</style>
