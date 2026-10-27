(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,96579,e=>{"use strict";var t=e.i(43476),a=e.i(71645),n=e.i(90072),o=e.i(75056),r=e.i(95393),l=e.i(90874),i=e.i(79877);let s=[{key:"brain",name:"Brain",tag:"EEG",color:"#62e3ff"},{key:"heart",name:"Heart",tag:"ECG",color:"#4fe39a"},{key:"muscle",name:"Muscle",tag:"EMG",color:"#ffc44f"},{key:"move",name:"Movement",tag:"ACC",color:"#ff6f91"}],u=e=>2.2+-17.2*Math.pow(e,1.1),f=`
  #define PI2 6.28318530718
  uniform float uTime;
  uniform float uIntro;
  uniform float uFusion;
  uniform float uZero;
  uniform float uRebuild;
  uniform float uLens;
  uniform float uAspect;
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
  float signal(float ch, float u, float t) {
    if (ch < 0.5) return brain(u * 2.2 - t * 0.32) * 0.62;
    if (ch < 1.5) return heart(u * 3.6 - t * 0.46) * 0.82 - 0.16;
    if (ch < 2.5) return muscle(u * 2.0 - t * 0.28) * 0.7;
    return movement(u * 9.0 - t * 0.8) * 0.6;
  }

  vec3 place(float u, float y) {
    return vec3(-8.60 + 16.00 * u, y, 2.20 + -17.20 * pow(u, 1.1));
  }

  void main() {
    float lane = (1.5 - aCh) * 0.92;
    float other = step(0.5, aCh);
    float dead = uZero * (1.0 - uRebuild) * other;

    float amp = (1.0 - dead) * smoothstep(0.0, 0.7, uIntro);
    float s = signal(aCh, aU, uTime) * amp;

    float spread = aLine * 0.17 * (1.0 - 0.75 * dead);
    float wobble = 0.7 + 0.3 * sin(aU * 7.0 + aSeed * 31.0 + uTime * 0.4);
    float jitter = (vnoise(aU * 13.0 + aSeed * 50.0 + uTime * 0.7) * 0.11
      + vnoise(aU * 47.0 + aSeed * 91.0 - uTime * 1.3) * 0.04) * (0.35 + abs(aLine));
    jitter *= (1.0 - 0.9 * dead) * (1.0 - 0.45 * uRebuild);

    // fusion: lanes close on one point at the far end
    float f = smoothstep(0.28, 1.0, aU) * uFusion;
    float focus = f * f * (3.0 - 2.0 * f);

    float yClean = mix(lane + s, s * 0.25, focus);
    float yNoisy = mix(lane + s + spread * wobble + jitter, s * 0.25 + (spread + jitter) * 0.12, focus);

    // the lens: measured on screen, against the clean trace
    vec4 cClean = projectionMatrix * modelViewMatrix * vec4(place(aU, yClean), 1.0);
    vec2 ndc = cClean.xy / cClean.w;
    float d = length((ndc - uPointer) * vec2(uAspect, 1.0));
    float lens = (1.0 - smoothstep(0.04, 0.42, d)) * uLens;

    float y = mix(yNoisy, yClean, lens * 0.94);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(place(aU, y), 1.0);

    float core = 1.0 - abs(aLine);
    float a = mix(0.07, 0.62, core * core);
    a *= smoothstep(0.0, 0.07, aU);
    a *= 1.0 - smoothstep(0.8, 1.0, aU) * (1.0 - 0.85 * uFusion);
    a *= mix(1.0, 0.34, dead);
    a += lens * 0.55 * core * (1.0 - dead * 0.6);
    float reveal = uIntro * 1.25;
    a *= 1.0 - smoothstep(reveal - 0.1, reveal, aU);

    vec3 base = uColors[int(aCh + 0.5)];
    vColor = mix(mix(base, uDead, dead), vec3(1.0), lens * 0.22);
    vAlpha = a;
  }
`,c=`
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vColor * vAlpha, vAlpha);
    #include <colorspace_fragment>
  }
`,m=(e,t,a)=>Math.min(1,Math.max(0,(e-t)/(a-t))),d={fusion:[.12,.3],zero:[.44,.56],rebuild:[.74,.86]};function v({progress:e,reduced:o,lite:i,labels:p}){let h=(0,l.f)(e=>e.gl),x=(0,a.useMemo)(()=>(function(e,t){let a=s.length*e*t,o=new Float32Array(a),r=new Float32Array(a),l=new Float32Array(a),i=new Float32Array(a),u=new Uint32Array(s.length*e*(t-1)*2),f=0,c=0;for(let a=0;a<s.length;a++)for(let n=0;n<e;n++){let s=1===e?0:n/(e-1)*2-1,m=(97*a+31*n)%101/101;for(let e=0;e<t;e++)o[f]=e/(t-1),r[f]=s,l[f]=a,i[f]=m,e>0&&(u[c++]=f-1,u[c++]=f),f++}let m=new n.ld;return m.setAttribute("position",new n.f5(new Float32Array(3*a),3)),m.setAttribute("aU",new n.f5(o,1)),m.setAttribute("aLine",new n.f5(r,1)),m.setAttribute("aCh",new n.f5(l,1)),m.setAttribute("aSeed",new n.f5(i,1)),m.setIndex(new n.f5(u,1)),m.boundingSphere=new n.L0(new n.cE,60),m})(i?13:22,i?220:360),[i]),g=(0,a.useMemo)(()=>new n.Zg({vertexShader:f,fragmentShader:c,transparent:!0,depthWrite:!1,depthTest:!1,blending:n.tq,uniforms:{uTime:{value:6},uIntro:{value:+!!o},uFusion:{value:0},uZero:{value:0},uRebuild:{value:0},uLens:{value:0},uAspect:{value:1},uPointer:{value:new n.wq(0,0)},uColors:{value:s.map(e=>new n.Es(e.color))},uDead:{value:new n.Es("#3b454e")}}}),[o]);(0,a.useEffect)(()=>()=>x.dispose(),[x]),(0,a.useEffect)(()=>()=>g.dispose(),[g]);let y=(0,a.useRef)(null),b=(0,a.useRef)(null),w=(0,a.useRef)({v:new n.cE,target:new n.cE,base:new n.cE,aspect:0,lens:{x:.2,y:.2}}),C=(0,a.useRef)({x:0,y:0,last:-1e9,inside:!1});return(0,a.useEffect)(()=>{let e=h.domElement;function t(t){let a=e.getBoundingClientRect(),n=t.clientY>=a.top&&t.clientY<=a.bottom&&t.clientX>=a.left&&t.clientX<=a.right;C.current.inside=n,n&&(C.current.x=(t.clientX-a.left)/a.width*2-1,C.current.y=-((t.clientY-a.top)/a.height*2-1),C.current.last=performance.now())}return window.addEventListener("pointermove",t,{passive:!0}),()=>window.removeEventListener("pointermove",t)},[h]),(0,r.f)((t,a)=>{let n=y.current?.material;if(!n)return;let r=n.uniforms,l=w.current,i=t.camera,s=Math.min(a,.05),f=e.get(),c=o?1:1-Math.exp(-(5*s)),v=t.size.width/t.size.height;if(v!==l.aspect){l.aspect=v;let e=v<.9;i.fov=e?52:36,l.base.set(1.2*!!e,e?.5:.35,e?9.5:7.6),i.position.copy(l.base),i.updateProjectionMatrix(),r.uAspect.value=v}o||(r.uTime.value=(r.uTime.value+s)%600),r.uIntro.value=o?1:Math.min(1,r.uIntro.value+s/2.4),r.uFusion.value+=(m(f,...d.fusion)-r.uFusion.value)*c,r.uZero.value+=(m(f,...d.zero)-r.uZero.value)*c,r.uRebuild.value+=(m(f,...d.rebuild)-r.uRebuild.value)*c;let h=C.current.inside&&performance.now()-C.current.last<2600,x=0;if(h)l.lens.x=C.current.x,l.lens.y=C.current.y,x=1;else if(!o){let e=t.clock.elapsedTime;l.lens.x=.62*Math.sin(.23*e)-.05,l.lens.y=.28+.22*Math.sin(.37*e+1.2),x=.85*r.uIntro.value}let g=r.uPointer.value,M=h?1-Math.exp(-(14*s)):1-Math.exp(-(2*s));g.x+=(l.lens.x-g.x)*M,g.y+=(l.lens.y-g.y)*M,r.uLens.value+=(x-r.uLens.value)*(1-Math.exp(-(3*s)));let A=h&&!o?C.current.x:0,E=h&&!o?C.current.y:0;l.target.set(l.base.x+.35*A,l.base.y+.2*E,l.base.z-1.4*f),i.position.lerp(l.target,o?1:1-Math.exp(-(3*s))),i.lookAt(.6,-.1,-4);let j=r.uFusion.value,T=r.uRebuild.value;b.current&&(b.current.material.opacity=j*(.55+.45*T),b.current.scale.setScalar(.6+.6*T+(o?0:.06*Math.sin(2.2*t.clock.elapsedTime)*T)));let F=r.uZero.value*(1-T),P=Math.min(1,Math.max(0,(.6-.28)/.72))*j,I=P*P*(3-2*P);p.current?.forEach((e,a)=>{if(!e)return;l.v.set(1,(1.5-a)*.92*(1-I)+.34+.85,u(.6)).project(i);let n=(.5*l.v.x+.5)*t.size.width,o=(-(.5*l.v.y)+.5)*t.size.height;e.style.transform=`translate3d(${n.toFixed(1)}px, ${o.toFixed(1)}px, 0)`,e.style.opacity=String(Math.min(1,1.4*j)*(0===a?1:1-.2*F)),e.dataset.dead=a>0&&F>.5?"true":"false"})}),(0,t.jsxs)("group",{position:[0,.85,0],children:[(0,t.jsx)("lineSegments",{ref:y,geometry:x,material:g,frustumCulled:!1}),(0,t.jsxs)("mesh",{ref:b,position:[6.84,0,u(.965)],children:[(0,t.jsx)("sphereGeometry",{args:[.11,24,24]}),(0,t.jsx)("meshBasicMaterial",{color:[3.2,3.6,3.8],transparent:!0,opacity:0,toneMapped:!1})]})]})}e.s(["BEATS",0,d,"CHANNELS",0,s,"default",0,function({progress:e,reduced:a,lite:n,labels:r,active:l,onReady:s}){return(0,t.jsxs)(o.f,{className:"field-canvas",frameloop:l?"always":"never",dpr:n?[1,1.5]:[1,1.75],gl:{antialias:!n,alpha:!1,powerPreference:"high-performance"},camera:{fov:36,near:.1,far:60,position:[0,.35,7.6]},onCreated:({gl:e})=>{e.setClearColor("#05070a",1),requestAnimationFrame(()=>s?.())},"aria-hidden":"true",children:[(0,t.jsx)(v,{progress:e,reduced:a,lite:n,labels:r}),(0,t.jsx)(i.g,{multisampling:4*!n,children:(0,t.jsx)(i.w,{mipmapBlur:!0,intensity:n?.8:1.05,luminanceThreshold:.08,luminanceSmoothing:.3,radius:.72})})]})}])},61964,function(e){e.n(e.i(96579))}]);