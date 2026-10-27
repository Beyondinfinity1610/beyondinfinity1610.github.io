(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,[48705,e=>{var t=e.i(43476),a=e.i(71645),n=e.i(90072),r=e.i(95393),o=e.i(33623);let i=`
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
`;class l extends o.x{constructor(){super("LensEffect",i,{attributes:o.h.CONVOLUTION,uniforms:new Map([["strength",new n.MY(0)],["aberration",new n.MY(.0012)],["center",new n.MY(new n.wq(.5,.5))]])})}set(e,t){this.uniforms.get("strength").value=e,this.uniforms.get("aberration").value=t}}e.s(["f",0,function({drive:e,reduced:n=!1}){let o=(0,a.useMemo)(()=>new l,[]),i=(0,a.useRef)({cut:-1e9,dive:-1e9});return(0,a.useEffect)(()=>{let e=()=>i.current.cut=performance.now(),t=()=>i.current.dive=performance.now();return window.addEventListener("site:cut",e),window.addEventListener("site:dive",t),()=>{window.removeEventListener("site:cut",e),window.removeEventListener("site:dive",t)}},[]),(0,a.useEffect)(()=>()=>o.dispose(),[o]),(0,r.f)(()=>{if(n)return void o.set(0,8e-4);let t=performance.now(),a=(t-i.current.cut)/1e3,r=a<0||a>.7?0:.32*Math.sin(Math.min(1,a/.7)*Math.PI),l=(t-i.current.dive)/1e3,u=l<0||l>1.2?0:Math.min(1,l/.9)**2*.75,s=Math.max(e?.current??0,r,u);o.set(s,.0012+.012*s)}),(0,t.jsx)("primitive",{object:o,dispose:null})}])},96579,e=>{var t=e.i(43476),a=e.i(71645),n=e.i(90072),r=e.i(75056),o=e.i(95393),i=e.i(90874),l=e.i(79877),u=e.i(48705);let s=[{key:"brain",name:"Brain",tag:"EEG",color:"#62e3ff"},{key:"heart",name:"Heart",tag:"ECG",color:"#4fe39a"},{key:"muscle",name:"Muscle",tag:"EMG",color:"#ffc44f"},{key:"move",name:"Movement",tag:"ACC",color:"#ff6f91"}],f=e=>2.2+-17.2*Math.pow(e,1.1),c=`
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
`,v=`
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vColor * vAlpha, vAlpha);
    #include <colorspace_fragment>
  }
`,m=(e,t,a)=>Math.min(1,Math.max(0,(e-t)/(a-t))),p={fusion:[.12,.3],zero:[.44,.56],rebuild:[.74,.86]},d=[[0,0,.8],[1.6,.5,-.6],[-1.4,.9,-1.8],[2.2,-.2,-1.2],[-.6,1.1,.4],[.4,.4,1.6],[-1.8,.2,.6]];function h({progress:e,reduced:r,lite:l,labels:u,shot:g}){let x=(0,i.f)(e=>e.gl),w=(0,a.useMemo)(()=>(function(e,t){let a=s.length*e*t,r=new Float32Array(a),o=new Float32Array(a),i=new Float32Array(a),l=new Float32Array(a),u=new Uint32Array(s.length*e*(t-1)*2),f=0,c=0;for(let a=0;a<s.length;a++)for(let n=0;n<e;n++){let s=1===e?0:n/(e-1)*2-1,v=(97*a+31*n)%101/101;for(let e=0;e<t;e++)r[f]=e/(t-1),o[f]=s,i[f]=a,l[f]=v,e>0&&(u[c++]=f-1,u[c++]=f),f++}let v=new n.ld;return v.setAttribute("position",new n.f5(new Float32Array(3*a),3)),v.setAttribute("aU",new n.f5(r,1)),v.setAttribute("aLine",new n.f5(o,1)),v.setAttribute("aCh",new n.f5(i,1)),v.setAttribute("aSeed",new n.f5(l,1)),v.setIndex(new n.f5(u,1)),v.boundingSphere=new n.L0(new n.cE,60),v})(l?13:22,l?220:360),[l]),b=(0,a.useMemo)(()=>new n.Zg({vertexShader:c,fragmentShader:v,transparent:!0,depthWrite:!1,depthTest:!1,blending:n.tq,uniforms:{uTime:{value:6},uIntro:{value:+!!r},uFusion:{value:0},uZero:{value:0},uRebuild:{value:0},uLens:{value:0},uAspect:{value:1},uPointer:{value:new n.wq(0,0)},uColors:{value:s.map(e=>new n.Es(e.color))},uDead:{value:new n.Es("#3b454e")}}}),[r]);(0,a.useEffect)(()=>()=>w.dispose(),[w]),(0,a.useEffect)(()=>()=>b.dispose(),[b]);let y=(0,a.useRef)(null),C=(0,a.useRef)(null),M=(0,a.useRef)({v:new n.cE,target:new n.cE,base:new n.cE,aspect:0,off:new n.cE,offTo:new n.cE,lens:{x:.2,y:.2}}),E=(0,a.useRef)({x:0,y:0,last:-1e9,inside:!1});return(0,a.useEffect)(()=>{let e=x.domElement;function t(t){let a=e.getBoundingClientRect(),n=t.clientY>=a.top&&t.clientY<=a.bottom&&t.clientX>=a.left&&t.clientX<=a.right;E.current.inside=n,n&&(E.current.x=(t.clientX-a.left)/a.width*2-1,E.current.y=-((t.clientY-a.top)/a.height*2-1),E.current.last=performance.now())}return window.addEventListener("pointermove",t,{passive:!0}),()=>window.removeEventListener("pointermove",t)},[x]),(0,o.f)((t,a)=>{let n=y.current?.material;if(!n)return;let o=n.uniforms,i=M.current,l=t.camera,s=Math.min(a,.05),c=e.get(),v=r?1:1-Math.exp(-(5*s)),h=t.size.width/t.size.height;if(h!==i.aspect){i.aspect=h;let e=h<.9;l.fov=e?52:36,i.base.set(1.2*!!e,e?.5:.35,e?9.5:7.6),l.position.copy(i.base),l.updateProjectionMatrix(),o.uAspect.value=h}r||(o.uTime.value=(o.uTime.value+s)%600),o.uIntro.value=r?1:Math.min(1,o.uIntro.value+s/2.4),o.uFusion.value+=(m(c,...p.fusion)-o.uFusion.value)*v,o.uZero.value+=(m(c,...p.zero)-o.uZero.value)*v,o.uRebuild.value+=(m(c,...p.rebuild)-o.uRebuild.value)*v;let x=E.current.inside&&performance.now()-E.current.last<2600,w=0;if(x)i.lens.x=E.current.x,i.lens.y=E.current.y,w=1;else if(!r){let e=t.clock.elapsedTime;i.lens.x=.62*Math.sin(.23*e)-.05,i.lens.y=.28+.22*Math.sin(.37*e+1.2),w=.85*o.uIntro.value}let b=o.uPointer.value,A=x?1-Math.exp(-(14*s)):1-Math.exp(-(2*s));b.x+=(i.lens.x-b.x)*A,b.y+=(i.lens.y-b.y)*A,o.uLens.value+=(w-o.uLens.value)*(1-Math.exp(-(3*s)));let j=x&&!r?E.current.x:0,T=x&&!r?E.current.y:0,L=g?d[(g.current??0)%d.length]:[0,0,0];i.offTo.set(L[0],L[1],L[2]),i.off.lerp(i.offTo,r?1:1-Math.exp(-(1.4*s))),i.target.set(i.base.x+.35*j+i.off.x,i.base.y+.2*T+i.off.y,i.base.z-1.4*c+i.off.z),l.position.lerp(i.target,r?1:1-Math.exp(-(3*s))),l.lookAt(.6,-.1,-4);let I=o.uFusion.value,P=o.uRebuild.value;C.current&&(C.current.material.opacity=I*(.55+.45*P),C.current.scale.setScalar(.6+.6*P+(r?0:.06*Math.sin(2.2*t.clock.elapsedTime)*P)));let F=o.uZero.value*(1-P),U=Math.min(1,Math.max(0,(.6-.28)/.72))*I,R=U*U*(3-2*U);u.current?.forEach((e,a)=>{if(!e)return;i.v.set(1,(1.5-a)*.92*(1-R)+.34+.85,f(.6)).project(l);let n=(.5*i.v.x+.5)*t.size.width,r=(-(.5*i.v.y)+.5)*t.size.height;e.style.transform=`translate3d(${n.toFixed(1)}px, ${r.toFixed(1)}px, 0)`,e.style.opacity=String(Math.min(1,1.4*I)*(0===a?1:1-.2*F)),e.dataset.dead=a>0&&F>.5?"true":"false"})}),(0,t.jsxs)("group",{position:[0,.85,0],children:[(0,t.jsx)("lineSegments",{ref:y,geometry:w,material:b,frustumCulled:!1}),(0,t.jsxs)("mesh",{ref:C,position:[6.84,0,f(.965)],children:[(0,t.jsx)("sphereGeometry",{args:[.11,24,24]}),(0,t.jsx)("meshBasicMaterial",{color:[3.2,3.6,3.8],transparent:!0,opacity:0,toneMapped:!1})]})]})}e.s(["BEATS",0,p,"CHANNELS",0,s,"default",0,function({progress:e,reduced:a,lite:n,labels:o,shot:i,active:s,onReady:f}){return(0,t.jsxs)(r.f,{className:"field-canvas",frameloop:s?"always":"never",dpr:n?[1,1.5]:[1,1.75],gl:{antialias:!n,alpha:!1,powerPreference:"high-performance"},camera:{fov:36,near:.1,far:60,position:[0,.35,7.6]},onCreated:({gl:e})=>{e.setClearColor("#05070a",1),requestAnimationFrame(()=>f?.())},"aria-hidden":"true",children:[(0,t.jsx)(h,{progress:e,reduced:a,lite:n,labels:o,shot:i}),(0,t.jsxs)(l.g,{multisampling:4*!n,children:[(0,t.jsx)(l.w,{mipmapBlur:!0,intensity:n?.8:1.05,luminanceThreshold:.08,luminanceSmoothing:.3,radius:.72}),(0,t.jsx)(u.f,{reduced:a})]})]})}])},90874,e=>{var t=e.i(61949);e.s(["f",()=>t.D])}],61964,function(e){e.n(e.i(96579))}]);