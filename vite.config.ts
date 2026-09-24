import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function singleFileBundlePlugin() {
  return {
    name: 'single-file-bundle',
    enforce: 'post' as const,
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist')
      const indexPath = path.join(distDir, 'index.html')
      if (!fs.existsSync(indexPath)) return

      let html = fs.readFileSync(indexPath, 'utf-8')

      // 1. Inline all CSS stylesheets into <head>
      html = html.replace(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/gi, (match, href) => {
        const cleanHref = href.startsWith('/') ? href.slice(1) : href.startsWith('./') ? href.slice(2) : href
        const cssPath = path.join(distDir, cleanHref)
        if (fs.existsSync(cssPath)) {
          const cssContent = fs.readFileSync(cssPath, 'utf-8')
          return `<style>\n${cssContent}\n</style>`
        }
        return match
      })

      // 2. Remove modulepreload links
      html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/gi, '')

      // 3. Remove any dev redirect script if present
      html = html.replace(/<script>[\s\S]*?window\.location\.replace[\s\S]*?<\/script>/gi, '')

      // 4. Collect and inline all JavaScript files to inject at the BOTTOM of <body>
      let scriptTags = ''
      html = html.replace(/<script[^>]+type="module"[^>]+src="([^"]+)"[^>]*><\/script>/gi, (match, src) => {
        const cleanSrc = src.startsWith('/') ? src.slice(1) : src.startsWith('./') ? src.slice(2) : src
        const jsPath = path.join(distDir, cleanSrc)
        if (fs.existsSync(jsPath)) {
          let jsContent = fs.readFileSync(jsPath, 'utf-8')
          jsContent = jsContent.replace(/<\/script/gi, '<\\/script')
          scriptTags += `<script>\n(() => {\n${jsContent}\n})();\n</script>\n`
          return '' // Remove from <head>
        }
        return match
      })

      // 5. Inline favicon as data URI
      const faviconPath = path.join(distDir, 'favicon.svg')
      if (fs.existsSync(faviconPath)) {
        const svgContent = fs.readFileSync(faviconPath, 'utf-8')
        const base64Svg = Buffer.from(svgContent).toString('base64')
        const dataUri = `data:image/svg+xml;base64,${base64Svg}`
        html = html.replace(/href="[^"]*favicon\.svg"/g, `href="${dataUri}"`)
      }

      // 6. Inject the JavaScript at the very end of <body>, guaranteeing <div id="root"> exists
      // CRITICAL: We use substring slicing instead of html.replace('</body>', ...)
      // because String.prototype.replace treats '$' ($', $&, $1, etc.) as substitution tokens,
      // which corrupts minified JavaScript containing '$' variables!
      if (scriptTags) {
        const bodyCloseIndex = html.lastIndexOf('</body>')
        if (bodyCloseIndex !== -1) {
          html = html.slice(0, bodyCloseIndex) + scriptTags + '\n' + html.slice(bodyCloseIndex)
        } else {
          html += `\n${scriptTags}`
        }
      }

      // Write standalone index.html in dist
      fs.writeFileSync(indexPath, html, 'utf-8')
      console.log('✓ Standalone dist/index.html created successfully with scripts at end of body!')

      // Also write OrquestraApp.html in project root for instant 1-click access
      const rootAppPath = path.resolve(__dirname, 'OrquestraApp.html')
      fs.writeFileSync(rootAppPath, html, 'utf-8')
      console.log('✓ OrquestraApp.html created in project root!')
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), singleFileBundlePlugin()],
  server: {
    port: 5173,
    host: true,
  },
})
