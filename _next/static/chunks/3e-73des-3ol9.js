(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,74495,e=>{"use strict";var t=e.i(90072),o=e.i(8560);let a=new t.cE(.22,.14,.08),l=new t.cE(66,0,0),r=new t.cE(66,0,-30),i=new t.cE(6.5,-4,1.5),n={intro:{pos:[0,.2,4.8],look:[0,0,0],fx:.5,fy:.46,show:{brain:1,paths:.4},turn:!0},hero:{pos:[0,.35,4.3],look:[0,0,0],fx:.74,fy:.5,show:{brain:1,paths:.6},turn:!0},"ch-seizure":{pos:[a.x+.06,a.y+.03,a.z+.42],look:[a.x,a.y,a.z],via:[.35,.3,1.5],fx:.5,fy:.5,show:{brain:.1,paths:.15,neurons:1},sync:1,dur:2.2},live:{pos:[0,-3.2,20],look:[0,-3.6,0],via:[.4,.2,6],fx:.56,fy:.5,show:{brain:1,paths:.4,body:1,sensors:1},dur:2.2},dead:{pos:[-.9,-3.2,19.5],look:[0,-3.6,0],fx:.56,fy:.5,show:{brain:1,paths:.3,body:1,sensors:1},dead:1},keyhole:{pos:[.5,-.8,10],look:[0,-1.2,0],fx:.36,fy:.5,show:{brain:1,paths:.3,body:.8,sensors:.35,ring:1},dead:1},rebuilt:{pos:[0,-4.5,26],look:[0,-5,0],fx:.5,fy:.5,show:{brain:.6,paths:.3,body:.2}},audit:{pos:[0,5.8,.8],look:[0,0,0],via:[0,4,12],fx:.52,fy:.5,show:{brain:.75,paths:.3,electrodes:1,body:.05},dur:2.2},bars:{pos:[0,4.9,.8],look:[0,0,0],fx:.78,fy:.52,show:{brain:.3,electrodes:.3}},finance:{pos:[l.x,.35,7.4],look:[l.x,0,0],via:[30,.4,1.2],fx:.66,fy:.7,show:{ledger:1,stream:.8},dur:2.2},qhh:{pos:[r.x+.4,.5,r.z+5],look:[r.x,0,r.z],via:[l.x+1.6,.6,-12],fx:.68,fy:.5,show:{bloch:1,helix:1},dur:2.2},offclock:{pos:[-4.1,1.6,3.6],look:[0,0,0],fx:.62,fy:.5,show:{brain:.85,paths:.3,regions:1},dur:1.8},method:{pos:[0,.3,9.5],look:[0,-.1,0],via:[33,1.2,9],fx:.5,fy:.44,show:{brain:.5,paths:.45,stream:.6},turn:!0,dur:2.2}},u={};for(let e of Object.keys(n))u[e]=[.5,"hero"===e?.16:"method"===e?.4:e.startsWith("ch-")?.38:"audit"===e||"bars"===e?.5:"live"===e||"dead"===e?.32:"keyhole"===e?.36:.3];let s={hero:[0,.35,6.5],intro:[0,.2,6.2],live:[0,-2.6,27],dead:[-5.5,-2.6,26],keyhole:[.5,-.8,13],finance:[66.3,.8,16],qhh:[66.9,.9,-21.5],offclock:[-5.6,2.1,4.9]},d=`
attribute float aConv;
varying vec3 vN;
varying vec3 vV;
varying float vConv;
varying vec3 vW;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = -mv.xyz;
  vConv = aConv;
  vW = position;
  gl_Position = projectionMatrix * mv;
}`,v=`
uniform vec3 uDeep, uRose, uGold;
uniform float uAlpha, uTime, uIntro, uSide;
varying vec3 vN;
varying vec3 vV;
varying float vConv;
varying vec3 vW;
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vV);
  float fres = pow(1.0 - abs(dot(n, v)), 3.2);
  float crown = smoothstep(0.35, 0.95, vConv);
  vec3 col = mix(uDeep, uRose, crown * 0.35);
  vec3 L = normalize(vec3(-0.4, 0.8, 0.5));
  float spec = pow(max(dot(n, normalize(L + v)), 0.0), 48.0);
  // a band of light sweeping front to back
  float sweep = smoothstep(0.18, 0.0, abs(fract(uTime * 0.07) * 3.2 - 1.6 - vW.z));
  vec3 rim = mix(uRose, uGold, 0.55);
  col += rim * fres * 0.85 + uGold * sweep * crown * 0.15 + vec3(1.0, 0.95, 0.9) * spec * 0.5;
  float a = (0.045 + crown * 0.085 + fres * 0.62 + spec * 0.25 + sweep * crown * 0.1) * uAlpha * uIntro * uSide;
  gl_FragColor = vec4(col, a);
}`,c=`
attribute vec3 aStart;
attribute float aRand;
uniform float uTime, uIntro, uSize, uAlpha, uMin;
varying float vA;
void main() {
  float k = clamp(uIntro * 1.5 - aRand * 0.5, 0.0, 1.0);
  k = 1.0 - pow(1.0 - k, 3.0);
  vec3 p = mix(aStart, position, k);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float fire = pow(max(0.0, sin(uTime * 0.8 + aRand * 91.0)), 40.0);
  vA = uAlpha * (0.35 + 0.65 * fire + 0.2 * sin(uTime * 1.3 + aRand * 30.0));
  gl_PointSize = mv.z > -0.02 ? 0.0 : max(uMin, min(uSize * (1.0 + fire * 1.5) / -mv.z, 26.0));
}`,h=`
uniform vec3 uColor;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float core = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor, core * core * vA);
}`,p=`
attribute float aT;
attribute float aId;
uniform float uTime, uSpeed, uSync, uBase;
varying float vS;
void main() {
  float phase = mix(aId, 0.0, uSync);
  float burst = mix(1.0, 0.25 + 0.75 * pow(max(0.0, sin(uTime * 1.6)), 6.0), uSync);
  float s = smoothstep(0.05, 0.0, abs(fract(uTime * uSpeed + phase) - aT));
  vS = uBase + s * burst;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,f=`
uniform vec3 uColor, uHot;
uniform float uAlpha;
varying float vS;
void main() { gl_FragColor = vec4(mix(uColor, uHot, clamp(vS, 0.0, 1.0)), clamp(vS, 0.0, 1.0) * uAlpha); }`,m=`
attribute float aT;
uniform vec3 uA, uB, uC;
uniform float uTime, uAmp, uKind, uSize;
varying float vA;
float beat(float x){ float ph = fract(x); return exp(-pow((ph-0.3)/0.03,2.0)) - 0.25*exp(-pow((ph-0.37)/0.03,2.0)) + 0.2*exp(-pow((ph-0.56)/0.06,2.0)); }
void main() {
  float t = aT;
  vec3 p = mix(mix(uA, uB, t), mix(uB, uC, t), t);
  vec3 tan = normalize(mix(uB - uA, uC - uB, t));
  vec3 nrm = normalize(cross(tan, vec3(0.0, 0.0, 1.0)));
  float x = t * 8.0 - uTime * 1.3;
  float w;
  if (uKind < 0.5) w = sin(x * 9.0) * 0.5 + sin(x * 21.0) * 0.3 + sin(x * 3.0) * 0.3;
  else if (uKind < 1.5) w = beat(x * 0.55) * 1.4 - 0.3;
  else if (uKind < 2.5) w = sin(x * 26.0) * sin(x * 2.7) * (0.5 + 0.5 * sin(x * 0.8));
  else w = 0.6 * sin(x * 1.3) + 0.3 * sin(x * 3.7);
  p += nrm * w * uAmp * sin(3.14159 * t);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.94, t);
  gl_PointSize = max(1.5, uSize / -mv.z);
}`,w=`
uniform vec3 uColor;
uniform float uAlpha;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vA * uAlpha);
}`,y=`
attribute float aRand;
uniform float uTime, uSize, uAlpha, uX0, uLen;
varying float vA;
void main() {
  vec3 p = position;
  p.x = uX0 + mod(p.x - uX0 + uTime * (3.0 + aRand * 4.0), uLen);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = uAlpha * (0.6 + 0.6 * aRand) * smoothstep(0.0, 3.0, p.x - uX0) * smoothstep(0.0, 3.0, uX0 + uLen - p.x);
  gl_PointSize = mv.z > -0.02 ? 0.0 : max(1.2, min(uSize / -mv.z, 22.0));
}`,A=`
attribute float aB;
attribute float aRand;
uniform float uTime, uSize, uAlpha, uMin;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = uAlpha * (0.3 + 0.9 * aB) * (0.8 + 0.2 * sin(uTime * 1.4 + aRand * 37.0)) * smoothstep(-70.0, -20.0, mv.z);
  gl_PointSize = mv.z > -0.02 ? 0.0 : max(uMin, min(uSize * (0.6 + 0.6 * aB) / -mv.z, 24.0));
}`,x=`
attribute float aA;
uniform float uHead, uSeen, uAlpha, uSize;
varying float vA;
void main() {
  float lit = step(fract(aA - uHead), uSeen);
  vA = uAlpha * mix(0.14, 1.0, lit);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * mix(0.8, 1.8, lit) / -mv.z;
}`,b=`
attribute vec3 aColor;
attribute float aRand;
uniform float uAlpha, uSize, uTime;
varying float vA;
varying vec3 vC;
void main() {
  vA = uAlpha * (0.75 + 0.25 * sin(uTime * 2.2 + aRand * 20.0));
  vC = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(10.0, uSize / -mv.z);
}`,M=`
varying float vA;
varying vec3 vC;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float core = smoothstep(0.18, 0.0, d);
  float halo = pow(smoothstep(0.5, 0.0, d), 2.0) * 0.6;
  gl_FragColor = vec4(mix(vC, vec3(1.0), core * 0.55), (core + halo) * vA);
}`,g=[[-.31,.95],[.31,.95],[-.81,.59],[-.4,.45],[0,.4],[.4,.45],[.81,.59],[-1,0],[-.5,0],[0,0],[.5,0],[1,0],[-.81,-.59],[-.4,-.45],[0,-.4],[.4,-.45],[.81,-.59],[-.31,-.95],[.31,-.95]];function S(e,o){let a=Math.hypot(e,o),l=92*Math.PI/180*a,r=a?Math.sin(l)*e/a:0,i=a?Math.sin(l)*o/a:0;return new t.cE(.76*r,.72*Math.cos(l)+.03,.94*i)}e.s(["createBrain",0,function(e,z){var C;let T=new o.T({canvas:e,antialias:!0,alpha:!0,powerPreference:"high-performance"});T.setClearColor(0,0);let P=new t.P6,F=new t.zm(34,1,.01,400),E=e=>new t.Es(e),k=(C=1610,()=>{C|=0;let e=Math.imul((C=C+0x6d2b79f5|0)^C>>>15,1|C);return(((e=e+Math.imul(e^e>>>7,61|e)^e)^e>>>14)>>>0)/0x100000000}),I={rose:E(z.colors.rose),ivory:E(z.colors.ivory),gold:E(z.colors.gold),wine:E(z.colors.wine),dead:E(z.colors.dead),lilac:E(z.colors.lilac)},R=(e,o,a)=>new t.Zg({uniforms:e,vertexShader:o,fragmentShader:a,transparent:!0,depthWrite:!1,blending:t.tq}),_={},B=["brain","paths","neurons","body","sensors","ring","electrodes","stream","ledger","helix","bloch","regions"];for(let e of B)_[e]={value:0};let W={value:0},j=new t.ld;j.setAttribute("position",new t.f5(z.shapes.meshPos,3)),j.setAttribute("aConv",new t.f5(Float32Array.from(z.shapes.meshConv,e=>e/255),1)),j.setIndex(new t.f5(z.shapes.meshIdx,1)),j.computeVertexNormals();let V={value:+!z.intro},H={uDeep:{value:I.wine.clone().multiplyScalar(.35)},uRose:{value:I.rose},uGold:{value:I.gold},uAlpha:_.brain,uTime:W,uIntro:V},K=(e,o,a)=>{let l=new t.kE(j,new t.Zg({uniforms:{...H,uSide:{value:o}},vertexShader:d,fragmentShader:v,transparent:!0,depthWrite:!1,side:e}));return l.renderOrder=a,l},q=new t.C9;q.add(K(t.tw,.3,0),K(t.de,1,1)),P.add(q);let O=z.lite?7e3:14e3,X=new t.ld,L=z.shapes.brain.slice(0,3*O),N=new Float32Array(3*O);for(let e=0;e<O;e++){let t=2*k()-1,o=k()*Math.PI*2,a=2.4+1.6*k(),l=Math.sqrt(1-t*t);N.set([a*l*Math.cos(o),a*t,a*l*Math.sin(o)],3*e)}X.setAttribute("position",new t.f5(L,3)),X.setAttribute("aStart",new t.f5(N,3)),X.setAttribute("aRand",new t.f5(Float32Array.from({length:O},()=>k()),1));let D={uTime:W,uIntro:{value:+!z.intro},uSize:{value:9},uAlpha:_.brain,uMin:{value:.8},uColor:{value:I.rose}},G=new t.sy(X,R(D,c,h));G.frustumCulled=!1,q.add(G);let Z=(e,o)=>{let a=[],l=[],r=[];e.forEach((e,t)=>{let o=k();for(let t=0;t+1<e.length;t++)a.push(...e[t].toArray(),...e[t+1].toArray()),l.push(t/(e.length-1),(t+1)/(e.length-1)),r.push(o,o)});let i=new t.ld;return i.setAttribute("position",new t.f5(new Float32Array(a),3)),i.setAttribute("aT",new t.f5(new Float32Array(l),1)),i.setAttribute("aId",new t.f5(new Float32Array(r),1)),new t.a1(i,R(o,p,f))},U=e=>new t.cE().fromArray(z.shapes.brain,e%(z.shapes.brain.length/3)*3),Y=[];for(let e=0;e<(z.lite?20:36);e++){let e=U(Math.floor(24e3*k())).multiplyScalar(.92),t=U(Math.floor(24e3*k())).multiplyScalar(.92),o=e.clone().add(t).multiplyScalar(.5).multiplyScalar(.35),a=[];for(let l=0;l<=24;l++){let r=l/24;a.push(e.clone().lerp(o,r).lerp(o.clone().lerp(t,r),r))}Y.push(a)}let $={uTime:W,uSpeed:{value:.35},uSync:{value:0},uBase:{value:0},uColor:{value:I.rose},uHot:{value:I.gold},uAlpha:_.paths};q.add(Z(Y,$));let J=[],Q=[],ee=z.lite?9:14,et=[];for(let e=0;e<ee;e++)et.push(a.clone().add(new t.cE(k()-.5,k()-.5,k()-.5).multiplyScalar(.34)));let eo=(e,o,a,l,r)=>{let i=[e.clone()],n=o.clone(),u=e.clone();for(let e=0;e<a;e++)n.add(new t.cE(k()-.5,k()-.5,k()-.5).multiplyScalar(.7)).normalize(),u.add(n.clone().multiplyScalar(l)),i.push(u.clone()),r>0&&e===Math.floor(a/2)&&eo(u,n.clone().add(new t.cE(k()-.5,k()-.5,k()-.5)).normalize(),a-e,.8*l,r-1);J.push(i)};et.forEach((e,o)=>{for(let o=0;o<40;o++)Q.push(...e.clone().add(new t.cE(k()-.5,k()-.5,k()-.5).normalize().multiplyScalar(.006+.004*k())).toArray());for(let o=0;o<6;o++)eo(e,new t.cE(k()-.5,k()-.5,k()-.5).normalize(),14,.012,2);let a=et[(o+1+Math.floor(k()*(ee-1)))%ee],l=[],r=e.clone().lerp(a,.5).add(new t.cE(k()-.5,k()-.5,k()-.5).multiplyScalar(.12));for(let t=0;t<=30;t++){let o=t/30;l.push(e.clone().lerp(r,o).lerp(r.clone().lerp(a,o),o))}J.push(l)});let ea={uTime:W,uSpeed:{value:.6},uSync:{value:0},uBase:{value:.3},uColor:{value:I.gold},uHot:{value:I.ivory},uAlpha:_.neurons},el=Z(J,ea);P.add(el);let er=new t.ld;er.setAttribute("position",new t.f5(new Float32Array(Q),3)),er.setAttribute("aStart",new t.f5(new Float32Array(Q),3)),er.setAttribute("aRand",new t.f5(Float32Array.from({length:Q.length/3},()=>k()),1));let ei={uTime:W,uIntro:{value:1},uSize:{value:2},uAlpha:_.neurons,uMin:{value:1},uColor:{value:I.ivory}};P.add(new t.sy(er,R(ei,c,h)));let en=new t.cE(...z.shapes.head),eu=(e,o,a)=>new t.cE(e,o,a).sub(en).multiplyScalar(6.2),es=new t.ld;{let e=new Float32Array(z.shapes.bodyPos.length);for(let t=0;t<e.length;t+=3)e.set(eu(z.shapes.bodyPos[t],z.shapes.bodyPos[t+1],z.shapes.bodyPos[t+2]).toArray(),t);es.setAttribute("position",new t.f5(e,3)),es.setAttribute("aConv",new t.f5(new Float32Array(e.length/3).fill(.5),1)),es.setIndex(new t.f5(z.shapes.bodyIdx,1)),es.computeVertexNormals()}let ed={uDeep:{value:I.wine.clone().multiplyScalar(.25)},uRose:{value:I.rose.clone().lerp(I.ivory,.45)},uGold:{value:I.gold},uAlpha:_.body,uTime:W,uIntro:{value:1}};for(let[e,o,a]of[[t.tw,.25,0],[t.de,.8,1]]){let l=new t.kE(es,new t.Zg({uniforms:{...ed,uSide:{value:o}},vertexShader:d,fragmentShader:v,transparent:!0,depthWrite:!1,side:e}));l.renderOrder=a,P.add(l)}let ev=z.lite?3e3:6e3,ec=new Float32Array(3*ev),eh=new Float32Array(ev);for(let e=0;e<ev;e++){let t=eu(z.shapes.body[3*e],z.shapes.body[3*e+1],z.shapes.body[3*e+2]),o=1.05>t.length();ec.set(o?[1.4*t.x,1.4*t.y,1.4*t.z]:t.toArray(),3*e);let a=Math.hypot(z.shapes.body[3*e],1.6*z.shapes.body[3*e+2]);eh[e]=.2+.8*Math.min(1,Math.max(0,(a-.08)/.3))*(.6+.4*k())}let ep=new t.ld;ep.setAttribute("position",new t.f5(ec,3)),ep.setAttribute("aB",new t.f5(eh,1)),ep.setAttribute("aRand",new t.f5(Float32Array.from({length:ev},()=>k()),1));let ef={uTime:W,uSize:{value:40},uAlpha:_.body,uMin:{value:1},uColor:{value:E("#c9b6b0")}},em=new t.sy(ep,R(ef,A,h));em.frustumCulled=!1,P.add(em);let ew={eeg:eu(.16,1.14,.02),heart:eu(.12,.7,.26),muscle:eu(-.32,.52,0),move:eu(.45,.1,.05)},ey=["eeg","heart","muscle","move"],eA=[E(z.colors.rose),E(z.colors.heart),E(z.colors.muscle),E(z.colors.move)],ex=new t.ld;ex.setAttribute("position",new t.f5(new Float32Array([...ey.flatMap(e=>ew[e].toArray()),...i.toArray()]),3));let eb=new t.f5(new Float32Array([...eA.flatMap(e=>e.toArray()),...I.ivory.toArray()]),3);ex.setAttribute("aColor",eb),ex.setAttribute("aRand",new t.f5(Float32Array.from([.1,.3,.6,.8,.5]),1));let eM={uAlpha:_.sensors,uSize:{value:400},uTime:W};P.add(new t.sy(ex,R(eM,b,M)));let eg=ey.map((e,o)=>{let a=new t.ld;a.setAttribute("position",new t.f5(new Float32Array(1800),3)),a.setAttribute("aT",new t.f5(Float32Array.from({length:600},(e,t)=>t/599),1));let l=ew[e],r={uA:{value:l},uB:{value:new t.cE((l.x+i.x)/2+1,Math.max(l.y,i.y)+1.5,(l.z+i.z)/2+1)},uC:{value:i},uTime:W,uAmp:{value:.45},uKind:{value:o},uSize:{value:40},uColor:{value:eA[o].clone()},uAlpha:{value:0}},n=new t.sy(a,R(r,m,w));return n.frustumCulled=!1,P.add(n),{u:r,live:eA[o]}}),eS=new t.ld,ez=new Float32Array(3e3),eC=new Float32Array(1e3);for(let e=0;e<1e3;e++){let t=e/1e3;ez.set([2.2*Math.cos(t*Math.PI*2),0,2.2*Math.sin(t*Math.PI*2)],3*e),eC[e]=t}eS.setAttribute("position",new t.f5(ez,3)),eS.setAttribute("aA",new t.f5(eC,1));let eT={uHead:{value:0},uSeen:{value:z.seen},uAlpha:_.ring,uSize:{value:40},uColor:{value:I.gold}},eP=new t.sy(eS,new t.Zg({uniforms:eT,vertexShader:x,fragmentShader:h.replace("varying float vA;","varying float vA;"),transparent:!0,depthWrite:!1,blending:t.tq}));eP.position.y=-.2,eP.rotation.x=.25,P.add(eP);let eF=g.map(([e,t])=>S(e,t)),eE=new t.ld;eE.setAttribute("position",new t.f5(new Float32Array(eF.flatMap(e=>e.toArray())),3)),eE.setAttribute("aColor",new t.f5(new Float32Array(eF.flatMap(()=>I.ivory.toArray())),3)),eE.setAttribute("aRand",new t.f5(Float32Array.from(eF,()=>k()),1));let ek={uAlpha:_.electrodes,uSize:{value:70},uTime:W};q.add(new t.sy(eE,R(ek,b,M)));let eI=[];eF.forEach((e,t)=>{eF.map((t,o)=>({j:o,d:e.distanceTo(t)})).filter(e=>e.j>t).sort((e,t)=>e.d-t.d).slice(0,3).forEach(({j:t})=>{let o=eF[t],a=[];for(let t=0;t<=16;t++){let l=t/16;a.push(e.clone().lerp(o,l).multiplyScalar(1+.12*Math.sin(Math.PI*l)*e.distanceTo(o)))}eI.push(a)})});let eR={uTime:W,uSpeed:{value:.4},uSync:{value:0},uBase:{value:.22},uColor:{value:I.rose},uHot:{value:I.gold},uAlpha:_.electrodes};q.add(Z(eI,eR));let e_={voice:new t.cE(-.66,-.08,.3),cars:new t.cE(.32,.62,-.08),cricket:new t.cE(.16,-.06,-.86),house:new t.cE(.02,.26,.84)},eB=["voice","cars","cricket","house"],eW=[E(z.colors.rose),E(z.colors.move),E(z.colors.heart),E(z.colors.muscle)],ej=new t.ld;ej.setAttribute("position",new t.f5(new Float32Array(eB.flatMap(e=>e_[e].toArray())),3)),ej.setAttribute("aColor",new t.f5(new Float32Array(eW.flatMap(e=>e.toArray())),3)),ej.setAttribute("aRand",new t.f5(Float32Array.from([.2,.45,.7,.95]),1));let eV={uAlpha:_.regions,uSize:{value:260},uTime:W};q.add(new t.sy(ej,R(eV,b,M)));let eH=z.lite?7e3:14e3,eK=new Float32Array(3*eH);for(let e=0;e<eH;e++){let t=k()*Math.PI*2,o=.6+1.6*Math.pow(k(),.5);eK.set([9+43*k(),Math.sin(t)*o,Math.cos(t)*o],3*e)}let eq=new t.ld;eq.setAttribute("position",new t.f5(eK,3)),eq.setAttribute("aRand",new t.f5(Float32Array.from({length:eH},()=>k()),1));let eO={uTime:W,uSize:{value:14},uAlpha:_.stream,uX0:{value:9},uLen:{value:43},uColor:{value:I.rose}},eX=new t.sy(eq,R(eO,y,h));eX.frustumCulled=!1,P.add(eX);let eL=[-1.45,-.35,.7,1.65],eN=z.lite?7e3:12e3,eD=new Float32Array(3*eN),eG=new Float32Array(eN);for(let e=0;e<eN;e++)if(.11>k()){let t=eL[e%4],o=t===eL[3],a=Math.pow(k(),.7)*(o?.5:1);eD.set([l.x+t+(k()-.5)*.12*(1-a),-.2+a,(k()-.5)*.3],3*e),eG[e]=(.6+.4*a)*(o?.55:1)}else{let t=5.2*k()-2.6,o=Math.floor(5*k());eD.set([l.x+t,-.24+.06*Math.sin(3.1*t+o)+(k()-.5)*.04+.02*o,(o-2)*.12],3*e),eG[e]=.2+.35*k()}let eZ=new t.ld;eZ.setAttribute("position",new t.f5(eD,3)),eZ.setAttribute("aB",new t.f5(eG,1)),eZ.setAttribute("aRand",new t.f5(Float32Array.from({length:eN},()=>k()),1));let eU={uTime:W,uSize:{value:11},uAlpha:_.ledger,uMin:{value:1},uColor:{value:E(z.colors.heart)}},eY=new t.sy(eZ,R(eU,A,h));eY.frustumCulled=!1,P.add(eY);let e$=z.lite?2500:5e3,eJ=new Float32Array(3*e$),eQ=new Float32Array(e$);for(let e=0;e<e$;e++){let t=e/e$,o=-4+-22*t,a=.55+.35*Math.sin(9*t)*Math.sin(2.3*t),r=t*Math.PI*18;eJ.set([l.x+Math.cos(r)*a+(k()-.5)*.02,Math.sin(r)*a+(k()-.5)*.02,o],3*e),eQ[e]=.5+.5*k()}let e0=new t.ld;e0.setAttribute("position",new t.f5(eJ,3)),e0.setAttribute("aB",new t.f5(eQ,1)),e0.setAttribute("aRand",new t.f5(Float32Array.from({length:e$},()=>k()),1));let e1={uTime:W,uSize:{value:12},uAlpha:_.helix,uMin:{value:1},uColor:{value:I.lilac}},e5=new t.sy(e0,R(e1,A,h));e5.frustumCulled=!1,P.add(e5);let e3=new t.cE().setFromSphericalCoords(1,55*Math.PI/180,35*Math.PI/180),e2=z.lite?5e3:9e3,e4=new Float32Array(3*e2),e6=new Float32Array(e2),e8=new t.cE;for(let e=0;e<e2;e++){let t=k();if(t<.12){let t=Math.pow(k(),.6);e8.copy(e3).multiplyScalar(t),e6[e]=.7+.3*t}else if(t<.22){let t=k()*Math.PI*2;e8.set(Math.cos(t),0,Math.sin(t)),e6[e]=.9}else if(t<.6){let t=(Math.floor(7*k())-3)*(Math.PI/8),o=k()*Math.PI*2;e8.set(Math.cos(o)*Math.cos(t),Math.sin(t),Math.sin(o)*Math.cos(t)),e6[e]=.35}else if(t<.9){let t=Math.floor(8*k())*(Math.PI/8),o=k()*Math.PI*2;e8.set(Math.cos(t)*Math.sin(o),Math.cos(o),Math.sin(t)*Math.sin(o)),e6[e]=.3}else{let t=Math.floor(3*k()),o=(2*k()-1)*1.25;e8.set(0===t?o:0,1===t?o:0,2===t?o:0),e6[e]=.25}e4.set(e8.toArray(),3*e)}let e9=new t.ld;e9.setAttribute("position",new t.f5(e4,3)),e9.setAttribute("aB",new t.f5(e6,1)),e9.setAttribute("aRand",new t.f5(Float32Array.from({length:e2},()=>k()),1));let e7={uTime:W,uSize:{value:12},uAlpha:_.bloch,uMin:{value:1},uColor:{value:I.lilac}},te=new t.sy(e9,R(e7,A,h));te.position.copy(r),te.rotation.x=.35,P.add(te);let tt=[];P.traverse(e=>{let t=e.material?.uniforms;if(!t)return;let o=B.find(e=>t.uAlpha===_[e])??(t.uKind?"sensors":void 0);o&&tt.push({obj:e,world:o})});let to=e=>new t.cE(...e),ta=z.intro?"intro":"hero",tl=to(n[ta].pos),tr=to(n[ta].look),ti={t:1,dur:2,from:tl.clone(),via:tl.clone(),to:tl.clone(),lookFrom:tr.clone(),lookTo:tr.clone()},tn={fx:n[ta].fx,fy:n[ta].fy},tu=Object.fromEntries(B.map(e=>[e,n[ta].show[e]??0])),ts=0,td=0,tv=+!z.intro,tc=!z.intro,th=1,tp=0,tf=!1,tm=0,tw=0,ty=1,tA=1,tx=new t.wq(9,9),tb=new t.wq;function tM(){ty=e.clientWidth||window.innerWidth,tA=e.clientHeight||window.innerHeight,T.setPixelRatio(Math.min(window.devicePixelRatio||1,z.lite?1.5:1.75)),T.setSize(ty,tA,!1),F.aspect=ty/tA,F.updateProjectionMatrix();let t=T.getPixelRatio();D.uSize.value=9*t,ef.uSize.value=50*t,eM.uSize.value=280*t,ek.uSize.value=70*t,eV.uSize.value=340*t,eT.uSize.value=40*t,eO.uSize.value=26*t,eU.uSize.value=22*t,e1.uSize.value=34*t,e7.uSize.value=22*t,ei.uSize.value=6*t,eg.forEach(e=>e.u.uSize.value=40*t)}tM();let tg=e=>e<.5?4*e*e*e:1-Math.pow(-2*e+2,3)/2;function tS(e){let t=n[e],o=to(window.innerWidth<860&&s[e]||t.pos);ti={t:+!!z.reduced,dur:t.dur??1.6,from:tl.clone(),via:t.via?to(t.via):tl.clone().lerp(o,.5),to:o,lookFrom:tr.clone(),lookTo:to(t.look)},z.reduced&&(tl.copy(o),tr.copy(ti.lookTo))}let tz=new t.cE;return{setStage(e){tc&&e!==ta&&(ta=e,tS(e))},setPaused(e){tf=e},setPointer(e,t){tx.set(e,t)},skipIntro(){th=5},tick:function(e){let o=tw?Math.min(.05,(e-tw)/1e3):.016;tw=e,tf||z.reduced||(tm+=o),W.value=tm;let a=n[ta],l=!1;if(tv<1&&(tv=Math.min(1,tv+o/1.25*th),D.uIntro.value=tv,V.value=Math.max(0,(tv-.4)/.6),l=!0,!tc&&tv>.6&&(tc=!0,ta="hero",tS("hero"),z.onIntroDone?.())),ti.t<1){ti.t=Math.min(1,ti.t+o/ti.dur);let e=tg(ti.t),t=ti.from.clone().lerp(ti.via,e),a=ti.via.clone().lerp(ti.to,e);tl.copy(t.lerp(a,e)),tr.copy(ti.lookFrom).lerp(ti.lookTo,tg(Math.min(1,1.15*ti.t))),l=!0}let r=z.reduced?1:1-Math.exp(-(2.2*o)),[i,s]=window.innerWidth<860?u[ta]:[a.fx,a.fy];for(let e of(tn.fx+=(i-tn.fx)*r,tn.fy+=(s-tn.fy)*r,B)){let t=(a.show[e]??0)-tu[e];Math.abs(t)>.002&&(l=!0),tu[e]+=t*(z.reduced?1:1-Math.exp(-(2.4*o))),_[e].value=tu[e]}ts+=((a.dead??0)-ts)*r,td+=((a.sync??0)-td)*(1-Math.exp(-(.6*o))),ea.uSync.value=td,z.reduced||tf||(a.turn?tp+=.15*o:(tp=Math.atan2(Math.sin(tp),Math.cos(tp)),tp+=(0-tp)*(1-Math.exp(-(1.2*o)))));let d=1-Math.exp(-(3*o));tb.x+=((tx.x>5?0:tx.x)-tb.x)*d,tb.y+=((tx.y>5?0:tx.y)-tb.y)*d,q.rotation.set(.12-(a.turn?.15*tb.y:0),tp+(a.turn?.3*tb.x:0),0);let v=tl.distanceTo(tr);for(let{obj:e,world:o}of(F.position.copy(tl).add(new t.cE(tb.x,tb.y,0).multiplyScalar(.02*v)),F.lookAt(tr),F.setViewOffset(ty,tA,(.5-tn.fx)*ty,(.5-tn.fy)*tA,ty,tA),eg.forEach((e,t)=>{let o=0===t?0:ts;e.u.uAlpha.value=tu.sensors*(1-.5*o),e.u.uAmp.value=.45*(1-.93*o),e.u.uColor.value.copy(e.live).lerp(I.dead,o);let a=e.live.clone().lerp(I.dead,o);eb.setXYZ(t,a.r,a.g,a.b)}),eb.needsUpdate=!0,tt))e.visible=tu[o]>.003;return eT.uHead.value=.12*tm%1,te.rotation.y=.25*tm,T.render(P,F),l},anchors:function(){P.updateMatrixWorld();let e={},o=(t,o,a,l)=>{let r,i=(tz.copy(o),l&&tz.applyMatrix4(l.matrixWorld),r=tz.clone().applyMatrix4(F.matrixWorldInverse).z>0,tz.project(F),{x:(tz.x+1)/2*ty,y:(1-tz.y)/2*tA,behind:r}),n=Math.min(1,Math.max(0,(ti.t-.8)/.2));e[t]={x:i.x,y:i.y,on:i.behind?0:a*n}};ey.forEach(e=>o(e,ew[e],tu.sensors)),o("fusion",i,tu.sensors);let a=eT.uHead.value+z.seen/2;return o("event3",new t.cE(l.x+eL[3],.42,0),tu.ledger),o("ring",new t.cE(2.2*Math.cos(a*Math.PI*2),0,2.2*Math.sin(a*Math.PI*2)),tu.ring,eP),o("scalp",S(.5,0),tu.electrodes,q),o("web",S(-.6,.6).multiplyScalar(1.05),tu.electrodes,q),o("neuron",et[0],tu.neurons),eB.forEach(e=>o(e,e_[e],tu.regions,q)),eL.slice(0,3).forEach((e,a)=>o(`event${a}`,new t.cE(l.x+e,.82,0),tu.ledger)),o("amplitude",e3,tu.bloch,te),o("phase",new t.cE(-1,0,0),tu.bloch,te),e},resize:tM,dispose(){T.dispose(),P.traverse(e=>{let t=e.material;t?.dispose?.(),e.geometry?.dispose?.()})}}}])}]);