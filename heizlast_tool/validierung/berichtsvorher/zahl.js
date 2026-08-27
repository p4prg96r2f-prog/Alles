const fs=require("fs"),path=require("path");
const WURZEL="/Users/sebastianhund/Desktop/Claude/heizlast_tool";
global.window={};global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
global.document={readyState:"loading",addEventListener:()=>{},createElement:()=>({getContext:()=>({}),toDataURL:()=>"x,y",style:{},appendChild:()=>{},setAttribute:()=>{}}),getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],body:{appendChild:()=>{}}};
global.Image=function(){};global.location={search:""};
const R=(p)=>require(path.join(WURZEL,p));
window.STANDORTE=R("src/standorte.js").STANDORTE;
["src/kerne/kern_heizlast_norm.js","src/daten/daten_raumarten.js","src/daten/daten_klima.js","src/daten/daten_bauteile.js","src/daten/daten_typologie.js","src/daten/daten_beg_anforderungen.js","src/daten/daten_zonenlagen.js","src/kerne/kern_pruefung.js","src/kerne/kern_zuordnung.js","src/modul_kontrollblatt.js","src/modul_berichtsatz.js","src/modul_teillast.js","src/modul_bewertung.js","src/modul_bericht.js","src/app.js"].forEach(R);
const A=window.App,MB=window.MODUL_BERICHT,RH=MB.rechenhilfen;
const p=JSON.parse(fs.readFileSync(process.argv[2],"utf8")).projekt;
A.p=p;A.ergebnis=window.KERN_HEIZLAST_NORM.rechne(A.projektFuerKern(p));
const e=A.ergebnis;
const zeilen=RH.bauteilZeilen(p,e);
console.log("Bauteiltypen im Projekt:",(p.bauteiltypen||[]).length," | Zeilen in Kapitel 5:",zeilen.length,"->",zeilen.map(z=>z.name).join(", "));
console.log("Räume im Projekt:",(p.raeume||[]).length," | Räume im Ergebnis:",e.raeume.length,
  " | davon mit ΦHL>0:",e.raeume.filter(r=>r.phi_hl>0).length,
  " | mit A=0:",e.raeume.filter(r=>!(r.A>0)).length);
let anl=0;e.raeume.forEach(r=>{anl+=(r.bauteile||[]).length;});
console.log("Bauteilzeilen gesamt (Anlage 1):",anl," | huelle:",e.raeume.reduce((s,r)=>s+(r.bauteile||[]).filter(b=>b.kat!=="innen").length,0),
  " | innen:",e.raeume.reduce((s,r)=>s+(r.bauteile||[]).filter(b=>b.kat==="innen").length,0));
const rr=e.raeume;
const inf=rr.filter(r=>r.massgebend==="Infiltration");
console.log("massgebend-Werte:",JSON.stringify(rr.reduce((m,r)=>{m[r.massgebend]=(m[r.massgebend]||0)+1;return m;},{})));
console.log("Infiltrationsräume:",inf.length,"->",inf.map(r=>r.name+" (v_inf "+r.v_inf.toFixed(3)+" / v_min "+r.v_min.toFixed(3)+")").join("; "));
const ak=RH.abschirmklassen(p,e);
ak.forEach(x=>console.log("Abschirmstufe e="+x.e,"anzahl:",x.anzahl,"| Namen in Liste:",x.raeume.length,"->",x.raeume.join(", ")));
console.log("phi_gebaeude:",e.phi_gebaeude,"phi_raeume_summe:",e.phi_raeume_summe,"gleich?",e.phi_gebaeude===e.phi_raeume_summe);
console.log("PhiT innen je Raum Summe:",rr.reduce((s,r)=>s+(r.phi_T_innen||0),0));
console.log("Zonen:",(p.zonen||[]).map(z=>z.id+" modus="+z.modus+" lage="+z.lage+" huelle="+(z.huelle||[]).length).join(" | "));
console.log("e.zonen:",JSON.stringify(e.zonen),"e.zonen_befund:",JSON.stringify(e.zonen_befund).slice(0,300));
console.log("Geschosse:",Object.keys(e.je_geschoss||{}));
