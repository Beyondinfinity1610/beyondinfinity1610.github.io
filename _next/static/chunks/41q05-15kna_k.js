(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,[48705,e=>{var t=e.i(43476),a=e.i(71645),r=e.i(90072),n=e.i(95393),i=e.i(33623);let o=`
  uniform float strength;
  uniform float aberration;
  uniform vec2 center;

  float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 toCenter = center - uv;
    vec2 fringe = -toCenter * aberration;
    if (strength < 0.002) {
      outputColor = vec4(texture2D(inputBuffer, uv + fringe).r, inputColor.g, texture2D(inputBuffer, uv - fringe).b, inputColor.a);
      return;
    }
    vec3 color = vec3(0.0);
    float total = 0.0;
    float offset = rand(uv);
    for (float t = 0.0; t <= 24.0; t++) {
      float percent = (t + offset) / 24.0;
      float weight = 4.0 * (percent - percent * percent);
      vec2 p = uv + toCenter * percent * strength;
      color.r += texture2D(inputBuffer, p + fringe).r * weight;
      color.g += texture2D(inputBuffer, p).g * weight;
      color.b += texture2D(inputBuffer, p - fringe).b * weight;
      total += weight;
    }
    outputColor = vec4(color / total, inputColor.a);
  }
`;class s extends i.x{constructor(){super("LensEffect",o,{attributes:i.h.CONVOLUTION,uniforms:new Map([["strength",new r.MY(0)],["aberration",new r.MY(.0012)],["center",new r.MY(new r.wq(.5,.5))]])})}set(e,t){this.uniforms.get("strength").value=e,this.uniforms.get("aberration").value=t}}e.s(["f",0,function({drive:e,reduced:r=!1}){let i=(0,a.useMemo)(()=>new s,[]),o=(0,a.useRef)({cut:-1e9,dive:-1e9});return(0,a.useEffect)(()=>{let e=()=>o.current.cut=performance.now(),t=()=>o.current.dive=performance.now();return window.addEventListener("site:cut",e),window.addEventListener("site:dive",t),()=>{window.removeEventListener("site:cut",e),window.removeEventListener("site:dive",t)}},[]),(0,a.useEffect)(()=>()=>i.dispose(),[i]),(0,n.f)(()=>{if(r)return void i.set(0,8e-4);let t=performance.now(),a=(t-o.current.cut)/1e3,n=a<0||a>.7?0:.32*Math.sin(Math.min(1,a/.7)*Math.PI),s=(t-o.current.dive)/1e3,l=s<0||s>1.2?0:Math.min(1,s/.9)**2*.75,u=Math.max(e?.current??0,n,l);i.set(u,.0012+.012*u)}),(0,t.jsx)("primitive",{object:i,dispose:null})}])},2966,e=>{var t=e.i(43476),a=e.i(71645),r=e.i(90072),n=e.i(75056),i=e.i(95393),o=e.i(90874),s=e.i(79877),l=e.i(25564),u=e.i(91883),c=e.i(34510);let f=e=>{let t=Math.min(1,Math.max(0,e));return t*t*(3-2*t)},h=(e,t,a)=>Math.min(1,Math.max(0,(e-t)/(a-t)));function p({phase:e,position:n}){let o=(0,a.useMemo)(()=>new r.cE(1,1.12,1.18),[]),s=(0,a.useMemo)(()=>{let e=(0,c.a)(3),t=[];for(;t.length<8400;){let a=new r.cE(2*e()-1,2*e()-1,2*e()-1);if(!(a.lengthSq()>1||.01>a.lengthSq()))a.normalize(),a.y<-.55||(a.multiplyScalar(1.9).multiply(o),t.push(a.x,a.y,a.z))}let a=new r.ld;return a.setAttribute("position",new r.f5(new Float32Array(t),3)),a},[o]),l=(0,a.useMemo)(()=>(function(){let e=[new r.cE(0,1,0)];for(let[t,a]of[[.62,6],[1.1,12]])for(let n=0;n<a;n++){let i=n/a*Math.PI*2+(6===a?Math.PI/6:0);e.push(new r.cE(Math.sin(t)*Math.sin(i),Math.cos(t),Math.sin(t)*Math.cos(i)))}return e})().map(e=>e.clone().multiplyScalar(1.938).multiply(o)),[o]),u=(0,a.useMemo)(()=>{let e=(0,c.a)(9),t=[];for(let a=0;a<26;a++){let a=l[Math.floor(e()*l.length)],r=l[Math.floor(e()*l.length)];t.push(a.x,a.y,a.z,r.x,r.y,r.z)}let a=new r.ld;return a.setAttribute("position",new r.f5(new Float32Array(t),3)),a},[l]);(0,a.useEffect)(()=>()=>{s.dispose(),u.dispose()},[s,u]);let d=(0,a.useRef)(null),m=(0,a.useRef)([]),v=(0,a.useRef)(null),x=(0,a.useRef)(null),g=(0,a.useMemo)(()=>new r.Es("#62e3ff"),[]),M=(0,a.useMemo)(()=>new r.Es(4,4.4,4.8),[]);return(0,i.f)(t=>{let a=e.current??0,r=t.clock.elapsedTime,n=f(h(a,.35,.8));d.current&&(d.current.rotation.y=.5*Math.sin(.25*r)),x.current&&(x.current.opacity=.5*f(h(a,0,.25))),m.current.forEach((e,t)=>{if(!e)return;let i=.5+.5*Math.sin(r*(2+t%5*.7)+1.7*t),o=.5+.5*Math.sin(9*r),s=i*(1-n)+o*n;e.material.color.copy(g).multiplyScalar(.6+2.2*s).lerp(M,n*o*.5),e.scale.setScalar(f(h(a,.05,.3))*(.8+.6*s))}),v.current&&(v.current.opacity=n*(.25+.75*Math.max(0,Math.sin(9*r))*(Math.sin(23*r)>0?1:.3)))}),(0,t.jsx)("group",{position:n,children:(0,t.jsxs)("group",{ref:d,children:[(0,t.jsx)("points",{geometry:s,children:(0,t.jsx)("pointsMaterial",{ref:x,size:.035,color:"#7f9fb0",transparent:!0,opacity:0,depthWrite:!1})}),l.map((e,a)=>(0,t.jsxs)("mesh",{position:e,ref:e=>{m.current[a]=e},scale:0,children:[(0,t.jsx)("sphereGeometry",{args:[.07,12,12]}),(0,t.jsx)("meshBasicMaterial",{color:"#62e3ff",toneMapped:!1})]},a)),(0,t.jsx)("lineSegments",{geometry:u,children:(0,t.jsx)("lineBasicMaterial",{ref:v,color:[2.6,3.2,3.8],transparent:!0,opacity:0,toneMapped:!1})})]})})}function d({phase:e,position:n,lite:o}){let s=o?140:280,l=(0,a.useRef)(null),u=(0,a.useMemo)(()=>{let e=(0,c.a)(21);return Array.from({length:s},()=>({x:(e()-.5)*11,y:8*e(),z:(e()-.5)*8,v:.6+1.1*e(),spin:6*e(),rare:.03>e()}))},[s]),p=(0,a.useMemo)(()=>({o:new r.t,gold:new r.Es(2.2,1.55,.45),rare:new r.Es(5,3.6,1.2)}),[]);return(0,i.f)(t=>{let a=l.current;if(!a)return;let r=f(h(e.current??0,.02,.3)),n=t.clock.elapsedTime;u.forEach((e,t)=>{let i=4-(e.y+n*e.v)%8;p.o.position.set(e.x,i,e.z),p.o.rotation.set(n*e.spin*.6,n*e.spin,.4),p.o.scale.setScalar(r*(e.rare?1.5:1)),p.o.updateMatrix(),a.setMatrixAt(t,p.o.matrix),a.setColorAt(t,e.rare?p.rare:p.gold)}),a.instanceMatrix.needsUpdate=!0,a.instanceColor&&(a.instanceColor.needsUpdate=!0)}),(0,t.jsx)("group",{position:n,children:(0,t.jsxs)("instancedMesh",{ref:l,args:[void 0,void 0,s],frustumCulled:!1,children:[(0,t.jsx)("cylinderGeometry",{args:[.17,.17,.035,24]}),(0,t.jsx)("meshBasicMaterial",{toneMapped:!1})]})})}function m({phase:e,position:n}){let o=(0,a.useRef)(null),s=(0,a.useRef)(null),l=(0,a.useMemo)(()=>{let e=(0,c.a)(31);return Array.from({length:150},()=>({d:new r.cE(2*e()-1,2*e()-1,2*e()-1).normalize(),r:2.6+5.5*e(),w:.3+.9*e(),ph:e()*Math.PI*2,delay:e()}))},[]),u=(0,a.useMemo)(()=>{let e=new r.ld;return e.setAttribute("position",new r.f5(new Float32Array(540),3)),e},[]);(0,a.useEffect)(()=>()=>u.dispose(),[u]);let p=(0,a.useMemo)(()=>({o:new r.t,pos:l.map(()=>new r.cE),a:new r.Es(.9,3.2,1.9),b:new r.Es(1.4,2.4,3.6),c:new r.Es}),[l]);return(0,i.f)(t=>{let a=o.current;if(!a)return;let n=e.current??0,i=t.clock.elapsedTime;l.forEach((e,t)=>{let o=f(h(n,.15+.45*e.delay,.35+.45*e.delay)),s=i*e.w+e.ph,l=p.pos[t];l.copy(e.d).multiplyScalar(e.r*o).applyAxisAngle(new r.cE(0,1,0),.3*s),p.o.position.copy(l),p.o.scale.setScalar(o*(.7+.3*Math.sin(5*i+e.ph))),p.o.updateMatrix(),a.setMatrixAt(t,p.o.matrix),p.c.copy(p.a).lerp(p.b,.5+.5*Math.sin(2*i+e.ph)),a.setColorAt(t,p.c)}),a.instanceMatrix.needsUpdate=!0,a.instanceColor&&(a.instanceColor.needsUpdate=!0);let u=s.current;if(u){let e=u.geometry.getAttribute("position").array;for(let t=0;t<90;t++){let a=p.pos[7*t%150],r=p.pos[(13*t+5)%150];e.set([a.x,a.y,a.z,r.x,r.y,r.z],6*t)}u.geometry.getAttribute("position").needsUpdate=!0,u.material.opacity=.35*f(h(n,.4,.8))}}),(0,t.jsxs)("group",{position:n,children:[(0,t.jsxs)("instancedMesh",{ref:o,args:[void 0,void 0,150],frustumCulled:!1,children:[(0,t.jsx)("sphereGeometry",{args:[.09,12,12]}),(0,t.jsx)("meshBasicMaterial",{toneMapped:!1})]}),(0,t.jsx)("lineSegments",{ref:s,geometry:u,frustumCulled:!1,children:(0,t.jsx)("lineBasicMaterial",{color:"#4fe39a",transparent:!0,opacity:0,depthWrite:!1})})]})}let v=`
  uniform float uTime;
  uniform float uActivity;
  uniform float uFade;
  attribute float aSeed;
  varying float vA;
  varying vec3 vC;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;
    // the wave of firing sweeps across the brain
    float wave = smoothstep(0.55, 1.0, sin(position.x * 1.6 + position.z * 0.9 - uTime * 2.6) * 0.5 + 0.5);
    float fire = (0.25 + 0.75 * wave * uActivity) * (0.6 + 0.4 * sin(uTime * (3.0 + aSeed * 5.0) + aSeed * 40.0));
    // close to the lens a neuron is a soft out-of-focus disc; far away, a sharp point
    float near = smoothstep(2.6, 0.25, dist);
    gl_PointSize = (2.0 + aSeed * 2.5) * (1.0 + near * 14.0) * (6.0 / max(0.25, dist)) + 1.0;
    vA = mix(0.95, 0.07, near) * fire * uFade;
    vC = mix(vec3(0.55, 0.85, 1.0), vec3(1.0), wave * uActivity * 0.6);
  }
`,x=`
  varying float vA;
  varying vec3 vC;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.25, 0.5, d)) * vA;
    gl_FragColor = vec4(vC * a * 1.6, a);
    #include <colorspace_fragment>
  }
`,g=`
  uniform float uTime;
  uniform float uActivity;
  uniform float uFade;
  attribute float aT;
  attribute float aSeed;
  varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float wave = smoothstep(0.5, 1.0, sin(position.x * 1.6 + position.z * 0.9 - uTime * 2.6) * 0.5 + 0.5);
    float head = fract(uTime * (0.5 + aSeed * 0.9) + aSeed * 13.0);
    float spark = exp(-pow((aT - head) * 7.0, 2.0)) * (0.3 + 0.7 * wave * uActivity);
    vA = (0.05 + spark * 1.4) * uFade * smoothstep(0.3, 1.2, -mv.z);
  }
`,M=`
  varying float vA;
  void main() {
    gl_FragColor = vec4(vec3(0.5, 0.9, 1.0) * vA * 1.8, vA);
    #include <colorspace_fragment>
  }
`;function w({intro:e,position:n,lite:o}){let s=o?3800:8e3,l=o?1600:3600,{neurons:u,synapses:p}=(0,a.useMemo)(()=>{let e=(0,c.a)(17),t=[];for(;t.length<3*s;){let a=2.4*e()-1.2,r=2*e()-1,n=3*e()-1.5;if(.05>Math.abs(a))continue;let i=(Math.abs(a)-.55)/.62,o=i*i+(r/.85)**2+(n/1.3)**2,s=(.9*a/.9)**2+((r+.65)/.35)**2+((n+1)/.45)**2,l=.07*Math.sin(9*a)*Math.sin(8*r)*Math.sin(7*n),u=o<1+l&&o>.62+l,c=o<.62&&.18>e();(u||c||s<1&&.6>e())&&t.push(1.7*a,1.7*r,1.7*n)}let a=new Float32Array(s).map(()=>e()),n=new r.ld;n.setAttribute("position",new r.f5(new Float32Array(t),3)),n.setAttribute("aSeed",new r.f5(a,1)),n.boundingSphere=new r.L0(new r.cE,10);let i=new Float32Array(6*l),o=new Float32Array(2*l),u=new Float32Array(2*l);for(let a=0;a<l;a++){let r=Math.floor(e()*s),n=-1,l=1e9;for(let a=0;a<14;a++){let a=Math.floor(e()*s);if(a===r)continue;let i=(t[3*r]-t[3*a])**2+(t[3*r+1]-t[3*a+1])**2+(t[3*r+2]-t[3*a+2])**2;i<l&&(l=i,n=a)}i.set([t[3*r],t[3*r+1],t[3*r+2],t[3*n],t[3*n+1],t[3*n+2]],6*a),o.set([0,1],2*a);let c=e();u.set([c,c],2*a)}let f=new r.ld;return f.setAttribute("position",new r.f5(i,3)),f.setAttribute("aT",new r.f5(o,1)),f.setAttribute("aSeed",new r.f5(u,1)),f.boundingSphere=new r.L0(new r.cE,10),{neurons:n,synapses:f}},[s,l]),d=(0,a.useMemo)(()=>{let e={uTime:{value:0},uActivity:{value:.3},uFade:{value:1}},t={transparent:!0,depthWrite:!1,blending:r.tq};return{n:new r.Zg({...t,vertexShader:v,fragmentShader:x,uniforms:e}),s:new r.Zg({...t,vertexShader:g,fragmentShader:M,uniforms:e})}},[]);(0,a.useEffect)(()=>()=>{u.dispose(),p.dispose(),d.n.dispose(),d.s.dispose()},[u,p,d]);let m=(0,a.useRef)(null),y=(0,a.useRef)(null);return(0,i.f)(t=>{let a=e.current??1,r=m.current;if(!r||(r.visible=a<1,!r.visible))return;r.rotation.y=-.5+1.2*a;let n=y.current?.material;n&&(n.uniforms.uTime.value=t.clock.elapsedTime,n.uniforms.uActivity.value=.3+.7*f(h(a,.3,.55)),n.uniforms.uFade.value=1-f(h(a,.8,.98)))}),(0,t.jsx)("group",{position:n,children:(0,t.jsxs)("group",{ref:m,children:[(0,t.jsx)("lineSegments",{geometry:p,material:d.s,frustumCulled:!1}),(0,t.jsx)("points",{ref:y,geometry:u,material:d.n,frustumCulled:!1})]})})}var y=e.i(48705);let A=new r.cE(0,.4,33),b=[[20,"#05070a"],[2,"#040b18"],[-58,"#040b18"],[-70,"#11060a"],[-118,"#11060a"],[-130,"#0f0a03"],[-168,"#0f0a03"],[-180,"#02110d"],[-218,"#02110d"],[-232,"#05070a"]].map(([e,t])=>[e,new r.Es(t)]),E=["#62e3ff","#4fe39a","#ffc44f","#ff6f91"],j=[2.356,.785,3.927,5.498],S=[[.1,"l1"],[.33,"l2"],[.86,"title"]],C=["play","l1","l2","title","done"],R={start:24,end:-312,node:-60,audit:-100,stream:-158,bloch:-208,rings:-238,ringGap:7,close:-304},z=e=>[1.4*Math.sin(.031*e),.7*Math.cos(.023*e)-.1],P=(e,t,a)=>{let r=Math.min(1,Math.max(0,(a-e)/(t-e)));return r*r*(3-2*r)},I=(e,t,a)=>Math.min(1,Math.max(0,(t-e)/(t-a))),T=`
  #define PI2 6.28318530718
  uniform float uTime;
  uniform float uIntro;
  uniform float uLens;
  uniform float uAspect;
  uniform float uPulse;
  uniform float uSplit;
  uniform float uBeat;
  uniform float uBeatAmp;
  uniform float uReveal;
  uniform float uRevealFar;
  uniform vec2 uPointer;
  uniform vec3 uColors[4];
  uniform vec3 uDead;
  attribute float aU;
  attribute float aLine;
  attribute float aCh;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;

  float h1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
  float vnoise(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(h1(i), h1(i + 1.0), u) * 2.0 - 1.0;
  }
  float gauss(float x, float m, float s) { float d = (x - m) / s; return exp(-0.5 * d * d); }
  float brain(float t) {
    return 0.34 * sin(PI2 * 9.3 * t + 0.4) * (0.6 + 0.4 * sin(PI2 * 0.37 * t))
      + 0.22 * sin(PI2 * 4.1 * t + 1.9) + 0.18 * sin(PI2 * 17.7 * t + 0.2) + 0.3 * vnoise(t * 22.0 + 11.0);
  }
  float heart(float t) {
    float ph = fract(t / 0.92);
    float qrs = gauss(ph, 0.3, 0.012) - 0.18 * gauss(ph, 0.275, 0.01) - 0.2 * gauss(ph, 0.325, 0.01);
    return qrs + 0.24 * gauss(ph, 0.52, 0.045) + 0.03 * vnoise(t * 30.0 + 5.0);
  }
  float muscle(float t) {
    float env = max(0.0, vnoise(t * 1.6 + 3.0) * 1.2 - 0.25);
    return env * vnoise(t * 140.0 + 17.0) * 1.1 + 0.03 * vnoise(t * 60.0 + 2.0);
  }
  float movement(float t) {
    return 0.5 * sin(PI2 * 0.21 * t + 0.7) + 0.25 * sin(PI2 * 0.53 * t + 2.1) + 0.12 * vnoise(t * 0.8 + 9.0);
  }
  float signal(float ch, float d, float t) {
    if (ch < 0.5) return brain(d * 0.06 - t * 0.3) * 0.55;
    if (ch < 1.5) return heart(d * 0.05 - t * 0.45) * 0.8 - 0.15;
    if (ch < 2.5) return muscle(d * 0.05 - t * 0.26) * 0.6;
    return movement(d * 0.02 - t * 0.7) * 0.55;
  }
  vec2 centerAt(float z) { return vec2(sin(z * 0.031) * 1.4, cos(z * 0.023) * 0.7 - 0.1); }
  float radiusAt(float z) {
    float pinch = (1.0 - smoothstep(-60.0, -26.0, z)) * smoothstep(-78.0, -60.0, z);
    float endPinch = 1.0 - smoothstep(-306.0, -272.0, z);
    return 2.5 * (1.0 - 0.985 * pinch) * (1.0 - 0.96 * endPinch);
  }

  void main() {
    float z = mix(34.0, ${R.end.toFixed(1)}, aU);
    float ang = aCh < 0.5 ? 2.356 : (aCh < 1.5 ? 0.785 : (aCh < 2.5 ? 3.927 : 5.498));
    vec2 dir = vec2(cos(ang), sin(ang));
    vec2 perp = vec2(-dir.y, dir.x);
    float other = step(0.5, aCh);
    // approaching the model, three of the four carry nothing (fusion weight 0.000); past it, the rebuild
    float dead = other * (1.0 - smoothstep(-26.0, -18.0, z)) * smoothstep(-62.0, -59.0, z);
    float r = radiusAt(z) * uSplit;
    float open = min(1.0, radiusAt(z) / 2.5);

    float amp = (1.0 - 0.92 * dead) * uSplit * (0.3 + 0.7 * open);
    float s = signal(aCh, -z, uTime) * amp;
    float calm = mix(0.08, 1.0, uSplit);
    float spread = aLine * 0.17 * (0.25 + 0.75 * open) * (1.0 - 0.7 * dead) * calm;
    float jitter = (vnoise(z * 0.9 + aSeed * 50.0 + uTime * 0.7) * 0.09 + vnoise(z * 3.1 + aSeed * 91.0 - uTime * 1.3) * 0.035)
      * (0.35 + abs(aLine)) * (1.0 - 0.9 * dead) * calm;

    vec2 c = centerAt(z) * uSplit;
    float db = z - mix(-40.0, 2.0, uBeat);
    float beat = (gauss(db, 0.0, 0.16) * 1.5 - gauss(db, -0.32, 0.1) * 0.35 - gauss(db, 0.34, 0.1) * 0.45
      + gauss(db, 1.25, 0.42) * 0.3) * uBeatAmp;
    c.y += beat;
    vec2 clean = c + dir * r + perp * s;
    vec2 noisy = clean + perp * (spread + jitter) + dir * jitter * 0.5;

    vec4 cc = projectionMatrix * modelViewMatrix * vec4(clean, z, 1.0);
    vec2 ndc = cc.xy / max(cc.w, 0.0001);
    float lens = (1.0 - smoothstep(0.04, 0.4, length((ndc - uPointer) * vec2(uAspect, 1.0)))) * uLens * step(0.0, cc.w);
    vec2 xy = mix(noisy, clean, lens * 0.94);

    vec4 mv = modelViewMatrix * vec4(xy, z, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;

    float core = 1.0 - abs(aLine);
    float a = mix(0.06, 0.6, core * core);
    a *= smoothstep(0.5, 3.0, dist) * (1.0 - smoothstep(50.0, 110.0, dist));
    a *= mix(1.0, 0.3, dead);
    a += lens * 0.5 * core * (1.0 - dead * 0.6) * step(0.5, dist);
    a *= 1.0 + uPulse * 1.6;
    a += exp(-db * db / 0.5) * uBeatAmp * 1.4 * core;
    a *= 1.0 - smoothstep(uReveal - 1.5, uReveal, z);
    a *= smoothstep(uRevealFar - 0.5, uRevealFar + 2.0, z);

    vec3 base = uColors[int(aCh + 0.5)];
    vColor = mix(mix(base, uDead, dead), vec3(1.0), lens * 0.22 + uPulse * 0.3);
    vAlpha = a;
  }
`,F=`
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vColor * vAlpha, vAlpha);
    #include <colorspace_fragment>
  }
`;function L({camTarget:e,intro:n,introOn:s,onIntroEnd:c,onReady:f,reduced:h,lite:v,labels:x,flash:g,lensDrive:M}){let y=(0,o.f)(e=>e.gl),B=(0,a.useMemo)(()=>(function(e,t){let a=4*e*t,n=new Float32Array(a),i=new Float32Array(a),o=new Float32Array(a),s=new Float32Array(a),l=new Uint32Array(4*e*(t-1)*2),u=0,c=0;for(let a=0;a<4;a++)for(let r=0;r<e;r++){let f=1===e?0:r/(e-1)*2-1,h=(97*a+31*r)%101/101;for(let e=0;e<t;e++)n[u]=e/(t-1),i[u]=f,o[u]=a,s[u]=h,e>0&&(l[c++]=u-1,l[c++]=u),u++}let f=new r.ld;return f.setAttribute("position",new r.f5(new Float32Array(3*a),3)),f.setAttribute("aU",new r.f5(n,1)),f.setAttribute("aLine",new r.f5(i,1)),f.setAttribute("aCh",new r.f5(o,1)),f.setAttribute("aSeed",new r.f5(s,1)),f.setIndex(new r.f5(l,1)),f.boundingSphere=new r.L0(new r.cE,400),f})(v?6:10,v?1500:2600),[v]),O=(0,a.useMemo)(()=>new r.Zg({vertexShader:T,fragmentShader:F,transparent:!0,depthWrite:!1,depthTest:!1,blending:r.tq,uniforms:{uTime:{value:6},uIntro:{value:0},uLens:{value:0},uAspect:{value:1},uPulse:{value:0},uSplit:{value:1},uBeat:{value:0},uBeatAmp:{value:0},uReveal:{value:999},uRevealFar:{value:-999},uPointer:{value:new r.wq},uColors:{value:E.map(e=>new r.Es(e))},uDead:{value:new r.Es("#3b454e")}}}),[]);(0,a.useEffect)(()=>()=>B.dispose(),[B]),(0,a.useEffect)(()=>()=>O.dispose(),[O]);let N=(0,a.useRef)(null),D=(0,a.useRef)(null),{introPath:k,introLooks:U}=(0,a.useMemo)(()=>{let[e,t]=z(R.start),[a,n]=z(R.start-10);return{introPath:new r.$7([new r.cE(A.x+.35,A.y+.15,A.z+.7),new r.cE(A.x+.6,A.y+.3,A.z+2),new r.cE(A.x+3.2,A.y+1.2,A.z+8.5),new r.cE(A.x+.8,A.y+.4,A.z+3.4),new r.cE(.85*e,t+.25,R.start)]),introLooks:[new r.cE(A.x-.6,A.y-.1,A.z-.4),A.clone(),new r.cE(A.x,A.y,A.z-4),new r.cE(a,n-.05,R.start-10)]}},[]),q=(0,a.useRef)(0),_=(0,a.useRef)(0),G=(0,a.useRef)(0),$=(0,a.useRef)(0),H=(0,a.useRef)({z:R.start,v:new r.cE,look:new r.cE,lens:{x:0,y:.2},rig:new r.zm,frames:0,lastIo:0,lastDn:1,dive:-1e9,qa:new r.as,qb:new r.as,side:new r.cE(-13,.4,-19),sideLook:new r.cE(0,0,-19)}),V=(0,a.useRef)({x:0,y:0,last:-1e9,inside:!1});(0,a.useEffect)(()=>{let e=y.domElement;function t(t){let a=e.getBoundingClientRect();V.current.inside=t.clientY>=a.top&&t.clientY<=a.bottom,V.current.x=(t.clientX-a.left)/a.width*2-1,V.current.y=-((t.clientY-a.top)/a.height*2-1),V.current.last=performance.now()}window.addEventListener("pointermove",t,{passive:!0});let a=()=>H.current.dive=performance.now();return window.addEventListener("site:dive",a),()=>{window.removeEventListener("pointermove",t),window.removeEventListener("site:dive",a)}},[y]),(0,i.f)((t,a)=>{let i=N.current?.material;if(!i)return;let o=i.uniforms,l=H.current,u=t.camera,p=Math.min(a,.05),d=t.clock.elapsedTime;if(l.frames<3&&2==++l.frames&&f?.(),s.current&&l.frames>=2){let e=Math.min(1,(n.current??0)+Math.min(a,.1)/7.6);n.current=e;let t=document.documentElement;for(let[a,r]of S)e>=a&&C.indexOf(t.getAttribute("data-intro")??"")<C.indexOf(r)&&t.setAttribute("data-intro",r);e>=1&&c?.()}let m=n.current??1,v=t.size.width/t.size.height;o.uAspect.value=v;let w=v<.8?72:50;u.fov!==w&&(u.fov=w,u.updateProjectionMatrix()),h||(o.uTime.value=(o.uTime.value+p)%600),o.uIntro.value=m;let y=e=>e*e*(3-2*e),A=(e,t)=>Math.min(1,Math.max(0,(m-e)/(t-e))),E=h||m>=1;o.uReveal.value=999,o.uRevealFar.value=E?-999:m<.62?999:34-364*y(A(.62,.92)),o.uBeat.value=0,o.uBeatAmp.value=0,o.uSplit.value=1,o.uPulse.value=E?0:.6*Math.exp(-(((m-.64)/.03)**2)),M&&(M.current=E?0:.55*Math.sin(Math.PI*A(.6,.86)));let T=e.current??R.start;l.z+=(T-l.z)*(h?1:1-Math.exp(-(4*p)));let F=l.z,[L,B]=z(F),O=V.current.inside&&performance.now()-V.current.last<2600&&!h,W=O?V.current.x:0,Q=O?V.current.y:0,K=2.2*Math.sin(Math.PI*I(F,6,-34)),Y=I(F,-124,-146)*(1-I(F,-164,-174))*1.8,Z=.32*Math.sin(Math.PI*I(F,-176,-222));l.v.set(.85*L+.35*W+K,B+.25+.2*Q+Y,F);let[X,J]=z(F-10);l.look.set(X,J-.05-.7*Y,F-10);let ee=t.scene.background instanceof r.Es?t.scene.background:t.scene.background=new r.Es;if(!function(e,t){if(e>=b[0][0])return t.copy(b[0][1]);for(let a=1;a<b.length;a++){let[r,n]=b[a],[i,o]=b[a-1];if(e>=r)return t.copy(o).lerp(n,(i-e)/(i-r))}t.copy(b[b.length-1][1])}(u.position.z,ee),t.scene.fog?.color.copy(ee),E){let e=Math.min(1,Math.max(0,(performance.now()-l.dive)/900));e>0&&e<1&&(l.v.z-=e*e*34,l.look.z-=e*e*34),u.position.lerp(l.v,h||e>0&&e<1?1:1-Math.exp(-(6*p))),u.lookAt(l.look),u.rotateZ(h?0:Z);let t=(v<.8?72:50)+(e>0&&e<1?e*e*38:0);Math.abs(u.fov-t)>.01&&(u.fov=t,u.updateProjectionMatrix())}else{let e=.25*y(A(0,.22))+.25*y(A(.22,.5))+.25*y(A(.5,.66))+.25*y(A(.66,.88));k.getPointAt(Math.min(1,e),u.position);let t=Math.min(3,Math.floor(4*e));l.look.copy(U[t]).lerp(t<3?U[t+1]:U[3],4*e-t),u.lookAt(l.look)}let et=0;O?(l.lens.x=V.current.x,l.lens.y=V.current.y,et=1):h||(l.lens.x=.6*Math.sin(.23*d),l.lens.y=.35*Math.sin(.37*d+1.2),et=.8*m);let ea=o.uPointer.value,er=O?1-Math.exp(-(14*p)):1-Math.exp(-(2*p));ea.x+=(l.lens.x-ea.x)*er,ea.y+=(l.lens.y-ea.y)*er,o.uLens.value+=(et-o.uLens.value)*(1-Math.exp(-(3*p))),_.current=I(u.position.z,10,-18),q.current=I(u.position.z,-64,-94),G.current=I(u.position.z,-128,-168),$.current=I(u.position.z,-176,-222);let en=u.position.z-R.node;l.lastIo<.56&&m>=.56&&m<1&&window.dispatchEvent(new Event("site:beat")),l.lastDn>0&&en<=0&&window.dispatchEvent(new Event("site:pass")),l.lastIo=m,l.lastDn=en,D.current&&(D.current.material.opacity=Math.min(1,Math.max(0,1-Math.abs(en)/40))*m,D.current.scale.setScalar(1+(h?0:.08*Math.sin(2.4*d)))),g.current?.style.setProperty("opacity",String(h?0:.85*Math.exp(-((en/1.8)**2))));let ei=E?I(u.position.z,-20,-28)*(1-I(u.position.z,-48,-56)):0,eo=2.5*(1-.985*((1-P(-60,-26,-42))*P(-78,-60,-42)))*(1-.96*(1-P(-306,-272,-42))),[es,el]=z(-42);x.current?.forEach((e,a)=>{if(!e)return;let r=j[a];l.v.set(es+Math.cos(r)*(eo+.55),el+Math.sin(r)*(eo+.55),-42).project(u);let n=(.5*l.v.x+.5)*t.size.width,i=(-(.5*l.v.y)+.5)*t.size.height;e.style.transform=`translate3d(${n.toFixed(1)}px, ${i.toFixed(1)}px, 0)`,e.style.opacity=String(l.v.z<1?ei:0),e.dataset.dead=a>0?"true":"false"})});let W=z(R.node),Q=e=>{let[t,a]=z(e);return[t,a,e]};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("fog",{attach:"fog",args:["#05070a",14,62]}),(0,t.jsx)("lineSegments",{ref:N,geometry:B,material:O,frustumCulled:!1}),(0,t.jsxs)("mesh",{ref:D,position:[W[0],W[1],R.node],children:[(0,t.jsx)("sphereGeometry",{args:[.22,32,32]}),(0,t.jsx)("meshBasicMaterial",{color:[3.4,3.8,4],transparent:!0,opacity:0,toneMapped:!1,fog:!1})]}),(0,t.jsx)(w,{intro:n,position:[A.x,A.y,A.z],lite:v}),(0,t.jsx)(p,{phase:_,position:Q(-22)}),(0,t.jsx)(u.T,{phase:q,position:Q(R.audit)}),(0,t.jsx)(d,{phase:G,position:Q(R.stream),lite:v}),(0,t.jsx)(u.W,{phase:$,position:Q(R.bloch)}),(0,t.jsx)(m,{phase:$,position:Q(R.bloch)}),(0,t.jsx)(u.t,{names:l.M,at:e=>Q(R.rings-e*R.ringGap)}),(0,t.jsx)(u._,{position:Q(R.close)})]})}e.s(["INTRO_S",0,7.6,"Z",0,R,"default",0,function(e){let{lite:r,active:i}=e,o=(0,a.useRef)(0);return(0,t.jsxs)(n.f,{className:"world-canvas",frameloop:i?"always":"never",dpr:r?[1,1.5]:[1,1.75],gl:{antialias:!r,alpha:!1,powerPreference:"high-performance"},camera:{fov:50,near:.1,far:140,position:[-13,.4,-19]},onCreated:({gl:e})=>e.setClearColor("#05070a",1),"aria-hidden":"true",children:[(0,t.jsx)(L,{...e,lensDrive:o}),(0,t.jsxs)(s.g,{multisampling:4*!r,children:[(0,t.jsx)(s.w,{mipmapBlur:!0,intensity:r?.8:1.05,luminanceThreshold:.08,luminanceSmoothing:.3,radius:.72}),(0,t.jsx)(y.f,{drive:o,reduced:e.reduced})]})]})}],2966)},91883,e=>{var t=e.i(43476),a=e.i(71645),r=e.i(90072),n=e.i(95393),i=e.i(876),o=e.i(34510);let s=(e,t,a)=>Math.min(1,Math.max(0,(e-t)/(a-t))),l=e=>e*e*(3-2*e);function u({text:e,height:n,position:i,opts:o,matRef:s,anchor:l="center"}){let c=function(e,{px:t=160,weight:n=800,color:i="#e7edf0",stretch:o="expanded"}={}){let[s,l]=(0,a.useState)(null);return(0,a.useEffect)(()=>{let a=!0,s=null;return(async()=>{try{await document.fonts.load(`${n} ${t}px "Mona Sans"`)}catch{}if(!a)return;let u=document.createElement("canvas"),c=u.getContext("2d"),f=`${n} ${t}px "Mona Sans", Arial, sans-serif`;c.font=f,c.fontStretch=o;let h=Math.ceil(c.measureText(e).width+.3*t),p=Math.ceil(1.3*t);u.width=h,u.height=p,c.font=f,c.fontStretch=o,c.fillStyle=i,c.textBaseline="middle",c.fillText(e,.15*t,p/2),(s=new r.Nk(u)).colorSpace=r.nj,s.anisotropy=4,l({map:s,aspect:h/p})})(),()=>{a=!1,s?.dispose()}},[e,t,n,i,o]),s}(e,o);if(!c)return null;let f=n*c.aspect;return(0,t.jsxs)("mesh",{position:[i[0]+("left"===l?f/2:0),i[1],i[2]],children:[(0,t.jsx)("planeGeometry",{args:[f,n]}),(0,t.jsx)("meshBasicMaterial",{ref:s,map:c.map,transparent:!0,depthWrite:!1,toneMapped:!1})]})}let c=`
  uniform float uTime;
  uniform float uPhase;
  uniform float uFlood;
  attribute float aSeed;
  attribute float aRare;
  varying float vRare;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.x = mod(p.x + uTime * (0.9 + aSeed * 0.8), 18.0) - 9.0;
    p.y += sin(uTime * 0.6 + aSeed * 30.0) * 0.08;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float pulse = 0.6 + 0.4 * sin(uTime * 3.0 + aSeed * 20.0);
    float lit = max(aRare, uFlood);
    gl_PointSize = mix(5.0, 22.0 * pulse, aRare) * (1.0 + uFlood * 0.6) * (10.0 / max(1.0, -mv.z));
    vRare = lit;
    vAlpha = (1.0 - smoothstep(7.0, 9.0, abs(p.x))) * uPhase;
  }
`,f=`
  varying float vRare;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disc = 1.0 - smoothstep(0.32, 0.5, d);
    vec3 c = mix(vec3(0.55, 0.62, 0.68), vec3(1.6, 1.05, 0.25), vRare);
    gl_FragColor = vec4(c * disc * vAlpha, disc * vAlpha);
    #include <colorspace_fragment>
  }
`;e.s(["T",0,function({phase:e,position:o=[0,0,0]}){let c=(0,i.f)("A4"),f=(0,i.f)("A7"),h=(0,i.f)("A10"),p=(0,a.useRef)(null),d=(0,a.useRef)(null),m=(0,a.useRef)(null),v=(0,a.useRef)(null),x=(0,a.useRef)(null),g=(0,a.useRef)(null),M=(0,a.useRef)(null),w=(0,a.useMemo)(()=>new r.Es("#7f8c95"),[]),y=(0,a.useMemo)(()=>new r.Es("#e7edf0"),[]);return(0,n.f)(()=>{let t=e.current??0,a=l(s(t,.22,.4)),r=l(s(t,.42,.62)),n=l(s(t,.62,.82));g.current&&(g.current.scale.x=Math.max(1e-4,a),g.current.visible=n<.98),p.current&&(p.current.color.copy(y).lerp(w,a),p.current.opacity=1-.8*n),M.current&&(M.current.position.y=-3.6+2.2*r),d.current&&(d.current.opacity=.06*r),m.current&&(m.current.opacity=r),v.current&&(v.current.opacity=n),x.current&&(x.current.opacity=.9*n)}),(0,t.jsxs)("group",{position:o,children:[(0,t.jsx)(u,{text:c.display,height:2.1,position:[0,.9,0],matRef:p}),(0,t.jsx)("group",{ref:g,position:[-4.4,.85,.02],scale:[1e-4,1,1],children:(0,t.jsxs)("mesh",{position:[4.4,0,0],children:[(0,t.jsx)("planeGeometry",{args:[8.8,.17]}),(0,t.jsx)("meshBasicMaterial",{color:[2.4,.5,.42],toneMapped:!1})]})}),(0,t.jsxs)("group",{ref:M,position:[0,-3.6,0],children:[(0,t.jsxs)("mesh",{rotation:[-Math.PI/2,0,0],children:[(0,t.jsx)("planeGeometry",{args:[16,10]}),(0,t.jsx)("meshBasicMaterial",{ref:d,color:"#ffc44f",transparent:!0,opacity:0,depthWrite:!1,side:r.Vs})]}),(0,t.jsx)(u,{text:`Recording length alone: AUC ${f.display}`,height:.42,position:[0,.32,1.5],opts:{px:96,weight:650,color:"#ffc44f",stretch:"normal"},matRef:m})]}),(0,t.jsx)(u,{text:h.display,height:1.5,position:[.4,2.9,-7],opts:{color:"#62e3ff"},matRef:v}),(0,t.jsx)(u,{text:`AUC ${h.interval?.text??""}, subject-independent`,height:.34,position:[.4,1.85,-7],opts:{px:96,weight:600,color:"#e7edf0",stretch:"normal"},matRef:x})]})},"W",0,function({phase:e,position:i=[0,0,0]}){let o=(0,a.useRef)(null),c=(0,a.useRef)(null),f=(0,a.useRef)(null),h=(0,a.useMemo)(()=>{let e=[];for(let t=0;t<6;t++){let a=t/6*Math.PI;for(let t=0;t<96;t++){let n=t/96*Math.PI*2,i=(t+1)/96*Math.PI*2;e.push(new r.cE(Math.cos(a)*Math.sin(n)*2.3,2.3*Math.cos(n),Math.sin(a)*Math.sin(n)*2.3),new r.cE(Math.cos(a)*Math.sin(i)*2.3,2.3*Math.cos(i),Math.sin(a)*Math.sin(i)*2.3))}}for(let t of[-.6,-.3,0,.3,.6]){let a=2.3*Math.sin(t*Math.PI*.5),n=2.3*Math.cos(t*Math.PI*.5);for(let t=0;t<96;t++){let i=t/96*Math.PI*2,o=(t+1)/96*Math.PI*2;e.push(new r.cE(Math.cos(i)*n,a,Math.sin(i)*n),new r.cE(Math.cos(o)*n,a,Math.sin(o)*n))}}return new r.ld().setFromPoints(e)},[]),p=(0,a.useRef)(null);return(0,a.useEffect)(()=>()=>h.dispose(),[h]),(0,n.f)(t=>{let a=l(s(e.current??0,.05,.4)),r=t.clock.elapsedTime;o.current&&(o.current.rotation.y=.12*r),c.current&&(c.current.rotation.set(0,.9*r,.6+.35*Math.sin(.5*r)),c.current.scale.setScalar(Math.max(.001,a))),p.current&&(p.current.opacity=.35*a),f.current&&(f.current.opacity=a)}),(0,t.jsxs)("group",{position:i,children:[(0,t.jsxs)("group",{ref:o,children:[(0,t.jsx)("lineSegments",{geometry:h,children:(0,t.jsx)("lineBasicMaterial",{ref:p,color:"#4fe39a",transparent:!0,opacity:0})}),(0,t.jsxs)("group",{ref:c,children:[(0,t.jsxs)("mesh",{position:[0,1.15,0],children:[(0,t.jsx)("cylinderGeometry",{args:[.03,.03,2.3,8]}),(0,t.jsx)("meshBasicMaterial",{color:[.9,3.2,1.8],toneMapped:!1})]}),(0,t.jsxs)("mesh",{position:[0,2.3,0],children:[(0,t.jsx)("sphereGeometry",{args:[.12,16,16]}),(0,t.jsx)("meshBasicMaterial",{color:[1.2,3.6,2.2],toneMapped:!1})]})]})]}),(0,t.jsx)(u,{text:"Exploratory. No quantum advantage claimed.",height:.36,position:[0,-3,0],opts:{px:96,weight:600,color:"#4fe39a",stretch:"normal"},matRef:f})]})},"_",0,function({position:e}){return(0,t.jsx)("group",{position:e,children:["#62e3ff","#4fe39a","#ffc44f","#ff6f91"].map((e,a)=>(0,t.jsxs)("mesh",{rotation:[0,0,a*Math.PI/2],children:[(0,t.jsx)("torusGeometry",{args:[1.6,.07,12,64,Math.PI/2-.06]}),(0,t.jsx)("meshBasicMaterial",{color:new r.Es(e).multiplyScalar(1.6),toneMapped:!1})]},e))})},"Q",0,u,"t",0,function({names:e,at:a}){return(0,t.jsx)("group",{children:e.map((e,r)=>(0,t.jsxs)("group",{position:a(r),children:[(0,t.jsxs)("mesh",{children:[(0,t.jsx)("torusGeometry",{args:[3.4,.022,8,160]}),(0,t.jsx)("meshBasicMaterial",{color:[.38,1.2,1.45],toneMapped:!1,transparent:!0,opacity:.75})]}),(0,t.jsx)(u,{text:`${r+1}  ${e.charAt(0)+e.slice(1).toLowerCase()}`,height:.42,position:[0,3.9,0],opts:{px:96,weight:700,color:"#e7edf0",stretch:"semi-expanded"}})]},e))})},"e",0,function({phase:e,flood:i,position:h=[0,0,0],lite:p=!1}){let d=(0,a.useRef)(null),m=(0,a.useRef)(null),v=(0,a.useRef)(null),x=(0,a.useMemo)(()=>{let e=p?900:2200,t=new Float32Array(3*e),a=new Float32Array(e),n=new Float32Array(e),i=(0,o.a)(7);for(let r=0;r<e;r++){let e=Math.floor(9*i());t[3*r]=18*i()-9,t[3*r+1]=(e-4)*.34+(i()-.5)*.12,t[3*r+2]=(i()-.5)*2.4,a[r]=i(),n[r]=+(.008>i())}let s=new r.ld;return s.setAttribute("position",new r.f5(t,3)),s.setAttribute("aSeed",new r.f5(a,1)),s.setAttribute("aRare",new r.f5(n,1)),s.boundingSphere=new r.L0(new r.cE,20),s},[p]),g=(0,a.useMemo)(()=>new r.Zg({vertexShader:c,fragmentShader:f,transparent:!0,depthWrite:!1,blending:r.tq,uniforms:{uTime:{value:0},uPhase:{value:0},uFlood:{value:0}}}),[]),M=(0,a.useMemo)(()=>new r.ld().setFromPoints([new r.cE(-9.2,-1.8,0),new r.cE(9.2,-1.8,0),new r.cE(9.2,1.8,0),new r.cE(-9.2,1.8,0),new r.cE(-9.2,-1.8,0)]),[]),w=(0,a.useMemo)(()=>new r.DL(M,new r.rd({color:"#ffc44f",dashSize:.3,gapSize:.22,transparent:!0})),[M]);return(0,a.useEffect)(()=>(w.computeLineDistances(),m.current=w.material,()=>{x.dispose(),g.dispose(),M.dispose(),w.material.dispose()}),[x,g,M,w]),(0,n.f)(t=>{let a=l(s(e.current??0,.05,.35)),r=d.current?.material;r&&(r.uniforms.uTime.value=t.clock.elapsedTime,r.uniforms.uPhase.value=a,r.uniforms.uFlood.value=i?.current??0),m.current&&(m.current.opacity=.8*a),v.current&&(v.current.opacity=a)}),(0,t.jsxs)("group",{position:h,children:[(0,t.jsx)("points",{ref:d,geometry:x,material:g,frustumCulled:!1}),(0,t.jsx)("primitive",{object:w}),(0,t.jsx)(u,{text:"Synthetic data",height:.4,position:[-9.2,2.25,0],anchor:"left",opts:{px:96,weight:700,color:"#ffc44f",stretch:"normal"},matRef:v})]})}])},25564,e=>{e.s(["M",0,["QUESTION","BASELINE","CONTROL","ABLATION","CONFOUND CHECK","VALIDATION","REPORT"],"g",0,[{case:"01 Seizure",caseHref:"/cases/seizure-detection",cells:{QUESTION:{text:"Do the extra signals help?",href:"/cases/seizure-detection#question"},BASELINE:{text:"Baselines released with the dataset.",href:"/cases/seizure-detection#result"},ABLATION:{text:"A stage-by-stage ladder. Two failures kept.",href:"/cases/seizure-detection#change"},"CONFOUND CHECK":{text:"Window coverage. Inert fusion.",href:"/cases/seizure-detection#investigation"},VALIDATION:{text:"Patient-independent split, with an interval.",href:"/cases/seizure-detection#result"},REPORT:{text:"Alarm rate printed beside sensitivity.",href:"/cases/seizure-detection#meaning"}}},{case:"02 ADHD",caseHref:"/cases/adhd-eeg",cells:{QUESTION:{text:"Is the accuracy trustworthy?",href:"/cases/adhd-eeg#question"},BASELINE:{text:"Majority class. Recording length alone.",href:"/cases/adhd-eeg#investigation"},CONTROL:{text:"A shuffled control and a fixed bar for every idea.",href:"/cases/adhd-eeg#investigation"},ABLATION:{text:"Dozens of additions rejected.",href:"/cases/adhd-eeg#investigation"},"CONFOUND CHECK":{text:"50 Hz line. Recording length. Exclusion bias.",href:"/cases/adhd-eeg#investigation"},VALIDATION:{text:"Subject-independent, 5 folds, 10 seeds.",href:"/cases/adhd-eeg#result"},REPORT:{text:"Earlier headline set aside, with the gap.",href:"/cases/adhd-eeg#failure"}}},{case:"03 Finance",caseHref:"/cases/synthetic-finance",cells:{QUESTION:{text:"Is the signal real or a shortcut?",href:"/cases/synthetic-finance#question"},BASELINE:{text:"An always-positive floor.",href:"/cases/synthetic-finance#problem"},CONTROL:{text:"A permutation control and an adversarial harness.",href:"/cases/synthetic-finance#investigation"},ABLATION:{text:"Four method families behind one API.",href:"/cases/synthetic-finance#investigation"},"CONFOUND CHECK":{text:"A single-feature ceiling.",href:"/cases/synthetic-finance#investigation"},VALIDATION:{text:"Split by user, not by row.",href:"/cases/synthetic-finance#result"},REPORT:{text:"Labelled synthetic wherever it appears.",href:"/cases/synthetic-finance#result"}}},{case:"04 QHH",caseHref:"/cases/qhh",cells:{QUESTION:{text:"Can phase survive the circuit?",href:"/cases/qhh#question"},VALIDATION:{text:"Subject-wise on a public dataset.",href:"/cases/qhh#investigation"},REPORT:{text:"Labelled exploratory. Nothing claimed.",href:"/cases/qhh#result"}}}]])},34510,e=>{function t(e){let t=0x85ebca6b^Math.imul(0|e,0x9e3779b1);return t=Math.imul((t=Math.imul(t^t>>>15,0x2c1b3c6d))^t>>>12,0x297a2d39),((t^=t>>>15)>>>0)%1e5/1e5}function a(e,a){let r=Math.floor(e),n=e-r,i=2*t(31*r+a)-1;return i+(2*t((r+1)*31+a)-1-i)*(n*n*(3-2*n))}function r(e,t,a){let r=(e-t)/a;return Math.exp(-.5*r*r)}let n={brain:function(e){return .34*Math.sin(2*Math.PI*9.3*e+.4)*(.6+.4*Math.sin(2*Math.PI*.37*e))+.22*Math.sin(2*Math.PI*4.1*e+1.9)+.18*Math.sin(2*Math.PI*17.7*e+.2)+.3*a(22*e,11)},heart:function(e){let t=(e%.92+.92)%.92/.92;return r(t,.3,.012)-.18*r(t,.275,.01)-.2*r(t,.325,.01)+.24*r(t,.52,.045)+.03*a(30*e,5)},muscle:function(e){return Math.max(0,1.2*a(1.6*e,3)-.25)*a(140*e,17)*1.1+.03*a(60*e,2)},move:function(e){return .5*Math.sin(2*Math.PI*.21*e+.7)+.25*Math.sin(2*Math.PI*.53*e+2.1)+.2*a(2.2*e,9)}};e.s(["H",0,[{key:"brain",label:"BRAIN",sub:"EEG"},{key:"heart",label:"HEART",sub:"ECG"},{key:"muscle",label:"MUSCLE",sub:"EMG"},{key:"move",label:"MOVEMENT",sub:"ACC"}],"a",0,function(e){let t=e>>>0;return()=>{let e=t=t+0x6d2b79f5>>>0;return e=Math.imul(e^e>>>15,1|e),(((e^=e+Math.imul(e^e>>>7,61|e))^e>>>14)>>>0)/0x100000000}},"e",0,function(e){return Math.sqrt(-2*Math.log(Math.max(e(),1e-9)))*Math.cos(2*Math.PI*e())},"P",0,function(e,t,a,r,i,o=360){let s=n[e],l="";for(let e=0;e<=o;e++){let n=e/o*r,u=i/2-s(t+e/o*a)*(.42*i);l+=`${0===e?"M":"L"}${n.toFixed(1)} ${u.toFixed(1)}`}return l}])},90874,e=>{var t=e.i(61949);e.s(["f",()=>t.D])}],43785,function(e){e.n(e.i(2966))}]);