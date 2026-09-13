import express from 'express';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Helper to get cookie
function getAppContext(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/app_context=([^;]+)/);
  return match ? match[1] : null;
}

// Fallback asset proxies for un-prefixed requests
const worldAssetProxy = createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  pathRewrite: (path) => (path.startsWith('/world') ? path : '/world' + path),
});

const gevAssetProxy = createProxyMiddleware({
  target: 'http://localhost:4173',
  changeOrigin: true,
  pathRewrite: (path) => (path.startsWith('/gev') ? path : '/gev' + path),
});

// Route entry: set session cookies
app.use('/world', (req, res, next) => {
  res.setHeader('Set-Cookie', 'app_context=world; Path=/; SameSite=Lax');
  next();
});

app.use('/gev', (req, res, next) => {
  res.setHeader('Set-Cookie', 'app_context=gev; Path=/; SameSite=Lax');
  next();
});

// Normalization: redirect unslashed routes so Vite base resolution works
app.use((req, res, next) => {
  if (req.originalUrl === '/gev') {
    return res.redirect(301, '/gev/');
  }
  if (req.originalUrl === '/world') {
    return res.redirect(301, '/world/');
  }
  next();
});
const WEBGL_SHIM = `<script>
(function() {
  function safePrecision(precisionType, gl) {
    if (gl && (precisionType === gl.HIGH_INT || precisionType === gl.MEDIUM_INT || precisionType === gl.LOW_INT)) {
      return { rangeMin: 31, rangeMax: 30, precision: 0 };
    }
    return { rangeMin: 127, rangeMax: 127, precision: 23 };
  }

  function patchContext(gl) {
    if (!gl || gl.__patched_cesium) return gl;
    gl.__patched_cesium = true;

    const origGetParam = gl.getParameter.bind(gl);
    gl.getParameter = function(pname) {
      const val = origGetParam(pname);
      if (val === null || val === undefined) {
        if (pname === gl.ALIASED_LINE_WIDTH_RANGE) return new Float32Array([1, 1]);
        if (pname === gl.ALIASED_POINT_SIZE_RANGE) return new Float32Array([1, 1024]);
        if (pname === gl.MAX_VIEWPORT_DIMS) return new Int32Array([8192, 8192]);
        if (pname === gl.MAX_TEXTURE_SIZE || pname === gl.MAX_CUBE_MAP_TEXTURE_SIZE || pname === gl.MAX_RENDERBUFFER_SIZE) return 8192;
        if (pname === gl.MAX_3D_TEXTURE_SIZE) return 2048;
        if (pname === gl.MAX_TEXTURE_IMAGE_UNITS || pname === gl.MAX_VERTEX_ATTRIBS || pname === gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) return 16;
        if (pname === gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) return 32;
        if (pname === gl.MAX_VERTEX_UNIFORM_VECTORS || pname === gl.MAX_FRAGMENT_UNIFORM_VECTORS) return 1024;
        if (pname === gl.MAX_VARYING_VECTORS) return 15;
        if (pname === gl.STENCIL_BITS) return 8;
        if (pname === (gl.MAX_SAMPLES || 0x8D57)) return 4;
      }
      return val;
    };

    const origPrecision = gl.getShaderPrecisionFormat ? gl.getShaderPrecisionFormat.bind(gl) : null;
    gl.getShaderPrecisionFormat = function(shaderType, precisionType) {
      const res = origPrecision ? origPrecision(shaderType, precisionType) : null;
      if (res && typeof res.precision === 'number') return res;
      return safePrecision(precisionType, gl);
    };

    const origAttrs = gl.getContextAttributes ? gl.getContextAttributes.bind(gl) : null;
    gl.getContextAttributes = function() {
      const res = origAttrs ? origAttrs() : null;
      if (res) return res;
      return {
        alpha: true,
        depth: true,
        stencil: true,
        antialias: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false
      };
    };

    // Ensure drawingBufferWidth/Height never report 0 or NaN, which breaks Cesium camera aspectRatio
    try {
      const origW = Object.getOwnPropertyDescriptor(gl, 'drawingBufferWidth')?.get ||
                    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(gl), 'drawingBufferWidth')?.get;
      const origH = Object.getOwnPropertyDescriptor(gl, 'drawingBufferHeight')?.get ||
                    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(gl), 'drawingBufferHeight')?.get;
      Object.defineProperty(gl, 'drawingBufferWidth', {
        get: function() {
          const val = origW ? origW.call(this) : 0;
          if (val > 0) return val;
          return this.canvas?.clientWidth || this.canvas?.width || window.innerWidth || 1440;
        },
        configurable: true,
        enumerable: true
      });
      Object.defineProperty(gl, 'drawingBufferHeight', {
        get: function() {
          const val = origH ? origH.call(this) : 0;
          if (val > 0) return val;
          return this.canvas?.clientHeight || this.canvas?.height || window.innerHeight || 900;
        },
        configurable: true,
        enumerable: true
      });
    } catch (e) {}

    return gl;
  }

  function patchProtoDimensions(proto) {
    if (!proto) return;
    try {
      const origW = Object.getOwnPropertyDescriptor(proto, 'drawingBufferWidth')?.get;
      const origH = Object.getOwnPropertyDescriptor(proto, 'drawingBufferHeight')?.get;
      Object.defineProperty(proto, 'drawingBufferWidth', {
        get: function() {
          const val = origW ? origW.call(this) : 0;
          if (val > 0) return val;
          return this.canvas?.clientWidth || this.canvas?.width || window.innerWidth || 1440;
        },
        configurable: true,
        enumerable: true
      });
      Object.defineProperty(proto, 'drawingBufferHeight', {
        get: function() {
          const val = origH ? origH.call(this) : 0;
          if (val > 0) return val;
          return this.canvas?.clientHeight || this.canvas?.height || window.innerHeight || 900;
        },
        configurable: true,
        enumerable: true
      });
    } catch (e) {}
  }

  if (typeof HTMLCanvasElement !== 'undefined') {
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, attributes) {
      if (this.width === 0) this.width = window.innerWidth || 1440;
      if (this.height === 0) this.height = window.innerHeight || 900;
      let gl = origGetContext.call(this, type, attributes);
      if (!gl && (type === 'webgl2' || type === 'experimental-webgl2')) {
        gl = origGetContext.call(this, 'webgl', attributes);
      }
      if (gl && (type.includes('webgl') || type.includes('webgl2'))) {
        patchContext(gl);
      }
      return gl;
    };
  }

  if (typeof WebGLRenderingContext !== 'undefined') {
    patchProtoDimensions(WebGLRenderingContext.prototype);
    const orig = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(pname) {
      const v = orig.call(this, pname);
      if (v === null || v === undefined) {
        if (pname === this.ALIASED_LINE_WIDTH_RANGE) return new Float32Array([1, 1]);
        if (pname === this.ALIASED_POINT_SIZE_RANGE) return new Float32Array([1, 1024]);
        if (pname === this.MAX_VIEWPORT_DIMS) return new Int32Array([8192, 8192]);
      }
      return v;
    };
    const origP = WebGLRenderingContext.prototype.getShaderPrecisionFormat;
    WebGLRenderingContext.prototype.getShaderPrecisionFormat = function(st, pt) {
      const r = origP ? origP.call(this, st, pt) : null;
      if (r && typeof r.precision === 'number') return r;
      return safePrecision(pt, this);
    };
  }

  if (typeof WebGL2RenderingContext !== 'undefined') {
    patchProtoDimensions(WebGL2RenderingContext.prototype);
    const orig2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(pname) {
      const v = orig2.call(this, pname);
      if (v === null || v === undefined) {
        if (pname === this.ALIASED_LINE_WIDTH_RANGE) return new Float32Array([1, 1]);
        if (pname === this.ALIASED_POINT_SIZE_RANGE) return new Float32Array([1, 1024]);
        if (pname === this.MAX_VIEWPORT_DIMS) return new Int32Array([8192, 8192]);
      }
      return v;
    };
    const origP2 = WebGL2RenderingContext.prototype.getShaderPrecisionFormat;
    WebGL2RenderingContext.prototype.getShaderPrecisionFormat = function(st, pt) {
      const r = origP2 ? origP2.call(this, st, pt) : null;
      if (r && typeof r.precision === 'number') return r;
      return safePrecision(pt, this);
    };
  }
})();
</script>`;

// God's Eye View dev server proxy on :4173
const gevProxy = createProxyMiddleware({
  target: 'http://localhost:4173',
  changeOrigin: true,
  ws: true,
  pathFilter: '/gev',
  selfHandleResponse: true,
  on: {
    proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
      const contentType = proxyRes.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        const html = responseBuffer.toString('utf8');
        return html.replace('<head>', '<head>' + WEBGL_SHIM);
      }
      return responseBuffer;
    })
  }
});
app.use(gevProxy);

// Dedicated Cesium asset proxy: ensures any un-prefixed /cesium/... requests resolve directly
const cesiumAssetProxy = createProxyMiddleware({
  target: 'http://localhost:4173',
  changeOrigin: true,
  pathFilter: '/cesium',
  pathRewrite: { '^/cesium': '/gev/cesium' },
});
app.use(cesiumAssetProxy);

// World Monitor dev server proxy on :3000
const worldProxy = createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  ws: true,
  pathFilter: '/world',
});
app.use(worldProxy);

// Landing page route at /: clear cookie and serve static landing
app.get('/', (req, res, next) => {
  res.setHeader('Set-Cookie', 'app_context=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  next();
});
app.use(express.static(path.join(__dirname, '..', 'landing')));

// Fallback for sub-resources: check cookie or referer
app.use((req, res, next) => {
  const context = getAppContext(req);
  const referer = req.headers.referer || '';

  if (context === 'world' || referer.includes('/world')) {
    return worldAssetProxy(req, res, next);
  }
  if (context === 'gev' || referer.includes('/gev')) {
    return gevAssetProxy(req, res, next);
  }
  next();
});

const server = app.listen(PORT, () => {
  console.log(`Unified console → http://localhost:${PORT}`);
});
