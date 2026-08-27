const fs=require("fs"),path=require("path");
const WURZEL="/Users/sebastianhund/Desktop/Claude/heizlast_tool";
global.window={};global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
global.document={readyState:"loading",addEventListener:()=>{},createElement:()=>({getContext:()=>({}),toDataURL:()=>"x,y",style:{},appendChild:()=>{},setAttribute:()=>{}}),getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],body:{appendChild:()=>{}}};
global.Image=function(){};global.location={search:""};
const R=(p)=>require(path.join(WURZEL,p));
window.STANDORTE=R("src/standorte.js").STANDORTE;
["src/kerne/kern_heizlast_norm.js","src/daten/daten_raumarten.js","src/daten/daten_klima.js","src/daten/daten_bauteile.js","src/daten/daten_typologie.js","src/daten/daten_beg_anforderungen.js","src/daten/daten_zonenlagen.js","src/kerne/kern_pruefung.js","src/kerne/kern_zuordnung.js","src/modul_kontrollblatt.js","src/modul_berichtsatz.js","src/modul_teillast.js","src/modul_bewertung.js","src/modul_bericht.js","src/app.js"].forEach(R);
const MB=window.MODUL_BERICHT,A=window.App;
const quelle=process.argv[2], ziel=process.argv[3], mod=process.argv[4]||"roh";
const p=JSON.parse(fs.readFileSync(quelle,"utf8")).projekt;
if(mod!=="roh"){ p.meta.freigegeben="ja"; p.meta.bearbeiter=p.meta.bearbeiter||"Sebastian Hund"; p.meta.bearbeiter_funktion=p.meta.bearbeiter_funktion||"Energieberater"; }
A.p=p; A.ergebnis=window.KERN_HEIZLAST_NORM.rechne(A.projektFuerKern(p));
const KP=window.KERN_PRUEFUNG,KB=window.MODUL_KONTROLLBLATT;
A.pruefung=KP.pruefeAlles(p,A.ergebnis,{typologie:window.DATEN_TYPOLOGIE,kontrollblatt:KB});
if(mod==="voll"){
  KB.offeneBefunde(KB.zaehler(p,{}),A.pruefung).forEach(function(b,i){
    KP.bestaetigungEintragen(p,b.id,{wer:"Sebastian Hund",grund_pflicht:!b.aufhebbar,
      grund:(i===0||!b.aufhebbar)?"Am Grundriss geprüft und für diesen Bericht so übernommen.":""});
  });
  A.pruefung=KP.pruefeAlles(p,A.ergebnis,{typologie:window.DATEN_TYPOLOGIE,kontrollblatt:KB});
}
["intern","druck"].forEach(function(fa){
  const d=MB.dokument({fassung:fa});
  fs.writeFileSync(ziel+"_"+fa+".html", typeof d==="string"?d:(d.html||""), "utf8");
});
console.log(JSON.stringify({phi:A.ergebnis.phi_gebaeude, raeume:p.raeume.length,
  bt:p.bauteiltypen.length, zonen:(p.zonen||[]).length, ampel:A.pruefung.ampel,
  bestaetigung:A.pruefung.bestaetigung, theta_e:A.ergebnis.klima&&A.ergebnis.klima.theta_e,
  ort:p.meta.ort, spez:A.ergebnis.spez_raumflaeche, A_ges:A.ergebnis.A_gesamt}));
