(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,[2966,e=>{var t=e.i(43476),a=e.i(71645),r=e.i(90072),n=e.i(75056),s=e.i(95393),i=e.i(90874),o=e.i(79877),l=e.i(25564),u=e.i(91883),c=e.i(34510);let f=e=>{let t=Math.min(1,Math.max(0,e));return t*t*(3-2*t)},h=(e,t,a)=>Math.min(1,Math.max(0,(e-t)/(a-t))),p=`
  uniform float uBurst;
  uniform float uForm;
  uniform float uWarp;
  uniform float uTime;
  uniform float uSweep;
  attribute vec3 aStart;
  attribute vec3 aTarget;
  attribute float aSeed;
  varying float vA;
  varying vec3 vC;
  void main() {
    float r = length(aStart.xy);
    float ang = uTime * (1.1 / (0.35 + r * 0.6)) + aSeed * 0.3;
    vec2 sw = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * aStart.xy;
    vec3 chaos = vec3(sw, aStart.z * (0.4 + 0.6 * sin(uTime * 0.8 + aSeed * 12.0)));
    vec3 p = mix(vec3(0.0), chaos, uBurst);
    float f = smoothstep(0.0, 1.0, clamp(uForm * 1.5 - aSeed * 0.5, 0.0, 1.0));
    vec3 hold = aTarget + vec3(sin(uTime * 1.7 + aSeed * 40.0), cos(uTime * 1.3 + aSeed * 31.0), 0.0) * 0.01;
    p = mix(p, hold, f);
    p.z += uWarp * (1.0 + aSeed * 28.0);
    p.xy *= 1.0 + uWarp * aSeed * 1.8;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float sweep = exp(-pow((p.x - uSweep) * 1.4, 2.0)) * f;
    gl_PointSize = (1.1 + aSeed * 2.1) * (1.0 + sweep * 1.8) * (15.0 / max(0.4, -mv.z));
    vA = (0.45 + 0.55 * aSeed) * (1.0 - uWarp) * step(0.0005, uBurst);
    vC = mix(vec3(0.82, 0.9, 1.0), vec3(0.38, 0.88, 1.0), step(0.86, aSeed)) * (1.0 + sweep * 3.0);
  }
`,d=`
  varying float vA;
  varying vec3 vC;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.2, 0.5, d)) * vA;
    gl_FragColor = vec4(vC * a, a);
    #include <colorspace_fragment>
  }
`;function m({intro:e,position:n,lite:i}){let o=i?7e3:16e3,l=(0,a.useRef)(null),u=(0,a.useRef)(null),x=(0,a.useRef)(null),v=(0,a.useMemo)(()=>{let e=(0,c.a)(11),t=new Float32Array(3*o),a=new Float32Array(o);for(let r=0;r<o;r++){let n=7*Math.pow(e(),.6),s=Math.floor(3*e())*(2*Math.PI/3)+.55*n+(e()-.5)*.9;t[3*r]=Math.cos(s)*n,t[3*r+1]=Math.sin(s)*n*.62,t[3*r+2]=(e()-.5)*2.4,a[r]=e()}let n=new r.ld;return n.setAttribute("position",new r.f5(new Float32Array(3*o),3)),n.setAttribute("aStart",new r.f5(t,3)),n.setAttribute("aTarget",new r.f5(new Float32Array(t),3)),n.setAttribute("aSeed",new r.f5(a,1)),n.boundingSphere=new r.L0(new r.cE,60),n},[o]),g=(0,a.useMemo)(()=>new r.Zg({vertexShader:p,fragmentShader:d,transparent:!0,depthWrite:!1,blending:r.tq,uniforms:{uBurst:{value:0},uForm:{value:0},uWarp:{value:0},uTime:{value:0},uSweep:{value:-8}}}),[]);return(0,a.useEffect)(()=>()=>v.dispose(),[v]),(0,a.useEffect)(()=>()=>g.dispose(),[g]),(0,a.useEffect)(()=>{let e=!0;return(async()=>{try{await document.fonts.load('500 200px "Bodoni Moda"')}catch{}if(!e)return;let t=document.createElement("canvas");t.width=1600,t.height=520;let a=t.getContext("2d");a.fillStyle="#fff",a.textAlign="center",a.textBaseline="middle",a.font='500 205px "Bodoni Moda", Didot, Georgia, serif',a.fillText("THEJESHWAAR",800,.29*520),a.fillText("SATHISHKUMAR",800,384.8);let r=a.getImageData(0,0,1600,520).data,n=[];for(let e=0;e<520;e+=2)for(let t=0;t<1600;t+=2)r[(1600*e+t)*4+3]>128&&n.push(t,e);if(!n.length)return;let s=(0,c.a)(5),i=new Float32Array(3*o);for(let e=0;e<i.length/3;e++){let t=2*Math.floor(s()*(n.length/2));i[3*e]=(n[t]/1600-.5)*11,i[3*e+1]=(.5-n[t+1]/520)*3.575,i[3*e+2]=(s()-.5)*.18}x.current=i})(),()=>{e=!1}},[o]),(0,s.f)(t=>{let a=e.current??1;if(x.current&&l.current){let e=l.current.geometry.getAttribute("aTarget");e.array.set(x.current),e.needsUpdate=!0,x.current=null}let r=l.current?.material;if(r&&(r.uniforms.uTime.value=t.clock.elapsedTime,r.uniforms.uBurst.value=f(h(a,.06,.3)),r.uniforms.uForm.value=f(h(a,.38,.7)),r.uniforms.uSweep.value=-7+14*h(a,.6,.84),r.uniforms.uWarp.value=f(h(a,.82,1))),l.current&&(l.current.visible=a<1),u.current){let e=Math.exp(-(((a-.08)/.07)**2));u.current.visible=e>.01,u.current.scale.setScalar(.2+.6*e),u.current.material.opacity=e}}),(0,t.jsxs)("group",{position:n,children:[(0,t.jsx)("points",{ref:l,geometry:v,material:g,frustumCulled:!1}),(0,t.jsxs)("mesh",{ref:u,children:[(0,t.jsx)("sphereGeometry",{args:[.18,24,24]}),(0,t.jsx)("meshBasicMaterial",{color:[6,6.5,7],transparent:!0,opacity:0,toneMapped:!1,fog:!1})]})]})}function x({phase:e,position:n}){let i=(0,a.useMemo)(()=>new r.cE(1,1.12,1.18),[]),o=(0,a.useMemo)(()=>{let e=(0,c.a)(3),t=[];for(;t.length<8400;){let a=new r.cE(2*e()-1,2*e()-1,2*e()-1);if(!(a.lengthSq()>1||.01>a.lengthSq()))a.normalize(),a.y<-.55||(a.multiplyScalar(1.9).multiply(i),t.push(a.x,a.y,a.z))}let a=new r.ld;return a.setAttribute("position",new r.f5(new Float32Array(t),3)),a},[i]),l=(0,a.useMemo)(()=>(function(){let e=[new r.cE(0,1,0)];for(let[t,a]of[[.62,6],[1.1,12]])for(let n=0;n<a;n++){let s=n/a*Math.PI*2+(6===a?Math.PI/6:0);e.push(new r.cE(Math.sin(t)*Math.sin(s),Math.cos(t),Math.sin(t)*Math.cos(s)))}return e})().map(e=>e.clone().multiplyScalar(1.938).multiply(i)),[i]),u=(0,a.useMemo)(()=>{let e=(0,c.a)(9),t=[];for(let a=0;a<26;a++){let a=l[Math.floor(e()*l.length)],r=l[Math.floor(e()*l.length)];t.push(a.x,a.y,a.z,r.x,r.y,r.z)}let a=new r.ld;return a.setAttribute("position",new r.f5(new Float32Array(t),3)),a},[l]);(0,a.useEffect)(()=>()=>{o.dispose(),u.dispose()},[o,u]);let p=(0,a.useRef)(null),d=(0,a.useRef)([]),m=(0,a.useRef)(null),v=(0,a.useRef)(null),g=(0,a.useMemo)(()=>new r.Es("#62e3ff"),[]),M=(0,a.useMemo)(()=>new r.Es(4,4.4,4.8),[]);return(0,s.f)(t=>{let a=e.current??0,r=t.clock.elapsedTime,n=f(h(a,.35,.8));p.current&&(p.current.rotation.y=.5*Math.sin(.25*r)),v.current&&(v.current.opacity=.5*f(h(a,0,.25))),d.current.forEach((e,t)=>{if(!e)return;let s=.5+.5*Math.sin(r*(2+t%5*.7)+1.7*t),i=.5+.5*Math.sin(9*r),o=s*(1-n)+i*n;e.material.color.copy(g).multiplyScalar(.6+2.2*o).lerp(M,n*i*.5),e.scale.setScalar(f(h(a,.05,.3))*(.8+.6*o))}),m.current&&(m.current.opacity=n*(.25+.75*Math.max(0,Math.sin(9*r))*(Math.sin(23*r)>0?1:.3)))}),(0,t.jsx)("group",{position:n,children:(0,t.jsxs)("group",{ref:p,children:[(0,t.jsx)("points",{geometry:o,children:(0,t.jsx)("pointsMaterial",{ref:v,size:.035,color:"#7f9fb0",transparent:!0,opacity:0,depthWrite:!1})}),l.map((e,a)=>(0,t.jsxs)("mesh",{position:e,ref:e=>{d.current[a]=e},scale:0,children:[(0,t.jsx)("sphereGeometry",{args:[.07,12,12]}),(0,t.jsx)("meshBasicMaterial",{color:"#62e3ff",toneMapped:!1})]},a)),(0,t.jsx)("lineSegments",{geometry:u,children:(0,t.jsx)("lineBasicMaterial",{ref:m,color:[2.6,3.2,3.8],transparent:!0,opacity:0,toneMapped:!1})})]})})}function v({phase:e,position:n,lite:i}){let o=i?140:280,l=(0,a.useRef)(null),u=(0,a.useMemo)(()=>{let e=(0,c.a)(21);return Array.from({length:o},()=>({x:(e()-.5)*11,y:8*e(),z:(e()-.5)*8,v:.6+1.1*e(),spin:6*e(),rare:.03>e()}))},[o]),p=(0,a.useMemo)(()=>({o:new r.t,gold:new r.Es(2.2,1.55,.45),rare:new r.Es(5,3.6,1.2)}),[]);return(0,s.f)(t=>{let a=l.current;if(!a)return;let r=f(h(e.current??0,.02,.3)),n=t.clock.elapsedTime;u.forEach((e,t)=>{let s=4-(e.y+n*e.v)%8;p.o.position.set(e.x,s,e.z),p.o.rotation.set(n*e.spin*.6,n*e.spin,.4),p.o.scale.setScalar(r*(e.rare?1.5:1)),p.o.updateMatrix(),a.setMatrixAt(t,p.o.matrix),a.setColorAt(t,e.rare?p.rare:p.gold)}),a.instanceMatrix.needsUpdate=!0,a.instanceColor&&(a.instanceColor.needsUpdate=!0)}),(0,t.jsx)("group",{position:n,children:(0,t.jsxs)("instancedMesh",{ref:l,args:[void 0,void 0,o],frustumCulled:!1,children:[(0,t.jsx)("cylinderGeometry",{args:[.17,.17,.035,24]}),(0,t.jsx)("meshBasicMaterial",{toneMapped:!1})]})})}function g({phase:e,position:n}){let i=(0,a.useRef)(null),o=(0,a.useRef)(null),l=(0,a.useMemo)(()=>{let e=(0,c.a)(31);return Array.from({length:150},()=>({d:new r.cE(2*e()-1,2*e()-1,2*e()-1).normalize(),r:2.6+5.5*e(),w:.3+.9*e(),ph:e()*Math.PI*2,delay:e()}))},[]),u=(0,a.useMemo)(()=>{let e=new r.ld;return e.setAttribute("position",new r.f5(new Float32Array(540),3)),e},[]);(0,a.useEffect)(()=>()=>u.dispose(),[u]);let p=(0,a.useMemo)(()=>({o:new r.t,pos:l.map(()=>new r.cE),a:new r.Es(.9,3.2,1.9),b:new r.Es(1.4,2.4,3.6),c:new r.Es}),[l]);return(0,s.f)(t=>{let a=i.current;if(!a)return;let n=e.current??0,s=t.clock.elapsedTime;l.forEach((e,t)=>{let i=f(h(n,.15+.45*e.delay,.35+.45*e.delay)),o=s*e.w+e.ph,l=p.pos[t];l.copy(e.d).multiplyScalar(e.r*i).applyAxisAngle(new r.cE(0,1,0),.3*o),p.o.position.copy(l),p.o.scale.setScalar(i*(.7+.3*Math.sin(5*s+e.ph))),p.o.updateMatrix(),a.setMatrixAt(t,p.o.matrix),p.c.copy(p.a).lerp(p.b,.5+.5*Math.sin(2*s+e.ph)),a.setColorAt(t,p.c)}),a.instanceMatrix.needsUpdate=!0,a.instanceColor&&(a.instanceColor.needsUpdate=!0);let u=o.current;if(u){let e=u.geometry.getAttribute("position").array;for(let t=0;t<90;t++){let a=p.pos[7*t%150],r=p.pos[(13*t+5)%150];e.set([a.x,a.y,a.z,r.x,r.y,r.z],6*t)}u.geometry.getAttribute("position").needsUpdate=!0,u.material.opacity=.35*f(h(n,.4,.8))}}),(0,t.jsxs)("group",{position:n,children:[(0,t.jsxs)("instancedMesh",{ref:i,args:[void 0,void 0,150],frustumCulled:!1,children:[(0,t.jsx)("sphereGeometry",{args:[.09,12,12]}),(0,t.jsx)("meshBasicMaterial",{toneMapped:!1})]}),(0,t.jsx)("lineSegments",{ref:o,geometry:u,frustumCulled:!1,children:(0,t.jsx)("lineBasicMaterial",{color:"#4fe39a",transparent:!0,opacity:0,depthWrite:!1})})]})}let M=[[20,"#05070a"],[2,"#040b18"],[-58,"#040b18"],[-70,"#11060a"],[-118,"#11060a"],[-130,"#0f0a03"],[-168,"#0f0a03"],[-180,"#02110d"],[-218,"#02110d"],[-232,"#05070a"]].map(([e,t])=>[e,new r.Es(t)]),y=["#62e3ff","#4fe39a","#ffc44f","#ff6f91"],w=[2.356,.785,3.927,5.498],A=[[.1,"l1"],[.33,"l2"],[.86,"title"]],b=["play","l1","l2","title","done"],j={start:24,end:-312,node:-60,audit:-100,stream:-158,bloch:-208,rings:-238,ringGap:7,close:-304},E=e=>[1.4*Math.sin(.031*e),.7*Math.cos(.023*e)-.1],S=(e,t,a)=>{let r=Math.min(1,Math.max(0,(a-e)/(t-e)));return r*r*(3-2*r)},R=(e,t,a)=>Math.min(1,Math.max(0,(t-e)/(t-a))),T=`
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
    float z = mix(${j.start.toFixed(1)}, ${j.end.toFixed(1)}, aU);
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

    vec3 base = uColors[int(aCh + 0.5)];
    vColor = mix(mix(base, uDead, dead), vec3(1.0), lens * 0.22 + uPulse * 0.3);
    vAlpha = a;
  }
`,I=`
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vColor * vAlpha, vAlpha);
    #include <colorspace_fragment>
  }
`;function z({camTarget:e,intro:n,introOn:o,onIntroEnd:c,onReady:f,reduced:h,lite:p,labels:d,flash:C}){let P=(0,i.f)(e=>e.gl),B=(0,a.useMemo)(()=>(function(e,t){let a=4*e*t,n=new Float32Array(a),s=new Float32Array(a),i=new Float32Array(a),o=new Float32Array(a),l=new Uint32Array(4*e*(t-1)*2),u=0,c=0;for(let a=0;a<4;a++)for(let r=0;r<e;r++){let f=1===e?0:r/(e-1)*2-1,h=(97*a+31*r)%101/101;for(let e=0;e<t;e++)n[u]=e/(t-1),s[u]=f,i[u]=a,o[u]=h,e>0&&(l[c++]=u-1,l[c++]=u),u++}let f=new r.ld;return f.setAttribute("position",new r.f5(new Float32Array(3*a),3)),f.setAttribute("aU",new r.f5(n,1)),f.setAttribute("aLine",new r.f5(s,1)),f.setAttribute("aCh",new r.f5(i,1)),f.setAttribute("aSeed",new r.f5(o,1)),f.setIndex(new r.f5(l,1)),f.boundingSphere=new r.L0(new r.cE,400),f})(p?6:10,p?1500:2600),[p]),F=(0,a.useMemo)(()=>new r.Zg({vertexShader:T,fragmentShader:I,transparent:!0,depthWrite:!1,depthTest:!1,blending:r.tq,uniforms:{uTime:{value:6},uIntro:{value:0},uLens:{value:0},uAspect:{value:1},uPulse:{value:0},uSplit:{value:1},uBeat:{value:0},uBeatAmp:{value:0},uReveal:{value:999},uPointer:{value:new r.wq},uColors:{value:y.map(e=>new r.Es(e))},uDead:{value:new r.Es("#3b454e")}}}),[]);(0,a.useEffect)(()=>()=>B.dispose(),[B]),(0,a.useEffect)(()=>()=>F.dispose(),[F]);let L=(0,a.useRef)(null),O=(0,a.useRef)(null),N=(0,a.useRef)(0),U=(0,a.useRef)(0),D=(0,a.useRef)(0),k=(0,a.useRef)(0),q=(0,a.useRef)({z:j.start,v:new r.cE,look:new r.cE,lens:{x:0,y:.2},rig:new r.zm,frames:0,lastIo:0,lastDn:1,qa:new r.as,qb:new r.as,side:new r.cE(-13,.4,-19),sideLook:new r.cE(0,0,-19)}),G=(0,a.useRef)({x:0,y:0,last:-1e9,inside:!1});(0,a.useEffect)(()=>{let e=P.domElement;function t(t){let a=e.getBoundingClientRect();G.current.inside=t.clientY>=a.top&&t.clientY<=a.bottom,G.current.x=(t.clientX-a.left)/a.width*2-1,G.current.y=-((t.clientY-a.top)/a.height*2-1),G.current.last=performance.now()}return window.addEventListener("pointermove",t,{passive:!0}),()=>window.removeEventListener("pointermove",t)},[P]),(0,s.f)((t,a)=>{let s,i=L.current?.material;if(!i)return;let l=i.uniforms,u=q.current,p=t.camera,m=Math.min(a,.05),x=t.clock.elapsedTime;if(u.frames<3&&2==++u.frames&&f?.(),o.current&&u.frames>=2){let e=Math.min(1,(n.current??0)+Math.min(a,.1)/7.6);n.current=e;let t=document.documentElement;for(let[a,r]of A)e>=a&&b.indexOf(t.getAttribute("data-intro")??"")<b.indexOf(r)&&t.setAttribute("data-intro",r);e>=1&&c?.()}let v=n.current??1,g=t.size.width/t.size.height;l.uAspect.value=g;let y=g<.8?72:50;p.fov!==y&&(p.fov=y,p.updateProjectionMatrix()),h||(l.uTime.value=(l.uTime.value+m)%600),l.uIntro.value=v;let T=h||v>=1;l.uReveal.value=T?999:v<.8?-999:-312+380*((s=Math.min(1,Math.max(0,(v-.8)/(.97-.8))))*s*(3-2*s)),l.uBeat.value=0,l.uBeatAmp.value=0,l.uSplit.value=1,l.uPulse.value=T?0:.6*Math.exp(-(((v-.72)/.03)**2));let I=e.current??j.start;u.z+=(I-u.z)*(h?1:1-Math.exp(-(4*m)));let z=u.z,[P,B]=E(z),F=G.current.inside&&performance.now()-G.current.last<2600&&!h,H=F?G.current.x:0,W=F?G.current.y:0,_=2.2*Math.sin(Math.PI*R(z,6,-34)),$=R(z,-124,-146)*(1-R(z,-164,-174))*1.8,V=.32*Math.sin(Math.PI*R(z,-176,-222));u.v.set(.85*P+.35*H+_,B+.25+.2*W+$,z);let[K,Q]=E(z-10);u.look.set(K,Q-.05-.7*$,z-10);let Z=t.scene.background instanceof r.Es?t.scene.background:t.scene.background=new r.Es;!function(e,t){if(e>=M[0][0])return t.copy(M[0][1]);for(let a=1;a<M.length;a++){let[r,n]=M[a],[s,i]=M[a-1];if(e>=r)return t.copy(i).lerp(n,(s-e)/(s-r))}t.copy(M[M.length-1][1])}(p.position.z,Z),t.scene.fog?.color.copy(Z),p.position.lerp(u.v,h?1:1-Math.exp(-(6*m))),p.lookAt(u.look),p.rotateZ(h?0:V);let Y=0;F?(u.lens.x=G.current.x,u.lens.y=G.current.y,Y=1):h||(u.lens.x=.6*Math.sin(.23*x),u.lens.y=.35*Math.sin(.37*x+1.2),Y=.8*v);let J=l.uPointer.value,X=F?1-Math.exp(-(14*m)):1-Math.exp(-(2*m));J.x+=(u.lens.x-J.x)*X,J.y+=(u.lens.y-J.y)*X,l.uLens.value+=(Y-l.uLens.value)*(1-Math.exp(-(3*m))),U.current=R(p.position.z,10,-18),N.current=R(p.position.z,-64,-94),D.current=R(p.position.z,-128,-168),k.current=R(p.position.z,-176,-222);let ee=p.position.z-j.node;u.lastIo<.72&&v>=.72&&v<1&&window.dispatchEvent(new Event("site:beat")),u.lastDn>0&&ee<=0&&window.dispatchEvent(new Event("site:pass")),u.lastIo=v,u.lastDn=ee,O.current&&(O.current.material.opacity=Math.min(1,Math.max(0,1-Math.abs(ee)/40))*v,O.current.scale.setScalar(1+(h?0:.08*Math.sin(2.4*x)))),C.current?.style.setProperty("opacity",String(h?0:.85*Math.exp(-((ee/1.8)**2))));let et=T?R(p.position.z,-20,-28)*(1-R(p.position.z,-48,-56)):0,ea=2.5*(1-.985*((1-S(-60,-26,-42))*S(-78,-60,-42)))*(1-.96*(1-S(-306,-272,-42))),[er,en]=E(-42);d.current?.forEach((e,a)=>{if(!e)return;let r=w[a];u.v.set(er+Math.cos(r)*(ea+.55),en+Math.sin(r)*(ea+.55),-42).project(p);let n=(.5*u.v.x+.5)*t.size.width,s=(-(.5*u.v.y)+.5)*t.size.height;e.style.transform=`translate3d(${n.toFixed(1)}px, ${s.toFixed(1)}px, 0)`,e.style.opacity=String(u.v.z<1?et:0),e.dataset.dead=a>0?"true":"false"})});let H=E(j.node),W=e=>{let[t,a]=E(e);return[t,a,e]};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("fog",{attach:"fog",args:["#05070a",14,62]}),(0,t.jsx)("lineSegments",{ref:L,geometry:B,material:F,frustumCulled:!1}),(0,t.jsxs)("mesh",{ref:O,position:[H[0],H[1],j.node],children:[(0,t.jsx)("sphereGeometry",{args:[.22,32,32]}),(0,t.jsx)("meshBasicMaterial",{color:[3.4,3.8,4],transparent:!0,opacity:0,toneMapped:!1,fog:!1})]}),(0,t.jsx)(m,{intro:n,position:[W(j.start-13)[0],W(j.start-13)[1]+.5,j.start-13],lite:p}),(0,t.jsx)(x,{phase:U,position:W(-22)}),(0,t.jsx)(u.T,{phase:N,position:W(j.audit)}),(0,t.jsx)(v,{phase:D,position:W(j.stream),lite:p}),(0,t.jsx)(u.W,{phase:k,position:W(j.bloch)}),(0,t.jsx)(g,{phase:k,position:W(j.bloch)}),(0,t.jsx)(u.t,{names:l.M,at:e=>W(j.rings-e*j.ringGap)}),(0,t.jsx)(u._,{position:W(j.close)})]})}e.s(["INTRO_S",0,7.6,"Z",0,j,"default",0,function(e){let{lite:a,active:r}=e;return(0,t.jsxs)(n.f,{className:"world-canvas",frameloop:r?"always":"never",dpr:a?[1,1.5]:[1,1.75],gl:{antialias:!a,alpha:!1,powerPreference:"high-performance"},camera:{fov:50,near:.1,far:140,position:[-13,.4,-19]},onCreated:({gl:e})=>e.setClearColor("#05070a",1),"aria-hidden":"true",children:[(0,t.jsx)(z,{...e}),(0,t.jsx)(o.g,{multisampling:4*!a,children:(0,t.jsx)(o.w,{mipmapBlur:!0,intensity:a?.8:1.05,luminanceThreshold:.08,luminanceSmoothing:.3,radius:.72})})]})}],2966)},91883,e=>{var t=e.i(43476),a=e.i(71645),r=e.i(90072),n=e.i(95393),s=e.i(876),i=e.i(34510);let o=(e,t,a)=>Math.min(1,Math.max(0,(e-t)/(a-t))),l=e=>e*e*(3-2*e);function u({text:e,height:n,position:s,opts:i,matRef:o,anchor:l="center"}){let c=function(e,{px:t=160,weight:n=800,color:s="#e7edf0",stretch:i="expanded"}={}){let[o,l]=(0,a.useState)(null);return(0,a.useEffect)(()=>{let a=!0,o=null;return(async()=>{try{await document.fonts.load(`${n} ${t}px "Mona Sans"`)}catch{}if(!a)return;let u=document.createElement("canvas"),c=u.getContext("2d"),f=`${n} ${t}px "Mona Sans", Arial, sans-serif`;c.font=f,c.fontStretch=i;let h=Math.ceil(c.measureText(e).width+.3*t),p=Math.ceil(1.3*t);u.width=h,u.height=p,c.font=f,c.fontStretch=i,c.fillStyle=s,c.textBaseline="middle",c.fillText(e,.15*t,p/2),(o=new r.Nk(u)).colorSpace=r.nj,o.anisotropy=4,l({map:o,aspect:h/p})})(),()=>{a=!1,o?.dispose()}},[e,t,n,s,i]),o}(e,i);if(!c)return null;let f=n*c.aspect;return(0,t.jsxs)("mesh",{position:[s[0]+("left"===l?f/2:0),s[1],s[2]],children:[(0,t.jsx)("planeGeometry",{args:[f,n]}),(0,t.jsx)("meshBasicMaterial",{ref:o,map:c.map,transparent:!0,depthWrite:!1,toneMapped:!1})]})}let c=`
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
`;e.s(["T",0,function({phase:e,position:i=[0,0,0]}){let c=(0,s.f)("A4"),f=(0,s.f)("A7"),h=(0,s.f)("A10"),p=(0,a.useRef)(null),d=(0,a.useRef)(null),m=(0,a.useRef)(null),x=(0,a.useRef)(null),v=(0,a.useRef)(null),g=(0,a.useRef)(null),M=(0,a.useRef)(null),y=(0,a.useMemo)(()=>new r.Es("#7f8c95"),[]),w=(0,a.useMemo)(()=>new r.Es("#e7edf0"),[]);return(0,n.f)(()=>{let t=e.current??0,a=l(o(t,.22,.4)),r=l(o(t,.42,.62)),n=l(o(t,.62,.82));g.current&&(g.current.scale.x=Math.max(1e-4,a),g.current.visible=n<.98),p.current&&(p.current.color.copy(w).lerp(y,a),p.current.opacity=1-.8*n),M.current&&(M.current.position.y=-3.6+2.2*r),d.current&&(d.current.opacity=.06*r),m.current&&(m.current.opacity=r),x.current&&(x.current.opacity=n),v.current&&(v.current.opacity=.9*n)}),(0,t.jsxs)("group",{position:i,children:[(0,t.jsx)(u,{text:c.display,height:2.1,position:[0,.9,0],matRef:p}),(0,t.jsx)("group",{ref:g,position:[-4.4,.85,.02],scale:[1e-4,1,1],children:(0,t.jsxs)("mesh",{position:[4.4,0,0],children:[(0,t.jsx)("planeGeometry",{args:[8.8,.17]}),(0,t.jsx)("meshBasicMaterial",{color:[2.4,.5,.42],toneMapped:!1})]})}),(0,t.jsxs)("group",{ref:M,position:[0,-3.6,0],children:[(0,t.jsxs)("mesh",{rotation:[-Math.PI/2,0,0],children:[(0,t.jsx)("planeGeometry",{args:[16,10]}),(0,t.jsx)("meshBasicMaterial",{ref:d,color:"#ffc44f",transparent:!0,opacity:0,depthWrite:!1,side:r.Vs})]}),(0,t.jsx)(u,{text:`Recording length alone: AUC ${f.display}`,height:.42,position:[0,.32,1.5],opts:{px:96,weight:650,color:"#ffc44f",stretch:"normal"},matRef:m})]}),(0,t.jsx)(u,{text:h.display,height:1.5,position:[.4,2.9,-7],opts:{color:"#62e3ff"},matRef:x}),(0,t.jsx)(u,{text:`AUC ${h.interval?.text??""}, subject-independent`,height:.34,position:[.4,1.85,-7],opts:{px:96,weight:600,color:"#e7edf0",stretch:"normal"},matRef:v})]})},"W",0,function({phase:e,position:s=[0,0,0]}){let i=(0,a.useRef)(null),c=(0,a.useRef)(null),f=(0,a.useRef)(null),h=(0,a.useMemo)(()=>{let e=[];for(let t=0;t<6;t++){let a=t/6*Math.PI;for(let t=0;t<96;t++){let n=t/96*Math.PI*2,s=(t+1)/96*Math.PI*2;e.push(new r.cE(Math.cos(a)*Math.sin(n)*2.3,2.3*Math.cos(n),Math.sin(a)*Math.sin(n)*2.3),new r.cE(Math.cos(a)*Math.sin(s)*2.3,2.3*Math.cos(s),Math.sin(a)*Math.sin(s)*2.3))}}for(let t of[-.6,-.3,0,.3,.6]){let a=2.3*Math.sin(t*Math.PI*.5),n=2.3*Math.cos(t*Math.PI*.5);for(let t=0;t<96;t++){let s=t/96*Math.PI*2,i=(t+1)/96*Math.PI*2;e.push(new r.cE(Math.cos(s)*n,a,Math.sin(s)*n),new r.cE(Math.cos(i)*n,a,Math.sin(i)*n))}}return new r.ld().setFromPoints(e)},[]),p=(0,a.useRef)(null);return(0,a.useEffect)(()=>()=>h.dispose(),[h]),(0,n.f)(t=>{let a=l(o(e.current??0,.05,.4)),r=t.clock.elapsedTime;i.current&&(i.current.rotation.y=.12*r),c.current&&(c.current.rotation.set(0,.9*r,.6+.35*Math.sin(.5*r)),c.current.scale.setScalar(Math.max(.001,a))),p.current&&(p.current.opacity=.35*a),f.current&&(f.current.opacity=a)}),(0,t.jsxs)("group",{position:s,children:[(0,t.jsxs)("group",{ref:i,children:[(0,t.jsx)("lineSegments",{geometry:h,children:(0,t.jsx)("lineBasicMaterial",{ref:p,color:"#4fe39a",transparent:!0,opacity:0})}),(0,t.jsxs)("group",{ref:c,children:[(0,t.jsxs)("mesh",{position:[0,1.15,0],children:[(0,t.jsx)("cylinderGeometry",{args:[.03,.03,2.3,8]}),(0,t.jsx)("meshBasicMaterial",{color:[.9,3.2,1.8],toneMapped:!1})]}),(0,t.jsxs)("mesh",{position:[0,2.3,0],children:[(0,t.jsx)("sphereGeometry",{args:[.12,16,16]}),(0,t.jsx)("meshBasicMaterial",{color:[1.2,3.6,2.2],toneMapped:!1})]})]})]}),(0,t.jsx)(u,{text:"Exploratory. No quantum advantage claimed.",height:.36,position:[0,-3,0],opts:{px:96,weight:600,color:"#4fe39a",stretch:"normal"},matRef:f})]})},"_",0,function({position:e}){return(0,t.jsx)("group",{position:e,children:["#62e3ff","#4fe39a","#ffc44f","#ff6f91"].map((e,a)=>(0,t.jsxs)("mesh",{rotation:[0,0,a*Math.PI/2],children:[(0,t.jsx)("torusGeometry",{args:[1.6,.07,12,64,Math.PI/2-.06]}),(0,t.jsx)("meshBasicMaterial",{color:new r.Es(e).multiplyScalar(1.6),toneMapped:!1})]},e))})},"t",0,function({names:e,at:a}){return(0,t.jsx)("group",{children:e.map((e,r)=>(0,t.jsxs)("group",{position:a(r),children:[(0,t.jsxs)("mesh",{children:[(0,t.jsx)("torusGeometry",{args:[3.4,.022,8,160]}),(0,t.jsx)("meshBasicMaterial",{color:[.38,1.2,1.45],toneMapped:!1,transparent:!0,opacity:.75})]}),(0,t.jsx)(u,{text:`${r+1}  ${e.charAt(0)+e.slice(1).toLowerCase()}`,height:.42,position:[0,3.9,0],opts:{px:96,weight:700,color:"#e7edf0",stretch:"semi-expanded"}})]},e))})},"e",0,function({phase:e,flood:s,position:h=[0,0,0],lite:p=!1}){let d=(0,a.useRef)(null),m=(0,a.useRef)(null),x=(0,a.useRef)(null),v=(0,a.useMemo)(()=>{let e=p?900:2200,t=new Float32Array(3*e),a=new Float32Array(e),n=new Float32Array(e),s=(0,i.a)(7);for(let r=0;r<e;r++){let e=Math.floor(9*s());t[3*r]=18*s()-9,t[3*r+1]=(e-4)*.34+(s()-.5)*.12,t[3*r+2]=(s()-.5)*2.4,a[r]=s(),n[r]=+(.008>s())}let o=new r.ld;return o.setAttribute("position",new r.f5(t,3)),o.setAttribute("aSeed",new r.f5(a,1)),o.setAttribute("aRare",new r.f5(n,1)),o.boundingSphere=new r.L0(new r.cE,20),o},[p]),g=(0,a.useMemo)(()=>new r.Zg({vertexShader:c,fragmentShader:f,transparent:!0,depthWrite:!1,blending:r.tq,uniforms:{uTime:{value:0},uPhase:{value:0},uFlood:{value:0}}}),[]),M=(0,a.useMemo)(()=>new r.ld().setFromPoints([new r.cE(-9.2,-1.8,0),new r.cE(9.2,-1.8,0),new r.cE(9.2,1.8,0),new r.cE(-9.2,1.8,0),new r.cE(-9.2,-1.8,0)]),[]),y=(0,a.useMemo)(()=>new r.DL(M,new r.rd({color:"#ffc44f",dashSize:.3,gapSize:.22,transparent:!0})),[M]);return(0,a.useEffect)(()=>(y.computeLineDistances(),m.current=y.material,()=>{v.dispose(),g.dispose(),M.dispose(),y.material.dispose()}),[v,g,M,y]),(0,n.f)(t=>{let a=l(o(e.current??0,.05,.35)),r=d.current?.material;r&&(r.uniforms.uTime.value=t.clock.elapsedTime,r.uniforms.uPhase.value=a,r.uniforms.uFlood.value=s?.current??0),m.current&&(m.current.opacity=.8*a),x.current&&(x.current.opacity=a)}),(0,t.jsxs)("group",{position:h,children:[(0,t.jsx)("points",{ref:d,geometry:v,material:g,frustumCulled:!1}),(0,t.jsx)("primitive",{object:y}),(0,t.jsx)(u,{text:"Synthetic data",height:.4,position:[-9.2,2.25,0],anchor:"left",opts:{px:96,weight:700,color:"#ffc44f",stretch:"normal"},matRef:x})]})}])},25564,e=>{e.s(["M",0,["QUESTION","BASELINE","CONTROL","ABLATION","CONFOUND CHECK","VALIDATION","REPORT"],"g",0,[{case:"01 Seizure",caseHref:"/cases/seizure-detection",cells:{QUESTION:{text:"Do the extra signals help?",href:"/cases/seizure-detection#question"},BASELINE:{text:"Baselines released with the dataset.",href:"/cases/seizure-detection#result"},ABLATION:{text:"A stage-by-stage ladder. Two failures kept.",href:"/cases/seizure-detection#change"},"CONFOUND CHECK":{text:"Window coverage. Inert fusion.",href:"/cases/seizure-detection#investigation"},VALIDATION:{text:"Patient-independent split, with an interval.",href:"/cases/seizure-detection#result"},REPORT:{text:"Alarm rate printed beside sensitivity.",href:"/cases/seizure-detection#meaning"}}},{case:"02 ADHD",caseHref:"/cases/adhd-eeg",cells:{QUESTION:{text:"Is the accuracy trustworthy?",href:"/cases/adhd-eeg#question"},BASELINE:{text:"Majority class. Recording length alone.",href:"/cases/adhd-eeg#investigation"},CONTROL:{text:"A shuffled control and a fixed bar for every idea.",href:"/cases/adhd-eeg#investigation"},ABLATION:{text:"Dozens of additions rejected.",href:"/cases/adhd-eeg#investigation"},"CONFOUND CHECK":{text:"50 Hz line. Recording length. Exclusion bias.",href:"/cases/adhd-eeg#investigation"},VALIDATION:{text:"Subject-independent, 5 folds, 10 seeds.",href:"/cases/adhd-eeg#result"},REPORT:{text:"Earlier headline set aside, with the gap.",href:"/cases/adhd-eeg#failure"}}},{case:"03 Finance",caseHref:"/cases/synthetic-finance",cells:{QUESTION:{text:"Is the signal real or a shortcut?",href:"/cases/synthetic-finance#question"},BASELINE:{text:"An always-positive floor.",href:"/cases/synthetic-finance#problem"},CONTROL:{text:"A permutation control and an adversarial harness.",href:"/cases/synthetic-finance#investigation"},ABLATION:{text:"Four method families behind one API.",href:"/cases/synthetic-finance#investigation"},"CONFOUND CHECK":{text:"A single-feature ceiling.",href:"/cases/synthetic-finance#investigation"},VALIDATION:{text:"Split by user, not by row.",href:"/cases/synthetic-finance#result"},REPORT:{text:"Labelled synthetic wherever it appears.",href:"/cases/synthetic-finance#result"}}},{case:"04 QHH",caseHref:"/cases/qhh",cells:{QUESTION:{text:"Can phase survive the circuit?",href:"/cases/qhh#question"},VALIDATION:{text:"Subject-wise on a public dataset.",href:"/cases/qhh#investigation"},REPORT:{text:"Labelled exploratory. Nothing claimed.",href:"/cases/qhh#result"}}}]])},34510,e=>{function t(e){let t=0x85ebca6b^Math.imul(0|e,0x9e3779b1);return t=Math.imul((t=Math.imul(t^t>>>15,0x2c1b3c6d))^t>>>12,0x297a2d39),((t^=t>>>15)>>>0)%1e5/1e5}function a(e,a){let r=Math.floor(e),n=e-r,s=2*t(31*r+a)-1;return s+(2*t((r+1)*31+a)-1-s)*(n*n*(3-2*n))}function r(e,t,a){let r=(e-t)/a;return Math.exp(-.5*r*r)}let n={brain:function(e){return .34*Math.sin(2*Math.PI*9.3*e+.4)*(.6+.4*Math.sin(2*Math.PI*.37*e))+.22*Math.sin(2*Math.PI*4.1*e+1.9)+.18*Math.sin(2*Math.PI*17.7*e+.2)+.3*a(22*e,11)},heart:function(e){let t=(e%.92+.92)%.92/.92;return r(t,.3,.012)-.18*r(t,.275,.01)-.2*r(t,.325,.01)+.24*r(t,.52,.045)+.03*a(30*e,5)},muscle:function(e){return Math.max(0,1.2*a(1.6*e,3)-.25)*a(140*e,17)*1.1+.03*a(60*e,2)},move:function(e){return .5*Math.sin(2*Math.PI*.21*e+.7)+.25*Math.sin(2*Math.PI*.53*e+2.1)+.2*a(2.2*e,9)}};e.s(["H",0,[{key:"brain",label:"BRAIN",sub:"EEG"},{key:"heart",label:"HEART",sub:"ECG"},{key:"muscle",label:"MUSCLE",sub:"EMG"},{key:"move",label:"MOVEMENT",sub:"ACC"}],"a",0,function(e){let t=e>>>0;return()=>{let e=t=t+0x6d2b79f5>>>0;return e=Math.imul(e^e>>>15,1|e),(((e^=e+Math.imul(e^e>>>7,61|e))^e>>>14)>>>0)/0x100000000}},"e",0,function(e){return Math.sqrt(-2*Math.log(Math.max(e(),1e-9)))*Math.cos(2*Math.PI*e())},"P",0,function(e,t,a,r,s,i=360){let o=n[e],l="";for(let e=0;e<=i;e++){let n=e/i*r,u=s/2-o(t+e/i*a)*(.42*s);l+=`${0===e?"M":"L"}${n.toFixed(1)} ${u.toFixed(1)}`}return l}])},90874,e=>{var t=e.i(61949);e.s(["f",()=>t.D])}],43785,function(e){e.n(e.i(2966))}]);