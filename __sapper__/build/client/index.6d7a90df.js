import{S as t,i as e,s,m as a,o,p as n,q as r,r as i,u as l,e as c,a as h,v as u,c as p,g as f,d as m,b as g,h as d,k as v,j as $,x as w,y as b,z as x}from"./client.ac06dc61.js";import"./Author.62eba70e.js";import{g as I,P as M}from"./Post.821d153e.js";function j(t,e,s){const a=t.slice();return a[2]=e[s],a}function y(t){let e;const s=new M({props:{post:t[2],author:t[1].get(t[2].authorId)}});return{c(){a(s.$$.fragment)},l(t){o(s.$$.fragment,t)},m(t,a){n(s,t,a),e=!0},p(t,e){const a={};1&e&&(a.post=t[2]),3&e&&(a.author=t[1].get(t[2].authorId)),s.$set(a)},i(t){e||(r(s.$$.fragment,t),e=!0)},o(t){i(s.$$.fragment,t),e=!1},d(t){l(s,t)}}}function A(t){let e,s,a,o,n=t[0],l=[];for(let e=0;e<n.length;e+=1)l[e]=y(j(t,n,e));const I=t=>i(l[t],1,1,()=>{l[t]=null});return{c(){e=c("meta"),s=h(),a=c("div");for(let t=0;t<l.length;t+=1)l[t].c();this.h()},l(t){const o=u('[data-svelte="svelte-przq4i"]',document.head);e=p(o,"META",{name:!0,content:!0}),o.forEach(f),s=m(t),a=p(t,"DIV",{class:!0});var n=g(a);for(let t=0;t<l.length;t+=1)l[t].l(n);n.forEach(f),this.h()},h(){document.title="Hectane | Home Page",d(e,"name","description"),d(e,"content","Hectane is a simple blog covering experiences from its authors. It\n    now covers areas like Technology, Interviews, Travelogue and Learnings. I\n    Velu S Gautam (Core Developer) of the blog invite contributions from others\n    with similar experiences. The below topics are the top 10 in the page now. "),d(a,"class","listing--container")},m(t,n){v(document.head,e),$(t,s,n),$(t,a,n);for(let t=0;t<l.length;t+=1)l[t].m(a,null);o=!0},p(t,[e]){if(3&e){let s;for(n=t[0],s=0;s<n.length;s+=1){const o=j(t,n,s);l[s]?(l[s].p(o,e),r(l[s],1)):(l[s]=y(o),l[s].c(),r(l[s],1),l[s].m(a,null))}for(x(),s=n.length;s<l.length;s+=1)I(s);w()}},i(t){if(!o){for(let t=0;t<n.length;t+=1)r(l[t]);o=!0}},o(t){l=l.filter(Boolean);for(let t=0;t<l.length;t+=1)i(l[t]);o=!1},d(t){f(e),t&&f(s),t&&f(a),b(l,t)}}}async function T({path:t}){const e=await this.fetch("https://backend.hectane.com/posts/limit/7"),s=await e.json();if(200===e.status&&Array.isArray(s)){return{posts:s,authorMap:await I(s,this.fetch)}}this.error(e.status,s.message)}function k(t,e,s){let{posts:a}=e,{authorMap:o}=e;return t.$set=t=>{"posts"in t&&s(0,a=t.posts),"authorMap"in t&&s(1,o=t.authorMap)},[a,o]}export default class extends t{constructor(t){super(),e(this,t,k,A,s,{posts:0,authorMap:1})}}export{T as preload};
