/** Shared GLSL snippets: hashing, value noise, fbm, voronoi. */
export const NOISE = /* glsl */ `
float hash11(float p){ p = fract(p*.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3 += dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
float hash31(vec3 p){ p = fract(p*.1031); p += dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  float a = hash31(i), b = hash31(i+vec3(1,0,0)), c = hash31(i+vec3(0,1,0)), d = hash31(i+vec3(1,1,0));
  float e = hash31(i+vec3(0,0,1)), g = hash31(i+vec3(1,0,1)), h = hash31(i+vec3(0,1,1)), k = hash31(i+vec3(1,1,1));
  return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,g,f.x),mix(h,k,f.x),f.y), f.z);
}
float fbm(vec3 p){ float s = 0., a = .5; for(int i=0;i<4;i++){ s += a*vnoise(p); p = p*2.03+vec3(17.1,3.7,9.2); a *= .5; } return s/.9375; }
float fbm2(vec3 p){ return .6667*vnoise(p) + .3333*vnoise(p*2.03+vec3(17.1,3.7,9.2)); }
vec2 voro(vec2 p){
  vec2 n = floor(p), f = fract(p); float f1 = 8., f2 = 8.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 g = vec2(float(i),float(j)); vec2 o = hash22(n+g); float d = length(g+o-f);
    if(d<f1){ f2=f1; f1=d; } else if(d<f2){ f2=d; }
  }
  return vec2(f1,f2);
}
`;
