import{w as a,_ as t,a as s,i as e,s as r,b as c,S as n,e as i,c as o,t as l,d as u,f,g as v,h,j as d,k as p,l as m,m as D,n as y,o as I,p as R,q as S,r as V}from"./client.45e7a2a5.js";var g=a(new Map);function j(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],(function(){}))),!0}catch(a){return!1}}function w(a){var t,s,e,r,c,n,S,V,g,j,w=new Date(a[2]).toJSON().slice(0,10).split("-").reverse().join("-")+"";return{c:function(){t=i("div"),s=i("img"),r=o(),c=i("div"),n=i("div"),S=l(a[1]),V=o(),g=i("div"),j=l(w),this.h()},l:function(e){t=u(e,"DIV",{class:!0});var i=f(t);s=u(i,"IMG",{class:!0,src:!0,alt:!0}),r=v(i),c=u(i,"DIV",{class:!0});var o=f(c);n=u(o,"DIV",{class:!0});var l=f(n);S=h(l,a[1]),l.forEach(d),V=v(o),g=u(o,"DIV",{class:!0});var p=f(g);j=h(p,w),p.forEach(d),o.forEach(d),i.forEach(d),this.h()},h:function(){p(s,"class","img svelte-i3yt1c"),s.src!==(e=a[0])&&p(s,"src",e),p(s,"alt","Velu S Gautam"),p(n,"class","name"),p(g,"class","date"),p(c,"class","details svelte-i3yt1c"),p(t,"class","post--author svelte-i3yt1c")},m:function(a,e){m(a,t,e),D(t,s),D(t,r),D(t,c),D(c,n),D(n,S),D(c,V),D(c,g),D(g,j)},p:function(a,t){var r=y(t,1)[0];1&r&&s.src!==(e=a[0])&&p(s,"src",e),2&r&&I(S,a[1]),4&r&&w!==(w=new Date(a[2]).toJSON().slice(0,10).split("-").reverse().join("-")+"")&&I(j,w)},i:R,o:R,d:function(a){a&&d(t)}}}function E(a,t,s){var e=t.avathar,r=t.name,c=t.createdDate;return a.$set=function(a){"avathar"in a&&s(0,e=a.avathar),"name"in a&&s(1,r=a.name),"createdDate"in a&&s(2,c=a.createdDate)},[e,r,c]}var x=function(a){t(l,n);var i,o=(i=l,function(){var a,t=S(i);if(j()){var s=S(this).constructor;a=Reflect.construct(t,arguments,s)}else a=t.apply(this,arguments);return V(this,a)});function l(a){var t;return s(this,l),t=o.call(this),e(c(t),a,E,w,r,{avathar:0,name:1,createdDate:2}),t}return l}();export{x as A,g as a};
