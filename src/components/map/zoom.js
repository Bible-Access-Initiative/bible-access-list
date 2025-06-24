export default class SvgPanZoom {
    constructor(svg, {
      minScale = 0.25,
      maxScale = 8,
      wheelStep = 0.1
    } = {}) {
      this.svg = svg;
      this.minScale = minScale;
      this.maxScale = maxScale;
      this.wheelStep = wheelStep;
  
      this.points = new Map();          // active pointerId ➜ SVGPoint
      this.initViewBox();               // sets this.viewBox & this.base
  
      // bind once, reuse in add/remove listeners
      this.onPointerDown = this.pointerDown.bind(this);
      this.onPointerMove = this.pointerMove.bind(this);
      this.onPointerUp   = this.pointerUp.bind(this);
      this.onWheel       = this.wheel.bind(this);
      this.onKey         = this.key.bind(this);
    }
  
    /* ---------- initial sizing ---------- */
    initViewBox() {
      const vb = this.svg.viewBox.baseVal;
      if (vb && vb.width) {             // developer supplied viewBox
        this.viewBox = { ...vb };
      } else {                          // derive from bbox
        const { x, y, width, height } = this.svg.getBBox();
        this.svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
        this.viewBox = { x, y, width, height };
      }
      // save original for reset()
      this.base = { ...this.viewBox };
    }
  
    /* ---------- public API ---------- */
    init() {
      const opts = { passive:false };   // we’ll call preventDefault()
      this.svg.addEventListener('pointerdown', this.onPointerDown, opts);
      this.svg.addEventListener('pointermove', this.onPointerMove, opts);
      this.svg.addEventListener('pointerup',   this.onPointerUp,   opts);
      this.svg.addEventListener('pointercancel', this.onPointerUp, opts);
      this.svg.addEventListener('wheel', this.onWheel, opts);
      document.addEventListener('keydown', this.onKey); // A11y
    }
    destroy() {
      this.svg.removeEventListener('pointerdown', this.onPointerDown);
      this.svg.removeEventListener('pointermove', this.onPointerMove);
      this.svg.removeEventListener('pointerup',   this.onPointerUp);
      this.svg.removeEventListener('pointercancel', this.onPointerUp);
      this.svg.removeEventListener('wheel', this.onWheel);
      document.removeEventListener('keydown', this.onKey);
    }
  
    zoomIn()  { this.zoomToPoint(1 - this.wheelStep); }
    zoomOut() { this.zoomToPoint(1 + this.wheelStep); }
    reset()   { this.viewBox = { ...this.base }; this.update(); }
  
    /* ---------- low‑level helpers ---------- */
    clientToSvg({ clientX, clientY }) {
      const pt = this.svg.createSVGPoint();
      pt.x = clientX; pt.y = clientY;
      return pt.matrixTransform(this.svg.getScreenCTM().inverse());
    }
    clamp() {
      const { width: cw, height: ch } = this.base;
      const { x, y, width, height }   = this.viewBox;
      this.viewBox.x = Math.min(Math.max(x, this.base.x), this.base.x + cw - width);
      this.viewBox.y = Math.min(Math.max(y, this.base.y), this.base.y + ch - height);
    }
    update() {
      const v = this.viewBox;
      this.svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.width} ${v.height}`);
      document.getElementById('zoomLive').textContent =
        `${Math.round(this.base.width / v.width * 100)} %`;
    }
  
    /* ---------- event handlers ---------- */
    pointerDown(ev) {
      this.svg.setPointerCapture(ev.pointerId);
      this.points.set(ev.pointerId, this.clientToSvg(ev));
    }
    pointerMove(ev) {
      if (!this.points.has(ev.pointerId)) return;
      this.points.set(ev.pointerId, this.clientToSvg(ev));
  
      if (this.points.size === 1) {                 // PAN
        const [curr] = this.points.values();
        if (!this.lastPan) this.lastPan = curr;
        const dx = this.lastPan.x - curr.x;
        const dy = this.lastPan.y - curr.y;
        this.viewBox.x += dx;
        this.viewBox.y += dy;
        this.clamp();
        this.update();
        this.lastPan = curr;
      } else if (this.points.size === 2) {          // PINCH
        const [p1, p2] = [...this.points.values()];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (!this.lastDist) this.lastDist = dist;
  
        const scaleFactor = this.lastDist / dist;
        // Mid‑point stays under fingers
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        this.zoomToPoint(scaleFactor, mid);
        this.lastDist = dist;
      }
    }
    pointerUp(ev) {
      this.svg.releasePointerCapture(ev.pointerId);
      this.points.delete(ev.pointerId);
      if (this.points.size < 2) this.lastDist = null;
      if (this.points.size === 0) this.lastPan = null;
    }
  
    wheel(ev) {
      ev.preventDefault();
      const dir = ev.deltaY < 0 ? 1 - this.wheelStep : 1 + this.wheelStep;
      this.zoomToPoint(dir, this.clientToSvg(ev));
    }
  
    key(ev) {
      if (ev.target !== document.body) return;      // ignore when typing elsewhere
      switch (ev.key) {
        case '+':
        case '=': this.zoomIn(); break;
        case '-':
        case '_': this.zoomOut(); break;
        case '0': this.reset(); break;
        case 'ArrowUp':   this.viewBox.y -= this.viewBox.height * 0.05; break;
        case 'ArrowDown': this.viewBox.y += this.viewBox.height * 0.05; break;
        case 'ArrowLeft': this.viewBox.x -= this.viewBox.width  * 0.05; break;
        case 'ArrowRight':this.viewBox.x += this.viewBox.width  * 0.05; break;
        default: return;
      }
      this.clamp(); this.update();
    }
  
    /* ---------- core zoom routine ---------- */
    zoomToPoint(scaleFactor, svgPoint = { x: this.viewBox.x + this.viewBox.width/2,
                                          y: this.viewBox.y + this.viewBox.height/2 }) {
      const newW = this.viewBox.width  * scaleFactor;
      const newH = this.viewBox.height * scaleFactor;
      const k     = newW / this.viewBox.width;     // same as scaleFactor but clearer
  
      if (newW < this.base.width  * this.minScale ||
          newW > this.base.width  * this.maxScale) return;
  
      this.viewBox.x = svgPoint.x - (svgPoint.x - this.viewBox.x) * k;
      this.viewBox.y = svgPoint.y - (svgPoint.y - this.viewBox.y) * k;
      this.viewBox.width  = newW;
      this.viewBox.height = newH;
      this.clamp();
      this.update();
    }
  }
  