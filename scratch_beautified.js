import{
  r as Mn,ah as Sa,a as Ca,b as v,j as e,aq as We,X as gt,ar as An,a6 as Hn,as as Ln,at as Dn,E as Ft,a1 as En,R as On,af as et,h as Mt,i as ss,au as ns,x as Ze,av as Bn,P as Wt,M as Ta,g as _a,W as Pa,I as Ot,t as Ia,aw as nn,ax as ft,p as Ma,an as Ss,A as Aa,m as lt,_ as Ha,q as an,ay as rn,az as mt,C as Cs,u as ln,a8 as Ts,aA as La,y as Da
}from"./vendor-Cs7Xc2MG.js";
import{
  r as as,u as Ie,w as Bt
}from"./xlsx-BBWTpfDg.js";
import{
  u as Kt,b as $s,s as He,f as xt,a as Ea,S as ne
}from"./index-DDIoncBB.js";
import{
  t as rs
}from"./index-Br7REqB6.js";
import{
  u as Rn
}from"./useRealtimeData-ZwpTQZq7.js";
var St={
  
},_s={
  exports:{
    
  }
},Ps,on;
function Oa(){
  if(on)return Ps;
  on=1;
  var t="SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";
  return Ps=t,Ps
}var Is,cn;
function Ba(){
  if(cn)return Is;
  cn=1;
  var t=Oa();
  function r(){
    
  }function n(){
    
  }return n.resetWarningCache=r,Is=function(){
    function a(x,u,m,d,h,N){
      if(N!==t){
        var y=new Error("Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types");
        throw y.name="Invariant Violation",y
      }
    }a.isRequired=a;
    function o(){
      return a
    }var i={
      array:a,bigint:a,bool:a,func:a,number:a,object:a,string:a,symbol:a,any:a,arrayOf:o,element:a,elementType:a,instanceOf:o,node:a,objectOf:o,oneOf:o,oneOfType:o,shape:o,exact:o,checkPropTypes:n,resetWarningCache:r
    };
    return i.PropTypes=i,i
  },Is
}var dn;
function zn(){
  return dn||(dn=1,_s.exports=Ba()()),_s.exports
}var Ms,xn;
function Gn(){
  return xn||(xn=1,Ms={
    L:1,M:0,Q:3,H:2
  }),Ms
}var As,hn;
function $n(){
  return hn||(hn=1,As={
    MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8
  }),As
}var Hs,un;
function Ra(){
  if(un)return Hs;
  un=1;
  var t=$n();
  function r(n){
    this.mode=t.MODE_8BIT_BYTE,this.data=n
  }return r.prototype={
    getLength:function(n){
      return this.data.length
    },write:function(n){
      for(var a=0;
      a<this.data.length;
      a++)n.put(this.data.charCodeAt(a),8)
    }
  },Hs=r,Hs
}var Ls,mn;
function za(){
  if(mn)return Ls;
  mn=1;
  var t=Gn();
  function r(n,a){
    this.totalCount=n,this.dataCount=a
  }return r.RS_BLOCK_TABLE=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],r.getRSBlocks=function(n,a){
    var o=r.getRsBlockTable(n,a);
    if(o==null)throw new Error("bad rs block @ typeNumber:"+n+"/errorCorrectLevel:"+a);
    for(var i=o.length/3,x=new Array,u=0;
    u<i;
    u++)for(var m=o[u*3+0],d=o[u*3+1],h=o[u*3+2],N=0;
    N<m;
    N++)x.push(new r(d,h));
    return x
  },r.getRsBlockTable=function(n,a){
    switch(a){
      case t.L:return r.RS_BLOCK_TABLE[(n-1)*4+0];
      case t.M:return r.RS_BLOCK_TABLE[(n-1)*4+1];
      case t.Q:return r.RS_BLOCK_TABLE[(n-1)*4+2];
      case t.H:return r.RS_BLOCK_TABLE[(n-1)*4+3];
      default:return
    }
  },Ls=r,Ls
}var Ds,pn;
function Ga(){
  if(pn)return Ds;
  pn=1;
  function t(){
    this.buffer=new Array,this.length=0
  }return t.prototype={
    get:function(r){
      var n=Math.floor(r/8);
      return(this.buffer[n]>>>7-r%8&1)==1
    },put:function(r,n){
      for(var a=0;
      a<n;
      a++)this.putBit((r>>>n-a-1&1)==1)
    },getLengthInBits:function(){
      return this.length
    },putBit:function(r){
      var n=Math.floor(this.length/8);
      this.buffer.length<=n&&this.buffer.push(0),r&&(this.buffer[n]|=128>>>this.length%8),this.length++
    }
  },Ds=t,Ds
}var Es,gn;
function Fn(){
  if(gn)return Es;
  gn=1;
  for(var t={
    glog:function(n){
      if(n<1)throw new Error("glog("+n+")");
      return t.LOG_TABLE[n]
    },gexp:function(n){
      for(;
      n<0;
      )n+=255;
      for(;
      n>=256;
      )n-=255;
      return t.EXP_TABLE[n]
    },EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)
  },r=0;
  r<8;
  r++)t.EXP_TABLE[r]=1<<r;
  for(var r=8;
  r<256;
  r++)t.EXP_TABLE[r]=t.EXP_TABLE[r-4]^t.EXP_TABLE[r-5]^t.EXP_TABLE[r-6]^t.EXP_TABLE[r-8];
  for(var r=0;
  r<255;
  r++)t.LOG_TABLE[t.EXP_TABLE[r]]=r;
  return Es=t,Es
}var Os,fn;
function Wn(){
  if(fn)return Os;
  fn=1;
  var t=Fn();
  function r(n,a){
    if(n.length==null)throw new Error(n.length+"/"+a);
    for(var o=0;
    o<n.length&&n[o]==0;
    )o++;
    this.num=new Array(n.length-o+a);
    for(var i=0;
    i<n.length-o;
    i++)this.num[i]=n[i+o]
  }return r.prototype={
    get:function(n){
      return this.num[n]
    },getLength:function(){
      return this.num.length
    },multiply:function(n){
      for(var a=new Array(this.getLength()+n.getLength()-1),o=0;
      o<this.getLength();
      o++)for(var i=0;
      i<n.getLength();
      i++)a[o+i]^=t.gexp(t.glog(this.get(o))+t.glog(n.get(i)));
      return new r(a,0)
    },mod:function(n){
      if(this.getLength()-n.getLength()<0)return this;
      for(var a=t.glog(this.get(0))-t.glog(n.get(0)),o=new Array(this.getLength()),i=0;
      i<this.getLength();
      i++)o[i]=this.get(i);
      for(var i=0;
      i<n.getLength();
      i++)o[i]^=t.gexp(t.glog(n.get(i))+a);
      return new r(o,0).mod(n)
    }
  },Os=r,Os
}var Bs,bn;
function $a(){
  if(bn)return Bs;
  bn=1;
  var t=$n(),r=Wn(),n=Fn(),a={
    PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7
  },o={
    PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],G15:1335,G18:7973,G15_MASK:21522,getBCHTypeInfo:function(i){
      for(var x=i<<10;
      o.getBCHDigit(x)-o.getBCHDigit(o.G15)>=0;
      )x^=o.G15<<o.getBCHDigit(x)-o.getBCHDigit(o.G15);
      return(i<<10|x)^o.G15_MASK
    },getBCHTypeNumber:function(i){
      for(var x=i<<12;
      o.getBCHDigit(x)-o.getBCHDigit(o.G18)>=0;
      )x^=o.G18<<o.getBCHDigit(x)-o.getBCHDigit(o.G18);
      return i<<12|x
    },getBCHDigit:function(i){
      for(var x=0;
      i!=0;
      )x++,i>>>=1;
      return x
    },getPatternPosition:function(i){
      return o.PATTERN_POSITION_TABLE[i-1]
    },getMask:function(i,x,u){
      switch(i){
        case a.PATTERN000:return(x+u)%2==0;
        case a.PATTERN001:return x%2==0;
        case a.PATTERN010:return u%3==0;
        case a.PATTERN011:return(x+u)%3==0;
        case a.PATTERN100:return(Math.floor(x/2)+Math.floor(u/3))%2==0;
        case a.PATTERN101:return x*u%2+x*u%3==0;
        case a.PATTERN110:return(x*u%2+x*u%3)%2==0;
        case a.PATTERN111:return(x*u%3+(x+u)%2)%2==0;
        default:throw new Error("bad maskPattern:"+i)
      }
    },getErrorCorrectPolynomial:function(i){
      for(var x=new r([1],0),u=0;
      u<i;
      u++)x=x.multiply(new r([1,n.gexp(u)],0));
      return x
    },getLengthInBits:function(i,x){
      if(1<=x&&x<10)switch(i){
        case t.MODE_NUMBER:return 10;
        case t.MODE_ALPHA_NUM:return 9;
        case t.MODE_8BIT_BYTE:return 8;
        case t.MODE_KANJI:return 8;
        default:throw new Error("mode:"+i)
      }else if(x<27)switch(i){
        case t.MODE_NUMBER:return 12;
        case t.MODE_ALPHA_NUM:return 11;
        case t.MODE_8BIT_BYTE:return 16;
        case t.MODE_KANJI:return 10;
        default:throw new Error("mode:"+i)
      }else if(x<41)switch(i){
        case t.MODE_NUMBER:return 14;
        case t.MODE_ALPHA_NUM:return 13;
        case t.MODE_8BIT_BYTE:return 16;
        case t.MODE_KANJI:return 12;
        default:throw new Error("mode:"+i)
      }else throw new Error("type:"+x)
    },getLostPoint:function(i){
      for(var x=i.getModuleCount(),u=0,m=0;
      m<x;
      m++)for(var d=0;
      d<x;
      d++){
        for(var h=0,N=i.isDark(m,d),y=-1;
        y<=1;
        y++)if(!(m+y<0||x<=m+y))for(var w=-1;
        w<=1;
        w++)d+w<0||x<=d+w||y==0&&w==0||N==i.isDark(m+y,d+w)&&h++;
        h>5&&(u+=3+h-5)
      }for(var m=0;
      m<x-1;
      m++)for(var d=0;
      d<x-1;
      d++){
        var S=0;
        i.isDark(m,d)&&S++,i.isDark(m+1,d)&&S++,i.isDark(m,d+1)&&S++,i.isDark(m+1,d+1)&&S++,(S==0||S==4)&&(u+=3)
      }for(var m=0;
      m<x;
      m++)for(var d=0;
      d<x-6;
      d++)i.isDark(m,d)&&!i.isDark(m,d+1)&&i.isDark(m,d+2)&&i.isDark(m,d+3)&&i.isDark(m,d+4)&&!i.isDark(m,d+5)&&i.isDark(m,d+6)&&(u+=40);
      for(var d=0;
      d<x;
      d++)for(var m=0;
      m<x-6;
      m++)i.isDark(m,d)&&!i.isDark(m+1,d)&&i.isDark(m+2,d)&&i.isDark(m+3,d)&&i.isDark(m+4,d)&&!i.isDark(m+5,d)&&i.isDark(m+6,d)&&(u+=40);
      for(var T=0,d=0;
      d<x;
      d++)for(var m=0;
      m<x;
      m++)i.isDark(m,d)&&T++;
      var A=Math.abs(100*T/x/x-50)/5;
      return u+=A*10,u
    }
  };
  return Bs=o,Bs
}var Rs,yn;
function Fa(){
  if(yn)return Rs;
  yn=1;
  var t=Ra(),r=za(),n=Ga(),a=$a(),o=Wn();
  function i(u,m){
    this.typeNumber=u,this.errorCorrectLevel=m,this.modules=null,this.moduleCount=0,this.dataCache=null,this.dataList=[]
  }var x=i.prototype;
  return x.addData=function(u){
    var m=new t(u);
    this.dataList.push(m),this.dataCache=null
  },x.isDark=function(u,m){
    if(u<0||this.moduleCount<=u||m<0||this.moduleCount<=m)throw new Error(u+","+m);
    return this.modules[u][m]
  },x.getModuleCount=function(){
    return this.moduleCount
  },x.make=function(){
    if(this.typeNumber<1){
      var u=1;
      for(u=1;
      u<40;
      u++){
        for(var m=r.getRSBlocks(u,this.errorCorrectLevel),d=new n,h=0,N=0;
        N<m.length;
        N++)h+=m[N].dataCount;
        for(var N=0;
        N<this.dataList.length;
        N++){
          var y=this.dataList[N];
          d.put(y.mode,4),d.put(y.getLength(),a.getLengthInBits(y.mode,u)),y.write(d)
        }if(d.getLengthInBits()<=h*8)break
      }this.typeNumber=u
    }this.makeImpl(!1,this.getBestMaskPattern())
  },x.makeImpl=function(u,m){
    this.moduleCount=this.typeNumber*4+17,this.modules=new Array(this.moduleCount);
    for(var d=0;
    d<this.moduleCount;
    d++){
      this.modules[d]=new Array(this.moduleCount);
      for(var h=0;
      h<this.moduleCount;
      h++)this.modules[d][h]=null
    }this.setupPositionProbePattern(0,0),this.setupPositionProbePattern(this.moduleCount-7,0),this.setupPositionProbePattern(0,this.moduleCount-7),this.setupPositionAdjustPattern(),this.setupTimingPattern(),this.setupTypeInfo(u,m),this.typeNumber>=7&&this.setupTypeNumber(u),this.dataCache==null&&(this.dataCache=i.createData(this.typeNumber,this.errorCorrectLevel,this.dataList)),this.mapData(this.dataCache,m)
  },x.setupPositionProbePattern=function(u,m){
    for(var d=-1;
    d<=7;
    d++)if(!(u+d<=-1||this.moduleCount<=u+d))for(var h=-1;
    h<=7;
    h++)m+h<=-1||this.moduleCount<=m+h||(0<=d&&d<=6&&(h==0||h==6)||0<=h&&h<=6&&(d==0||d==6)||2<=d&&d<=4&&2<=h&&h<=4?this.modules[u+d][m+h]=!0:this.modules[u+d][m+h]=!1)
  },x.getBestMaskPattern=function(){
    for(var u=0,m=0,d=0;
    d<8;
    d++){
      this.makeImpl(!0,d);
      var h=a.getLostPoint(this);
      (d==0||u>h)&&(u=h,m=d)
    }return m
  },x.createMovieClip=function(u,m,d){
    var h=u.createEmptyMovieClip(m,d),N=1;
    this.make();
    for(var y=0;
    y<this.modules.length;
    y++)for(var w=y*N,S=0;
    S<this.modules[y].length;
    S++){
      var T=S*N,A=this.modules[y][S];
      A&&(h.beginFill(0,100),h.moveTo(T,w),h.lineTo(T+N,w),h.lineTo(T+N,w+N),h.lineTo(T,w+N),h.endFill())
    }return h
  },x.setupTimingPattern=function(){
    for(var u=8;
    u<this.moduleCount-8;
    u++)this.modules[u][6]==null&&(this.modules[u][6]=u%2==0);
    for(var m=8;
    m<this.moduleCount-8;
    m++)this.modules[6][m]==null&&(this.modules[6][m]=m%2==0)
  },x.setupPositionAdjustPattern=function(){
    for(var u=a.getPatternPosition(this.typeNumber),m=0;
    m<u.length;
    m++)for(var d=0;
    d<u.length;
    d++){
      var h=u[m],N=u[d];
      if(this.modules[h][N]==null)for(var y=-2;
      y<=2;
      y++)for(var w=-2;
      w<=2;
      w++)y==-2||y==2||w==-2||w==2||y==0&&w==0?this.modules[h+y][N+w]=!0:this.modules[h+y][N+w]=!1
    }
  },x.setupTypeNumber=function(u){
    for(var m=a.getBCHTypeNumber(this.typeNumber),d=0;
    d<18;
    d++){
      var h=!u&&(m>>d&1)==1;
      this.modules[Math.floor(d/3)][d%3+this.moduleCount-8-3]=h
    }for(var d=0;
    d<18;
    d++){
      var h=!u&&(m>>d&1)==1;
      this.modules[d%3+this.moduleCount-8-3][Math.floor(d/3)]=h
    }
  },x.setupTypeInfo=function(u,m){
    for(var d=this.errorCorrectLevel<<3|m,h=a.getBCHTypeInfo(d),N=0;
    N<15;
    N++){
      var y=!u&&(h>>N&1)==1;
      N<6?this.modules[N][8]=y:N<8?this.modules[N+1][8]=y:this.modules[this.moduleCount-15+N][8]=y
    }for(var N=0;
    N<15;
    N++){
      var y=!u&&(h>>N&1)==1;
      N<8?this.modules[8][this.moduleCount-N-1]=y:N<9?this.modules[8][15-N-1+1]=y:this.modules[8][15-N-1]=y
    }this.modules[this.moduleCount-8][8]=!u
  },x.mapData=function(u,m){
    for(var d=-1,h=this.moduleCount-1,N=7,y=0,w=this.moduleCount-1;
    w>0;
    w-=2)for(w==6&&w--;
    ;
    ){
      for(var S=0;
      S<2;
      S++)if(this.modules[h][w-S]==null){
        var T=!1;
        y<u.length&&(T=(u[y]>>>N&1)==1);
        var A=a.getMask(m,h,w-S);
        A&&(T=!T),this.modules[h][w-S]=T,N--,N==-1&&(y++,N=7)
      }if(h+=d,h<0||this.moduleCount<=h){
        h-=d,d=-d;
        break
      }
    }
  },i.PAD0=236,i.PAD1=17,i.createData=function(u,m,d){
    for(var h=r.getRSBlocks(u,m),N=new n,y=0;
    y<d.length;
    y++){
      var w=d[y];
      N.put(w.mode,4),N.put(w.getLength(),a.getLengthInBits(w.mode,u)),w.write(N)
    }for(var S=0,y=0;
    y<h.length;
    y++)S+=h[y].dataCount;
    if(N.getLengthInBits()>S*8)throw new Error("code length overflow. ("+N.getLengthInBits()+">"+S*8+")");
    for(N.getLengthInBits()+4<=S*8&&N.put(0,4);
    N.getLengthInBits()%8!=0;
    )N.putBit(!1);
    for(;
    !(N.getLengthInBits()>=S*8||(N.put(i.PAD0,8),N.getLengthInBits()>=S*8));
    )N.put(i.PAD1,8);
    return i.createBytes(N,h)
  },i.createBytes=function(u,m){
    for(var d=0,h=0,N=0,y=new Array(m.length),w=new Array(m.length),S=0;
    S<m.length;
    S++){
      var T=m[S].dataCount,A=m[S].totalCount-T;
      h=Math.max(h,T),N=Math.max(N,A),y[S]=new Array(T);
      for(var L=0;
      L<y[S].length;
      L++)y[S][L]=255&u.buffer[L+d];
      d+=T;
      var C=a.getErrorCorrectPolynomial(A),R=new o(y[S],C.getLength()-1),G=R.mod(C);
      w[S]=new Array(C.getLength()-1);
      for(var L=0;
      L<w[S].length;
      L++){
        var xe=L+G.getLength()-w[S].length;
        w[S][L]=xe>=0?G.get(xe):0
      }
    }for(var B=0,L=0;
    L<m.length;
    L++)B+=m[L].totalCount;
    for(var V=new Array(B),U=0,L=0;
    L<h;
    L++)for(var S=0;
    S<m.length;
    S++)L<y[S].length&&(V[U++]=y[S][L]);
    for(var L=0;
    L<N;
    L++)for(var S=0;
    S<m.length;
    S++)L<w[S].length&&(V[U++]=w[S][L]);
    return V
  },Rs=i,Rs
}var es={
  
},Nn;
function Wa(){
  if(Nn)return es;
  Nn=1,Object.defineProperty(es,"__esModule",{
    value:!0
  });
  var t=Object.assign||function(d){
    for(var h=1;
    h<arguments.length;
    h++){
      var N=arguments[h];
      for(var y in N)Object.prototype.hasOwnProperty.call(N,y)&&(d[y]=N[y])
    }return d
  },r=zn(),n=i(r),a=Mn(),o=i(a);
  function i(d){
    return d&&d.__esModule?d:{
      default:d
    }
  }function x(d,h){
    var N={
      
    };
    for(var y in d)h.indexOf(y)>=0||Object.prototype.hasOwnProperty.call(d,y)&&(N[y]=d[y]);
    return N
  }var u={
    bgColor:n.default.oneOfType([n.default.object,n.default.string]).isRequired,bgD:n.default.string.isRequired,fgColor:n.default.oneOfType([n.default.object,n.default.string]).isRequired,fgD:n.default.string.isRequired,size:n.default.number.isRequired,title:n.default.string,viewBoxSize:n.default.number.isRequired,xmlns:n.default.string
  },m=(0,a.forwardRef)(function(d,h){
    var N=d.bgColor,y=d.bgD,w=d.fgD,S=d.fgColor,T=d.size,A=d.title,L=d.viewBoxSize,C=d.xmlns,R=C===void 0?"http://www.w3.org/2000/svg":C,G=x(d,["bgColor","bgD","fgD","fgColor","size","title","viewBoxSize","xmlns"]);
    return o.default.createElement("svg",t({
      
    },G,{
      height:T,ref:h,viewBox:"0 0 "+L+" "+L,width:T,xmlns:R
    }),A?o.default.createElement("title",null,A):null,o.default.createElement("path",{
      d:y,fill:N
    }),o.default.createElement("path",{
      d:w,fill:S
    }))
  });
  return m.displayName="QRCodeSvg",m.propTypes=u,es.default=m,es
}var vn;
function Ka(){
  if(vn)return St;
  vn=1,Object.defineProperty(St,"__esModule",{
    value:!0
  }),St.QRCode=void 0;
  var t=Object.assign||function(T){
    for(var A=1;
    A<arguments.length;
    A++){
      var L=arguments[A];
      for(var C in L)Object.prototype.hasOwnProperty.call(L,C)&&(T[C]=L[C])
    }return T
  },r=zn(),n=N(r),a=Gn(),o=N(a),i=Fa(),x=N(i),u=Mn(),m=N(u),d=Wa(),h=N(d);
  function N(T){
    return T&&T.__esModule?T:{
      default:T
    }
  }function y(T,A){
    var L={
      
    };
    for(var C in T)A.indexOf(C)>=0||Object.prototype.hasOwnProperty.call(T,C)&&(L[C]=T[C]);
    return L
  }var w={
    bgColor:n.default.oneOfType([n.default.object,n.default.string]),fgColor:n.default.oneOfType([n.default.object,n.default.string]),level:n.default.string,size:n.default.number,value:n.default.string.isRequired
  },S=(0,u.forwardRef)(function(T,A){
    var L=T.bgColor,C=L===void 0?"#FFFFFF":L,R=T.fgColor,G=R===void 0?"#000000":R,xe=T.level,B=xe===void 0?"L":xe,V=T.size,U=V===void 0?256:V,he=T.value,E=y(T,["bgColor","fgColor","level","size","value"]),X=new x.default(-1,o.default[B]);
    X.addData(he),X.make();
    var Z=X.modules;
    return m.default.createElement(h.default,t({
      
    },E,{
      bgColor:C,bgD:Z.map(function(Me,Ge){
        return Me.map(function(Ke,Le){
          return Ke?"":"M "+Le+" "+Ge+" l 1 0 0 1 -1 0 Z"
        }).join(" ")
      }).join(" "),fgColor:G,fgD:Z.map(function(Me,Ge){
        return Me.map(function(Ke,Le){
          return Ke?"M "+Le+" "+Ge+" l 1 0 0 1 -1 0 Z":""
        }).join(" ")
      }).join(" "),ref:A,size:U,viewBoxSize:Z.length
    }))
  });
  return St.QRCode=S,S.displayName="QRCode",S.propTypes=w,St.default=S,St
}var Ua=Ka();
const ts=Sa(Ua);
var is=Ca();
function Ya({
  isOpen:t,onClose:r,data:n,config:a={
    style:"classic",layout:"4",showPromoLabel:!0
  }
}){
  const[o,i]=v.useState(1),x=v.useRef(null),u=a.style==="display"||a.style==="giovang"||a.style==="sticker_ce"||a.style==="sticker_lk"||a.style==="phieu_bh"&&a.layout==="right",m=a.style==="a4_giasoc",d=a.style==="phieu_bh";
  if(v.useEffect(()=>{
    if(!t)return;
    const R=()=>{
      if(x.current){
        const G=x.current.clientWidth,xe=64,B=a.layout==="2"&&!d||a.layout==="8"||a.style==="display"||a.style==="giovang"||m||a.style==="address_flyer"||d&&a.layout!=="right"&&a.layout!=="2",V=u?{
          width:148.5,height:210
        }:{
          width:210,height:297
        },U=(B?V.width:V.height)*3.78;
        G-xe<U?i((G-xe)/U):i(1)
      }
    };
    return setTimeout(R,10),window.addEventListener("resize",R),()=>window.removeEventListener("resize",R)
  },[t,a.layout]),v.useEffect(()=>{
    console.log("StickerPrintModal data:",n),console.log("StickerPrintModal config:",a)
  },[n,t,a]),!t)return null;
  const h=()=>{
    window.print()
  },y=(()=>{
    if(a.style==="phieu_bh")return a.layout==="1"?{
      cols:1,rows:1,scale:1.8,orientation:"portrait"
    }:a.layout==="2"?{
      cols:2,rows:1,scale:1.35,orientation:"landscape"
    }:a.layout==="4"?{
      cols:2,rows:2,scale:.92,orientation:"portrait"
    }:a.layout==="right"?{
      cols:2,rows:1,scale:.95,orientation:"landscape"
    }:{
      cols:2,rows:2,scale:.92,orientation:"portrait"
    };
    if(a.style==="address_flyer")return{
      cols:3,rows:2,scale:1,orientation:"portrait"
    };
    if(a.style==="display"||a.style==="giovang"||a.style==="a4_giasoc")return{
      cols:1,rows:1,scale:1,orientation:"portrait"
    };
    if(a.style==="sticker_ce"||a.style==="sticker_lk")return a.layout==="2"?{
      cols:1,rows:2,scale:1,orientation:"portrait"
    }:{
      cols:1,rows:1,scale:1,orientation:"landscape"
    };
    switch(a.layout){
      case"1":return{
        cols:1,rows:1,scale:1.96,orientation:"landscape"
      };
      case"2":return{
        cols:1,rows:2,scale:1.38,orientation:"portrait"
      };
      case"4":return{
        cols:2,rows:2,scale:.94,orientation:"landscape"
      };
      case"8":return{
        cols:2,rows:4,scale:.68,orientation:"portrait"
      };
      default:return{
        cols:2,rows:2,scale:.94,orientation:"landscape"
      }
    }
  })(),w=y.cols*y.rows,S=[];
  for(let R=0;
  R<n.length;
  R+=w)S.push(n.slice(R,R+w));
  const T=(a.style==="sticker_ce"||a.style==="sticker_lk")&&a.layout==="2",A=a.style==="address_flyer",L=A?66:d?a.layout==="right"?98:105:T?148.5:a.style==="sticker_ce"||a.style==="sticker_lk"?210:u?148.5:m?210:148.5,C=A?142:d?a.layout==="right"?132:148.5:T?105:a.style==="sticker_ce"||a.style==="sticker_lk"?148.5:u?210:m?297:105;
  return is.createPortal(e.jsxs("div",{
    className:"print-modal-container fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 print:static print:bg-white print:p-0 print:block",children:[e.jsx("style",{
      type:"text/css",children:`
          @import url('https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:ital,wght@0,500;
      0,700;
      0,800;
      1,500;
      1,700;
      1,800&family=Oswald:wght@400;
      500;
      700;
      900&display=swap');
      
          
          /* Override global nowrap !important in index.css for cells inside printing components */
          .print-area td, 
          .print-modal-container td {
        
            white-space: normal !important;
        
            word-break: break-word !important;
        
          
      }
        `
    }),e.jsx("style",{
      type:"text/css",media:"print",children:`
          @page {
         
            size: ${
          u?"A5":"A4"
        } ${
          y.orientation
        };
         
            margin: 0;
         
          
      }
          html, body {
        
            margin: 0 !important;
        
            padding: 0 !important;
        
            height: auto !important;
        
            min-height: 0 !important;
        
            overflow: visible !important;
        
            display: block !important;
        
            -webkit-print-color-adjust: exact;
         
            print-color-adjust: exact;
         
          
      }
          * {
         box-sizing: border-box;
         
      }
          /* Hide everything else when printing */
          body > *:not(.print-modal-container) {
         display: none !important;
         
      }
          #root {
         display: none !important;
         
      }
          .print-modal-container {
         
            display: block !important;
         
            position: absolute !important;
         
            left: 0 !important;
        
            top: 0 !important;
        
            width: 100% !important;
        
            height: auto !important;
        
            margin: 0 !important;
        
            padding: 0 !important;
        
            overflow: visible !important;
        
          
      }
          /* Reset zoom for printing */
          .print-area {
         
            zoom: 1 !important;
         
            transform: none !important;
         
            width: 100% !important;
        
            display: block !important;
        
            overflow: visible !important;
        
          
      }
          .page-break {
        
            page-break-before: avoid;
        
            break-before: avoid;
        
            page-break-inside: avoid;
        
            break-inside: avoid;
        
          
      }
          .page-break:not(:last-child) {
        
            page-break-after: always;
        
            break-after: page;
        
          
      }
          
          /* Remove borders of grid cells when printing to prevent height calculations from overflowing */
          .page-break > div {
        
            border: none !important;
        
            border-width: 0 !important;
        
          
      }
        `
    }),e.jsxs("div",{
      className:"absolute top-4 right-4 flex gap-2 print:hidden z-50",children:[e.jsxs("button",{
        onClick:h,className:"bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-colors",children:[e.jsx(We,{
          size:20
        })," In Ngay"]
      }),e.jsx("button",{
        onClick:r,className:"bg-white hover:bg-slate-100 text-slate-800 p-2 rounded-xl shadow-lg transition-colors",children:e.jsx(gt,{
          size:24
        })
      })]
    }),e.jsx("div",{
      ref:x,className:"bg-slate-100 rounded-2xl overflow-auto max-h-[90vh] w-full max-w-6xl p-8 print:p-0 print:m-0 print:max-h-none print:w-full print:bg-white print:overflow-visible",children:e.jsx("div",{
        style:{
          zoom:o
        },className:"print-area flex flex-col items-center w-full",children:n.length===0?e.jsx("div",{
          className:"text-center text-slate-500 font-medium py-12 print:hidden w-full",children:"Không có dữ liệu để in. Vui lòng tải file dữ liệu."
        }):e.jsx("div",{
          className:"flex flex-col items-center gap-8 print:gap-0 print:block w-full",children:S.map((R,G)=>e.jsx("div",{
            className:"bg-white shadow-xl print:shadow-none grid page-break",style:{
              width:u?y.orientation==="portrait"?"147.5mm":"209mm":y.orientation==="portrait"?"209mm":"296mm",height:u?y.orientation==="portrait"?"209mm":"147.5mm":y.orientation==="portrait"?"296mm":"209mm",padding:a.style==="address_flyer"?"5mm":u||m?"0":"2mm",gridTemplateColumns:`repeat(${
                y.cols
              }, 1fr)`,gridTemplateRows:`repeat(${
                y.rows
              }, 1fr)`,margin:"0 auto",boxSizing:"border-box",gap:"0"
            },children:R.map((xe,B)=>e.jsx("div",{
              className:"relative overflow-hidden border-dashed border-slate-100 print:border-none flex items-center justify-center min-w-0 min-h-0",style:{
                borderWidth:"0.5px"
              },children:e.jsx("div",{
                style:{
                  width:`${
                    L*y.scale
                  }mm`,height:`${
                    C*y.scale
                  }mm`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0
                },children:e.jsx("div",{
                  style:{
                    transform:`scale(${
                      y.scale
                    })`,transformOrigin:"center",width:`${
                      L
                    }mm`,height:`${
                      C
                    }mm`,flexShrink:0
                  },children:xe?e.jsx(bt,{
                    item:xe,style:a.style,layout:a.layout,showPromoLabel:a.showPromoLabel
                  }):null
                })
              })
            },B))
          },G))
        })
      })
    })]
  }),document.body)
}function bt({
  item:t,style:r,layout:n,showPromoLabel:a=!0
}){
  const o=new Date,i=o.getDate().toString().padStart(2,"0"),x=(o.getMonth()+1).toString().padStart(2,"0"),u=o.getFullYear(),m=o.getHours().toString().padStart(2,"0"),d=o.getMinutes().toString().padStart(2,"0"),h=`${
    i
  } - ${
    x
  } - ${
    u
  } | ${
    m
  } : ${
    d
  }`,N=w=>{
    const S=parseFloat(w);
    return isNaN(S)?"0":S.toLocaleString("vi-VN").replace(/,/g,".")
  },y=w=>{
    if(!w)return"";
    const S=/(\(HÃNG SẼ THẨM ĐỊNH VÀ ĐỔI MỚI SAU KHI CÓ BIÊN BẢN XÁC NHẬN LỖI\)|Không lỗi|Lỗi|TRỪ \d+%|THÊM \d+%|1900\.23\.24\.65|Tổng đài bảo hành: 1900\.23\.24\.65)/g;
    return w.split(S).map((A,L)=>S.test(A)?e.jsx("strong",{
      className:"font-extrabold",children:A
    },L):e.jsx("span",{
      children:A
    },L))
  };
  if(r==="phieu_bh"){
    const w=n==="right",S=w?"98mm":"105mm",T=w?"132mm":"148.5mm";
    return e.jsx("div",{
      className:"bg-white flex flex-col p-2 box-border text-black select-none border border-slate-300",style:{
        width:S,height:T,fontFamily:"Arial, sans-serif"
      },children:e.jsx("table",{
        style:{
          width:"100%",height:"100%",borderCollapse:"collapse",border:"1.5px solid black",tableLayout:"fixed",whiteSpace:"normal",wordBreak:"break-word"
        },children:e.jsxs("tbody",{
          children:[e.jsxs("tr",{
            style:{
              borderBottom:"1px solid black"
            },children:[e.jsx("td",{
              style:{
                width:"10%",borderRight:"1px solid black",background:"black",color:"white",fontWeight:"bold",textAlign:"center",verticalAlign:"middle",fontSize:"20px"
              },children:"1"
            }),e.jsxs("td",{
              style:{
                padding:"4px 6px",fontSize:"15px",lineHeight:"1.25",verticalAlign:"middle",whiteSpace:"normal",wordBreak:"break-word"
              },children:[e.jsxs("div",{
                children:["Tên siêu thị:",e.jsx("span",{
                  style:{
                    fontWeight:"bold",margin:"0 4px",borderBottom:"1px dotted black",paddingBottom:"2px",display:"inline-block",minWidth:"120px",textAlign:"center"
                  },children:t.tenSieuThi||"                    "
                })]
              }),e.jsxs("div",{
                style:{
                  marginTop:"1px"
                },children:["Sản phẩm bảo hành:",e.jsx("span",{
                  style:{
                    fontWeight:(t.sanPhamBh,"bold"),textDecoration:(t.sanPhamBh,"none"),margin:"0 4px",borderBottom:"1px dotted black",paddingBottom:"2px",display:"inline-block",minWidth:"40px",textAlign:"center"
                  },children:t.sanPhamBh||"     "
                })," tháng/năm"]
              }),e.jsxs("div",{
                style:{
                  marginTop:"1px",paddingLeft:"48px"
                },children:["Remote:",e.jsx("span",{
                  style:{
                    fontWeight:(t.remoteBh,"bold"),textDecoration:(t.remoteBh,"none"),margin:"0 4px",borderBottom:"1px dotted black",paddingBottom:"2px",display:"inline-block",minWidth:"30px",textAlign:"center"
                  },children:t.remoteBh||"    "
                })," tháng"]
              })]
            })]
          }),e.jsxs("tr",{
            style:{
              borderBottom:"1px solid black"
            },children:[e.jsx("td",{
              style:{
                borderRight:"1px solid black",fontWeight:"bold",textAlign:"center",verticalAlign:"middle",fontSize:"20px"
              },children:"2"
            }),e.jsxs("td",{
              style:{
                padding:"4px 6px",fontSize:"13px",lineHeight:"1.25",verticalAlign:"middle",whiteSpace:"normal",wordBreak:"break-word"
              },children:[e.jsx("div",{
                style:{
                  marginBottom:"1px"
                },children:y(t.row2Line1)
              }),e.jsx("div",{
                style:{
                  marginBottom:"1px"
                },children:y(t.row2Line2)
              }),e.jsx("div",{
                style:{
                  marginBottom:"1px"
                },children:y(t.row2Line3)
              }),e.jsx("div",{
                style:{
                  paddingLeft:"12px",marginBottom:"1px"
                },children:y(t.row2Line4)
              }),e.jsx("div",{
                style:{
                  paddingLeft:"12px"
                },children:y(t.row2Line5)
              })]
            })]
          }),e.jsxs("tr",{
            style:{
              borderBottom:"1px solid black"
            },children:[e.jsx("td",{
              style:{
                borderRight:"1px solid black",fontWeight:"bold",textAlign:"center",verticalAlign:"middle",fontSize:"20px"
              },children:"3"
            }),e.jsx("td",{
              style:{
                padding:"4px 6px",fontSize:"15px",lineHeight:"1.25",verticalAlign:"middle",whiteSpace:"normal",wordBreak:"break-word"
              },children:e.jsxs("div",{
                children:["Giao trước ",e.jsx("span",{
                  style:{
                    fontWeight:(t.giaoTruocNgay,"bold"),margin:"0 4px",borderBottom:"1px dotted black",paddingBottom:"2px",display:"inline-block",minWidth:"30px",textAlign:"center"
                  },children:t.giaoTruocNgay||"    "
                })," ngày ",e.jsx("span",{
                  style:{
                    fontWeight:(t.giaoTruocText,"bold"),margin:"0 4px",borderBottom:"1px dotted black",paddingBottom:"2px",display:"inline-block",minWidth:"120px",textAlign:"center"
                  },children:t.giaoTruocText||"                    "
                })]
              })
            })]
          }),e.jsxs("tr",{
            style:{
              borderBottom:"1px solid black"
            },children:[e.jsx("td",{
              style:{
                borderRight:"1px solid black",fontWeight:"bold",textAlign:"center",verticalAlign:"middle",fontSize:"20px"
              },children:"4"
            }),e.jsx("td",{
              style:{
                padding:"4px 6px",fontSize:"15px",lineHeight:"1.25",verticalAlign:"middle",whiteSpace:"normal",wordBreak:"break-word"
              },children:e.jsx("div",{
                children:t.row4Text
              })
            })]
          }),e.jsxs("tr",{
            style:{
              borderBottom:"1px solid black"
            },children:[e.jsx("td",{
              style:{
                borderRight:"1px solid black",fontWeight:"bold",textAlign:"center",verticalAlign:"middle",fontSize:"20px"
              },children:"5"
            }),e.jsx("td",{
              style:{
                padding:"4px 6px",fontSize:"13px",lineHeight:"1.25",verticalAlign:"middle",whiteSpace:"normal",wordBreak:"break-word"
              },children:e.jsx("div",{
                children:t.row5Text
              })
            })]
          }),e.jsxs("tr",{
            style:{
              borderBottom:"1px solid black"
            },children:[e.jsx("td",{
              style:{
                borderRight:"1px solid black",fontWeight:"bold",textAlign:"center",verticalAlign:"middle",fontSize:"20px"
              },children:"6"
            }),e.jsxs("td",{
              style:{
                padding:"4px 6px",fontSize:"15px",lineHeight:"1.25",verticalAlign:"middle",whiteSpace:"normal",wordBreak:"break-word"
              },children:[e.jsx("div",{
                style:{
                  marginBottom:"1px"
                },children:y(t.row6Line1)
              }),e.jsxs("div",{
                children:["- Hỗ trợ và mua hàng: ",e.jsx("span",{
                  style:{
                    fontWeight:(t.hoTroMuaHang,"bold"),margin:"0 4px",borderBottom:"1px dotted black",paddingBottom:"2px",display:"inline-block",minWidth:"120px",textAlign:"center"
                  },children:t.hoTroMuaHang||"                    "
                })]
              })]
            })]
          }),e.jsxs("tr",{
            children:[e.jsx("td",{
              style:{
                borderRight:"1px solid black",fontWeight:"bold",textAlign:"center",verticalAlign:"middle",fontSize:"20px"
              },children:"7"
            }),e.jsx("td",{
              style:{
                padding:"4px 6px",fontSize:"15px",lineHeight:"1.25",verticalAlign:"middle",whiteSpace:"normal",wordBreak:"break-word"
              },children:e.jsx("div",{
                children:t.row7Text
              })
            })]
          })]
        })
      })
    })
  }if(r==="address_flyer"){
    const w=T=>{
      const A=/(\d{
        1,2
      }\/\d{
        1,2
      }(?:\/\d{
        2,4
      })?)/g;
      return T.split(A).map((C,R)=>A.test(C)?e.jsx("span",{
        className:"font-black",style:{
          fontSize:"24px",color:"black",margin:"0 4px",display:"inline-block"
        },children:C
      },R):e.jsx("span",{
        children:C
      },R))
    },S=T=>{
      const A=T.match(/^(.*?)\s+(\d{
        1,2
      }\/\d{
        1,2
      }(?:\/\d{
        2,4
      })?)$/i);
      return A?e.jsxs("div",{
        className:"flex flex-col items-center leading-none mt-1",children:[e.jsx("span",{
          className:"font-black tracking-wide uppercase",style:{
            fontSize:"15px"
          },children:A[1]
        }),e.jsx("span",{
          className:"font-black tracking-tight leading-none mt-1",style:{
            fontSize:"26px",color:"black"
          },children:A[2]
        })]
      }):e.jsx("span",{
        className:"font-black tracking-wide uppercase",style:{
          fontSize:"15px"
        },children:T
      })
    };
    return e.jsxs("div",{
      className:"w-[66mm] h-[142mm] bg-white flex flex-col justify-between p-3 box-border text-black select-none",style:{
        border:"1.5px solid black",fontFamily:'"Oswald", sans-serif'
      },children:[e.jsxs("div",{
        className:"text-center shrink-0",children:[e.jsx("div",{
          className:"font-black tracking-wide leading-tight uppercase",style:{
            fontSize:"22px"
          },children:t.headerTitle||"ĐIỆN MÁY XANH PHƯỜNG 8"
        }),e.jsx("div",{
          className:"font-medium tracking-tight leading-tight text-slate-800",style:{
            fontSize:"13px"
          },children:t.headerSubtitle||"(Ngã tư đèn xanh đèn đỏ đường Nguyễn Tất Thành)"
        })]
      }),e.jsx("div",{
        className:"bg-black w-full my-0.5 shrink-0",style:{
          height:"2px"
        }
      }),e.jsxs("div",{
        className:"flex-1 flex flex-col justify-between py-1 min-h-0 text-center overflow-hidden",children:[e.jsxs("div",{
          className:"flex flex-col items-center justify-center shrink-0",children:[e.jsx("div",{
            className:"font-black tracking-tight uppercase leading-none",style:{
              fontSize:"22px"
            },children:t.invitationTitle||"THƯ MỜI, THỨ 7 TUẦN NÀY"
          }),e.jsx("div",{
            className:"leading-none text-slate-700 my-0.5",style:{
              fontSize:"8px"
            },children:"⚭ ⚭ ⚭"
          }),e.jsx("div",{
            className:"font-bold text-slate-800 leading-none",style:{
              fontSize:"13px"
            },children:t.invitationTarget||"Kính mời: Quý Khách Hàng thân yêu"
          })]
        }),e.jsxs("div",{
          className:"font-bold tracking-tight uppercase leading-snug shrink-0",style:{
            fontSize:"13px"
          },children:[e.jsx("div",{
            children:w(t.eventTimeLocation||"Ngày 28/03 đến ĐMX PHƯỜNG 8")
          }),e.jsx("div",{
            className:"text-slate-800 font-medium my-0.5",style:{
              fontSize:"11px",textTransform:"none"
            },children:t.eventDescription||"tham gia sự kiện KHAI TRƯƠNG SIÊU GIẢM GIÁ ĐẾN"
          })]
        }),e.jsx("div",{
          className:"font-black text-black leading-none tracking-tighter shrink-0",style:{
            fontSize:"72px"
          },children:t.discountPercentage||"50%"
        }),e.jsx("div",{
          className:"shrink-0 leading-none",children:S(t.duration||"1 NGÀY DUY NHẤT 28/03")
        }),e.jsxs("div",{
          className:"font-bold tracking-wide uppercase leading-tight text-slate-800 shrink-0",style:{
            fontSize:"10.5px"
          },children:[e.jsx("div",{
            children:t.categoriesLine1||"ĐIỆN THOẠI & LAPTOP"
          }),e.jsx("div",{
            children:t.categoriesLine2||"TIVI - TỦ LẠNH - MÁY GIẶT- MÁY LỌC NƯỚC"
          }),e.jsx("div",{
            children:t.categoriesLine3||"MÁY LẠNH – QUẠT ĐIỀU HÒA"
          })]
        }),e.jsxs("div",{
          className:"flex flex-col items-center justify-center shrink-0",children:[e.jsx("div",{
            className:"font-black text-black leading-tight uppercase tracking-tight",style:{
              fontSize:"13px"
            },children:t.specialOffer||"➔ RẺ HƠN CÁC ĐIỆN MÁY XANH KHÁC -10%"
          }),e.jsx("div",{
            className:"font-black text-slate-800 leading-none uppercase mt-0.5",style:{
              fontSize:"10px"
            },children:t.paymentTerm||"MUA TRẢ CHẬM - 0% LÃI SUẤT - TRẢ TRƯỚC 0đ"
          })]
        })]
      }),e.jsx("div",{
        className:"bg-black w-full my-0.5 shrink-0",style:{
          height:"2px"
        }
      }),e.jsxs("div",{
        className:"text-center shrink-0",children:[e.jsx("div",{
          className:"font-black tracking-wide leading-tight uppercase",style:{
            fontSize:"13px"
          },children:t.footerTitle||"ĐIỆN MÁY XANH PHƯỜNG 8 CÀ MAU"
        }),e.jsx("div",{
          className:"font-bold tracking-tight leading-tight uppercase mt-0.5",style:{
            fontSize:"10px"
          },children:t.footerLine1||"CAM KẾT GIÁ RẺ NHẤT THỊ TRƯỜNG CÀ MAU"
        }),e.jsx("div",{
          className:"font-bold tracking-tight leading-tight uppercase",style:{
            fontSize:"10px"
          },children:t.footerLine2||"BAO GIÁ HOÀN TIỀN NẾU ĐÂU RẺ HƠN"
        }),e.jsxs("div",{
          className:"font-bold tracking-tight leading-tight uppercase flex items-center justify-center gap-0.5",style:{
            fontSize:"10px"
          },children:[e.jsx("span",{
            children:t.footerLine3||"NHIỀU SẢN PHẨM GIÁ SỐC BÊN DƯỚI"
          }),e.jsx("span",{
            children:"⬇"
          })]
        }),e.jsx("div",{
          className:"font-medium tracking-tight leading-tight text-slate-800 italic mt-0.5",style:{
            fontSize:"10px"
          },children:t.footerLine4||"Được giảm thêm 10%"
        })]
      })]
    })
  }if(r==="sticker_ce"||r==="sticker_lk"){
    const w=n==="2",T=N(t.discountPrice).split("."),A=T.slice(0,-1).join("."),L=T[T.length-1];
    return e.jsx("div",{
      className:`box-border shrink-0 overflow-hidden ${
        w?"w-[148.5mm] h-[105mm] p-[3mm]":"w-[210mm] h-[148.5mm] p-[7mm]"
      }`,children:e.jsx("div",{
        className:`w-full h-full bg-white box-border flex flex-col justify-between border-black ${
          w?"border-[4px] p-[1mm]":"border-[6px] p-[2mm]"
        }`,children:e.jsxs("div",{
          className:"w-full h-full bg-white border-black box-border relative text-black flex flex-col justify-between",style:{
            fontFamily:'"Oswald", sans-serif',borderStyle:"solid",borderWidth:w?"2px":"3px",padding:w?"12px":"24px"
          },children:[e.jsxs("div",{
            className:"flex items-center justify-between px-1 py-1 shrink-0 w-full",children:[e.jsx("div",{
              className:"opacity-0 shrink-0",style:{
                width:w?"32px":"58px",height:w?"32px":"58px"
              }
            }),e.jsx("div",{
              className:"font-black uppercase tracking-[0.08em] leading-none text-center flex-1",style:{
                fontWeight:900,WebkitTextStroke:w?"1px black":"2px black",fontSize:w?"38px":"58px"
              },children:"KHUYẾN MÃI SỐC"
            }),e.jsx("div",{
              className:"shrink-0 flex items-center justify-center p-0.5 bg-white border border-black",children:e.jsx(ts,{
                value:t.qrData||t.maSanPham||t.productCode||"00000",size:w?32:48,level:"L"
              })
            })]
          }),e.jsx("div",{
            className:"bg-black w-full shrink-0",style:{
              height:w?"2px":"3px"
            }
          }),e.jsxs("div",{
            className:"flex-1 flex flex-col justify-around py-1 min-h-0 text-center",children:[e.jsx("div",{
              className:"flex flex-col items-center justify-center",children:e.jsx("div",{
                className:"font-black uppercase tracking-wide truncate whitespace-nowrap max-w-[95%] leading-tight",style:{
                  fontWeight:900,fontSize:w?"22px":"32px"
                },children:t.name||"TÊN SẢN PHẨM"
              })
            }),e.jsxs("div",{
              className:"flex flex-col items-center justify-center",children:[e.jsxs("div",{
                className:"relative font-bold text-black mb-0.5 leading-none",style:{
                  fontSize:w?"24px":"36px"
                },children:[N(t.originalPrice),"đ",e.jsx("div",{
                  className:"absolute top-[55%] left-[-5%] right-[-5%] bg-black -translate-y-1/2",style:{
                    height:w?"2px":"3px"
                  }
                })]
              }),e.jsxs("div",{
                className:"flex items-baseline font-black text-black leading-none",style:{
                  fontWeight:900
                },children:[e.jsx("span",{
                  className:"tracking-tighter leading-none",style:{
                    fontSize:w?"104px":"156px"
                  },children:A
                }),e.jsxs("span",{
                  className:"ml-0.5 leading-none",style:{
                    fontSize:w?"38px":"58px"
                  },children:[".",L,"Đ"]
                })]
              })]
            })]
          }),e.jsxs("div",{
            className:"border-t-2 border-black flex justify-between items-center font-bold text-black shrink-0",style:{
              paddingTop:w?"6px":"12px",fontSize:w?"10px":"13px"
            },children:[e.jsx("div",{
              children:"ĐIỆN MÁY XANH"
            }),e.jsxs("div",{
              className:"italic font-medium",children:["In lúc: ",h]
            })]
          })]
        })
      })
    })
  }if(r==="a4_giasoc"){
    const w=t.originalPrice>0?Math.round((t.originalPrice-t.discountPrice)/t.originalPrice*100):0,T=N(t.discountPrice).split("."),A=T.slice(0,-1).join("."),L=T[T.length-1],C=A.length,R=C<=5?240:C<=6?190:C<=7?150:120,G=t.nganhHang||(t.name?t.name.split(" ").slice(0,3).join(" "):"SẢN PHẨM KHUYẾN MÃI");
    return e.jsx("div",{
      className:"w-[210mm] h-[297mm] bg-white p-[5mm] box-border shrink-0 overflow-hidden flex flex-col items-center",children:e.jsxs("div",{
        className:"w-full h-full bg-white border-[4px] border-black flex flex-col justify-between text-black pt-8 pb-8",style:{
          fontFamily:'"UTM Colossalis", sans-serif'
        },children:[e.jsx("div",{
          className:"h-[10%] bg-black text-white mx-8 mt-3 flex items-center justify-center shrink-0",children:e.jsx("span",{
            className:"text-[52px] font-bold uppercase tracking-[0.05em] leading-none",style:{
              fontFamily:'"UTM Colossalis", sans-serif'
            },children:G
          })
        }),e.jsx("div",{
          className:"h-[14%] flex items-center justify-center shrink-0 pt-2",children:e.jsx("span",{
            className:"text-[130px] font-bold uppercase leading-[1.2] tracking-tighter",style:{
              fontFamily:'"UTM Colossalis", sans-serif'
            },children:"GIÁ SỐC"
          })
        }),e.jsx("div",{
          className:"h-[24%] flex items-center justify-center shrink-0",children:w>0&&e.jsxs("span",{
            className:"leading-none text-black tracking-tighter",style:{
              fontFamily:'"Inter", sans-serif',fontWeight:900,fontSize:"250px"
            },children:["-",w,"%"]
          })
        }),e.jsx("div",{
          className:"h-[13%] w-full px-8 py-1 shrink-0",children:e.jsx("div",{
            className:"w-full h-full border-[4px] border-black rounded-2xl flex items-center justify-center px-6 text-[30px] text-center",style:{
              fontFamily:'"Inter", sans-serif',fontWeight:900
            },children:e.jsx("span",{
              className:"line-clamp-2 leading-[1.2] uppercase",children:t.name||"TÊN SẢN PHẨM"
            })
          })
        }),e.jsx("div",{
          className:"h-[10%] flex items-center justify-center shrink-0",children:e.jsxs("div",{
            className:"relative inline-block text-[80px] text-black",style:{
              fontFamily:'"UTM Colossalis", sans-serif'
            },children:[N(t.originalPrice),e.jsx("div",{
              className:"absolute top-[52%] left-[-8%] right-[-8%] h-[8px] bg-black -translate-y-1/2"
            })]
          })
        }),e.jsx("div",{
          className:"h-[29%] flex items-center justify-center w-full pb-4 shrink-0",children:e.jsxs("div",{
            className:"flex items-end justify-center gap-2",children:[e.jsxs("div",{
              className:"border-[4px] border-dashed border-blue-600 px-8 py-3 flex flex-col items-center justify-center shrink-0",children:[e.jsx("span",{
                className:"leading-none tracking-tighter text-black",style:{
                  fontFamily:'"UTM Colossalis", sans-serif',fontSize:`${
                    R
                  }px`
                },children:A
              }),e.jsxs("span",{
                className:"text-[18px] font-black mt-2 text-black whitespace-nowrap",style:{
                  fontFamily:'"Montserrat", sans-serif',fontWeight:800
                },children:["Khuyến mãi áp dụng đến hết ngày ",t.endDate||"3/5/2026"]
              })]
            }),e.jsxs("span",{
              className:"text-[64px] mb-8 shrink-0 leading-none",style:{
                fontFamily:'"UTM Colossalis", sans-serif'
              },children:[".",L,"Đ"]
            })]
          })
        })]
      })
    })
  }if(r==="giovang"){
    const w=t.originalPrice>0?Math.round((t.originalPrice-t.discountPrice)/t.originalPrice*100):0,T=N(t.discountPrice).split("."),A=T.slice(0,-1).join("."),L=T[T.length-1];
    return e.jsx("div",{
      className:"w-[148.5mm] h-[210mm] bg-white p-[5mm] box-border shrink-0 overflow-hidden",children:e.jsxs("div",{
        className:"w-full h-full bg-white pt-4 px-8 pb-8 box-border relative text-black flex flex-col items-center border-[5px] border-black",style:{
          fontFamily:'"UTM Avo", "Avo", "Arial Black", sans-serif'
        },children:[e.jsx("div",{
          className:"w-full bg-black py-3 flex items-center justify-center mb-4",children:e.jsx("div",{
            className:"text-[32px] font-black text-white tracking-[0.05em] uppercase",children:"GIỜ VÀNG GIÁ SỐC"
          })
        }),e.jsx("div",{
          className:"flex-1 flex items-center justify-center",children:w>0&&e.jsxs("div",{
            className:"text-[156px] font-black leading-none text-black tracking-tighter",children:["-",w,"%"]
          })
        }),e.jsxs("div",{
          className:"w-full border-t-[3px] border-b-[3px] border-black py-2 mb-2 flex flex-col items-center justify-center text-center",children:[e.jsx("div",{
            className:"text-[20px] font-medium uppercase line-clamp-2 leading-[1.2] px-4",children:t.name||"TÊN SẢN PHẨM"
          }),e.jsx("div",{
            className:"text-[14px] font-bold mt-1 tracking-widest opacity-90",children:t.maSanPham||t.productCode||"-"
          })]
        }),e.jsxs("div",{
          className:"text-[16px] font-bold uppercase mb-4 tracking-wider text-center px-4",children:["ÁP DỤNG THEO KHUNG GIỜ 9H-12H & 14H - 20H =",">"," 3 NGÀY T6,T7,CN"]
        }),e.jsxs("div",{
          className:"flex-1 flex flex-col items-center justify-center",children:[e.jsxs("div",{
            className:"relative inline-block text-[38px] font-bold text-slate-500 mb-2",children:[N(t.originalPrice),e.jsx("div",{
              className:"absolute top-[55%] left-[-10%] right-[-10%] h-[3px] bg-black"
            })]
          }),e.jsxs("div",{
            className:"flex items-baseline font-black",children:[e.jsx("span",{
              className:"text-[100px] leading-none tracking-tighter",children:A
            }),e.jsxs("span",{
              className:"text-[40px] ml-1",children:[".",L,"Đ"]
            })]
          })]
        })]
      })
    })
  }if(r==="display"){
    const w=t.originalPrice>0?Math.round((t.originalPrice-t.discountPrice)/t.originalPrice*100):0,T=N(t.discountPrice).split("."),A=T.slice(0,-1).join("."),L=T[T.length-1],C=A.length,R=C<=5?150:C<=6?125:C<=7?100:80,G=t.nganhHang||(t.name?t.name.split(" ").slice(0,3).join(" "):"HÀNG TRƯNG BÀY");
    return e.jsx("div",{
      className:"w-[148.5mm] h-[210mm] bg-white p-[4mm] box-border shrink-0 overflow-hidden flex flex-col items-center",children:e.jsxs("div",{
        className:"w-full h-full bg-white border-[4px] border-black flex flex-col justify-between text-black pt-[2mm] pb-[3mm]",style:{
          fontFamily:'"UTM Colossalis", sans-serif'
        },children:[e.jsx("div",{
          className:"h-[8.5%] bg-black text-white mx-[2mm] flex items-center justify-center shrink-0",children:e.jsx("span",{
            className:"font-bold uppercase leading-none",style:{
              fontFamily:'"UTM Colossalis", sans-serif',fontSize:"38px",letterSpacing:"0.05em"
            },children:G
          })
        }),e.jsx("div",{
          className:"h-[16%] flex items-center justify-center shrink-0 mt-[2mm] pt-1",children:e.jsx("span",{
            className:"font-bold uppercase leading-[1.1]",style:{
              fontFamily:'"UTM Colossalis", sans-serif',fontSize:"125px",letterSpacing:"-0.02em"
            },children:"GIÁ SỐC"
          })
        }),e.jsx("div",{
          className:"h-[19%] flex items-center justify-center shrink-0 mb-2",children:w>0&&e.jsxs("span",{
            className:"leading-none text-black",style:{
              fontFamily:'"Inter", sans-serif',fontWeight:900,fontSize:"145px",letterSpacing:"-0.05em"
            },children:["-",w,"%"]
          })
        }),e.jsx("div",{
          className:"h-[9.5%] w-full px-8 py-1 shrink-0",children:e.jsx("div",{
            className:"w-full h-full border-[3px] border-black rounded-xl flex items-center justify-center px-4 text-center",style:{
              fontFamily:'"Inter", sans-serif',fontWeight:900,fontSize:"24px"
            },children:e.jsx("span",{
              className:"line-clamp-2 leading-[1.2]",children:t.name||"Tên sản phẩm"
            })
          })
        }),e.jsx("div",{
          className:"h-[10%] flex items-center justify-center shrink-0",children:e.jsxs("div",{
            className:"relative inline-block text-black",style:{
              fontFamily:'"UTM Colossalis", sans-serif',fontSize:"58px"
            },children:[N(t.originalPrice),e.jsx("div",{
              className:"absolute top-[52%] left-[-8%] right-[-8%] h-[8px] bg-black -translate-y-1/2"
            })]
          })
        }),e.jsx("div",{
          className:"h-[28%] flex items-center justify-center w-full px-[2mm] shrink-0",children:e.jsxs("div",{
            className:"flex items-baseline justify-center",children:[e.jsx("span",{
              className:"leading-none text-black",style:{
                fontFamily:'"UTM Colossalis", sans-serif',fontSize:`${
                  R
                }px`,letterSpacing:"-0.03em",textShadow:"4px 4px 0px #d0d0d0"
              },children:A
            }),e.jsxs("span",{
              className:"leading-none text-black",style:{
                fontFamily:'"UTM Colossalis", sans-serif',fontSize:`${
                  Math.round(R*.35)
                }px`,textShadow:"2px 2px 0px #d0d0d0"
              },children:[".",L]
            })]
          })
        }),e.jsx("div",{
          className:"h-[5%] flex items-end justify-center w-full px-6 pb-1 shrink-0",children:e.jsxs("span",{
            className:"text-black text-center",style:{
              fontFamily:'"Montserrat", sans-serif',fontWeight:800,fontSize:"18px",fontStyle:"italic"
            },children:["Khuyến mãi áp dụng đến hết ngày ",t.endDate||"31/05/2026"]
          })
        })]
      })
    })
  }if(r==="modern"){
    const w=N(t.discountPrice),S=w.split(".")[0],T=w.split(".").slice(1).join(".");
    return e.jsxs("div",{
      className:"w-[148.5mm] h-[105mm] bg-white p-4 box-border relative text-black shrink-0 overflow-hidden flex flex-col justify-between border-[2px] border-black font-bold",style:{
        fontFamily:'"Times New Roman", serif'
      },children:[e.jsxs("div",{
        className:"text-center",children:[e.jsx("div",{
          className:"text-[32px] font-bold leading-tight",children:t.name||"Tên sản phẩm"
        }),e.jsxs("div",{
          className:"flex items-center justify-center gap-4 mt-1",children:[e.jsx("div",{
            className:"text-[24px] font-medium",children:t.maSanPham||t.productCode||"-"
          }),e.jsx(ts,{
            value:t.qrData||t.maSanPham||t.productCode||"00000",size:40,level:"L"
          })]
        })]
      }),e.jsx("div",{
        className:"flex-1 flex items-center justify-center -my-4",children:e.jsxs("div",{
          className:"flex items-baseline",children:[e.jsx("span",{
            className:"text-[220px] font-black leading-none",children:S
          }),T&&e.jsxs("span",{
            className:"text-[60px] font-black leading-none",children:[".",T]
          }),e.jsx("span",{
            className:"text-[40px] font-bold ml-1",children:"đ"
          })]
        })
      }),e.jsx("div",{
        className:"text-center text-[24px] font-medium uppercase",children:"SẢN PHẨM GIÁ RẺ"
      }),e.jsx("div",{
        className:"absolute bottom-1 right-2 text-[10px] font-normal opacity-70",children:h
      })]
    })
  }return e.jsx("div",{
    className:"w-[148.5mm] h-[105mm] bg-white border-[8px] border-black p-1.5 box-border relative text-black shrink-0 overflow-hidden",style:{
      fontFamily:'"Oswald", sans-serif'
    },children:e.jsxs("div",{
      className:"w-full h-full border-[3px] border-black p-3 flex flex-col relative",children:[e.jsxs("div",{
        className:"flex justify-between items-start gap-4",children:[e.jsx("div",{
          className:"flex-1 text-center pt-1",children:e.jsx("h1",{
            className:"text-[28px] leading-[1.1] font-black uppercase tracking-tighter",style:{
              fontFamily:'"Oswald", sans-serif',transform:"scaleY(1.1)"
            },children:t.name||"Tên sản phẩm"
          })
        }),e.jsxs("div",{
          className:"flex flex-col items-end shrink-0",children:[e.jsx(ts,{
            value:t.qrData||t.maSanPham||t.productCode||"00000",size:56,level:"L"
          }),e.jsxs("div",{
            className:"text-[10px] font-bold mt-1 text-right leading-tight tracking-tight",children:[t.maSanPham||t.productCode,e.jsx("br",{
              
            }),h]
          })]
        })]
      }),e.jsxs("div",{
        className:"flex-1 flex flex-col items-center justify-center -mt-2",children:[e.jsxs("div",{
          className:"relative",children:[e.jsx("span",{
            className:"text-[55px] font-black tracking-tighter",style:{
              fontFamily:'"Oswald", sans-serif',transform:"scaleY(1.1)",display:"inline-block"
            },children:N(t.originalPrice)
          }),e.jsx("div",{
            className:"absolute top-1/2 left-[-5%] right-[-5%] h-[4px] bg-black -translate-y-1/2"
          })]
        }),e.jsx("div",{
          className:"text-[120px] leading-[0.8] font-black tracking-tighter mt-2",style:{
            fontFamily:'"Oswald", sans-serif',transform:"scaleY(1.1)",display:"inline-block"
          },children:N(t.discountPrice)
        })]
      }),a&&e.jsx("div",{
        className:"text-center font-bold text-[16px] mb-6 tracking-tight uppercase",children:"sản phẩm giá sốc - event T7 & CN"
      }),e.jsx("div",{
        className:"absolute bottom-0 left-0 right-0 h-5 bg-black"
      })]
    })
  })
}function Va({
  isOpen:t,isCe:r=!1,isLk:n=!1,onClose:a,onConfirm:o
}){
  const[i,x]=v.useState("classic"),[u,m]=v.useState("4"),[d,h]=v.useState(!0);
  if(v.useEffect(()=>{
    r?(x("sticker_ce"),m("1")):n?(x("sticker_lk"),m("1")):(x("classic"),m("4"))
  },[r,n,t]),!t)return null;
  const N=[{
    id:"1",title:"1 Sticker / Trang",desc:"CE, QĐH, Quạt lớn, MLN"
  },{
    id:"2",title:"2 Sticker / Trang",desc:"Bộ lau nhà, Bếp đôi, Lò vi sóng, Lò nướng"
  },{
    id:"4",title:"4 Sticker / Trang",desc:"Nồi cơm, Nồi chiên, Bếp đơn, Nồi, Quạt nhỏ"
  },{
    id:"8",title:"8 Sticker / Trang",desc:"Máy sấy tóc, bàn ủi, bình đun, Máy xay sinh tố, vợt muỗi, thớt"
  }];
  return e.jsx("div",{
    className:"fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4",children:e.jsxs("div",{
      className:"bg-white rounded-2xl w-full max-w-3xl flex flex-col max-h-[90vh] shadow-2xl",children:[e.jsxs("div",{
        className:"flex items-center justify-between p-6 border-b border-slate-100",children:[e.jsx("h2",{
          className:"text-2xl font-bold text-slate-800",children:"Chọn Kiểu & Bố Cục In"
        }),e.jsx("button",{
          onClick:a,className:"text-slate-400 hover:text-slate-600 transition-colors",children:e.jsx(gt,{
            size:24
          })
        })]
      }),e.jsxs("div",{
        className:"p-6 overflow-y-auto",children:[e.jsxs("div",{
          className:"mb-8",children:[e.jsx("h3",{
            className:"text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider",children:"1. CHỌN KIỂU STICKER"
          }),r||n?e.jsx("div",{
            className:"p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50/55 flex items-center",children:e.jsx("span",{
              className:"font-black text-indigo-600 text-sm uppercase tracking-wide",children:r?"In Sticker CE (Điện máy)":"In Sticker Loa Kéo"
            })
          }):e.jsxs("div",{
            className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("label",{
              className:`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                i==="classic"?"border-indigo-500 bg-indigo-50/50":"border-slate-200 hover:border-indigo-200"
              }`,children:[e.jsx("input",{
                type:"radio",name:"stickerStyle",value:"classic",checked:i==="classic",onChange:y=>x(y.target.value),className:"w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
              }),e.jsx("span",{
                className:"ml-3 font-medium text-slate-800",children:"Kiểu có sẵn"
              })]
            }),e.jsxs("label",{
              className:`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                i==="modern"?"border-indigo-500 bg-indigo-50/50":"border-slate-200 hover:border-indigo-200"
              }`,children:[e.jsx("input",{
                type:"radio",name:"stickerStyle",value:"modern",checked:i==="modern",onChange:y=>x(y.target.value),className:"w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
              }),e.jsx("span",{
                className:"ml-3 font-medium text-slate-800",children:"Kiểu giá quạt"
              })]
            }),e.jsxs("label",{
              className:`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                i==="display"?"border-indigo-500 bg-indigo-50/50":"border-slate-200 hover:border-indigo-200"
              }`,children:[e.jsx("input",{
                type:"radio",name:"stickerStyle",value:"display",checked:i==="display",onChange:y=>x(y.target.value),className:"w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
              }),e.jsx("span",{
                className:"ml-3 font-medium text-slate-800",children:"Kiểu hàng trưng bày"
              })]
            }),e.jsxs("label",{
              className:`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                i==="giovang"?"border-indigo-500 bg-indigo-50/50":"border-slate-200 hover:border-indigo-200"
              }`,children:[e.jsx("input",{
                type:"radio",name:"stickerStyle",value:"giovang",checked:i==="giovang",onChange:y=>x(y.target.value),className:"w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
              }),e.jsx("span",{
                className:"ml-3 font-medium text-slate-800 text-red-600 font-black",children:"GIỜ VÀNG GIÁ SỐC (A5)"
              })]
            }),e.jsxs("label",{
              className:`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                i==="a4_giasoc"?"border-indigo-500 bg-indigo-50/50":"border-slate-200 hover:border-indigo-200"
              }`,children:[e.jsx("input",{
                type:"radio",name:"stickerStyle",value:"a4_giasoc",checked:i==="a4_giasoc",onChange:y=>x(y.target.value),className:"w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
              }),e.jsx("span",{
                className:"ml-3 font-medium text-slate-800 text-amber-500 font-black",children:"A4 ĐỨNG (GIÁ SỐC VÀNG)"
              })]
            })]
          })]
        }),e.jsxs("div",{
          className:"mb-8",children:[e.jsx("h3",{
            className:"text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider",children:"2. CHỌN BỐ CỤC TRANG IN"
          }),e.jsx("div",{
            className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:r||n?e.jsxs(e.Fragment,{
              children:[e.jsxs("div",{
                onClick:()=>m("1"),className:`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                  u==="1"?"border-indigo-500 bg-indigo-50/50":"border-slate-200 hover:border-indigo-200"
                }`,children:[e.jsx("h4",{
                  className:"text-lg font-bold text-slate-800 mb-1",children:"1 Sticker / Trang A5 ngang"
                }),e.jsx("p",{
                  className:"text-sm text-slate-500",children:"Kích thước 210 x 148.5 mm (A5 ngang)"
                })]
              }),e.jsxs("div",{
                onClick:()=>m("2"),className:`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                  u==="2"?"border-indigo-500 bg-indigo-50/50":"border-slate-200 hover:border-indigo-200"
                }`,children:[e.jsx("h4",{
                  className:"text-lg font-bold text-slate-800 mb-1",children:"2 Sticker A6 / Trang A5 đứng"
                }),e.jsx("p",{
                  className:"text-sm text-slate-500",children:"1 Trang A5 đứng = 2 Sticker A6 (148.5 x 105 mm)"
                })]
              })]
            }):i==="display"||i==="giovang"||i==="a4_giasoc"?e.jsxs("div",{
              className:"p-5 rounded-xl border-2 cursor-pointer transition-all border-indigo-500 bg-indigo-50/50",children:[e.jsxs("h4",{
                className:"text-lg font-bold text-slate-800 mb-1",children:["1 Sticker / Trang ",i==="a4_giasoc"?"A4":"A5"]
              }),e.jsxs("p",{
                className:"text-sm text-slate-500",children:["Kích thước ",i==="a4_giasoc"?"210 x 297 mm (A4 Đứng)":"148.5 x 210 mm (A5 Đứng)"]
              })]
            }):N.map(y=>e.jsxs("div",{
              onClick:()=>m(y.id),className:`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                u===y.id?"border-indigo-500 bg-indigo-50/50":"border-slate-200 hover:border-indigo-200"
              }`,children:[e.jsx("h4",{
                className:"text-lg font-bold text-slate-800 mb-1",children:y.title
              }),e.jsx("p",{
                className:"text-sm text-slate-500",children:y.desc
              })]
            },y.id))
          })]
        }),!(r||n)&&e.jsxs("div",{
          children:[e.jsx("h3",{
            className:"text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider",children:"3. TÙY CHỌN KHÁC"
          }),e.jsxs("label",{
            className:"flex items-center p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-200 cursor-pointer transition-all",children:[e.jsx("input",{
              type:"checkbox",checked:d,onChange:y=>h(y.target.checked),className:"w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            }),e.jsx("span",{
              className:"ml-3 font-medium text-slate-800",children:'Hiển thị nhãn "SẢN PHẨM GIÁ SỐC - EVENT T7 & CN"'
            })]
          })]
        })]
      }),e.jsxs("div",{
        className:"p-6 border-t border-slate-100 flex justify-end gap-3",children:[e.jsx("button",{
          onClick:a,className:"px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors",children:"Hủy"
        }),e.jsx("button",{
          onClick:()=>{
            o(i,i==="display"||i==="giovang"||i==="a4_giasoc"?"1":u,r||n?!1:d)
          },className:"px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors",children:"Tiếp tục"
        })]
      })]
    })
  })
}const Kn=6048e5,Qa=864e5,jn=Symbol.for("constructDateFrom");
function Ue(t,r){
  return typeof t=="function"?t(r):t&&typeof t=="object"&&jn in t?t[jn](r):t instanceof Date?new t.constructor(r):new Date(r)
}function Oe(t,r){
  return Ue(r||t,t)
}function zs(t,r,n){
  const a=Oe(t,n==null?void 0:n.in);
  return isNaN(r)?Ue(t,NaN):(r&&a.setDate(a.getDate()+r),a)
}function wn(t,r,n){
  const a=Oe(t,n==null?void 0:n.in);
  if(isNaN(r))return Ue(t,NaN);
  if(!r)return a;
  const o=a.getDate(),i=Ue(t,a.getTime());
  i.setMonth(a.getMonth()+r+1,0);
  const x=i.getDate();
  return o>=x?i:(a.setFullYear(i.getFullYear(),i.getMonth(),o),a)
}let qa={
  
};
function os(){
  return qa
}function At(t,r){
  var u,m,d,h;
  const n=os(),a=(r==null?void 0:r.weekStartsOn)??((m=(u=r==null?void 0:r.locale)==null?void 0:u.options)==null?void 0:m.weekStartsOn)??n.weekStartsOn??((h=(d=n.locale)==null?void 0:d.options)==null?void 0:h.weekStartsOn)??0,o=Oe(t,r==null?void 0:r.in),i=o.getDay(),x=(i<a?7:0)+i-a;
  return o.setDate(o.getDate()-x),o.setHours(0,0,0,0),o
}function ls(t,r){
  return At(t,{
    ...r,weekStartsOn:1
  })
}function Un(t,r){
  const n=Oe(t,r==null?void 0:r.in),a=n.getFullYear(),o=Ue(n,0);
  o.setFullYear(a+1,0,4),o.setHours(0,0,0,0);
  const i=ls(o),x=Ue(n,0);
  x.setFullYear(a,0,4),x.setHours(0,0,0,0);
  const u=ls(x);
  return n.getTime()>=i.getTime()?a+1:n.getTime()>=u.getTime()?a:a-1
}function kn(t){
  const r=Oe(t),n=new Date(Date.UTC(r.getFullYear(),r.getMonth(),r.getDate(),r.getHours(),r.getMinutes(),r.getSeconds(),r.getMilliseconds()));
  return n.setUTCFullYear(r.getFullYear()),+t-+n
}function Yn(t,...r){
  const n=Ue.bind(null,r.find(a=>typeof a=="object"));
  return r.map(n)
}function Sn(t,r){
  const n=Oe(t,r==null?void 0:r.in);
  return n.setHours(0,0,0,0),n
}function Xa(t,r,n){
  const[a,o]=Yn(n==null?void 0:n.in,t,r),i=Sn(a),x=Sn(o),u=+i-kn(i),m=+x-kn(x);
  return Math.round((u-m)/Qa)
}function Ja(t,r){
  const n=Un(t,r),a=Ue(t,0);
  return a.setFullYear(n,0,4),a.setHours(0,0,0,0),ls(a)
}function Za(t){
  return t instanceof Date||typeof t=="object"&&Object.prototype.toString.call(t)==="[object Date]"
}function er(t){
  return!(!Za(t)&&typeof t!="number"||isNaN(+Oe(t)))
}function tr(t,r){
  const n=Oe(t,r==null?void 0:r.in),a=n.getMonth();
  return n.setFullYear(n.getFullYear(),a+1,0),n.setHours(23,59,59,999),n
}function sr(t,r){
  const[n,a]=Yn(t,r.start,r.end);
  return{
    start:n,end:a
  }
}function Vn(t,r){
  const{
    start:n,end:a
  }=sr(r==null?void 0:r.in,t);
  let o=+n>+a;
  const i=o?+n:+a,x=o?a:n;
  x.setHours(0,0,0,0);
  let u=1;
  const m=[];
  for(;
  +x<=i;
  )m.push(Ue(n,x)),x.setDate(x.getDate()+u),x.setHours(0,0,0,0);
  return o?m.reverse():m
}function nr(t,r){
  const n=Oe(t,r==null?void 0:r.in);
  return n.setDate(1),n.setHours(0,0,0,0),n
}function ar(t,r){
  const n=Oe(t,r==null?void 0:r.in);
  return n.setFullYear(n.getFullYear(),0,1),n.setHours(0,0,0,0),n
}function rr(t,r){
  const n=r==null?void 0:r.weekStartsOn,a=Oe(t,r==null?void 0:r.in),o=a.getDay(),i=(o<n?-7:0)+6-(o-n);
  return a.setDate(a.getDate()+i),a.setHours(23,59,59,999),a
}const lr={
  lessThanXSeconds:{
    one:"less than a second",other:"less than {
      {
        count
      }
    } seconds"
  },xSeconds:{
    one:"1 second",other:"{
      {
        count
      }
    } seconds"
  },halfAMinute:"half a minute",lessThanXMinutes:{
    one:"less than a minute",other:"less than {
      {
        count
      }
    } minutes"
  },xMinutes:{
    one:"1 minute",other:"{
      {
        count
      }
    } minutes"
  },aboutXHours:{
    one:"about 1 hour",other:"about {
      {
        count
      }
    } hours"
  },xHours:{
    one:"1 hour",other:"{
      {
        count
      }
    } hours"
  },xDays:{
    one:"1 day",other:"{
      {
        count
      }
    } days"
  },aboutXWeeks:{
    one:"about 1 week",other:"about {
      {
        count
      }
    } weeks"
  },xWeeks:{
    one:"1 week",other:"{
      {
        count
      }
    } weeks"
  },aboutXMonths:{
    one:"about 1 month",other:"about {
      {
        count
      }
    } months"
  },xMonths:{
    one:"1 month",other:"{
      {
        count
      }
    } months"
  },aboutXYears:{
    one:"about 1 year",other:"about {
      {
        count
      }
    } years"
  },xYears:{
    one:"1 year",other:"{
      {
        count
      }
    } years"
  },overXYears:{
    one:"over 1 year",other:"over {
      {
        count
      }
    } years"
  },almostXYears:{
    one:"almost 1 year",other:"almost {
      {
        count
      }
    } years"
  }
},ir=(t,r,n)=>{
  let a;
  const o=lr[t];
  return typeof o=="string"?a=o:r===1?a=o.one:a=o.other.replace("{
    {
      count
    }
  }",r.toString()),n!=null&&n.addSuffix?n.comparison&&n.comparison>0?"in "+a:a+" ago":a
};
function It(t){
  return(r={
    
  })=>{
    const n=r.width?String(r.width):t.defaultWidth;
    return t.formats[n]||t.formats[t.defaultWidth]
  }
}const or={
  full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"
},cr={
  full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"
},dr={
  full:"{
    {
      date
    }
  } 'at' {
    {
      time
    }
  }",long:"{
    {
      date
    }
  } 'at' {
    {
      time
    }
  }",medium:"{
    {
      date
    }
  }, {
    {
      time
    }
  }",short:"{
    {
      date
    }
  }, {
    {
      time
    }
  }"
},xr={
  date:It({
    formats:or,defaultWidth:"full"
  }),time:It({
    formats:cr,defaultWidth:"full"
  }),dateTime:It({
    formats:dr,defaultWidth:"full"
  })
},hr={
  lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"
},ur=(t,r,n,a)=>hr[t];
function it(t){
  return(r,n)=>{
    const a=n!=null&&n.context?String(n.context):"standalone";
    let o;
    if(a==="formatting"&&t.formattingValues){
      const x=t.defaultFormattingWidth||t.defaultWidth,u=n!=null&&n.width?String(n.width):x;
      o=t.formattingValues[u]||t.formattingValues[x]
    }else{
      const x=t.defaultWidth,u=n!=null&&n.width?String(n.width):t.defaultWidth;
      o=t.values[u]||t.values[x]
    }const i=t.argumentCallback?t.argumentCallback(r):r;
    return o[i]
  }
}const mr={
  narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]
},pr={
  narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]
},gr={
  narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]
},fr={
  narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
},br={
  narrow:{
    am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"
  },abbreviated:{
    am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"
  },wide:{
    am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"
  }
},yr={
  narrow:{
    am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"
  },abbreviated:{
    am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"
  },wide:{
    am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"
  }
},Nr=(t,r)=>{
  const n=Number(t),a=n%100;
  if(a>20||a<10)switch(a%10){
    case 1:return n+"st";
    case 2:return n+"nd";
    case 3:return n+"rd"
  }return n+"th"
},vr={
  ordinalNumber:Nr,era:it({
    values:mr,defaultWidth:"wide"
  }),quarter:it({
    values:pr,defaultWidth:"wide",argumentCallback:t=>t-1
  }),month:it({
    values:gr,defaultWidth:"wide"
  }),day:it({
    values:fr,defaultWidth:"wide"
  }),dayPeriod:it({
    values:br,defaultWidth:"wide",formattingValues:yr,defaultFormattingWidth:"wide"
  })
};
function ot(t){
  return(r,n={
    
  })=>{
    const a=n.width,o=a&&t.matchPatterns[a]||t.matchPatterns[t.defaultMatchWidth],i=r.match(o);
    if(!i)return null;
    const x=i[0],u=a&&t.parsePatterns[a]||t.parsePatterns[t.defaultParseWidth],m=Array.isArray(u)?wr(u,N=>N.test(x)):jr(u,N=>N.test(x));
    let d;
    d=t.valueCallback?t.valueCallback(m):m,d=n.valueCallback?n.valueCallback(d):d;
    const h=r.slice(x.length);
    return{
      value:d,rest:h
    }
  }
}function jr(t,r){
  for(const n in t)if(Object.prototype.hasOwnProperty.call(t,n)&&r(t[n]))return n
}function wr(t,r){
  for(let n=0;
  n<t.length;
  n++)if(r(t[n]))return n
}function Qn(t){
  return(r,n={
    
  })=>{
    const a=r.match(t.matchPattern);
    if(!a)return null;
    const o=a[0],i=r.match(t.parsePattern);
    if(!i)return null;
    let x=t.valueCallback?t.valueCallback(i[0]):i[0];
    x=n.valueCallback?n.valueCallback(x):x;
    const u=r.slice(o.length);
    return{
      value:x,rest:u
    }
  }
}const kr=/^(\d+)(th|st|nd|rd)?/i,Sr=/\d+/i,Cr={
  narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i
},Tr={
  any:[/^b/i,/^(a|c)/i]
},_r={
  narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i
},Pr={
  any:[/1/i,/2/i,/3/i,/4/i]
},Ir={
  narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i
},Mr={
  narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]
},Ar={
  narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
},Hr={
  narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]
},Lr={
  narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
},Dr={
  any:{
    am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i
  }
},Er={
  ordinalNumber:Qn({
    matchPattern:kr,parsePattern:Sr,valueCallback:t=>parseInt(t,10)
  }),era:ot({
    matchPatterns:Cr,defaultMatchWidth:"wide",parsePatterns:Tr,defaultParseWidth:"any"
  }),quarter:ot({
    matchPatterns:_r,defaultMatchWidth:"wide",parsePatterns:Pr,defaultParseWidth:"any",valueCallback:t=>t+1
  }),month:ot({
    matchPatterns:Ir,defaultMatchWidth:"wide",parsePatterns:Mr,defaultParseWidth:"any"
  }),day:ot({
    matchPatterns:Ar,defaultMatchWidth:"wide",parsePatterns:Hr,defaultParseWidth:"any"
  }),dayPeriod:ot({
    matchPatterns:Lr,defaultMatchWidth:"any",parsePatterns:Dr,defaultParseWidth:"any"
  })
},Or={
  code:"en-US",formatDistance:ir,formatLong:xr,formatRelative:ur,localize:vr,match:Er,options:{
    weekStartsOn:0,firstWeekContainsDate:1
  }
};
function Br(t,r){
  const n=Oe(t,r==null?void 0:r.in);
  return Xa(n,ar(n))+1
}function Rr(t,r){
  const n=Oe(t,r==null?void 0:r.in),a=+ls(n)-+Ja(n);
  return Math.round(a/Kn)+1
}function qn(t,r){
  var h,N,y,w;
  const n=Oe(t,r==null?void 0:r.in),a=n.getFullYear(),o=os(),i=(r==null?void 0:r.firstWeekContainsDate)??((N=(h=r==null?void 0:r.locale)==null?void 0:h.options)==null?void 0:N.firstWeekContainsDate)??o.firstWeekContainsDate??((w=(y=o.locale)==null?void 0:y.options)==null?void 0:w.firstWeekContainsDate)??1,x=Ue((r==null?void 0:r.in)||t,0);
  x.setFullYear(a+1,0,i),x.setHours(0,0,0,0);
  const u=At(x,r),m=Ue((r==null?void 0:r.in)||t,0);
  m.setFullYear(a,0,i),m.setHours(0,0,0,0);
  const d=At(m,r);
  return+n>=+u?a+1:+n>=+d?a:a-1
}function zr(t,r){
  var u,m,d,h;
  const n=os(),a=(r==null?void 0:r.firstWeekContainsDate)??((m=(u=r==null?void 0:r.locale)==null?void 0:u.options)==null?void 0:m.firstWeekContainsDate)??n.firstWeekContainsDate??((h=(d=n.locale)==null?void 0:d.options)==null?void 0:h.firstWeekContainsDate)??1,o=qn(t,r),i=Ue((r==null?void 0:r.in)||t,0);
  return i.setFullYear(o,0,a),i.setHours(0,0,0,0),At(i,r)
}function Gr(t,r){
  const n=Oe(t,r==null?void 0:r.in),a=+At(n,r)-+zr(n,r);
  return Math.round(a/Kn)+1
}function de(t,r){
  const n=t<0?"-":"",a=Math.abs(t).toString().padStart(r,"0");
  return n+a
}const pt={
  y(t,r){
    const n=t.getFullYear(),a=n>0?n:1-n;
    return de(r==="yy"?a%100:a,r.length)
  },M(t,r){
    const n=t.getMonth();
    return r==="M"?String(n+1):de(n+1,2)
  },d(t,r){
    return de(t.getDate(),r.length)
  },a(t,r){
    const n=t.getHours()/12>=1?"pm":"am";
    switch(r){
      case"a":case"aa":return n.toUpperCase();
      case"aaa":return n;
      case"aaaaa":return n[0];
      case"aaaa":default:return n==="am"?"a.m.":"p.m."
    }
  },h(t,r){
    return de(t.getHours()%12||12,r.length)
  },H(t,r){
    return de(t.getHours(),r.length)
  },m(t,r){
    return de(t.getMinutes(),r.length)
  },s(t,r){
    return de(t.getSeconds(),r.length)
  },S(t,r){
    const n=r.length,a=t.getMilliseconds(),o=Math.trunc(a*Math.pow(10,n-3));
    return de(o,r.length)
  }
},Ct={
  midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"
},Cn={
  G:function(t,r,n){
    const a=t.getFullYear()>0?1:0;
    switch(r){
      case"G":case"GG":case"GGG":return n.era(a,{
        width:"abbreviated"
      });
      case"GGGGG":return n.era(a,{
        width:"narrow"
      });
      case"GGGG":default:return n.era(a,{
        width:"wide"
      })
    }
  },y:function(t,r,n){
    if(r==="yo"){
      const a=t.getFullYear(),o=a>0?a:1-a;
      return n.ordinalNumber(o,{
        unit:"year"
      })
    }return pt.y(t,r)
  },Y:function(t,r,n,a){
    const o=qn(t,a),i=o>0?o:1-o;
    if(r==="YY"){
      const x=i%100;
      return de(x,2)
    }return r==="Yo"?n.ordinalNumber(i,{
      unit:"year"
    }):de(i,r.length)
  },R:function(t,r){
    const n=Un(t);
    return de(n,r.length)
  },u:function(t,r){
    const n=t.getFullYear();
    return de(n,r.length)
  },Q:function(t,r,n){
    const a=Math.ceil((t.getMonth()+1)/3);
    switch(r){
      case"Q":return String(a);
      case"QQ":return de(a,2);
      case"Qo":return n.ordinalNumber(a,{
        unit:"quarter"
      });
      case"QQQ":return n.quarter(a,{
        width:"abbreviated",context:"formatting"
      });
      case"QQQQQ":return n.quarter(a,{
        width:"narrow",context:"formatting"
      });
      case"QQQQ":default:return n.quarter(a,{
        width:"wide",context:"formatting"
      })
    }
  },q:function(t,r,n){
    const a=Math.ceil((t.getMonth()+1)/3);
    switch(r){
      case"q":return String(a);
      case"qq":return de(a,2);
      case"qo":return n.ordinalNumber(a,{
        unit:"quarter"
      });
      case"qqq":return n.quarter(a,{
        width:"abbreviated",context:"standalone"
      });
      case"qqqqq":return n.quarter(a,{
        width:"narrow",context:"standalone"
      });
      case"qqqq":default:return n.quarter(a,{
        width:"wide",context:"standalone"
      })
    }
  },M:function(t,r,n){
    const a=t.getMonth();
    switch(r){
      case"M":case"MM":return pt.M(t,r);
      case"Mo":return n.ordinalNumber(a+1,{
        unit:"month"
      });
      case"MMM":return n.month(a,{
        width:"abbreviated",context:"formatting"
      });
      case"MMMMM":return n.month(a,{
        width:"narrow",context:"formatting"
      });
      case"MMMM":default:return n.month(a,{
        width:"wide",context:"formatting"
      })
    }
  },L:function(t,r,n){
    const a=t.getMonth();
    switch(r){
      case"L":return String(a+1);
      case"LL":return de(a+1,2);
      case"Lo":return n.ordinalNumber(a+1,{
        unit:"month"
      });
      case"LLL":return n.month(a,{
        width:"abbreviated",context:"standalone"
      });
      case"LLLLL":return n.month(a,{
        width:"narrow",context:"standalone"
      });
      case"LLLL":default:return n.month(a,{
        width:"wide",context:"standalone"
      })
    }
  },w:function(t,r,n,a){
    const o=Gr(t,a);
    return r==="wo"?n.ordinalNumber(o,{
      unit:"week"
    }):de(o,r.length)
  },I:function(t,r,n){
    const a=Rr(t);
    return r==="Io"?n.ordinalNumber(a,{
      unit:"week"
    }):de(a,r.length)
  },d:function(t,r,n){
    return r==="do"?n.ordinalNumber(t.getDate(),{
      unit:"date"
    }):pt.d(t,r)
  },D:function(t,r,n){
    const a=Br(t);
    return r==="Do"?n.ordinalNumber(a,{
      unit:"dayOfYear"
    }):de(a,r.length)
  },E:function(t,r,n){
    const a=t.getDay();
    switch(r){
      case"E":case"EE":case"EEE":return n.day(a,{
        width:"abbreviated",context:"formatting"
      });
      case"EEEEE":return n.day(a,{
        width:"narrow",context:"formatting"
      });
      case"EEEEEE":return n.day(a,{
        width:"short",context:"formatting"
      });
      case"EEEE":default:return n.day(a,{
        width:"wide",context:"formatting"
      })
    }
  },e:function(t,r,n,a){
    const o=t.getDay(),i=(o-a.weekStartsOn+8)%7||7;
    switch(r){
      case"e":return String(i);
      case"ee":return de(i,2);
      case"eo":return n.ordinalNumber(i,{
        unit:"day"
      });
      case"eee":return n.day(o,{
        width:"abbreviated",context:"formatting"
      });
      case"eeeee":return n.day(o,{
        width:"narrow",context:"formatting"
      });
      case"eeeeee":return n.day(o,{
        width:"short",context:"formatting"
      });
      case"eeee":default:return n.day(o,{
        width:"wide",context:"formatting"
      })
    }
  },c:function(t,r,n,a){
    const o=t.getDay(),i=(o-a.weekStartsOn+8)%7||7;
    switch(r){
      case"c":return String(i);
      case"cc":return de(i,r.length);
      case"co":return n.ordinalNumber(i,{
        unit:"day"
      });
      case"ccc":return n.day(o,{
        width:"abbreviated",context:"standalone"
      });
      case"ccccc":return n.day(o,{
        width:"narrow",context:"standalone"
      });
      case"cccccc":return n.day(o,{
        width:"short",context:"standalone"
      });
      case"cccc":default:return n.day(o,{
        width:"wide",context:"standalone"
      })
    }
  },i:function(t,r,n){
    const a=t.getDay(),o=a===0?7:a;
    switch(r){
      case"i":return String(o);
      case"ii":return de(o,r.length);
      case"io":return n.ordinalNumber(o,{
        unit:"day"
      });
      case"iii":return n.day(a,{
        width:"abbreviated",context:"formatting"
      });
      case"iiiii":return n.day(a,{
        width:"narrow",context:"formatting"
      });
      case"iiiiii":return n.day(a,{
        width:"short",context:"formatting"
      });
      case"iiii":default:return n.day(a,{
        width:"wide",context:"formatting"
      })
    }
  },a:function(t,r,n){
    const o=t.getHours()/12>=1?"pm":"am";
    switch(r){
      case"a":case"aa":return n.dayPeriod(o,{
        width:"abbreviated",context:"formatting"
      });
      case"aaa":return n.dayPeriod(o,{
        width:"abbreviated",context:"formatting"
      }).toLowerCase();
      case"aaaaa":return n.dayPeriod(o,{
        width:"narrow",context:"formatting"
      });
      case"aaaa":default:return n.dayPeriod(o,{
        width:"wide",context:"formatting"
      })
    }
  },b:function(t,r,n){
    const a=t.getHours();
    let o;
    switch(a===12?o=Ct.noon:a===0?o=Ct.midnight:o=a/12>=1?"pm":"am",r){
      case"b":case"bb":return n.dayPeriod(o,{
        width:"abbreviated",context:"formatting"
      });
      case"bbb":return n.dayPeriod(o,{
        width:"abbreviated",context:"formatting"
      }).toLowerCase();
      case"bbbbb":return n.dayPeriod(o,{
        width:"narrow",context:"formatting"
      });
      case"bbbb":default:return n.dayPeriod(o,{
        width:"wide",context:"formatting"
      })
    }
  },B:function(t,r,n){
    const a=t.getHours();
    let o;
    switch(a>=17?o=Ct.evening:a>=12?o=Ct.afternoon:a>=4?o=Ct.morning:o=Ct.night,r){
      case"B":case"BB":case"BBB":return n.dayPeriod(o,{
        width:"abbreviated",context:"formatting"
      });
      case"BBBBB":return n.dayPeriod(o,{
        width:"narrow",context:"formatting"
      });
      case"BBBB":default:return n.dayPeriod(o,{
        width:"wide",context:"formatting"
      })
    }
  },h:function(t,r,n){
    if(r==="ho"){
      let a=t.getHours()%12;
      return a===0&&(a=12),n.ordinalNumber(a,{
        unit:"hour"
      })
    }return pt.h(t,r)
  },H:function(t,r,n){
    return r==="Ho"?n.ordinalNumber(t.getHours(),{
      unit:"hour"
    }):pt.H(t,r)
  },K:function(t,r,n){
    const a=t.getHours()%12;
    return r==="Ko"?n.ordinalNumber(a,{
      unit:"hour"
    }):de(a,r.length)
  },k:function(t,r,n){
    let a=t.getHours();
    return a===0&&(a=24),r==="ko"?n.ordinalNumber(a,{
      unit:"hour"
    }):de(a,r.length)
  },m:function(t,r,n){
    return r==="mo"?n.ordinalNumber(t.getMinutes(),{
      unit:"minute"
    }):pt.m(t,r)
  },s:function(t,r,n){
    return r==="so"?n.ordinalNumber(t.getSeconds(),{
      unit:"second"
    }):pt.s(t,r)
  },S:function(t,r){
    return pt.S(t,r)
  },X:function(t,r,n){
    const a=t.getTimezoneOffset();
    if(a===0)return"Z";
    switch(r){
      case"X":return _n(a);
      case"XXXX":case"XX":return yt(a);
      case"XXXXX":case"XXX":default:return yt(a,":")
    }
  },x:function(t,r,n){
    const a=t.getTimezoneOffset();
    switch(r){
      case"x":return _n(a);
      case"xxxx":case"xx":return yt(a);
      case"xxxxx":case"xxx":default:return yt(a,":")
    }
  },O:function(t,r,n){
    const a=t.getTimezoneOffset();
    switch(r){
      case"O":case"OO":case"OOO":return"GMT"+Tn(a,":");
      case"OOOO":default:return"GMT"+yt(a,":")
    }
  },z:function(t,r,n){
    const a=t.getTimezoneOffset();
    switch(r){
      case"z":case"zz":case"zzz":return"GMT"+Tn(a,":");
      case"zzzz":default:return"GMT"+yt(a,":")
    }
  },t:function(t,r,n){
    const a=Math.trunc(+t/1e3);
    return de(a,r.length)
  },T:function(t,r,n){
    return de(+t,r.length)
  }
};
function Tn(t,r=""){
  const n=t>0?"-":"+",a=Math.abs(t),o=Math.trunc(a/60),i=a%60;
  return i===0?n+String(o):n+String(o)+r+de(i,2)
}function _n(t,r){
  return t%60===0?(t>0?"-":"+")+de(Math.abs(t)/60,2):yt(t,r)
}function yt(t,r=""){
  const n=t>0?"-":"+",a=Math.abs(t),o=de(Math.trunc(a/60),2),i=de(a%60,2);
  return n+o+r+i
}const Pn=(t,r)=>{
  switch(t){
    case"P":return r.date({
      width:"short"
    });
    case"PP":return r.date({
      width:"medium"
    });
    case"PPP":return r.date({
      width:"long"
    });
    case"PPPP":default:return r.date({
      width:"full"
    })
  }
},Xn=(t,r)=>{
  switch(t){
    case"p":return r.time({
      width:"short"
    });
    case"pp":return r.time({
      width:"medium"
    });
    case"ppp":return r.time({
      width:"long"
    });
    case"pppp":default:return r.time({
      width:"full"
    })
  }
},$r=(t,r)=>{
  const n=t.match(/(P+)(p+)?/)||[],a=n[1],o=n[2];
  if(!o)return Pn(t,r);
  let i;
  switch(a){
    case"P":i=r.dateTime({
      width:"short"
    });
    break;
    case"PP":i=r.dateTime({
      width:"medium"
    });
    break;
    case"PPP":i=r.dateTime({
      width:"long"
    });
    break;
    case"PPPP":default:i=r.dateTime({
      width:"full"
    });
    break
  }return i.replace("{
    {
      date
    }
  }",Pn(a,r)).replace("{
    {
      time
    }
  }",Xn(o,r))
},Fr={
  p:Xn,P:$r
},Wr=/^D+$/,Kr=/^Y+$/,Ur=["D","DD","YY","YYYY"];
function Yr(t){
  return Wr.test(t)
}function Vr(t){
  return Kr.test(t)
}function Qr(t,r,n){
  const a=qr(t,r,n);
  if(console.warn(a),Ur.includes(t))throw new RangeError(a)
}function qr(t,r,n){
  const a=t[0]==="Y"?"years":"days of the month";
  return`Use \`${
    t.toLowerCase()
  }\` instead of \`${
    t
  }\` (in \`${
    r
  }\`) for formatting ${
    a
  } to the input \`${
    n
  }\`;
   see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`
}const Xr=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Jr=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Zr=/^'([^]*?)'?$/,el=/''/g,tl=/[a-zA-Z]/;
function ae(t,r,n){
  var h,N,y,w,S,T,A,L;
  const a=os(),o=(n==null?void 0:n.locale)??a.locale??Or,i=(n==null?void 0:n.firstWeekContainsDate)??((N=(h=n==null?void 0:n.locale)==null?void 0:h.options)==null?void 0:N.firstWeekContainsDate)??a.firstWeekContainsDate??((w=(y=a.locale)==null?void 0:y.options)==null?void 0:w.firstWeekContainsDate)??1,x=(n==null?void 0:n.weekStartsOn)??((T=(S=n==null?void 0:n.locale)==null?void 0:S.options)==null?void 0:T.weekStartsOn)??a.weekStartsOn??((L=(A=a.locale)==null?void 0:A.options)==null?void 0:L.weekStartsOn)??0,u=Oe(t,n==null?void 0:n.in);
  if(!er(u))throw new RangeError("Invalid time value");
  let m=r.match(Jr).map(C=>{
    const R=C[0];
    if(R==="p"||R==="P"){
      const G=Fr[R];
      return G(C,o.formatLong)
    }return C
  }).join("").match(Xr).map(C=>{
    if(C==="''")return{
      isToken:!1,value:"'"
    };
    const R=C[0];
    if(R==="'")return{
      isToken:!1,value:sl(C)
    };
    if(Cn[R])return{
      isToken:!0,value:C
    };
    if(R.match(tl))throw new RangeError("Format string contains an unescaped latin alphabet character `"+R+"`");
    return{
      isToken:!1,value:C
    }
  });
  o.localize.preprocessor&&(m=o.localize.preprocessor(u,m));
  const d={
    firstWeekContainsDate:i,weekStartsOn:x,locale:o
  };
  return m.map(C=>{
    if(!C.isToken)return C.value;
    const R=C.value;
    (!(n!=null&&n.useAdditionalWeekYearTokens)&&Vr(R)||!(n!=null&&n.useAdditionalDayOfYearTokens)&&Yr(R))&&Qr(R,r,String(t));
    const G=Cn[R[0]];
    return G(u,R,o.localize,d)
  }).join("")
}function sl(t){
  const r=t.match(Zr);
  return r?r[1].replace(el,"'"):t
}const nl={
  lessThanXSeconds:{
    one:"dưới 1 giây",other:"dưới {
      {
        count
      }
    } giây"
  },xSeconds:{
    one:"1 giây",other:"{
      {
        count
      }
    } giây"
  },halfAMinute:"nửa phút",lessThanXMinutes:{
    one:"dưới 1 phút",other:"dưới {
      {
        count
      }
    } phút"
  },xMinutes:{
    one:"1 phút",other:"{
      {
        count
      }
    } phút"
  },aboutXHours:{
    one:"khoảng 1 giờ",other:"khoảng {
      {
        count
      }
    } giờ"
  },xHours:{
    one:"1 giờ",other:"{
      {
        count
      }
    } giờ"
  },xDays:{
    one:"1 ngày",other:"{
      {
        count
      }
    } ngày"
  },aboutXWeeks:{
    one:"khoảng 1 tuần",other:"khoảng {
      {
        count
      }
    } tuần"
  },xWeeks:{
    one:"1 tuần",other:"{
      {
        count
      }
    } tuần"
  },aboutXMonths:{
    one:"khoảng 1 tháng",other:"khoảng {
      {
        count
      }
    } tháng"
  },xMonths:{
    one:"1 tháng",other:"{
      {
        count
      }
    } tháng"
  },aboutXYears:{
    one:"khoảng 1 năm",other:"khoảng {
      {
        count
      }
    } năm"
  },xYears:{
    one:"1 năm",other:"{
      {
        count
      }
    } năm"
  },overXYears:{
    one:"hơn 1 năm",other:"hơn {
      {
        count
      }
    } năm"
  },almostXYears:{
    one:"gần 1 năm",other:"gần {
      {
        count
      }
    } năm"
  }
},al=(t,r,n)=>{
  let a;
  const o=nl[t];
  return typeof o=="string"?a=o:r===1?a=o.one:a=o.other.replace("{
    {
      count
    }
  }",String(r)),n!=null&&n.addSuffix?n.comparison&&n.comparison>0?a+" nữa":a+" trước":a
},rl={
  full:"EEEE, 'ngày' d MMMM 'năm' y",long:"'ngày' d MMMM 'năm' y",medium:"d MMM 'năm' y",short:"dd/MM/y"
},ll={
  full:"HH:mm:ss zzzz",long:"HH:mm:ss z",medium:"HH:mm:ss",short:"HH:mm"
},il={
  full:"{
    {
      date
    }
  } {
    {
      time
    }
  }",long:"{
    {
      date
    }
  } {
    {
      time
    }
  }",medium:"{
    {
      date
    }
  } {
    {
      time
    }
  }",short:"{
    {
      date
    }
  } {
    {
      time
    }
  }"
},ol={
  date:It({
    formats:rl,defaultWidth:"full"
  }),time:It({
    formats:ll,defaultWidth:"full"
  }),dateTime:It({
    formats:il,defaultWidth:"full"
  })
},cl={
  lastWeek:"eeee 'tuần trước vào lúc' p",yesterday:"'hôm qua vào lúc' p",today:"'hôm nay vào lúc' p",tomorrow:"'ngày mai vào lúc' p",nextWeek:"eeee 'tới vào lúc' p",other:"P"
},dl=(t,r,n,a)=>cl[t],xl={
  narrow:["TCN","SCN"],abbreviated:["trước CN","sau CN"],wide:["trước Công Nguyên","sau Công Nguyên"]
},hl={
  narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["Quý 1","Quý 2","Quý 3","Quý 4"]
},ul={
  narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["quý I","quý II","quý III","quý IV"]
},ml={
  narrow:["1","2","3","4","5","6","7","8","9","10","11","12"],abbreviated:["Thg 1","Thg 2","Thg 3","Thg 4","Thg 5","Thg 6","Thg 7","Thg 8","Thg 9","Thg 10","Thg 11","Thg 12"],wide:["Tháng Một","Tháng Hai","Tháng Ba","Tháng Tư","Tháng Năm","Tháng Sáu","Tháng Bảy","Tháng Tám","Tháng Chín","Tháng Mười","Tháng Mười Một","Tháng Mười Hai"]
},pl={
  narrow:["01","02","03","04","05","06","07","08","09","10","11","12"],abbreviated:["thg 1","thg 2","thg 3","thg 4","thg 5","thg 6","thg 7","thg 8","thg 9","thg 10","thg 11","thg 12"],wide:["tháng 01","tháng 02","tháng 03","tháng 04","tháng 05","tháng 06","tháng 07","tháng 08","tháng 09","tháng 10","tháng 11","tháng 12"]
},gl={
  narrow:["CN","T2","T3","T4","T5","T6","T7"],short:["CN","Th 2","Th 3","Th 4","Th 5","Th 6","Th 7"],abbreviated:["CN","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"],wide:["Chủ Nhật","Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy"]
},fl={
  narrow:{
    am:"am",pm:"pm",midnight:"nửa đêm",noon:"tr",morning:"sg",afternoon:"ch",evening:"tối",night:"đêm"
  },abbreviated:{
    am:"AM",pm:"PM",midnight:"nửa đêm",noon:"trưa",morning:"sáng",afternoon:"chiều",evening:"tối",night:"đêm"
  },wide:{
    am:"SA",pm:"CH",midnight:"nửa đêm",noon:"trưa",morning:"sáng",afternoon:"chiều",evening:"tối",night:"đêm"
  }
},bl={
  narrow:{
    am:"am",pm:"pm",midnight:"nửa đêm",noon:"tr",morning:"sg",afternoon:"ch",evening:"tối",night:"đêm"
  },abbreviated:{
    am:"AM",pm:"PM",midnight:"nửa đêm",noon:"trưa",morning:"sáng",afternoon:"chiều",evening:"tối",night:"đêm"
  },wide:{
    am:"SA",pm:"CH",midnight:"nửa đêm",noon:"giữa trưa",morning:"vào buổi sáng",afternoon:"vào buổi chiều",evening:"vào buổi tối",night:"vào ban đêm"
  }
},yl=(t,r)=>{
  const n=Number(t),a=r==null?void 0:r.unit;
  if(a==="quarter")switch(n){
    case 1:return"I";
    case 2:return"II";
    case 3:return"III";
    case 4:return"IV"
  }else if(a==="day")switch(n){
    case 1:return"thứ 2";
    case 2:return"thứ 3";
    case 3:return"thứ 4";
    case 4:return"thứ 5";
    case 5:return"thứ 6";
    case 6:return"thứ 7";
    case 7:return"chủ nhật"
  }else{
    if(a==="week")return n===1?"thứ nhất":"thứ "+n;
    if(a==="dayOfYear")return n===1?"đầu tiên":"thứ "+n
  }return String(n)
},Nl={
  ordinalNumber:yl,era:it({
    values:xl,defaultWidth:"wide"
  }),quarter:it({
    values:hl,defaultWidth:"wide",formattingValues:ul,defaultFormattingWidth:"wide",argumentCallback:t=>t-1
  }),month:it({
    values:ml,defaultWidth:"wide",formattingValues:pl,defaultFormattingWidth:"wide"
  }),day:it({
    values:gl,defaultWidth:"wide"
  }),dayPeriod:it({
    values:fl,defaultWidth:"wide",formattingValues:bl,defaultFormattingWidth:"wide"
  })
},vl=/^(\d+)/i,jl=/\d+/i,wl={
  narrow:/^(tcn|scn)/i,abbreviated:/^(trước CN|sau CN)/i,wide:/^(trước Công Nguyên|sau Công Nguyên)/i
},kl={
  any:[/^t/i,/^s/i]
},Sl={
  narrow:/^([1234]|i{
    1,3
  }v?)/i,abbreviated:/^q([1234]|i{
    1,3
  }v?)/i,wide:/^quý ([1234]|i{
    1,3
  }v?)/i
},Cl={
  any:[/(1|i)$/i,/(2|ii)$/i,/(3|iii)$/i,/(4|iv)$/i]
},Tl={
  narrow:/^(0?[2-9]|10|11|12|0?1)/i,abbreviated:/^thg[ _]?(0?[1-9](?!\d)|10|11|12)/i,wide:/^tháng ?(Một|Hai|Ba|Tư|Năm|Sáu|Bảy|Tám|Chín|Mười|Mười ?Một|Mười ?Hai|0?[1-9](?!\d)|10|11|12)/i
},_l={
  narrow:[/0?1$/i,/0?2/i,/3/,/4/,/5/,/6/,/7/,/8/,/9/,/10/,/11/,/12/],abbreviated:[/^thg[ _]?0?1(?!\d)/i,/^thg[ _]?0?2/i,/^thg[ _]?0?3/i,/^thg[ _]?0?4/i,/^thg[ _]?0?5/i,/^thg[ _]?0?6/i,/^thg[ _]?0?7/i,/^thg[ _]?0?8/i,/^thg[ _]?0?9/i,/^thg[ _]?10/i,/^thg[ _]?11/i,/^thg[ _]?12/i],wide:[/^tháng ?(Một|0?1(?!\d))/i,/^tháng ?(Hai|0?2)/i,/^tháng ?(Ba|0?3)/i,/^tháng ?(Tư|0?4)/i,/^tháng ?(Năm|0?5)/i,/^tháng ?(Sáu|0?6)/i,/^tháng ?(Bảy|0?7)/i,/^tháng ?(Tám|0?8)/i,/^tháng ?(Chín|0?9)/i,/^tháng ?(Mười|10)/i,/^tháng ?(Mười ?Một|11)/i,/^tháng ?(Mười ?Hai|12)/i]
},Pl={
  narrow:/^(CN|T2|T3|T4|T5|T6|T7)/i,short:/^(CN|Th ?2|Th ?3|Th ?4|Th ?5|Th ?6|Th ?7)/i,abbreviated:/^(CN|Th ?2|Th ?3|Th ?4|Th ?5|Th ?6|Th ?7)/i,wide:/^(Chủ ?Nhật|Chúa ?Nhật|thứ ?Hai|thứ ?Ba|thứ ?Tư|thứ ?Năm|thứ ?Sáu|thứ ?Bảy)/i
},Il={
  narrow:[/CN/i,/2/i,/3/i,/4/i,/5/i,/6/i,/7/i],short:[/CN/i,/2/i,/3/i,/4/i,/5/i,/6/i,/7/i],abbreviated:[/CN/i,/2/i,/3/i,/4/i,/5/i,/6/i,/7/i],wide:[/(Chủ|Chúa) ?Nhật/i,/Hai/i,/Ba/i,/Tư/i,/Năm/i,/Sáu/i,/Bảy/i]
},Ml={
  narrow:/^(a|p|nửa đêm|trưa|(giờ) (sáng|chiều|tối|đêm))/i,abbreviated:/^(am|pm|nửa đêm|trưa|(giờ) (sáng|chiều|tối|đêm))/i,wide:/^(ch[^i]*|sa|nửa đêm|trưa|(giờ) (sáng|chiều|tối|đêm))/i
},Al={
  any:{
    am:/^(a|sa)/i,pm:/^(p|ch[^i]*)/i,midnight:/nửa đêm/i,noon:/trưa/i,morning:/sáng/i,afternoon:/chiều/i,evening:/tối/i,night:/^đêm/i
  }
},Hl={
  ordinalNumber:Qn({
    matchPattern:vl,parsePattern:jl,valueCallback:t=>parseInt(t,10)
  }),era:ot({
    matchPatterns:wl,defaultMatchWidth:"wide",parsePatterns:kl,defaultParseWidth:"any"
  }),quarter:ot({
    matchPatterns:Sl,defaultMatchWidth:"wide",parsePatterns:Cl,defaultParseWidth:"any",valueCallback:t=>t+1
  }),month:ot({
    matchPatterns:Tl,defaultMatchWidth:"wide",parsePatterns:_l,defaultParseWidth:"wide"
  }),day:ot({
    matchPatterns:Pl,defaultMatchWidth:"wide",parsePatterns:Il,defaultParseWidth:"wide"
  }),dayPeriod:ot({
    matchPatterns:Ml,defaultMatchWidth:"wide",parsePatterns:Al,defaultParseWidth:"any"
  })
},Jn={
  code:"vi",formatDistance:al,formatLong:ol,formatRelative:dl,localize:Nl,match:Hl,options:{
    weekStartsOn:1,firstWeekContainsDate:1
  }
},Tt=["Ca 1","Ca 2","Ca 3","Ca 4","Ca 5"],Rt={
  ca1:1,ca2:3,ca3:3,ca4:3,ca5:2.5
};
function Ll(){
  const{
    userProfile:t
  }=Kt(),{
    currentStoreId:r
  }=$s();
  Rn((t==null?void 0:t.ma_kho)||"");
  const[n,a]=v.useState([]),[o,i]=v.useState(!0),[x,u]=v.useState(!1),[m,d]=v.useState({
    type:"",text:""
  }),[h,N]=v.useState(()=>localStorage.getItem("PHAN_CA_LAST_SAVED")),[y,w]=v.useState(!1),[S,T]=v.useState(!1),A=v.useRef(null),L=v.useRef(null),[C,R]=v.useState(()=>nr(new Date)),G=v.useMemo(()=>Vn({
    start:C,end:tr(C)
  }),[C]),xe=async()=>{
    var f,g;
    if(t!=null&&t.ma_kho){
      i(!0);
      try{
        const b=`PHAN_CA_DATA_${
          t.ma_kho
        }`,k=localStorage.getItem(b),P=ae(C,"yyyy-MM");
        if(k)try{
          const j=JSON.parse(k);
          if(j[P]&&Array.isArray(j[P])&&j[P].length>0){
            a(j[P]),d({
              type:"success",text:"Đã tải dữ liệu từ trình duyệt!"
            }),i(!1);
            return
          }
        }catch(j){
          console.error("Error parsing local phan ca data:",j)
        }const M=r||t.ma_kho||"",{
          data:O,error:F
        }=await He.from("store").select("data_phan_ca, ds_nhan_vien").eq("id",xt(M.trim())).maybeSingle();
        if(F){
          console.error("Lỗi khi tải dữ liệu phân ca:",F),d({
            type:"error",text:"Lỗi tải dữ liệu!"
          });
          return
        }let Y=[],$=!1;
        if(O!=null&&O.data_phan_ca)try{
          const j=typeof O.data_phan_ca=="string"?JSON.parse(O.data_phan_ca):O.data_phan_ca,I=ae(C,"yyyy-MM");
          Array.isArray(j)?(Y=j,$=Y.length>0):typeof j=="object"&&j!==null&&(Y=j[I]||[],$=Y.length>0)
        }catch(j){
          console.error("Error parsing data_phan_ca:",j)
        }if(!$&&(O!=null&&O.ds_nhan_vien))try{
          const j=O.ds_nhan_vien.split(`
`).filter(I=>I.trim());
          if(j.length>0){
            const I=j[0].split("	"),W=(f=I[1])!=null&&f.toLowerCase().includes("user")||(g=I[1])!=null&&g.toLowerCase().includes("tên")?1:0;
            Y=j.slice(W).map(Q=>{
              const q=Q.split("	");
              return q.length<2?null:{
                username:q[1]||q[0]||"N/A",fullId:q[2]||"",department:q[0]||"BP All In One - ĐMX",shiftType:"",shifts:{
                  
                }
              }
            }).filter(Boolean)
          }
        }catch(j){
          console.error("Error parsing ds_nhan_vien:",j)
        }if(Y.length>0){
          const j=Y.map(I=>({
            username:I.username||"",fullId:I.fullId||"",department:I.department||"BP All In One - ĐMX",shiftType:I.shiftType||"",shifts:I.shifts||{
              
            }
          }));
          a(j),d({
            type:"success",text:$?"Đã tải dữ liệu phân ca!":"Đã tải danh sách nhân viên!"
          })
        }else a([]),d({
          type:"info",text:"Chưa có dữ liệu cho tháng này."
        })
      }catch(b){
        console.error("Error fetching employees:",b),d({
          type:"error",text:"Lỗi hệ thống khi tải dữ liệu."
        })
      }finally{
        i(!1),setTimeout(()=>d({
          type:"",text:""
        }),3e3)
      }
    }
  };
  v.useEffect(()=>{
    xe()
  },[t==null?void 0:t.ma_kho,C]);
  const B=(f,g,b,k)=>{
    const P=ae(g,"yyyy-MM-dd"),M=parseFloat(k)||0;
    a(O=>O.map(F=>{
      if(F.username===f){
        const Y={
          ...F.shifts
        },$={
          ...Y[P]||{
            
          }
        };
        return $[`ca${
          b+1
        }`]=M,Y[P]=$,{
          ...F,shifts:Y
        }
      }return F
    }))
  },V=(f,g)=>{
    a(b=>b.map(k=>k.username===f?{
      ...k,shiftType:g
    }:k))
  },U=(f,g)=>{
    const b=ae(g,"yyyy-MM-dd");
    a(k=>k.map(P=>{
      if(P.username===f){
        const M={
          ...P.shifts
        },O={
          ...M[b]||{
            
          }
        };
        return O.isOff=!O.isOff,O.isOff&&Tt.forEach((F,Y)=>{
          O[`ca${
            Y+1
          }`]=0
        }),M[b]=O,{
          ...P,shifts:M
        }
      }return P
    }))
  },[he,E]=v.useState(null),[X,Z]=v.useState(null),Me=(f,g)=>{
    E(g),f.dataTransfer.effectAllowed="move"
  },Ge=(f,g)=>{
    f.preventDefault(),f.dataTransfer.dropEffect="move",X!==g&&Z(g)
  },Ke=(f,g)=>{
    if(f.preventDefault(),!he||he===g){
      E(null),Z(null);
      return
    }a(b=>{
      const k=[...b],P=k.findIndex($=>$.username===he),M=k.findIndex($=>$.username===g);
      if(P===-1||M===-1)return b;
      const O={
        ...k[P]
      },F=k[M];
      O.department=F.department,k.splice(P,1);
      const Y=k.findIndex($=>$.username===g);
      return k.splice(Y,0,O),k
    }),E(null),Z(null)
  },Le=()=>{
    E(null),Z(null)
  },we=async()=>{
    if(A.current)try{
      const f=await rs(A.current,{
        quality:1,backgroundColor:"#ffffff",pixelRatio:2
      }),g=document.createElement("a");
      g.href=f,g.download="LICH_PHAN_CA_THANG.png",g.click(),d({
        type:"success",text:"Đã xuất ảnh bảng phân ca!"
      })
    }catch(f){
      console.error("Lỗi khi chụp ảnh:",f),d({
        type:"error",text:"Không thể chụp ảnh bảng phân ca."
      })
    }
  },Ye=async()=>{
    if(L.current)try{
      const f=await rs(L.current,{
        quality:1,backgroundColor:"#ffffff",pixelRatio:2
      }),g=document.createElement("a");
      g.href=f,g.download="TOM_TAT_NHAN_VIEN_DI_CA_HANH_CHINH.png",g.click(),d({
        type:"success",text:"Đã xuất ảnh tóm tắt ca hành chính!"
      })
    }catch(f){
      console.error("Lỗi khi chụp ảnh tóm tắt:",f),d({
        type:"error",text:"Không thể chụp ảnh tóm tắt."
      })
    }
  },ke=()=>{
    a(f=>f.map(g=>({
      ...g,shifts:{
        
      }
    }))),w(!1),d({
      type:"success",text:"Đã làm mới bảng phân ca!"
    })
  },je=()=>{
    a(f=>{
      const g=f.map(O=>({
        ...O,shifts:{
          ...O.shifts
        }
      }));
      if(g.length===0)return f;
      const b=g.map((O,F)=>O.shiftType==="Hành Chính"?F:-1).filter(O=>O!==-1),k=b.length;
      if(k===0)return f;
      const P=g.length;
      let M=b[0];
      return G.forEach((O,F)=>{
        var I,W;
        const Y=ae(O,"yyyy-MM-dd");
        let $=[],j=[];
        for(;
        j.length<Math.min(k,P);
        ){
          let Q=!1,q=0;
          for(;
          q<P;
          ){
            const se=M%P,Se=g[se];
            if(!j.includes(se)&&!((W=(I=Se.shifts)==null?void 0:I[Y])!=null&&W.isOff)){
              j.push(se),$.push(Se.username),M++,Q=!0;
              break
            }M++,q++
          }if(!Q)break
        }g.forEach(Q=>{
          const q={
            ...Q.shifts[Y]||{
              
            }
          };
          if(q.isOff){
            Tt.forEach((se,Se)=>{
              q[`ca${
                Se+1
              }`]=0
            }),Q.shifts[Y]=q;
            return
          }if(Tt.forEach((se,Se)=>{
            q[`ca${
              Se+1
            }`]=0
          }),$.includes(Q.username))[1,2,3,4,5].forEach(se=>q[`ca${
            se
          }`]=Rt[`ca${
            se
          }`]);
          else{
            const se=F%2===0;
            Q.shiftType==="Chiều"?se?[4,5].forEach(Se=>q[`ca${
              Se
            }`]=Rt[`ca${
              Se
            }`]):[1,2,3].forEach(Se=>q[`ca${
              Se
            }`]=Rt[`ca${
              Se
            }`]):se?[1,2,3].forEach(Se=>q[`ca${
              Se
            }`]=Rt[`ca${
              Se
            }`]):[4,5].forEach(Se=>q[`ca${
              Se
            }`]=Rt[`ca${
              Se
            }`])
          }Q.shifts[Y]=q
        })
      }),g
    }),d({
      type:"success",text:"Đã chia ca tự động (Domino: Ưu tiên đủ nhân sự Hành chính)!"
    })
  },De=f=>{
    let g=0;
    return Object.values(f.shifts||{
      
    }).forEach(b=>{
      Object.values(b).forEach(k=>{
        g+=parseFloat(k)||0
      })
    }),g
  },oe=v.useMemo(()=>G.map(g=>{
    const b=ae(g,"yyyy-MM-dd"),k=Tt.map((M,O)=>{
      let F=0,Y=0;
      return n.forEach($=>{
        var I,W;
        const j=((W=(I=$.shifts)==null?void 0:I[b])==null?void 0:W[`ca${
          O+1
        }`])||0;
        j>0&&(F+=j,Y+=1)
      }),{
        totalHours:F,staffCount:Y
      }
    }),P=k.reduce((M,O)=>M+O.totalHours,0);
    return{
      dateStr:b,shiftTotals:k,dayTotalHours:P
    }
  }),[n,G]),tt=v.useMemo(()=>{
    const f={
      
    };
    return n.forEach(g=>{
      const b=g.department||"Khác";
      f[b]||(f[b]=[]),f[b].push(g)
    }),f
  },[n]),Ve=async()=>{
    if(t!=null&&t.ma_kho){
      u(!0),d({
        type:"",text:""
      });
      try{
        const f=ae(C,"yyyy-MM"),g=`PHAN_CA_DATA_${
          t.ma_kho
        }`,b=localStorage.getItem(g);
        let k={
          
        };
        if(b)try{
          k=JSON.parse(b)
        }catch(M){
          console.error("Error parsing local data for save:",M)
        }k[f]=n,localStorage.setItem(g,JSON.stringify(k));
        const P=new Date().toISOString();
        N(P),localStorage.setItem("PHAN_CA_LAST_SAVED",P),d({
          type:"success",text:"Đã lưu dữ liệu vào trình duyệt!"
        })
      }catch(f){
        console.error("Lỗi khi lưu dữ liệu:",f),d({
          type:"error",text:"Lỗi lưu dữ liệu: "+(f.message||"Unknown error")
        })
      }finally{
        u(!1),setTimeout(()=>d({
          type:"",text:""
        }),3e3)
      }
    }
  },D=async f=>{
    const g=await f.arrayBuffer(),b=as(g,{
      type:"array"
    }),k=b.Sheets[b.SheetNames[0]],M=Ie.sheet_to_json(k,{
      header:1
    }).slice(1).map(O=>O[1]?{
      username:String(O[1]).trim(),fullId:String(O[2]||"").trim(),department:String(O[0]||"BP All In One - ĐMX").trim(),shiftType:"",shifts:{
        
      }
    }:null).filter(Boolean);
    a(M),d({
      type:"success",text:"Đã nhập danh sách từ Excel. Hãy nhấn LƯU."
    })
  };
  return e.jsxs("div",{
    className:"flex flex-col h-full bg-slate-50",children:[e.jsxs("div",{
      className:"bg-white text-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md border-b border-slate-200 flex-wrap gap-4",children:[e.jsxs("div",{
        className:"flex items-center gap-3 flex-wrap",children:[e.jsx("h1",{
          className:"text-4xl font-black uppercase tracking-wider leading-tight text-[#004b8d] whitespace-nowrap",children:"LỊCH PHÂN CA THÁNG"
        }),e.jsxs("div",{
          className:"flex items-center bg-slate-100 hover:bg-slate-200 rounded-lg px-2 py-1.5 gap-3 cursor-pointer transition-all border border-slate-200 shadow-inner text-slate-700",children:[e.jsx("button",{
            onClick:()=>R(f=>wn(f,-1)),className:"hover:bg-white p-1 rounded transition-colors shadow-sm",children:e.jsx(An,{
              size:16
            })
          }),e.jsxs("span",{
            className:"text-xs font-bold uppercase w-24 text-center leading-tight tracking-wide",children:["THÁNG",e.jsx("br",{
              
            }),ae(C,"MM/yyyy")]
          }),e.jsx("button",{
            onClick:()=>R(f=>wn(f,1)),className:"hover:bg-white p-1 rounded transition-colors shadow-sm",children:e.jsx(Hn,{
              size:16
            })
          })]
        }),m.text&&e.jsx("div",{
          className:`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center min-h-[48px] shadow-sm border whitespace-normal max-w-[200px] leading-tight ${
            m.type==="success"?"bg-[#008080] text-white border-[#006666]":"bg-red-600 text-white border-red-700"
          }`,children:m.text
        })]
      }),e.jsxs("div",{
        className:"flex items-center gap-2 flex-wrap justify-end",children:[e.jsx("button",{
          onClick:()=>T(!S),className:`px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md ${
            S?"bg-gradient-to-b from-indigo-500 to-indigo-600 border border-indigo-400":"bg-gradient-to-b from-slate-500 to-slate-600 border border-slate-400"
          }`,children:S?e.jsxs(e.Fragment,{
            children:[e.jsx(Ln,{
              size:14,className:"shrink-0"
            })," Hiện tất cả"]
          }):e.jsxs(e.Fragment,{
            children:[e.jsx(Dn,{
              size:14,className:"shrink-0"
            })," Ẩn ca thường"]
          })
        }),e.jsx("button",{
          onClick:je,className:"bg-gradient-to-b from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 border border-orange-400 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md",children:"Chia ca tự động"
        }),e.jsxs("button",{
          onClick:we,className:"bg-gradient-to-b from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 border border-purple-400 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md",children:[e.jsx(Ft,{
            size:14,className:"shrink-0"
          })," Chụp ảnh"]
        }),e.jsxs("button",{
          onClick:()=>w(!0),className:"bg-gradient-to-b from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border border-red-400 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md",children:[e.jsx(En,{
            size:14,className:"shrink-0"
          })," Reset"]
        }),e.jsxs("button",{
          onClick:xe,className:"bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 border border-sky-400 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md",children:[e.jsx(On,{
            size:14,className:`shrink-0 ${
              o?"animate-spin":""
            }`
          })," Tải lại"]
        }),e.jsxs("label",{
          className:"cursor-pointer bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 border border-slate-500 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md",children:[e.jsx(et,{
            size:14,className:"rotate-180 shrink-0"
          })," Nhập Excel",e.jsx("input",{
            type:"file",accept:".xlsx, .xls",className:"hidden",onChange:f=>{
              var g;
              return((g=f.target.files)==null?void 0:g[0])&&D(f.target.files[0])
            }
          })]
        }),e.jsxs("div",{
          className:"flex flex-col gap-1",children:[e.jsxs("div",{
            className:"flex items-center gap-1",children:[e.jsxs("button",{
              onClick:Ve,disabled:x,className:"bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 border border-emerald-400 px-3 py-2 rounded-lg text-[12px] font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md text-white min-h-[48px] min-w-[130px] leading-tight text-center whitespace-normal disabled:opacity-50 disabled:hover:translate-y-0 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md",children:[x?e.jsx(Mt,{
                size:16,className:"animate-spin shrink-0"
              }):e.jsx(ss,{
                size:16,className:"shrink-0"
              }),"Lưu trình duyệt"]
            }),e.jsxs("button",{
              onClick:Ve,disabled:x,className:"bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 border border-amber-400 px-3 py-2 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md disabled:opacity-50",children:[e.jsx(ns,{
                size:16,className:"shrink-0"
              })," Lưu lịch OFF"]
            })]
          }),h&&e.jsxs("span",{
            className:"text-[9px] text-slate-500 italic text-center",children:["Lưu lần cuối: ",new Date(h).toLocaleString("vi-VN")]
          })]
        })]
      })]
    }),e.jsx("div",{
      className:"flex-1 overflow-auto p-4",children:e.jsx("div",{
        className:"bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden min-w-max",ref:A,children:e.jsxs("table",{
          className:"w-full border-collapse text-[11px]",children:[e.jsxs("thead",{
            children:[e.jsxs("tr",{
              className:"bg-[#e6f0fa] border-b border-slate-300",children:[e.jsx("th",{
                rowSpan:2,className:"sticky left-0 z-40 bg-[#e6f0fa] border-r border-slate-300 px-4 py-2 text-left w-64 min-w-[256px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:e.jsxs("div",{
                  className:"flex items-center justify-between",children:[e.jsx("span",{
                    className:"font-black text-[#004b8d] uppercase text-xs",children:"Nhân viên"
                  }),e.jsx("span",{
                    className:"font-black text-[#004b8d] uppercase text-[10px] opacity-80",children:"Loại ca"
                  })]
                })
              }),e.jsx("th",{
                rowSpan:2,className:"sticky left-64 z-40 bg-[#e6f0fa] border-r border-slate-300 px-2 py-2 text-center w-24 min-w-[96px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:e.jsxs("span",{
                  className:"font-black text-[#004b8d] uppercase leading-tight block text-[10px]",children:["Giờ công",e.jsx("br",{
                    
                  }),"trong tuần"]
                })
              }),G.map((f,g)=>{
                const b=f.getDay()===0||f.getDay()===6;
                return e.jsx("th",{
                  colSpan:5,className:`border-r-2 border-slate-400 px-2 py-1.5 text-center ${
                    b?"text-red-600 bg-red-50/50":"text-[#004b8d]"
                  }`,children:e.jsx("span",{
                    className:"font-black uppercase tracking-tighter text-[11px]",children:ae(f,"EEEE (dd/MM)",{
                      locale:Jn
                    })
                  })
                },g)
              })]
            }),e.jsx("tr",{
              className:"bg-[#f0f5fa] border-b border-slate-300",children:G.map((f,g)=>{
                const b=f.getDay()===0||f.getDay()===6;
                return Tt.map((k,P)=>e.jsx("th",{
                  className:`px-1 py-1 text-[9px] font-bold uppercase w-12 min-w-[48px] ${
                    P===4?"border-r-2 border-slate-400":"border-r border-slate-200"
                  } ${
                    b?"text-red-500/80 bg-red-50/30":"text-slate-500"
                  }`,children:k.replace("Ca ","C")
                },`${
                  g
                }-${
                  P
                }`))
              })
            }),e.jsxs("tr",{
              className:"bg-[#f8fafc] border-b border-slate-200",children:[e.jsx("td",{
                className:"sticky left-0 z-30 bg-[#f8fafc] border-r border-slate-200 px-4 py-2 font-bold text-[#004b8d] uppercase shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:"Tổng giờ công đã xếp ca"
              }),e.jsx("td",{
                className:"sticky left-64 z-30 bg-[#f8fafc] border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
              }),oe.map((f,g)=>e.jsx("td",{
                colSpan:5,className:"border-r-2 border-slate-400 text-center font-black text-[#004b8d] text-xs",children:f.dayTotalHours.toLocaleString()
              },g))]
            }),e.jsxs("tr",{
              className:"bg-white border-b border-slate-200",children:[e.jsx("td",{
                className:"sticky left-0 z-30 bg-white border-r border-slate-200 px-4 py-1.5 font-bold text-slate-500 uppercase text-[10px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:"Giờ công đã xếp ca"
              }),e.jsx("td",{
                className:"sticky left-64 z-30 bg-white border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
              }),oe.map((f,g)=>f.shiftTotals.map((b,k)=>e.jsx("td",{
                className:`text-center font-bold text-slate-700 ${
                  k===4?"border-r-2 border-slate-400":"border-r border-slate-200"
                }`,children:b.totalHours||""
              },`${
                g
              }-${
                k
              }`)))]
            }),e.jsxs("tr",{
              className:"bg-white border-b-2 border-slate-300",children:[e.jsx("td",{
                className:"sticky left-0 z-30 bg-white border-r border-slate-200 px-4 py-1.5 font-bold text-slate-500 uppercase text-[10px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:"Nhân sự trong ca"
              }),e.jsx("td",{
                className:"sticky left-64 z-30 bg-white border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
              }),oe.map((f,g)=>f.shiftTotals.map((b,k)=>e.jsx("td",{
                className:`text-center font-bold text-slate-500 ${
                  k===4?"border-r-2 border-slate-400":"border-r border-slate-200"
                }`,children:b.staffCount||""
              },`${
                g
              }-${
                k
              }`)))]
            })]
          }),e.jsx("tbody",{
            children:Object.entries(tt).map(([f,g])=>e.jsxs(Ze.Fragment,{
              children:[e.jsx("tr",{
                className:"bg-[#f1f5f9]",children:e.jsx("td",{
                  colSpan:2+G.length*5,className:"sticky left-0 z-20 bg-[#f1f5f9] px-4 py-2 font-black text-[#004b8d] uppercase border-b border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:f
                })
              }),g.map(b=>e.jsxs("tr",{
                className:`border-b border-slate-100 hover:bg-indigo-50/50 transition-colors group ${
                  X===b.username?"border-t-2 border-t-indigo-500":""
                }`,draggable:!0,onDragStart:k=>Me(k,b.username),onDragOver:k=>Ge(k,b.username),onDrop:k=>Ke(k,b.username),onDragEnd:Le,children:[e.jsx("td",{
                  className:"sticky left-0 z-20 bg-white group-hover:bg-indigo-50/50 border-r border-slate-200 px-4 py-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:e.jsxs("div",{
                    className:"flex items-center justify-between gap-2",children:[e.jsxs("div",{
                      className:"flex items-center gap-2",children:[e.jsx("div",{
                        className:"cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 opacity-50 group-hover:opacity-100 transition-opacity",children:e.jsx(Bn,{
                          size:14
                        })
                      }),e.jsxs("div",{
                        className:"flex flex-col",children:[e.jsx("span",{
                          className:"font-bold text-slate-700",children:b.username
                        }),e.jsx("span",{
                          className:"text-[9px] text-slate-400 font-medium",children:b.fullId
                        })]
                      })]
                    }),e.jsxs("select",{
                      value:b.shiftType||"",onChange:k=>V(b.username,k.target.value),className:`text-[9px] font-black uppercase border-none rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
                        b.shiftType==="Hành Chính"?"bg-red-100 text-red-600":b.shiftType==="Sáng"||b.shiftType==="Chiều"?"bg-slate-100 text-slate-700":"bg-gray-100 text-gray-400"
                      }`,children:[e.jsx("option",{
                        value:"",children:"-- Chọn --"
                      }),e.jsx("option",{
                        value:"Sáng",children:"Sáng"
                      }),e.jsx("option",{
                        value:"Chiều",children:"Chiều"
                      }),e.jsx("option",{
                        value:"Hành Chính",children:"Hành Chính"
                      })]
                    })]
                  })
                }),e.jsx("td",{
                  className:"sticky left-64 z-20 bg-white group-hover:bg-indigo-50/50 border-r border-slate-200 px-2 py-2 text-center font-black text-indigo-600 text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:De(b).toLocaleString()
                }),G.map((k,P)=>{
                  var Y,$;
                  const M=ae(k,"yyyy-MM-dd"),O=($=(Y=b.shifts)==null?void 0:Y[M])==null?void 0:$.isOff,F=[1,2,3,4,5].every(j=>{
                    var I,W;
                    return(((W=(I=b.shifts)==null?void 0:I[M])==null?void 0:W[`ca${
                      j
                    }`])||0)>0
                  });
                  return e.jsx("td",{
                    colSpan:5,className:`border-r-2 border-slate-400 p-0 relative transition-colors ${
                      O?"bg-red-50":""
                    }`,children:e.jsxs("div",{
                      className:"flex flex-col h-full",children:[e.jsx("button",{
                        onClick:()=>U(b.username,k),className:`absolute top-0 right-0 z-10 px-1 py-0.5 text-[8px] font-bold uppercase transition-colors rounded-bl border-l border-b border-slate-200 ${
                          O?"bg-red-600 text-white border-red-700":"bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600"
                        }`,title:"Bật/Tắt lịch OFF",children:O?"OFF":"OFF?"
                      }),e.jsx("div",{
                        className:"flex h-full",children:Tt.map((j,I)=>{
                          var Q,q;
                          const W=((q=(Q=b.shifts)==null?void 0:Q[M])==null?void 0:q[`ca${
                            I+1
                          }`])||"";
                          return e.jsx("div",{
                            className:`flex-1 min-w-[30px] border-r border-slate-100 last:border-r-0 ${
                              O?"opacity-50 pointer-events-none":""
                            }`,children:e.jsx("input",{
                              type:"text",value:O?"-":W,onChange:se=>B(b.username,k,I,se.target.value),className:`w-full h-full min-h-[32px] text-center font-bold bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                                O?"text-red-600":F?"text-amber-700 bg-yellow-100/50":S?"text-transparent select-none focus:text-slate-700":"text-slate-700"
                              }`
                            })
                          },I)
                        })
                      })]
                    })
                  },P)
                })]
              },b.username))]
            },f))
          })]
        })
      })
    }),e.jsxs("div",{
      ref:L,className:"mt-8 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mx-4 mb-8",children:[e.jsxs("div",{
        className:"bg-[#004b8d] px-4 py-3 flex items-center justify-between",children:[e.jsxs("div",{
          className:"flex items-center gap-2",children:[e.jsx(ns,{
            size:20,className:"text-white"
          }),e.jsx("h2",{
            className:"text-white font-bold uppercase tracking-wider text-sm",children:"Tóm tắt nhân viên đi ca hành chính"
          })]
        }),e.jsxs("button",{
          onClick:Ye,className:"flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-all text-xs font-black uppercase border border-white/30",children:[e.jsx(Ft,{
            size:14
          }),"Xuất ảnh"]
        })]
      }),e.jsx("div",{
        className:"overflow-x-auto",children:e.jsxs("table",{
          className:"w-full text-left border-collapse",children:[e.jsx("thead",{
            children:e.jsxs("tr",{
              className:"bg-slate-50 border-b border-slate-200",children:[e.jsx("th",{
                className:"px-4 py-3 text-xs font-black uppercase text-slate-500 w-1/4",children:"Nhân viên"
              }),e.jsx("th",{
                className:"px-4 py-3 text-xs font-black uppercase text-slate-500",children:"Ngày đi ca hành chính"
              }),e.jsx("th",{
                className:"px-4 py-3 text-xs font-black uppercase text-slate-500 w-24 text-center",children:"Tổng ngày"
              })]
            })
          }),e.jsxs("tbody",{
            children:[n.map(f=>{
              const g=G.filter(b=>{
                const k=ae(b,"yyyy-MM-dd");
                return[1,2,3,4,5].every(P=>{
                  var M,O;
                  return(((O=(M=f.shifts)==null?void 0:M[k])==null?void 0:O[`ca${
                    P
                  }`])||0)>0
                })
              }).map(b=>ae(b,"dd/MM"));
              return g.length===0?null:e.jsxs("tr",{
                className:"border-b border-slate-100 hover:bg-slate-50 transition-colors",children:[e.jsx("td",{
                  className:"px-4 py-3 font-bold text-slate-700 text-sm",children:f.username
                }),e.jsx("td",{
                  className:"px-4 py-3 text-slate-600 text-sm",children:e.jsx("div",{
                    className:"flex flex-wrap gap-1",children:g.map((b,k)=>e.jsx("span",{
                      className:"bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200",children:b
                    },k))
                  })
                }),e.jsx("td",{
                  className:"px-4 py-3 text-center",children:e.jsx("span",{
                    className:"bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-black",children:g.length
                  })
                })]
              },f.username)
            }),n.length>0&&n.every(f=>!G.some(g=>{
              const b=ae(g,"yyyy-MM-dd");
              return[1,2,3,4,5].every(k=>{
                var P,M;
                return(((M=(P=f.shifts)==null?void 0:P[b])==null?void 0:M[`ca${
                  k
                }`])||0)>0
              })
            }))&&e.jsx("tr",{
              children:e.jsx("td",{
                colSpan:3,className:"px-4 py-8 text-center text-slate-400 italic text-sm",children:"Không có nhân viên nào đi ca hành chính trong tháng này."
              })
            })]
          })]
        })
      })]
    }),o&&e.jsx("div",{
      className:"fixed inset-0 bg-white/60 backdrop-blur-sm z-[100] flex items-center justify-center",children:e.jsxs("div",{
        className:"flex flex-col items-center gap-3",children:[e.jsx(Mt,{
          size:32,className:"animate-spin text-[#004b8d]"
        }),e.jsx("span",{
          className:"text-xs font-black uppercase text-[#004b8d] tracking-widest",children:"Đang xử lý dữ liệu..."
        })]
      })
    }),y&&e.jsx("div",{
      className:"fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[110]",children:e.jsxs("div",{
        className:"bg-white p-6 rounded-xl shadow-xl max-w-md w-full mx-4",children:[e.jsx("h3",{
          className:"text-lg font-bold text-slate-800 mb-2",children:"Xác nhận làm mới"
        }),e.jsx("p",{
          className:"text-slate-600 mb-6 text-sm",children:"Bạn có chắc chắn muốn xóa toàn bộ dữ liệu phân ca hiện tại? Hành động này không thể hoàn tác."
        }),e.jsxs("div",{
          className:"flex justify-end gap-3",children:[e.jsx("button",{
            onClick:()=>w(!1),className:"px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm",children:"Hủy"
          }),e.jsx("button",{
            onClick:ke,className:"px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm",children:"Xóa dữ liệu"
          })]
        })]
      })
    })]
  })
}const _t=["Ca 1","Ca 2","Ca 3","Ca 4","Ca 5"],zt={
  ca1:1,ca2:3,ca3:3,ca4:3,ca5:2.5
};
function Dl(){
  const{
    userProfile:t
  }=Kt(),{
    currentStoreId:r
  }=$s();
  Rn((t==null?void 0:t.ma_kho)||"");
  const[n,a]=v.useState([]),[o,i]=v.useState(!0),[x,u]=v.useState(!1),[m,d]=v.useState({
    type:"",text:""
  }),[h,N]=v.useState(()=>localStorage.getItem("PHAN_CA_TUAN_LAST_SAVED")),[y,w]=v.useState(!1),[S,T]=v.useState(!1),A=v.useRef(null),L=v.useRef(null),[C,R]=v.useState(()=>At(new Date,{
    weekStartsOn:1
  })),G=v.useMemo(()=>Vn({
    start:C,end:rr(C,{
      weekStartsOn:1
    })
  }),[C]),xe=async(D=!1)=>{
    var f,g;
    if(t!=null&&t.ma_kho){
      i(!0);
      try{
        const b=`PHAN_CA_TUAN_DATA_${
          t.ma_kho
        }`,k=localStorage.getItem(b),P=ae(C,"yyyy-ww");
        if(k&&!D)try{
          const $=JSON.parse(k);
          if($[P]&&Array.isArray($[P])&&$[P].length>0){
            a($[P]),d({
              type:"success",text:"Đã tải dữ liệu từ trình duyệt!"
            }),i(!1);
            return
          }
        }catch($){
          console.error("Error parsing local phan ca tuan data:",$)
        }const M=r||t.ma_kho||"",{
          data:O,error:F
        }=await He.from("store").select("ds_nhan_vien").eq("id",xt(M.trim())).maybeSingle();
        if(F){
          console.error("Lỗi khi tải danh sách nhân viên:",F),d({
            type:"error",text:"Lỗi tải dữ liệu!"
          });
          return
        }let Y=[];
        if(O!=null&&O.ds_nhan_vien)try{
          const $=O.ds_nhan_vien.split(`
`).filter(j=>j.trim());
          if($.length>0){
            const j=$[0].split("	"),I=(f=j[1])!=null&&f.toLowerCase().includes("user")||(g=j[1])!=null&&g.toLowerCase().includes("tên")?1:0;
            Y=$.slice(I).map(W=>{
              const Q=W.split("	");
              return Q.length<2?null:{
                username:Q[1]||Q[0]||"N/A",fullId:Q[2]||"",department:Q[0]||"BP All In One - ĐMX",shiftType:"",shifts:{
                  
                }
              }
            }).filter(Boolean)
          }
        }catch($){
          console.error("Error parsing ds_nhan_vien:",$)
        }Y.length>0?(a(Y),d({
          type:"success",text:"Đã tải danh sách nhân viên!"
        })):(a([]),d({
          type:"info",text:"Chưa có danh sách nhân viên."
        }))
      }catch(b){
        console.error("Error fetching employees:",b),d({
          type:"error",text:"Lỗi hệ thống khi tải dữ liệu."
        })
      }finally{
        i(!1),setTimeout(()=>d({
          type:"",text:""
        }),3e3)
      }
    }
  };
  v.useEffect(()=>{
    xe()
  },[t==null?void 0:t.ma_kho,C]);
  const B=(D,f,g,b)=>{
    const k=ae(f,"yyyy-MM-dd"),P=parseFloat(b)||0;
    a(M=>M.map(O=>{
      if(O.username===D){
        const F={
          ...O.shifts
        },Y={
          ...F[k]||{
            
          }
        };
        return Y[`ca${
          g+1
        }`]=P,F[k]=Y,{
          ...O,shifts:F
        }
      }return O
    }))
  },V=(D,f)=>{
    a(g=>g.map(b=>b.username===D?{
      ...b,shiftType:f
    }:b))
  },U=(D,f)=>{
    const g=ae(f,"yyyy-MM-dd");
    a(b=>b.map(k=>{
      if(k.username===D){
        const P={
          ...k.shifts
        },M={
          ...P[g]||{
            
          }
        };
        return M.isOff=!M.isOff,M.isOff&&_t.forEach((O,F)=>{
          M[`ca${
            F+1
          }`]=0
        }),P[g]=M,{
          ...k,shifts:P
        }
      }return k
    }))
  },[he,E]=v.useState(null),[X,Z]=v.useState(null),Me=(D,f)=>{
    E(f),D.dataTransfer.effectAllowed="move"
  },Ge=(D,f)=>{
    D.preventDefault(),D.dataTransfer.dropEffect="move",X!==f&&Z(f)
  },Ke=(D,f)=>{
    if(D.preventDefault(),!he||he===f){
      E(null),Z(null);
      return
    }a(g=>{
      const b=[...g],k=b.findIndex(Y=>Y.username===he),P=b.findIndex(Y=>Y.username===f);
      if(k===-1||P===-1)return g;
      const M={
        ...b[k]
      },O=b[P];
      M.department=O.department,b.splice(k,1);
      const F=b.findIndex(Y=>Y.username===f);
      return b.splice(F,0,M),b
    }),E(null),Z(null)
  },Le=()=>{
    E(null),Z(null)
  },we=()=>{
    if(t!=null&&t.ma_kho){
      u(!0);
      try{
        const D=ae(C,"yyyy-ww"),f=`PHAN_CA_TUAN_DATA_${
          t.ma_kho
        }`,g=localStorage.getItem(f);
        let b={
          
        };
        if(g)try{
          b=JSON.parse(g)
        }catch{
          
        }b[D]=n,localStorage.setItem(f,JSON.stringify(b));
        const k=new Date().toISOString();
        N(k),localStorage.setItem("PHAN_CA_TUAN_LAST_SAVED",k),d({
          type:"success",text:"Đã lưu vào trình duyệt!"
        })
      }catch{
        d({
          type:"error",text:"Lỗi khi lưu!"
        })
      }finally{
        u(!1),setTimeout(()=>d({
          type:"",text:""
        }),3e3)
      }
    }
  },Ye=async()=>{
    if(A.current)try{
      const D=await rs(A.current,{
        quality:1,backgroundColor:"#ffffff",pixelRatio:2
      }),f=document.createElement("a");
      f.href=D,f.download="PHAN_CA_TUAN.png",f.click(),d({
        type:"success",text:"Đã xuất ảnh bảng phân ca!"
      })
    }catch{
      
    }
  },ke=async()=>{
    if(L.current)try{
      const D=await rs(L.current,{
        quality:1,backgroundColor:"#ffffff",pixelRatio:2
      }),f=document.createElement("a");
      f.href=D,f.download="TOM_TAT_NHAN_VIEN_DI_CA_HANH_CHINH_TUAN.png",f.click(),d({
        type:"success",text:"Đã xuất ảnh tóm tắt ca hành chính!"
      })
    }catch{
      
    }
  },je=()=>{
    a(D=>{
      const f=D.map(M=>({
        ...M,shifts:{
          ...M.shifts
        }
      }));
      if(f.length===0)return D;
      const g=f.map((M,O)=>M.shiftType==="Hành Chính"?O:-1).filter(M=>M!==-1),b=g.length;
      if(b===0)return D;
      const k=f.length;
      let P=g[0];
      return G.forEach((M,O)=>{
        var j,I;
        const F=ae(M,"yyyy-MM-dd");
        let Y=[],$=[];
        for(;
        $.length<Math.min(b,k);
        ){
          let W=!1,Q=0;
          for(;
          Q<k;
          ){
            const q=P%k,se=f[q];
            if(!$.includes(q)&&!((I=(j=se.shifts)==null?void 0:j[F])!=null&&I.isOff)){
              $.push(q),Y.push(se.username),P++,W=!0;
              break
            }P++,Q++
          }if(!W)break
        }f.forEach(W=>{
          const Q={
            ...W.shifts[F]||{
              
            }
          };
          if(Q.isOff){
            _t.forEach((q,se)=>{
              Q[`ca${
                se+1
              }`]=0
            }),W.shifts[F]=Q;
            return
          }if(_t.forEach((q,se)=>{
            Q[`ca${
              se+1
            }`]=0
          }),Y.includes(W.username))[1,2,3,4,5].forEach(q=>Q[`ca${
            q
          }`]=zt[`ca${
            q
          }`]);
          else{
            const q=O%2===0;
            W.shiftType==="Chiều"?q?[4,5].forEach(se=>Q[`ca${
              se
            }`]=zt[`ca${
              se
            }`]):[1,2,3].forEach(se=>Q[`ca${
              se
            }`]=zt[`ca${
              se
            }`]):q?[1,2,3].forEach(se=>Q[`ca${
              se
            }`]=zt[`ca${
              se
            }`]):[4,5].forEach(se=>Q[`ca${
              se
            }`]=zt[`ca${
              se
            }`])
          }W.shifts[F]=Q
        })
      }),f
    }),d({
      type:"success",text:"Đã chia ca tự động!"
    })
  },De=D=>{
    let f=0;
    return G.forEach(g=>{
      var P;
      const b=ae(g,"yyyy-MM-dd"),k=((P=D.shifts)==null?void 0:P[b])||{
        
      };
      Object.values(k).forEach(M=>{
        typeof M=="number"&&(f+=M)
      })
    }),f
  },oe=v.useMemo(()=>G.map(f=>{
    const g=ae(f,"yyyy-MM-dd"),b=_t.map((P,M)=>{
      let O=0,F=0;
      return n.forEach(Y=>{
        var j,I;
        const $=((I=(j=Y.shifts)==null?void 0:j[g])==null?void 0:I[`ca${
          M+1
        }`])||0;
        $>0&&(O+=$,F+=1)
      }),{
        totalHours:O,staffCount:F
      }
    }),k=b.reduce((P,M)=>P+M.totalHours,0);
    return{
      dateStr:g,shiftTotals:b,dayTotalHours:k
    }
  }),[n,G]),tt=v.useMemo(()=>{
    const D={
      
    };
    return n.forEach(f=>{
      const g=f.department||"Khác";
      D[g]||(D[g]=[]),D[g].push(f)
    }),D
  },[n]),Ve=async D=>{
    const f=await D.arrayBuffer(),g=as(f,{
      type:"array"
    }),b=g.Sheets[g.SheetNames[0]],P=Ie.sheet_to_json(b,{
      header:1
    }).slice(1).map(M=>M[1]?{
      username:String(M[1]).trim(),fullId:String(M[2]||"").trim(),department:String(M[0]||"BP All In One - ĐMX").trim(),shiftType:"",shifts:{
        
      }
    }:null).filter(Boolean);
    a(P),d({
      type:"success",text:"Đã nhập danh sách từ Excel. Hãy nhấn LƯU."
    })
  };
  return e.jsxs("div",{
    className:"flex flex-col h-full bg-slate-50",children:[e.jsxs("div",{
      className:"bg-white text-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md border-b border-slate-200 flex-wrap gap-4",children:[e.jsxs("div",{
        className:"flex items-center gap-3 flex-wrap",children:[e.jsx("h1",{
          className:"text-4xl font-black uppercase tracking-wider leading-tight text-[#004b8d] whitespace-nowrap",children:"PHÂN CA TUẦN"
        }),e.jsxs("div",{
          className:"flex items-center bg-slate-100 hover:bg-slate-200 rounded-lg px-2 py-1.5 gap-3 transition-all border border-slate-200 shadow-inner text-slate-700",children:[e.jsx("button",{
            onClick:()=>R(D=>zs(D,-7)),className:"hover:bg-white p-1 rounded transition-colors shadow-sm",children:e.jsx(An,{
              size:16
            })
          }),e.jsxs("div",{
            className:"flex flex-col items-center relative group",children:[e.jsx("span",{
              className:"text-[10px] font-black uppercase text-slate-400 leading-none mb-0.5",children:"Chọn ngày bắt đầu"
            }),e.jsx("input",{
              type:"date",value:ae(C,"yyyy-MM-dd"),onChange:D=>{
                D.target.value&&R(new Date(D.target.value))
              },className:"text-xs font-bold uppercase bg-transparent border-none outline-none cursor-pointer text-center w-32 leading-tight tracking-wide"
            }),e.jsxs("div",{
              className:"text-[9px] font-bold text-[#004b8d] mt-0.5",children:[ae(C,"dd/MM")," - ",ae(zs(C,6),"dd/MM/yyyy")]
            })]
          }),e.jsx("button",{
            onClick:()=>R(D=>zs(D,7)),className:"hover:bg-white p-1 rounded transition-colors shadow-sm",children:e.jsx(Hn,{
              size:16
            })
          })]
        }),m.text&&e.jsx("div",{
          className:`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center min-h-[48px] shadow-sm border ${
            m.type==="success"?"bg-[#008080] text-white border-[#006666]":"bg-red-600 text-white border-red-700"
          }`,children:m.text
        })]
      }),e.jsxs("div",{
        className:"flex items-center gap-2 flex-wrap justify-end",children:[e.jsx("button",{
          onClick:()=>T(!S),className:`px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md ${
            S?"bg-gradient-to-b from-indigo-500 to-indigo-600 border border-indigo-400":"bg-gradient-to-b from-slate-500 to-slate-600 border border-slate-400"
          }`,children:S?e.jsxs(e.Fragment,{
            children:[e.jsx(Ln,{
              size:14,className:"shrink-0"
            })," Hiện tất cả"]
          }):e.jsxs(e.Fragment,{
            children:[e.jsx(Dn,{
              size:14,className:"shrink-0"
            })," Ẩn ca thường"]
          })
        }),e.jsx("button",{
          onClick:je,className:"bg-gradient-to-b from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 border border-orange-400 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md",children:"Chia ca tự động"
        }),e.jsxs("button",{
          onClick:Ye,className:"bg-gradient-to-b from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 border border-purple-400 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal",children:[e.jsx(Ft,{
            size:14,className:"shrink-0"
          })," Chụp ảnh"]
        }),e.jsxs("button",{
          onClick:()=>a(D=>D.map(f=>({
            ...f,shifts:{
              
            }
          }))),className:"bg-gradient-to-b from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border border-red-400 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal",children:[e.jsx(En,{
            size:14,className:"shrink-0"
          })," Reset"]
        }),e.jsxs("label",{
          className:"cursor-pointer bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 border border-sky-400 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal",children:[e.jsx(On,{
            size:14,className:`shrink-0 ${
              o?"animate-spin":""
            }`
          })," Tải DS nhân viên",e.jsx("input",{
            type:"file",accept:".xlsx, .xls",className:"hidden",onChange:D=>{
              var f;
              return((f=D.target.files)==null?void 0:f[0])&&Ve(D.target.files[0])
            }
          })]
        }),e.jsxs("div",{
          className:"flex flex-col gap-1",children:[e.jsxs("div",{
            className:"flex items-center gap-1",children:[e.jsxs("button",{
              onClick:we,disabled:x,className:"bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 border border-emerald-400 px-3 py-2 rounded-lg text-[12px] font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md text-white min-h-[48px] min-w-[130px] leading-tight text-center whitespace-normal disabled:opacity-50",children:[x?e.jsx(Mt,{
                size:16,className:"animate-spin shrink-0"
              }):e.jsx(ss,{
                size:16,className:"shrink-0"
              }),"Lưu trình duyệt"]
            }),e.jsxs("button",{
              onClick:we,disabled:x,className:"bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 border border-amber-400 px-3 py-2 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md disabled:opacity-50",children:[e.jsx(ns,{
                size:16,className:"shrink-0"
              })," Lưu lịch OFF"]
            })]
          }),h&&e.jsxs("span",{
            className:"text-[9px] text-slate-500 italic text-center",children:["Lưu lần cuối: ",new Date(h).toLocaleString("vi-VN")]
          })]
        })]
      })]
    }),e.jsx("div",{
      className:"flex-1 overflow-auto p-4",children:e.jsx("div",{
        className:"bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden min-w-max",ref:A,children:e.jsxs("table",{
          className:"w-full border-collapse text-[11px]",children:[e.jsxs("thead",{
            children:[e.jsxs("tr",{
              className:"bg-[#e6f0fa] border-b border-slate-300",children:[e.jsx("th",{
                rowSpan:2,className:"sticky left-0 z-40 bg-[#e6f0fa] border-r border-slate-300 px-4 py-2 text-left w-64 min-w-[256px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:e.jsxs("div",{
                  className:"flex items-center justify-between",children:[e.jsx("span",{
                    className:"font-black text-[#004b8d] uppercase text-xs",children:"Nhân viên"
                  }),e.jsx("span",{
                    className:"font-black text-[#004b8d] uppercase text-[10px] opacity-80",children:"Loại ca"
                  })]
                })
              }),e.jsx("th",{
                rowSpan:2,className:"sticky left-64 z-40 bg-[#e6f0fa] border-r border-slate-300 px-2 py-2 text-center w-24 min-w-[96px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:e.jsxs("span",{
                  className:"font-black text-[#004b8d] uppercase leading-tight block text-[10px]",children:["Tổng giờ",e.jsx("br",{
                    
                  }),"tuần"]
                })
              }),G.map((D,f)=>{
                const g=D.getDay()===0||D.getDay()===6;
                return e.jsx("th",{
                  colSpan:5,className:`border-r-2 border-slate-400 px-2 py-1.5 text-center ${
                    g?"text-red-600 bg-red-50/50":"text-[#004b8d]"
                  }`,children:e.jsx("span",{
                    className:"font-black uppercase tracking-tighter text-[11px]",children:ae(D,"EEEE (dd/MM)",{
                      locale:Jn
                    })
                  })
                },f)
              })]
            }),e.jsx("tr",{
              className:"bg-[#f0f5fa] border-b border-slate-300",children:G.map((D,f)=>_t.map((g,b)=>e.jsx("th",{
                className:`px-1 py-1 text-[9px] font-bold uppercase w-12 min-w-[48px] ${
                  b===4?"border-r-2 border-slate-400":"border-r border-slate-200"
                }`,children:g.replace("Ca ","C")
              },`${
                f
              }-${
                b
              }`)))
            }),e.jsxs("tr",{
              className:"bg-[#f8fafc] border-b border-slate-200",children:[e.jsx("td",{
                className:"sticky left-0 z-30 bg-[#f8fafc] border-r border-slate-200 px-4 py-2 font-bold text-[#004b8d] uppercase shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:"Tổng giờ công đã xếp ca"
              }),e.jsx("td",{
                className:"sticky left-64 z-30 bg-[#f8fafc] border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
              }),oe.map((D,f)=>e.jsx("td",{
                colSpan:5,className:"border-r-2 border-slate-400 text-center font-black text-[#004b8d] text-xs",children:D.dayTotalHours.toLocaleString()
              },f))]
            }),e.jsxs("tr",{
              className:"bg-white border-b border-slate-200",children:[e.jsx("td",{
                className:"sticky left-0 z-30 bg-white border-r border-slate-200 px-4 py-1.5 font-bold text-slate-500 uppercase text-[10px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:"Giờ công đã xếp ca"
              }),e.jsx("td",{
                className:"sticky left-64 z-30 bg-white border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
              }),oe.map((D,f)=>D.shiftTotals.map((g,b)=>e.jsx("td",{
                className:`text-center font-bold text-slate-700 ${
                  b===4?"border-r-2 border-slate-400":"border-r border-slate-200"
                }`,children:g.totalHours||""
              },`${
                f
              }-${
                b
              }`)))]
            }),e.jsxs("tr",{
              className:"bg-white border-b-2 border-slate-300",children:[e.jsx("td",{
                className:"sticky left-0 z-30 bg-white border-r border-slate-200 px-4 py-1.5 font-bold text-slate-500 uppercase text-[10px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:"Nhân sự trong ca"
              }),e.jsx("td",{
                className:"sticky left-64 z-30 bg-white border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
              }),oe.map((D,f)=>D.shiftTotals.map((g,b)=>e.jsx("td",{
                className:`text-center font-bold text-slate-500 ${
                  b===4?"border-r-2 border-slate-400":"border-r border-slate-200"
                }`,children:g.staffCount||""
              },`${
                f
              }-${
                b
              }`)))]
            })]
          }),e.jsx("tbody",{
            children:Object.entries(tt).map(([D,f])=>e.jsxs(Ze.Fragment,{
              children:[e.jsx("tr",{
                className:"bg-[#f1f5f9]",children:e.jsx("td",{
                  colSpan:2+G.length*5,className:"sticky left-0 z-20 bg-[#f1f5f9] px-4 py-2 font-black text-[#004b8d] uppercase border-b border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:D
                })
              }),f.map(g=>e.jsxs("tr",{
                className:`border-b border-slate-100 hover:bg-indigo-50/50 transition-colors group ${
                  X===g.username?"border-t-2 border-t-indigo-500":""
                }`,draggable:!0,onDragStart:b=>Me(b,g.username),onDragOver:b=>Ge(b,g.username),onDrop:b=>Ke(b,g.username),onDragEnd:Le,children:[e.jsx("td",{
                  className:"sticky left-0 z-20 bg-white group-hover:bg-indigo-50/50 border-r border-slate-200 px-4 py-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:e.jsxs("div",{
                    className:"flex items-center justify-between gap-2",children:[e.jsxs("div",{
                      className:"flex items-center gap-2",children:[e.jsx("div",{
                        className:"cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 opacity-50 group-hover:opacity-100 transition-opacity",children:e.jsx(Bn,{
                          size:14
                        })
                      }),e.jsxs("div",{
                        className:"flex flex-col",children:[e.jsx("span",{
                          className:"font-bold text-slate-700",children:g.username
                        }),e.jsx("span",{
                          className:"text-[9px] text-slate-400 font-medium",children:g.fullId
                        })]
                      })]
                    }),e.jsxs("select",{
                      value:g.shiftType||"",onChange:b=>V(g.username,b.target.value),className:`text-[9px] font-black uppercase border-none rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
                        g.shiftType==="Hành Chính"?"bg-red-100 text-red-600":g.shiftType==="Sáng"||g.shiftType==="Chiều"?"bg-slate-100 text-slate-700":"bg-gray-100 text-gray-400"
                      }`,children:[e.jsx("option",{
                        value:"",children:"-- Chọn --"
                      }),e.jsx("option",{
                        value:"Sáng",children:"Sáng"
                      }),e.jsx("option",{
                        value:"Chiều",children:"Chiều"
                      }),e.jsx("option",{
                        value:"Hành Chính",children:"Hành Chính"
                      })]
                    })]
                  })
                }),e.jsx("td",{
                  className:"sticky left-64 z-20 bg-white group-hover:bg-indigo-50/50 border-r border-slate-200 px-2 py-2 text-center font-black text-indigo-600 text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",children:De(g).toLocaleString()
                }),G.map((b,k)=>{
                  var F,Y;
                  const P=ae(b,"yyyy-MM-dd"),M=(Y=(F=g.shifts)==null?void 0:F[P])==null?void 0:Y.isOff,O=[1,2,3,4,5].every($=>{
                    var j,I;
                    return(((I=(j=g.shifts)==null?void 0:j[P])==null?void 0:I[`ca${
                      $
                    }`])||0)>0
                  });
                  return e.jsx("td",{
                    colSpan:5,className:`border-r-2 border-slate-400 p-0 relative transition-colors ${
                      M?"bg-red-50":""
                    }`,children:e.jsxs("div",{
                      className:"flex flex-col h-full",children:[e.jsx("button",{
                        onClick:()=>U(g.username,b),className:`absolute top-0 right-0 z-10 px-1 py-0.5 text-[8px] font-bold uppercase transition-colors rounded-bl border-l border-b border-slate-200 ${
                          M?"bg-red-600 text-white":"bg-slate-100 text-slate-500"
                        }`,children:M?"OFF":"OFF?"
                      }),e.jsx("div",{
                        className:"flex h-full",children:_t.map(($,j)=>{
                          var W,Q;
                          const I=((Q=(W=g.shifts)==null?void 0:W[P])==null?void 0:Q[`ca${
                            j+1
                          }`])||"";
                          return e.jsx("div",{
                            className:"flex-1 min-w-[30px] border-r border-slate-100 last:border-r-0",children:e.jsx("input",{
                              type:"text",value:M?"-":I,onChange:q=>B(g.username,b,j,q.target.value),className:`w-full h-full min-h-[32px] text-center font-bold bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                                M?"text-red-600":O?"text-amber-700 bg-yellow-100/50":S?"text-transparent select-none focus:text-slate-700":"text-slate-700"
                              }`,disabled:M
                            })
                          },j)
                        })
                      })]
                    })
                  },k)
                })]
              },g.username))]
            },D))
          })]
        })
      })
    }),e.jsxs("div",{
      ref:L,className:"mt-8 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mx-4 mb-8",children:[e.jsxs("div",{
        className:"bg-[#004b8d] px-4 py-3 flex items-center justify-between",children:[e.jsxs("div",{
          className:"flex items-center gap-2",children:[e.jsx(ns,{
            size:20,className:"text-white"
          }),e.jsx("h2",{
            className:"text-white font-bold uppercase tracking-wider text-sm",children:"Tóm tắt nhân viên đi ca hành chính (Tuần)"
          })]
        }),e.jsxs("button",{
          onClick:ke,className:"flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-all text-xs font-black uppercase border border-white/30",children:[e.jsx(Ft,{
            size:14
          }),"Xuất ảnh"]
        })]
      }),e.jsx("div",{
        className:"overflow-x-auto",children:e.jsxs("table",{
          className:"w-full text-left border-collapse",children:[e.jsx("thead",{
            children:e.jsxs("tr",{
              className:"bg-slate-50 border-b border-slate-200",children:[e.jsx("th",{
                className:"px-4 py-3 text-xs font-black uppercase text-slate-500 w-1/4",children:"Nhân viên"
              }),e.jsx("th",{
                className:"px-4 py-3 text-xs font-black uppercase text-slate-500",children:"Ngày đi ca hành chính"
              }),e.jsx("th",{
                className:"px-4 py-3 text-xs font-black uppercase text-slate-500 w-24 text-center",children:"Tổng ngày"
              })]
            })
          }),e.jsxs("tbody",{
            children:[n.map(D=>{
              const f=G.filter(g=>{
                const b=ae(g,"yyyy-MM-dd");
                return[1,2,3,4,5].every(k=>{
                  var P,M;
                  return(((M=(P=D.shifts)==null?void 0:P[b])==null?void 0:M[`ca${
                    k
                  }`])||0)>0
                })
              }).map(g=>ae(g,"dd/MM"));
              return f.length===0?null:e.jsxs("tr",{
                className:"border-b border-slate-100 hover:bg-slate-50 transition-colors",children:[e.jsx("td",{
                  className:"px-4 py-3 font-bold text-slate-700 text-sm",children:D.username
                }),e.jsx("td",{
                  className:"px-4 py-3 text-slate-600 text-sm",children:e.jsx("div",{
                    className:"flex flex-wrap gap-1",children:f.map((g,b)=>e.jsx("span",{
                      className:"bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200",children:g
                    },b))
                  })
                }),e.jsx("td",{
                  className:"px-4 py-3 text-center",children:e.jsx("span",{
                    className:"bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-black",children:f.length
                  })
                })]
              },D.username)
            }),n.length>0&&n.every(D=>!G.some(f=>{
              const g=ae(f,"yyyy-MM-dd");
              return[1,2,3,4,5].every(b=>{
                var k,P;
                return(((P=(k=D.shifts)==null?void 0:k[g])==null?void 0:P[`ca${
                  b
                }`])||0)>0
              })
            }))&&e.jsx("tr",{
              children:e.jsx("td",{
                colSpan:3,className:"px-4 py-8 text-center text-slate-400 italic text-sm",children:"Không có nhân viên nào đi ca hành chính trong tuần này."
              })
            })]
          })]
        })
      })]
    }),o&&e.jsx("div",{
      className:"fixed inset-0 bg-white/60 backdrop-blur-sm z-[100] flex items-center justify-center",children:e.jsxs("div",{
        className:"flex flex-col items-center gap-3",children:[e.jsx(Mt,{
          size:32,className:"animate-spin text-[#004b8d]"
        }),e.jsx("span",{
          className:"text-xs font-black uppercase text-[#004b8d] tracking-widest",children:"Đang xử lý dữ liệu..."
        })]
      })
    }),y&&e.jsx("div",{
      className:"fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[110]",children:e.jsxs("div",{
        className:"bg-white p-6 rounded-xl shadow-xl max-w-md w-full mx-4",children:[e.jsx("h3",{
          className:"text-lg font-bold text-slate-800 mb-2",children:"Xác nhận làm mới"
        }),e.jsx("p",{
          className:"text-slate-600 mb-6 text-sm",children:"Bạn có chắc chắn muốn xóa toàn bộ dữ liệu phân ca hiện tại? Hành động này không thể hoàn tác."
        }),e.jsxs("div",{
          className:"flex justify-end gap-3",children:[e.jsx("button",{
            onClick:()=>w(!1),className:"px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm",children:"Hủy"
          }),e.jsx("button",{
            onClick:()=>{
              a(D=>D.map(f=>({
                ...f,shifts:{
                  
                }
              }))),w(!1),d({
                type:"success",text:"Đã làm mới bảng phân ca!"
              })
            },className:"px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm",children:"Xóa dữ liệu"
          })]
        })]
      })
    })]
  })
}function El({
  isOpen:t,onClose:r,title:n="BIÊN BẢN GHI NHẬN TÌNH TRẠNG HÀNG HÓA"
}){
  const{
    userProfile:a
  }=Kt(),o="rtst_bien_ban_tinh_trang_hang_hoa_data",x=(()=>{
    try{
      const E=localStorage.getItem(o);
      if(E){
        const X=JSON.parse(E);
        return X.currentDate&&(X.currentDate=new Date(X.currentDate)),X
      }
    }catch(E){
      console.error("Failed to load saved bien ban data:",E)
    }return null
  })(),[u,m]=v.useState(()=>(x==null?void 0:x.currentDate)||new Date),[d,h]=v.useState(()=>(x==null?void 0:x.items)||[{
    name:`Vợt muỗi Sunhouse SHE-MT1690
(1032999000762)`,quantity:"1",description:"KHÔNG NGUỒN",reason:"LỖI SX",solution:`Chuyển trạng thái sang Lỗi MYC
01841RP2604000299`,invoiceNumber:"",invoiceDate:""
  }]),[N,y]=v.useState(()=>(x==null?void 0:x.storeName)??`${
    (a==null?void 0:a.ma_kho)||""
  } - ${
    (a==null?void 0:a.ten_sieu_thi)||""
  }`),[w,S]=v.useState(()=>(x==null?void 0:x.managerInfo)??""),[T,A]=v.useState(()=>(x==null?void 0:x.warehouseStaffInfo)??`${
    (a==null?void 0:a.username)||""
  }`),[L,C]=v.useState(()=>(x==null?void 0:x.deliveryStaffMsnv)??""),[R,G]=v.useState(()=>(x==null?void 0:x.deliveryStaffName)??"");
  if(v.useEffect(()=>{
    const E={
      currentDate:u,items:d,storeName:N,managerInfo:w,warehouseStaffInfo:T,deliveryStaffMsnv:L,deliveryStaffName:R
    };
    localStorage.setItem(o,JSON.stringify(E))
  },[u,d,N,w,T,L,R]),!t)return null;
  const xe=()=>{
    window.print()
  },B=()=>{
    h([...d,{
      name:"",quantity:"",description:"",reason:"",solution:"",invoiceNumber:"",invoiceDate:""
    }])
  },V=E=>{
    h(d.filter((X,Z)=>Z!==E))
  },U=(E,X,Z)=>{
    const Me=[...d];
    Me[E]={
      ...Me[E],[X]:Z
    },h(Me)
  },he=e.jsxs("div",{
    className:"fixed inset-0 z-[9999] flex flex-col bg-slate-100 overflow-hidden print-modal",children:[e.jsx("style",{
      children:`
        @media print {
        
          body * {
          
            visibility: hidden;
          
          
        }
          .print-modal * {
          
            visibility: hidden;
          
          
        }
          .print-content, .print-content * {
          
            visibility: visible;
          
          
        }
          .print-content {
          
            position: absolute;
          
            left: 0;
          
            top: 0;
          
            width: 100%;
          
            height: 100%;
          
            margin: 0;
          
            padding: 0;
          
            background: white !important;
          
          
        }
          .no-print {
          
            display: none !important;
          
          
        }
          @page {
          
            size: A4 landscape;
          
            margin: 10mm;
          
          
        }
          textarea {
          
             border: none !important;
          
             resize: none !important;
          
             background: transparent !important;
          
             overflow: hidden !important;
          
          
        }
          input {
          
             border: none !important;
          
             background: transparent !important;
          
          
        }
          .print-only {
          
             display: inline-block !important;
          
          
        }
        
      }
        @media screen {
        
          .print-only {
          
             display: none !important;
          
          
        }
        
      }
      `
    }),e.jsxs("div",{
      className:"flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm no-print relative z-10 shrink-0",children:[e.jsx("h2",{
        className:"text-xl font-bold text-slate-800",children:n
      }),e.jsxs("div",{
        className:"flex items-center gap-3",children:[e.jsxs("button",{
          onClick:B,className:"flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-medium transition-colors",children:[e.jsx(Wt,{
            size:18
          })," Thêm dòng"]
        }),e.jsxs("button",{
          onClick:xe,className:"flex items-center gap-2 px-4 py-2 bg-[#00965e] hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors",children:[e.jsx(We,{
            size:18
          })," In Biên Bản"]
        }),e.jsx("button",{
          onClick:r,className:"p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors",children:e.jsx(gt,{
            size:24
          })
        })]
      })]
    }),e.jsx("div",{
      className:"flex-1 overflow-auto bg-slate-100 p-8 flex justify-center pb-24",children:e.jsxs("div",{
        className:"print-content bg-white shadow-xl m-auto",style:{
          width:"297mm",minHeight:"210mm",padding:"10mm",fontFamily:'"Times New Roman", Times, serif'
        },children:[e.jsxs("div",{
          className:"flex items-center justify-between border-b-2 border-black pb-2 mb-2",children:[e.jsx("div",{
            className:"bg-black text-[#fffb00] font-sans italic font-bold py-2 px-4 text-center w-[280px] shrink-0",children:e.jsx("span",{
              style:{
                fontSize:"20px"
              },children:"www.thegioididong.com"
            })
          }),e.jsx("div",{
            className:"flex-1 flex justify-center px-4",children:e.jsx("h1",{
              className:"text-[22px] font-bold text-black font-serif uppercase tracking-wide text-center",children:n
            })
          }),e.jsxs("div",{
            className:"flex justify-end items-center text-black text-lg shrink-0",children:[e.jsx("span",{
              className:"mr-1 whitespace-nowrap",children:"Ngày lập:"
            }),e.jsx("input",{
              type:"date",className:"no-print outline-none border-b border-dashed border-gray-300 ml-1 text-right text-base text-black bg-transparent w-[130px]",value:ae(u,"yyyy-MM-dd"),onChange:E=>{
                const X=E.target.value;
                if(X){
                  const Z=new Date(X);
                  isNaN(Z.getTime())||m(Z)
                }
              }
            }),e.jsx("span",{
              className:"print-only ml-1 whitespace-nowrap",children:ae(u,"dd/MM/yyyy")
            })]
          })]
        }),e.jsxs("div",{
          className:"flex flex-col border border-black mb-1 w-full text-[15px] font-sans",children:[e.jsx("div",{
            className:"flex border-b border-black",children:e.jsxs("div",{
              className:"flex-1 px-2 py-1 font-bold",children:["SIÊU THỊ: ",e.jsx("input",{
                className:"font-normal w-3/4 outline-none border-b border-dashed border-gray-300",placeholder:"Thông tin siêu thị...",value:N,onChange:E=>y(E.target.value)
              })]
            })
          }),e.jsx("div",{
            className:"flex border-b border-black",children:e.jsxs("div",{
              className:"flex-1 px-2 py-1 font-bold",children:["QUẢN LÝ SIÊU THỊ: ",e.jsx("input",{
                className:"font-normal w-3/4 outline-none border-b border-dashed border-gray-300",placeholder:"Thông tin quản lý...",value:w,onChange:E=>S(E.target.value)
              })]
            })
          }),e.jsx("div",{
            className:"flex border-b border-black",children:e.jsxs("div",{
              className:"flex-1 px-2 py-1 font-bold",children:["Nhân viên Kho: ",e.jsx("input",{
                className:"font-normal w-3/4 outline-none border-b border-dashed border-gray-300",placeholder:"Thông tin nhân viên kho...",value:T,onChange:E=>A(E.target.value)
              })]
            })
          }),e.jsxs("div",{
            className:"flex border-b border-black text-black",children:[e.jsxs("div",{
              className:"w-[45%] px-2 py-1 font-bold pr-4",children:["Nhân viên sau bán hàng/Nhân viên giao hàng",e.jsx("br",{
                
              }),"(nếu hàng giao tại nhà)"]
            }),e.jsxs("div",{
              className:"w-[20%] border-l border-black px-2 py-1 flex items-center",children:[e.jsx("span",{
                children:"MSNV:"
              }),e.jsx("input",{
                className:"font-normal flex-1 ml-2 outline-none border-b border-dashed border-gray-300",value:L,onChange:E=>C(E.target.value)
              })]
            }),e.jsxs("div",{
              className:"flex-1 border-l border-black px-2 py-1 flex items-center",children:[e.jsx("span",{
                children:"Họ & Tên:"
              }),e.jsx("input",{
                className:"font-normal flex-1 ml-2 outline-none border-b border-dashed border-gray-300",value:R,onChange:E=>G(E.target.value)
              })]
            })]
          }),e.jsx("div",{
            className:"flex",children:e.jsx("div",{
              className:"flex-1 px-2 py-1 font-bold italic",children:"Chúng tôi cùng thống nhất ghi nhận tình trạng hàng hóa như sau:"
            })
          })]
        }),e.jsxs("table",{
          className:"w-full border-collapse border border-black mb-4 text-[14px]",children:[e.jsxs("thead",{
            children:[e.jsxs("tr",{
              children:[e.jsx("th",{
                className:"border border-black p-2 font-bold bg-white w-[22%]",rowSpan:2,children:"Tên + MSP + Imei"
              }),e.jsx("th",{
                className:"border border-black p-2 font-bold bg-white w-[6%]",rowSpan:2,children:"Số lượng"
              }),e.jsx("th",{
                className:"border border-black p-2 font-bold bg-white w-[20%]",rowSpan:2,children:"Mô tả tình trạng hàng hóa"
              }),e.jsx("th",{
                className:"border border-black p-2 font-bold bg-white w-[15%]",rowSpan:2,children:"Nguyên nhân"
              }),e.jsx("th",{
                className:"border border-black p-2 font-bold bg-white w-[22%]",rowSpan:2,children:"Hướng đề nghị xử lý"
              }),e.jsx("th",{
                className:"border border-black p-2 font-bold bg-white w-[15%]",colSpan:2,children:"Thông tin Hóa đơn xuất bán nếu hàng đã đem giao cho khách"
              })]
            }),e.jsxs("tr",{
              children:[e.jsx("th",{
                className:"border border-black p-2 font-bold bg-white",children:"Số hóa đơn"
              }),e.jsx("th",{
                className:"border border-black p-2 font-bold bg-white",children:"Ngày hóa đơn"
              })]
            })]
          }),e.jsx("tbody",{
            children:d.map((E,X)=>e.jsxs("tr",{
              className:"relative group",children:[e.jsxs("td",{
                className:"border border-black relative",children:[e.jsx("textarea",{
                  className:"w-full h-full min-h-[60px] p-2 outline-none resize-y",value:E.name,onChange:Z=>U(X,"name",Z.target.value)
                }),e.jsx("button",{
                  onClick:()=>V(X),className:"absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 bg-red-100 text-red-600 rounded-lg no-print opacity-0 group-hover:opacity-100 transition-opacity",children:e.jsx(et,{
                    size:16
                  })
                })]
              }),e.jsx("td",{
                className:"border border-black",children:e.jsx("textarea",{
                  className:"w-full h-full min-h-[60px] p-2 outline-none text-center resize-y",value:E.quantity,onChange:Z=>U(X,"quantity",Z.target.value)
                })
              }),e.jsx("td",{
                className:"border border-black",children:e.jsx("textarea",{
                  className:"w-full h-full min-h-[60px] p-2 outline-none resize-y",value:E.description,onChange:Z=>U(X,"description",Z.target.value)
                })
              }),e.jsx("td",{
                className:"border border-black",children:e.jsx("textarea",{
                  className:"w-full h-full min-h-[60px] p-2 outline-none resize-y",value:E.reason,onChange:Z=>U(X,"reason",Z.target.value)
                })
              }),e.jsx("td",{
                className:"border border-black",children:e.jsx("textarea",{
                  className:"w-full h-full min-h-[60px] p-2 outline-none resize-y",value:E.solution,onChange:Z=>U(X,"solution",Z.target.value)
                })
              }),e.jsx("td",{
                className:"border border-black",children:e.jsx("textarea",{
                  className:"w-full h-full min-h-[60px] p-2 outline-none resize-y",value:E.invoiceNumber,onChange:Z=>U(X,"invoiceNumber",Z.target.value)
                })
              }),e.jsx("td",{
                className:"border border-black",children:e.jsx("textarea",{
                  className:"w-full h-full min-h-[60px] p-2 outline-none resize-y",value:E.invoiceDate,onChange:Z=>U(X,"invoiceDate",Z.target.value)
                })
              })]
            },X))
          })]
        }),e.jsx("table",{
          className:"w-full border-collapse border border-black text-center text-[15px] font-sans font-bold",children:e.jsxs("tbody",{
            children:[e.jsxs("tr",{
              children:[e.jsx("td",{
                className:"border-r border-b border-black p-2 w-[40%]",children:"NHÂN VIÊN KHO"
              }),e.jsx("td",{
                className:"border-r border-b border-black p-2 w-[35%]",children:"QLST"
              }),e.jsx("td",{
                className:"border-b border-black p-2 w-[25%] uppercase",children:"Nhân viên sau bán hàng"
              })]
            }),e.jsxs("tr",{
              children:[e.jsx("td",{
                className:"border-r border-black p-2 h-[120px] align-bottom",children:e.jsx("input",{
                  className:"text-center font-bold outline-none border-b border-dashed border-gray-300 w-full",value:T,onChange:E=>A(E.target.value)
                })
              }),e.jsx("td",{
                className:"border-r border-black p-2 h-[120px] align-bottom",children:e.jsx("input",{
                  className:"text-center font-bold outline-none border-b border-dashed border-gray-300 w-full",value:w,onChange:E=>S(E.target.value)
                })
              }),e.jsx("td",{
                className:"border-black p-2 h-[120px] align-bottom",children:e.jsx("input",{
                  className:"text-center font-bold outline-none border-b border-dashed border-gray-300 w-full",value:R,onChange:E=>G(E.target.value)
                })
              })]
            })]
          })
        })]
      })
    })]
  });
  return is.createPortal(he,document.body)
}function Ol({
  isOpen:t,onClose:r
}){
  const{
    userProfile:n
  }=Kt(),a="rtst_bao_gia_cong_ty_data",i=(()=>{
    try{
      const j=localStorage.getItem(a);
      if(j){
        const I=JSON.parse(j);
        return I.currentDate&&(I.currentDate=new Date(I.currentDate)),I.validUntilDate&&(I.validUntilDate=new Date(I.validUntilDate)),I
      }
    }catch(j){
      console.error("Failed to load saved bao gia data:",j)
    }return null
  })(),x=new Date,u=new Date;
  u.setDate(u.getDate()+6);
  const[m,d]=v.useState(()=>(i==null?void 0:i.currentDate)||x),[h,N]=v.useState(()=>(i==null?void 0:i.validUntilDate)||u),[y,w]=v.useState(()=>(i==null?void 0:i.items)||[{
    name:"MÁY LẠNH CASPER GC-18IS33",quantity:"2",retailPrice:"15990000",discountPrice:"12690000"
  },{
    name:"MÁY LẠNH CASPER GC-12IB36",quantity:"3",retailPrice:"8990000",discountPrice:"7990000"
  }]),[S,T]=v.useState(()=>(i==null?void 0:i.companyName)??"CHI NHÁNH CÔNG TY CỔ PHẦN ĐẦU TƯ ĐIỆN MÁY XANH"),[A,L]=v.useState(()=>(i==null?void 0:i.companyAddress)??"155A, NGUYỄN TẤT THÀNH, LÝ VĂN LÂM, TỈNH CÀ MAU"),[C,R]=v.useState(()=>(i==null?void 0:i.companyPhone)??"1900232460"),[G,xe]=v.useState(()=>(i==null?void 0:i.companyTax)??""),[B,V]=v.useState(()=>(i==null?void 0:i.customerName)??"DUNG"),[U,he]=v.useState(()=>(i==null?void 0:i.customerPhone)??"0976896425"),[E,X]=v.useState(()=>(i==null?void 0:i.customerCompany)??"CHI NHÁNH PHÍA NAM - TỔNG CÔNG TY XÂY DỰNG TRƯỜNG SƠN"),[Z,Me]=v.useState(()=>(i==null?void 0:i.customerEmail)??""),[Ge,Ke]=v.useState(()=>(i==null?void 0:i.customerAddress)??"30D PHAN VĂN TRỊ, PHƯỜNG HẠNH THÔNG, THÀNH PHỐ HỒ CHÍ MINH, VIỆT NAM"),[Le,we]=v.useState(()=>(i==null?void 0:i.terms)||["Giá trên đã bao gồm 10% VAT,","Thanh toán bằng chuyển khoản hoặc tiền mặt trước khi nhận hàng","Hàng hoá được bảo hành theo tiêu chuẩn nhà sản xuất và phân phối","Hàng hóa được giao tại 63 tỉnh thành"]),[Ye,ke]=v.useState(()=>(i==null?void 0:i.contactStore)??((n==null?void 0:n.ten_sieu_thi)||"")),[je,De]=v.useState(()=>(i==null?void 0:i.contactAddress)??""),[oe,tt]=v.useState(()=>(i==null?void 0:i.creatorName)??((n==null?void 0:n.username)||""));
  if(v.useEffect(()=>{
    const j={
      currentDate:m,validUntilDate:h,items:y,companyName:S,companyAddress:A,companyPhone:C,companyTax:G,customerName:B,customerPhone:U,customerCompany:E,customerEmail:Z,customerAddress:Ge,terms:Le,contactStore:Ye,contactAddress:je,creatorName:oe
    };
    localStorage.setItem(a,JSON.stringify(j))
  },[m,h,y,S,A,C,G,B,U,E,Z,Ge,Le,Ye,je,oe]),!t)return null;
  const Ve=()=>{
    window.print()
  },D=()=>{
    w([...y,{
      name:"",quantity:"1",retailPrice:"0",discountPrice:"0"
    }])
  },f=j=>{
    w(y.filter((I,W)=>W!==j))
  },g=(j,I,W)=>{
    const Q=[...y];
    if(I==="retailPrice"||I==="discountPrice"){
      const q=W.replace(/[^0-9]/g,"");
      Q[j]={
        ...Q[j],[I]:q
      }
    }else Q[j]={
      ...Q[j],[I]:W
    };
    w(Q)
  },b=j=>{
    const I=Number(j)||0;
    return I===0?"-":I.toLocaleString("en-US")
  },k=j=>{
    const I=Number(j.quantity)||0,W=Number(j.discountPrice)||0;
    return I*W
  },P=()=>y.reduce((j,I)=>j+k(I),0),M=[...y],O=(j,I)=>{
    const W=[...Le];
    W[j]=I,we(W)
  },F=()=>we([...Le,""]),Y=j=>we(Le.filter((I,W)=>W!==j)),$=e.jsxs("div",{
    className:"fixed inset-0 z-[9999] flex flex-col bg-slate-100 overflow-hidden print-modal",children:[e.jsx("style",{
      children:`
        @media print {
        
          body * {
           visibility: hidden;
           
        }
          .print-modal * {
           visibility: hidden;
           
        }
          .print-content, .print-content * {
           visibility: visible;
           
        }
          .print-content {
          
            position: absolute;
          
            left: 0;
          
            top: 0;
          
            width: 100%;
          
            height: 100%;
          
            margin: 0;
          
            padding: 0;
          
            background: white !important;
          
          
        }
          .no-print {
           display: none !important;
           
        }
          @page {
          
            size: A4 portrait;
          
            margin: 10mm;
          
          
        }
          textarea {
          
             border: none !important;
          
             resize: none !important;
          
             background: transparent !important;
          
             overflow: hidden !important;
          
          
        }
          input {
          
             border: none !important;
          
             background: transparent !important;
          
          
        }
          .print-only {
           display: inline-block !important;
           
        }
        
      }
        @media screen {
        
          .print-only {
           display: none !important;
           
        }
        
      }
      `
    }),e.jsxs("div",{
      className:"flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm no-print relative z-10 shrink-0",children:[e.jsx("h2",{
        className:"text-xl font-bold text-slate-800",children:"Báo Giá Công Ty"
      }),e.jsxs("div",{
        className:"flex items-center gap-3",children:[e.jsxs("button",{
          onClick:D,className:"flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg font-medium transition-colors",children:[e.jsx(Wt,{
            size:18
          })," Thêm dòng SP"]
        }),e.jsxs("button",{
          onClick:F,className:"flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-medium transition-colors",children:[e.jsx(Wt,{
            size:18
          })," Thêm điều khoản"]
        }),e.jsxs("button",{
          onClick:Ve,className:"flex items-center gap-2 px-4 py-2 bg-[#00965e] hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors",children:[e.jsx(We,{
            size:18
          })," In Báo Giá"]
        }),e.jsx("button",{
          onClick:r,className:"p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors",children:e.jsx(gt,{
            size:24
          })
        })]
      })]
    }),e.jsx("div",{
      className:"flex-1 overflow-auto bg-slate-100 p-8 flex justify-center pb-24",children:e.jsxs("div",{
        className:"print-content bg-white shadow-xl m-auto",style:{
          width:"210mm",minHeight:"297mm",padding:"15mm",fontFamily:'"Times New Roman", Times, serif'
        },children:[e.jsxs("div",{
          className:"flex justify-between items-start mb-8",children:[e.jsxs("div",{
            className:"flex-1 pr-4",children:[e.jsx("input",{
              className:"font-bold text-black uppercase w-full outline-none",value:S,onChange:j=>T(j.target.value)
            }),e.jsxs("div",{
              className:"flex text-red-600 text-[13px] mt-1",children:[e.jsx("span",{
                className:"whitespace-nowrap",children:"Địa chỉ: "
              }),e.jsx("input",{
                className:"ml-1 flex-1 outline-none text-red-600",value:A,onChange:j=>L(j.target.value)
              })]
            }),e.jsxs("div",{
              className:"flex text-red-600 text-[13px] mt-4",children:[e.jsx("span",{
                className:"whitespace-nowrap",children:"Điện thoại: "
              }),e.jsx("input",{
                className:"ml-1 flex-1 outline-none text-red-600",value:C,onChange:j=>R(j.target.value)
              })]
            }),e.jsxs("div",{
              className:"flex text-red-600 text-[13px]",children:[e.jsx("span",{
                className:"whitespace-nowrap",children:"Mã số thuế: "
              }),e.jsx("input",{
                className:"ml-1 flex-1 outline-none text-red-600",value:G,onChange:j=>xe(j.target.value)
              })]
            })]
          }),e.jsxs("div",{
            className:"w-[260px] h-[50px] flex shrink-0",children:[e.jsx("div",{
              className:"w-1/2 bg-black flex items-center justify-center p-2",children:e.jsx("img",{
                src:"/logo_tgdd.png",alt:"Thegioididong",className:"max-h-full max-w-full object-contain",onError:j=>{
                  j.currentTarget.style.display="none",j.currentTarget.parentElement.innerHTML='<span class="text-[#fffb00] font-sans font-bold italic text-[12px]">thegioididong</span>'
                }
              })
            }),e.jsx("div",{
              className:"w-1/2 bg-[#00a8e8] flex items-center justify-center p-2",children:e.jsx("img",{
                src:"/dmx.png",alt:"Dien may XANH",className:"max-h-full max-w-full object-contain",onError:j=>{
                  j.currentTarget.style.display="none",j.currentTarget.parentElement.innerHTML='<span class="text-[#fffb00] font-sans font-bold italic text-[12px]">Điện máy XANH</span>'
                }
              })
            })]
          })]
        }),e.jsxs("div",{
          className:"flex justify-between items-start mb-6",children:[e.jsxs("div",{
            className:"w-[65%]",children:[e.jsx("div",{
              className:"bg-black text-white font-bold px-2 py-1 mb-6 text-[14px]",children:"Kính gởi Quý khách:"
            }),e.jsxs("div",{
              className:"space-y-1 text-[13px]",children:[e.jsxs("div",{
                className:"flex text-red-600",children:[e.jsx("span",{
                  className:"whitespace-nowrap w-[80px]",children:"Anh/ Chị: "
                }),e.jsx("input",{
                  className:"flex-1 outline-none text-red-600",value:B,onChange:j=>V(j.target.value)
                })]
              }),e.jsxs("div",{
                className:"flex text-red-600",children:[e.jsx("span",{
                  className:"whitespace-nowrap w-[80px]",children:"Điện thoại: "
                }),e.jsx("input",{
                  className:"flex-1 outline-none text-red-600",value:U,onChange:j=>he(j.target.value)
                })]
              }),e.jsxs("div",{
                className:"flex text-red-600",children:[e.jsx("span",{
                  className:"whitespace-nowrap w-[80px]",children:"Tên công ty: "
                }),e.jsx("input",{
                  className:"flex-1 outline-none text-red-600",value:E,onChange:j=>X(j.target.value)
                })]
              }),e.jsxs("div",{
                className:"flex text-red-600",children:[e.jsx("span",{
                  className:"whitespace-nowrap w-[80px]",children:"Email: "
                }),e.jsx("input",{
                  className:"flex-1 outline-none text-red-600",value:Z,onChange:j=>Me(j.target.value)
                })]
              }),e.jsxs("div",{
                className:"flex text-red-600",children:[e.jsx("span",{
                  className:"whitespace-nowrap w-[80px]",children:"Địa chỉ: "
                }),e.jsx("textarea",{
                  className:"flex-1 outline-none text-red-600 resize-none h-[40px] leading-tight",value:Ge,onChange:j=>Ke(j.target.value)
                })]
              })]
            })]
          }),e.jsxs("div",{
            className:"w-[35%] pl-4 flex flex-col items-end",children:[e.jsx("h1",{
              className:"text-[32px] font-bold text-black font-serif tracking-wide mb-4 mt-[-10px]",children:"BẢNG BÁO GIÁ"
            }),e.jsxs("div",{
              className:"w-full space-y-1 text-[13px] text-black pl-4",children:[e.jsxs("div",{
                className:"flex items-center justify-start",children:[e.jsx("span",{
                  className:"whitespace-nowrap w-[90px]",children:"Ngày báo giá: "
                }),e.jsx("input",{
                  type:"date",className:"no-print outline-none text-black bg-transparent w-[120px]",value:ae(m,"yyyy-MM-dd"),onChange:j=>{
                    const I=j.target.value;
                    if(I){
                      const W=new Date(I);
                      isNaN(W.getTime())||d(W)
                    }
                  }
                }),e.jsx("span",{
                  className:"print-only ml-1 whitespace-nowrap",children:ae(m,"d/M/yyyy")
                })]
              }),e.jsxs("div",{
                className:"flex items-center justify-start",children:[e.jsx("span",{
                  className:"whitespace-nowrap w-[90px]",children:"Hiệu lực đến: "
                }),e.jsx("input",{
                  type:"date",className:"no-print outline-none text-black bg-transparent w-[120px]",value:ae(h,"yyyy-MM-dd"),onChange:j=>{
                    const I=j.target.value;
                    if(I){
                      const W=new Date(I);
                      isNaN(W.getTime())||N(W)
                    }
                  }
                }),e.jsx("span",{
                  className:"print-only ml-1 whitespace-nowrap",children:ae(h,"d/M/yyyy")
                })]
              })]
            })]
          })]
        }),e.jsxs("table",{
          className:"w-full border-collapse border border-black mb-4 text-[13px]",children:[e.jsx("thead",{
            children:e.jsxs("tr",{
              className:"bg-black text-white",children:[e.jsx("th",{
                className:"border border-black p-1.5 font-bold w-[5%] text-center",children:"STT"
              }),e.jsx("th",{
                className:"border border-black p-1.5 font-bold w-[35%] text-left",children:"Mô tả hàng hoá"
              }),e.jsx("th",{
                className:"border border-black p-1.5 font-bold w-[6%] text-center",children:"SL"
              }),e.jsx("th",{
                className:"border border-black p-1.5 font-bold w-[16%] text-right",children:"Giá bán lẻ"
              }),e.jsx("th",{
                className:"border border-black p-1.5 font-bold w-[18%] text-right",children:"Giá đã giảm"
              }),e.jsx("th",{
                className:"border border-black p-1.5 font-bold w-[20%] text-right",children:"Thành tiền"
              })]
            })
          }),e.jsxs("tbody",{
            children:[M.map((j,I)=>{
              const W=I<y.length,Q=I+1;
              return e.jsxs("tr",{
                className:"relative group",children:[e.jsxs("td",{
                  className:"border border-black text-red-600 text-center font-bold relative",children:[Q,W&&e.jsx("button",{
                    onClick:()=>f(I),className:"absolute -left-8 top-1/2 -translate-y-1/2 p-1 bg-red-100 text-red-600 rounded no-print opacity-0 group-hover:opacity-100 transition-opacity",children:e.jsx(et,{
                      size:14
                    })
                  })]
                }),e.jsx("td",{
                  className:"border border-black p-0 h-[24px]",children:W?e.jsx("input",{
                    className:"w-full h-full px-1.5 outline-none font-bold text-black",value:j.name,onChange:q=>g(I,"name",q.target.value)
                  }):null
                }),e.jsx("td",{
                  className:"border border-black p-0 text-center",children:W?e.jsx("input",{
                    className:"w-full h-full text-center outline-none text-red-600",value:j.quantity,onChange:q=>g(I,"quantity",q.target.value)
                  }):null
                }),e.jsx("td",{
                  className:"border border-black p-0 text-right",children:W?e.jsx("input",{
                    className:"w-full h-full px-1.5 text-right outline-none text-red-600",value:b(j.retailPrice),onChange:q=>g(I,"retailPrice",q.target.value)
                  }):null
                }),e.jsx("td",{
                  className:"border border-black p-0 text-right",children:W?e.jsx("input",{
                    className:"w-full h-full px-1.5 text-right outline-none text-red-600",value:b(j.discountPrice),onChange:q=>g(I,"discountPrice",q.target.value)
                  }):null
                }),e.jsx("td",{
                  className:"border border-black p-1.5 text-right text-red-600 font-bold bg-[#fcfcfc]",children:W?b(k(j)):"-"
                })]
              },I)
            }),e.jsxs("tr",{
              children:[e.jsx("td",{
                colSpan:5,className:"p-2 font-bold text-right text-[14px]",children:"Tổng cộng (VND)"
              }),e.jsx("td",{
                className:"border border-black p-2 font-bold text-right bg-[#e2e8f0] text-[14px]",children:b(P())
              })]
            })]
          })]
        }),e.jsxs("div",{
          className:"w-[65%] border-2 border-black mb-6",children:[e.jsx("div",{
            className:"bg-black text-white font-bold px-2 py-1 text-[13px]",children:"Các điều khoản lưu ý"
          }),e.jsx("div",{
            className:"p-2 text-[13px]",children:Le.map((j,I)=>e.jsxs("div",{
              className:"flex relative group",children:[e.jsxs("span",{
                className:"text-black font-bold mr-1",children:[I+1,"."]
              }),e.jsx("input",{
                className:`flex-1 outline-none ${
                  I%2===0?"text-black":"text-red-600"
                }`,value:j,onChange:W=>O(I,W.target.value)
              }),e.jsx("button",{
                onClick:()=>Y(I),className:"absolute -left-6 top-1/2 -translate-y-1/2 p-0.5 bg-red-100 text-red-600 rounded no-print opacity-0 group-hover:opacity-100 transition-opacity",children:e.jsx(gt,{
                  size:12
                })
              })]
            },I))
          })]
        }),e.jsxs("div",{
          className:"text-[13px] text-black mb-8 space-y-1",children:[e.jsx("div",{
            children:"Nếu quý khách cần hỗ trợ thêm thông tin, vui lòng liên hệ với:"
          }),e.jsxs("div",{
            className:"flex text-red-600",children:[e.jsx("span",{
              className:"whitespace-nowrap",children:"Siêu thị: "
            }),e.jsx("input",{
              className:"ml-1 flex-1 outline-none text-red-600",value:Ye,onChange:j=>ke(j.target.value)
            })]
          }),e.jsxs("div",{
            className:"flex text-black",children:[e.jsx("span",{
              className:"whitespace-nowrap",children:"Địa chỉ: "
            }),e.jsx("input",{
              className:"ml-1 flex-1 outline-none text-black",value:je,onChange:j=>De(j.target.value)
            })]
          }),e.jsx("div",{
            className:"font-bold font-serif italic mt-2",children:"Cảm ơn Quý khách đã cộng tác với Điện máy xanh!"
          })]
        }),e.jsx("div",{
          className:"flex justify-end pr-12 text-center text-[13px]",children:e.jsxs("div",{
            children:[e.jsx("div",{
              className:"font-bold text-black mb-16",children:"Người lập báo giá"
            }),e.jsx("input",{
              className:"text-center font-bold text-black uppercase outline-none min-w-[200px]",value:oe,onChange:j=>tt(j.target.value)
            })]
          })
        })]
      })
    })]
  });
  return is.createPortal($,document.body)
}const In=t=>{
  const r=t.replace(/[^0-9]/g,"");
  return r?parseInt(r,10).toLocaleString("vi-VN").replace(/,/g,"."):""
},Bl=t=>t.replace(/[^0-9]/g,""),Gs=()=>[{
  id:`sticker-${
    Date.now()
  }-0`,name:"GIÁ RẺ QUÁ",originalPrice:"",discountPrice:""
}];
function Rl(){
  const[t,r]=v.useState(Gs),[n,a]=v.useState(!1),[o,i]=v.useState("8"),[x,u]=v.useState("SẢN PHẨM GIÁ SỐC - EVENT T7 & CN"),[m,d]=v.useState(()=>{
    const B={
      
    };
    return Gs().forEach(V=>{
      B[V.id]=1
    }),B
  }),h=(B,V,U)=>{
    const he=Bl(U);
    r(E=>E.map(X=>X.id===B?{
      ...X,[V]:he
    }:X))
  },N=(B,V)=>{
    r(U=>U.map(he=>he.id===B?{
      ...he,name:V
    }:he))
  },y=()=>{
    const B=`sticker-${
      Date.now()
    }`;
    r(V=>[...V,{
      id:B,name:"GIÁ RẺ QUÁ",originalPrice:"",discountPrice:""
    }]),d(V=>({
      ...V,[B]:1
    }))
  },w=B=>{
    r(V=>V.filter(U=>U.id!==B)),d(V=>{
      const U={
        ...V
      };
      return delete U[B],U
    })
  },S=B=>{
    const V=t.find(E=>E.id===B);
    if(!V)return;
    const U=`sticker-${
      Date.now()
    }`,he={
      ...V,id:U
    };
    r(E=>{
      const X=E.findIndex(Me=>Me.id===B),Z=[...E];
      return Z.splice(X+1,0,he),Z
    }),d(E=>({
      ...E,[U]:E[B]||1
    }))
  },T=(B,V)=>{
    d(U=>({
      ...U,[B]:Math.max(1,(U[B]||1)+V)
    }))
  },A=(B,V)=>{
    const U=parseInt(V,10);
    d(he=>({
      ...he,[B]:isNaN(U)||U<1?1:U
    }))
  },L=()=>{
    const B=Gs();
    r(B);
    const V={
      
    };
    B.forEach(U=>{
      V[U.id]=1
    }),d(V)
  },C=t,R=C.flatMap(B=>Array(m[B.id]||1).fill(B)),G=C.reduce((B,V)=>B+(m[V.id]||1),0),xe=()=>{
    C.length!==0&&a(!0)
  };
  return e.jsxs("div",{
    className:"space-y-6",children:[e.jsx("style",{
      children:`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Pacifico&family=Oswald:wght@400;
      500;
      600;
      700;
      900&display=swap');
      
      `
    }),e.jsxs("div",{
      className:"bg-white rounded-3xl shadow-sm border border-slate-200 p-6",children:[e.jsxs("div",{
        className:"flex items-center justify-between mb-5",children:[e.jsxs("div",{
          className:"flex items-center gap-3",children:[e.jsx("div",{
            className:"w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center text-white shadow-lg shadow-rose-100",children:e.jsx(We,{
              size:20
            })
          }),e.jsxs("div",{
            children:[e.jsx("h2",{
              className:"text-lg font-black text-slate-800 uppercase tracking-tight",children:"Sticker Mẫu Có Sẵn"
            }),e.jsx("p",{
              className:"text-xs text-slate-500 font-medium",children:"Chỉnh sửa giá trực tiếp trên sticker — Không cần file Excel"
            })]
          })]
        }),e.jsx("div",{
          className:"flex items-center gap-2",children:e.jsxs("button",{
            onClick:L,className:"flex items-center gap-1.5 text-red-500 hover:text-red-600 transition-colors text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-50",children:[e.jsx(et,{
              size:14
            }),"Xóa hết"]
          })
        })]
      }),e.jsxs("div",{
        className:"flex items-center gap-3 mb-4",children:[e.jsx("label",{
          className:"text-[10px] font-bold text-slate-500 uppercase shrink-0",children:"Dòng khuyến mãi:"
        }),e.jsx("input",{
          type:"text",value:x,onChange:B=>u(B.target.value),className:"flex-1 bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
        })]
      }),e.jsxs("div",{
        className:"flex items-center gap-3",children:[e.jsx("label",{
          className:"text-[10px] font-bold text-slate-500 uppercase shrink-0",children:"Bố cục in:"
        }),e.jsxs("div",{
          className:"flex gap-2",children:[e.jsx("button",{
            onClick:()=>i("8"),className:`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              o==="8"?"bg-orange-500 text-white shadow-sm":"bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`,children:"8 sticker / trang (A4 dọc)"
          }),e.jsx("button",{
            onClick:()=>i("4"),className:`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              o==="4"?"bg-orange-500 text-white shadow-sm":"bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`,children:"4 sticker / trang (A4 ngang)"
          })]
        })]
      })]
    }),e.jsxs("div",{
      className:"bg-white rounded-3xl shadow-sm border border-slate-200 p-6",children:[e.jsxs("div",{
        className:"flex items-center justify-between mb-4",children:[e.jsxs("h3",{
          className:"text-sm font-black text-slate-700 uppercase tracking-tight",children:["Danh sách Sticker (",t.length,")"]
        }),e.jsxs("button",{
          onClick:y,className:"flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm",children:[e.jsx(Wt,{
            size:14
          }),"Thêm Sticker"]
        })]
      }),e.jsx("div",{
        className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",children:t.map((B,V)=>e.jsxs("div",{
          className:"relative border-2 border-black bg-white p-1 group",children:[e.jsxs("div",{
            className:"border-[2px] border-black p-2 flex flex-col h-[160px] relative overflow-hidden select-none bg-white",children:[e.jsxs("div",{
              className:"text-center mb-1 w-full flex flex-col items-center",children:[e.jsx("input",{
                type:"text",value:B.name,onChange:U=>N(B.id,U.target.value),className:"w-full text-center text-[22px] leading-[0.8] font-black uppercase tracking-tighter bg-transparent border-none outline-none focus:bg-yellow-50 rounded px-1 py-0.5 select-all z-10",style:{
                  fontFamily:'"Anton", sans-serif',color:"#ffffff",WebkitTextStroke:"1.8px #000000",paintOrder:"stroke fill",letterSpacing:"-0.04em",transform:"skewX(-10deg) scale(1.1, 0.95)",textShadow:`
                        -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000,
                        -2px 2px 0 #000, -3px 3px 0 #000, -4px 4px 0 #000, -5px 5px 0 #000, -6px 6px 0 #000
                      `
                }
              }),e.jsxs("div",{
                className:"flex items-center justify-center gap-0.5 -mt-1.5 z-20 select-none",style:{
                  transform:"skewX(-10deg)"
                },children:[e.jsx("span",{
                  className:"text-[10px] lowercase leading-none pr-0.5",style:{
                    fontFamily:'"Pacifico", cursive',color:"#ffffff",WebkitTextStroke:"1px #000000",paintOrder:"stroke fill",textShadow:"-0.5px 0.5px 0 #000, -1px 1px 0 #000, -1.5px 1.5px 0 #000, -2px 2px 0 #000"
                  },children:"very"
                }),e.jsx("span",{
                  className:"text-[11px] font-black uppercase leading-none tracking-tight",style:{
                    fontFamily:'"Anton", sans-serif',color:"#ffffff",WebkitTextStroke:"1.2px #000000",paintOrder:"stroke fill",textShadow:"-0.5px 0.5px 0 #000, -1px 1px 0 #000, -1.5px 1.5px 0 #000, -2px 2px 0 #000"
                  },children:"GOOD!"
                })]
              })]
            }),e.jsxs("div",{
              className:"flex-1 flex flex-col items-center justify-center -mt-1 gap-0.5",children:[e.jsx("input",{
                type:"text",placeholder:"Giá gốc...",value:B.originalPrice?In(B.originalPrice):"",onChange:U=>h(B.id,"originalPrice",U.target.value),className:"w-full text-center text-[11px] font-bold tracking-tight bg-transparent border-none outline-none focus:bg-yellow-50 rounded px-1 text-slate-600",style:{
                  fontFamily:'"Oswald", sans-serif',textDecoration:B.originalPrice?"line-through":"none"
                }
              }),e.jsx("input",{
                type:"text",placeholder:"Nhập giá (trống để viết tay)...",value:B.discountPrice?In(B.discountPrice):"",onChange:U=>h(B.id,"discountPrice",U.target.value),className:"w-full text-center text-[22px] font-black tracking-tighter bg-transparent border-none outline-none focus:bg-green-50 rounded px-1 leading-none animate-pulse",style:{
                  fontFamily:'"Oswald", sans-serif'
                }
              })]
            }),e.jsx("div",{
              className:"absolute bottom-0 left-0 right-0 h-3 bg-black"
            })]
          }),e.jsxs("div",{
            className:"flex items-center justify-center gap-1.5 mt-1.5 bg-slate-50 rounded-lg py-1 px-2 border border-slate-200",children:[e.jsx("span",{
              className:"text-[9px] font-bold text-slate-500 uppercase",children:"SL:"
            }),e.jsx("button",{
              onClick:()=>T(B.id,-1),className:"w-5 h-5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded flex items-center justify-center transition-colors",children:e.jsx(Ta,{
                size:10
              })
            }),e.jsx("input",{
              type:"text",value:m[B.id]||1,onChange:U=>A(B.id,U.target.value),className:"w-10 text-center text-xs font-black bg-white border border-slate-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
            }),e.jsx("button",{
              onClick:()=>T(B.id,1),className:"w-5 h-5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded flex items-center justify-center transition-colors",children:e.jsx(Wt,{
                size:10
              })
            })]
          }),e.jsxs("div",{
            className:"absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10",children:[e.jsx("button",{
              onClick:()=>S(B.id),className:"w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md",title:"Nhân đôi",children:e.jsx(_a,{
                size:12
              })
            }),e.jsx("button",{
              onClick:()=>w(B.id),className:"w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md",title:"Xóa",children:e.jsx(gt,{
                size:12
              })
            })]
          }),e.jsx("div",{
            className:"absolute -top-2 -left-2 w-6 h-6 bg-slate-800 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md z-10",children:V+1
          })]
        },B.id))
      })]
    }),e.jsxs("button",{
      onClick:xe,disabled:C.length===0,className:"w-full flex items-center justify-center gap-2 px-4 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-3xl text-base font-bold transition-colors shadow-sm",children:[e.jsx(We,{
        size:20
      }),"IN STICKER (",G," sticker)"]
    }),n&&e.jsx(zl,{
      stickers:R,layout:o,promoLabel:x,onClose:()=>a(!1)
    })]
  })
}function zl({
  stickers:t,layout:r,promoLabel:n,onClose:a
}){
  const o=v.useRef(null),[i,x]=v.useState(1);
  Ze.useEffect(()=>{
    const C=()=>{
      if(o.current){
        const R=o.current.clientWidth,G=64,B=(r==="8"?210:297)*3.78;
        R-G<B?x((R-G)/B):x(1)
      }
    };
    return setTimeout(C,10),window.addEventListener("resize",C),()=>window.removeEventListener("resize",C)
  },[r]);
  const u=()=>{
    window.print()
  },m=C=>{
    const R=parseInt(C,10);
    return isNaN(R)||R===0?"0":R.toLocaleString("vi-VN").replace(/,/g,".")
  },d=new Date;
  d.getDate().toString().padStart(2,"0"),(d.getMonth()+1).toString().padStart(2,"0"),d.getFullYear(),d.getHours().toString().padStart(2,"0"),d.getMinutes().toString().padStart(2,"0");
  const h=2,N=r==="8"?4:2,y=h*N,w=r==="8"?"portrait":"landscape",S=r==="8"?.68:.94,T=148.5,A=105,L=[];
  for(let C=0;
  C<t.length;
  C+=y)L.push(t.slice(C,C+y));
  return is.createPortal(e.jsxs("div",{
    className:"print-modal-container fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 print:static print:bg-white print:p-0 print:block",children:[e.jsx("style",{
      type:"text/css",children:"@import url('https://fonts.googleapis.com/css2?family=Anton&family=Pacifico&family=Oswald:wght@400;
      500;
      600;
      700;
      900&display=swap');
      "
    }),e.jsx("style",{
      type:"text/css",media:"print",children:`
          @page {
         
            size: A4 ${
          w
        };
         
            margin: 0;
         
          
      }
          body {
         
            -webkit-print-color-adjust: exact;
         
            print-color-adjust: exact;
         
            margin: 0 !important;
        
            padding: 0 !important;
        
            overflow: visible !important;
        
          
      }
          * {
         box-sizing: border-box;
         
      }
          body > *:not(.print-modal-container) {
         display: none !important;
         
      }
          .print-modal-container {
         
            display: block !important;
         
            position: static !important;
         
            width: 100% !important;
        
            height: auto !important;
        
            overflow: visible !important;
        
          
      }
          .print-area {
         
            zoom: 1 !important;
         
            transform: none !important;
         
            width: 100% !important;
        
            display: block !important;
        
            overflow: visible !important;
        
          
      }
          .page-break {
        
            page-break-after: always;
        
            break-after: page;
        
          
      }
        `
    }),e.jsxs("div",{
      className:"absolute top-4 right-4 flex gap-2 print:hidden z-50",children:[e.jsxs("button",{
        onClick:u,className:"bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-colors",children:[e.jsx(We,{
          size:20
        })," In Ngay"]
      }),e.jsx("button",{
        onClick:a,className:"bg-white hover:bg-slate-100 text-slate-800 p-2 rounded-xl shadow-lg transition-colors",children:e.jsx(gt,{
          size:24
        })
      })]
    }),e.jsx("div",{
      ref:o,className:"bg-slate-100 rounded-2xl overflow-auto max-h-[90vh] w-full max-w-6xl p-8 print:p-0 print:m-0 print:max-h-none print:w-full print:bg-white print:overflow-visible",children:e.jsx("div",{
        style:{
          zoom:i
        },className:"print-area flex flex-col items-center w-full",children:e.jsx("div",{
          className:"flex flex-col items-center gap-8 print:gap-0 print:block w-full",children:L.map((C,R)=>e.jsx("div",{
            className:"bg-white shadow-xl print:shadow-none grid page-break",style:{
              width:w==="portrait"?"210mm":"297mm",height:w==="portrait"?"297mm":"210mm",padding:"2mm",gridTemplateColumns:`repeat(${
                h
              }, 1fr)`,gridTemplateRows:`repeat(${
                N
              }, 1fr)`,margin:"0 auto",boxSizing:"border-box",gap:"0"
            },children:C.map((G,xe)=>e.jsx("div",{
              className:"relative overflow-hidden border-dashed border-slate-100 print:border-none flex items-center justify-center min-w-0 min-h-0",style:{
                borderWidth:"0.5px"
              },children:e.jsx("div",{
                style:{
                  width:`${
                    T*S
                  }mm`,height:`${
                    A*S
                  }mm`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0
                },children:e.jsx("div",{
                  style:{
                    transform:`scale(${
                      S
                    })`,transformOrigin:"center",width:`${
                      T
                    }mm`,height:`${
                      A
                    }mm`,flexShrink:0
                  },children:e.jsx("div",{
                    className:"w-[148.5mm] h-[105mm] bg-white border-[8px] border-black p-1.5 box-border relative text-black shrink-0 overflow-hidden",style:{
                      fontFamily:'"Oswald", sans-serif'
                    },children:e.jsxs("div",{
                      className:"w-full h-full border-[3px] border-black p-3 flex flex-col relative",children:[e.jsx("div",{
                        className:"flex justify-center items-start w-full pt-1",children:e.jsxs("div",{
                          className:"text-center w-full flex flex-col items-center justify-center relative",children:[e.jsx("h1",{
                            className:"text-[64px] leading-[0.8] font-black uppercase select-none relative z-10",style:{
                              fontFamily:'"Anton", sans-serif',color:"#ffffff",WebkitTextStroke:"4px #000000",paintOrder:"stroke fill",letterSpacing:"-0.05em",transform:"skewX(-10deg) scale(1.15, 0.95)",textShadow:`
                                      -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000,
                                      -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000,
                                      -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000,
                                      -4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000,
                                      -5px -5px 0 #000, 5px -5px 0 #000, -5px 5px 0 #000, 5px 5px 0 #000,
                                      -6px 6px 0 #000, -7px 7px 0 #000, -8px 8px 0 #000, -9px 9px 0 #000,
                                      -10px 10px 0 #000, -11px 11px 0 #000, -12px 12px 0 #000, -13px 13px 0 #000,
                                      -14px 14px 0 #000, -15px 15px 0 #000, -16px 16px 0 #000, -17px 17px 0 #000,
                                      -18px 18px 0 #000
                                    `
                            },children:G.name||"GIÁ RẺ QUÁ"
                          }),e.jsxs("div",{
                            className:"flex items-center justify-center gap-1 -mt-3.5 relative z-20",style:{
                              transform:"skewX(-10deg) scale(1.05)"
                            },children:[e.jsx("span",{
                              className:"text-[26px] lowercase leading-none pr-1",style:{
                                fontFamily:'"Pacifico", cursive',color:"#ffffff",WebkitTextStroke:"2px #000000",paintOrder:"stroke fill",textShadow:`
                                        -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000,
                                        -2px 2px 0 #000, -3px 3px 0 #000, -4px 4px 0 #000, -5px 5px 0 #000, -6px 6px 0 #000,
                                        -7px 7px 0 #000, -8px 8px 0 #000, -9px 9px 0 #000
                                      `
                              },children:"very"
                            }),e.jsx("span",{
                              className:"text-[28px] font-black uppercase leading-none tracking-tight",style:{
                                fontFamily:'"Anton", sans-serif',color:"#ffffff",WebkitTextStroke:"2.2px #000000",paintOrder:"stroke fill",textShadow:`
                                        -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000,
                                        -2px 2px 0 #000, -3px 3px 0 #000, -4px 4px 0 #000, -5px 5px 0 #000, -6px 6px 0 #000,
                                        -7px 7px 0 #000, -8px 8px 0 #000, -9px 9px 0 #000
                                      `
                              },children:"GOOD!"
                            })]
                          })]
                        })
                      }),e.jsxs("div",{
                        className:"flex-1 flex flex-col items-center justify-center pt-2",children:[G.originalPrice?e.jsxs("div",{
                          className:"relative mb-1",children:[e.jsx("span",{
                            className:"text-[42px] font-black tracking-tighter text-slate-800",style:{
                              fontFamily:'"Oswald", sans-serif',transform:"scaleY(1.1)",display:"inline-block"
                            },children:m(G.originalPrice)
                          }),e.jsx("div",{
                            className:"absolute top-1/2 left-[-5%] right-[-5%] h-[3px] bg-black -translate-y-1/2"
                          })]
                        }):null,G.discountPrice?e.jsx("div",{
                          className:"text-[120px] leading-[0.8] font-black tracking-tighter mt-1",style:{
                            fontFamily:'"Oswald", sans-serif',transform:"scaleY(1.1)",display:"inline-block"
                          },children:m(G.discountPrice)
                        }):e.jsx("div",{
                          className:"h-[160px]"
                        })]
                      }),e.jsx("div",{
                        className:"absolute bottom-0 left-0 right-0 h-5 bg-black"
                      })]
                    })
                  })
                })
              })
            },xe))
          },R))
        })
      })
    })]
  }),document.body)
}const Gt={
  tenSieuThi:"",sanPhamBh:"",remoteBh:"",giaoTruocNgay:"",giaoTruocText:"",hoTroMuaHang:"",row2Line1:"- Trong 30 ngày đầu hư gì đổi nấy cùng model, cùng kiểu dáng, màu sắc (HÃNG SẼ THẨM ĐỊNH VÀ ĐỔI MỚI SAU KHI CÓ BIÊN BẢN XÁC NHẬN LỖI)",row2Line2:"- Qua 30 ngày nếu lỗi bảo hành theo chính sách hãng hoặc đổi mới chịu phí",row2Line3:"- sản phẩm : Không lỗi hoặc có Lỗi nếu đổi sang mẫu khác:",row2Line4:"+ THÁNG ĐẦU: TRỪ 20% .",row2Line5:"+ MỐI THÁNG TIẾP THEO THÊM 10%",row4Text:"Chưa bao gồm phí vật tư phát sinh (nếu có)",row5Text:"Đã tư vấn đúng model, nhu cầu KH, đầy đủ tính năng sản phẩm, thiết kế, khuyến mãi",row6Line1:"- Tổng đài bảo hành: 1900.23.24.65",row7Text:""
},$t={
  headerTitle:"ĐIỆN MÁY XANH PHƯỜNG 8",headerSubtitle:"(Ngã tư đèn xanh đèn đỏ đường Nguyễn Tất Thành)",invitationTitle:"THƯ MỜI, THỨ 7 TUẦN NÀY",invitationTarget:"Kính mời: Quý Khách Hàng thân yêu",eventTimeLocation:"Ngày 28/03 đến ĐMX PHƯỜNG 8",eventDescription:"tham gia sự kiện KHAI TRƯƠNG SIÊU GIẢM GIÁ ĐẾN",discountPercentage:"50%",duration:"1 NGÀY DUY NHẤT 28/03",categoriesLine1:"ĐIỆN THOẠI & LAPTOP",categoriesLine2:"TIVI - TỦ LẠNH - MÁY GIẶT- MÁY LỌC NƯỚC",categoriesLine3:"MÁY LẠNH – QUẠT ĐIỀU HÒA",specialOffer:"➔ RẺ HƠN CÁC ĐIỆN MÁY XANH KHÁC -10%",paymentTerm:"MUA TRẢ CHẬM - 0% LÃI SUẤT - TRẢ TRƯỚC 0đ",footerTitle:"ĐIỆN MÁY XANH PHƯỜNG 8 CÀ MAU",footerLine1:"CAM KẾT GIÁ RẺ NHẤT THỊ TRƯỜNG CÀ MAU",footerLine2:"BAO GIÁ HOÀN TIỀN NẾU ĐÂU RẺ HƠN",footerLine3:"NHIỀU SẢN PHẨM GIÁ SỐC BÊN DƯỚI ⬇",footerLine4:"Được giảm thêm 10%"
};
function Gl({
  item:t
}){
  const r=a=>{
    const o=/(\d{
      1,2
    }\/\d{
      1,2
    }(?:\/\d{
      2,4
    })?)/g;
    return a.split(o).map((x,u)=>o.test(x)?e.jsx("span",{
      className:"text-[24px] font-black text-black mx-1 inline-block",children:x
    },u):e.jsx("span",{
      children:x
    },u))
  },n=a=>{
    const o=a.match(/^(.*?)\s+(\d{
      1,2
    }\/\d{
      1,2
    }(?:\/\d{
      2,4
    })?)$/i);
    return o?e.jsxs("div",{
      className:"flex flex-col items-center leading-none mt-1",children:[e.jsx("span",{
        className:"text-[15px] font-black tracking-wider uppercase leading-none",children:o[1]
      }),e.jsx("span",{
        className:"text-[26px] font-black text-black tracking-tight leading-none mt-1",children:o[2]
      })]
    }):e.jsx("span",{
      className:"text-[15px] font-black tracking-wider uppercase",children:a
    })
  };
  return e.jsxs("div",{
    className:"w-[66mm] h-[142mm] bg-white flex flex-col justify-between p-3 box-border text-black select-none",style:{
      border:"1.5px solid black",fontFamily:'"Oswald", sans-serif'
    },children:[e.jsxs("div",{
      className:"text-center shrink-0",children:[e.jsx("div",{
        className:"font-black tracking-wide leading-tight uppercase",style:{
          fontSize:"22px"
        },children:t.headerTitle||"ĐIỆN MÁY XANH PHƯỜNG 8"
      }),e.jsx("div",{
        className:"font-medium tracking-tight leading-tight text-slate-800",style:{
          fontSize:"13px"
        },children:t.headerSubtitle||"(Ngã tư đèn xanh đèn đỏ đường Nguyễn Tất Thành)"
      })]
    }),e.jsx("div",{
      className:"bg-black w-full my-0.5 shrink-0",style:{
        height:"2px"
      }
    }),e.jsxs("div",{
      className:"flex-1 flex flex-col justify-between py-1 min-h-0 text-center overflow-hidden",children:[e.jsxs("div",{
        className:"flex flex-col items-center justify-center shrink-0",children:[e.jsx("div",{
          className:"font-black tracking-tight uppercase leading-none",style:{
            fontSize:"22px"
          },children:t.invitationTitle||"THƯ MỜI, THỨ 7 TUẦN NÀY"
        }),e.jsx("div",{
          className:"leading-none text-slate-700 my-0.5",style:{
            fontSize:"8px"
          },children:"⚭ ⚭ ⚭"
        }),e.jsx("div",{
          className:"font-bold text-slate-800 leading-none",style:{
            fontSize:"13px"
          },children:t.invitationTarget||"Kính mời: Quý Khách Hàng thân yêu"
        })]
      }),e.jsxs("div",{
        className:"font-bold tracking-tight uppercase leading-snug shrink-0",style:{
          fontSize:"13px"
        },children:[e.jsx("div",{
          children:r(t.eventTimeLocation||"Ngày 28/03 đến ĐMX PHƯỜNG 8")
        }),e.jsx("div",{
          className:"text-slate-800 font-medium my-0.5",style:{
            fontSize:"11px",textTransform:"none"
          },children:t.eventDescription||"tham gia sự kiện KHAI TRƯƠNG SIÊU GIẢM GIÁ ĐẾN"
        })]
      }),e.jsx("div",{
        className:"font-black text-black leading-none tracking-tighter shrink-0",style:{
          fontSize:"72px"
        },children:t.discountPercentage||"50%"
      }),e.jsx("div",{
        className:"shrink-0 leading-none",children:n(t.duration||"1 NGÀY DUY NHẤT 28/03")
      }),e.jsxs("div",{
        className:"font-bold tracking-wide uppercase leading-tight text-slate-800 shrink-0",style:{
          fontSize:"10.5px"
        },children:[e.jsx("div",{
          children:t.categoriesLine1||"ĐIỆN THOẠI & LAPTOP"
        }),e.jsx("div",{
          children:t.categoriesLine2||"TIVI - TỦ LẠNH - MÁY GIẶT- MÁY LỌC NƯỚC"
        }),e.jsx("div",{
          children:t.categoriesLine3||"MÁY LẠNH – QUẠT ĐIỀU HÒA"
        })]
      }),e.jsxs("div",{
        className:"flex flex-col items-center justify-center shrink-0",children:[e.jsx("div",{
          className:"font-black text-black leading-tight uppercase tracking-tight",style:{
            fontSize:"13px"
          },children:t.specialOffer||"➔ RẺ HƠN CÁC ĐIỆN MÁY XANH KHÁC -10%"
        }),e.jsx("div",{
          className:"font-black text-slate-800 leading-none uppercase mt-0.5",style:{
            fontSize:"10px"
          },children:t.paymentTerm||"MUA TRẢ CHẬM - 0% LÃI SUẤT - TRẢ TRƯỚC 0đ"
        })]
      })]
    }),e.jsx("div",{
      className:"bg-black w-full my-0.5 shrink-0",style:{
        height:"2px"
      }
    }),e.jsxs("div",{
      className:"text-center shrink-0",children:[e.jsx("div",{
        className:"font-black tracking-wide leading-tight uppercase",style:{
          fontSize:"13px"
        },children:t.footerTitle||"ĐIỆN MÁY XANH PHƯỜNG 8 CÀ MAU"
      }),e.jsx("div",{
        className:"font-bold tracking-tight leading-tight uppercase mt-0.5",style:{
          fontSize:"10px"
        },children:t.footerLine1||"CAM KẾT GIÁ RẺ NHẤT THỊ TRƯỜNG CÀ MAU"
      }),e.jsx("div",{
        className:"font-bold tracking-tight leading-tight uppercase",style:{
          fontSize:"10px"
        },children:t.footerLine2||"BAO GIÁ HOÀN TIỀN NẾU ĐÂU RẺ HƠN"
      }),e.jsxs("div",{
        className:"font-bold tracking-tight leading-tight uppercase flex items-center justify-center gap-0.5",style:{
          fontSize:"10px"
        },children:[e.jsx("span",{
          children:t.footerLine3||"NHIỀU SẢN PHẨM GIÁ SỐC BÊN DƯỚI"
        }),e.jsx("span",{
          children:"⬇"
        })]
      }),e.jsx("div",{
        className:"font-medium tracking-tight leading-tight text-slate-800 italic mt-0.5",style:{
          fontSize:"10px"
        },children:t.footerLine4||"Được giảm thêm 10%"
      })]
    })]
  })
}function Pt(t){
  if(!t)return"";
  const r=/(\(HÃNG SẼ THẨM ĐỊNH VÀ ĐỔI MỚI SAU KHI CÓ BIÊN BẢN XÁC NHẬN LỖI\)|Không lỗi|Lỗi|TRỪ \d+%|THÊM \d+%|1900\.23\.24\.65|Tổng đài bảo hành: 1900\.23\.24\.65)/g;
  return t.split(r).map((a,o)=>r.test(a)?e.jsx("strong",{
    className:"font-extrabold",children:a
  },o):e.jsx("span",{
    children:a
  },o))
}function $l({
  item:t,layout:r
}){
  const n=r==="right",a=n?"98mm":"105mm",o=n?"132mm":"148.5mm";
  return e.jsxs("div",{
    className:"bg-white flex flex-col p-2 box-border text-black select-none border border-slate-300 shadow-sm",style:{
      width:a,height:o,fontFamily:"Arial, sans-serif"
    },children:[e.jsx("style",{
      children:`
        .phieu-bh-preview-table td {
        
          white-space: normal !important;
        
          word-break: break-word !important;
        
        
      }
      `
    }),e.jsx("table",{
      className:"phieu-bh-preview-table",style:{
        width:"100%",height:"100%",borderCollapse:"collapse",border:"1.5px solid black",tableLayout:"fixed",whiteSpace:"normal",wordBreak:"break-word"
      },children:e.jsxs("tbody",{
        children:[e.jsxs("tr",{
          style:{
            borderBottom:"1px solid black"
          },children:[e.jsx("td",{
            style:{
              width:"10%",borderRight:"1px solid black",background:"black",color:"white",fontWeight:"bold",textAlign:"center",verticalAlign:"middle",fontSize:"20px"
            },children:"1"
          }),e.jsxs("td",{
            style:{
              padding:"4px 6px",fontSize:"15px",lineHeight:"1.25",verticalAlign:"middle",whiteSpace:"normal",wordBreak:"break-word"
            },children:[e.jsxs("div",{
              children:["Tên siêu thị:",e.jsx("span",{
                style:{
                  fontWeight:"bold",margin:"0 4px",borderBottom:"1px dotted black",paddingBottom:"2px",display:"inline-block",minWidth:"120px",textAlign:"center"
                },children:t.tenSieuThi||"                    "
              })]
            }),e.jsxs("div",{
              style:{
                marginTop:"1px"
              },children:["Sản phẩm bảo hành:",e.jsx("span",{
                style:{
                  fontWeight:(t.sanPhamBh,"bold"),textDecoration:(t.sanPhamBh,"none"),margin:"0 4px",borderBottom:"1px dotted black",paddingBottom:"2px",display:"inline-block",minWidth:"40px",textAlign:"center"
                },children:t.sanPhamBh||"     "
              })," tháng/năm"]
            }),e.jsxs("div",{
              style:{
                marginTop:"1px",paddingLeft:"48px"
              },children:["Remote:",e.jsx("span",{
                style:{
                  fontWeight:(t.remoteBh,"bold"),textDecoration:(t.remoteBh,"none"),margin:"0 4px",borderBottom:"1px dotted black",paddingBottom:"2px",display:"inline-block",minWidth:"30px",textAlign:"center"
                },children:t.remoteBh||"    "
              })," tháng"]
            })]
          })]
        }),e.jsxs("tr",{
          style:{
            borderBottom:"1px solid black"
          },children:[e.jsx("td",{
            style:{
              borderRight:"1px solid black",fontWeight:"bold",textAlign:"center",verticalAlign:"middle",fontSize:"20px"
            },children:"2"
          }),e.jsxs("td",{
            style:{
              padding:"4px 6px",fontSize:"13px",lineHeight:"1.25",verticalAlign:"middle",whiteSpace:"normal",wordBreak:"break-word"
            },children:[e.jsx("div",{
              style:{
                marginBottom:"1px"
              },children:Pt(t.row2Line1)
            }),e.jsx("div",{
              style:{
                marginBottom:"1px"
              },children:Pt(t.row2Line2)
            }),e.jsx("div",{
              style:{
                marginBottom:"1px"
              },children:Pt(t.row2Line3)
            }),e.jsx("div",{
              style:{
                paddingLeft:"12px",marginBottom:"1px"
              },children:Pt(t.row2Line4)
            }),e.jsx("div",{
              style:{
                paddingLeft:"12px"
              },children:Pt(t.row2Line5)
            })]
          })]
        }),e.jsxs("tr",{
          style:{
            borderBottom:"1px solid black"
          },children:[e.jsx("td",{
            style:{
              borderRight:"1px solid black",fontWeight:"bold",textAlign:"center",verticalAlign:"middle",fontSize:"20px"
            },children:"3"
          }),e.jsx("td",{
            style:{
              padding:"4px 6px",fontSize:"15px",lineHeight:"1.25",verticalAlign:"middle",whiteSpace:"normal",wordBreak:"break-word"
            },children:e.jsxs("div",{
              children:["Giao trước ",e.jsx("span",{
                style:{
                  fontWeight:(t.giaoTruocNgay,"bold"),margin:"0 4px",borderBottom:"1px dotted black",paddingBottom:"2px",display:"inline-block",minWidth:"30px",textAlign:"center"
                },children:t.giaoTruocNgay||"    "
              })," ngày ",e.jsx("span",{
                style:{
                  fontWeight:(t.giaoTruocText,"bold"),margin:"0 4px",borderBottom:"1px dotted black",paddingBottom:"2px",display:"inline-block",minWidth:"120px",textAlign:"center"
                },children:t.giaoTruocText||"                    "
              })]
            })
          })]
        }),e.jsxs("tr",{
          style:{
            borderBottom:"1px solid black"
          },children:[e.jsx("td",{
            style:{
              borderRight:"1px solid black",fontWeight:"bold",textAlign:"center",verticalAlign:"middle",fontSize:"20px"
            },children:"4"
          }),e.jsx("td",{
            style:{
              padding:"4px 6px",fontSize:"15px",lineHeight:"1.25",verticalAlign:"middle",whiteSpace:"normal",wordBreak:"break-word"
            },children:e.jsx("div",{
              children:t.row4Text
            })
          })]
        }),e.jsxs("tr",{
          style:{
            borderBottom:"1px solid black"
          },children:[e.jsx("td",{
            style:{
              borderRight:"1px solid black",fontWeight:"bold",textAlign:"center",verticalAlign:"middle",fontSize:"20px"
            },children:"5"
          }),e.jsx("td",{
            style:{
              padding:"4px 6px",fontSize:"13px",lineHeight:"1.25",verticalAlign:"middle",whiteSpace:"normal",wordBreak:"break-word"
            },children:e.jsx("div",{
              children:t.row5Text
            })
          })]
        }),e.jsxs("tr",{
          style:{
            borderBottom:"1px solid black"
          },children:[e.jsx("td",{
            style:{
              borderRight:"1px solid black",fontWeight:"bold",textAlign:"center",verticalAlign:"middle",fontSize:"20px"
            },children:"6"
          }),e.jsxs("td",{
            style:{
              padding:"4px 6px",fontSize:"15px",lineHeight:"1.25",verticalAlign:"middle",whiteSpace:"normal",wordBreak:"break-word"
            },children:[e.jsx("div",{
              style:{
                marginBottom:"1px"
              },children:Pt(t.row6Line1)
            }),e.jsxs("div",{
              children:["- Hỗ trợ và mua hàng: ",e.jsx("span",{
                style:{
                  fontWeight:(t.hoTroMuaHang,"bold"),margin:"0 4px",borderBottom:"1px dotted black",paddingBottom:"2px",display:"inline-block",minWidth:"120px",textAlign:"center"
                },children:t.hoTroMuaHang||"                    "
              })]
            })]
          })]
        }),e.jsxs("tr",{
          children:[e.jsx("td",{
            style:{
              borderRight:"1px solid black",fontWeight:"bold",textAlign:"center",verticalAlign:"middle",fontSize:"20px"
            },children:"7"
          }),e.jsx("td",{
            style:{
              padding:"4px 6px",fontSize:"15px",lineHeight:"1.25",verticalAlign:"middle",whiteSpace:"normal",wordBreak:"break-word"
            },children:e.jsx("div",{
              children:t.row7Text
            })
          })]
        })]
      })
    })]
  })
}function Fl({
  item:t
}){
  const r=t.originalPrice>0?Math.round((t.originalPrice-t.discountPrice)/t.originalPrice*100):0,n=h=>{
    const N=parseFloat(h);
    return isNaN(N)?"0":N.toLocaleString("vi-VN").replace(/,/g,".")
  },o=n(t.discountPrice).split("."),i=o.slice(0,-1).join("."),x=o[o.length-1],u=i.length,m=u<=5?240:u<=6?190:u<=7?150:120,d=t.nganhHang||(t.name?t.name.split(" ").slice(0,3).join(" "):"SẢN PHẨM KHUYẾN MÃI");
  return e.jsxs("div",{
    className:"w-[210mm] h-[297mm] bg-white p-[5mm] box-border shrink-0 overflow-hidden flex flex-col items-center text-black",style:{
      fontFamily:'"Montserrat", sans-serif'
    },children:[e.jsx("style",{
      children:"@import url('https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@400;
      500;
      700;
      800;
      900&family=Oswald:wght@400;
      500;
      700;
      900&display=swap');
      "
    }),e.jsxs("div",{
      className:"w-full h-full bg-white border-[4px] border-black flex flex-col justify-between text-black pt-8 pb-8",children:[e.jsx("div",{
        className:"h-[10%] bg-black text-white w-full flex items-center justify-center shrink-0 border-b-[4px] border-black",children:e.jsx("span",{
          className:"text-[52px] font-black uppercase tracking-[0.1em] leading-none",style:{
            fontFamily:'"Oswald", sans-serif'
          },children:d
        })
      }),e.jsx("div",{
        className:"h-[14%] flex items-center justify-center shrink-0",children:e.jsx("span",{
          className:"text-[140px] font-black uppercase leading-none tracking-tighter",style:{
            fontFamily:'"Anton", sans-serif'
          },children:"GIÁ SỐC"
        })
      }),e.jsx("div",{
        className:"h-[24%] flex items-center justify-center shrink-0",children:r>0&&e.jsxs("span",{
          className:"text-[250px] font-black leading-none text-black tracking-tighter",style:{
            fontFamily:'"Anton", sans-serif'
          },children:["-",r,"%"]
        })
      }),e.jsx("div",{
        className:"h-[13%] w-full px-8 py-1 shrink-0",children:e.jsx("div",{
          className:"w-full h-full border-[4px] border-black flex items-center justify-center px-6 text-[32px] font-black text-center",style:{
            fontFamily:'"Oswald", sans-serif'
          },children:e.jsx("span",{
            className:"line-clamp-2 leading-[1.2]",children:t.name||"TÊN SẢN PHẨM"
          })
        })
      }),e.jsx("div",{
        className:"h-[10%] flex items-center justify-center shrink-0",children:e.jsxs("div",{
          className:"relative inline-block text-[80px] font-bold text-black",style:{
            fontFamily:'"Oswald", sans-serif',fontWeight:900
          },children:[n(t.originalPrice),e.jsx("div",{
            className:"absolute top-[52%] left-[-8%] right-[-8%] h-[8px] bg-black -translate-y-1/2"
          })]
        })
      }),e.jsx("div",{
        className:"h-[29%] flex items-center justify-center w-full pb-4 shrink-0",children:e.jsxs("div",{
          className:"flex items-end justify-center gap-2",children:[e.jsxs("div",{
            className:"border-[4px] border-dashed border-blue-600 px-8 py-3 flex flex-col items-center justify-center shrink-0",children:[e.jsx("span",{
              className:"leading-none tracking-tighter font-black text-black",style:{
                fontFamily:'"Oswald", sans-serif',fontWeight:900,fontSize:`${
                  m
                }px`
              },children:i
            }),e.jsxs("span",{
              className:"text-[18px] font-black mt-2 text-black whitespace-nowrap",style:{
                fontFamily:'"Montserrat", sans-serif',fontWeight:800
              },children:["Khuyến mãi áp dụng đến hết ngày ",t.endDate||"3/5/2026"]
            })]
          }),e.jsxs("span",{
            className:"text-[64px] font-black mb-8 shrink-0 leading-none",style:{
              fontFamily:'"Oswald", sans-serif',fontWeight:900
            },children:[".",x,"Đ"]
          })]
        })
      })]
    })]
  })
}function Zl(){
  const{
    userProfile:t
  }=Kt(),r=(t==null?void 0:t.ma_kho)||"",{
    currentStoreId:n
  }=$s(),{
    showNotification:a
  }=Ea(),[o,i]=v.useState($t),[x,u]=v.useState(Gt),[m,d]=v.useState("2"),[h,N]=v.useState("all-sticker"),[y,w]=v.useState(null),[S,T]=v.useState("data"),[A,L]=v.useState([]),[C,R]=v.useState([]),[G,xe]=v.useState({
    
  }),[B,V]=v.useState([]),[U,he]=v.useState(!1),[E,X]=v.useState({
    productCode:"",name:"",originalPrice:"",discountPrice:"",endDate:"3/5/2026"
  }),Z=v.useRef(null),Me=v.useRef(null),Ge=v.useRef(null),Ke=v.useRef(null),Le=v.useMemo(()=>C.length>0&&A[C[0]]?A[C[0]]:A.length>0?A[0]:{
    name:"Quạt điều hoà Daikiosan DMI03",originalPrice:549e4,discountPrice:349e4,endDate:"3/5/2026",nganhHang:"QUẠT ĐIỀU HOÀ"
  },[C,A]),[we,Ye]=v.useState(null),[ke,je]=v.useState([]),[De,oe]=v.useState([]),[tt,Ve]=v.useState(!1),[D,f]=v.useState({
    type:"",text:""
  }),[g,b]=v.useState(null),[k,P]=v.useState(null),[M,O]=v.useState(!1),[F,Y]=v.useState(""),[$,j]=v.useState([]),I=v.useRef(null),[W,Q]=v.useState("local"),[q,se]=v.useState([]),[Se,Fs]=v.useState(""),[Ut,cs]=v.useState(!1),[Yt,Ws]=v.useState(!1),[Ks,Ht]=v.useState(null),Qe=v.useRef(null),ds=v.useRef(()=>{
    
  }),[xs,hs]=v.useState(""),[Zn,us]=v.useState(!1),[Lt,ea]=v.useState({
    min:1,max:1
  }),[Vt,Us]=v.useState(1),[ta,qe]=v.useState(!1),[Ys,Vs]=v.useState(!1),[Qs,ms]=v.useState(!1),[sa,ps]=v.useState(!1),[na,qs]=v.useState(!1),[aa,Xs]=v.useState(!1),[ra,la]=v.useState("BIÊN BẢN GHI NHẬN TÌNH TRẠNG HÀNG HÓA"),[ia,ht]=v.useState({
    style:"classic",layout:"4",showPromoLabel:!0
  }),[ye,ct]=v.useState([]),[Xe,Qt]=v.useState({
    
  }),[Nt,vt]=v.useState(""),[ee,_e]=v.useState({
    maSieuThi:"",nganhHang:"",nhomHang:[],onlyInventory:!1,selectedQrs:null,sortOrder:""
  }),[Ce,Be]=v.useState({
    productCode:"",name:"",originalPrice:"",discountPrice:""
  }),[Wl,Kl]=v.useState(!1),[Ul,Yl]=v.useState(!0),qt=()=>{
    const s=localStorage.getItem(ne.STICKER_CE_INVENTORY_DATA);
    if(s)try{
      const c=JSON.parse(s);
      je(c.data||[]),b(c.timestamp?new Date(c.timestamp).toLocaleString("vi-VN"):null)
    }catch{
      je([]),b(null)
    }else je([]),b(null);
    const l=localStorage.getItem(ne.STICKER_CE_PRICE_DATA);
    if(l)try{
      const c=JSON.parse(l);
      oe(c.data||[]),P(c.timestamp?new Date(c.timestamp).toLocaleString("vi-VN"):null)
    }catch{
      oe([]),P(null)
    }else oe([]),P(null)
  },Xt=()=>{
    const s=localStorage.getItem(ne.STICKER_LK_INVENTORY_DATA);
    if(s)try{
      const c=JSON.parse(s);
      je(c.data||[]),b(c.timestamp?new Date(c.timestamp).toLocaleString("vi-VN"):null)
    }catch{
      je([]),b(null)
    }else je([]),b(null);
    const l=localStorage.getItem(ne.STICKER_LK_PRICE_DATA);
    if(l)try{
      const c=JSON.parse(l);
      oe(c.data||[]),P(c.timestamp?new Date(c.timestamp).toLocaleString("vi-VN"):null)
    }catch{
      oe([]),P(null)
    }else oe([]),P(null)
  },Dt=()=>{
    const s=localStorage.getItem(ne.STICKER_ADDRESS_DATA);
    if(s)try{
      const l=JSON.parse(s);
      i(l||$t)
    }catch{
      i($t)
    }else i($t)
  },oa=async()=>{
    Ve(!0);
    try{
      localStorage.setItem(ne.STICKER_ADDRESS_DATA,JSON.stringify(o));
      const s=n!=="ALL"?n:"";
      if(s){
        const l=r.replace(/^0+/,""),c={
          id:xt(s),warehouse_code:l,ten_sieu_thi:s,in_dia_chi_data:JSON.stringify(o)
        },{
          error:p
        }=await He.from("store").upsert(c,{
          onConflict:"id"
        });
        p?(console.error("Lỗi khi lưu cấu hình In Địa Chỉ vào DB:",p),a("Lỗi khi lưu cấu hình In Địa Chỉ vào DB!","error")):a("Đã lưu cấu hình In Địa Chỉ thành công!","success")
      }else a("Đã lưu cấu hình In Địa Chỉ vào LocalStorage (Chưa chọn siêu thị)!","success")
    }catch(s){
      console.error("Lỗi hệ thống khi lưu cấu hình:",s),a("Lỗi hệ thống khi lưu cấu hình!","error")
    }finally{
      Ve(!1)
    }
  },ca=()=>{
    qe(!0)
  },Jt=()=>{
    const s=localStorage.getItem(ne.STICKER_PHIEU_BH_DATA);
    if(s)try{
      const l=JSON.parse(s);
      u(l||Gt)
    }catch{
      u(Gt)
    }else u(Gt)
  },da=async()=>{
    Ve(!0);
    try{
      localStorage.setItem(ne.STICKER_PHIEU_BH_DATA,JSON.stringify(x));
      const s=n!=="ALL"?n:"";
      if(s){
        const l=r.replace(/^0+/,""),c={
          id:xt(s),warehouse_code:l,ten_sieu_thi:s,in_phieu_bh_data:JSON.stringify(x)
        },{
          error:p
        }=await He.from("store").upsert(c,{
          onConflict:"id"
        });
        p?(console.error("Lỗi khi lưu cấu hình In Phiếu BH vào DB:",p),a("Đã lưu cấu hình In Phiếu BH vào LocalStorage!","success")):a("Đã lưu cấu hình In Phiếu BH thành công!","success")
      }else a("Đã lưu cấu hình In Phiếu BH vào LocalStorage (Chưa chọn siêu thị)!","success")
    }catch(s){
      console.error("Lỗi hệ thống khi lưu cấu hình:",s),a("Lỗi hệ thống khi lưu cấu hình!","error")
    }finally{
      Ve(!1)
    }
  };
  v.useEffect(()=>{
    if(h==="in-phieu-bh"){
      const s=n!=="ALL"?n:"";
      s?(async()=>{
        try{
          const{
            data:c,error:p
          }=await He.from("store").select("in_phieu_bh_data").eq("id",xt(s)).maybeSingle();
          if(p){
            console.error("Lỗi khi tải dữ liệu in-phieu-bh từ DB:",p),Jt();
            return
          }if(c&&c.in_phieu_bh_data)try{
            const _=typeof c.in_phieu_bh_data=="string"?JSON.parse(c.in_phieu_bh_data):c.in_phieu_bh_data;
            u(_||Gt),localStorage.setItem(ne.STICKER_PHIEU_BH_DATA,JSON.stringify(_))
          }catch(_){
            console.error("Error parsing DB phieu_bh data:",_)
          }else Jt()
        }catch(c){
          console.error("Lỗi tải DB:",c),Jt()
        }
      })():Jt();
      return
    }if(h==="in-sticker"){
      const s=localStorage.getItem("sticker_in_sticker_data");
      if(s)try{
        L(JSON.parse(s)||[])
      }catch{
        L([])
      }else L([]);
      const l=localStorage.getItem("sticker_in_sticker_history");
      if(l)try{
        V(JSON.parse(l)||[])
      }catch{
        V([])
      }else V([]);
      return
    }if(h==="all-sticker"||h==="sticker-event"||h==="sticker"||h==="sticker-ce"||h==="sticker-lk"||h==="sticker-mln"||h==="in-dia-chi")if(w(null),Ye(null),st.current&&(st.current.value=""),nt.current&&(nt.current.value=""),h==="sticker-ce"||h==="sticker-lk"||h==="in-dia-chi"){
      const s=h==="sticker-ce",l=h==="sticker-lk",c=h==="in-dia-chi",p=n!=="ALL"?n:"";
      p?(async()=>{
        try{
          let z="";
          s?z="sticker_ce_price_data, sticker_ce_inventory_data":l?z="sticker_lk_price_data, sticker_lk_inventory_data":c&&(z="in_dia_chi_data");
          const{
            data:J,error:Ne
          }=await He.from("store").select(z).eq("id",xt(p)).maybeSingle();
          if(Ne){
            console.error(`Lỗi khi tải dữ liệu ${
              h
            } từ DB:`,Ne),s?qt():l?Xt():c&&Dt();
            return
          }if(J)if(c){
            const ie=J.in_dia_chi_data,Ee=ne.STICKER_ADDRESS_DATA;
            if(ie)try{
              const ge=typeof ie=="string"?JSON.parse(ie):ie;
              i(ge||$t),localStorage.setItem(Ee,JSON.stringify(ge))
            }catch(ge){
              console.error("Error parsing DB address data:",ge)
            }else Dt()
          }else{
            const ie=s?J.sticker_ce_price_data:J.sticker_lk_price_data,Ee=s?J.sticker_ce_inventory_data:J.sticker_lk_inventory_data,ge=s?ne.STICKER_CE_PRICE_DATA:ne.STICKER_LK_PRICE_DATA,le=s?ne.STICKER_CE_INVENTORY_DATA:ne.STICKER_LK_INVENTORY_DATA;
            if(ie)try{
              const me=typeof ie=="string"?JSON.parse(ie):ie;
              me&&me.data&&(oe(me.data),P(me.timestamp?new Date(me.timestamp).toLocaleString("vi-VN"):null),localStorage.setItem(ge,JSON.stringify(me)))
            }catch(me){
              console.error("Error parsing DB price data:",me)
            }else oe([]),P(null),localStorage.removeItem(ge);
            if(Ee)try{
              const me=typeof Ee=="string"?JSON.parse(Ee):Ee;
              me&&me.data&&(je(me.data),b(me.timestamp?new Date(me.timestamp).toLocaleString("vi-VN"):null),localStorage.setItem(le,JSON.stringify(me)))
            }catch(me){
              console.error("Error parsing DB inventory data:",me)
            }else je([]),b(null),localStorage.removeItem(le)
          }else s?qt():l?Xt():c&&Dt()
        }catch(z){
          console.error("Lỗi tải DB:",z),s?qt():l?Xt():c&&Dt()
        }
      })():s?qt():l?Xt():c&&Dt()
    }else{
      const s=ne.STICKER_INVENTORY_DATA,l=ne.STICKER_PRICE_DATA,c=localStorage.getItem(s);
      if(c)try{
        const _=JSON.parse(c);
        je(_.data||[]),b(_.timestamp?new Date(_.timestamp).toLocaleString("vi-VN"):null)
      }catch{
        je([]),b(null)
      }else je([]),b(null);
      const p=localStorage.getItem(l);
      if(p)try{
        const _=JSON.parse(p);
        oe(_.data||[]),P(_.timestamp?new Date(_.timestamp).toLocaleString("vi-VN"):null)
      }catch{
        oe([]),P(null)
      }else oe([]),P(null)
    }
  },[h,n]);
  const xa=async s=>{
    const l=n!=="ALL"?n:"";
    if(!l)return;
    const c=r.replace(/^0+/,""),p=h==="sticker-ce";
    if(!(!p&&!(h==="sticker-lk")))try{
      const z={
        id:xt(l),warehouse_code:c,ten_sieu_thi:l
      };
      p?z.sticker_ce_price_data=JSON.stringify({
        data:s,timestamp:new Date().toISOString()
      }):z.sticker_lk_price_data=JSON.stringify({
        data:s,timestamp:new Date().toISOString()
      });
      const{
        error:J
      }=await He.from("store").upsert(z,{
        onConflict:"id"
      });
      J?(console.error("Lỗi khi lưu bảng giá vào DB:",J),a("Lỗi khi lưu bảng giá vào DB!","error")):a("Đã lưu bảng giá vào DB!","success")
    }catch(z){
      console.error("Lỗi hệ thống khi lưu bảng giá:",z)
    }
  },ha=s=>{
    I.current&&clearTimeout(I.current),I.current=setTimeout(()=>{
      xa(s)
    },1500)
  },ua=async()=>{
    const s=n!=="ALL"?n:"";
    if(!s){
      a("Vui lòng chọn siêu thị trên header trước khi quét!","error");
      return
    }const l="CE-SCAN-"+Math.random().toString(36).substring(2,11).toUpperCase();
    Y(l),j([]),O(!0);
    try{
      await He.from("scanner_sessions").upsert({
        id:l,store_id:s,scanned_codes:JSON.stringify([])
      },{
        onConflict:"id"
      })
    }catch(c){
      console.error("Lỗi khi tạo phiên quét trên DB:",c)
    }
  },Js=()=>{
    O(!1),Y(""),j([])
  },ma=async()=>{
    const s=n!=="ALL"?n:"";
    if(!s)return;
    const l=r.replace(/^0+/,""),c=h==="sticker-ce",p=h==="sticker-lk";
    let _=ne.STICKER_INVENTORY_DATA;
    c?_=ne.STICKER_CE_INVENTORY_DATA:p&&(_=ne.STICKER_LK_INVENTORY_DATA);
    try{
      if(c||p){
        const z={
          id:xt(s),warehouse_code:l,ten_sieu_thi:s
        };
        c?z.sticker_ce_inventory_data=JSON.stringify({
          data:$,timestamp:new Date().toISOString()
        }):z.sticker_lk_inventory_data=JSON.stringify({
          data:$,timestamp:new Date().toISOString()
        });
        const{
          error:J
        }=await He.from("store").upsert(z,{
          onConflict:"id"
        });
        if(J){
          console.error("Lỗi lưu tồn kho:",J),a("Lỗi khi lưu tồn kho vào database!","error");
          return
        }
      }je($),b(new Date().toLocaleString("vi-VN")),localStorage.setItem(_,JSON.stringify({
        data:$,timestamp:new Date().toISOString()
      })),F&&await He.from("scanner_sessions").delete().eq("id",F),O(!1),Y(""),j([]),a(`Đã lưu thành công ${
        $.length
      } mã tồn kho!`,"success")
    }catch(z){
      console.error("Error completing scanner session:",z),a("Lỗi hệ thống khi hoàn tất quét!","error")
    }
  };
  v.useEffect(()=>{
    if(!M||!F)return;
    const s=He.channel(`public:scanner_sessions:${
      F
    }`).on("postgres_changes",{
      event:"UPDATE",schema:"public",table:"scanner_sessions",filter:`id=eq.${
        F
      }`
    },l=>{
      if(l.new&&l.new.scanned_codes)try{
        const c=JSON.parse(l.new.scanned_codes);
        Array.isArray(c)&&j(c)
      }catch(c){
        console.error("Lỗi khi parse mã quét từ DB:",c)
      }
    }).subscribe();
    return()=>{
      He.removeChannel(s)
    }
  },[M,F]),v.useEffect(()=>{
    if(typeof navigator<"u"){
      const s=/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      Q(s?"local":"qr")
    }
  },[]),v.useEffect(()=>{
    if((h==="sticker-ce"||h==="sticker-lk"||h==="sticker-event")&&!Yt)if(window.Html5Qrcode)Ws(!0);
    else{
      const s=document.createElement("script");
      s.src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js",s.async=!0,s.onload=()=>{
        Ws(!0)
      },s.onerror=()=>{
        Ht("Không thể tải thư viện quét từ CDN.")
      },document.body.appendChild(s)
    }
  },[h,Yt]);
  const Zs=v.useRef(0);
  v.useEffect(()=>{
    M&&$.length>Zs.current&&ds.current(),Zs.current=$.length
  },[$.length,M]),v.useEffect(()=>{
    const s=()=>{
      try{
        const l=new(window.AudioContext||window.webkitAudioContext),c=l.createOscillator(),p=l.createGain();
        c.connect(p),p.connect(l.destination),c.type="sine",c.frequency.value=1e3,p.gain.setValueAtTime(0,l.currentTime),p.gain.linearRampToValueAtTime(.3,l.currentTime+.05),p.gain.linearRampToValueAtTime(0,l.currentTime+.15),c.start(),c.stop(l.currentTime+.15)
      }catch(l){
        console.warn("Audio beep failed:",l)
      }
    };
    ds.current=s
  },[]);
  const gs=async s=>{
    if(!(!Qe.current||!s)){
      cs(!0),Ht(null);
      try{
        Qe.current.isScanning&&await Qe.current.stop(),await Qe.current.start(s,{
          fps:15,qrbox:(l,c)=>{
            const p=Math.min(l,c)*.7;
            return{
              width:p,height:p
            }
          },aspectRatio:1
        },l=>{
          const c=l.trim();
          c&&(ds.current(),navigator.vibrate&&navigator.vibrate(100),j(p=>{
            if(p.includes(c))return p;
            const _=[c,...p];
            return F&&He.from("scanner_sessions").upsert({
              id:F,store_id:n,scanned_codes:JSON.stringify(_)
            },{
              onConflict:"id"
            }),_
          }))
        },()=>{
          
        }),setTimeout(async()=>{
          try{
            Qe.current&&Qe.current.isScanning&&await Qe.current.applyVideoConstraints({
              focusMode:"continuous"
            })
          }catch(l){
            console.warn("html5-qrcode applyVideoConstraints focusMode continuous error:",l)
          }try{
            const l=document.querySelector("#modal-reader video");
            if(l&&l.srcObject){
              const p=l.srcObject.getVideoTracks()[0];
              if(p){
                const _=typeof p.getCapabilities=="function"?p.getCapabilities():{
                  
                },z=[];
                _.focusMode&&_.focusMode.includes("continuous")&&z.push({
                  focusMode:"continuous"
                }),_.focusDistance&&z.push({
                  focusDistance:_.focusDistance.min||0
                }),z.length>0&&(await p.applyConstraints({
                  advanced:z
                }),console.log("Successfully applied macro autofocus constraints:",z)),_.zoom?(us(!0),ea({
                  min:_.zoom.min||1,max:_.zoom.max||1
                }),Us(1)):us(!1)
              }
            }
          }catch(l){
            console.warn("Failed to apply track-level macro autofocus constraints:",l)
          }
        },1200)
      }catch(l){
        console.error("Failed to start local camera scan:",l),Ht("Không thể mở camera này. Hãy thử chọn camera khác hoặc cấp quyền."),cs(!1)
      }
    }
  },fs=async()=>{
    if(Qe.current&&Qe.current.isScanning){
      try{
        await Qe.current.stop()
      }catch(s){
        console.error("Error stopping local scanner:",s)
      }cs(!1)
    }us(!1)
  },bs=async s=>{
    try{
      Us(s);
      const l=document.querySelector("#modal-reader video");
      if(l&&l.srcObject){
        const p=l.srcObject.getVideoTracks()[0];
        p&&await p.applyConstraints({
          advanced:[{
            zoom:s
          }]
        })
      }
    }catch(l){
      console.error("Error adjusting camera zoom:",l)
    }
  };
  v.useEffect(()=>{
    if(!M||W!=="local"||!Yt){
      fs();
      return
    }return(async()=>{
      try{
        if(await new Promise(_=>setTimeout(_,300)),!document.getElementById("modal-reader"))return;
        const c=new window.Html5Qrcode("modal-reader");
        Qe.current=c;
        const p=await window.Html5Qrcode.getCameras();
        if(p&&p.length>0){
          se(p);
          const _=p.find(J=>J.label.toLowerCase().includes("back")||J.label.toLowerCase().includes("rear")||J.label.toLowerCase().includes("environment")||J.label.toLowerCase().includes("sau")),z=_?_.id:p[0].id;
          Fs(z),gs(z)
        }else Ht("Không tìm thấy camera trên thiết bị.")
      }catch(l){
        console.error("Error initializing local scanner:",l),Ht("Lỗi khởi tạo máy quét camera.")
      }
    })(),()=>{
      fs()
    }
  },[M,W,Yt]),Ze.useEffect(()=>{
    if(De.length>0){
      const s=h==="sticker-ce",l=h==="sticker-lk";
      let c=ne.STICKER_PRICE_DATA;
      s?c=ne.STICKER_CE_PRICE_DATA:l&&(c=ne.STICKER_LK_PRICE_DATA),localStorage.setItem(c,JSON.stringify({
        data:De,timestamp:new Date().toISOString()
      })),(s||l)&&ha(De)
    }
  },[De,h]);
  const Pe=Ze.useMemo(()=>{
    const s=new Map,l=new Set,c=new Map;
    if(ke&&ke.length>0){
      if(typeof ke[0]=="string")ke.forEach(p=>{
        if(p){
          const _=String(p).trim(),z=_.split("-")[0].trim();
          l.add(z),c.set(z,_)
        }
      });
      else if(ke[0]&&typeof ke[0]=="object"&&!Array.isArray(ke[0]))ke.forEach(p=>{
        const _=p.ma_san_pham||p.productCode||p.id||p.maSanPham;
        if(_){
          const z=String(_).trim(),J=z.split("-")[0].trim();
          l.add(J),c.set(J,z),s.set(J,{
            nganhHang:p.nganh_hang||p.nganhHang||"",nhomHang:p.nhom_hang||p.nhomHang||""
          })
        }
      });
      else if(Array.isArray(ke[0])){
        let p=-1;
        for(let _=0;
        _<Math.min(20,ke.length);
        _++){
          const z=ke[_];
          if(!z||!Array.isArray(z))continue;
          const J=z.join(" ").toLowerCase();
          if(J.includes("mã sản phẩm")||J.includes("tên sản phẩm")||J.includes("mã hàng")){
            p=_;
            break
          }
        }if(p!==-1){
          const _=ke[p].map(ie=>String(ie||"").toLowerCase().trim()),z=_.findIndex(ie=>ie==="mã sản phẩm"||ie==="mã sp"||ie==="mã hàng"),J=_.findIndex(ie=>ie==="ngành hàng"),Ne=_.findIndex(ie=>ie==="nhóm hàng");
          if(z!==-1)for(let ie=p+1;
          ie<ke.length;
          ie++){
            const Ee=ke[ie];
            if(!Ee||!Array.isArray(Ee))continue;
            const ge=String(Ee[z]||"").trim();
            if(ge){
              const le=ge.split("-")[0].trim();
              l.add(le),c.set(le,ge),s.set(le,{
                nganhHang:J!==-1?String(Ee[J]||"").trim():"",nhomHang:Ne!==-1?String(Ee[Ne]||"").trim():""
              })
            }
          }
        }
      }
    }return De.map(p=>{
      const _=p.maSanPham||p.productCode||(p.name||"").split(" - ")[0].trim(),z=s.get(_),J=l.has(_),Ne=c.get(_)||"";
      return{
        ...p,inStock:J,qrData:Ne,nganhHang:(z==null?void 0:z.nganhHang)||p.nganhHang||"",nhomHang:(z==null?void 0:z.nhomHang)||p.nhomHang||""
      }
    })
  },[De,ke]),ue=Ze.useMemo(()=>{
    let s=Pe.filter(l=>{
      const c=!ee.nganhHang||l.nganhHang===ee.nganhHang,p=ee.nhomHang.length===0||ee.nhomHang.includes(l.nhomHang),_=!ee.onlyInventory||l.inStock,z=!ee.selectedQrs||(l.qrData?ee.selectedQrs.includes(l.qrData):ee.selectedQrs.includes("(Trống)"));
      return c&&p&&_&&z
    });
    return ee.sortOrder==="asc"?s=[...s].sort((l,c)=>Number(l.discountPrice)-Number(c.discountPrice)):ee.sortOrder==="desc"&&(s=[...s].sort((l,c)=>Number(c.discountPrice)-Number(l.discountPrice))),s
  },[Pe,ee]),Et=Ze.useMemo(()=>{
    const s=new Set;
    let l=!1;
    Pe.forEach(p=>{
      p.qrData?s.add(p.qrData):l=!0
    });
    const c=Array.from(s).sort();
    return l&&c.push("(Trống)"),c
  },[Pe]),ys=Ze.useMemo(()=>{
    const s=new Set;
    return Pe.forEach(l=>{
      l.nganhHang&&s.add(l.nganhHang)
    }),Array.from(s).sort()
  },[Pe]),pa=Ze.useMemo(()=>{
    const s=new Set;
    return Pe.forEach(l=>{
      l.nhomHang&&(!ee.nganhHang||l.nganhHang===ee.nganhHang)&&s.add(l.nhomHang)
    }),Array.from(s).sort()
  },[Pe,ee.nganhHang]);
  Ze.useEffect(()=>{
    const s={
      
    };
    ue.forEach((l,c)=>{
      s[c]=1
    }),Qt(s),ct(ue.map((l,c)=>c))
  },[ue]);
  const Ns=s=>{
    if(s.target.checked){
      const l=ue.map((p,_)=>_);
      ct(l);
      const c={
        ...Xe
      };
      l.forEach(p=>{
        (!c[p]||c[p]===0)&&(c[p]=1)
      }),Qt(c)
    }else ct([])
  },vs=s=>{
    ct(l=>l.includes(s)?l.filter(c=>c!==s):((!Xe[s]||Xe[s]===0)&&Qt(c=>({
      ...c,[s]:1
    })),[...l,s]))
  },js=(s,l)=>{
    const c=Math.max(0,l);
    Qt(p=>({
      ...p,[s]:c
    })),c>0?ye.includes(s)||ct(p=>[...p,s]):ct(p=>p.filter(_=>_!==s))
  };
  Ze.useMemo(()=>ye.reduce((s,l)=>s+(Xe[l]||0),0),[ye,Xe]);
  const st=v.useRef(null),nt=v.useRef(null),dt=(s,l,c=!1)=>{
    var z;
    const p=s instanceof File?s:(z=s.target.files)==null?void 0:z[0];
    if(!p)return;
    l==="inventory"?w(p):c||Ye(p);
    const _=new FileReader;
    _.onload=J=>{
      var me;
      const Ne=(me=J.target)==null?void 0:me.result,ie=as(Ne,{
        type:"array"
      }),Ee=ie.SheetNames[0],ge=ie.Sheets[Ee],le=Ie.sheet_to_json(ge,{
        header:1,range:0,defval:""
      });
      if(!le||le.length===0){
        a("File Excel không có dữ liệu!","error");
        return
      }if(l==="inventory"){
        const $e=h==="sticker-ce",fe=h==="sticker-lk";
        let te=ne.STICKER_INVENTORY_DATA;
        $e?te=ne.STICKER_CE_INVENTORY_DATA:fe&&(te=ne.STICKER_LK_INVENTORY_DATA),je(le);
        const pe=new Date().toISOString();
        b(new Date(pe).toLocaleString("vi-VN")),localStorage.setItem(te,JSON.stringify({
          data:le,timestamp:pe
        })),a("Đã tải và lưu tạm file Tồn kho!","success");
        try{
          const ve=p.name.substring(0,p.name.lastIndexOf("."))||"Du_Lieu",Fe=le.map(H=>[H&&H.length>6?H[6]:""]),at=Ie.aoa_to_sheet(Fe),Te=Ie.book_new();
          Ie.book_append_sheet(Te,at,"Sheet1"),Bt(Te,`${
            ve
          }_Cot_G.xlsx`),a("Đã tự động xuất file Excel cột G!","success")
        }catch(ve){
          console.error("Error auto-exporting column G:",ve)
        }
      }else{
        const $e=[];
        if(h==="sticker-ce"||h==="sticker-lk"){
          const Te=H=>H==null||H===""?0:typeof H=="number"?H:parseInt(String(H).replace(/[^\d]/g,""),10)||0;
          for(let H=0;
          H<le.length;
          H++){
            const K=le[H];
            if(!K||!Array.isArray(K))continue;
            const ce=h==="sticker-lk",Je=ce?K[21]:K[16],ut=ce?K[20]:K[17];
            let Re="",ze="";
            if(ce){
              const be=String(K[27]||"").trim(),Ae=be.indexOf("-");
              Ae!==-1?(ze=be.substring(0,Ae).trim(),Re=be.substring(Ae+1).trim()):(ze=be,Re=be)
            }else Re=String(K[27]||"").trim(),ze=String(K[28]||"").trim().split("-")[0].trim();
            const re=be=>{
              const Ae=be.split("-")[0].trim().replace(/[^\d]/g,"");
              return Ae.length>=6&&/^\d+$/.test(Ae)
            };
            if(!ze||!re(ze)){
              let be="";
              for(let Ae=0;
              Ae<K.length;
              Ae++){
                const kt=String(K[Ae]||"").trim();
                if(re(kt)){
                  be=kt.split("-")[0].trim();
                  break
                }
              }if(be)ze=be;
              else if(!ze&&K.length>0)for(let Ae=0;
              Ae<Math.min(K.length,5);
              Ae++){
                const rt=String(K[Ae]||"").trim().split("-")[0].trim();
                if(rt&&rt.length>=3){
                  ze=rt;
                  break
                }
              }
            }H===0&&(Re.toLowerCase().includes("tên")||Re.toLowerCase().includes("sản phẩm")||Re.toLowerCase()==="tên hàng")||Re&&$e.push({
              maSanPham:ze||(h==="sticker-ce"?"CE-":"LK-")+H,productCode:ze||(h==="sticker-ce"?"CE-":"LK-")+H,name:Re,originalPrice:Te(Je),discountPrice:Te(ut),nganhHang:"",nhomHang:[]
            })
          }
        }else if(c){
          const Te=H=>H==null||H===""?0:typeof H=="number"?H:parseInt(String(H).replace(/[^\d]/g,""),10)||0;
          for(let H=0;
          H<le.length;
          H++){
            const K=le[H];
            if(!K||!Array.isArray(K))continue;
            const ce=String(K[0]||"").trim(),Je=String(K[1]||"").trim(),ut=K[2],Re=K[3];
            H===0&&(ce.toLowerCase().includes("mã")||Je.toLowerCase().includes("tên")||Je.toLowerCase().includes("sản phẩm"))||Je&&$e.push({
              maSanPham:ce,productCode:ce,name:Je,originalPrice:Te(ut),discountPrice:Te(Re),nganhHang:"",nhomHang:[]
            })
          }
        }else{
          let Te=-1;
          for(let H=0;
          H<Math.min(20,le.length);
          H++){
            const K=le[H];
            if(!K||!Array.isArray(K))continue;
            const ce=K.join(" ").toLowerCase();
            if(ce.includes("tên sản phẩm")||ce.includes("tên hàng")||ce.includes("mã sản phẩm")||ce.includes("giá niêm yết")||ce.includes("giá gốc")||ce.includes("giá sau giảm")){
              Te=H;
              break
            }
          }if(Te!==-1){
            const H=le[Te].map(re=>String(re||"").toLowerCase().trim()),K=H.findIndex(re=>re==="mã sản phẩm"||re==="mã sp"||re==="mã hàng"),ce=H.findIndex(re=>re==="tên sản phẩm"||re==="tên hàng"||re==="sản phẩm"),Je=H.findIndex(re=>re==="giá niêm yết"||re==="giá gốc"||re==="giá cũ"),ut=H.findIndex(re=>re==="giá mới"||re==="giá giảm"||re==="giá bán"||re==="giá hiện tại"||re==="giá sau giảm"),Re=H.findIndex(re=>re==="ngành hàng"),ze=H.findIndex(re=>re==="nhóm hàng");
            for(let re=Te+1;
            re<le.length;
            re++){
              const be=le[re];
              if(!be||!Array.isArray(be))continue;
              const Ae=ce!==-1?String(be[ce]||"").trim():"";
              if(!Ae||Ae.toLowerCase().includes("tên sản phẩm"))continue;
              const kt=rt=>rt==null||rt===""?0:typeof rt=="number"?rt:parseInt(String(rt).replace(/[^\d]/g,""),10)||0;
              $e.push({
                maSanPham:K!==-1?String(be[K]||"").trim():"",productCode:K!==-1?String(be[K]||"").trim():"",name:Ae,originalPrice:Je!==-1?kt(be[Je]):0,discountPrice:ut!==-1?kt(be[ut]):0,nganhHang:Re!==-1?String(be[Re]||"").trim():"",nhomHang:ze!==-1?String(be[ze]||"").trim():""
              })
            }
          }else{
            const H=K=>K==null||K===""?0:typeof K=="number"?K:parseInt(String(K).replace(/[^\d]/g,""),10)||0;
            for(let K=0;
            K<le.length;
            K++){
              const ce=le[K];
              if(!ce||!Array.isArray(ce))continue;
              const Je=String(ce[0]||"").trim(),ut=String(ce[1]||"").trim(),Re=ce[4],ze=ce[5],re=String(ce[36]||"").trim(),be=[Je,ut].filter(Boolean).join(" ").trim();
              be&&$e.push({
                maSanPham:re,productCode:re,name:be,originalPrice:H(Re),discountPrice:H(ze),nganhHang:"",nhomHang:[]
              })
            }
          }
        }const fe=c?[...De,...$e]:$e;
        oe(fe);
        const te=new Date().toISOString();
        c||P(new Date(te).toLocaleString("vi-VN"));
        const pe=h==="sticker-ce",ve=h==="sticker-lk";
        let Fe=ne.STICKER_PRICE_DATA;
        pe?Fe=ne.STICKER_CE_PRICE_DATA:ve&&(Fe=ne.STICKER_LK_PRICE_DATA),localStorage.setItem(Fe,JSON.stringify({
          data:fe,timestamp:te
        }));
        const at=c?`Đã thêm ${
          $e.length
        } sản phẩm vào danh sách!`:`Đã tải và đồng bộ ${
          $e.length
        } sản phẩm bảng giá!`;
        a(at,"success")
      }
    },_.readAsArrayBuffer(p)
  },jt=()=>{
    w(null),Ye(null),je([]),oe([]),b(null),P(null);
    const s=h==="sticker-ce",l=h==="sticker-lk";
    let c=ne.STICKER_INVENTORY_DATA,p=ne.STICKER_PRICE_DATA;
    if(s?(c=ne.STICKER_CE_INVENTORY_DATA,p=ne.STICKER_CE_PRICE_DATA):l&&(c=ne.STICKER_LK_INVENTORY_DATA,p=ne.STICKER_LK_PRICE_DATA),localStorage.removeItem(c),localStorage.removeItem(p),f({
      type:"",text:""
    }),st.current&&(st.current.value=""),nt.current&&(nt.current.value=""),s||l){
      const _=n!=="ALL"?n:"";
      if(_){
        const z=r.replace(/^0+/,""),J={
          id:xt(_),warehouse_code:z,ten_sieu_thi:_
        };
        s?(J.sticker_ce_price_data=null,J.sticker_ce_inventory_data=null):(J.sticker_lk_price_data=null,J.sticker_lk_inventory_data=null),He.from("store").upsert(J,{
          onConflict:"id"
        }).then(({
          error:Ne
        })=>{
          Ne?console.error(`Lỗi khi xóa dữ liệu ${
            s?"CE":"LK"
          } trên DB:`,Ne):a(`Đã xóa dữ liệu ${
            s?"CE":"LK"
          } trên DB!`,"success")
        })
      }
    }
  },ws=()=>{
    if(!Ce.name||!Ce.discountPrice){
      a("Vui lòng nhập tên sản phẩm và giá giảm!","error");
      return
    }const s={
      productCode:Ce.productCode||"MANUAL",maSanPham:Ce.productCode||"MANUAL",name:Ce.name,originalPrice:parseInt(Ce.originalPrice.replace(/[^\d]/g,""))||0,discountPrice:parseInt(Ce.discountPrice.replace(/[^\d]/g,""))||0,nganhHang:"THỦ CÔNG",nhomHang:"THỦ CÔNG",isManual:!0
    };
    oe(l=>[s,...l]),Be({
      productCode:"",name:"",originalPrice:"",discountPrice:""
    }),a("Đã thêm sản phẩm thủ công vào danh sách!","success")
  },ks=s=>{
    const l=ue[s];
    l&&(oe(c=>c.filter(p=>!(p.maSanPham===l.maSanPham&&p.productCode===l.productCode&&p.name===l.name))),a("Đã xóa sản phẩm khỏi danh sách!","success"))
  },wt=(s,l,c)=>{
    const p=ue[s];
    if(!p)return;
    const _=c.replace(/[^0-9]/g,""),z=_?parseInt(_,10):0;
    oe(J=>J.map(Ne=>Ne.maSanPham===p.maSanPham&&Ne.productCode===p.productCode&&Ne.name===p.name?{
      ...Ne,[l]:z
    }:Ne))
  },en=(s,l)=>{
    const c=ue[s];
    c&&oe(p=>p.map(_=>_.maSanPham===c.maSanPham&&_.productCode===c.productCode&&_.name===c.name?{
      ..._,nganhHang:l
    }:_))
  },ga=()=>{
    ps(!0)
  },Zt=(s,l)=>{
    var _;
    const c=s instanceof File?s:(_=s.target.files)==null?void 0:_[0];
    if(!c)return;
    const p=new FileReader;
    p.onload=z=>{
      var $e;
      const J=($e=z.target)==null?void 0:$e.result,Ne=as(J,{
        type:"array"
      }),ie=Ne.SheetNames[0],Ee=Ne.Sheets[ie],ge=Ie.sheet_to_json(Ee,{
        header:1,range:0,defval:""
      });
      if(!ge||ge.length===0){
        a("File Excel không có dữ liệu!","error");
        return
      }const le=fe=>fe==null||fe===""?0:typeof fe=="number"?fe:parseInt(String(fe).replace(/[^\d]/g,""),10)||0,me=[];
      if(l==="template")for(let fe=0;
      fe<ge.length;
      fe++){
        const te=ge[fe];
        if(!te||te.length<2)continue;
        const pe=String(te[0]||"").trim(),ve=String(te[1]||"").trim();
        fe===0&&(pe.toLowerCase().includes("mã")||ve.toLowerCase().includes("tên"))||ve&&me.push({
          maSanPham:pe||"SP-"+fe,productCode:pe||"SP-"+fe,name:ve,originalPrice:le(te[2]),discountPrice:le(te[3]),endDate:String(te[4]||"3/5/2026").trim(),nganhHang:"THỦ CÔNG",nhomHang:"THỦ CÔNG"
        })
      }else{
        let fe=-1;
        for(let te=0;
        te<Math.min(20,ge.length);
        te++){
          const pe=ge[te];
          if(!pe||!Array.isArray(pe))continue;
          const ve=pe.join(" ").toLowerCase();
          if(ve.includes("tên sản phẩm")||ve.includes("tên hàng")||ve.includes("mã sản phẩm")||ve.includes("giá gốc")||ve.includes("giá niêm yết")||ve.includes("giá sau giảm")){
            fe=te;
            break
          }
        }if(fe!==-1){
          const te=ge[fe].map(H=>String(H||"").toLowerCase().trim()),pe=te.findIndex(H=>H==="mã sản phẩm"||H==="mã sp"||H==="mã hàng"||H==="mã s/p"),ve=te.findIndex(H=>H==="tên sản phẩm"||H==="tên hàng"||H==="sản phẩm"||H==="tên s/p"),Fe=te.findIndex(H=>H==="giá niêm yết"||H==="giá gốc"||H==="giá cũ"||H==="giá chưa giảm"),at=te.findIndex(H=>H==="giá mới"||H==="giá giảm"||H==="giá bán"||H==="giá hiện tại"||H==="giá sau giảm"||H==="giá km"),Te=te.findIndex(H=>H.includes("hạn")||H.includes("ngày")||H.includes("kết thúc"));
          for(let H=fe+1;
          H<ge.length;
          H++){
            const K=ge[H];
            if(!K||!Array.isArray(K))continue;
            const ce=ve!==-1?String(K[ve]||"").trim():"";
            !ce||ce.toLowerCase().includes("tên sản phẩm")||me.push({
              maSanPham:pe!==-1?String(K[pe]||"").trim():"SP-"+H,productCode:pe!==-1?String(K[pe]||"").trim():"SP-"+H,name:ce,originalPrice:Fe!==-1?le(K[Fe]):0,discountPrice:at!==-1?le(K[at]):0,endDate:Te!==-1&&K[Te]?String(K[Te]).trim():"3/5/2026",nganhHang:"",nhomHang:[]
            })
          }
        }else for(let te=0;
        te<ge.length;
        te++){
          const pe=ge[te];
          if(!pe||pe.length<2)continue;
          let ve="",Fe="",at=0,Te=0;
          const H=String(pe[0]||"").trim(),K=String(pe[1]||"").trim();
          te===0&&(H.toLowerCase().includes("mã")||K.toLowerCase().includes("tên"))||(K&&K.length>3?(ve=K,Fe=H||"SP-"+te,at=le(pe[2]),Te=le(pe[3])):H&&H.length>5&&(ve=H,Fe="SP-"+te,at=le(pe[1]),Te=le(pe[2])),ve&&me.push({
            maSanPham:Fe,productCode:Fe,name:ve,originalPrice:at,discountPrice:Te,endDate:"3/5/2026",nganhHang:"",nhomHang:[]
          }))
        }
      }if(me.length===0){
        a("Không tìm thấy dữ liệu hợp lệ trong file!","error");
        return
      }L(fe=>{
        const te=[...me,...fe];
        return localStorage.setItem("sticker_in_sticker_data",JSON.stringify(te)),te
      }),a(`Đã nạp ${
        me.length
      } sản phẩm thành công!`,"success"),T("list")
    },p.readAsArrayBuffer(c)
  },fa=()=>{
    const s=[{
      "MÃ SẢN PHẨM":"SP001","TÊN SẢN PHẨM":"Quạt điều hoà Daikiosan DMI03","GIÁ GỐC":549e4,"GIÁ SAU GIẢM":349e4,"HẠN KHUYẾN MÃI":"3/5/2026"
    }],l=Ie.json_to_sheet(s),c=Ie.book_new();
    Ie.book_append_sheet(c,l,"InStickerTemplate"),Bt(c,"Mau_In_Sticker_Gia_Soc.xlsx"),a("Đã tải file Excel mẫu!","success")
  },ba=()=>{
    C.length===A.length?R([]):R(A.map((s,l)=>l))
  },ya=s=>{
    R(l=>l.includes(s)?l.filter(c=>c!==s):[...l,s])
  },Na=(s,l)=>{
    xe(c=>({
      ...c,[s]:l
    }))
  },tn=(s,l,c)=>{
    const p=c.replace(/[^0-9]/g,""),_=p?parseInt(p,10):0;
    L(z=>{
      const J=z.map((Ne,ie)=>ie===s?{
        ...Ne,[l]:_
      }:Ne);
      return localStorage.setItem("sticker_in_sticker_data",JSON.stringify(J)),J
    })
  },va=s=>{
    L(l=>{
      const c=l.filter((p,_)=>_!==s);
      return localStorage.setItem("sticker_in_sticker_data",JSON.stringify(c)),c
    }),R(l=>l.filter(c=>c!==s).map(c=>c>s?c-1:c)),a("Đã xóa sản phẩm khỏi danh sách!","success")
  },ja=()=>{
    L([]),R([]),xe({
      
    }),localStorage.removeItem("sticker_in_sticker_data"),a("Đã làm trống danh sách dữ liệu!","success")
  },wa=()=>{
    if(!E.name||!E.discountPrice){
      a("Vui lòng nhập ít nhất tên sản phẩm và giá sau giảm!","error");
      return
    }const s={
      productCode:E.productCode||"MANUAL-"+Date.now(),maSanPham:E.productCode||"MANUAL-"+Date.now(),name:E.name,originalPrice:parseInt(E.originalPrice.replace(/[^\d]/g,""))||0,discountPrice:parseInt(E.discountPrice.replace(/[^\d]/g,""))||0,endDate:E.endDate||"3/5/2026",nganhHang:"THỦ CÔNG",nhomHang:"THỦ CÔNG",isManual:!0
    };
    L(l=>{
      const c=[s,...l];
      return localStorage.setItem("sticker_in_sticker_data",JSON.stringify(c)),c
    }),X({
      productCode:"",name:"",originalPrice:"",discountPrice:"",endDate:"3/5/2026"
    }),he(!1),a("Đã thêm sản phẩm mới thành công!","success"),T("list")
  },ka=()=>{
    if(A.flatMap((c,p)=>{
      const _=C.length===0||C.includes(p),z=G[p]??1;
      return _&&z>0?Array(z).fill(c):[]
    }).length===0){
      a("Không có sản phẩm nào được chọn để in!","error");
      return
    }const l=A.filter((c,p)=>C.includes(p)).map(c=>({
      ...c,printTime:new Date().toLocaleString("vi-VN"),printQuantity:G[A.indexOf(c)]??1
    }));
    V(c=>{
      const p=[...l,...c].slice(0,50);
      return localStorage.setItem("sticker_in_sticker_history",JSON.stringify(p)),p
    }),ht({
      style:"a4_giasoc",layout:"1",showPromoLabel:!1
    }),qe(!0)
  },sn=[{
    id:"all-sticker",label:"ALL STICKER",icon:Ia,color:"text-indigo-500"
  },{
    id:"sticker",label:"STICKER",icon:We,color:"text-blue-500"
  },{
    id:"sticker-event",label:"STICKER EVENT",icon:We,color:"text-emerald-500"
  },{
    id:"in-dia-chi",label:"IN ĐỊA CHỈ",icon:nn,color:"text-emerald-600"
  },{
    id:"in-phieu-bh",label:"IN PHIẾU BH",icon:ft,color:"text-sky-600"
  },{
    id:"phan-ca-thang",label:"PHÂN CA THÁNG",icon:Ma,color:"text-purple-500"
  },{
    id:"phan-ca-tuan",label:"PHÂN CA TUẦN",icon:Ss,color:"text-orange-500"
  },{
    id:"bien-ban",label:"BIÊN BẢN CÁC LOẠI",icon:ft,color:"text-rose-500"
  },{
    id:"sticker-mln",label:"MLN",icon:We,color:"text-teal-500"
  }];
  return e.jsxs("div",{
    className:"min-h-screen bg-[#f8fafc] font-sans",children:[e.jsx("div",{
      className:"bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-30 shadow-sm",children:e.jsxs("div",{
        className:"max-w-[1800px] mx-auto flex items-center justify-between",children:[e.jsxs("div",{
          className:"flex items-center gap-5",children:[e.jsx("div",{
            className:"w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00965e] to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-100",children:e.jsx(Pa,{
              size:24
            })
          }),e.jsxs("div",{
            children:[e.jsx("h1",{
              className:"text-xl font-black text-slate-800 tracking-tight uppercase",children:"Tools Hỗ Trợ Công Việc"
            }),e.jsxs("div",{
              className:"flex items-center gap-2 mt-0.5",children:[e.jsx("span",{
                className:"px-2 py-0.5 rounded-md bg-emerald-100 text-[#00965e] text-[9px] font-black uppercase tracking-widest",children:"Quản Trị Viên"
              }),e.jsxs("span",{
                className:"text-[10px] font-bold text-slate-400",children:["Kho: ",r||"43751"]
              })]
            })]
          })]
        }),e.jsxs("div",{
          className:"flex items-center gap-3",children:[e.jsx("button",{
            className:"px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-black hover:bg-slate-50 transition-all uppercase tracking-tighter",children:"Đổi mật khẩu"
          }),e.jsx("div",{
            className:"w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400",children:e.jsx(Ot,{
              size:18
            })
          }),e.jsx("button",{
            className:"px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-black hover:bg-rose-100 transition-all uppercase tracking-tighter",children:"Đăng Xuất"
          })]
        })]
      })
    }),e.jsxs("div",{
      className:"max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-4 md:gap-8 p-3 md:p-8",children:[e.jsx("div",{
        className:"lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar bg-white rounded-2xl p-2 border border-slate-100",children:sn.map(s=>{
          const l=h===s.id;
          return e.jsxs("button",{
            onClick:()=>N(s.id),className:`flex items-center gap-2 px-4 py-2.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide whitespace-nowrap transition-all shrink-0 border-2 ${
              l?`${
                s.borderActive
              } ${
                s.bgActive
              } ${
                s.textActive
              } shadow-sm`:"border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`,children:[e.jsx("span",{
              className:"text-base",children:s.emoji
            }),s.label]
          },s.id)
        })
      }),e.jsx("div",{
        className:"hidden lg:block w-[320px] shrink-0",children:e.jsx("div",{
          className:"flex flex-col gap-2.5 py-4 sticky top-[116px]",children:sn.map(s=>{
            const l=h===s.id;
            return e.jsxs("button",{
              onClick:()=>N(s.id),className:`flex items-center gap-3 px-5 py-3.5 rounded-full transition-all duration-200 border-2 ${
                l?`${
                  s.borderActive
                } ${
                  s.bgActive
                } ${
                  s.textActive
                } shadow-sm`:"border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-white"
              }`,children:[e.jsx("span",{
                className:"text-xl",children:s.emoji
              }),e.jsx("span",{
                className:"text-sm font-extrabold tracking-wide uppercase",children:s.label
              }),l&&e.jsx("div",{
                className:"ml-auto w-1.5 h-1.5 rounded-full bg-current opacity-60"
              })]
            },s.id)
          })
        })
      }),e.jsx("div",{
        className:"flex-1 min-w-0 font-sans",children:e.jsxs(Aa,{
          mode:"wait",children:[h==="in-sticker"&&e.jsxs(lt.div,{
            initial:{
              opacity:0,x:20
            },animate:{
              opacity:1,x:0
            },exit:{
              opacity:0,x:-20
            },className:"grid grid-cols-1 xl:grid-cols-12 gap-8",children:[e.jsx("div",{
              className:"xl:col-span-5 flex flex-col items-center gap-6",children:e.jsxs("div",{
                className:"w-full bg-white rounded-3xl p-5 border border-slate-200 flex flex-col items-center shadow-sm",children:[e.jsxs("h3",{
                  className:"font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider text-[#00965e] self-start flex items-center gap-2",children:[e.jsx(Ha,{
                    size:16
                  })," Xem trước thiết kế (A4)"]
                }),e.jsx("div",{
                  className:"w-full bg-slate-50 border border-slate-200 rounded-3xl p-4 flex flex-col items-center justify-center overflow-hidden h-[510px] relative",children:e.jsx("div",{
                    style:{
                      transform:"scale(0.40)",transformOrigin:"top center",marginBottom:"-675px"
                    },className:"shadow-2xl bg-white border border-slate-300",children:e.jsx(Fl,{
                      item:Le
                    })
                  })
                })]
              })
            }),e.jsxs("div",{
              className:"xl:col-span-7 flex flex-col gap-6",children:[e.jsxs("div",{
                className:"bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between gap-4",children:[e.jsxs("button",{
                  onClick:ka,className:"flex-1 py-3.5 px-6 rounded-full font-extrabold text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-green-500 bg-green-50 text-green-700 hover:bg-green-100 shadow-sm cursor-pointer",children:[e.jsx("span",{
                    className:"text-lg",children:"🖨️"
                  }),"BẤM ĐỂ IN (",C.length||A.length,")"]
                }),e.jsxs("button",{
                  onClick:()=>he(!0),className:"py-3.5 px-6 rounded-full font-extrabold text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-sm cursor-pointer",children:[e.jsx("span",{
                    className:"text-lg",children:"➕"
                  })," Thêm"]
                })]
              }),e.jsxs("div",{
                className:"bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col min-h-[500px]",children:[e.jsxs("div",{
                  className:"flex border-b border-slate-100 pb-3 mb-4 gap-6",children:[e.jsx("button",{
                    onClick:()=>T("data"),className:`pb-2 text-sm font-black uppercase tracking-wider transition-all border-b-2 relative ${
                      S==="data"?"border-blue-600 text-blue-600":"border-transparent text-slate-400 hover:text-slate-600"
                    }`,children:"Dữ liệu"
                  }),e.jsxs("button",{
                    onClick:()=>T("list"),className:`pb-2 text-sm font-black uppercase tracking-wider transition-all border-b-2 relative ${
                      S==="list"?"border-blue-600 text-blue-600":"border-transparent text-slate-400 hover:text-slate-600"
                    }`,children:["D.Sách (",A.length,")"]
                  }),e.jsxs("button",{
                    onClick:()=>T("history"),className:`pb-2 text-sm font-black uppercase tracking-wider transition-all border-b-2 relative ${
                      S==="history"?"border-blue-600 text-blue-600":"border-transparent text-slate-400 hover:text-slate-600"
                    }`,children:["Lịch sử (",B.length,")"]
                  })]
                }),e.jsxs("div",{
                  className:"flex-1 flex flex-col",children:[S==="data"&&e.jsxs("div",{
                    className:"space-y-6 flex-1",children:[e.jsxs("div",{
                      className:"flex items-center gap-3",children:[e.jsx("input",{
                        type:"file",accept:".xlsx, .xls",ref:Z,onChange:s=>Zt(s,"dsd"),className:"hidden"
                      }),e.jsxs("button",{
                        onClick:()=>{
                          var s;
                          return(s=Z.current)==null?void 0:s.click()
                        },className:"flex-1 py-3 px-6 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-green-500 bg-green-50 text-green-700 hover:bg-green-100 shadow-sm cursor-pointer",children:[e.jsx("span",{
                          className:"text-base",children:"📤"
                        })," File giá ĐSD - TBBM"]
                      }),e.jsx("button",{
                        onClick:ja,className:"py-3 px-6 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-slate-300 bg-white text-slate-600 hover:bg-slate-50 shadow-sm cursor-pointer",children:"Reset"
                      })]
                    }),e.jsxs("div",{
                      className:"border border-emerald-100 bg-emerald-50/20 rounded-2xl p-4",children:[e.jsxs("h4",{
                        className:"text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-1.5",children:[e.jsx(ft,{
                          size:14,className:"text-emerald-600"
                        })," Nhập từ File Mẫu"]
                      }),e.jsxs("div",{
                        className:"grid grid-cols-2 gap-3",children:[e.jsxs("button",{
                          onClick:fa,className:"py-2.5 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 border-2 border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm cursor-pointer",children:[e.jsx("span",{
                            className:"text-sm",children:"📥"
                          })," Tải File Mẫu"]
                        }),e.jsx("input",{
                          type:"file",accept:".xlsx, .xls",ref:Me,onChange:s=>Zt(s,"template"),className:"hidden"
                        }),e.jsxs("button",{
                          onClick:()=>{
                            var s;
                            return(s=Me.current)==null?void 0:s.click()
                          },className:"py-2.5 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 border-2 border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50 shadow-sm cursor-pointer",children:[e.jsx("span",{
                            className:"text-sm",children:"📤"
                          })," Nhập File Mẫu"]
                        })]
                      })]
                    }),e.jsxs("div",{
                      className:"border border-amber-100 bg-amber-50/15 rounded-2xl p-4",children:[e.jsxs("h4",{
                        className:"text-xs font-bold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-1.5",children:[e.jsx(an,{
                          size:14,className:"text-amber-600"
                        })," Nhập file in giá từ ERP"]
                      }),e.jsxs("div",{
                        className:"grid grid-cols-2 gap-3",children:[e.jsx("input",{
                          type:"file",accept:".xlsx, .xls",ref:Ge,onChange:s=>Zt(s,"mln"),className:"hidden"
                        }),e.jsxs("button",{
                          onClick:()=>{
                            var s;
                            return(s=Ge.current)==null?void 0:s.click()
                          },className:"py-2.5 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 border-2 border-red-400 bg-red-50 text-red-700 hover:bg-red-100 shadow-sm cursor-pointer",children:[e.jsx("span",{
                            className:"text-sm",children:"📤"
                          })," Máy Lọc Nước (Mẫu in 99)"]
                        }),e.jsx("input",{
                          type:"file",accept:".xlsx, .xls",ref:Ke,onChange:s=>Zt(s,"dtl"),className:"hidden"
                        }),e.jsxs("button",{
                          onClick:()=>{
                            var s;
                            return(s=Ke.current)==null?void 0:s.click()
                          },className:"py-2.5 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 border-2 border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-sm cursor-pointer",children:[e.jsx("span",{
                            className:"text-sm",children:"📤"
                          })," Điện Tử/Lạnh (Mẫu in 97)"]
                        })]
                      })]
                    }),e.jsxs("div",{
                      className:"bg-blue-50/30 rounded-2xl p-4 border border-blue-50 space-y-3",children:[e.jsxs("h4",{
                        className:"text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5",children:[e.jsx(an,{
                          size:14,className:"text-blue-600"
                        })," H.Dẫn in & sử dụng"]
                      }),e.jsxs("div",{
                        className:"space-y-2 text-xs",children:[e.jsx("p",{
                          className:"font-bold text-slate-700 uppercase tracking-tight",children:"Cấu hình in Chrome (Ctrl + P):"
                        }),e.jsxs("ul",{
                          className:"list-disc pl-4 space-y-1 text-slate-600 font-medium",children:[e.jsxs("li",{
                            children:["Khổ giấy khuyên dùng: ",e.jsx("span",{
                              className:"font-bold",children:"A4"
                            })]
                          }),e.jsxs("li",{
                            children:["Lề (Margins): ",e.jsx("span",{
                              className:"font-bold",children:"Không Có (None)"
                            })]
                          }),e.jsxs("li",{
                            children:["Chọn: ",e.jsx("span",{
                              className:"font-bold",children:"Hiển thị đồ họa nền (Background graphics)"
                            })]
                          })]
                        })]
                      })]
                    })]
                  }),S==="list"&&e.jsx("div",{
                    className:"flex-1 flex flex-col h-[400px]",children:A.length===0?e.jsxs("div",{
                      className:"flex-1 flex flex-col items-center justify-center text-slate-400 py-12",children:[e.jsx(Ot,{
                        size:36,className:"text-slate-300 mb-2"
                      }),e.jsx("span",{
                        className:"text-sm font-medium",children:"Danh sách trống. Vui lòng thêm thủ công hoặc tải file dữ liệu."
                      })]
                    }):e.jsx("div",{
                      className:"overflow-auto flex-1 border border-slate-100 rounded-2xl",children:e.jsxs("table",{
                        className:"w-full text-left border-collapse",children:[e.jsx("thead",{
                          children:e.jsxs("tr",{
                            className:"bg-slate-50 sticky top-0 z-10 border-b border-slate-100 shadow-sm",children:[e.jsx("th",{
                              className:"py-3 px-4 text-[10px] font-black text-slate-500 uppercase w-10 text-center",children:e.jsx("input",{
                                type:"checkbox",className:"w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer",checked:A.length>0&&C.length===A.length,onChange:ba
                              })
                            }),e.jsx("th",{
                              className:"py-3 px-3 text-[10px] font-black text-slate-500 uppercase w-12 text-center",children:"STT"
                            }),e.jsx("th",{
                              className:"py-3 px-3 text-[10px] font-black text-slate-500 uppercase w-20 text-center",children:"SL In"
                            }),e.jsx("th",{
                              className:"py-3 px-3 text-[10px] font-black text-slate-500 uppercase w-32",children:"Mã SP"
                            }),e.jsx("th",{
                              className:"py-3 px-3 text-[10px] font-black text-slate-500 uppercase",children:"Tên sản phẩm"
                            }),e.jsx("th",{
                              className:"py-3 px-3 text-[10px] font-black text-slate-500 uppercase text-right w-28",children:"Giá gốc"
                            }),e.jsx("th",{
                              className:"py-3 px-3 text-[10px] font-black text-slate-500 uppercase text-right w-28",children:"Giá giảm"
                            }),e.jsx("th",{
                              className:"py-3 px-3 text-[10px] font-black text-slate-500 uppercase text-center w-12",children:"Hạn KM"
                            }),e.jsx("th",{
                              className:"py-3 px-3 text-[10px] font-black text-slate-500 uppercase text-center w-12",children:"Xóa"
                            })]
                          })
                        }),e.jsx("tbody",{
                          className:"divide-y divide-slate-100",children:A.map((s,l)=>{
                            const c=C.includes(l);
                            return e.jsxs("tr",{
                              className:`hover:bg-slate-50/50 transition-colors ${
                                c?"bg-blue-50/10":""
                              }`,children:[e.jsx("td",{
                                className:"py-2.5 px-4 text-center",children:e.jsx("input",{
                                  type:"checkbox",className:"w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer",checked:c,onChange:()=>ya(l)
                                })
                              }),e.jsx("td",{
                                className:"py-2.5 px-3 text-xs font-bold text-slate-400 text-center",children:l+1
                              }),e.jsx("td",{
                                className:"py-2.5 px-3 text-center",children:e.jsx("input",{
                                  type:"number",min:"1",className:"w-12 bg-white border border-slate-200 text-slate-700 py-0.5 px-1.5 rounded-lg text-xs font-black text-center focus:ring-2 focus:ring-blue-500",value:G[l]??1,onChange:p=>Na(l,parseInt(p.target.value)||1)
                                })
                              }),e.jsx("td",{
                                className:"py-2.5 px-3 text-xs font-bold text-blue-600",children:s.productCode
                              }),e.jsx("td",{
                                className:"py-2.5 px-3 text-xs font-extrabold text-slate-800 line-clamp-1",children:s.name
                              }),e.jsx("td",{
                                className:"py-2.5 px-3 text-right",children:e.jsx("input",{
                                  type:"text",className:"w-24 bg-white border border-slate-100 text-slate-700 py-0.5 px-1.5 rounded-lg text-xs font-bold text-right focus:border-slate-300",value:Number(s.originalPrice||0).toLocaleString("vi-VN")+" đ",onChange:p=>tn(l,"originalPrice",p.target.value)
                                })
                              }),e.jsx("td",{
                                className:"py-2.5 px-3 text-right",children:e.jsx("input",{
                                  type:"text",className:"w-24 bg-white border border-slate-100 text-red-600 py-0.5 px-1.5 rounded-lg text-xs font-bold text-right focus:border-slate-300",value:Number(s.discountPrice||0).toLocaleString("vi-VN")+" đ",onChange:p=>tn(l,"discountPrice",p.target.value)
                                })
                              }),e.jsx("td",{
                                className:"py-2.5 px-3 text-xs font-bold text-slate-500 text-center whitespace-nowrap",children:s.endDate||"3/5/2026"
                              }),e.jsx("td",{
                                className:"py-2.5 px-3 text-center",children:e.jsx("button",{
                                  onClick:()=>va(l),className:"text-slate-400 hover:text-red-500 transition-colors p-1",children:e.jsx(et,{
                                    size:13
                                  })
                                })
                              })]
                            },l)
                          })
                        })]
                      })
                    })
                  }),S==="history"&&e.jsx("div",{
                    className:"flex-1 flex flex-col h-[400px]",children:B.length===0?e.jsxs("div",{
                      className:"flex-1 flex flex-col items-center justify-center text-slate-400 py-12",children:[e.jsx(rn,{
                        size:36,className:"text-slate-300 mb-2"
                      }),e.jsx("span",{
                        className:"text-sm font-medium",children:"Chưa có lịch sử in."
                      })]
                    }):e.jsx("div",{
                      className:"overflow-auto flex-1 border border-slate-100 rounded-2xl",children:e.jsxs("table",{
                        className:"w-full text-left border-collapse",children:[e.jsx("thead",{
                          children:e.jsxs("tr",{
                            className:"bg-slate-50 sticky top-0 z-10 border-b border-slate-100 shadow-sm",children:[e.jsx("th",{
                              className:"py-3 px-4 text-[10px] font-black text-slate-500 uppercase w-12 text-center",children:"STT"
                            }),e.jsx("th",{
                              className:"py-3 px-3 text-[10px] font-black text-slate-500 uppercase",children:"Sản phẩm"
                            }),e.jsx("th",{
                              className:"py-3 px-3 text-[10px] font-black text-slate-500 uppercase text-center w-24",children:"Số lượng"
                            }),e.jsx("th",{
                              className:"py-3 px-3 text-[10px] font-black text-slate-500 uppercase text-center w-40",children:"Thời gian in"
                            })]
                          })
                        }),e.jsx("tbody",{
                          className:"divide-y divide-slate-100",children:B.map((s,l)=>e.jsxs("tr",{
                            className:"hover:bg-slate-50/50 transition-colors",children:[e.jsx("td",{
                              className:"py-2.5 px-4 text-xs font-bold text-slate-400 text-center",children:l+1
                            }),e.jsxs("td",{
                              className:"py-2.5 px-3",children:[e.jsx("div",{
                                className:"text-xs font-extrabold text-slate-800",children:s.name
                              }),e.jsx("div",{
                                className:"text-[10px] text-indigo-600 font-bold mt-0.5",children:s.productCode
                              })]
                            }),e.jsx("td",{
                              className:"py-2.5 px-3 text-xs font-black text-slate-700 text-center",children:s.printQuantity||1
                            }),e.jsx("td",{
                              className:"py-2.5 px-3 text-xs font-bold text-slate-400 text-center",children:s.printTime
                            })]
                          },l))
                        })]
                      })
                    })
                  })]
                })]
              })]
            })]
          },"in-sticker"),h==="phan-ca-thang"&&e.jsx(lt.div,{
            initial:{
              opacity:0,x:20
            },animate:{
              opacity:1,x:0
            },exit:{
              opacity:0,x:-20
            },children:e.jsx(Ll,{
              
            })
          },"phan-ca-thang"),h==="phan-ca-tuan"&&e.jsx(lt.div,{
            initial:{
              opacity:0,x:20
            },animate:{
              opacity:1,x:0
            },exit:{
              opacity:0,x:-20
            },children:e.jsx(Dl,{
              
            })
          },"phan-ca-tuan"),h==="all-sticker"&&e.jsxs(lt.div,{
            initial:{
              opacity:0,x:20
            },animate:{
              opacity:1,x:0
            },exit:{
              opacity:0,x:-20
            },className:"space-y-6",children:[e.jsx("div",{
              className:"sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm pb-3 -mt-2 pt-2",children:e.jsxs("div",{
                className:"flex gap-3",children:[e.jsxs("button",{
                  onClick:()=>N("all-sticker"),className:"flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm",children:[e.jsx("span",{
                    className:"text-lg",children:"🎪"
                  }),"EVENT"]
                }),e.jsxs("button",{
                  onClick:()=>N("sticker-lk"),className:"flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 shadow-sm",children:[e.jsx("span",{
                    className:"text-lg",children:"🔊"
                  }),"LOA KÉO"]
                }),e.jsxs("button",{
                  onClick:()=>N("sticker-ce"),className:"flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 shadow-sm",children:[e.jsx("span",{
                    className:"text-lg",children:"🏢"
                  }),"IN STICKER CE"]
                }),e.jsxs("button",{
                  onClick:()=>N("sticker-mln"),className:"flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 shadow-sm",children:[e.jsx("span",{
                    className:"text-lg",children:"💧"
                  }),"MLN"]
                })]
              })
            }),e.jsxs("div",{
              className:"grid grid-cols-1 lg:grid-cols-2 gap-4",children:[e.jsxs("div",{
                className:"bg-white rounded-3xl shadow-sm border border-slate-200 p-5",children:[e.jsxs("div",{
                  className:"flex items-center gap-3 mb-4",children:[e.jsx("div",{
                    className:"w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-400 flex items-center justify-center text-white shadow-lg shadow-indigo-100",children:e.jsx(Ss,{
                      size:20
                    })
                  }),e.jsxs("div",{
                    children:[e.jsx("h2",{
                      className:"text-base font-black text-slate-800 uppercase tracking-tight",children:"NHẬP DỮ LIỆU"
                    }),e.jsx("p",{
                      className:"text-[11px] text-slate-400 font-medium",children:"Tải file Tồn Kho & Bảng Giá để in sticker"
                    })]
                  })]
                }),e.jsxs("div",{
                  className:"grid grid-cols-3 gap-3",children:[e.jsx("input",{
                    type:"file",accept:".xlsx, .xls",className:"hidden",ref:st,onChange:s=>dt(s,"inventory")
                  }),e.jsxs("button",{
                    onClick:()=>{
                      var s;
                      return(s=st.current)==null?void 0:s.click()
                    },className:`w-full py-3 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                      y||g?"border-2 border-indigo-500 bg-indigo-500 text-white hover:bg-indigo-600":"border-2 border-indigo-400 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    }`,children:[e.jsx("span",{
                      className:"text-sm",children:y||g?"✅":"📥"
                    }),y||g?"Đã tải Tồn Kho":"Tải Tồn Kho"]
                  }),e.jsx("input",{
                    type:"file",accept:".xlsx, .xls",className:"hidden",ref:nt,onChange:s=>dt(s,"price")
                  }),e.jsxs("button",{
                    onClick:()=>{
                      var s;
                      return(s=nt.current)==null?void 0:s.click()
                    },className:`w-full py-3 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                      we||k?"border-2 border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600":"border-2 border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`,children:[e.jsx("span",{
                      className:"text-sm",children:we||k?"✅":"📥"
                    }),we||k?"Đã tải Bảng Giá":"Tải Bảng Giá"]
                  }),e.jsxs("button",{
                    onClick:jt,className:"w-full py-3 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-red-400 bg-red-50 text-red-700 hover:bg-red-100 shadow-sm cursor-pointer",children:[e.jsx("span",{
                      className:"text-sm",children:"🗑️"
                    }),"Xóa dữ liệu"]
                  })]
                })]
              }),e.jsxs("div",{
                className:"bg-white rounded-3xl shadow-sm border border-slate-200 p-5",children:[e.jsxs("div",{
                  className:"flex items-center justify-between mb-4",children:[e.jsxs("div",{
                    className:"flex items-center gap-2",children:[e.jsx("div",{
                      className:"w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-lg shadow-amber-100",children:e.jsx(mt,{
                        size:20
                      })
                    }),e.jsxs("div",{
                      children:[e.jsx("h2",{
                        className:"text-base font-black text-slate-800 uppercase tracking-tight",children:"IN STICKER THỦ CÔNG"
                      }),e.jsx("p",{
                        className:"text-[11px] text-slate-400 font-medium",children:"Nhập trực tiếp không cần file"
                      })]
                    })]
                  }),e.jsxs("button",{
                    onClick:jt,className:"py-2 px-4 rounded-full text-[10px] font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 border-2 border-red-300 bg-red-50 text-red-600 hover:bg-red-100 shadow-sm cursor-pointer",children:[e.jsx("span",{
                      className:"text-xs",children:"🗑️"
                    }),"Xóa dữ liệu"]
                  })]
                }),e.jsxs("div",{
                  className:"space-y-3",children:[e.jsxs("div",{
                    className:"grid grid-cols-3 gap-3",children:[e.jsxs("div",{
                      className:"space-y-1",children:[e.jsx("label",{
                        className:"text-[10px] font-bold text-slate-500 uppercase",children:"Ngành hàng"
                      }),e.jsx("input",{
                        type:"text",placeholder:"VD: THỦ CÔNG",value:Ce.nganhHang||"",onChange:s=>Be(l=>({
                          ...l,nganhHang:s.target.value
                        })),className:"w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      })]
                    }),e.jsxs("div",{
                      className:"space-y-1",children:[e.jsx("label",{
                        className:"text-[10px] font-bold text-slate-500 uppercase",children:"Mã sản phẩm"
                      }),e.jsx("input",{
                        type:"text",placeholder:"Mã SP...",value:Ce.productCode,onChange:s=>Be(l=>({
                          ...l,productCode:s.target.value
                        })),className:"w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      })]
                    }),e.jsxs("div",{
                      className:"space-y-1",children:[e.jsx("label",{
                        className:"text-[10px] font-bold text-slate-500 uppercase",children:"Tên sản phẩm"
                      }),e.jsx("input",{
                        type:"text",placeholder:"Tên SP...",value:Ce.name,onChange:s=>Be(l=>({
                          ...l,name:s.target.value
                        })),className:"w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      })]
                    })]
                  }),e.jsxs("div",{
                    className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{
                      className:"space-y-1",children:[e.jsx("label",{
                        className:"text-[10px] font-bold text-slate-500 uppercase",children:"Giá gốc"
                      }),e.jsx("input",{
                        type:"text",placeholder:"Giá gốc...",value:Ce.originalPrice,onChange:s=>Be(l=>({
                          ...l,originalPrice:s.target.value
                        })),className:"w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      })]
                    }),e.jsxs("div",{
                      className:"space-y-1",children:[e.jsx("label",{
                        className:"text-[10px] font-bold text-slate-500 uppercase",children:"Giá sau giảm"
                      }),e.jsx("input",{
                        type:"text",placeholder:"Giá giảm...",value:Ce.discountPrice,onChange:s=>Be(l=>({
                          ...l,discountPrice:s.target.value
                        })),className:"w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      })]
                    })]
                  }),e.jsxs("div",{
                    className:"grid grid-cols-2 gap-3",children:[e.jsxs("button",{
                      onClick:ws,className:"w-full py-3 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-sm",children:[e.jsx("span",{
                        className:"text-base",children:"📂"
                      }),"THÊM VÀO LIST"]
                    }),e.jsxs("label",{
                      className:"w-full py-3 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm cursor-pointer",children:[e.jsx("span",{
                        className:"text-base",children:"📤"
                      }),"FILE EXCEL ","->","  LIST",e.jsx("input",{
                        type:"file",className:"hidden",accept:".xlsx, .xls",onChange:s=>{
                          dt(s,"price",!0),s.target.value=""
                        }
                      })]
                    })]
                  }),e.jsxs("button",{
                    onClick:()=>{
                      const s=[{
                        "MÃ SẢN PHẨM":"SP001","TÊN SẢN PHẨM":"Ví dụ Tên Sản Phẩm","GIÁ GỐC":1e6,"GIÁ SAU GIẢM":5e5
                      }],l=Ie.json_to_sheet(s),c=Ie.book_new();
                      Ie.book_append_sheet(c,l,"StickerTemplate"),Bt(c,"Mau_In_Sticker_Event.xlsx"),a("Đã tải file Excel mẫu!","success")
                    },className:"w-full py-3 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-sm",children:[e.jsx("span",{
                      className:"text-base",children:"📄"
                    }),"XUẤT FILE MẪU"]
                  })]
                })]
              })]
            }),e.jsxs("div",{
              className:"bg-white rounded-3xl shadow-sm border border-slate-200 p-5",children:[e.jsxs("div",{
                className:"flex items-center gap-3 mb-5",children:[e.jsx("div",{
                  className:"w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center text-white shadow-lg shadow-violet-100",children:e.jsx(We,{
                    size:20
                  })
                }),e.jsxs("div",{
                  children:[e.jsx("h2",{
                    className:"text-base font-black text-slate-800 uppercase tracking-tight",children:"CHỌN KIỂU & BỐ CỤC IN"
                  }),e.jsx("p",{
                    className:"text-[11px] text-slate-400 font-medium",children:"Nhấp vào bố cục bên dưới mỗi kiểu để in trực tiếp"
                  })]
                })]
              }),e.jsxs("div",{
                className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5",children:[e.jsxs("div",{
                  className:"rounded-2xl border-2 border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all overflow-hidden group",children:[e.jsx("div",{
                    className:"h-[200px] bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center overflow-hidden relative",children:e.jsx("div",{
                      className:"pointer-events-none select-none",style:{
                        transform:"scale(0.36)",transformOrigin:"center",width:"148.5mm",height:"105mm",flexShrink:0
                      },children:e.jsx(bt,{
                        item:{
                          name:"Quạt điều hoà DK03",originalPrice:549e4,discountPrice:349e4,qrData:"99999",maSanPham:"SP001"
                        },style:"classic",layout:"4",showPromoLabel:!0
                      })
                    })
                  }),e.jsxs("div",{
                    className:"p-4 bg-white border-t border-slate-100",children:[e.jsx("h4",{
                      className:"text-sm font-black text-slate-800 uppercase tracking-wider mb-3 text-center",children:"Kiểu Event"
                    }),e.jsx("div",{
                      className:"grid grid-cols-2 gap-2",children:[{
                        layout:"1",label:"1 Sticker / Trang"
                      },{
                        layout:"2",label:"2 Sticker / Trang"
                      },{
                        layout:"4",label:"4 Sticker / Trang"
                      },{
                        layout:"8",label:"8 Sticker / Trang"
                      }].map(s=>e.jsxs("button",{
                        onClick:()=>{
                          ht({
                            style:"classic",layout:s.layout,showPromoLabel:!0
                          }),qe(!0)
                        },disabled:Pe.length===0||ye.length===0,className:"w-full py-3 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-md disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none",children:[e.jsx("span",{
                          className:"text-sm",children:"🖨️"
                        }),s.label]
                      },s.layout))
                    })]
                  })]
                }),e.jsxs("div",{
                  className:"rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden group",children:[e.jsx("div",{
                    className:"h-[200px] bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center overflow-hidden relative",children:e.jsx("div",{
                      className:"pointer-events-none select-none",style:{
                        transform:"scale(0.36)",transformOrigin:"center",width:"148.5mm",height:"105mm",flexShrink:0
                      },children:e.jsx(bt,{
                        item:{
                          name:"Quạt điều hoà DK03",originalPrice:549e4,discountPrice:349e4,qrData:"99999",maSanPham:"SP001"
                        },style:"modern",layout:"4",showPromoLabel:!0
                      })
                    })
                  }),e.jsxs("div",{
                    className:"p-4 bg-white border-t border-slate-100",children:[e.jsx("h4",{
                      className:"text-sm font-black text-slate-800 uppercase tracking-wider mb-3 text-center",children:"Kiểu Giá Quạt"
                    }),e.jsx("div",{
                      className:"grid grid-cols-2 gap-2",children:[{
                        layout:"1",label:"1 Sticker / Trang"
                      },{
                        layout:"2",label:"2 Sticker / Trang"
                      },{
                        layout:"4",label:"4 Sticker / Trang"
                      },{
                        layout:"8",label:"8 Sticker / Trang"
                      }].map(s=>e.jsxs("button",{
                        onClick:()=>{
                          ht({
                            style:"modern",layout:s.layout,showPromoLabel:!0
                          }),qe(!0)
                        },disabled:Pe.length===0||ye.length===0,className:"w-full py-3 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white shadow-md disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none",children:[e.jsx("span",{
                          className:"text-sm",children:"🖨️"
                        }),s.label]
                      },s.layout))
                    })]
                  })]
                }),e.jsxs("div",{
                  className:"rounded-2xl border-2 border-slate-200 hover:border-emerald-400 hover:shadow-lg transition-all overflow-hidden group",children:[e.jsx("div",{
                    className:"h-[200px] bg-gradient-to-br from-slate-50 to-emerald-50/30 flex items-center justify-center overflow-hidden relative",children:e.jsx("div",{
                      className:"pointer-events-none select-none",style:{
                        transform:"scale(0.23)",transformOrigin:"center",width:"148.5mm",height:"210mm",flexShrink:0
                      },children:e.jsx(bt,{
                        item:{
                          name:"Quạt điều hoà DK03",originalPrice:549e4,discountPrice:349e4,maSanPham:"SP001"
                        },style:"display",layout:"1",showPromoLabel:!1
                      })
                    })
                  }),e.jsxs("div",{
                    className:"p-4 bg-white border-t border-slate-100",children:[e.jsx("h4",{
                      className:"text-sm font-black text-slate-800 uppercase tracking-wider mb-3 text-center",children:"Hàng Trưng Bày"
                    }),e.jsx("div",{
                      className:"grid grid-cols-1 gap-2",children:e.jsxs("button",{
                        onClick:()=>{
                          ht({
                            style:"display",layout:"1",showPromoLabel:!1
                          }),qe(!0)
                        },disabled:Pe.length===0||ye.length===0,className:"w-full py-3 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none",children:[e.jsx("span",{
                          className:"text-sm",children:"🖨️"
                        }),"1 Sticker / Trang (A5 Đứng)"]
                      })
                    })]
                  })]
                }),e.jsxs("div",{
                  className:"rounded-2xl border-2 border-slate-200 hover:border-red-400 hover:shadow-lg transition-all overflow-hidden group",children:[e.jsx("div",{
                    className:"h-[200px] bg-gradient-to-br from-slate-50 to-red-50/30 flex items-center justify-center overflow-hidden relative",children:e.jsx("div",{
                      className:"pointer-events-none select-none",style:{
                        transform:"scale(0.23)",transformOrigin:"center",width:"148.5mm",height:"210mm",flexShrink:0
                      },children:e.jsx(bt,{
                        item:{
                          name:"Quạt điều hoà DK03",originalPrice:549e4,discountPrice:349e4,maSanPham:"SP001"
                        },style:"giovang",layout:"1",showPromoLabel:!1
                      })
                    })
                  }),e.jsxs("div",{
                    className:"p-4 bg-white border-t border-slate-100",children:[e.jsx("h4",{
                      className:"text-sm font-black text-red-600 uppercase tracking-wider mb-3 text-center",children:"Giờ Vàng Giá Sốc"
                    }),e.jsx("div",{
                      className:"grid grid-cols-1 gap-2",children:e.jsxs("button",{
                        onClick:()=>{
                          ht({
                            style:"giovang",layout:"1",showPromoLabel:!1
                          }),qe(!0)
                        },disabled:Pe.length===0||ye.length===0,className:"w-full py-3 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white shadow-md disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none",children:[e.jsx("span",{
                          className:"text-sm",children:"🖨️"
                        }),"1 Sticker / Trang (A5)"]
                      })
                    })]
                  })]
                }),e.jsxs("div",{
                  className:"rounded-2xl border-2 border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all overflow-hidden group",children:[e.jsx("div",{
                    className:"h-[200px] bg-gradient-to-br from-slate-50 to-amber-50/30 flex items-center justify-center overflow-hidden relative",children:e.jsx("div",{
                      className:"pointer-events-none select-none",style:{
                        transform:"scale(0.17)",transformOrigin:"center",width:"210mm",height:"297mm",flexShrink:0
                      },children:e.jsx(bt,{
                        item:{
                          name:"Quạt điều hoà DK03",originalPrice:549e4,discountPrice:349e4,maSanPham:"SP001",nganhHang:"QUẠT ĐIỀU HOÀ",endDate:"3/5/2026"
                        },style:"a4_giasoc",layout:"1",showPromoLabel:!1
                      })
                    })
                  }),e.jsxs("div",{
                    className:"p-4 bg-white border-t border-slate-100",children:[e.jsx("h4",{
                      className:"text-sm font-black text-amber-600 uppercase tracking-wider mb-3 text-center",children:"A4 Đứng Giá Sốc"
                    }),e.jsx("div",{
                      className:"grid grid-cols-1 gap-2",children:e.jsxs("button",{
                        onClick:()=>{
                          ht({
                            style:"a4_giasoc",layout:"1",showPromoLabel:!1
                          }),qe(!0)
                        },disabled:Pe.length===0||ye.length===0,className:"w-full py-3 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-md disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none",children:[e.jsx("span",{
                          className:"text-sm",children:"🖨️"
                        }),"1 Sticker / Trang (A4 Đứng)"]
                      })
                    })]
                  })]
                })]
              }),Pe.length>0&&e.jsxs("div",{
                className:"mt-4 flex items-center justify-center gap-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-100",children:[e.jsxs("span",{
                  className:"text-[11px] font-black text-slate-500 uppercase tracking-wider",children:[ye.length," / ",ue.length," sản phẩm được chọn in"]
                }),e.jsxs("span",{
                  className:"text-[11px] font-black text-indigo-600 uppercase tracking-wider",children:["(Tổng: ",ye.reduce((s,l)=>s+(Xe[l]||1),0)," sticker)"]
                })]
              })]
            }),e.jsxs("div",{
              className:"space-y-4",children:[e.jsxs("div",{
                className:"bg-white rounded-3xl shadow-sm border border-slate-200 p-5",children:[e.jsxs("div",{
                  className:"flex items-center justify-between mb-4",children:[e.jsxs("div",{
                    className:"flex items-center gap-4",children:[e.jsx("h3",{
                      className:"text-sm font-black text-slate-800 uppercase tracking-tight",children:"BỘ LỌC TỒN KHO"
                    }),e.jsxs("label",{
                      className:"flex items-center gap-2 cursor-pointer",children:[e.jsx("input",{
                        type:"checkbox",className:"w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500",checked:ee.onlyInventory,onChange:s=>_e(l=>({
                          ...l,onlyInventory:s.target.checked
                        }))
                      }),e.jsx("span",{
                        className:"text-xs font-medium text-slate-600",children:"Có trong tồn kho"
                      })]
                    })]
                  }),e.jsx("button",{
                    onClick:()=>{
                      _e({
                        maSieuThi:"",nganhHang:"",nhomHang:[],onlyInventory:!1,selectedQrs:null,sortOrder:""
                      }),vt("")
                    },className:"text-xs font-bold text-blue-600 hover:underline",children:"Xóa bộ lọc"
                  })]
                }),e.jsxs("div",{
                  className:"grid grid-cols-2 md:grid-cols-4 gap-3",children:[e.jsxs("div",{
                    className:"space-y-1",children:[e.jsx("label",{
                      className:"text-[10px] font-bold text-slate-500 uppercase",children:"Ngành hàng"
                    }),e.jsxs("select",{
                      value:ee.nganhHang,onChange:s=>_e(l=>({
                        ...l,nganhHang:s.target.value,nhomHang:[]
                      })),className:"w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500",children:[e.jsx("option",{
                        value:"",children:"Tất cả"
                      }),ys.map(s=>e.jsx("option",{
                        value:s,children:s
                      },s))]
                    })]
                  }),e.jsxs("div",{
                    className:"space-y-1",children:[e.jsx("label",{
                      className:"text-[10px] font-bold text-slate-500 uppercase",children:"Sắp xếp giá"
                    }),e.jsxs("select",{
                      value:ee.sortOrder,onChange:s=>_e(l=>({
                        ...l,sortOrder:s.target.value
                      })),className:"w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500",children:[e.jsx("option",{
                        value:"",children:"Mặc định"
                      }),e.jsx("option",{
                        value:"asc",children:"Thấp → Cao"
                      }),e.jsx("option",{
                        value:"desc",children:"Cao → Thấp"
                      })]
                    })]
                  }),e.jsxs("div",{
                    className:"space-y-1",children:[e.jsx("label",{
                      className:"text-[10px] font-bold text-slate-500 uppercase",children:"Số lượng cần in"
                    }),e.jsxs("div",{
                      className:"flex gap-1.5",children:[e.jsx("input",{
                        type:"number",min:"0",max:ue.length,placeholder:"VD: 5",value:Nt,onChange:s=>vt(s.target.value),className:"w-full bg-white border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      }),e.jsx("button",{
                        onClick:()=>{
                          const s=parseInt(Nt);
                          if(!isNaN(s)&&s>=0){
                            const l=Math.min(s,ue.length);
                            ct(Array.from({
                              length:l
                            },(c,p)=>p))
                          }
                        },className:"bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-indigo-100 transition-colors shrink-0",children:"Chọn"
                      })]
                    })]
                  }),e.jsxs("div",{
                    className:"space-y-1",children:[e.jsx("label",{
                      className:"text-[10px] font-bold text-slate-500 uppercase",children:"Tổng"
                    }),e.jsxs("div",{
                      className:"py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700",children:[ue.length," / ",Pe.length," SP"]
                    })]
                  })]
                })]
              }),De.length>0?e.jsxs("div",{
                className:"bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]",children:[e.jsx("div",{
                  className:"p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0",children:e.jsxs("div",{
                    className:"flex items-center gap-3",children:[e.jsx("div",{
                      className:"w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600",children:e.jsx(mt,{
                        size:16
                      })
                    }),e.jsx("h3",{
                      className:"text-sm font-black text-slate-800 uppercase tracking-tight",children:"DỮ LIỆU BẢNG GIÁ"
                    })]
                  })
                }),e.jsx("div",{
                  className:"overflow-auto flex-1 p-0",children:e.jsxs("table",{
                    className:"w-full text-left border-collapse border border-slate-200",children:[e.jsx("thead",{
                      className:"sticky top-0 z-10",children:e.jsxs("tr",{
                        className:"bg-slate-100 shadow-sm",children:[e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 w-10 text-center",children:e.jsx("input",{
                            type:"checkbox",className:"w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer",checked:ue.length>0&&ye.length===ue.length,onChange:Ns
                          })
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200",children:"STT"
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center",children:"SL"
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200",children:"Mã SP"
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200",children:"Tên sản phẩm"
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200",children:"Ngành hàng"
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-28",children:"Giá gốc"
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-28",children:"Giá giảm"
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center w-8",children:"Xóa"
                        })]
                      })
                    }),e.jsx("tbody",{
                      className:"divide-y divide-slate-100",children:ue.map((s,l)=>e.jsxs("tr",{
                        className:`hover:bg-slate-50 transition-colors ${
                          s.isManual?"bg-amber-50/30":""
                        }`,children:[e.jsx("td",{
                          className:"py-2 px-3 text-center",children:e.jsx("input",{
                            type:"checkbox",className:"w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer",checked:ye.includes(l),onChange:()=>vs(l)
                          })
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-[11px] font-medium text-slate-500",children:l+1
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-center",children:e.jsx("input",{
                            type:"number",min:"0",className:"w-12 bg-white border border-slate-200 text-slate-700 py-1 px-1 rounded-lg text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center",value:Xe[l]??0,onChange:c=>js(l,parseInt(c.target.value)||0)
                          })
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-[11px] font-bold text-indigo-600",children:s.maSanPham||s.productCode||"-"
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-[11px] font-bold text-slate-800",children:s.name
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-left",children:e.jsx("input",{
                            type:"text",className:"w-28 bg-white border border-slate-100 text-slate-700 py-0.5 px-1.5 rounded-lg text-[11px] font-bold focus:border-slate-300",value:s.nganhHang||"",onChange:c=>en(l,c.target.value),placeholder:"Tên ngành hàng..."
                          })
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-right",children:e.jsx("input",{
                            type:"text",className:"w-24 bg-white border border-slate-100 text-slate-700 py-0.5 px-1.5 rounded-lg text-[11px] font-bold text-right focus:border-slate-300",value:Number(s.originalPrice||0).toLocaleString("vi-VN")+" đ",onChange:c=>wt(l,"originalPrice",c.target.value)
                          })
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-right",children:e.jsx("input",{
                            type:"text",className:"w-24 bg-white border border-slate-100 text-red-600 py-0.5 px-1.5 rounded-lg text-[11px] font-bold text-right focus:border-slate-300",value:Number(s.discountPrice||0).toLocaleString("vi-VN")+" đ",onChange:c=>wt(l,"discountPrice",c.target.value)
                          })
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-center",children:e.jsx("button",{
                            onClick:()=>ks(l),className:"text-slate-400 hover:text-red-500 transition-colors",children:e.jsx(et,{
                              size:12
                            })
                          })
                        })]
                      },l))
                    })]
                  })
                })]
              }):e.jsxs("div",{
                className:"bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center",children:[e.jsx("div",{
                  className:"w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4",children:e.jsx(Ot,{
                    size:28,className:"text-indigo-400"
                  })
                }),e.jsx("h3",{
                  className:"text-base font-black text-slate-700 mb-2",children:"Chưa có dữ liệu"
                }),e.jsxs("p",{
                  className:"text-xs text-slate-400 font-medium max-w-md mx-auto",children:["Hãy tải file ",e.jsx("strong",{
                    children:"Tồn Kho"
                  })," và ",e.jsx("strong",{
                    children:"Bảng Giá"
                  })," từ khu vực phía trên để hiển thị danh sách sản phẩm tại đây."]
                })]
              })]
            })]
          },"all-sticker"),h==="sticker-mln"&&e.jsxs(lt.div,{
            initial:{
              opacity:0,x:20
            },animate:{
              opacity:1,x:0
            },exit:{
              opacity:0,x:-20
            },className:"space-y-6",children:[e.jsx("div",{
              className:"sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm pb-3 -mt-2 pt-2",children:e.jsxs("div",{
                className:"flex gap-3",children:[e.jsxs("button",{
                  onClick:()=>N("all-sticker"),className:"flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 shadow-sm",children:[e.jsx("span",{
                    className:"text-lg",children:"🎪"
                  }),"EVENT"]
                }),e.jsxs("button",{
                  onClick:()=>N("sticker-lk"),className:"flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 shadow-sm",children:[e.jsx("span",{
                    className:"text-lg",children:"🔊"
                  }),"LOA KÉO"]
                }),e.jsxs("button",{
                  onClick:()=>N("sticker-ce"),className:"flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 shadow-sm",children:[e.jsx("span",{
                    className:"text-lg",children:"🏢"
                  }),"IN STICKER CE"]
                }),e.jsxs("button",{
                  onClick:()=>N("sticker-mln"),className:"flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 border-teal-400 bg-teal-50 text-teal-700 shadow-sm",children:[e.jsx("span",{
                    className:"text-lg",children:"💧"
                  }),"MLN"]
                })]
              })
            }),e.jsxs("div",{
              className:"grid grid-cols-1 lg:grid-cols-2 gap-4",children:[e.jsxs("div",{
                className:"bg-white rounded-3xl shadow-sm border border-slate-200 p-5",children:[e.jsxs("div",{
                  className:"flex items-center gap-3 mb-4",children:[e.jsx("div",{
                    className:"w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-teal-100",children:e.jsx(Ss,{
                      size:20
                    })
                  }),e.jsxs("div",{
                    children:[e.jsx("h2",{
                      className:"text-base font-black text-slate-800 uppercase tracking-tight",children:"NHẬP DỮ LIỆU MLN"
                    }),e.jsx("p",{
                      className:"text-[11px] text-slate-400 font-medium",children:"Tải file Tồn Kho & Bảng Giá để in sticker"
                    })]
                  })]
                }),e.jsxs("div",{
                  className:"grid grid-cols-3 gap-3",children:[e.jsx("input",{
                    type:"file",accept:".xlsx, .xls",className:"hidden",ref:st,onChange:s=>dt(s,"inventory")
                  }),e.jsxs("button",{
                    onClick:()=>{
                      var s;
                      return(s=st.current)==null?void 0:s.click()
                    },className:`w-full py-3 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                      y||g?"border-2 border-indigo-500 bg-indigo-500 text-white hover:bg-indigo-600":"border-2 border-indigo-400 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    }`,children:[e.jsx("span",{
                      className:"text-sm",children:y||g?"✅":"📥"
                    }),y||g?"Đã tải Tồn Kho":"Tải Tồn Kho"]
                  }),e.jsx("input",{
                    type:"file",accept:".xlsx, .xls",className:"hidden",ref:nt,onChange:s=>dt(s,"price")
                  }),e.jsxs("button",{
                    onClick:()=>{
                      var s;
                      return(s=nt.current)==null?void 0:s.click()
                    },className:`w-full py-3 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                      we||k?"border-2 border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600":"border-2 border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`,children:[e.jsx("span",{
                      className:"text-sm",children:we||k?"✅":"📥"
                    }),we||k?"Đã tải Bảng Giá":"Tải Bảng Giá"]
                  }),e.jsxs("button",{
                    onClick:jt,className:"w-full py-3 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-red-400 bg-red-50 text-red-700 hover:bg-red-100 shadow-sm cursor-pointer",children:[e.jsx("span",{
                      className:"text-sm",children:"🗑️"
                    }),"Xóa dữ liệu"]
                  })]
                })]
              }),e.jsxs("div",{
                className:"bg-white rounded-3xl shadow-sm border border-slate-200 p-5",children:[e.jsxs("div",{
                  className:"flex items-center justify-between mb-4",children:[e.jsxs("div",{
                    className:"flex items-center gap-2",children:[e.jsx("div",{
                      className:"w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-lg shadow-amber-100",children:e.jsx(mt,{
                        size:20
                      })
                    }),e.jsxs("div",{
                      children:[e.jsx("h2",{
                        className:"text-base font-black text-slate-800 uppercase tracking-tight",children:"IN STICKER THỦ CÔNG"
                      }),e.jsx("p",{
                        className:"text-[11px] text-slate-400 font-medium",children:"Nhập trực tiếp không cần file"
                      })]
                    })]
                  }),e.jsxs("button",{
                    onClick:jt,className:"py-2 px-4 rounded-full text-[10px] font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 border-2 border-red-300 bg-red-50 text-red-600 hover:bg-red-100 shadow-sm cursor-pointer",children:[e.jsx("span",{
                      className:"text-xs",children:"🗑️"
                    }),"Xóa dữ liệu"]
                  })]
                }),e.jsxs("div",{
                  className:"space-y-3",children:[e.jsxs("div",{
                    className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{
                      className:"space-y-1",children:[e.jsx("label",{
                        className:"text-[10px] font-bold text-slate-500 uppercase",children:"Ngành hàng"
                      }),e.jsx("input",{
                        type:"text",placeholder:"VD: MÁY LỌC NƯỚC",value:Ce.nganhHang||"",onChange:s=>Be(l=>({
                          ...l,nganhHang:s.target.value
                        })),className:"w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                      })]
                    }),e.jsxs("div",{
                      className:"space-y-1",children:[e.jsx("label",{
                        className:"text-[10px] font-bold text-slate-500 uppercase",children:"Tên sản phẩm"
                      }),e.jsx("input",{
                        type:"text",placeholder:"Tên SP...",value:Ce.name,onChange:s=>Be(l=>({
                          ...l,name:s.target.value
                        })),className:"w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                      })]
                    })]
                  }),e.jsxs("div",{
                    className:"grid grid-cols-3 gap-3",children:[e.jsxs("div",{
                      className:"space-y-1",children:[e.jsx("label",{
                        className:"text-[10px] font-bold text-slate-500 uppercase",children:"Giá gốc"
                      }),e.jsx("input",{
                        type:"text",placeholder:"Giá gốc...",value:Ce.originalPrice,onChange:s=>Be(l=>({
                          ...l,originalPrice:s.target.value
                        })),className:"w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                      })]
                    }),e.jsxs("div",{
                      className:"space-y-1",children:[e.jsx("label",{
                        className:"text-[10px] font-bold text-slate-500 uppercase",children:"Giá sau giảm"
                      }),e.jsx("input",{
                        type:"text",placeholder:"Giá giảm...",value:Ce.discountPrice,onChange:s=>Be(l=>({
                          ...l,discountPrice:s.target.value
                        })),className:"w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                      })]
                    }),e.jsxs("div",{
                      className:"space-y-1",children:[e.jsx("label",{
                        className:"text-[10px] font-bold text-slate-500 uppercase",children:"Ngày hết hạn"
                      }),e.jsx("input",{
                        type:"text",placeholder:"VD: 31/05/2026",value:Ce.endDate||"",onChange:s=>Be(l=>({
                          ...l,endDate:s.target.value
                        })),className:"w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                      })]
                    })]
                  }),e.jsxs("div",{
                    className:"grid grid-cols-2 gap-3",children:[e.jsxs("button",{
                      onClick:ws,className:"w-full py-3 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-sm",children:[e.jsx("span",{
                        className:"text-base",children:"📂"
                      }),"THÊM VÀO LIST"]
                    }),e.jsxs("label",{
                      className:"w-full py-3 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm cursor-pointer",children:[e.jsx("span",{
                        className:"text-base",children:"📤"
                      }),"FILE EXCEL ","->","  LIST",e.jsx("input",{
                        type:"file",className:"hidden",accept:".xlsx, .xls",onChange:s=>{
                          dt(s,"price",!0),s.target.value=""
                        }
                      })]
                    })]
                  }),e.jsxs("button",{
                    onClick:()=>{
                      const s=[{
                        "NGÀNH HÀNG":"MÁY LỌC NƯỚC","TÊN SẢN PHẨM":"Karofi KAQ-X18 11 lõi","GIÁ GỐC":699e4,"GIÁ SAU GIẢM":499e4,"NGÀY HẾT HẠN":"31/05/2026"
                      }],l=Ie.json_to_sheet(s),c=Ie.book_new();
                      Ie.book_append_sheet(c,l,"MLN_Template"),Bt(c,"Mau_In_Sticker_MLN.xlsx"),a("Đã tải file Excel mẫu MLN!","success")
                    },className:"w-full py-3 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-sm",children:[e.jsx("span",{
                      className:"text-base",children:"📄"
                    }),"XUẤT FILE MẪU"]
                  })]
                })]
              })]
            }),e.jsxs("div",{
              className:"bg-white rounded-3xl shadow-sm border border-slate-200 p-5",children:[e.jsxs("div",{
                className:"flex items-center gap-3 mb-5",children:[e.jsx("div",{
                  className:"w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-teal-100",children:e.jsx(We,{
                    size:20
                  })
                }),e.jsxs("div",{
                  children:[e.jsx("h2",{
                    className:"text-base font-black text-slate-800 uppercase tracking-tight",children:"CHỌN BỐ CỤC IN MLN"
                  }),e.jsx("p",{
                    className:"text-[11px] text-slate-400 font-medium",children:"Nhấp vào nút bên dưới để in trực tiếp kiểu Máy Lọc Nước"
                  })]
                })]
              }),e.jsx("div",{
                className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:e.jsxs("div",{
                  className:"rounded-2xl border-2 border-slate-200 hover:border-teal-400 hover:shadow-lg transition-all overflow-hidden group",children:[e.jsx("div",{
                    className:"h-[200px] bg-gradient-to-br from-slate-50 to-teal-50/30 flex items-center justify-center overflow-hidden relative",children:e.jsx("div",{
                      className:"pointer-events-none select-none",style:{
                        transform:"scale(0.17)",transformOrigin:"center",width:"148.5mm",height:"210mm",flexShrink:0
                      },children:e.jsx(bt,{
                        item:{
                          name:"Karofi KAQ-X18 11 lõi",originalPrice:699e4,discountPrice:499e4,maSanPham:"SP001",nganhHang:"MÁY LỌC NƯỚC",endDate:"31/05/2026"
                        },style:"display",layout:"1",showPromoLabel:!1
                      })
                    })
                  }),e.jsxs("div",{
                    className:"p-4 bg-white border-t border-slate-100",children:[e.jsx("h4",{
                      className:"text-sm font-black text-teal-600 uppercase tracking-wider mb-3 text-center",children:"Kiểu MLN (A5 Đứng)"
                    }),e.jsx("div",{
                      className:"grid grid-cols-1 gap-2",children:e.jsxs("button",{
                        onClick:()=>{
                          ht({
                            style:"display",layout:"1",showPromoLabel:!1
                          }),qe(!0)
                        },disabled:Pe.length===0||ye.length===0,className:"w-full py-3 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white shadow-md disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none",children:[e.jsx("span",{
                          className:"text-sm",children:"🖨️"
                        }),"1 Sticker / Trang (A5 Đứng)"]
                      })
                    })]
                  })]
                })
              }),ye.length>0&&e.jsxs("div",{
                className:"mt-4 flex items-center gap-3 text-xs",children:[e.jsxs("span",{
                  className:"px-3 py-1 rounded-full bg-teal-50 text-teal-700 font-black border border-teal-200",children:["✅ Đã chọn: ",ye.length," / ",ue.length," sản phẩm"]
                }),e.jsxs("span",{
                  className:"text-[11px] font-black text-teal-600 uppercase tracking-wider",children:["(Tổng: ",ye.reduce((s,l)=>s+(Xe[l]||1),0)," sticker)"]
                })]
              })]
            }),e.jsxs("div",{
              className:"space-y-4",children:[e.jsxs("div",{
                className:"bg-white rounded-3xl shadow-sm border border-slate-200 p-5",children:[e.jsxs("div",{
                  className:"flex items-center justify-between mb-4",children:[e.jsxs("div",{
                    className:"flex items-center gap-4",children:[e.jsx("h3",{
                      className:"text-sm font-black text-slate-800 uppercase tracking-tight",children:"BỘ LỌC TỒN KHO"
                    }),e.jsxs("label",{
                      className:"flex items-center gap-2 cursor-pointer",children:[e.jsx("input",{
                        type:"checkbox",className:"w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500",checked:ee.onlyInventory,onChange:s=>_e(l=>({
                          ...l,onlyInventory:s.target.checked
                        }))
                      }),e.jsx("span",{
                        className:"text-xs font-medium text-slate-600",children:"Có trong tồn kho"
                      })]
                    })]
                  }),e.jsx("button",{
                    onClick:()=>{
                      _e({
                        maSieuThi:"",nganhHang:"",nhomHang:[],onlyInventory:!1,selectedQrs:null,sortOrder:""
                      }),vt("")
                    },className:"text-xs font-bold text-blue-600 hover:underline",children:"Xóa bộ lọc"
                  })]
                }),e.jsxs("div",{
                  className:"grid grid-cols-2 md:grid-cols-4 gap-3",children:[e.jsxs("div",{
                    className:"space-y-1",children:[e.jsx("label",{
                      className:"text-[10px] font-bold text-slate-500 uppercase",children:"Ngành hàng"
                    }),e.jsxs("select",{
                      value:ee.nganhHang,onChange:s=>_e(l=>({
                        ...l,nganhHang:s.target.value,nhomHang:[]
                      })),className:"w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500",children:[e.jsx("option",{
                        value:"",children:"Tất cả"
                      }),ys.map(s=>e.jsx("option",{
                        value:s,children:s
                      },s))]
                    })]
                  }),e.jsxs("div",{
                    className:"space-y-1",children:[e.jsx("label",{
                      className:"text-[10px] font-bold text-slate-500 uppercase",children:"Sắp xếp giá"
                    }),e.jsxs("select",{
                      value:ee.sortOrder,onChange:s=>_e(l=>({
                        ...l,sortOrder:s.target.value
                      })),className:"w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500",children:[e.jsx("option",{
                        value:"",children:"Mặc định"
                      }),e.jsx("option",{
                        value:"asc",children:"Thấp → Cao"
                      }),e.jsx("option",{
                        value:"desc",children:"Cao → Thấp"
                      })]
                    })]
                  }),e.jsxs("div",{
                    className:"space-y-1",children:[e.jsx("label",{
                      className:"text-[10px] font-bold text-slate-500 uppercase",children:"Số lượng cần in"
                    }),e.jsxs("div",{
                      className:"flex gap-1.5",children:[e.jsx("input",{
                        type:"number",min:"0",max:ue.length,placeholder:"VD: 5",value:Nt,onChange:s=>vt(s.target.value),className:"w-full bg-white border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                      }),e.jsx("button",{
                        onClick:()=>{
                          const s=parseInt(Nt);
                          if(!isNaN(s)&&s>=0){
                            const l=Math.min(s,ue.length);
                            ct(Array.from({
                              length:l
                            },(c,p)=>p))
                          }
                        },className:"bg-teal-50 text-teal-600 px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-teal-100 transition-colors shrink-0",children:"Chọn"
                      })]
                    })]
                  }),e.jsxs("div",{
                    className:"space-y-1",children:[e.jsx("label",{
                      className:"text-[10px] font-bold text-slate-500 uppercase",children:"Tổng"
                    }),e.jsxs("div",{
                      className:"py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700",children:[ue.length," / ",Pe.length," SP"]
                    })]
                  })]
                })]
              }),De.length>0?e.jsxs("div",{
                className:"bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]",children:[e.jsx("div",{
                  className:"p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0",children:e.jsxs("div",{
                    className:"flex items-center gap-3",children:[e.jsx("div",{
                      className:"w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600",children:e.jsx(mt,{
                        size:16
                      })
                    }),e.jsx("h3",{
                      className:"text-sm font-black text-slate-800 uppercase tracking-tight",children:"DỮ LIỆU BẢNG GIÁ MLN"
                    })]
                  })
                }),e.jsx("div",{
                  className:"overflow-auto flex-1 p-0",children:e.jsxs("table",{
                    className:"w-full text-left border-collapse border border-slate-200",children:[e.jsx("thead",{
                      className:"sticky top-0 z-10",children:e.jsxs("tr",{
                        className:"bg-slate-100 shadow-sm",children:[e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 w-10 text-center",children:e.jsx("input",{
                            type:"checkbox",className:"w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer",checked:ue.length>0&&ye.length===ue.length,onChange:Ns
                          })
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200",children:"STT"
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center",children:"SL"
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200",children:"Mã SP"
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200",children:"Tên sản phẩm"
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200",children:"Ngành hàng"
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-28",children:"Giá gốc"
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-28",children:"Giá giảm"
                        }),e.jsx("th",{
                          className:"py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center w-8",children:"Xóa"
                        })]
                      })
                    }),e.jsx("tbody",{
                      className:"divide-y divide-slate-100",children:ue.map((s,l)=>e.jsxs("tr",{
                        className:`hover:bg-slate-50 transition-colors ${
                          s.isManual?"bg-amber-50/30":""
                        }`,children:[e.jsx("td",{
                          className:"py-2 px-3 text-center",children:e.jsx("input",{
                            type:"checkbox",className:"w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer",checked:ye.includes(l),onChange:()=>vs(l)
                          })
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-[11px] font-medium text-slate-500",children:l+1
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-center",children:e.jsx("input",{
                            type:"number",min:"0",className:"w-12 bg-white border border-slate-200 text-slate-700 py-1 px-1 rounded-lg text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 text-center",value:Xe[l]??0,onChange:c=>js(l,parseInt(c.target.value)||0)
                          })
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-[11px] font-bold text-teal-600",children:s.maSanPham||s.productCode||"-"
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-[11px] font-bold text-slate-800",children:s.name
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-left",children:e.jsx("input",{
                            type:"text",className:"w-28 bg-white border border-slate-100 text-slate-700 py-0.5 px-1.5 rounded-lg text-[11px] font-bold focus:border-slate-300",value:s.nganhHang||"",onChange:c=>en(l,c.target.value),placeholder:"Tên ngành hàng..."
                          })
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-right",children:e.jsx("input",{
                            type:"text",className:"w-24 bg-white border border-slate-100 text-slate-700 py-0.5 px-1.5 rounded-lg text-[11px] font-bold text-right focus:border-slate-300",value:Number(s.originalPrice||0).toLocaleString("vi-VN")+" đ",onChange:c=>wt(l,"originalPrice",c.target.value)
                          })
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-right",children:e.jsx("input",{
                            type:"text",className:"w-24 bg-white border border-slate-100 text-red-600 py-0.5 px-1.5 rounded-lg text-[11px] font-bold text-right focus:border-slate-300",value:Number(s.discountPrice||0).toLocaleString("vi-VN")+" đ",onChange:c=>wt(l,"discountPrice",c.target.value)
                          })
                        }),e.jsx("td",{
                          className:"py-2 px-3 text-center",children:e.jsx("button",{
                            onClick:()=>ks(l),className:"text-slate-400 hover:text-red-500 transition-colors",children:e.jsx(et,{
                              size:12
                            })
                          })
                        })]
                      },l))
                    })]
                  })
                })]
              }):e.jsxs("div",{
                className:"bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center",children:[e.jsx("div",{
                  className:"w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4",children:e.jsx(Ot,{
                    size:28,className:"text-teal-400"
                  })
                }),e.jsx("h3",{
                  className:"text-base font-black text-slate-700 mb-2",children:"Chưa có dữ liệu"
                }),e.jsxs("p",{
                  className:"text-xs text-slate-400 font-medium max-w-md mx-auto",children:["Hãy tải file ",e.jsx("strong",{
                    children:"Tồn Kho"
                  })," và ",e.jsx("strong",{
                    children:"Bảng Giá"
                  })," từ khu vực phía trên để hiển thị danh sách sản phẩm tại đây."]
                })]
              })]
            })]
          },"sticker-mln"),h==="sticker-mau"&&e.jsx(lt.div,{
            initial:{
              opacity:0,x:20
            },animate:{
              opacity:1,x:0
            },exit:{
              opacity:0,x:-20
            },children:e.jsx(Rl,{
              
            })
          },"sticker-mau"),(h==="sticker-event"||h==="sticker"||h==="sticker-ce"||h==="sticker-lk")&&e.jsxs(lt.div,{
            initial:{
              opacity:0,x:20
            },animate:{
              opacity:1,x:0
            },exit:{
              opacity:0,x:-20
            },children:[(h==="sticker-lk"||h==="sticker-ce")&&e.jsx("div",{
              className:"sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm pb-4 -mt-2 pt-2",children:e.jsxs("div",{
                className:"flex gap-3",children:[e.jsxs("button",{
                  onClick:()=>N("all-sticker"),className:"flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 shadow-sm",children:[e.jsx("span",{
                    className:"text-lg",children:"🎪"
                  }),"EVENT"]
                }),e.jsxs("button",{
                  onClick:()=>N("sticker-lk"),className:`flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 shadow-sm ${
                    h==="sticker-lk"?"border-violet-400 bg-violet-50 text-violet-700":"border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                  }`,children:[e.jsx("span",{
                    className:"text-lg",children:"🔊"
                  }),"LOA KÉO"]
                }),e.jsxs("button",{
                  onClick:()=>N("sticker-ce"),className:`flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 shadow-sm ${
                    h==="sticker-ce"?"border-blue-400 bg-blue-50 text-blue-700":"border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  }`,children:[e.jsx("span",{
                    className:"text-lg",children:"🏢"
                  }),"IN STICKER CE"]
                })]
              })
            }),e.jsxs("div",{
              className:"grid grid-cols-1 lg:grid-cols-3 gap-6",children:[e.jsxs("div",{
                className:"col-span-1 space-y-6",children:[h==="sticker-event"||h==="sticker-ce"||h==="sticker-lk"?e.jsxs("div",{
                  className:"bg-white rounded-3xl shadow-sm border border-slate-200 p-5",children:[e.jsxs("div",{
                    className:"flex items-center justify-between mb-4",children:[e.jsxs("h3",{
                      className:"text-sm font-bold text-slate-700",children:["Thông tin người in ",e.jsx("span",{
                        className:"text-red-500",children:"*"
                      })]
                    }),e.jsxs("button",{
                      onClick:jt,className:"flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors",children:[e.jsx(et,{
                        size:14
                      }),e.jsx("span",{
                        className:"text-xs font-medium",children:"Xóa dữ liệu"
                      })]
                    })]
                  }),e.jsxs("div",{
                    className:"flex items-center gap-2 mb-6",children:[e.jsx("span",{
                      className:"text-2xl font-black text-slate-800",children:"43751"
                    }),e.jsx("button",{
                      className:"text-sm text-blue-600 hover:underline",children:"(Sửa)"
                    })]
                  }),e.jsx("div",{
                    className:"h-px bg-slate-100 w-full mb-6"
                  }),e.jsx("div",{
                    className:"flex items-center justify-between mb-4",children:e.jsx("h3",{
                      className:"text-sm font-bold text-slate-700",children:"Nhập dữ liệu (Admin)"
                    })
                  }),e.jsxs("div",{
                    className:"grid grid-cols-2 gap-3",children:[e.jsx("input",{
                      type:"file",accept:".xlsx, .xls",className:"hidden",ref:st,onChange:s=>dt(s,"inventory")
                    }),e.jsxs("button",{
                      onClick:()=>{
                        var s;
                        return(s=st.current)==null?void 0:s.click()
                      },className:`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all relative ${
                        y||g?"border-indigo-200 bg-indigo-50 text-indigo-700":"border-indigo-100 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-50"
                      }`,children:[y||g?e.jsx(Cs,{
                        size:24,strokeWidth:1.5,className:"text-indigo-500"
                      }):e.jsx(rn,{
                        size:24,strokeWidth:1.5
                      }),e.jsxs("div",{
                        className:"text-center",children:[e.jsx("div",{
                          className:"text-[10px] font-black uppercase tracking-wider",children:y||g?"Đã tải Tồn Kho":"Tải Tồn Kho"
                        }),g&&!y&&e.jsxs("div",{
                          className:"text-[8px] font-bold text-indigo-400 mt-1",children:["Cập nhật: ",g]
                        }),y&&e.jsx("div",{
                          className:"text-[8px] font-bold text-indigo-400 mt-1 truncate max-w-[80px]",children:y.name
                        })]
                      })]
                    }),e.jsx("input",{
                      type:"file",accept:".xlsx, .xls",className:"hidden",ref:nt,onChange:s=>dt(s,"price")
                    }),e.jsxs("button",{
                      onClick:()=>{
                        var s;
                        return(s=nt.current)==null?void 0:s.click()
                      },className:`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-dashed transition-all relative ${
                        we||k?"border-emerald-400 bg-emerald-50 text-emerald-700":"border-emerald-300 bg-emerald-50/30 text-emerald-600 hover:bg-emerald-50/50"
                      }`,children:[we||k?e.jsx(Cs,{
                        size:24,strokeWidth:1.5,className:"text-emerald-500"
                      }):e.jsx(mt,{
                        size:24,strokeWidth:1.5
                      }),e.jsxs("div",{
                        className:"text-center",children:[e.jsx("div",{
                          className:"text-[10px] font-black uppercase tracking-wider",children:we||k?"Đã tải Bảng Giá":"Tải Bảng Giá"
                        }),k&&!we&&e.jsxs("div",{
                          className:"text-[8px] font-bold text-emerald-500 mt-1",children:["Cập nhật: ",k]
                        }),we&&e.jsx("div",{
                          className:"text-[8px] font-bold text-emerald-500 mt-1 truncate max-w-[80px]",children:we.name
                        })]
                      })]
                    })]
                  }),(h==="sticker-ce"||h==="sticker-lk"||h==="sticker-event")&&e.jsx("div",{
                    className:"mt-3",children:e.jsxs("button",{
                      onClick:ua,className:"w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-100 uppercase tracking-wider",children:[e.jsx(ln,{
                        size:16
                      }),"Quét QR Điện thoại"]
                    })
                  })]
                }):e.jsxs("div",{
                  className:"bg-white rounded-3xl shadow-sm border border-slate-200 p-5",children:[e.jsxs("div",{
                    className:"flex items-center justify-between mb-4",children:[e.jsxs("div",{
                      className:"flex items-center gap-2",children:[e.jsx("div",{
                        className:"w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600",children:e.jsx(mt,{
                          size:16
                        })
                      }),e.jsx("h3",{
                        className:"text-sm font-bold text-slate-700 uppercase tracking-tight",children:"In Sticker Thủ Công"
                      })]
                    }),e.jsxs("button",{
                      onClick:jt,className:"flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors",children:[e.jsx(et,{
                        size:14
                      }),e.jsx("span",{
                        className:"text-xs font-medium",children:"Xóa dữ liệu"
                      })]
                    })]
                  }),e.jsxs("div",{
                    className:"space-y-3",children:[e.jsxs("div",{
                      className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{
                        className:"space-y-1",children:[e.jsx("label",{
                          className:"text-[10px] font-bold text-slate-500 uppercase",children:"Mã sản phẩm"
                        }),e.jsx("input",{
                          type:"text",placeholder:"Mã SP...",value:Ce.productCode,onChange:s=>Be(l=>({
                            ...l,productCode:s.target.value
                          })),className:"w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        })]
                      }),e.jsxs("div",{
                        className:"space-y-1",children:[e.jsx("label",{
                          className:"text-[10px] font-bold text-slate-500 uppercase",children:"Tên sản phẩm"
                        }),e.jsx("input",{
                          type:"text",placeholder:"Tên SP...",value:Ce.name,onChange:s=>Be(l=>({
                            ...l,name:s.target.value
                          })),className:"w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        })]
                      })]
                    }),e.jsxs("div",{
                      className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{
                        className:"space-y-1",children:[e.jsx("label",{
                          className:"text-[10px] font-bold text-slate-500 uppercase",children:"Giá gốc"
                        }),e.jsx("input",{
                          type:"text",placeholder:"Giá gốc...",value:Ce.originalPrice,onChange:s=>Be(l=>({
                            ...l,originalPrice:s.target.value
                          })),className:"w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        })]
                      }),e.jsxs("div",{
                        className:"space-y-1",children:[e.jsx("label",{
                          className:"text-[10px] font-bold text-slate-500 uppercase",children:"Giá sau giảm"
                        }),e.jsx("input",{
                          type:"text",placeholder:"Giá giảm...",value:Ce.discountPrice,onChange:s=>Be(l=>({
                            ...l,discountPrice:s.target.value
                          })),className:"w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        })]
                      })]
                    }),e.jsxs("div",{
                      className:"grid grid-cols-2 gap-3 mb-3",children:[e.jsxs("button",{
                        onClick:ws,className:"w-full py-3 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-sm",children:[e.jsx("span",{
                          className:"text-base",children:"📂"
                        }),"THÊM VÀO LIST"]
                      }),e.jsxs("label",{
                        className:"w-full py-3 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm cursor-pointer",children:[e.jsx("span",{
                          className:"text-base",children:"📤"
                        }),"FILE EXCEL ","->","  LIST",e.jsx("input",{
                          type:"file",className:"hidden",accept:".xlsx, .xls",onChange:s=>{
                            dt(s,"price",!0),s.target.value=""
                          }
                        })]
                      })]
                    }),e.jsxs("button",{
                      onClick:()=>{
                        const s=[{
                          "MÃ SẢN PHẨM":"SP001","TÊN SẢN PHẨM":"Ví dụ Tên Sản Phẩm","GIÁ GỐC":1e6,"GIÁ SAU GIẢM":5e5
                        }],l=Ie.json_to_sheet(s),c=Ie.book_new();
                        Ie.book_append_sheet(c,l,"StickerTemplate"),Bt(c,"Mau_In_Sticker_Event.xlsx"),a("Đã tải file Excel mẫu!","success")
                      },className:"w-full py-3 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-sm",children:[e.jsx("span",{
                        className:"text-base",children:"📄"
                      }),"XUẤT FILE MẪU"]
                    })]
                  })]
                }),e.jsxs("button",{
                  onClick:ga,disabled:Pe.length===0||ye.length===0,className:"w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-slate-900 rounded-full text-base font-extrabold uppercase tracking-wide transition-all shadow-md",children:[e.jsx("span",{
                    className:"text-xl",children:"🖨️"
                  }),"BẤM ĐỂ IN (",ye.length,")"]
                })]
              }),e.jsxs("div",{
                className:"col-span-1 lg:col-span-2 space-y-6",children:[e.jsxs("div",{
                  className:"bg-white rounded-3xl shadow-sm border border-slate-200 p-6",children:[e.jsxs("div",{
                    className:"flex items-center justify-between mb-6",children:[e.jsxs("div",{
                      className:"flex items-center gap-4",children:[e.jsx("h3",{
                        className:"text-base font-black text-slate-800 uppercase tracking-tight",children:"BỘ LỌC TỒN KHO"
                      }),e.jsxs("label",{
                        className:"flex items-center gap-2 cursor-pointer",children:[e.jsx("input",{
                          type:"checkbox",className:"w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500",checked:ee.onlyInventory,onChange:s=>_e(l=>({
                            ...l,onlyInventory:s.target.checked
                          }))
                        }),e.jsx("span",{
                          className:"text-sm font-medium text-slate-600",children:"Có trong tồn kho"
                        })]
                      })]
                    }),e.jsx("button",{
                      onClick:()=>{
                        _e({
                          maSieuThi:"",nganhHang:"",nhomHang:[],onlyInventory:!1,selectedQrs:null,sortOrder:""
                        }),vt("")
                      },className:"text-sm font-medium text-blue-600 hover:underline",children:"Xóa bộ lọc"
                    })]
                  }),e.jsxs("div",{
                    className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4",children:[e.jsxs("div",{
                      className:"space-y-1.5",children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500",children:"Ngành hàng"
                      }),e.jsxs("div",{
                        className:"relative",children:[e.jsxs("select",{
                          value:ee.nganhHang,onChange:s=>_e(l=>({
                            ...l,nganhHang:s.target.value,nhomHang:[]
                          })),className:"w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-3 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",children:[e.jsx("option",{
                            value:"",children:"Tất cả ngành hàng"
                          }),ys.map(s=>e.jsx("option",{
                            value:s,children:s
                          },s))]
                        }),e.jsx(Ts,{
                          size:16,className:"absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        })]
                      })]
                    }),e.jsxs("div",{
                      className:"space-y-1.5",children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500",children:"Nhóm hàng"
                      }),e.jsxs("div",{
                        className:"relative",onBlur:s=>{
                          s.currentTarget.contains(s.relatedTarget)||ms(!1)
                        },tabIndex:-1,children:[e.jsx("button",{
                          onClick:()=>ms(s=>!s),className:`w-full text-left bg-white border ${
                            ee.nhomHang.length>0?"border-indigo-400 ring-2 ring-indigo-100":"border-slate-200"
                          } text-slate-700 py-2.5 pl-3 pr-10 rounded-xl text-sm focus:outline-none`,children:ee.nhomHang.length===0?"Tất cả nhóm hàng":`Đã chọn ${
                            ee.nhomHang.length
                          } nhóm`
                        }),e.jsx(Ts,{
                          size:16,className:`absolute right-3 top-[14px] text-slate-400 pointer-events-none transition-transform ${
                            Qs?"rotate-180":""
                          }`
                        }),Qs&&e.jsxs("div",{
                          className:"absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto",children:[e.jsxs("label",{
                            className:"flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100",children:[e.jsx("input",{
                              type:"checkbox",checked:ee.nhomHang.length===0,onChange:()=>{
                                _e(s=>({
                                  ...s,nhomHang:[]
                                })),ms(!1)
                              },className:"w-4 h-4 rounded border-slate-300 text-indigo-600"
                            }),e.jsx("span",{
                              className:"text-sm font-medium text-slate-600",children:"Tất cả nhóm hàng"
                            })]
                          }),pa.map(s=>e.jsxs("label",{
                            className:"flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer",children:[e.jsx("input",{
                              type:"checkbox",checked:ee.nhomHang.includes(s),onChange:l=>{
                                l.target.checked?_e(c=>({
                                  ...c,nhomHang:[...c.nhomHang,s]
                                })):_e(c=>({
                                  ...c,nhomHang:c.nhomHang.filter(p=>p!==s)
                                }))
                              },className:"w-4 h-4 rounded border-slate-300 text-indigo-600"
                            }),e.jsx("span",{
                              className:"text-sm text-slate-700",children:s
                            })]
                          },s))]
                        })]
                      })]
                    }),e.jsxs("div",{
                      className:"space-y-1.5",children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500",children:"Sắp xếp giá giảm"
                      }),e.jsxs("div",{
                        className:"relative",children:[e.jsxs("select",{
                          value:ee.sortOrder,onChange:s=>_e(l=>({
                            ...l,sortOrder:s.target.value
                          })),className:"w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-3 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",children:[e.jsx("option",{
                            value:"",children:"Mặc định"
                          }),e.jsx("option",{
                            value:"asc",children:"Giá thấp đến cao"
                          }),e.jsx("option",{
                            value:"desc",children:"Giá cao đến thấp"
                          })]
                        }),e.jsx(La,{
                          size:16,className:"absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        })]
                      })]
                    }),e.jsxs("div",{
                      className:"space-y-1.5 col-span-1 relative",children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500",children:"Dữ liệu QR"
                      }),e.jsxs("div",{
                        className:"relative",children:[e.jsxs("button",{
                          type:"button",onClick:()=>Vs(s=>!s),className:"w-full flex items-center justify-between bg-white border border-slate-200 text-slate-700 py-2.5 px-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-left font-medium",children:[e.jsx("span",{
                            className:"truncate",children:ee.selectedQrs?ee.selectedQrs.length===0?"Không chọn":`Đã chọn (${
                              ee.selectedQrs.length
                            })`:`Tất cả (${
                              Et.length
                            })`
                          }),e.jsx(Ts,{
                            size:16,className:`text-slate-400 shrink-0 transition-transform ${
                              Ys?"rotate-180":""
                            }`
                          })]
                        }),Ys&&e.jsxs(e.Fragment,{
                          children:[e.jsx("div",{
                            className:"fixed inset-0 z-10",onClick:()=>Vs(!1)
                          }),e.jsxs("div",{
                            className:"absolute left-0 right-0 mt-1.5 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-white shadow-xl z-20 animate-[fadeIn_0.15s_ease-out]",children:[e.jsxs("label",{
                              className:"flex items-center gap-2.5 text-xs font-black text-slate-700 pb-1.5 border-b border-slate-200 cursor-pointer",children:[e.jsx("input",{
                                type:"checkbox",checked:!ee.selectedQrs||ee.selectedQrs.length===Et.length,onChange:s=>{
                                  s.target.checked?_e(l=>({
                                    ...l,selectedQrs:null
                                  })):_e(l=>({
                                    ...l,selectedQrs:[]
                                  }))
                                },className:"w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              }),e.jsx("span",{
                                children:"Chọn tất cả"
                              })]
                            }),Et.map(s=>{
                              const l=!ee.selectedQrs||ee.selectedQrs.includes(s);
                              return e.jsxs("label",{
                                className:"flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer hover:text-slate-800 transition-colors py-0.5",children:[e.jsx("input",{
                                  type:"checkbox",checked:l,onChange:c=>{
                                    const p=ee.selectedQrs||Et;
                                    let _;
                                    if(c.target.checked){
                                      if(_=[...p,s],_.length===Et.length){
                                        _e(z=>({
                                          ...z,selectedQrs:null
                                        }));
                                        return
                                      }
                                    }else _=p.filter(z=>z!==s);
                                    _e(z=>({
                                      ...z,selectedQrs:_
                                    }))
                                  },className:"w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                }),e.jsx("span",{
                                  className:"truncate font-mono",children:s||"(Trống)"
                                })]
                              },s)
                            })]
                          })]
                        })]
                      })]
                    }),e.jsxs("div",{
                      className:"space-y-1.5",children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500",children:"Số lượng cần in"
                      }),e.jsxs("div",{
                        className:"flex gap-2",children:[e.jsx("input",{
                          type:"number",min:"0",max:ue.length,placeholder:"VD: 5",value:Nt,onChange:s=>vt(s.target.value),className:"w-full bg-white border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        }),e.jsx("button",{
                          onClick:()=>{
                            const s=parseInt(Nt);
                            if(!isNaN(s)&&s>=0){
                              const l=Math.min(s,ue.length);
                              ct(Array.from({
                                length:l
                              },(c,p)=>p))
                            }
                          },className:"bg-indigo-50 text-indigo-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors shrink-0",children:"Chọn"
                        })]
                      })]
                    })]
                  })]
                }),De.length>0?e.jsxs("div",{
                  className:"bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]",children:[e.jsxs("div",{
                    className:"p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0",children:[e.jsxs("div",{
                      className:"flex items-center gap-3",children:[e.jsx("div",{
                        className:"w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600",children:e.jsx(mt,{
                          size:20
                        })
                      }),e.jsxs("div",{
                        children:[e.jsx("h3",{
                          className:"text-base font-black text-slate-800 uppercase tracking-tight",children:"DỮ LIỆU BẢNG GIÁ"
                        }),e.jsxs("p",{
                          className:"text-xs font-medium text-slate-500 mt-0.5",children:["Đã lọc ",ue.length," / ",Pe.length," sản phẩm"]
                        })]
                      })]
                    }),e.jsx("div",{
                      className:"flex items-center gap-3",children:D.text&&e.jsx("span",{
                        className:`text-xs font-bold ${
                          D.type==="success"?"text-emerald-600":"text-red-600"
                        }`,children:D.text
                      })
                    })]
                  }),e.jsx("div",{
                    className:"overflow-auto flex-1 p-0",children:e.jsxs("table",{
                      className:"w-full text-left border-collapse border border-slate-200",children:[e.jsx("thead",{
                        className:"sticky top-0 z-10",children:e.jsxs("tr",{
                          className:"bg-slate-100 shadow-sm",children:[e.jsx("th",{
                            className:"py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 w-10 text-center",children:e.jsx("input",{
                              type:"checkbox",className:"w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer",checked:ue.length>0&&ye.length===ue.length,onChange:Ns
                            })
                          }),e.jsx("th",{
                            className:"py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200",children:"STT"
                          }),e.jsx("th",{
                            className:"py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center",children:"SL In"
                          }),e.jsx("th",{
                            className:"py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200",children:"Mã SP"
                          }),e.jsx("th",{
                            className:"py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200",children:"Dữ liệu QR"
                          }),e.jsx("th",{
                            className:"py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200",children:"Tên sản phẩm"
                          }),e.jsx("th",{
                            className:"py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200",children:"Ngành hàng"
                          }),e.jsx("th",{
                            className:"py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200",children:"Nhóm hàng"
                          }),e.jsx("th",{
                            className:"py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-36",children:"Giá gốc"
                          }),e.jsx("th",{
                            className:"py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-36",children:"Giá giảm"
                          }),e.jsx("th",{
                            className:"py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center w-10",children:"Xóa"
                          })]
                        })
                      }),e.jsx("tbody",{
                        className:"divide-y divide-slate-100",children:ue.map((s,l)=>e.jsxs("tr",{
                          className:`hover:bg-slate-50 transition-colors ${
                            s.isManual?"bg-amber-50/30":""
                          }`,children:[e.jsx("td",{
                            className:"py-3 px-4 text-center",children:e.jsx("input",{
                              type:"checkbox",className:"w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer",checked:ye.includes(l),onChange:()=>vs(l)
                            })
                          }),e.jsx("td",{
                            className:"py-3 px-4 text-sm font-medium text-slate-500",children:l+1
                          }),e.jsx("td",{
                            className:"py-3 px-4 text-center",children:e.jsx("input",{
                              type:"number",min:"0",className:"w-16 bg-white border border-slate-200 text-slate-700 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center",value:Xe[l]??0,onChange:c=>js(l,parseInt(c.target.value)||0)
                            })
                          }),e.jsx("td",{
                            className:"py-3 px-4 text-sm font-bold text-indigo-600",children:s.maSanPham||s.productCode||"-"
                          }),e.jsx("td",{
                            className:"py-3 px-4 text-sm font-medium text-slate-500 font-mono tracking-wider",children:s.qrData||"-"
                          }),e.jsx("td",{
                            className:"py-3 px-4 text-sm font-bold text-slate-800",children:s.name
                          }),e.jsx("td",{
                            className:"py-3 px-4 text-sm font-medium text-slate-600",children:s.nganhHang||"-"
                          }),e.jsx("td",{
                            className:"py-3 px-4 text-sm font-medium text-slate-600",children:s.nhomHang||"-"
                          }),e.jsx("td",{
                            className:"py-3 px-4 text-sm font-medium text-slate-600 text-right",children:e.jsx("input",{
                              type:"text",className:"w-32 bg-white border border-slate-200 text-slate-700 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right",value:Number(s.originalPrice||0).toLocaleString("vi-VN")+" đ",onChange:c=>wt(l,"originalPrice",c.target.value)
                            })
                          }),e.jsx("td",{
                            className:"py-3 px-4 text-sm font-bold text-red-600 text-right",children:e.jsx("input",{
                              type:"text",className:"w-32 bg-white border border-slate-200 text-red-600 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right",value:Number(s.discountPrice||0).toLocaleString("vi-VN")+" đ",onChange:c=>wt(l,"discountPrice",c.target.value)
                            })
                          }),e.jsx("td",{
                            className:"py-3 px-4 text-center",children:e.jsx("button",{
                              onClick:()=>ks(l),className:"text-slate-400 hover:text-red-500 transition-colors",title:"Xóa dòng này",children:e.jsx(et,{
                                size:14
                              })
                            })
                          })]
                        },l))
                      })]
                    })
                  })]
                }):e.jsxs("div",{
                  className:"bg-white rounded-3xl shadow-sm border border-indigo-100 p-6 md:p-8 relative overflow-hidden",children:[e.jsx("div",{
                    className:"absolute inset-0 bg-indigo-50/30 pointer-events-none"
                  }),e.jsxs("div",{
                    className:"relative z-10",children:[e.jsxs("div",{
                      className:"flex items-start gap-4 mb-8",children:[e.jsx("div",{
                        className:"w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0",children:e.jsx(Ot,{
                          size:24,className:"text-indigo-600"
                        })
                      }),e.jsxs("div",{
                        children:[e.jsx("h2",{
                          className:"text-xl font-black text-slate-800 tracking-tight",children:"Hướng Dẫn Xuất File Giá Từ ERP"
                        }),e.jsx("p",{
                          className:"text-slate-500 mt-1",children:"Làm theo các bước sau để thêm dữ liệu vào công cụ"
                        })]
                      })]
                    }),e.jsxs("div",{
                      className:"space-y-5",children:[e.jsxs("div",{
                        className:"flex items-start gap-3",children:[e.jsx("span",{
                          className:"text-indigo-600 font-black text-lg w-6 shrink-0",children:"1."
                        }),e.jsxs("div",{
                          className:"text-slate-700 font-medium pt-0.5",children:["Truy cập: ",e.jsxs("span",{
                            className:"inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight",children:["ERP ",">"," In bảng giá"]
                          })]
                        })]
                      }),e.jsxs("div",{
                        className:"flex items-start gap-3",children:[e.jsx("span",{
                          className:"text-indigo-600 font-black text-lg w-6 shrink-0",children:"2."
                        }),e.jsxs("div",{
                          className:"text-slate-700 font-medium pt-0.5",children:["Chọn Ngành hàng: ",e.jsx("span",{
                            className:"inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight",children:"Điện gia dụng, Dụng cụ nhà bếp,..."
                          })]
                        })]
                      }),e.jsxs("div",{
                        className:"flex items-start gap-3",children:[e.jsx("span",{
                          className:"text-indigo-600 font-black text-lg w-6 shrink-0",children:"3."
                        }),e.jsxs("div",{
                          className:"text-slate-700 font-medium pt-0.5",children:["Chọn Nhóm hàng: ",e.jsx("span",{
                            className:"inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight",children:"Tất cả"
                          })]
                        })]
                      }),e.jsxs("div",{
                        className:"flex items-start gap-3",children:[e.jsx("span",{
                          className:"text-indigo-600 font-black text-lg w-6 shrink-0",children:"4."
                        }),e.jsxs("div",{
                          className:"text-slate-700 font-medium pt-0.5",children:["Chọn Vị trí trưng bày: ",e.jsx("span",{
                            className:"inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight",children:"2 - Kệ trưng bày"
                          })]
                        })]
                      }),e.jsxs("div",{
                        className:"flex items-start gap-3",children:[e.jsx("span",{
                          className:"text-indigo-600 font-black text-lg w-6 shrink-0",children:"5."
                        }),e.jsxs("div",{
                          className:"text-slate-700 font-medium pt-0.5",children:["Chọn Mẫu in: ",e.jsx("span",{
                            className:"inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight",children:"81 - Bảng giá Gia Dụng - Phụ Kiện rút gọn..."
                          })]
                        })]
                      }),e.jsxs("div",{
                        className:"flex items-start gap-3",children:[e.jsx("span",{
                          className:"text-indigo-600 font-black text-lg w-6 shrink-0",children:"6."
                        }),e.jsxs("div",{
                          className:"text-slate-700 font-medium pt-0.5",children:["Xuất file: Bấm nút ",e.jsx("span",{
                            className:"font-bold",children:'"In"'
                          }),", sau đó chọn định dạng ",e.jsx("span",{
                            className:"inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight",children:"Excel Workbook Data - only (*.xlsx)"
                          }),"."]
                        })]
                      })]
                    }),e.jsxs("div",{
                      className:"mt-10 pt-6 border-t border-indigo-100",children:[e.jsx("h3",{
                        className:"text-lg font-bold text-slate-800 mb-2",children:"Lưu ý quan trọng"
                      }),e.jsx("p",{
                        className:"text-sm text-slate-600",children:"Đảm bảo bạn đã chọn đúng siêu thị và ngành hàng trước khi xuất file để dữ liệu in ra được chính xác nhất."
                      })]
                    })]
                  })]
                })]
              })]
            })]
          },h),h==="in-dia-chi"&&e.jsxs(lt.div,{
            initial:{
              opacity:0,y:20
            },animate:{
              opacity:1,y:0
            },exit:{
              opacity:0,y:-20
            },transition:{
              duration:.2
            },className:"bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[500px]",children:[e.jsxs("div",{
              className:"flex items-center gap-3 mb-6 border-b border-slate-100 pb-4",children:[e.jsx("div",{
                className:"p-2 bg-emerald-50 text-emerald-600 rounded-xl",children:e.jsx(nn,{
                  size:24
                })
              }),e.jsx("h2",{
                className:"text-xl font-black text-slate-800 uppercase tracking-tight",children:"Cấu hình In Địa Chỉ (Tờ Rơi A4)"
              })]
            }),e.jsxs("div",{
              className:"grid grid-cols-1 xl:grid-cols-12 gap-8",children:[e.jsxs("div",{
                className:"xl:col-span-7 space-y-6 max-h-[750px] overflow-y-auto pr-2",children:[e.jsxs("div",{
                  className:"bg-slate-50 p-4 rounded-2xl border border-slate-100",children:[e.jsx("h3",{
                    className:"font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider text-emerald-700",children:"1. Phần Đầu (Header)"
                  }),e.jsxs("div",{
                    className:"grid grid-cols-1 gap-3",children:[e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Tên siêu thị"
                      }),e.jsx("input",{
                        type:"text",value:o.headerTitle,onChange:s=>i({
                          ...o,headerTitle:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Địa chỉ / Ghi chú"
                      }),e.jsx("input",{
                        type:"text",value:o.headerSubtitle,onChange:s=>i({
                          ...o,headerSubtitle:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    })]
                  })]
                }),e.jsxs("div",{
                  className:"bg-slate-50 p-4 rounded-2xl border border-slate-100",children:[e.jsx("h3",{
                    className:"font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider text-emerald-700",children:"2. Thư Mời (Invitation)"
                  }),e.jsxs("div",{
                    className:"grid grid-cols-1 gap-3",children:[e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Tiêu đề thư mời"
                      }),e.jsx("input",{
                        type:"text",value:o.invitationTitle,onChange:s=>i({
                          ...o,invitationTitle:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Đối tượng kính mời"
                      }),e.jsx("input",{
                        type:"text",value:o.invitationTarget,onChange:s=>i({
                          ...o,invitationTarget:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    })]
                  })]
                }),e.jsxs("div",{
                  className:"bg-slate-50 p-4 rounded-2xl border border-slate-100",children:[e.jsx("h3",{
                    className:"font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider text-emerald-700",children:"3. Nội dung sự kiện"
                  }),e.jsxs("div",{
                    className:"grid grid-cols-1 md:grid-cols-2 gap-3",children:[e.jsxs("div",{
                      className:"md:col-span-2",children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Thời gian & Địa điểm (Ví dụ: Ngày 28/03 đến ĐMX PHƯỜNG 8)"
                      }),e.jsx("input",{
                        type:"text",value:o.eventTimeLocation,onChange:s=>i({
                          ...o,eventTimeLocation:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    }),e.jsxs("div",{
                      className:"md:col-span-2",children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Mô tả sự kiện"
                      }),e.jsx("input",{
                        type:"text",value:o.eventDescription,onChange:s=>i({
                          ...o,eventDescription:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Mức giảm giá % (Ví dụ: 50%)"
                      }),e.jsx("input",{
                        type:"text",value:o.discountPercentage,onChange:s=>i({
                          ...o,discountPercentage:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-red-600 text-lg"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Thời gian áp dụng (Ví dụ: 1 NGÀY DUY NHẤT 28/03)"
                      }),e.jsx("input",{
                        type:"text",value:o.duration,onChange:s=>i({
                          ...o,duration:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    })]
                  })]
                }),e.jsxs("div",{
                  className:"bg-slate-50 p-4 rounded-2xl border border-slate-100",children:[e.jsx("h3",{
                    className:"font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider text-emerald-700",children:"4. Danh mục & Ưu đãi"
                  }),e.jsxs("div",{
                    className:"grid grid-cols-1 gap-3",children:[e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Danh mục dòng 1"
                      }),e.jsx("input",{
                        type:"text",value:o.categoriesLine1,onChange:s=>i({
                          ...o,categoriesLine1:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Danh mục dòng 2"
                      }),e.jsx("input",{
                        type:"text",value:o.categoriesLine2,onChange:s=>i({
                          ...o,categoriesLine2:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Danh mục dòng 3"
                      }),e.jsx("input",{
                        type:"text",value:o.categoriesLine3,onChange:s=>i({
                          ...o,categoriesLine3:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Ưu đãi đặc biệt"
                      }),e.jsx("input",{
                        type:"text",value:o.specialOffer,onChange:s=>i({
                          ...o,specialOffer:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-blue-600"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Chính sách trả góp"
                      }),e.jsx("input",{
                        type:"text",value:o.paymentTerm,onChange:s=>i({
                          ...o,paymentTerm:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    })]
                  })]
                }),e.jsxs("div",{
                  className:"bg-slate-50 p-4 rounded-2xl border border-slate-100",children:[e.jsx("h3",{
                    className:"font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider text-emerald-700",children:"5. Phần Chân (Footer)"
                  }),e.jsxs("div",{
                    className:"grid grid-cols-1 gap-3",children:[e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Tiêu đề chân trang (Tên siêu thị đầy đủ)"
                      }),e.jsx("input",{
                        type:"text",value:o.footerTitle,onChange:s=>i({
                          ...o,footerTitle:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Cam kết 1"
                      }),e.jsx("input",{
                        type:"text",value:o.footerLine1,onChange:s=>i({
                          ...o,footerLine1:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Cam kết 2"
                      }),e.jsx("input",{
                        type:"text",value:o.footerLine2,onChange:s=>i({
                          ...o,footerLine2:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Dòng chú ý 3"
                      }),e.jsx("input",{
                        type:"text",value:o.footerLine3,onChange:s=>i({
                          ...o,footerLine3:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Khuyến mãi thêm dòng 4"
                      }),e.jsx("input",{
                        type:"text",value:o.footerLine4,onChange:s=>i({
                          ...o,footerLine4:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      })]
                    })]
                  })]
                })]
              }),e.jsxs("div",{
                className:"xl:col-span-5 flex flex-col items-center gap-6",children:[e.jsxs("div",{
                  className:"w-full bg-slate-50 rounded-3xl p-5 border border-slate-100 flex flex-col items-center",children:[e.jsx("h3",{
                    className:"font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider text-emerald-700 self-start",children:"Xem trước thiết kế"
                  }),e.jsx("div",{
                    className:"border border-slate-300 shadow-md bg-white rounded-md overflow-hidden relative",style:{
                      transform:"scale(0.7)",transformOrigin:"top center",marginBottom:"-140px"
                    },children:e.jsx("div",{
                      className:"w-[66mm] h-[142mm] flex items-center justify-center bg-white",children:e.jsx(Gl,{
                        item:o
                      })
                    })
                  })]
                }),e.jsxs("div",{
                  className:"w-full flex gap-3 mt-4",children:[e.jsxs("button",{
                    onClick:oa,disabled:tt,className:"flex-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-md transition-all disabled:opacity-50 cursor-pointer",children:[tt?e.jsx(Mt,{
                      className:"animate-spin",size:20
                    }):e.jsx(ss,{
                      size:20
                    }),"Lưu Cấu Hình"]
                  }),e.jsxs("button",{
                    onClick:ca,className:"flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:shadow-xl transition-all cursor-pointer",children:[e.jsx(We,{
                      size:20
                    }),"In Địa Chỉ (6 ô / A4)"]
                  })]
                })]
              })]
            })]
          },"in-dia-chi"),h==="in-phieu-bh"&&e.jsxs(lt.div,{
            initial:{
              opacity:0,y:20
            },animate:{
              opacity:1,y:0
            },exit:{
              opacity:0,y:-20
            },transition:{
              duration:.2
            },className:"bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[500px]",children:[e.jsxs("div",{
              className:"flex items-center gap-3 mb-6 border-b border-slate-100 pb-4",children:[e.jsx("div",{
                className:"p-2 bg-sky-50 text-sky-600 rounded-xl",children:e.jsx(ft,{
                  size:24
                })
              }),e.jsx("h2",{
                className:"text-xl font-black text-slate-800 uppercase tracking-tight",children:"Cấu hình In Phiếu Bảo Hành (Phiếu BH)"
              })]
            }),e.jsxs("div",{
              className:"grid grid-cols-1 xl:grid-cols-12 gap-8",children:[e.jsxs("div",{
                className:"xl:col-span-7 space-y-6 max-h-[750px] overflow-y-auto pr-2",children:[e.jsxs("div",{
                  className:"bg-slate-50 p-4 rounded-2xl border border-slate-100",children:[e.jsx("h3",{
                    className:"font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider text-sky-700",children:"1. Điền thông tin nhanh"
                  }),e.jsxs("div",{
                    className:"grid grid-cols-1 md:grid-cols-2 gap-3",children:[e.jsxs("div",{
                      className:"md:col-span-2",children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Tên siêu thị"
                      }),e.jsx("input",{
                        type:"text",placeholder:"Ví dụ: ĐIỆN MÁY XANH PHƯỜNG 8",value:x.tenSieuThi,onChange:s=>u({
                          ...x,tenSieuThi:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Thời hạn bảo hành SP (tháng/năm)"
                      }),e.jsx("input",{
                        type:"text",placeholder:"Ví dụ: 12",value:x.sanPhamBh,onChange:s=>u({
                          ...x,sanPhamBh:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Thời hạn bảo hành Remote (tháng)"
                      }),e.jsx("input",{
                        type:"text",placeholder:"Ví dụ: 6",value:x.remoteBh,onChange:s=>u({
                          ...x,remoteBh:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Giao trước (số ngày)"
                      }),e.jsx("input",{
                        type:"text",placeholder:"Ví dụ: 3",value:x.giaoTruocNgay,onChange:s=>u({
                          ...x,giaoTruocNgay:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Chi tiết / Ngày giao hàng"
                      }),e.jsx("input",{
                        type:"text",placeholder:"Ví dụ: 25/06/2026",value:x.giaoTruocText,onChange:s=>u({
                          ...x,giaoTruocText:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                      })]
                    }),e.jsxs("div",{
                      className:"md:col-span-2",children:[e.jsx("label",{
                        className:"text-xs font-bold text-slate-500 block mb-1",children:"Số điện thoại Hỗ trợ và mua hàng"
                      }),e.jsx("input",{
                        type:"text",placeholder:"Ví dụ: 1800.1061 hoặc hotline siêu thị",value:x.hoTroMuaHang,onChange:s=>u({
                          ...x,hoTroMuaHang:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                      })]
                    })]
                  })]
                }),e.jsxs("div",{
                  className:"bg-slate-50 p-4 rounded-2xl border border-slate-100",children:[e.jsx("h3",{
                    className:"font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider text-sky-700",children:"2. Layout in"
                  }),e.jsxs("div",{
                    children:[e.jsx("label",{
                      className:"text-xs font-bold text-slate-500 block mb-2",children:"Chọn số lượng phiếu trên một trang in:"
                    }),e.jsx("div",{
                      className:"flex flex-col md:flex-row gap-3",children:[{
                        value:"1",label:"1 Phiếu / Trang A4 Dọc"
                      },{
                        value:"2",label:"2 Phiếu / Trang A4 Ngang (Cỡ A5)"
                      },{
                        value:"4",label:"4 Phiếu / Trang A4 Dọc (Cỡ A6)"
                      },{
                        value:"right",label:"In bên phải (Trang A5 Ngang) điều chỉnh bố cục vừa trang in A5 Ngang"
                      }].map(s=>e.jsxs("label",{
                        className:"flex items-center gap-2 cursor-pointer font-semibold text-xs text-slate-700",children:[e.jsx("input",{
                          type:"radio",name:"phieuBhLayout",value:s.value,checked:m===s.value,onChange:()=>d(s.value),className:"text-sky-600 focus:ring-sky-500"
                        }),s.label]
                      },s.value))
                    })]
                  })]
                }),e.jsxs("div",{
                  className:"bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3",children:[e.jsx("h3",{
                    className:"font-bold text-slate-800 mb-2 text-sm uppercase tracking-wider text-sky-700 font-black",children:"3. Biên soạn điều khoản (7 dòng chính)"
                  }),e.jsxs("div",{
                    children:[e.jsx("label",{
                      className:"text-[10px] font-bold text-slate-400 block mb-1",children:"Dòng 2 - Điều 1 (30 ngày đầu)"
                    }),e.jsx("textarea",{
                      value:x.row2Line1,onChange:s=>u({
                        ...x,row2Line1:s.target.value
                      }),rows:2,className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    })]
                  }),e.jsxs("div",{
                    children:[e.jsx("label",{
                      className:"text-[10px] font-bold text-slate-400 block mb-1",children:"Dòng 2 - Điều 2 (Qua 30 ngày)"
                    }),e.jsx("textarea",{
                      value:x.row2Line2,onChange:s=>u({
                        ...x,row2Line2:s.target.value
                      }),rows:2,className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    })]
                  }),e.jsxs("div",{
                    children:[e.jsx("label",{
                      className:"text-[10px] font-bold text-slate-400 block mb-1",children:"Dòng 2 - Điều 3 (Sản phẩm đổi trả)"
                    }),e.jsx("textarea",{
                      value:x.row2Line3,onChange:s=>u({
                        ...x,row2Line3:s.target.value
                      }),rows:2,className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    })]
                  }),e.jsxs("div",{
                    className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-[10px] font-bold text-slate-400 block mb-1",children:"Dòng 2 - Điều 4 (Khấu trừ tháng đầu)"
                      }),e.jsx("input",{
                        type:"text",value:x.row2Line4,onChange:s=>u({
                          ...x,row2Line4:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                      })]
                    }),e.jsxs("div",{
                      children:[e.jsx("label",{
                        className:"text-[10px] font-bold text-slate-400 block mb-1",children:"Dòng 2 - Điều 5 (Khấu trừ tháng tiếp theo)"
                      }),e.jsx("input",{
                        type:"text",value:x.row2Line5,onChange:s=>u({
                          ...x,row2Line5:s.target.value
                        }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                      })]
                    })]
                  }),e.jsxs("div",{
                    children:[e.jsx("label",{
                      className:"text-[10px] font-bold text-slate-400 block mb-1",children:"Dòng 4 - Phí vật tư"
                    }),e.jsx("input",{
                      type:"text",value:x.row4Text,onChange:s=>u({
                        ...x,row4Text:s.target.value
                      }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    })]
                  }),e.jsxs("div",{
                    children:[e.jsx("label",{
                      className:"text-[10px] font-bold text-slate-400 block mb-1",children:"Dòng 5 - Tư vấn khách hàng"
                    }),e.jsx("input",{
                      type:"text",value:x.row5Text,onChange:s=>u({
                        ...x,row5Text:s.target.value
                      }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    })]
                  }),e.jsxs("div",{
                    children:[e.jsx("label",{
                      className:"text-[10px] font-bold text-slate-400 block mb-1",children:"Dòng 6 - Số điện thoại bảo hành"
                    }),e.jsx("input",{
                      type:"text",value:x.row6Line1,onChange:s=>u({
                        ...x,row6Line1:s.target.value
                      }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    })]
                  }),e.jsxs("div",{
                    children:[e.jsx("label",{
                      className:"text-[10px] font-bold text-slate-400 block mb-1",children:"Dòng 7 - Ghi chú phụ chân trang"
                    }),e.jsx("input",{
                      type:"text",placeholder:"Để trống hoặc ghi chú thêm (ví dụ: Chữ ký khách hàng, v.v.)",value:x.row7Text,onChange:s=>u({
                        ...x,row7Text:s.target.value
                      }),className:"w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    })]
                  })]
                })]
              }),e.jsxs("div",{
                className:"xl:col-span-5 flex flex-col items-center gap-6",children:[e.jsxs("div",{
                  className:"w-full bg-slate-50 rounded-3xl p-5 border border-slate-100 flex flex-col items-center",children:[e.jsx("h3",{
                    className:"font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider text-sky-700 self-start",children:"Xem trước phiếu bảo hành"
                  }),e.jsx("div",{
                    className:"border border-slate-300 shadow-md bg-white rounded-md overflow-hidden relative",style:{
                      transform:"scale(0.85)",transformOrigin:"top center",marginBottom:m==="right"?"-80px":"-50px"
                    },children:e.jsx("div",{
                      className:"flex items-center justify-center bg-white",style:{
                        width:m==="right"?"98mm":"105mm",height:m==="right"?"132mm":"148.5mm"
                      },children:e.jsx($l,{
                        item:x,layout:m
                      })
                    })
                  })]
                }),e.jsxs("div",{
                  className:"w-full flex gap-3 mt-4",children:[e.jsxs("button",{
                    onClick:da,disabled:tt,className:"flex-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-md transition-all disabled:opacity-50 cursor-pointer",children:[tt?e.jsx(Mt,{
                      className:"animate-spin",size:20
                    }):e.jsx(ss,{
                      size:20
                    }),"Lưu Cấu Hình"]
                  }),e.jsxs("button",{
                    onClick:()=>qe(!0),className:"flex-1 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 hover:shadow-xl transition-all cursor-pointer",children:[e.jsx(We,{
                      size:20
                    }),"IN PHIẾU BH"]
                  })]
                })]
              })]
            })]
          },"in-phieu-bh"),h==="bien-ban"&&e.jsxs(lt.div,{
            initial:{
              opacity:0,y:20
            },animate:{
              opacity:1,y:0
            },exit:{
              opacity:0,y:-20
            },transition:{
              duration:.2
            },className:"bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[500px]",children:[e.jsxs("div",{
              className:"flex items-center gap-3 mb-6 border-b border-slate-100 pb-4",children:[e.jsx("div",{
                className:"p-2 bg-indigo-50 text-indigo-600 rounded-xl",children:e.jsx(ft,{
                  size:24
                })
              }),e.jsx("h2",{
                className:"text-xl font-black text-slate-800 uppercase tracking-tight",children:"BIÊN BẢN CÁC LOẠI"
              })]
            }),e.jsxs("div",{
              className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",children:[e.jsxs("button",{
                onClick:()=>{
                  la("BIÊN BẢN GHI NHẬN TÌNH TRẠNG HÀNG HÓA"),qs(!0)
                },className:"flex flex-col items-center justify-center p-6 bg-white border-2 border-indigo-100 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100/50 rounded-2xl transition-all cursor-pointer group",children:[e.jsx("div",{
                  className:"w-16 h-16 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform",children:e.jsx(ft,{
                    size:32
                  })
                }),e.jsx("h3",{
                  className:"text-lg font-bold text-slate-800 text-center uppercase",children:"Biên bản Tình Trạng Hàng Hóa"
                }),e.jsx("p",{
                  className:"text-slate-500 text-sm text-center mt-2",children:"Dùng khi ghi nhận tình trạng hàng hóa, in A4 ngang"
                })]
              }),e.jsxs("button",{
                onClick:()=>Xs(!0),className:"flex flex-col items-center justify-center p-6 bg-white border-2 border-emerald-100 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100/50 rounded-2xl transition-all cursor-pointer group",children:[e.jsx("div",{
                  className:"w-16 h-16 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform",children:e.jsx(ft,{
                    size:32
                  })
                }),e.jsx("h3",{
                  className:"text-lg font-bold text-slate-800 text-center uppercase",children:"Báo Giá Công Ty"
                }),e.jsx("p",{
                  className:"text-slate-500 text-sm text-center mt-2",children:"Dùng khi tạo báo giá, in A4 dọc"
                })]
              })]
            })]
          },"bien-ban")]
        })
      })]
    }),e.jsx(El,{
      isOpen:na,onClose:()=>qs(!1),title:ra
    }),e.jsx(Ol,{
      isOpen:aa,onClose:()=>Xs(!1)
    }),e.jsx(Va,{
      isOpen:sa,isCe:h==="sticker-ce",isLk:h==="sticker-lk",onClose:()=>ps(!1),onConfirm:(s,l,c)=>{
        ht({
          style:s,layout:l,showPromoLabel:c
        }),ps(!1),qe(!0)
      }
    }),e.jsx(Ya,{
      isOpen:ta,onClose:()=>qe(!1),data:h==="in-dia-chi"?Array(6).fill(o):h==="in-phieu-bh"?m==="right"?[null,x]:Array(parseInt(m||"2")).fill(x):h==="in-sticker"?A.flatMap((s,l)=>{
        const c=C.length===0||C.includes(l),p=G[l]??1;
        return c&&p>0?Array(p).fill(s):[]
      }):ue.flatMap((s,l)=>{
        const c=ye.length===0||ye.includes(l),p=Xe[l]||1;
        return c&&p>0?Array(p).fill(s):[]
      }),config:h==="in-dia-chi"?{
        style:"address_flyer",layout:"6",showPromoLabel:!1
      }:h==="in-phieu-bh"?{
        style:"phieu_bh",layout:m,showPromoLabel:!1
      }:h==="in-sticker"?{
        style:"a4_giasoc",layout:"1",showPromoLabel:!1
      }:ia
    }),U&&e.jsx("div",{
      className:"fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]",children:e.jsxs("div",{
        className:"bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col p-6 animate-[scaleUp_0.2s_ease-out] font-sans text-black",children:[e.jsxs("div",{
          className:"flex items-center justify-between border-b border-slate-100 pb-3 mb-4",children:[e.jsxs("h3",{
            className:"font-black text-base text-slate-800 uppercase tracking-tight flex items-center gap-2",children:[e.jsx(mt,{
              size:20,className:"text-sky-500"
            })," Thêm Sản Phẩm Mới"]
          }),e.jsx("button",{
            onClick:()=>he(!1),className:"text-slate-400 hover:text-slate-600 transition-colors p-1",children:e.jsx(gt,{
              size:20
            })
          })]
        }),e.jsxs("div",{
          className:"space-y-4",children:[e.jsxs("div",{
            className:"space-y-1",children:[e.jsx("label",{
              className:"text-[10px] font-black text-slate-500 uppercase tracking-wider block",children:"Mã sản phẩm"
            }),e.jsx("input",{
              type:"text",placeholder:"Ví dụ: SP001",value:E.productCode,onChange:s=>X(l=>({
                ...l,productCode:s.target.value
              })),className:"w-full bg-slate-50 border border-slate-200 text-slate-800 py-2.5 px-3.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
            })]
          }),e.jsxs("div",{
            className:"space-y-1",children:[e.jsxs("label",{
              className:"text-[10px] font-black text-slate-500 uppercase tracking-wider block",children:["Tên sản phẩm ",e.jsx("span",{
                className:"text-red-500",children:"*"
              })]
            }),e.jsx("input",{
              type:"text",placeholder:"Ví dụ: Quạt điều hoà Daikiosan DMI03",value:E.name,onChange:s=>X(l=>({
                ...l,name:s.target.value
              })),className:"w-full bg-slate-50 border border-slate-200 text-slate-800 py-2.5 px-3.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
            })]
          }),e.jsxs("div",{
            className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{
              className:"space-y-1",children:[e.jsx("label",{
                className:"text-[10px] font-black text-slate-500 uppercase tracking-wider block",children:"Giá gốc (đ)"
              }),e.jsx("input",{
                type:"text",placeholder:"Ví dụ: 5.490.000",value:E.originalPrice,onChange:s=>X(l=>({
                  ...l,originalPrice:s.target.value
                })),className:"w-full bg-slate-50 border border-slate-200 text-slate-800 py-2.5 px-3.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
              })]
            }),e.jsxs("div",{
              className:"space-y-1",children:[e.jsxs("label",{
                className:"text-[10px] font-black text-slate-500 uppercase tracking-wider block",children:["Giá sau giảm (đ) ",e.jsx("span",{
                  className:"text-red-500",children:"*"
                })]
              }),e.jsx("input",{
                type:"text",placeholder:"Ví dụ: 3.490.000",value:E.discountPrice,onChange:s=>X(l=>({
                  ...l,discountPrice:s.target.value
                })),className:"w-full bg-slate-50 border border-slate-200 text-red-600 py-2.5 px-3.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
              })]
            })]
          }),e.jsxs("div",{
            className:"space-y-1",children:[e.jsx("label",{
              className:"text-[10px] font-black text-slate-500 uppercase tracking-wider block",children:"Hạn khuyến mãi"
            }),e.jsx("input",{
              type:"text",placeholder:"Ví dụ: 3/5/2026",value:E.endDate,onChange:s=>X(l=>({
                ...l,endDate:s.target.value
              })),className:"w-full bg-slate-50 border border-slate-200 text-slate-800 py-2.5 px-3.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
            })]
          })]
        }),e.jsxs("div",{
          className:"flex gap-3 mt-6 pt-3 border-t border-slate-100 justify-end",children:[e.jsx("button",{
            onClick:()=>he(!1),className:"px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors",children:"Hủy"
          }),e.jsx("button",{
            onClick:wa,className:"px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-500/10 transition-colors",children:"Thêm vào list"
          })]
        })]
      })
    }),M&&e.jsx("div",{
      className:"fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4 animate-[fadeIn_0.2s_ease-out]",children:e.jsxs("div",{
        className:"bg-white rounded-none md:rounded-3xl max-w-md w-full h-full md:h-auto md:max-h-[90vh] shadow-2xl overflow-hidden border-0 md:border border-slate-100 flex flex-col",children:[e.jsxs("div",{
          className:"bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 md:px-6 md:py-4 text-white flex items-center justify-between shrink-0",children:[e.jsxs("div",{
            className:"flex items-center gap-3",children:[e.jsx(ln,{
              className:"animate-pulse text-indigo-200",size:20
            }),e.jsxs("div",{
              children:[e.jsx("h3",{
                className:"font-black text-sm uppercase tracking-wider leading-tight",children:"Quét Tồn Kho"
              }),e.jsxs("p",{
                className:"text-[10px] text-indigo-100 font-medium mt-0.5 truncate max-w-[220px]",children:["Siêu thị: ",n]
              })]
            })]
          }),e.jsx("button",{
            onClick:Js,className:"text-white/80 hover:text-white text-xs font-bold uppercase transition-colors",children:"Đóng"
          })]
        }),e.jsxs("div",{
          className:"flex border-b border-slate-200 bg-slate-50 shrink-0",children:[e.jsx("button",{
            onClick:()=>Q("local"),className:`flex-1 py-2.5 md:py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
              W==="local"?"border-indigo-600 text-indigo-600 bg-white":"border-transparent text-slate-500 hover:text-slate-700"
            }`,children:"Quét trực tiếp"
          }),e.jsx("button",{
            onClick:()=>Q("qr"),className:`flex-1 py-2.5 md:py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
              W==="qr"?"border-indigo-600 text-indigo-600 bg-white":"border-transparent text-slate-500 hover:text-slate-700"
            }`,children:"Điện thoại khác"
          })]
        }),e.jsxs("div",{
          className:"p-4 md:p-6 overflow-hidden flex-1 flex flex-col items-center gap-3 md:gap-4 bg-white",children:[W==="local"?e.jsxs("div",{
            className:"w-full flex-1 flex flex-col items-center gap-3 min-h-0 overflow-hidden",children:[e.jsxs("div",{
              className:"w-full max-w-[280px] md:max-w-[320px] aspect-square bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800 shadow-inner flex items-center justify-center shrink-0",children:[e.jsx("div",{
                id:"modal-reader",className:"w-full h-full object-cover"
              }),Zn&&Lt.max>1&&e.jsxs("div",{
                className:"absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 z-30 shadow-lg",children:[e.jsx("button",{
                  type:"button",onClick:()=>bs(1),className:`text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    Vt===1?"bg-indigo-600 text-white":"text-slate-300 hover:bg-white/10"
                  }`,children:"1x"
                }),Lt.max>=2&&e.jsx("button",{
                  type:"button",onClick:()=>bs(Math.min(2,Lt.max)),className:`text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    Vt>1&&Vt<=2.5?"bg-indigo-600 text-white":"text-slate-300 hover:bg-white/10"
                  }`,children:"2x"
                }),Lt.max>=3&&e.jsx("button",{
                  type:"button",onClick:()=>bs(Math.min(3,Lt.max)),className:`text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    Vt>2.5?"bg-indigo-600 text-white":"text-slate-300 hover:bg-white/10"
                  }`,children:"3x"
                })]
              }),Ut&&e.jsx("div",{
                className:"absolute inset-0 pointer-events-none flex flex-col items-center justify-center",children:e.jsxs("div",{
                  className:"w-36 h-36 border-2 border-emerald-500 rounded-2xl relative flex items-center justify-center",children:[e.jsx("div",{
                    className:"absolute left-1 right-1 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] top-1/2 -translate-y-1/2 animate-[pulse_1.5s_infinite]"
                  }),e.jsx("div",{
                    className:"absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-emerald-400 rounded-tl"
                  }),e.jsx("div",{
                    className:"absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-emerald-400 rounded-tr"
                  }),e.jsx("div",{
                    className:"absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-emerald-400 rounded-bl"
                  }),e.jsx("div",{
                    className:"absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-emerald-400 rounded-br"
                  })]
                })
              }),Ks&&e.jsxs("div",{
                className:"absolute inset-x-3 top-3 bg-rose-500/90 text-white text-[10px] font-bold p-2.5 rounded-xl flex items-center gap-2 backdrop-blur-sm z-20",children:[e.jsx(Da,{
                  size:14,className:"shrink-0"
                }),e.jsx("p",{
                  children:Ks
                })]
              })]
            }),e.jsxs("div",{
              className:"w-full flex gap-2 shrink-0",children:[e.jsxs("div",{
                className:"flex-1 relative",children:[e.jsxs("select",{
                  value:Se,onChange:s=>{
                    Fs(s.target.value),gs(s.target.value)
                  },className:"w-full bg-slate-100 border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-xl text-[11px] font-bold focus:outline-none appearance-none",children:[e.jsx("option",{
                    value:"",children:"-- Chọn Camera --"
                  }),q.map((s,l)=>e.jsx("option",{
                    value:s.id,children:s.label||`Camera ${
                      l+1
                    }`
                  },s.id))]
                }),e.jsx(Ft,{
                  size:12,className:"absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                })]
              }),e.jsx("button",{
                onClick:()=>{
                  Ut?fs():gs(Se)
                },className:`px-3 py-2 rounded-xl text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 text-white ${
                  Ut?"bg-rose-600 hover:bg-rose-700":"bg-emerald-600 hover:bg-emerald-700"
                }`,children:Ut?"Tạm dừng":"Tiếp tục"
              })]
            })]
          }):e.jsxs("div",{
            className:"w-full flex-1 flex flex-col items-center justify-center gap-4 min-h-0 overflow-hidden",children:[e.jsxs("div",{
              className:"bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center shrink-0",children:[e.jsx(ts,{
                value:`${
                  window.location.origin
                }${
                  window.location.pathname
                }?scanner=true&session=${
                  F
                }&store=${
                  encodeURIComponent(n)
                }`,size:180,level:"H"
              }),e.jsx("span",{
                className:"text-[10px] text-slate-400 font-bold uppercase mt-3 tracking-widest text-center",children:"Quét bằng camera điện thoại"
              })]
            }),e.jsxs("div",{
              className:"text-center space-y-1 shrink-0",children:[e.jsx("p",{
                className:"text-xs font-bold text-slate-600",children:"Đang chờ kết nối quét..."
              }),e.jsx("p",{
                className:"text-[10px] text-slate-400 max-w-xs leading-relaxed",children:"Dùng điện thoại quét mã QR phía trên để mở camera điện thoại quét mã vạch sản phẩm tồn kho."
              })]
            })]
          }),e.jsxs("div",{
            className:"w-full flex gap-2 pt-1 border-t border-slate-100 shrink-0",children:[e.jsx("input",{
              type:"text",placeholder:"Nhập mã sản phẩm bằng tay...",value:xs,onChange:s=>hs(s.target.value),className:"flex-1 bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500",onKeyDown:s=>{
                if(s.key==="Enter"){
                  s.preventDefault();
                  const l=xs.trim();
                  l&&(j(c=>{
                    if(c.includes(l))return c;
                    const p=[l,...c];
                    return F&&He.from("scanner_sessions").upsert({
                      id:F,store_id:n,scanned_codes:JSON.stringify(p)
                    },{
                      onConflict:"id"
                    }),p
                  }),hs(""))
                }
              }
            }),e.jsx("button",{
              onClick:()=>{
                const s=xs.trim();
                s&&(j(l=>{
                  if(l.includes(s))return l;
                  const c=[s,...l];
                  return F&&He.from("scanner_sessions").upsert({
                    id:F,store_id:n,scanned_codes:JSON.stringify(c)
                  },{
                    onConflict:"id"
                  }),c
                }),hs(""))
              },className:"bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700",children:"Thêm"
            })]
          }),e.jsxs("div",{
            className:"w-full bg-slate-50 rounded-2xl border border-slate-100 p-3.5 md:p-4 flex-1 flex flex-col min-h-[100px] max-h-[180px] md:max-h-[220px]",children:[e.jsxs("div",{
              className:"flex items-center justify-between mb-2 shrink-0",children:[e.jsx("span",{
                className:"text-[10px] font-black text-slate-500 uppercase tracking-wider",children:"Đã quét được"
              }),e.jsxs("span",{
                className:"bg-indigo-100 text-indigo-700 text-[9px] font-black px-2.5 py-0.5 rounded-full",children:[$.length," mã"]
              })]
            }),e.jsx("div",{
              className:"flex-1 overflow-y-auto space-y-2 pr-1",children:$.length===0?e.jsx("div",{
                className:"h-full flex items-center justify-center text-slate-400 text-[10px] font-bold uppercase py-8",children:"Chưa có sản phẩm nào"
              }):$.map((s,l)=>e.jsxs("div",{
                className:"bg-white border border-slate-100 py-1.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700 shadow-sm animate-[fadeIn_0.15s_ease-out]",children:[e.jsx("span",{
                  className:"font-mono tracking-wider text-indigo-600",children:s
                }),e.jsx("button",{
                  onClick:()=>{
                    const c=$.filter(p=>p!==s);
                    j(c),F&&He.from("scanner_sessions").upsert({
                      id:F,store_id:n,scanned_codes:JSON.stringify(c)
                    },{
                      onConflict:"id"
                    })
                  },className:"text-slate-400 hover:text-red-500 transition-colors p-1",children:e.jsx(et,{
                    size:12
                  })
                })]
              },`${
                s
              }-${
                l
              }`))
            })]
          })]
        }),e.jsxs("div",{
          className:"bg-slate-50 px-4 py-3 md:px-6 md:py-4 border-t border-slate-100 flex gap-3 shrink-0",children:[e.jsx("button",{
            onClick:Js,className:"flex-1 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold transition-all uppercase",children:"Hủy"
          }),e.jsxs("button",{
            onClick:ma,disabled:$.length===0,className:"flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-bold transition-all uppercase shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5",children:[e.jsx(Cs,{
              size:14
            }),"Hoàn tất"]
          })]
        })]
      })
    })]
  })
}export{
  Gt as DEFAULT_PHIEU_BH,$l as PhieuBHPreview,Zl as default,Pt as renderLineWithBold
};

