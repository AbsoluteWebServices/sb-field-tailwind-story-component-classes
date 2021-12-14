const path = require('path')

/**
 * @type {import('@vue/cli-service').ProjectOptions}
 */
module.exports = {
  configureWebpack: {
    output: {
      filename: 'export.js'
    },
    optimization: {
      splitChunks: false
    },
    resolve: {
      alias: {
        '@unocss/preset-mini': path.resolve(__dirname, './node_modules/@unocss/preset-mini/dist/')
      }
    }
  },
  chainWebpack: config => {
    config.module
      .rule('cjs')
      .test(/\.c|mjs$/)
      .use('babel-loader')
      .loader('babel-loader')
      .end()
  },
  transpileDependencies: [
    '@unocss/core',
    /@unocss\/preset-.*/
  ],
  filenameHashing: false,
  runtimeCompiler: true,
  productionSourceMap: false,
  css: {
    extract: false,
    loaderOptions: {
      sass: {
        additionalData: `
        @import "~storyblok-design-system/src/assets/styles/variables.scss";
        @import "~storyblok-design-system/src/assets/styles/global.scss";
        @import "~storyblok-design-system/src/assets/styles/resets.scss";
        @import "~storyblok-design-system/src/assets/styles/mixins.scss";`
      },
    },
  }
}
