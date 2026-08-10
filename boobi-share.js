/*! boobi-share.js v1 — 부비 청약 스토리/피드 공유 카드
    Includes: QR Code Generator (c) 2009 Kazuhiko Arase — MIT License (http://www.d-project.com/)
    "QR Code" is a registered trademark of DENSO WAVE INCORPORATED */
(function(){
'use strict';
var qrcode=(function(){var P=function(x,w){var g=236,l=17,n=x,s=O[w],t=null,r=0,h=null,i=[],v={},_=function(a,f){r=n*4+17,t=(function(e){for(var u=new Array(e),o=0;o<e;o+=1){u[o]=new Array(e);for(var d=0;d<e;d+=1)u[o][d]=null}return u})(r),B(0,0),B(r-7,0),B(0,r-7),E(),T(),m(a,f),n>=7&&N(a),h==null&&(h=nr(n,s,i)),U(h,f)},B=function(a,f){for(var e=-1;e<=7;e+=1)if(!(a+e<=-1||r<=a+e))for(var u=-1;u<=7;u+=1)f+u<=-1||r<=f+u||(0<=e&&e<=6&&(u==0||u==6)||0<=u&&u<=6&&(e==0||e==6)||2<=e&&e<=4&&2<=u&&u<=4?t[a+e][f+u]=!0:t[a+e][f+u]=!1)},y=function(){for(var a=0,f=0,e=0;e<8;e+=1){_(!0,e);var u=k.getLostPoint(v);(e==0||a>u)&&(a=u,f=e)}return f},T=function(){for(var a=8;a<r-8;a+=1)t[a][6]==null&&(t[a][6]=a%2==0);for(var f=8;f<r-8;f+=1)t[6][f]==null&&(t[6][f]=f%2==0)},E=function(){for(var a=k.getPatternPosition(n),f=0;f<a.length;f+=1)for(var e=0;e<a.length;e+=1){var u=a[f],o=a[e];if(t[u][o]==null)for(var d=-2;d<=2;d+=1)for(var c=-2;c<=2;c+=1)d==-2||d==2||c==-2||c==2||d==0&&c==0?t[u+d][o+c]=!0:t[u+d][o+c]=!1}},N=function(a){for(var f=k.getBCHTypeNumber(n),e=0;e<18;e+=1){var u=!a&&(f>>e&1)==1;t[Math.floor(e/3)][e%3+r-8-3]=u}for(var e=0;e<18;e+=1){var u=!a&&(f>>e&1)==1;t[e%3+r-8-3][Math.floor(e/3)]=u}},m=function(a,f){for(var e=s<<3|f,u=k.getBCHTypeInfo(e),o=0;o<15;o+=1){var d=!a&&(u>>o&1)==1;o<6?t[o][8]=d:o<8?t[o+1][8]=d:t[r-15+o][8]=d}for(var o=0;o<15;o+=1){var d=!a&&(u>>o&1)==1;o<8?t[8][r-o-1]=d:o<9?t[8][15-o-1+1]=d:t[8][15-o-1]=d}t[r-8][8]=!a},U=function(a,f){for(var e=-1,u=r-1,o=7,d=0,c=k.getMaskFunction(f),p=r-1;p>0;p-=2)for(p==6&&(p-=1);;){for(var b=0;b<2;b+=1)if(t[u][p-b]==null){var C=!1;d<a.length&&(C=(a[d]>>>o&1)==1);var A=c(u,p-b);A&&(C=!C),t[u][p-b]=C,o-=1,o==-1&&(d+=1,o=7)}if(u+=e,u<0||r<=u){u-=e,e=-e;break}}},H=function(a,f){for(var e=0,u=0,o=0,d=new Array(f.length),c=new Array(f.length),p=0;p<f.length;p+=1){var b=f[p].dataCount,C=f[p].totalCount-b;u=Math.max(u,b),o=Math.max(o,C),d[p]=new Array(b);for(var A=0;A<d[p].length;A+=1)d[p][A]=255&a.getBuffer()[A+e];e+=b;var R=k.getErrorCorrectPolynomial(C),I=K(d[p],R.getLength()-1),S=I.mod(R);c[p]=new Array(R.getLength()-1);for(var A=0;A<c[p].length;A+=1){var X=A+S.getLength()-c[p].length;c[p][A]=X>=0?S.getAt(X):0}}for(var Z=0,A=0;A<f.length;A+=1)Z+=f[A].totalCount;for(var J=new Array(Z),Q=0,A=0;A<u;A+=1)for(var p=0;p<f.length;p+=1)A<d[p].length&&(J[Q]=d[p][A],Q+=1);for(var A=0;A<o;A+=1)for(var p=0;p<f.length;p+=1)A<c[p].length&&(J[Q]=c[p][A],Q+=1);return J},nr=function(a,f,e){for(var u=Y.getRSBlocks(a,f),o=G(),d=0;d<e.length;d+=1){var c=e[d];o.put(c.getMode(),4),o.put(c.getLength(),k.getLengthInBits(c.getMode(),a)),c.write(o)}for(var p=0,d=0;d<u.length;d+=1)p+=u[d].dataCount;if(o.getLengthInBits()>p*8)throw"code length overflow. ("+o.getLengthInBits()+">"+p*8+")";for(o.getLengthInBits()+4<=p*8&&o.put(0,4);o.getLengthInBits()%8!=0;)o.putBit(!1);for(;!(o.getLengthInBits()>=p*8||(o.put(g,8),o.getLengthInBits()>=p*8));)o.put(l,8);return H(o,u)};v.addData=function(a,f){f=f||"Byte";var e=null;switch(f){case"Numeric":e=$(a);break;case"Alphanumeric":e=W(a);break;case"Byte":e=V(a);break;case"Kanji":e=q(a);break;default:throw"mode:"+f}i.push(e),h=null},v.isDark=function(a,f){if(a<0||r<=a||f<0||r<=f)throw a+","+f;return t[a][f]},v.getModuleCount=function(){return r},v.make=function(){if(n<1){for(var a=1;a<40;a++){for(var f=Y.getRSBlocks(a,s),e=G(),u=0;u<i.length;u++){var o=i[u];e.put(o.getMode(),4),e.put(o.getLength(),k.getLengthInBits(o.getMode(),a)),o.write(e)}for(var d=0,u=0;u<f.length;u++)d+=f[u].dataCount;if(e.getLengthInBits()<=d*8)break}n=a}_(!1,y())},v.createTableTag=function(a,f){a=a||2,f=typeof f>"u"?a*4:f;var e="";e+='<table style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: "+f+"px;",e+='">',e+="<tbody>";for(var u=0;u<v.getModuleCount();u+=1){e+="<tr>";for(var o=0;o<v.getModuleCount();o+=1)e+='<td style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: 0px;",e+=" width: "+a+"px;",e+=" height: "+a+"px;",e+=" background-color: ",e+=v.isDark(u,o)?"#000000":"#ffffff",e+=";",e+='"/>';e+="</tr>"}return e+="</tbody>",e+="</table>",e},v.createSvgTag=function(a,f,e,u){var o={};typeof arguments[0]=="object"&&(o=arguments[0],a=o.cellSize,f=o.margin,e=o.alt,u=o.title),a=a||2,f=typeof f>"u"?a*4:f,e=typeof e=="string"?{text:e}:e||{},e.text=e.text||null,e.id=e.text?e.id||"qrcode-description":null,u=typeof u=="string"?{text:u}:u||{},u.text=u.text||null,u.id=u.text?u.id||"qrcode-title":null;var d=v.getModuleCount()*a+f*2,c,p,b,C,A="",R;for(R="l"+a+",0 0,"+a+" -"+a+",0 0,-"+a+"z ",A+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',A+=o.scalable?"":' width="'+d+'px" height="'+d+'px"',A+=' viewBox="0 0 '+d+" "+d+'" ',A+=' preserveAspectRatio="xMinYMin meet"',A+=u.text||e.text?' role="img" aria-labelledby="'+F([u.id,e.id].join(" ").trim())+'"':"",A+=">",A+=u.text?'<title id="'+F(u.id)+'">'+F(u.text)+"</title>":"",A+=e.text?'<description id="'+F(e.id)+'">'+F(e.text)+"</description>":"",A+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',A+='<path d="',b=0;b<v.getModuleCount();b+=1)for(C=b*a+f,c=0;c<v.getModuleCount();c+=1)v.isDark(b,c)&&(p=c*a+f,A+="M"+p+","+C+R);return A+='" stroke="transparent" fill="black"/>',A+="</svg>",A},v.createDataURL=function(a,f){a=a||2,f=typeof f>"u"?a*4:f;var e=v.getModuleCount()*a+f*2,u=f,o=e-f;return er(e,e,function(d,c){if(u<=d&&d<o&&u<=c&&c<o){var p=Math.floor((d-u)/a),b=Math.floor((c-u)/a);return v.isDark(b,p)?0:1}else return 1})},v.createImgTag=function(a,f,e){a=a||2,f=typeof f>"u"?a*4:f;var u=v.getModuleCount()*a+f*2,o="";return o+="<img",o+=' src="',o+=v.createDataURL(a,f),o+='"',o+=' width="',o+=u,o+='"',o+=' height="',o+=u,o+='"',e&&(o+=' alt="',o+=F(e),o+='"'),o+="/>",o};var F=function(a){for(var f="",e=0;e<a.length;e+=1){var u=a.charAt(e);switch(u){case"<":f+="&lt;";break;case">":f+="&gt;";break;case"&":f+="&amp;";break;case'"':f+="&quot;";break;default:f+=u;break}}return f},ar=function(a){var f=1;a=typeof a>"u"?f*2:a;var e=v.getModuleCount()*f+a*2,u=a,o=e-a,d,c,p,b,C,A={"\u2588\u2588":"\u2588","\u2588 ":"\u2580"," \u2588":"\u2584","  ":" "},R={"\u2588\u2588":"\u2580","\u2588 ":"\u2580"," \u2588":" ","  ":" "},I="";for(d=0;d<e;d+=2){for(p=Math.floor((d-u)/f),b=Math.floor((d+1-u)/f),c=0;c<e;c+=1)C="\u2588",u<=c&&c<o&&u<=d&&d<o&&v.isDark(p,Math.floor((c-u)/f))&&(C=" "),u<=c&&c<o&&u<=d+1&&d+1<o&&v.isDark(b,Math.floor((c-u)/f))?C+=" ":C+="\u2588",I+=a<1&&d+1>=o?R[C]:A[C];I+=`
`}return e%2&&a>0?I.substring(0,I.length-e-1)+Array(e+1).join("\u2580"):I.substring(0,I.length-1)};return v.createASCII=function(a,f){if(a=a||1,a<2)return ar(f);a-=1,f=typeof f>"u"?a*2:f;var e=v.getModuleCount()*a+f*2,u=f,o=e-f,d,c,p,b,C=Array(a+1).join("\u2588\u2588"),A=Array(a+1).join("  "),R="",I="";for(d=0;d<e;d+=1){for(p=Math.floor((d-u)/a),I="",c=0;c<e;c+=1)b=1,u<=c&&c<o&&u<=d&&d<o&&v.isDark(p,Math.floor((c-u)/a))&&(b=0),I+=b?C:A;for(p=0;p<a;p+=1)R+=I+`
`}return R.substring(0,R.length-1)},v.renderTo2dContext=function(a,f){f=f||2;for(var e=v.getModuleCount(),u=0;u<e;u++)for(var o=0;o<e;o++)a.fillStyle=v.isDark(u,o)?"black":"white",a.fillRect(o*f,u*f,f,f)},v};P.stringToBytesFuncs={default:function(x){for(var w=[],g=0;g<x.length;g+=1){var l=x.charCodeAt(g);w.push(l&255)}return w}},P.stringToBytes=P.stringToBytesFuncs.default,P.createStringToBytes=function(x,w){var g=(function(){for(var n=rr(x),s=function(){var T=n.read();if(T==-1)throw"eof";return T},t=0,r={};;){var h=n.read();if(h==-1)break;var i=s(),v=s(),_=s(),B=String.fromCharCode(h<<8|i),y=v<<8|_;r[B]=y,t+=1}if(t!=w)throw t+" != "+w;return r})(),l=63;return function(n){for(var s=[],t=0;t<n.length;t+=1){var r=n.charCodeAt(t);if(r<128)s.push(r);else{var h=g[n.charAt(t)];typeof h=="number"?(h&255)==h?s.push(h):(s.push(h>>>8),s.push(h&255)):s.push(l)}}return s}};var D={MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8},O={L:1,M:0,Q:3,H:2},L={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7},k=(function(){var x=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],w=1335,g=7973,l=21522,n={},s=function(t){for(var r=0;t!=0;)r+=1,t>>>=1;return r};return n.getBCHTypeInfo=function(t){for(var r=t<<10;s(r)-s(w)>=0;)r^=w<<s(r)-s(w);return(t<<10|r)^l},n.getBCHTypeNumber=function(t){for(var r=t<<12;s(r)-s(g)>=0;)r^=g<<s(r)-s(g);return t<<12|r},n.getPatternPosition=function(t){return x[t-1]},n.getMaskFunction=function(t){switch(t){case L.PATTERN000:return function(r,h){return(r+h)%2==0};case L.PATTERN001:return function(r,h){return r%2==0};case L.PATTERN010:return function(r,h){return h%3==0};case L.PATTERN011:return function(r,h){return(r+h)%3==0};case L.PATTERN100:return function(r,h){return(Math.floor(r/2)+Math.floor(h/3))%2==0};case L.PATTERN101:return function(r,h){return r*h%2+r*h%3==0};case L.PATTERN110:return function(r,h){return(r*h%2+r*h%3)%2==0};case L.PATTERN111:return function(r,h){return(r*h%3+(r+h)%2)%2==0};default:throw"bad maskPattern:"+t}},n.getErrorCorrectPolynomial=function(t){for(var r=K([1],0),h=0;h<t;h+=1)r=r.multiply(K([1,M.gexp(h)],0));return r},n.getLengthInBits=function(t,r){if(1<=r&&r<10)switch(t){case D.MODE_NUMBER:return 10;case D.MODE_ALPHA_NUM:return 9;case D.MODE_8BIT_BYTE:return 8;case D.MODE_KANJI:return 8;default:throw"mode:"+t}else if(r<27)switch(t){case D.MODE_NUMBER:return 12;case D.MODE_ALPHA_NUM:return 11;case D.MODE_8BIT_BYTE:return 16;case D.MODE_KANJI:return 10;default:throw"mode:"+t}else if(r<41)switch(t){case D.MODE_NUMBER:return 14;case D.MODE_ALPHA_NUM:return 13;case D.MODE_8BIT_BYTE:return 16;case D.MODE_KANJI:return 12;default:throw"mode:"+t}else throw"type:"+r},n.getLostPoint=function(t){for(var r=t.getModuleCount(),h=0,i=0;i<r;i+=1)for(var v=0;v<r;v+=1){for(var _=0,B=t.isDark(i,v),y=-1;y<=1;y+=1)if(!(i+y<0||r<=i+y))for(var T=-1;T<=1;T+=1)v+T<0||r<=v+T||y==0&&T==0||B==t.isDark(i+y,v+T)&&(_+=1);_>5&&(h+=3+_-5)}for(var i=0;i<r-1;i+=1)for(var v=0;v<r-1;v+=1){var E=0;t.isDark(i,v)&&(E+=1),t.isDark(i+1,v)&&(E+=1),t.isDark(i,v+1)&&(E+=1),t.isDark(i+1,v+1)&&(E+=1),(E==0||E==4)&&(h+=3)}for(var i=0;i<r;i+=1)for(var v=0;v<r-6;v+=1)t.isDark(i,v)&&!t.isDark(i,v+1)&&t.isDark(i,v+2)&&t.isDark(i,v+3)&&t.isDark(i,v+4)&&!t.isDark(i,v+5)&&t.isDark(i,v+6)&&(h+=40);for(var v=0;v<r;v+=1)for(var i=0;i<r-6;i+=1)t.isDark(i,v)&&!t.isDark(i+1,v)&&t.isDark(i+2,v)&&t.isDark(i+3,v)&&t.isDark(i+4,v)&&!t.isDark(i+5,v)&&t.isDark(i+6,v)&&(h+=40);for(var N=0,v=0;v<r;v+=1)for(var i=0;i<r;i+=1)t.isDark(i,v)&&(N+=1);var m=Math.abs(100*N/r/r-50)/5;return h+=m*10,h},n})(),M=(function(){for(var x=new Array(256),w=new Array(256),g=0;g<8;g+=1)x[g]=1<<g;for(var g=8;g<256;g+=1)x[g]=x[g-4]^x[g-5]^x[g-6]^x[g-8];for(var g=0;g<255;g+=1)w[x[g]]=g;var l={};return l.glog=function(n){if(n<1)throw"glog("+n+")";return w[n]},l.gexp=function(n){for(;n<0;)n+=255;for(;n>=256;)n-=255;return x[n]},l})();function K(x,w){if(typeof x.length>"u")throw x.length+"/"+w;var g=(function(){for(var n=0;n<x.length&&x[n]==0;)n+=1;for(var s=new Array(x.length-n+w),t=0;t<x.length-n;t+=1)s[t]=x[t+n];return s})(),l={};return l.getAt=function(n){return g[n]},l.getLength=function(){return g.length},l.multiply=function(n){for(var s=new Array(l.getLength()+n.getLength()-1),t=0;t<l.getLength();t+=1)for(var r=0;r<n.getLength();r+=1)s[t+r]^=M.gexp(M.glog(l.getAt(t))+M.glog(n.getAt(r)));return K(s,0)},l.mod=function(n){if(l.getLength()-n.getLength()<0)return l;for(var s=M.glog(l.getAt(0))-M.glog(n.getAt(0)),t=new Array(l.getLength()),r=0;r<l.getLength();r+=1)t[r]=l.getAt(r);for(var r=0;r<n.getLength();r+=1)t[r]^=M.gexp(M.glog(n.getAt(r))+s);return K(t,0).mod(n)},l}var Y=(function(){var x=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],w=function(n,s){var t={};return t.totalCount=n,t.dataCount=s,t},g={},l=function(n,s){switch(s){case O.L:return x[(n-1)*4+0];case O.M:return x[(n-1)*4+1];case O.Q:return x[(n-1)*4+2];case O.H:return x[(n-1)*4+3];default:return}};return g.getRSBlocks=function(n,s){var t=l(n,s);if(typeof t>"u")throw"bad rs block @ typeNumber:"+n+"/errorCorrectionLevel:"+s;for(var r=t.length/3,h=[],i=0;i<r;i+=1)for(var v=t[i*3+0],_=t[i*3+1],B=t[i*3+2],y=0;y<v;y+=1)h.push(w(_,B));return h},g})(),G=function(){var x=[],w=0,g={};return g.getBuffer=function(){return x},g.getAt=function(l){var n=Math.floor(l/8);return(x[n]>>>7-l%8&1)==1},g.put=function(l,n){for(var s=0;s<n;s+=1)g.putBit((l>>>n-s-1&1)==1)},g.getLengthInBits=function(){return w},g.putBit=function(l){var n=Math.floor(w/8);x.length<=n&&x.push(0),l&&(x[n]|=128>>>w%8),w+=1},g},$=function(x){var w=D.MODE_NUMBER,g=x,l={};l.getMode=function(){return w},l.getLength=function(t){return g.length},l.write=function(t){for(var r=g,h=0;h+2<r.length;)t.put(n(r.substring(h,h+3)),10),h+=3;h<r.length&&(r.length-h==1?t.put(n(r.substring(h,h+1)),4):r.length-h==2&&t.put(n(r.substring(h,h+2)),7))};var n=function(t){for(var r=0,h=0;h<t.length;h+=1)r=r*10+s(t.charAt(h));return r},s=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-48;throw"illegal char :"+t};return l},W=function(x){var w=D.MODE_ALPHA_NUM,g=x,l={};l.getMode=function(){return w},l.getLength=function(s){return g.length},l.write=function(s){for(var t=g,r=0;r+1<t.length;)s.put(n(t.charAt(r))*45+n(t.charAt(r+1)),11),r+=2;r<t.length&&s.put(n(t.charAt(r)),6)};var n=function(s){if("0"<=s&&s<="9")return s.charCodeAt(0)-48;if("A"<=s&&s<="Z")return s.charCodeAt(0)-65+10;switch(s){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+s}};return l},V=function(x){var w=D.MODE_8BIT_BYTE,g=x,l=P.stringToBytes(x),n={};return n.getMode=function(){return w},n.getLength=function(s){return l.length},n.write=function(s){for(var t=0;t<l.length;t+=1)s.put(l[t],8)},n},q=function(x){var w=D.MODE_KANJI,g=x,l=P.stringToBytesFuncs.SJIS;if(!l)throw"sjis not supported.";(function(t,r){var h=l(t);if(h.length!=2||(h[0]<<8|h[1])!=r)throw"sjis not supported."})("\u53CB",38726);var n=l(x),s={};return s.getMode=function(){return w},s.getLength=function(t){return~~(n.length/2)},s.write=function(t){for(var r=n,h=0;h+1<r.length;){var i=(255&r[h])<<8|255&r[h+1];if(33088<=i&&i<=40956)i-=33088;else if(57408<=i&&i<=60351)i-=49472;else throw"illegal char at "+(h+1)+"/"+i;i=(i>>>8&255)*192+(i&255),t.put(i,13),h+=2}if(h<r.length)throw"illegal char at "+(h+1)},s},j=function(){var x=[],w={};return w.writeByte=function(g){x.push(g&255)},w.writeShort=function(g){w.writeByte(g),w.writeByte(g>>>8)},w.writeBytes=function(g,l,n){l=l||0,n=n||g.length;for(var s=0;s<n;s+=1)w.writeByte(g[s+l])},w.writeString=function(g){for(var l=0;l<g.length;l+=1)w.writeByte(g.charCodeAt(l))},w.toByteArray=function(){return x},w.toString=function(){var g="";g+="[";for(var l=0;l<x.length;l+=1)l>0&&(g+=","),g+=x[l];return g+="]",g},w},z=function(){var x=0,w=0,g=0,l="",n={},s=function(r){l+=String.fromCharCode(t(r&63))},t=function(r){if(!(r<0)){if(r<26)return 65+r;if(r<52)return 97+(r-26);if(r<62)return 48+(r-52);if(r==62)return 43;if(r==63)return 47}throw"n:"+r};return n.writeByte=function(r){for(x=x<<8|r&255,w+=8,g+=1;w>=6;)s(x>>>w-6),w-=6},n.flush=function(){if(w>0&&(s(x<<6-w),x=0,w=0),g%3!=0)for(var r=3-g%3,h=0;h<r;h+=1)l+="="},n.toString=function(){return l},n},rr=function(x){var w=x,g=0,l=0,n=0,s={};s.read=function(){for(;n<8;){if(g>=w.length){if(n==0)return-1;throw"unexpected end of file./"+n}var r=w.charAt(g);if(g+=1,r=="=")return n=0,-1;if(r.match(/^\s$/))continue;l=l<<6|t(r.charCodeAt(0)),n+=6}var h=l>>>n-8&255;return n-=8,h};var t=function(r){if(65<=r&&r<=90)return r-65;if(97<=r&&r<=122)return r-97+26;if(48<=r&&r<=57)return r-48+52;if(r==43)return 62;if(r==47)return 63;throw"c:"+r};return s},tr=function(x,w){var g=x,l=w,n=new Array(x*w),s={};s.setPixel=function(i,v,_){n[v*g+i]=_},s.write=function(i){i.writeString("GIF87a"),i.writeShort(g),i.writeShort(l),i.writeByte(128),i.writeByte(0),i.writeByte(0),i.writeByte(0),i.writeByte(0),i.writeByte(0),i.writeByte(255),i.writeByte(255),i.writeByte(255),i.writeString(","),i.writeShort(0),i.writeShort(0),i.writeShort(g),i.writeShort(l),i.writeByte(0);var v=2,_=r(v);i.writeByte(v);for(var B=0;_.length-B>255;)i.writeByte(255),i.writeBytes(_,B,255),B+=255;i.writeByte(_.length-B),i.writeBytes(_,B,_.length-B),i.writeByte(0),i.writeString(";")};var t=function(i){var v=i,_=0,B=0,y={};return y.write=function(T,E){if(T>>>E)throw"length over";for(;_+E>=8;)v.writeByte(255&(T<<_|B)),E-=8-_,T>>>=8-_,B=0,_=0;B=T<<_|B,_=_+E},y.flush=function(){_>0&&v.writeByte(B)},y},r=function(i){for(var v=1<<i,_=(1<<i)+1,B=i+1,y=h(),T=0;T<v;T+=1)y.add(String.fromCharCode(T));y.add(String.fromCharCode(v)),y.add(String.fromCharCode(_));var E=j(),N=t(E);N.write(v,B);var m=0,U=String.fromCharCode(n[m]);for(m+=1;m<n.length;){var H=String.fromCharCode(n[m]);m+=1,y.contains(U+H)?U=U+H:(N.write(y.indexOf(U),B),y.size()<4095&&(y.size()==1<<B&&(B+=1),y.add(U+H)),U=H)}return N.write(y.indexOf(U),B),N.write(_,B),N.flush(),E.toByteArray()},h=function(){var i={},v=0,_={};return _.add=function(B){if(_.contains(B))throw"dup key:"+B;i[B]=v,v+=1},_.size=function(){return v},_.indexOf=function(B){return i[B]},_.contains=function(B){return typeof i[B]<"u"},_};return s},er=function(x,w,g){for(var l=tr(x,w),n=0;n<w;n+=1)for(var s=0;s<x;s+=1)l.setPixel(s,n,g(s,n));var t=j();l.write(t);for(var r=z(),h=t.toByteArray(),i=0;i<h.length;i+=1)r.writeByte(h[i]);return r.flush(),"data:image/gif;base64,"+r};return P})();(function(){qrcode.stringToBytesFuncs["UTF-8"]=function(P){function D(O){for(var L=[],k=0;k<O.length;k++){var M=O.charCodeAt(k);M<128?L.push(M):M<2048?L.push(192|M>>6,128|M&63):M<55296||M>=57344?L.push(224|M>>12,128|M>>6&63,128|M&63):(k++,M=65536+((M&1023)<<10|O.charCodeAt(k)&1023),L.push(240|M>>18,128|M>>12&63,128|M>>6&63,128|M&63))}return L}return D(P)}})(),(function(P){typeof define=="function"&&define.amd?define([],P):typeof exports=="object"&&(module.exports=P())})(function(){return qrcode});

/* ============================================================
   부비 공유 카드 (BoobiShare)
   - 스토리 1080×1920 / 피드 1080×1350 PNG를 Canvas로 생성
   - QR = 캘린더 딥링크(UTM) · Web Share API Level 2 + 다운로드 폴백
   - 사용: BoobiShare.open(item)  // item = cheongyak json의 items[i]
   ============================================================ */

var C={mint:'#2AC1BC',teal:'#20A6A2',forest:'#0D2A29',bg:'#F0FAF8',sub:'#547471',
line:'#DCEEEC',oL:'#FFF3EC',oB:'#FFD8C2',oD:'#C2410C',white:'#FFFFFF',mintL:'#EAFAF8'};
var FONT="'Wanted Sans Variable','Wanted Sans','Pretendard Variable',Pretendard,-apple-system,'Malgun Gothic',sans-serif";
var SITE='https://boobi.ai.kr';

function parseD(s){ if(!s) return null; var t=String(s).replace(/[^0-9]/g,''); if(t.length<8) return null;
  return new Date(+t.slice(0,4),+t.slice(4,6)-1,+t.slice(6,8)); }
function today(){ var d=new Date(); d.setHours(0,0,0,0); return d; }
function fmtMD(d){ if(!d) return '-'; return (d.getMonth()+1)+'/'+d.getDate()+'('+'일월화수목금토'.charAt(d.getDay())+')'; }
function days(a,b){ return Math.round((b-a)/864e5); }

function stateOf(it){
  var t=today(), s=parseD(it.rcritStart), e=parseD(it.rcritEnd)||s, w=parseD(it.winnerDate);
  if(e && t<=e){ if(s && t<s) return {s:'soon',n:days(t,s)}; return {s:'open',n:days(t,e)}; }
  if(w && t<=w) return {s:'wait',n:days(t,w)};
  return {s:'done',n:0};
}
function headline(it){
  var st=stateOf(it), s=parseD(it.rcritStart), e=parseD(it.rcritEnd)||s;
  var oneday=s&&e&&s.getTime()===e.getTime();
  var range=oneday?(fmtMD(s)+' 하루만!'):(fmtMD(s)+' ~ '+fmtMD(e));
  if(st.s==='soon') return {label:'청약 접수까지', big:st.n===0?'D-DAY':'D-'+st.n, sub:'접수 '+range};
  if(st.s==='open') return {label:'접수 마감까지', big:st.n===0?'D-DAY':'D-'+st.n, sub:st.n===0?'오늘까지 접수!':'접수 '+range};
  if(st.s==='wait') return {label:'당첨자 발표까지', big:st.n===0?'D-DAY':'D-'+st.n, sub:'발표 '+fmtMD(parseD(it.winnerDate))};
  return {label:'', big:'일정 종료', sub:'다음 기회를 노려보세요'};
}
function utmLink(it,kind){
  return SITE+'/calendar.html?utm_source='+(kind==='feed'?'feed':'story')+
    '&utm_medium=share&utm_campaign='+encodeURIComponent(it.id||'boobi');
}

/* ---------- canvas helpers ---------- */
function rr(ctx,x,y,w,h,r){ ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function wrap(ctx,text,maxW,maxLines){
  var t=String(text||'').replace(/\s+/g,' ').trim(), lines=[], cur='';
  for(var i=0;i<t.length;i++){ var ch=t.charAt(i);
    if(ctx.measureText(cur+ch).width>maxW && cur){ lines.push(cur); cur=ch===' '?'':ch;
      if(lines.length===maxLines) break; } else cur+=ch; }
  if(lines.length<maxLines && cur) lines.push(cur);
  else if(lines.length===maxLines && (cur||i<t.length)){
    var last=lines[maxLines-1];
    while(last && ctx.measureText(last+'…').width>maxW) last=last.slice(0,-1);
    lines[maxLines-1]=last+'…'; }
  return lines;
}
function pill(ctx,text,x,y,h,font,bg,fg,stroke){
  ctx.font=font; var pw=ctx.measureText(text).width, w=pw+h*0.9;
  rr(ctx,x,y,w,h,h/2);
  if(bg){ ctx.fillStyle=bg; ctx.fill(); }
  if(stroke){ ctx.strokeStyle=stroke; ctx.lineWidth=2.5; ctx.stroke(); }
  ctx.fillStyle=fg; ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText(text,x+h*0.45,y+h/2+2); return w;
}
function drawQR(ctx,text,x,y,size,dark){
  var qr=qrcode(0,'M'); qr.addData(text); qr.make();
  var n=qr.getModuleCount(), cs=size/n;
  ctx.fillStyle=dark||C.forest;
  for(var r=0;r<n;r++) for(var c=0;c<n;c++) if(qr.isDark(r,c))
    ctx.fillRect(x+c*cs, y+r*cs, cs+0.55, cs+0.55);
}
function drawRing(ctx,logo,x,y,size){ // 로고 이미지, 실패 시 링 직접 그리기
  if(logo){ ctx.drawImage(logo,x,y,size,size); return; }
  var g=ctx.createLinearGradient(x,y,x,y+size);
  g.addColorStop(0,'#8FE9E4'); g.addColorStop(1,'#1B918D');
  ctx.beginPath(); ctx.arc(x+size/2,y+size/2,size*0.34,0,Math.PI*2);
  ctx.strokeStyle=g; ctx.lineWidth=size*0.2; ctx.stroke();
}
function deco(ctx,W,H){ // 배경 장식
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=0.55;
  var g1=ctx.createRadialGradient(W-60,90,0,W-60,90,W*0.42);
  g1.addColorStop(0,'#CFF3F0'); g1.addColorStop(1,'rgba(240,250,248,0)');
  ctx.fillStyle=g1; ctx.fillRect(0,0,W,H*0.4);
  var g2=ctx.createRadialGradient(40,H-60,0,40,H-60,W*0.36);
  g2.addColorStop(0,'#D8F5EF'); g2.addColorStop(1,'rgba(240,250,248,0)');
  ctx.fillStyle=g2; ctx.fillRect(0,H*0.55,W,H*0.45);
  ctx.globalAlpha=1;
}
function badges(ctx,it,x,y,h,fs){
  var f='800 '+fs+'px '+FONT, gap=Math.round(h*0.22);
  if(it.hot){ var g=ctx.createLinearGradient(x,y,x+200,y+h);
    g.addColorStop(0,'#FF7A45'); g.addColorStop(1,'#FF4D4F');
    x+=pill(ctx,'🔥 확정차익',x,y,h,f,g,'#fff')+gap; }
  if(it.type) x+=pill(ctx,it.type,x,y,h,f,C.forest,'#fff')+gap;
  if(it.region) x+=pill(ctx,it.region,x,y,h,f,'#fff',C.teal,C.mint)+gap;
  return x;
}
function footerCard(ctx,it,kind,logo,x,y,w,h){ // 하단 부비 브랜딩 + QR
  rr(ctx,x,y,w,h,28); ctx.fillStyle='#fff'; ctx.fill();
  ctx.strokeStyle=C.line; ctx.lineWidth=2; ctx.stroke();
  var qs=Math.round(h*0.74), qx=x+w-qs-Math.round(h*0.13), qy=y+Math.round((h-qs)/2)-8;
  drawQR(ctx,utmLink(it,kind),qx,qy,qs);
  ctx.font='700 '+Math.round(h*0.088)+'px '+FONT; ctx.fillStyle=C.sub;
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('QR 찍으면 캘린더로',qx+qs/2,qy+qs+10);
  var ls=Math.round(h*0.30), lx=x+Math.round(h*0.16), ly=y+Math.round(h*0.16);
  drawRing(ctx,logo,lx,ly,ls);
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.font='900 '+Math.round(h*0.21)+'px '+FONT; ctx.fillStyle=C.forest;
  ctx.fillText('boobi.ai.kr',lx+ls+18,ly+ls/2+2);
  ctx.font='500 '+Math.round(h*0.105)+'px '+FONT; ctx.fillStyle=C.sub;
  ctx.fillText('청약 일정, 부비가 챙겨드려요 📅',lx,ly+ls+Math.round(h*0.17));
}

/* ---------- 스토리 1080×1920 ---------- */
function drawStory(it,logo){
  var W=1080,H=1920,cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var ctx=cv.getContext('2d'); deco(ctx,W,H);
  var X=80, CW=W-160;
  // 헤더 (상단 안전영역 아래)
  drawRing(ctx,logo,X,196,72);
  ctx.font='700 40px '+FONT; ctx.fillStyle=C.forest; ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText('부비',X+88,232);
  ctx.font='500 32px '+FONT; ctx.fillStyle=C.sub;
  ctx.fillText('부동산 비서',X+88+ctx.measureText('부비').width+58,234);
  var y=320; badges(ctx,it,X,y,64,32);
  // 단지명
  y+=110; ctx.font='800 70px '+FONT; ctx.fillStyle=C.forest; ctx.textBaseline='alphabetic';
  var nameLines=wrap(ctx,it.name,CW,3);
  nameLines.forEach(function(ln){ ctx.textAlign='left'; ctx.fillText(ln,X,y+58); y+=92; });
  y+=26;
  // D-day 카드
  var hd=headlineCache; // set by open()
  var dh=308; rr(ctx,X,y,CW,dh,30); ctx.fillStyle='#fff'; ctx.fill();
  ctx.strokeStyle=C.line; ctx.lineWidth=2; ctx.stroke();
  ctx.textAlign='center';
  if(hd.label){ ctx.font='700 38px '+FONT; ctx.fillStyle=C.sub; ctx.fillText(hd.label,W/2,y+70); }
  ctx.font='900 150px '+FONT; ctx.fillStyle=it.hot?C.oD:C.teal;
  ctx.fillText(hd.big,W/2,y+(hd.label?208:180));
  ctx.font='700 40px '+FONT; ctx.fillStyle=C.forest;
  ctx.fillText(hd.sub,W/2,y+272);
  y+=dh+22;
  // 발표일 줄 (D-day 카드가 발표 기준이 아닐 때)
  var w=parseD(it.winnerDate), st=stateOf(it);
  if(w && st.s!=='wait' && st.s!=='done'){
    ctx.font='600 36px '+FONT; ctx.fillStyle=C.sub; ctx.textAlign='center';
    ctx.fillText('🗓️ 당첨자 발표 '+fmtMD(w),W/2,y+30); y+=76; }
  // 안전마진
  if(it.margin){
    var mh=104; rr(ctx,X,y,CW,mh,24); ctx.fillStyle=C.oL; ctx.fill();
    ctx.strokeStyle=C.oB; ctx.lineWidth=2.5; ctx.stroke();
    ctx.font='800 46px '+FONT; ctx.fillStyle=C.oD; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('💰 '+it.margin,W/2,y+mh/2+2); ctx.textBaseline='alphabetic';
    y+=mh+22; }
  // 자격·분양가 요약(note)
  if(it.note){
    ctx.font='500 34px '+FONT;
    var nl=wrap(ctx,it.note,CW-72,3), nh=nl.length*50+52;
    rr(ctx,X,y,CW,nh,24); ctx.fillStyle='#fff'; ctx.fill();
    ctx.strokeStyle=C.line; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#33514f'; ctx.textAlign='left';
    nl.forEach(function(ln,i){ ctx.fillText(ln,X+36,y+62+i*50); });
  }
  // 하단 브랜딩+QR (하단 안전영역 위)
  footerCard(ctx,it,'story',logo,X,1414,CW,296);
  ctx.font='500 27px '+FONT; ctx.fillStyle=C.sub; ctx.textAlign='center';
  ctx.fillText('신청 전 공고문 원문을 꼭 확인하세요 · 데이터: 청약홈',W/2,1758);
  return cv;
}

/* ---------- 피드 1080×1350 ---------- */
function drawFeed(it,logo){
  var W=1080,H=1350,cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var ctx=cv.getContext('2d'); deco(ctx,W,H);
  var X=76, CW=W-152;
  drawRing(ctx,logo,X,72,60);
  ctx.font='700 34px '+FONT; ctx.fillStyle=C.forest; ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText('부비',X+74,102);
  ctx.font='500 28px '+FONT; ctx.fillStyle=C.sub;
  ctx.fillText('부동산 비서',X+74+ctx.measureText('부비').width+52,104);
  ctx.font='700 30px '+FONT; ctx.fillStyle=C.teal; ctx.textAlign='right';
  ctx.fillText('@boobi.ai.kr',W-X,104);
  var y=176; badges(ctx,it,X,y,58,29);
  y+=96; ctx.font='800 60px '+FONT; ctx.fillStyle=C.forest; ctx.textBaseline='alphabetic'; ctx.textAlign='left';
  var nameLines=wrap(ctx,it.name,CW,2);
  nameLines.forEach(function(ln){ ctx.fillText(ln,X,y+50); y+=80; });
  y+=20;
  // D-day 가로형 카드
  var hd=headlineCache, dh=210;
  rr(ctx,X,y,CW,dh,28); ctx.fillStyle='#fff'; ctx.fill();
  ctx.strokeStyle=C.line; ctx.lineWidth=2; ctx.stroke();
  ctx.textAlign='left';
  ctx.font='700 30px '+FONT; ctx.fillStyle=C.sub; ctx.fillText(hd.label||'청약 일정',X+44,y+66);
  ctx.font='900 104px '+FONT; ctx.fillStyle=it.hot?C.oD:C.teal; ctx.fillText(hd.big,X+44,y+168);
  var s=parseD(it.rcritStart), e=parseD(it.rcritEnd)||s, w=parseD(it.winnerDate);
  var rx=X+CW-44;
  var v1=s?(s.getTime()===(e&&e.getTime())?fmtMD(s)+' 하루만':fmtMD(s)+'~'+fmtMD(e)):'';
  var v2=w?fmtMD(w):'';
  ctx.font='800 34px '+FONT;
  var vw=Math.max(v1?ctx.measureText(v1).width:0, v2?ctx.measureText(v2).width:0);
  var lx=rx-vw-28; ctx.textAlign='right';
  ctx.font='600 30px '+FONT; ctx.fillStyle=C.sub;
  if(v1) ctx.fillText('접수',lx,y+86);
  if(v2) ctx.fillText('발표',lx,y+150);
  ctx.font='800 34px '+FONT; ctx.fillStyle=C.forest;
  if(v1) ctx.fillText(v1,rx,y+86);
  if(v2) ctx.fillText(v2,rx,y+150);
  y+=dh+20;
  if(it.margin){
    var mh=92; rr(ctx,X,y,CW,mh,22); ctx.fillStyle=C.oL; ctx.fill();
    ctx.strokeStyle=C.oB; ctx.lineWidth=2.5; ctx.stroke();
    ctx.font='800 42px '+FONT; ctx.fillStyle=C.oD; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('💰 '+it.margin,W/2,y+mh/2+2); ctx.textBaseline='alphabetic';
    y+=mh+20; }
  if(it.note){
    ctx.font='500 31px '+FONT;
    var nl=wrap(ctx,it.note,CW-64,2), nh=nl.length*46+44;
    rr(ctx,X,y,CW,nh,22); ctx.fillStyle='#fff'; ctx.fill();
    ctx.strokeStyle=C.line; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#33514f'; ctx.textAlign='left';
    nl.forEach(function(ln,i){ ctx.fillText(ln,X+32,y+56+i*46); });
  }
  footerCard(ctx,it,'feed',logo,X,1036,CW,270);
  return cv;
}

/* ---------- 캡션 (피드 게시물용) ---------- */
function caption(it){
  var st=stateOf(it), hd=headline(it);
  var s=parseD(it.rcritStart), e=parseD(it.rcritEnd)||s, w=parseD(it.winnerDate);
  var oneday=s&&e&&s.getTime()===e.getTime();
  var L=[];
  L.push((it.hot?'🔥 ':'')+(it.region?it.region+' ':'')+(it.type||'청약')+(it.hot?' 확정차익 줍줍 떴어요!':' 공고 나왔어요!'));
  L.push('');
  L.push('🏠 '+(it.name||''));
  if(s) L.push('📅 접수: '+(oneday?fmtMD(s)+' 하루만!':fmtMD(s)+' ~ '+fmtMD(e)));
  if(w) L.push('🎯 발표: '+fmtMD(w));
  if(it.margin) L.push('💰 '+it.margin);
  if(it.note) L.push('📋 '+it.note);
  L.push('');
  L.push('⚠️ 신청 전 공고문 원문을 꼭 확인하세요.');
  L.push('📲 청약 일정 놓치기 싫다면? 프로필 링크 → boobi.ai.kr');
  L.push('');
  var tags=['#청약','#줍줍','#무순위청약','#부동산','#내집마련','#청약홈','#아파트','#부비'];
  if(it.region) tags.unshift('#'+it.region+'청약');
  L.push(tags.join(' '));
  return L.join('\n');
}

/* ---------- 리소스 로드 ---------- */
function loadLogo(){ return new Promise(function(res){
  var im=new Image(); im.onload=function(){res(im);}; im.onerror=function(){res(null);};
  im.src='/boobi-ring-3d.png'; }); }
function loadFonts(){
  if(!document.fonts||!document.fonts.load) return Promise.resolve();
  var wants=['500 34px','700 40px','800 70px','900 150px'].map(function(f){
    return document.fonts.load(f+' '+FONT,'부비 D-8 boobi').catch(function(){}); });
  return Promise.race([Promise.all(wants),new Promise(function(r){setTimeout(r,1800);})]);
}

/* ---------- 모달 UI ---------- */
var CSS='.bs-ov{position:fixed;inset:0;background:rgba(13,42,41,.55);z-index:99990;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(3px)}'+
'@media(min-width:640px){.bs-ov{align-items:center}}'+
'.bs-m{background:#fff;border-radius:22px 22px 0 0;max-width:430px;width:100%;max-height:92vh;overflow:auto;padding:18px 18px 22px;box-shadow:0 -8px 40px rgba(0,0,0,.18);font-family:'+FONT+'}'+
'@media(min-width:640px){.bs-m{border-radius:22px}}'+
'.bs-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}'+
'.bs-h b{font-size:1.02rem;color:#0D2A29}'+
'.bs-x{border:none;background:#F0F5F4;border-radius:50%;width:32px;height:32px;font-size:.95rem;cursor:pointer;color:#547471}'+
'.bs-tabs{display:flex;gap:8px;margin-bottom:12px}'+
'.bs-tab{flex:1;padding:9px 0;border-radius:11px;border:1.5px solid #DCEEEC;background:#fff;font-size:.86rem;font-weight:700;color:#547471;cursor:pointer;font-family:inherit}'+
'.bs-tab.on{border-color:#2AC1BC;background:#E5F8F6;color:#127c78}'+
'.bs-p{text-align:center;background:#F0FAF8;border-radius:14px;padding:10px;min-height:200px;display:flex;align-items:center;justify-content:center}'+
'.bs-p img{max-width:100%;max-height:52vh;border-radius:10px;box-shadow:0 4px 18px rgba(13,42,41,.14)}'+
'.bs-sp{color:#547471;font-size:.85rem}'+
'.bs-hint{font-size:.78rem;color:#547471;line-height:1.55;background:#F7FBFA;border:1px solid #E4F1EF;border-radius:11px;padding:9px 12px;margin:11px 0}'+
'.bs-hint b{color:#127c78}'+
'.bs-btns{display:flex;flex-direction:column;gap:8px}'+
'.bs-main{width:100%;padding:13px 0;border:none;border-radius:12px;background:#20A6A2;color:#fff;font-size:.95rem;font-weight:800;cursor:pointer;font-family:inherit}'+
'.bs-main:active{background:#159086}'+
'.bs-row{display:flex;gap:8px}'+
'.bs-sub{flex:1;padding:11px 0;border:1.5px solid #DCEEEC;border-radius:12px;background:#fff;color:#20A6A2;font-size:.85rem;font-weight:700;cursor:pointer;font-family:inherit}'+
'.bs-sub:active{background:#EFFAF9}'+
'.bs-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#0D2A29;color:#fff;font-size:.84rem;font-weight:600;padding:11px 18px;border-radius:999px;z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.25);font-family:'+FONT+'}';

var headlineCache=null, cache={}, curItem=null, curKind='story', ov=null;

function ensureCSS(){ if(document.getElementById('bs-css')) return;
  var st=document.createElement('style'); st.id='bs-css'; st.textContent=CSS;
  document.head.appendChild(st); }
function ga(name,p){ if(window.gtag){ try{ gtag('event',name,p||{}); }catch(e){} } }
function toast(msg){ var t=document.createElement('div'); t.className='bs-toast'; t.textContent=msg;
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2400); }
function canFileShare(){
  try{ var f=new File(['x'],'x.png',{type:'image/png'});
    return !!(navigator.canShare && navigator.canShare({files:[f]})); }catch(e){ return false; } }

function fileName(kind){ return 'boobi-'+kind+'-'+(curItem.id||'card')+'.png'; }
function toBlob(cv){ return new Promise(function(res){
  if(cv.toBlob) cv.toBlob(res,'image/png'); else {
    var b=atob(cv.toDataURL('image/png').split(',')[1]), a=new Uint8Array(b.length);
    for(var i=0;i<b.length;i++) a[i]=b.charCodeAt(i);
    res(new Blob([a],{type:'image/png'})); } }); }

function doDownload(){ var cv=cache[curKind]; if(!cv) return;
  var a=document.createElement('a'); a.download=fileName(curKind);
  a.href=cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
  ga('share_card_download',{campaign:curItem.id,kind:curKind});
  toast('이미지가 저장됐어요! 인스타에 올려주세요 📸'); }
function doShare(){ var cv=cache[curKind]; if(!cv) return;
  toBlob(cv).then(function(blob){
    var f=new File([blob],fileName(curKind),{type:'image/png'});
    if(navigator.canShare && navigator.canShare({files:[f]})){
      navigator.share({files:[f],title:'부비 청약 카드',
        text:(curItem.name||'')+' 청약 일정 · '+utmLink(curItem,curKind)})
      .then(function(){ ga('share_card_share',{campaign:curItem.id,kind:curKind}); })
      .catch(function(err){ if(err && err.name!=='AbortError') doDownload(); });
    } else doDownload(); }); }
function doCopy(text,msg){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){toast(msg);},function(){legacyCopy(text,msg);});
  } else legacyCopy(text,msg); }
function legacyCopy(text,msg){ var ta=document.createElement('textarea'); ta.value=text;
  ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta);
  ta.select(); try{ document.execCommand('copy'); toast(msg); }catch(e){ toast('복사에 실패했어요 😢'); }
  ta.remove(); }

function hintHTML(kind){
  return kind==='story'
   ? '💡 스토리는 이미지에 링크가 안 들어가요. 카드 속 <b>QR</b>이 부비 캘린더로 연결되고, 업로드할 때 <b>링크 스티커</b>까지 붙이면 유입이 더 좋아져요.'
   : '💡 인스타 <b>피드 업로드용 4:5 카드</b>예요. 아래 <b>캡션 복사</b>를 누르면 게시물 문구+해시태그가 복사돼요. 프로필 링크는 boobi.ai.kr로!'; }

function renderKind(kind){
  curKind=kind; var p=ov.querySelector('.bs-p');
  ov.querySelectorAll('.bs-tab').forEach(function(b){ b.classList.toggle('on',b.dataset.k===kind); });
  ov.querySelector('.bs-hint').innerHTML=hintHTML(kind);
  ov.querySelector('.bs-cap').style.display=kind==='feed'?'':'none';
  if(cache[kind]){ p.innerHTML='<img alt="공유 카드 미리보기">';
    p.querySelector('img').src=cache[kind].toDataURL('image/png'); return; }
  p.innerHTML='<span class="bs-sp">카드 만드는 중… 🎨</span>';
  Promise.all([loadFonts(),logoP]).then(function(res){
    headlineCache=headline(curItem);
    var cv=(kind==='story'?drawStory:drawFeed)(curItem,res[1]);
    cache[kind]=cv;
    if(curKind===kind){ p.innerHTML='<img alt="공유 카드 미리보기">';
      p.querySelector('img').src=cv.toDataURL('image/png'); } }); }

var logoP=null;
function open(item){
  if(!item) return; ensureCSS();
  curItem=item; cache={}; curKind='story';
  if(!logoP) logoP=loadLogo();
  if(ov) ov.remove();
  ov=document.createElement('div'); ov.className='bs-ov';
  var fs=canFileShare();
  ov.innerHTML='<div class="bs-m">'+
   '<div class="bs-h"><b>📤 공유 카드</b><button class="bs-x" aria-label="닫기">✕</button></div>'+
   '<div class="bs-tabs"><button class="bs-tab on" data-k="story">스토리 9:16</button>'+
   '<button class="bs-tab" data-k="feed">피드 4:5</button></div>'+
   '<div class="bs-p"><span class="bs-sp">카드 만드는 중… 🎨</span></div>'+
   '<div class="bs-hint"></div>'+
   '<div class="bs-btns">'+
    '<button class="bs-main">'+(fs?'📤 인스타에 공유하기':'⬇️ 이미지 저장하기')+'</button>'+
    '<div class="bs-row">'+
     (fs?'<button class="bs-sub bs-dl">⬇️ 저장</button>':'')+
     '<button class="bs-sub bs-link">🔗 링크 복사</button>'+
     '<button class="bs-sub bs-cap" style="display:none">📋 캡션 복사</button>'+
    '</div></div></div>';
  document.body.appendChild(ov);
  ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
  ov.querySelector('.bs-x').onclick=close;
  ov.querySelectorAll('.bs-tab').forEach(function(b){ b.onclick=function(){ renderKind(b.dataset.k); }; });
  ov.querySelector('.bs-main').onclick=fs?doShare:doDownload;
  var dl=ov.querySelector('.bs-dl'); if(dl) dl.onclick=doDownload;
  ov.querySelector('.bs-link').onclick=function(){ doCopy(utmLink(curItem,curKind),'링크를 복사했어요 🔗'); };
  ov.querySelector('.bs-cap').onclick=function(){ doCopy(caption(curItem),'캡션을 복사했어요 📋'); };
  document.addEventListener('keydown',escClose);
  ga('share_card_open',{campaign:item.id});
  renderKind('story');
}
function escClose(e){ if(e.key==='Escape') close(); }
function close(){ if(ov){ ov.remove(); ov=null; } document.removeEventListener('keydown',escClose); }

window.BoobiShare={open:open,caption:caption,link:utmLink};
})();
