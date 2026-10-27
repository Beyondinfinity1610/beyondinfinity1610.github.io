(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,[8364,e=>{var t=e.i(43476),r=e.i(71645),n=e.i(90072),o=e.i(75056),i=e.i(95393),a=e.i(79877),s=e.i(48705),u=e.i(91883);function c({kind:e,target:o,flood:a,reduced:s}){let f=(0,r.useRef)(0),l=(0,r.useRef)(0),p=(0,r.useRef)({pos:new n.cE,look:new n.cE,lookNow:new n.cE});return(0,i.f)((t,r)=>{let n=Math.min(r,.05),i=s?1:1-Math.exp(-(1.6*n));f.current+=((o.current??0)-f.current)*i,l.current+=((a.current??0)-l.current)*(s?1:1-Math.exp(-(3*n)));let u=p.current;!function(e,t,r,n,o){if("adhd-eeg"===e)n.set(.6*Math.sin(.18*r),.9-.2*t,13-6.5*t),o.set(0,.6+.9*t,-(4*t));else if("synthetic-finance"===e){let e=-.45+.6*t+.08*Math.sin(.12*r);n.set(17*Math.sin(e),3.2-1.4*t,17*Math.cos(e)),o.set(0,0,0)}else{let e=.16*r;n.set(Math.sin(e)*(8.5-2*t),1.2+.4*Math.sin(.2*r),Math.cos(e)*(8.5-2*t)),o.set(0,-.3,0)}}(e,f.current,s?0:t.clock.elapsedTime,u.pos,u.look),t.camera.position.lerp(u.pos,s?1:1-Math.exp(-(2*n))),u.lookNow.lerp(u.look,s?1:1-Math.exp(-(2*n))),t.camera.lookAt(u.lookNow)}),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("fog",{attach:"fog",args:["#05070a",10,34]}),"adhd-eeg"===e&&(0,t.jsx)(u.T,{phase:f}),"synthetic-finance"===e&&(0,t.jsx)(u.e,{phase:f,flood:l}),"qhh"===e&&(0,t.jsx)(u.W,{phase:f})]})}e.s(["default",0,function({kind:e,target:r,flood:n,reduced:i,active:u}){return(0,t.jsxs)(o.f,{className:"film__canvas",frameloop:u?"always":"never",dpr:[1,1.75],gl:{antialias:!0,alpha:!1},camera:{fov:42,near:.1,far:80,position:[0,1,13]},onCreated:({gl:e})=>e.setClearColor("#05070a",1),"aria-hidden":"true",children:[(0,t.jsx)(c,{kind:e,target:r,flood:n,reduced:i}),(0,t.jsxs)(a.g,{multisampling:4,children:[(0,t.jsx)(a.w,{mipmapBlur:!0,intensity:1,luminanceThreshold:.08,luminanceSmoothing:.3,radius:.7}),(0,t.jsx)(s.f,{reduced:i})]})]})}])},48705,e=>{var t=e.i(43476),r=e.i(71645),n=e.i(90072),o=e.i(95393),i=e.i(33623);let a=`
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
`;class s extends i.x{constructor(){super("LensEffect",a,{attributes:i.h.CONVOLUTION,uniforms:new Map([["strength",new n.MY(0)],["aberration",new n.MY(.0012)],["center",new n.MY(new n.wq(.5,.5))]])})}set(e,t){this.uniforms.get("strength").value=e,this.uniforms.get("aberration").value=t}}e.s(["f",0,function({drive:e,reduced:n=!1}){let i=(0,r.useMemo)(()=>new s,[]),a=(0,r.useRef)({cut:-1e9,dive:-1e9});return(0,r.useEffect)(()=>{let e=()=>a.current.cut=performance.now(),t=()=>a.current.dive=performance.now();return window.addEventListener("site:cut",e),window.addEventListener("site:dive",t),()=>{window.removeEventListener("site:cut",e),window.removeEventListener("site:dive",t)}},[]),(0,r.useEffect)(()=>()=>i.dispose(),[i]),(0,o.f)(()=>{if(n)return void i.set(0,8e-4);let t=performance.now(),r=(t-a.current.cut)/1e3,o=r<0||r>.7?0:.32*Math.sin(Math.min(1,r/.7)*Math.PI),s=(t-a.current.dive)/1e3,u=s<0||s>1.2?0:Math.min(1,s/.9)**2*.75,c=Math.max(e?.current??0,o,u);i.set(c,.0012+.012*c)}),(0,t.jsx)("primitive",{object:i,dispose:null})}])},90874,e=>{var t=e.i(61949);e.s(["f",()=>t.D])}],75972,function(e){e.n(e.i(8364))}]);