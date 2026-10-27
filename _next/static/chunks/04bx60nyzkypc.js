(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,49166,e=>{"use strict";let t,n;var i=e.i(43476),o=e.i(71645),a=e.i(75056);function r(){return(r=Object.assign.bind()).apply(null,arguments)}var s=e.i(90072),l=e.i(90874),c=s,d=s;let u=new d.VQ,p=new d.cE;class f extends d.Kx{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new d.ki([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new d.ki([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return void 0!==t&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new d.hC(t,6,1);return this.setAttribute("instanceStart",new d.Zq(n,3,0)),this.setAttribute("instanceEnd",new d.Zq(n,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let n;e instanceof Float32Array?n=e:Array.isArray(e)&&(n=new Float32Array(e));let i=new d.hC(n,2*t,1);return this.setAttribute("instanceColorStart",new d.Zq(i,t,0)),this.setAttribute("instanceColorEnd",new d.Zq(i,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new d.nw(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new d.VQ);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;void 0!==e&&void 0!==t&&(this.boundingBox.setFromBufferAttribute(e),u.setFromBufferAttribute(t),this.boundingBox.union(u))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new d.L0),null===this.boundingBox&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(void 0!==e&&void 0!==t){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let i=0;for(let o=0,a=e.count;o<a;o++)p.fromBufferAttribute(e,o),i=Math.max(i,n.distanceToSquared(p)),p.fromBufferAttribute(t,o),i=Math.max(i,n.distanceToSquared(p));this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}var h=s,m=e.i(8560);let v=parseInt(s.Tu.replace(/\D+/g,""));class b extends h.Zg{constructor(e){super({type:"LineMaterial",uniforms:h.SP.clone(h.SP.merge([m.O.common,m.O.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new h.wq(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
				#include <common>
				#include <fog_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				#include <clipping_planes_pars_vertex>

				uniform float linewidth;
				uniform vec2 resolution;

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
						attribute vec4 instanceColorStart;
						attribute vec4 instanceColorEnd;
					#else
						varying vec3 vLineColor;
						attribute vec3 instanceColorStart;
						attribute vec3 instanceColorEnd;
					#endif
				#endif

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#ifdef USE_DASH

					uniform float dashScale;
					attribute float instanceDistanceStart;
					attribute float instanceDistanceEnd;
					varying float vLineDistance;

				#endif

				void trimSegment( const in vec4 start, inout vec4 end ) {

					// trim end segment so it terminates between the camera plane and the near plane

					// conservative estimate of the near plane
					float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
					float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
					float nearEstimate = - 0.5 * b / a;

					float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

					end.xyz = mix( start.xyz, end.xyz, alpha );

				}

				void main() {

					#ifdef USE_COLOR

						vLineColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

					#endif

					#ifdef USE_DASH

						vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
						vUv = uv;

					#endif

					float aspect = resolution.x / resolution.y;

					// camera space
					vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
					vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

					#ifdef WORLD_UNITS

						worldStart = start.xyz;
						worldEnd = end.xyz;

					#else

						vUv = uv;

					#endif

					// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
					// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
					// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
					// perhaps there is a more elegant solution -- WestLangley

					bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

					if ( perspective ) {

						if ( start.z < 0.0 && end.z >= 0.0 ) {

							trimSegment( start, end );

						} else if ( end.z < 0.0 && start.z >= 0.0 ) {

							trimSegment( end, start );

						}

					}

					// clip space
					vec4 clipStart = projectionMatrix * start;
					vec4 clipEnd = projectionMatrix * end;

					// ndc space
					vec3 ndcStart = clipStart.xyz / clipStart.w;
					vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

					// direction
					vec2 dir = ndcEnd.xy - ndcStart.xy;

					// account for clip-space aspect ratio
					dir.x *= aspect;
					dir = normalize( dir );

					#ifdef WORLD_UNITS

						// get the offset direction as perpendicular to the view vector
						vec3 worldDir = normalize( end.xyz - start.xyz );
						vec3 offset;
						if ( position.y < 0.5 ) {

							offset = normalize( cross( start.xyz, worldDir ) );

						} else {

							offset = normalize( cross( end.xyz, worldDir ) );

						}

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

						// don't extend the line if we're rendering dashes because we
						// won't be rendering the endcaps
						#ifndef USE_DASH

							// extend the line bounds to encompass  endcaps
							start.xyz += - worldDir * linewidth * 0.5;
							end.xyz += worldDir * linewidth * 0.5;

							// shift the position of the quad so it hugs the forward edge of the line
							offset.xy -= dir * forwardOffset;
							offset.z += 0.5;

						#endif

						// endcaps
						if ( position.y > 1.0 || position.y < 0.0 ) {

							offset.xy += dir * 2.0 * forwardOffset;

						}

						// adjust for linewidth
						offset *= linewidth * 0.5;

						// set the world position
						worldPos = ( position.y < 0.5 ) ? start : end;
						worldPos.xyz += offset;

						// project the worldpos
						vec4 clip = projectionMatrix * worldPos;

						// shift the depth of the projected points so the line
						// segments overlap neatly
						vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
						clip.z = clipPose.z * clip.w;

					#else

						vec2 offset = vec2( dir.y, - dir.x );
						// undo aspect ratio adjustment
						dir.x /= aspect;
						offset.x /= aspect;

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						// endcaps
						if ( position.y < 0.0 ) {

							offset += - dir;

						} else if ( position.y > 1.0 ) {

							offset += dir;

						}

						// adjust for linewidth
						offset *= linewidth;

						// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
						offset /= resolution.y;

						// select end
						vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

						// back to clip space
						offset *= clip.w;

						clip.xy += offset;

					#endif

					gl_Position = clip;

					vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

					#include <logdepthbuf_vertex>
					#include <clipping_planes_vertex>
					#include <fog_vertex>

				}
			`,fragmentShader:`
				uniform vec3 diffuse;
				uniform float opacity;
				uniform float linewidth;

				#ifdef USE_DASH

					uniform float dashOffset;
					uniform float dashSize;
					uniform float gapSize;

				#endif

				varying float vLineDistance;

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#include <common>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
					#else
						varying vec3 vLineColor;
					#endif
				#endif

				vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

					float mua;
					float mub;

					vec3 p13 = p1 - p3;
					vec3 p43 = p4 - p3;

					vec3 p21 = p2 - p1;

					float d1343 = dot( p13, p43 );
					float d4321 = dot( p43, p21 );
					float d1321 = dot( p13, p21 );
					float d4343 = dot( p43, p43 );
					float d2121 = dot( p21, p21 );

					float denom = d2121 * d4343 - d4321 * d4321;

					float numer = d1343 * d4321 - d1321 * d4343;

					mua = numer / denom;
					mua = clamp( mua, 0.0, 1.0 );
					mub = ( d1343 + d4321 * ( mua ) ) / d4343;
					mub = clamp( mub, 0.0, 1.0 );

					return vec2( mua, mub );

				}

				void main() {

					#include <clipping_planes_fragment>

					#ifdef USE_DASH

						if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

						if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

					#endif

					float alpha = opacity;

					#ifdef WORLD_UNITS

						// Find the closest points on the view ray and the line segment
						vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
						vec3 lineDir = worldEnd - worldStart;
						vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

						vec3 p1 = worldStart + lineDir * params.x;
						vec3 p2 = rayEnd * params.y;
						vec3 delta = p1 - p2;
						float len = length( delta );
						float norm = len / linewidth;

						#ifndef USE_DASH

							#ifdef USE_ALPHA_TO_COVERAGE

								float dnorm = fwidth( norm );
								alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

							#else

								if ( norm > 0.5 ) {

									discard;

								}

							#endif

						#endif

					#else

						#ifdef USE_ALPHA_TO_COVERAGE

							// artifacts appear on some hardware if a derivative is taken within a conditional
							float a = vUv.x;
							float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
							float len2 = a * a + b * b;
							float dlen = fwidth( len2 );

							if ( abs( vUv.y ) > 1.0 ) {

								alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

							}

						#else

							if ( abs( vUv.y ) > 1.0 ) {

								float a = vUv.x;
								float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
								float len2 = a * a + b * b;

								if ( len2 > 1.0 ) discard;

							}

						#endif

					#endif

					vec4 diffuseColor = vec4( diffuse, alpha );
					#ifdef USE_COLOR
						#ifdef USE_LINE_COLOR_ALPHA
							diffuseColor *= vLineColor;
						#else
							diffuseColor.rgb *= vLineColor;
						#endif
					#endif

					#include <logdepthbuf_fragment>

					gl_FragColor = diffuseColor;

					#include <tonemapping_fragment>
					#include <${v>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(e){this.uniforms.diffuse.value=e}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(e){!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(e){this.uniforms.linewidth.value=e}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(e){!!e!="USE_DASH"in this.defines&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(e){this.uniforms.dashScale.value=e}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(e){this.uniforms.dashSize.value=e}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(e){this.uniforms.dashOffset.value=e}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(e){this.uniforms.gapSize.value=e}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(e){this.uniforms.resolution.value.copy(e)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(e){!!e!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),!0===e?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}let g=v>=125?"uv1":"uv2",y=new c.$i,E=new c.cE,w=new c.cE,S=new c.$i,x=new c.$i,A=new c.$i,O=new c.cE,L=new c.nd,_=new c._i,P=new c.cE,M=new c.VQ,j=new c.L0,T=new c.$i;function z(e,t,i){return T.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),T.multiplyScalar(1/T.w),T.x=n/i.width,T.y=n/i.height,T.applyMatrix4(e.projectionMatrixInverse),T.multiplyScalar(1/T.w),Math.abs(Math.max(T.x,T.y))}class C extends c.kE{constructor(e=new f,t=new b({color:0xffffff*Math.random()})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,i=new Float32Array(2*t.count);for(let e=0,o=0,a=t.count;e<a;e++,o+=2)E.fromBufferAttribute(t,e),w.fromBufferAttribute(n,e),i[o]=0===o?0:i[o-1],i[o+1]=i[o]+E.distanceTo(w);let o=new c.hC(i,2,1);return e.setAttribute("instanceDistanceStart",new c.Zq(o,1,0)),e.setAttribute("instanceDistanceEnd",new c.Zq(o,1,1)),this}raycast(e,i){let o,a,r=this.material.worldUnits,s=e.camera;null!==s||r||console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let l=void 0!==e.params.Line2&&e.params.Line2.threshold||0;t=e.ray;let d=this.matrixWorld,u=this.geometry,p=this.material;if(n=p.linewidth+l,null===u.boundingSphere&&u.computeBoundingSphere(),j.copy(u.boundingSphere).applyMatrix4(d),r)o=.5*n;else{let e=Math.max(s.near,j.distanceToPoint(t.origin));o=z(s,e,p.resolution)}if(j.radius+=o,!1!==t.intersectsSphere(j)){if(null===u.boundingBox&&u.computeBoundingBox(),M.copy(u.boundingBox).applyMatrix4(d),r)a=.5*n;else{let e=Math.max(s.near,M.distanceToPoint(t.origin));a=z(s,e,p.resolution)}M.expandByScalar(a),!1!==t.intersectsBox(M)&&(r?function(e,i){let o=e.matrixWorld,a=e.geometry,r=a.attributes.instanceStart,s=a.attributes.instanceEnd,l=Math.min(a.instanceCount,r.count);for(let a=0;a<l;a++){_.start.fromBufferAttribute(r,a),_.end.fromBufferAttribute(s,a),_.applyMatrix4(o);let l=new c.cE,d=new c.cE;t.distanceSqToSegment(_.start,_.end,d,l),d.distanceTo(l)<.5*n&&i.push({point:d,pointOnLine:l,distance:t.origin.distanceTo(d),object:e,face:null,faceIndex:a,uv:null,[g]:null})}}(this,i):function(e,i,o){let a=i.projectionMatrix,r=e.material.resolution,s=e.matrixWorld,l=e.geometry,d=l.attributes.instanceStart,u=l.attributes.instanceEnd,p=Math.min(l.instanceCount,d.count),f=-i.near;t.at(1,A),A.w=1,A.applyMatrix4(i.matrixWorldInverse),A.applyMatrix4(a),A.multiplyScalar(1/A.w),A.x*=r.x/2,A.y*=r.y/2,A.z=0,O.copy(A),L.multiplyMatrices(i.matrixWorldInverse,s);for(let i=0;i<p;i++){if(S.fromBufferAttribute(d,i),x.fromBufferAttribute(u,i),S.w=1,x.w=1,S.applyMatrix4(L),x.applyMatrix4(L),S.z>f&&x.z>f)continue;if(S.z>f){let e=S.z-x.z,t=(S.z-f)/e;S.lerp(x,t)}else if(x.z>f){let e=x.z-S.z,t=(x.z-f)/e;x.lerp(S,t)}S.applyMatrix4(a),x.applyMatrix4(a),S.multiplyScalar(1/S.w),x.multiplyScalar(1/x.w),S.x*=r.x/2,S.y*=r.y/2,x.x*=r.x/2,x.y*=r.y/2,_.start.copy(S),_.start.z=0,_.end.copy(x),_.end.z=0;let l=_.closestPointToPointParameter(O,!0);_.at(l,P);let p=c.rB.lerp(S.z,x.z,l),h=p>=-1&&p<=1,m=O.distanceTo(P)<.5*n;if(h&&m){_.start.fromBufferAttribute(d,i),_.end.fromBufferAttribute(u,i),_.start.applyMatrix4(s),_.end.applyMatrix4(s);let n=new c.cE,a=new c.cE;t.distanceSqToSegment(_.start,_.end,a,n),o.push({point:a,pointOnLine:n,distance:t.origin.distanceTo(a),object:e,face:null,faceIndex:i,uv:null,[g]:null})}}}(this,s,i))}}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(y),this.material.uniforms.resolution.value.set(y.z,y.w))}}class D extends f{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){let t=e.length-3,n=new Float32Array(2*t);for(let i=0;i<t;i+=3)n[2*i]=e[i],n[2*i+1]=e[i+1],n[2*i+2]=e[i+2],n[2*i+3]=e[i+3],n[2*i+4]=e[i+4],n[2*i+5]=e[i+5];return super.setPositions(n),this}setColors(e,t=3){let n=e.length-t,i=new Float32Array(2*n);if(3===t)for(let o=0;o<n;o+=t)i[2*o]=e[o],i[2*o+1]=e[o+1],i[2*o+2]=e[o+2],i[2*o+3]=e[o+3],i[2*o+4]=e[o+4],i[2*o+5]=e[o+5];else for(let o=0;o<n;o+=t)i[2*o]=e[o],i[2*o+1]=e[o+1],i[2*o+2]=e[o+2],i[2*o+3]=e[o+3],i[2*o+4]=e[o+4],i[2*o+5]=e[o+5],i[2*o+6]=e[o+6],i[2*o+7]=e[o+7];return super.setColors(i,t),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}}class U extends C{constructor(e=new D,t=new b({color:0xffffff*Math.random()})){super(e,t),this.isLine2=!0,this.type="Line2"}}let N=o.forwardRef(function({points:e,color:t=0xffffff,vertexColors:n,linewidth:i,lineWidth:a,segments:c,dashed:d,...u},p){var h,m;let v=(0,l.f)(e=>e.size),g=o.useMemo(()=>c?new C:new U,[c]),[y]=o.useState(()=>new b),E=(null==n||null==(h=n[0])?void 0:h.length)===4?4:3,w=o.useMemo(()=>{let i=c?new f:new D,o=e.map(e=>{let t=Array.isArray(e);return e instanceof s.cE||e instanceof s.$i?[e.x,e.y,e.z]:e instanceof s.wq?[e.x,e.y,0]:t&&3===e.length?[e[0],e[1],e[2]]:t&&2===e.length?[e[0],e[1],0]:e});if(i.setPositions(o.flat()),n){t=0xffffff;let e=n.map(e=>e instanceof s.Es?e.toArray():e);i.setColors(e.flat(),E)}return i},[e,c,n,E]);return o.useLayoutEffect(()=>{g.computeLineDistances()},[e,g]),o.useLayoutEffect(()=>{d?y.defines.USE_DASH="":delete y.defines.USE_DASH,y.needsUpdate=!0},[d,y]),o.useEffect(()=>()=>{w.dispose(),y.dispose()},[w]),o.createElement("primitive",r({object:g,ref:p},u),o.createElement("primitive",{object:w,attach:"geometry"}),o.createElement("primitive",r({object:y,attach:"material",color:t,vertexColors:!!n,resolution:[v.width,v.height],linewidth:null!=(m=null!=i?i:a)?m:1,dashed:d,transparent:4===E},u)))});var R=e.i(95393),I=Object.defineProperty;class B{constructor(){var e;let t,n;n=void 0,(t="symbol"!=typeof(e="_listeners")?e+"":e)in this?I(this,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):this[t]=n}addEventListener(e,t){void 0===this._listeners&&(this._listeners={});let n=this._listeners;void 0===n[e]&&(n[e]=[]),-1===n[e].indexOf(t)&&n[e].push(t)}hasEventListener(e,t){if(void 0===this._listeners)return!1;let n=this._listeners;return void 0!==n[e]&&-1!==n[e].indexOf(t)}removeEventListener(e,t){if(void 0===this._listeners)return;let n=this._listeners[e];if(void 0!==n){let e=n.indexOf(t);-1!==e&&n.splice(e,1)}}dispatchEvent(e){if(void 0===this._listeners)return;let t=this._listeners[e.type];if(void 0!==t){e.target=this;let n=t.slice(0);for(let t=0,i=n.length;t<i;t++)n[t].call(this,e);e.target=null}}}var H=Object.defineProperty,k=(e,t,n)=>{let i;return(i="symbol"!=typeof t?t+"":t)in e?H(e,i,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[i]=n,n};let Y=new s.Wk,F=new s._m,q=Math.cos(Math.PI/180*70),Z=(e,t)=>(e%t+t)%t;class V extends B{constructor(e,t){let n,i,o,a,r,l,c,d,u,p;super(),k(this,"object"),k(this,"domElement"),k(this,"enabled",!0),k(this,"target",new s.cE),k(this,"minDistance",0),k(this,"maxDistance",1/0),k(this,"minZoom",0),k(this,"maxZoom",1/0),k(this,"minPolarAngle",0),k(this,"maxPolarAngle",Math.PI),k(this,"minAzimuthAngle",-1/0),k(this,"maxAzimuthAngle",1/0),k(this,"enableDamping",!1),k(this,"dampingFactor",.05),k(this,"enableZoom",!0),k(this,"zoomSpeed",1),k(this,"enableRotate",!0),k(this,"rotateSpeed",1),k(this,"enablePan",!0),k(this,"panSpeed",1),k(this,"screenSpacePanning",!0),k(this,"keyPanSpeed",7),k(this,"zoomToCursor",!1),k(this,"autoRotate",!1),k(this,"autoRotateSpeed",2),k(this,"reverseOrbit",!1),k(this,"reverseHorizontalOrbit",!1),k(this,"reverseVerticalOrbit",!1),k(this,"keys",{LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"}),k(this,"mouseButtons",{LEFT:s.vN.ROTATE,MIDDLE:s.vN.DOLLY,RIGHT:s.vN.PAN}),k(this,"touches",{ONE:s._l.ROTATE,TWO:s._l.DOLLY_PAN}),k(this,"target0"),k(this,"position0"),k(this,"zoom0"),k(this,"_domElementKeyEvents",null),k(this,"getPolarAngle"),k(this,"getAzimuthalAngle"),k(this,"setPolarAngle"),k(this,"setAzimuthalAngle"),k(this,"getDistance"),k(this,"getZoomScale"),k(this,"listenToKeyEvents"),k(this,"stopListenToKeyEvents"),k(this,"saveState"),k(this,"reset"),k(this,"update"),k(this,"connect"),k(this,"dispose"),k(this,"dollyIn"),k(this,"dollyOut"),k(this,"getScale"),k(this,"setScale"),this.object=e,this.domElement=t,this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this.getPolarAngle=()=>E.phi,this.getAzimuthalAngle=()=>E.theta,this.setPolarAngle=e=>{let t=Z(e,2*Math.PI),n=E.phi;n<0&&(n+=2*Math.PI),t<0&&(t+=2*Math.PI);let i=Math.abs(t-n);2*Math.PI-i<i&&(t<n?t+=2*Math.PI:n+=2*Math.PI),w.phi=t-n,f.update()},this.setAzimuthalAngle=e=>{let t=Z(e,2*Math.PI),n=E.theta;n<0&&(n+=2*Math.PI),t<0&&(t+=2*Math.PI);let i=Math.abs(t-n);2*Math.PI-i<i&&(t<n?t+=2*Math.PI:n+=2*Math.PI),w.theta=t-n,f.update()},this.getDistance=()=>f.object.position.distanceTo(f.target),this.listenToKeyEvents=e=>{e.addEventListener("keydown",ed),this._domElementKeyEvents=e},this.stopListenToKeyEvents=()=>{this._domElementKeyEvents.removeEventListener("keydown",ed),this._domElementKeyEvents=null},this.saveState=()=>{f.target0.copy(f.target),f.position0.copy(f.object.position),f.zoom0=f.object.zoom},this.reset=()=>{f.target.copy(f.target0),f.object.position.copy(f.position0),f.object.zoom=f.zoom0,f.object.updateProjectionMatrix(),f.dispatchEvent(h),f.update(),g=b.NONE},this.update=(n=new s.cE,i=new s.cE(0,1,0),a=(o=new s.as().setFromUnitVectors(e.up,i)).clone().invert(),r=new s.cE,l=new s.as,c=2*Math.PI,function(){let t=f.object.position;o.setFromUnitVectors(e.up,i),a.copy(o).invert(),n.copy(t).sub(f.target),n.applyQuaternion(o),E.setFromVector3(n),f.autoRotate&&g===b.NONE&&B(2*Math.PI/60/60*f.autoRotateSpeed),f.enableDamping?(E.theta+=w.theta*f.dampingFactor,E.phi+=w.phi*f.dampingFactor):(E.theta+=w.theta,E.phi+=w.phi);let d=f.minAzimuthAngle,u=f.maxAzimuthAngle;isFinite(d)&&isFinite(u)&&(d<-Math.PI?d+=c:d>Math.PI&&(d-=c),u<-Math.PI?u+=c:u>Math.PI&&(u-=c),d<=u?E.theta=Math.max(d,Math.min(u,E.theta)):E.theta=E.theta>(d+u)/2?Math.max(d,E.theta):Math.min(u,E.theta)),E.phi=Math.max(f.minPolarAngle,Math.min(f.maxPolarAngle,E.phi)),E.makeSafe(),!0===f.enableDamping?f.target.addScaledVector(x,f.dampingFactor):f.target.add(x),f.zoomToCursor&&U||f.object.isOrthographicCamera?E.radius=Q(E.radius):E.radius=Q(E.radius*S),n.setFromSpherical(E),n.applyQuaternion(a),t.copy(f.target).add(n),f.object.matrixAutoUpdate||f.object.updateMatrix(),f.object.lookAt(f.target),!0===f.enableDamping?(w.theta*=1-f.dampingFactor,w.phi*=1-f.dampingFactor,x.multiplyScalar(1-f.dampingFactor)):(w.set(0,0,0),x.set(0,0,0));let p=!1;if(f.zoomToCursor&&U){let t=null;if(f.object instanceof s.zm&&f.object.isPerspectiveCamera){let e=n.length();t=Q(e*S);let i=e-t;f.object.position.addScaledVector(C,i),f.object.updateMatrixWorld()}else if(f.object.isOrthographicCamera){let e=new s.cE(D.x,D.y,0);e.unproject(f.object),f.object.zoom=Math.max(f.minZoom,Math.min(f.maxZoom,f.object.zoom/S)),f.object.updateProjectionMatrix(),p=!0;let i=new s.cE(D.x,D.y,0);i.unproject(f.object),f.object.position.sub(i).add(e),f.object.updateMatrixWorld(),t=n.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),f.zoomToCursor=!1;null!==t&&(f.screenSpacePanning?f.target.set(0,0,-1).transformDirection(f.object.matrix).multiplyScalar(t).add(f.object.position):(Y.origin.copy(f.object.position),Y.direction.set(0,0,-1).transformDirection(f.object.matrix),Math.abs(f.object.up.dot(Y.direction))<q?e.lookAt(f.target):(F.setFromNormalAndCoplanarPoint(f.object.up,f.target),Y.intersectPlane(F,f.target))))}else f.object instanceof s.Sc&&f.object.isOrthographicCamera&&(p=1!==S)&&(f.object.zoom=Math.max(f.minZoom,Math.min(f.maxZoom,f.object.zoom/S)),f.object.updateProjectionMatrix());return S=1,U=!1,!!(p||r.distanceToSquared(f.object.position)>y||8*(1-l.dot(f.object.quaternion))>y)&&(f.dispatchEvent(h),r.copy(f.object.position),l.copy(f.object.quaternion),p=!1,!0)}),this.connect=e=>{f.domElement=e,f.domElement.style.touchAction="none",f.domElement.addEventListener("contextmenu",eu),f.domElement.addEventListener("pointerdown",er),f.domElement.addEventListener("pointercancel",el),f.domElement.addEventListener("wheel",ec)},this.dispose=()=>{var e,t,n,i,o,a;f.domElement&&(f.domElement.style.touchAction="auto"),null==(e=f.domElement)||e.removeEventListener("contextmenu",eu),null==(t=f.domElement)||t.removeEventListener("pointerdown",er),null==(n=f.domElement)||n.removeEventListener("pointercancel",el),null==(i=f.domElement)||i.removeEventListener("wheel",ec),null==(o=f.domElement)||o.ownerDocument.removeEventListener("pointermove",es),null==(a=f.domElement)||a.ownerDocument.removeEventListener("pointerup",el),null!==f._domElementKeyEvents&&f._domElementKeyEvents.removeEventListener("keydown",ed)};let f=this,h={type:"change"},m={type:"start"},v={type:"end"},b={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},g=b.NONE,y=1e-6,E=new s.tQ,w=new s.tQ,S=1,x=new s.cE,A=new s.wq,O=new s.wq,L=new s.wq,_=new s.wq,P=new s.wq,M=new s.wq,j=new s.wq,T=new s.wq,z=new s.wq,C=new s.cE,D=new s.wq,U=!1,N=[],R={};function I(){return Math.pow(.95,f.zoomSpeed)}function B(e){f.reverseOrbit||f.reverseHorizontalOrbit?w.theta+=e:w.theta-=e}function H(e){f.reverseOrbit||f.reverseVerticalOrbit?w.phi+=e:w.phi-=e}let V=(d=new s.cE,function(e,t){d.setFromMatrixColumn(t,0),d.multiplyScalar(-e),x.add(d)}),W=(u=new s.cE,function(e,t){!0===f.screenSpacePanning?u.setFromMatrixColumn(t,1):(u.setFromMatrixColumn(t,0),u.crossVectors(f.object.up,u)),u.multiplyScalar(e),x.add(u)}),G=(p=new s.cE,function(e,t){let n=f.domElement;if(n&&f.object instanceof s.zm&&f.object.isPerspectiveCamera){let i=f.object.position;p.copy(i).sub(f.target);let o=p.length();V(2*e*(o*=Math.tan(f.object.fov/2*Math.PI/180))/n.clientHeight,f.object.matrix),W(2*t*o/n.clientHeight,f.object.matrix)}else n&&f.object instanceof s.Sc&&f.object.isOrthographicCamera?(V(e*(f.object.right-f.object.left)/f.object.zoom/n.clientWidth,f.object.matrix),W(t*(f.object.top-f.object.bottom)/f.object.zoom/n.clientHeight,f.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),f.enablePan=!1)});function X(e){f.object instanceof s.zm&&f.object.isPerspectiveCamera||f.object instanceof s.Sc&&f.object.isOrthographicCamera?S=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),f.enableZoom=!1)}function K(e){if(!f.zoomToCursor||!f.domElement)return;U=!0;let t=f.domElement.getBoundingClientRect(),n=e.clientX-t.left,i=e.clientY-t.top,o=t.width,a=t.height;D.x=n/o*2-1,D.y=-(i/a*2)+1,C.set(D.x,D.y,1).unproject(f.object).sub(f.object.position).normalize()}function Q(e){return Math.max(f.minDistance,Math.min(f.maxDistance,e))}function $(e){A.set(e.clientX,e.clientY)}function J(e){_.set(e.clientX,e.clientY)}function ee(){if(1==N.length)A.set(N[0].pageX,N[0].pageY);else{let e=.5*(N[0].pageX+N[1].pageX),t=.5*(N[0].pageY+N[1].pageY);A.set(e,t)}}function et(){if(1==N.length)_.set(N[0].pageX,N[0].pageY);else{let e=.5*(N[0].pageX+N[1].pageX),t=.5*(N[0].pageY+N[1].pageY);_.set(e,t)}}function en(){let e=N[0].pageX-N[1].pageX,t=N[0].pageY-N[1].pageY,n=Math.sqrt(e*e+t*t);j.set(0,n)}function ei(e){if(1==N.length)O.set(e.pageX,e.pageY);else{let t=ef(e),n=.5*(e.pageX+t.x),i=.5*(e.pageY+t.y);O.set(n,i)}L.subVectors(O,A).multiplyScalar(f.rotateSpeed);let t=f.domElement;t&&(B(2*Math.PI*L.x/t.clientHeight),H(2*Math.PI*L.y/t.clientHeight)),A.copy(O)}function eo(e){if(1==N.length)P.set(e.pageX,e.pageY);else{let t=ef(e),n=.5*(e.pageX+t.x),i=.5*(e.pageY+t.y);P.set(n,i)}M.subVectors(P,_).multiplyScalar(f.panSpeed),G(M.x,M.y),_.copy(P)}function ea(e){var t;let n=ef(e),i=e.pageX-n.x,o=e.pageY-n.y,a=Math.sqrt(i*i+o*o);T.set(0,a),z.set(0,Math.pow(T.y/j.y,f.zoomSpeed)),t=z.y,X(S/t),j.copy(T)}function er(e){var t,n,i;!1!==f.enabled&&(0===N.length&&(null==(t=f.domElement)||t.ownerDocument.addEventListener("pointermove",es),null==(n=f.domElement)||n.ownerDocument.addEventListener("pointerup",el)),i=e,N.push(i),"touch"===e.pointerType?function(e){switch(ep(e),N.length){case 1:switch(f.touches.ONE){case s._l.ROTATE:if(!1===f.enableRotate)return;ee(),g=b.TOUCH_ROTATE;break;case s._l.PAN:if(!1===f.enablePan)return;et(),g=b.TOUCH_PAN;break;default:g=b.NONE}break;case 2:switch(f.touches.TWO){case s._l.DOLLY_PAN:if(!1===f.enableZoom&&!1===f.enablePan)return;f.enableZoom&&en(),f.enablePan&&et(),g=b.TOUCH_DOLLY_PAN;break;case s._l.DOLLY_ROTATE:if(!1===f.enableZoom&&!1===f.enableRotate)return;f.enableZoom&&en(),f.enableRotate&&ee(),g=b.TOUCH_DOLLY_ROTATE;break;default:g=b.NONE}break;default:g=b.NONE}g!==b.NONE&&f.dispatchEvent(m)}(e):function(e){let t;switch(e.button){case 0:t=f.mouseButtons.LEFT;break;case 1:t=f.mouseButtons.MIDDLE;break;case 2:t=f.mouseButtons.RIGHT;break;default:t=-1}switch(t){case s.vN.DOLLY:if(!1===f.enableZoom)return;K(e),j.set(e.clientX,e.clientY),g=b.DOLLY;break;case s.vN.ROTATE:if(e.ctrlKey||e.metaKey||e.shiftKey){if(!1===f.enablePan)return;J(e),g=b.PAN}else{if(!1===f.enableRotate)return;$(e),g=b.ROTATE}break;case s.vN.PAN:if(e.ctrlKey||e.metaKey||e.shiftKey){if(!1===f.enableRotate)return;$(e),g=b.ROTATE}else{if(!1===f.enablePan)return;J(e),g=b.PAN}break;default:g=b.NONE}g!==b.NONE&&f.dispatchEvent(m)}(e))}function es(e){!1!==f.enabled&&("touch"===e.pointerType?function(e){switch(ep(e),g){case b.TOUCH_ROTATE:if(!1===f.enableRotate)return;ei(e),f.update();break;case b.TOUCH_PAN:if(!1===f.enablePan)return;eo(e),f.update();break;case b.TOUCH_DOLLY_PAN:if(!1===f.enableZoom&&!1===f.enablePan)return;f.enableZoom&&ea(e),f.enablePan&&eo(e),f.update();break;case b.TOUCH_DOLLY_ROTATE:if(!1===f.enableZoom&&!1===f.enableRotate)return;f.enableZoom&&ea(e),f.enableRotate&&ei(e),f.update();break;default:g=b.NONE}}(e):function(e){if(!1!==f.enabled)switch(g){case b.ROTATE:let t;if(!1===f.enableRotate)return;O.set(e.clientX,e.clientY),L.subVectors(O,A).multiplyScalar(f.rotateSpeed),(t=f.domElement)&&(B(2*Math.PI*L.x/t.clientHeight),H(2*Math.PI*L.y/t.clientHeight)),A.copy(O),f.update();break;case b.DOLLY:var n,i;if(!1===f.enableZoom)return;(T.set(e.clientX,e.clientY),z.subVectors(T,j),z.y>0)?(n=I(),X(S/n)):z.y<0&&(i=I(),X(S*i)),j.copy(T),f.update();break;case b.PAN:if(!1===f.enablePan)return;P.set(e.clientX,e.clientY),M.subVectors(P,_).multiplyScalar(f.panSpeed),G(M.x,M.y),_.copy(P),f.update()}}(e))}function el(e){var t,n,i;(function(e){delete R[e.pointerId];for(let t=0;t<N.length;t++)if(N[t].pointerId==e.pointerId)return void N.splice(t,1)})(e),0===N.length&&(null==(t=f.domElement)||t.releasePointerCapture(e.pointerId),null==(n=f.domElement)||n.ownerDocument.removeEventListener("pointermove",es),null==(i=f.domElement)||i.ownerDocument.removeEventListener("pointerup",el)),f.dispatchEvent(v),g=b.NONE}function ec(e){if(!1!==f.enabled&&!1!==f.enableZoom&&(g===b.NONE||g===b.ROTATE)){var t,n;e.preventDefault(),f.dispatchEvent(m),(K(e),e.deltaY<0)?(t=I(),X(S*t)):e.deltaY>0&&(n=I(),X(S/n)),f.update(),f.dispatchEvent(v)}}function ed(e){if(!1!==f.enabled&&!1!==f.enablePan){let t=!1;switch(e.code){case f.keys.UP:G(0,f.keyPanSpeed),t=!0;break;case f.keys.BOTTOM:G(0,-f.keyPanSpeed),t=!0;break;case f.keys.LEFT:G(f.keyPanSpeed,0),t=!0;break;case f.keys.RIGHT:G(-f.keyPanSpeed,0),t=!0}t&&(e.preventDefault(),f.update())}}function eu(e){!1!==f.enabled&&e.preventDefault()}function ep(e){let t=R[e.pointerId];void 0===t&&(t=new s.wq,R[e.pointerId]=t),t.set(e.pageX,e.pageY)}function ef(e){return R[(e.pointerId===N[0].pointerId?N[1]:N[0]).pointerId]}this.dollyIn=(e=I())=>{X(S*e),f.update()},this.dollyOut=(e=I())=>{X(S/e),f.update()},this.getScale=()=>S,this.setScale=e=>{X(e),f.update()},this.getZoomScale=()=>I(),void 0!==t&&this.connect(t),this.update()}}let W=o.forwardRef(({makeDefault:e,camera:t,regress:n,domElement:i,enableDamping:a=!0,keyEvents:s=!1,onChange:c,onStart:d,onEnd:u,...p},f)=>{let h=(0,l.f)(e=>e.invalidate),m=(0,l.f)(e=>e.camera),v=(0,l.f)(e=>e.gl),b=(0,l.f)(e=>e.events),g=(0,l.f)(e=>e.setEvents),y=(0,l.f)(e=>e.set),E=(0,l.f)(e=>e.get),w=(0,l.f)(e=>e.performance),S=t||m,x=i||b.connected||v.domElement,A=o.useMemo(()=>new V(S),[S]);return(0,R.f)(()=>{A.enabled&&A.update()},-1),o.useEffect(()=>(s&&A.connect(!0===s?x:s),A.connect(x),()=>void A.dispose()),[s,x,n,A,h]),o.useEffect(()=>{let e=e=>{h(),n&&w.regress(),c&&c(e)},t=e=>{d&&d(e)},i=e=>{u&&u(e)};return A.addEventListener("change",e),A.addEventListener("start",t),A.addEventListener("end",i),()=>{A.removeEventListener("start",t),A.removeEventListener("end",i),A.removeEventListener("change",e)}},[c,d,u,A,h,g]),o.useEffect(()=>{if(e){let e=E().controls;return y({controls:A}),()=>y({controls:e})}},[e,A]),o.createElement("primitive",r({ref:f,object:A,enableDamping:a},p))});var G=e.i(88163);e.s(["default",0,function({flat:e,reduce:t}){let n=(0,o.useMemo)(()=>(0,G.u)(),[]),r=+!!e,[s,l]=(0,o.useState)(r),c=(0,o.useRef)(r);(0,o.useEffect)(()=>{if(t)return;let e=c.current,n=performance.now(),i=0,o=t=>{let a=Math.min(1,(t-n)/700),s=e+Math.round(14*a)/14*(r-e);c.current=s,l(s),a<1&&(i=requestAnimationFrame(o))};return i=requestAnimationFrame(o),()=>cancelAnimationFrame(i)},[r,t]);let d=t?r:s,u=(0,G.c)(d),p=(0,G.v)(d,n);return(0,i.jsxs)(a.f,{frameloop:"demand",dpr:[1,1.5],camera:{position:[3.4,3.1,4],fov:38},gl:{antialias:!0,alpha:!0,powerPreference:"low-power"},style:{background:"transparent"},"aria-hidden":"true",children:[u.map((e,t)=>(0,i.jsx)(N,{points:e,color:"#6b6f74",lineWidth:1,transparent:!0,opacity:.85},t)),p.map((e,t)=>(0,i.jsxs)("mesh",{position:e.p,children:[(0,i.jsx)("sphereGeometry",{args:[.045,12,12]}),(0,i.jsx)("meshBasicMaterial",{color:0===e.cls?"#7fa6c9":"#c9973f"})]},t)),(0,i.jsxs)("mesh",{position:[0,1,0],children:[(0,i.jsx)("boxGeometry",{args:[.09,.09,.09]}),(0,i.jsx)("meshBasicMaterial",{color:"#ece8e0"})]}),(0,i.jsx)(W,{enableZoom:!1,enablePan:!1,target:[0,1.5,0],maxPolarAngle:.62*Math.PI,minPolarAngle:.18*Math.PI,enableDamping:!1})]})}],49166)},24e3,function(e){e.n(e.i(49166))}]);