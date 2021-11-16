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
import presetUno from '@unocss/preset-uno/dist/index.js'
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
            this.uno = createGenerator({ presets: [presetUno()], theme })
            this.generateStyles()
          })
      } else {
        this.uno = createGenerator({ presets: [presetUno()] })
        this.generateStyles()
      }
    },
    crawlRecursive (item) {
      let tokens = new Set()

      if (item && typeof item === 'object') {
        if (item.component && !item.component.startsWith('_') && !blocksBlacklist.includes(item.component)) {
          tokens.add(item.component)
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
    async generateStylesForComponent (component) {
      let css = ''
      if (this.uno && this.model.classes && this.model.classes[component]) {
        const result = await this.uno.generate(new Set(this.model.classes[component].split(' ')))
        css = result.css
        if (css) {
          css = css.replace(/\/\*.*\*\/\n/gm, '')
          css = css.replace(/^\..*{/gm, '{')
          css = css.replace(/}\n{/gm, '')
          css = `.story-${this.storyId} .sb-${component}${css}`
        }
      }
      return css
    },
    async generateStyles () {
      if (this.model.classes && typeof this.model.classes === 'object') {
        for (const key in this.model.classes) {
          if (Object.hasOwnProperty.call(this.model.classes, key)) {
            this.$set(this.styles, key, await this.generateStylesForComponent(key))
          }
        }
        this.setCss()
      }
    },
    setCss () {
      this.model.css = Object.values(this.styles).filter(value => value).join('\n')
    },
    onInput: debounce(async function (name, value) {
      if (typeof this.model.classes !== 'object') {
        this.model.classes = {}
      }
      this.$set(this.model.classes, name, value)
      this.$set(this.styles, name, await this.generateStylesForComponent(name))
      this.setCss()
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
