(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,[2966,e=>{var t=e.i(43476),a=e.i(71645),n=e.i(90072),r=e.i(75056),s=e.i(95393),i=e.i(90874),o=e.i(79877),l=e.i(25564),c=e.i(91883);let u=["#62e3ff","#4fe39a","#ffc44f","#ff6f91"],f=[2.356,.785,3.927,5.498],h=[[.1,"l1"],[.33,"l2"],[.7,"title"]],p=["play","l1","l2","title","done"],d={start:24,end:-312,node:-60,audit:-100,stream:-158,bloch:-208,rings:-238,ringGap:7,close:-304},m=e=>[1.4*Math.sin(.031*e),.7*Math.cos(.023*e)-.1],x=(e,t,a)=>{let n=Math.min(1,Math.max(0,(a-e)/(t-e)));return n*n*(3-2*n)},v=(e,t,a)=>Math.min(1,Math.max(0,(t-e)/(t-a))),g=`
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
    float z = mix(${d.start.toFixed(1)}, ${d.end.toFixed(1)}, aU);
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
`,M=`
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vColor * vAlpha, vAlpha);
    #include <colorspace_fragment>
  }
`;function y({camTarget:e,intro:r,introOn:o,onIntroEnd:w,onReady:A,reduced:b,lite:j,labels:E,flash:I}){let R=(0,i.f)(e=>e.gl),P=(0,a.useMemo)(()=>(function(e,t){let a=4*e*t,r=new Float32Array(a),s=new Float32Array(a),i=new Float32Array(a),o=new Float32Array(a),l=new Uint32Array(4*e*(t-1)*2),c=0,u=0;for(let a=0;a<4;a++)for(let n=0;n<e;n++){let f=1===e?0:n/(e-1)*2-1,h=(97*a+31*n)%101/101;for(let e=0;e<t;e++)r[c]=e/(t-1),s[c]=f,i[c]=a,o[c]=h,e>0&&(l[u++]=c-1,l[u++]=c),c++}let f=new n.ld;return f.setAttribute("position",new n.f5(new Float32Array(3*a),3)),f.setAttribute("aU",new n.f5(r,1)),f.setAttribute("aLine",new n.f5(s,1)),f.setAttribute("aCh",new n.f5(i,1)),f.setAttribute("aSeed",new n.f5(o,1)),f.setIndex(new n.f5(l,1)),f.boundingSphere=new n.L0(new n.cE,400),f})(j?6:10,j?1500:2600),[j]),S=(0,a.useMemo)(()=>new n.Zg({vertexShader:g,fragmentShader:M,transparent:!0,depthWrite:!1,depthTest:!1,blending:n.tq,uniforms:{uTime:{value:6},uIntro:{value:0},uLens:{value:0},uAspect:{value:1},uPulse:{value:0},uSplit:{value:1},uBeat:{value:0},uBeatAmp:{value:0},uReveal:{value:999},uPointer:{value:new n.wq},uColors:{value:u.map(e=>new n.Es(e))},uDead:{value:new n.Es("#3b454e")}}}),[]);(0,a.useEffect)(()=>()=>P.dispose(),[P]),(0,a.useEffect)(()=>()=>S.dispose(),[S]);let T=(0,a.useRef)(null),z=(0,a.useRef)(null),C=(0,a.useRef)(0),L=(0,a.useRef)(0),O=(0,a.useRef)(0),N=(0,a.useRef)({z:d.start,v:new n.cE,look:new n.cE,lens:{x:0,y:.2},rig:new n.zm,frames:0,lastIo:0,lastDn:1,qa:new n.as,qb:new n.as,side:new n.cE(-13,.4,-19),sideLook:new n.cE(0,0,-19)}),B=(0,a.useRef)({x:0,y:0,last:-1e9,inside:!1});(0,a.useEffect)(()=>{let e=R.domElement;function t(t){let a=e.getBoundingClientRect();B.current.inside=t.clientY>=a.top&&t.clientY<=a.bottom,B.current.x=(t.clientX-a.left)/a.width*2-1,B.current.y=-((t.clientY-a.top)/a.height*2-1),B.current.last=performance.now()}return window.addEventListener("pointermove",t,{passive:!0}),()=>window.removeEventListener("pointermove",t)},[R]),(0,s.f)((t,a)=>{let n=T.current?.material;if(!n)return;let s=n.uniforms,i=N.current,l=t.camera,c=Math.min(a,.05),u=t.clock.elapsedTime;if(i.frames<3&&2==++i.frames&&A?.(),o.current&&i.frames>=2){let e=Math.min(1,(r.current??0)+Math.min(a,.1)/7.6);r.current=e;let t=document.documentElement;for(let[a,n]of h)e>=a&&p.indexOf(t.getAttribute("data-intro")??"")<p.indexOf(n)&&t.setAttribute("data-intro",n);e>=1&&w?.()}let g=r.current??1,M=t.size.width/t.size.height;s.uAspect.value=M;let y=M<.8?72:50;l.fov!==y&&(l.fov=y,l.updateProjectionMatrix()),b||(s.uTime.value=(s.uTime.value+c)%600),s.uIntro.value=g;let j=e=>e*e*(3-2*e),R=(e,t)=>Math.min(1,Math.max(0,(g-e)/(t-e))),P=b||g>=1;s.uReveal.value=P?999:g<.12?-34+28*j(R(0,.12)):-6+66*j(R(.12,.5)),s.uBeat.value=R(.12,.36),s.uBeatAmp.value=P?0:Math.sin(Math.PI*R(.12,.36)),s.uSplit.value=P?1:j(R(.34,.6)),s.uPulse.value=P?0:.45*Math.exp(-(((g-.25)/.03)**2));let S=P?1:j(R(.44,.86)),F=e.current??d.start;i.z+=(F-i.z)*(b?1:1-Math.exp(-(4*c)));let q=i.z,[D,k]=m(q),U=B.current.inside&&performance.now()-B.current.last<2600&&!b,$=U?B.current.x:0,H=U?B.current.y:0;i.v.set(.85*D+.35*$,k+.25+.2*H,q);let[G,V]=m(q-10);i.look.set(G,V-.05,q-10),S<1?(i.rig.position.copy(i.side),i.rig.lookAt(i.sideLook),i.qa.copy(i.rig.quaternion),i.rig.position.copy(i.v),i.rig.lookAt(i.look),i.qb.copy(i.rig.quaternion),l.position.lerpVectors(i.side,i.v,S),l.position.x-=4*Math.sin(Math.PI*S),l.position.y+=1.2*Math.sin(Math.PI*S),l.quaternion.slerpQuaternions(i.qa,i.qb,S)):(l.position.lerp(i.v,b?1:1-Math.exp(-(6*c))),l.lookAt(i.look));let _=0;U?(i.lens.x=B.current.x,i.lens.y=B.current.y,_=1):b||(i.lens.x=.6*Math.sin(.23*u),i.lens.y=.35*Math.sin(.37*u+1.2),_=.8*g);let Q=s.uPointer.value,W=U?1-Math.exp(-(14*c)):1-Math.exp(-(2*c));Q.x+=(i.lens.x-Q.x)*W,Q.y+=(i.lens.y-Q.y)*W,s.uLens.value+=(_-s.uLens.value)*(1-Math.exp(-(3*c))),C.current=v(l.position.z,-64,-94),L.current=v(l.position.z,-128,-168),O.current=v(l.position.z,-178,-214);let K=l.position.z-d.node;i.lastIo<.25&&g>=.25&&g<1&&window.dispatchEvent(new Event("site:beat")),i.lastDn>0&&K<=0&&window.dispatchEvent(new Event("site:pass")),i.lastIo=g,i.lastDn=K,z.current&&(z.current.material.opacity=Math.min(1,Math.max(0,1-Math.abs(K)/40))*g,z.current.scale.setScalar(1+(b?0:.08*Math.sin(2.4*u)))),I.current?.style.setProperty("opacity",String(b?0:.85*Math.exp(-((K/1.8)**2))));let Y=P?v(l.position.z,6,-6)*(1-v(l.position.z,-40,-50)):0,Z=2.5*(1-.985*((1-x(-60,-26,-32))*x(-78,-60,-32)))*(1-.96*(1-x(-306,-272,-32))),[X,J]=m(-32);E.current?.forEach((e,a)=>{if(!e)return;let n=f[a];i.v.set(X+Math.cos(n)*(Z+.55),J+Math.sin(n)*(Z+.55),-32).project(l);let r=(.5*i.v.x+.5)*t.size.width,s=(-(.5*i.v.y)+.5)*t.size.height;e.style.transform=`translate3d(${r.toFixed(1)}px, ${s.toFixed(1)}px, 0)`,e.style.opacity=String(i.v.z<1?Y:0),e.dataset.dead=a>0?"true":"false"})});let F=m(d.node),q=e=>{let[t,a]=m(e);return[t,a,e]};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("fog",{attach:"fog",args:["#05070a",14,62]}),(0,t.jsx)("lineSegments",{ref:T,geometry:P,material:S,frustumCulled:!1}),(0,t.jsxs)("mesh",{ref:z,position:[F[0],F[1],d.node],children:[(0,t.jsx)("sphereGeometry",{args:[.22,32,32]}),(0,t.jsx)("meshBasicMaterial",{color:[3.4,3.8,4],transparent:!0,opacity:0,toneMapped:!1,fog:!1})]}),(0,t.jsx)(c.T,{phase:C,position:q(d.audit)}),(0,t.jsx)(c.e,{phase:L,position:q(d.stream),lite:j}),(0,t.jsx)(c.W,{phase:O,position:q(d.bloch)}),(0,t.jsx)(c.t,{names:l.M,at:e=>q(d.rings-e*d.ringGap)}),(0,t.jsx)(c._,{position:q(d.close)})]})}e.s(["INTRO_S",0,7.6,"Z",0,d,"default",0,function(e){let{lite:a,active:n}=e;return(0,t.jsxs)(r.f,{className:"world-canvas",frameloop:n?"always":"never",dpr:a?[1,1.5]:[1,1.75],gl:{antialias:!a,alpha:!1,powerPreference:"high-performance"},camera:{fov:50,near:.1,far:140,position:[-13,.4,-19]},onCreated:({gl:e})=>e.setClearColor("#05070a",1),"aria-hidden":"true",children:[(0,t.jsx)(y,{...e}),(0,t.jsx)(o.g,{multisampling:4*!a,children:(0,t.jsx)(o.w,{mipmapBlur:!0,intensity:a?.8:1.05,luminanceThreshold:.08,luminanceSmoothing:.3,radius:.72})})]})}])},91883,e=>{var t=e.i(43476),a=e.i(71645),n=e.i(90072),r=e.i(95393),s=e.i(876),i=e.i(34510);let o=(e,t,a)=>Math.min(1,Math.max(0,(e-t)/(a-t))),l=e=>e*e*(3-2*e);function c({text:e,height:r,position:s,opts:i,matRef:o,anchor:l="center"}){let u=function(e,{px:t=160,weight:r=800,color:s="#e7edf0",stretch:i="expanded"}={}){let[o,l]=(0,a.useState)(null);return(0,a.useEffect)(()=>{let a=!0,o=null;return(async()=>{try{await document.fonts.load(`${r} ${t}px "Mona Sans"`)}catch{}if(!a)return;let c=document.createElement("canvas"),u=c.getContext("2d"),f=`${r} ${t}px "Mona Sans", Arial, sans-serif`;u.font=f,u.fontStretch=i;let h=Math.ceil(u.measureText(e).width+.3*t),p=Math.ceil(1.3*t);c.width=h,c.height=p,u.font=f,u.fontStretch=i,u.fillStyle=s,u.textBaseline="middle",u.fillText(e,.15*t,p/2),(o=new n.Nk(c)).colorSpace=n.nj,o.anisotropy=4,l({map:o,aspect:h/p})})(),()=>{a=!1,o?.dispose()}},[e,t,r,s,i]),o}(e,i);if(!u)return null;let f=r*u.aspect;return(0,t.jsxs)("mesh",{position:[s[0]+("left"===l?f/2:0),s[1],s[2]],children:[(0,t.jsx)("planeGeometry",{args:[f,r]}),(0,t.jsx)("meshBasicMaterial",{ref:o,map:u.map,transparent:!0,depthWrite:!1,toneMapped:!1})]})}let u=`
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
`;e.s(["T",0,function({phase:e,position:i=[0,0,0]}){let u=(0,s.f)("A4"),f=(0,s.f)("A7"),h=(0,s.f)("A10"),p=(0,a.useRef)(null),d=(0,a.useRef)(null),m=(0,a.useRef)(null),x=(0,a.useRef)(null),v=(0,a.useRef)(null),g=(0,a.useRef)(null),M=(0,a.useRef)(null),y=(0,a.useMemo)(()=>new n.Es("#7f8c95"),[]),w=(0,a.useMemo)(()=>new n.Es("#e7edf0"),[]);return(0,r.f)(()=>{let t=e.current??0,a=l(o(t,.22,.4)),n=l(o(t,.42,.62)),r=l(o(t,.62,.82));g.current&&(g.current.scale.x=Math.max(1e-4,a),g.current.visible=r<.98),p.current&&(p.current.color.copy(w).lerp(y,a),p.current.opacity=1-.8*r),M.current&&(M.current.position.y=-3.6+2.2*n),d.current&&(d.current.opacity=.06*n),m.current&&(m.current.opacity=n),x.current&&(x.current.opacity=r),v.current&&(v.current.opacity=.9*r)}),(0,t.jsxs)("group",{position:i,children:[(0,t.jsx)(c,{text:u.display,height:2.1,position:[0,.9,0],matRef:p}),(0,t.jsx)("group",{ref:g,position:[-4.4,.85,.02],scale:[1e-4,1,1],children:(0,t.jsxs)("mesh",{position:[4.4,0,0],children:[(0,t.jsx)("planeGeometry",{args:[8.8,.17]}),(0,t.jsx)("meshBasicMaterial",{color:[2.4,.5,.42],toneMapped:!1})]})}),(0,t.jsxs)("group",{ref:M,position:[0,-3.6,0],children:[(0,t.jsxs)("mesh",{rotation:[-Math.PI/2,0,0],children:[(0,t.jsx)("planeGeometry",{args:[16,10]}),(0,t.jsx)("meshBasicMaterial",{ref:d,color:"#ffc44f",transparent:!0,opacity:0,depthWrite:!1,side:n.Vs})]}),(0,t.jsx)(c,{text:`Recording length alone: AUC ${f.display}`,height:.42,position:[0,.32,1.5],opts:{px:96,weight:650,color:"#ffc44f",stretch:"normal"},matRef:m})]}),(0,t.jsx)(c,{text:h.display,height:1.5,position:[.4,2.9,-7],opts:{color:"#62e3ff"},matRef:x}),(0,t.jsx)(c,{text:`AUC ${h.interval?.text??""}, subject-independent`,height:.34,position:[.4,1.85,-7],opts:{px:96,weight:600,color:"#e7edf0",stretch:"normal"},matRef:v})]})},"W",0,function({phase:e,position:s=[0,0,0]}){let i=(0,a.useRef)(null),u=(0,a.useRef)(null),f=(0,a.useRef)(null),h=(0,a.useMemo)(()=>{let e=[];for(let t=0;t<6;t++){let a=t/6*Math.PI;for(let t=0;t<96;t++){let r=t/96*Math.PI*2,s=(t+1)/96*Math.PI*2;e.push(new n.cE(Math.cos(a)*Math.sin(r)*2.3,2.3*Math.cos(r),Math.sin(a)*Math.sin(r)*2.3),new n.cE(Math.cos(a)*Math.sin(s)*2.3,2.3*Math.cos(s),Math.sin(a)*Math.sin(s)*2.3))}}for(let t of[-.6,-.3,0,.3,.6]){let a=2.3*Math.sin(t*Math.PI*.5),r=2.3*Math.cos(t*Math.PI*.5);for(let t=0;t<96;t++){let s=t/96*Math.PI*2,i=(t+1)/96*Math.PI*2;e.push(new n.cE(Math.cos(s)*r,a,Math.sin(s)*r),new n.cE(Math.cos(i)*r,a,Math.sin(i)*r))}}return new n.ld().setFromPoints(e)},[]),p=(0,a.useRef)(null);return(0,a.useEffect)(()=>()=>h.dispose(),[h]),(0,r.f)(t=>{let a=l(o(e.current??0,.05,.4)),n=t.clock.elapsedTime;i.current&&(i.current.rotation.y=.12*n),u.current&&(u.current.rotation.set(0,.9*n,.6+.35*Math.sin(.5*n)),u.current.scale.setScalar(Math.max(.001,a))),p.current&&(p.current.opacity=.35*a),f.current&&(f.current.opacity=a)}),(0,t.jsxs)("group",{position:s,children:[(0,t.jsxs)("group",{ref:i,children:[(0,t.jsx)("lineSegments",{geometry:h,children:(0,t.jsx)("lineBasicMaterial",{ref:p,color:"#4fe39a",transparent:!0,opacity:0})}),(0,t.jsxs)("group",{ref:u,children:[(0,t.jsxs)("mesh",{position:[0,1.15,0],children:[(0,t.jsx)("cylinderGeometry",{args:[.03,.03,2.3,8]}),(0,t.jsx)("meshBasicMaterial",{color:[.9,3.2,1.8],toneMapped:!1})]}),(0,t.jsxs)("mesh",{position:[0,2.3,0],children:[(0,t.jsx)("sphereGeometry",{args:[.12,16,16]}),(0,t.jsx)("meshBasicMaterial",{color:[1.2,3.6,2.2],toneMapped:!1})]})]})]}),(0,t.jsx)(c,{text:"Exploratory. No quantum advantage claimed.",height:.36,position:[0,-3,0],opts:{px:96,weight:600,color:"#4fe39a",stretch:"normal"},matRef:f})]})},"_",0,function({position:e}){return(0,t.jsx)("group",{position:e,children:["#62e3ff","#4fe39a","#ffc44f","#ff6f91"].map((e,a)=>(0,t.jsxs)("mesh",{rotation:[0,0,a*Math.PI/2],children:[(0,t.jsx)("torusGeometry",{args:[1.6,.07,12,64,Math.PI/2-.06]}),(0,t.jsx)("meshBasicMaterial",{color:new n.Es(e).multiplyScalar(1.6),toneMapped:!1})]},e))})},"t",0,function({names:e,at:a}){return(0,t.jsx)("group",{children:e.map((e,n)=>(0,t.jsxs)("group",{position:a(n),children:[(0,t.jsxs)("mesh",{children:[(0,t.jsx)("torusGeometry",{args:[3.4,.022,8,160]}),(0,t.jsx)("meshBasicMaterial",{color:[.38,1.2,1.45],toneMapped:!1,transparent:!0,opacity:.75})]}),(0,t.jsx)(c,{text:`${n+1}  ${e.charAt(0)+e.slice(1).toLowerCase()}`,height:.42,position:[0,3.9,0],opts:{px:96,weight:700,color:"#e7edf0",stretch:"semi-expanded"}})]},e))})},"e",0,function({phase:e,flood:s,position:h=[0,0,0],lite:p=!1}){let d=(0,a.useRef)(null),m=(0,a.useRef)(null),x=(0,a.useRef)(null),v=(0,a.useMemo)(()=>{let e=p?900:2200,t=new Float32Array(3*e),a=new Float32Array(e),r=new Float32Array(e),s=(0,i.a)(7);for(let n=0;n<e;n++){let e=Math.floor(9*s());t[3*n]=18*s()-9,t[3*n+1]=(e-4)*.34+(s()-.5)*.12,t[3*n+2]=(s()-.5)*2.4,a[n]=s(),r[n]=+(.008>s())}let o=new n.ld;return o.setAttribute("position",new n.f5(t,3)),o.setAttribute("aSeed",new n.f5(a,1)),o.setAttribute("aRare",new n.f5(r,1)),o.boundingSphere=new n.L0(new n.cE,20),o},[p]),g=(0,a.useMemo)(()=>new n.Zg({vertexShader:u,fragmentShader:f,transparent:!0,depthWrite:!1,blending:n.tq,uniforms:{uTime:{value:0},uPhase:{value:0},uFlood:{value:0}}}),[]),M=(0,a.useMemo)(()=>new n.ld().setFromPoints([new n.cE(-9.2,-1.8,0),new n.cE(9.2,-1.8,0),new n.cE(9.2,1.8,0),new n.cE(-9.2,1.8,0),new n.cE(-9.2,-1.8,0)]),[]),y=(0,a.useMemo)(()=>new n.DL(M,new n.rd({color:"#ffc44f",dashSize:.3,gapSize:.22,transparent:!0})),[M]);return(0,a.useEffect)(()=>(y.computeLineDistances(),m.current=y.material,()=>{v.dispose(),g.dispose(),M.dispose(),y.material.dispose()}),[v,g,M,y]),(0,r.f)(t=>{let a=l(o(e.current??0,.05,.35)),n=d.current?.material;n&&(n.uniforms.uTime.value=t.clock.elapsedTime,n.uniforms.uPhase.value=a,n.uniforms.uFlood.value=s?.current??0),m.current&&(m.current.opacity=.8*a),x.current&&(x.current.opacity=a)}),(0,t.jsxs)("group",{position:h,children:[(0,t.jsx)("points",{ref:d,geometry:v,material:g,frustumCulled:!1}),(0,t.jsx)("primitive",{object:y}),(0,t.jsx)(c,{text:"Synthetic data",height:.4,position:[-9.2,2.25,0],anchor:"left",opts:{px:96,weight:700,color:"#ffc44f",stretch:"normal"},matRef:x})]})}])},25564,e=>{e.s(["M",0,["QUESTION","BASELINE","CONTROL","ABLATION","CONFOUND CHECK","VALIDATION","REPORT"],"g",0,[{case:"01 Seizure",caseHref:"/cases/seizure-detection",cells:{QUESTION:{text:"Do the extra signals help?",href:"/cases/seizure-detection#question"},BASELINE:{text:"Baselines released with the dataset.",href:"/cases/seizure-detection#result"},ABLATION:{text:"A stage-by-stage ladder. Two failures kept.",href:"/cases/seizure-detection#change"},"CONFOUND CHECK":{text:"Window coverage. Inert fusion.",href:"/cases/seizure-detection#investigation"},VALIDATION:{text:"Patient-independent split, with an interval.",href:"/cases/seizure-detection#result"},REPORT:{text:"Alarm rate printed beside sensitivity.",href:"/cases/seizure-detection#meaning"}}},{case:"02 ADHD",caseHref:"/cases/adhd-eeg",cells:{QUESTION:{text:"Is the accuracy trustworthy?",href:"/cases/adhd-eeg#question"},BASELINE:{text:"Majority class. Recording length alone.",href:"/cases/adhd-eeg#investigation"},CONTROL:{text:"A shuffled control and a fixed bar for every idea.",href:"/cases/adhd-eeg#investigation"},ABLATION:{text:"Dozens of additions rejected.",href:"/cases/adhd-eeg#investigation"},"CONFOUND CHECK":{text:"50 Hz line. Recording length. Exclusion bias.",href:"/cases/adhd-eeg#investigation"},VALIDATION:{text:"Subject-independent, 5 folds, 10 seeds.",href:"/cases/adhd-eeg#result"},REPORT:{text:"Earlier headline set aside, with the gap.",href:"/cases/adhd-eeg#failure"}}},{case:"03 Finance",caseHref:"/cases/synthetic-finance",cells:{QUESTION:{text:"Is the signal real or a shortcut?",href:"/cases/synthetic-finance#question"},BASELINE:{text:"An always-positive floor.",href:"/cases/synthetic-finance#problem"},CONTROL:{text:"A permutation control and an adversarial harness.",href:"/cases/synthetic-finance#investigation"},ABLATION:{text:"Four method families behind one API.",href:"/cases/synthetic-finance#investigation"},"CONFOUND CHECK":{text:"A single-feature ceiling.",href:"/cases/synthetic-finance#investigation"},VALIDATION:{text:"Split by user, not by row.",href:"/cases/synthetic-finance#result"},REPORT:{text:"Labelled synthetic wherever it appears.",href:"/cases/synthetic-finance#result"}}},{case:"04 QHH",caseHref:"/cases/qhh",cells:{QUESTION:{text:"Can phase survive the circuit?",href:"/cases/qhh#question"},VALIDATION:{text:"Subject-wise on a public dataset.",href:"/cases/qhh#investigation"},REPORT:{text:"Labelled exploratory. Nothing claimed.",href:"/cases/qhh#result"}}}]])},34510,e=>{function t(e){let t=0x85ebca6b^Math.imul(0|e,0x9e3779b1);return t=Math.imul((t=Math.imul(t^t>>>15,0x2c1b3c6d))^t>>>12,0x297a2d39),((t^=t>>>15)>>>0)%1e5/1e5}function a(e,a){let n=Math.floor(e),r=e-n,s=2*t(31*n+a)-1;return s+(2*t((n+1)*31+a)-1-s)*(r*r*(3-2*r))}function n(e,t,a){let n=(e-t)/a;return Math.exp(-.5*n*n)}let r={brain:function(e){return .34*Math.sin(2*Math.PI*9.3*e+.4)*(.6+.4*Math.sin(2*Math.PI*.37*e))+.22*Math.sin(2*Math.PI*4.1*e+1.9)+.18*Math.sin(2*Math.PI*17.7*e+.2)+.3*a(22*e,11)},heart:function(e){let t=(e%.92+.92)%.92/.92;return n(t,.3,.012)-.18*n(t,.275,.01)-.2*n(t,.325,.01)+.24*n(t,.52,.045)+.03*a(30*e,5)},muscle:function(e){return Math.max(0,1.2*a(1.6*e,3)-.25)*a(140*e,17)*1.1+.03*a(60*e,2)},move:function(e){return .5*Math.sin(2*Math.PI*.21*e+.7)+.25*Math.sin(2*Math.PI*.53*e+2.1)+.2*a(2.2*e,9)}};e.s(["H",0,[{key:"brain",label:"BRAIN",sub:"EEG"},{key:"heart",label:"HEART",sub:"ECG"},{key:"muscle",label:"MUSCLE",sub:"EMG"},{key:"move",label:"MOVEMENT",sub:"ACC"}],"a",0,function(e){let t=e>>>0;return()=>{let e=t=t+0x6d2b79f5>>>0;return e=Math.imul(e^e>>>15,1|e),(((e^=e+Math.imul(e^e>>>7,61|e))^e>>>14)>>>0)/0x100000000}},"e",0,function(e){return Math.sqrt(-2*Math.log(Math.max(e(),1e-9)))*Math.cos(2*Math.PI*e())},"P",0,function(e,t,a,n,s,i=360){let o=r[e],l="";for(let e=0;e<=i;e++){let r=e/i*n,c=s/2-o(t+e/i*a)*(.42*s);l+=`${0===e?"M":"L"}${r.toFixed(1)} ${c.toFixed(1)}`}return l}])},90874,e=>{var t=e.i(61949);e.s(["f",()=>t.D])}],43785,function(e){e.n(e.i(2966))}]);