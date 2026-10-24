/* Illustrations standing in for real photos, generated as SVG strings (ported verbatim from the prototype). */
const INK="#2A2200";
function tag(x:number,y:number,txt:string,px?:number|null,py?:number|null,k=1):string{
  const w=Math.round((txt.length*8.7+24)*k), h=Math.round(30*k);
  let ln="";
  if(px!=null&&py!=null){
    const cx=Math.max(x,Math.min(px,x+w)), cy=py<y?y:(py>y+h?y+h:y+h/2);
    ln=`<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" stroke="${INK}" stroke-width="${2*k}" stroke-dasharray="5 4"/><circle cx="${px}" cy="${py}" r="${5*k}" fill="#F7C948" stroke="${INK}" stroke-width="2"/>`;
  }
  return `${ln}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#F7C948" stroke="${INK}" stroke-width="1.5"/><text x="${x+12*k}" y="${y+20*k}" font-family="JetBrains Mono,Menlo,monospace" font-size="${14.5*k}" font-weight="700" fill="${INK}">${txt}</text>`;
}
function svg(w:number,h:number,label:string,inner:string):string{return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">${inner}</svg>`}
function rng(seed:number):()=>number{let s=seed;return()=>(s=(s*16807)%2147483647)/2147483647}

function scenePole():string{ // panorama 2400x600, skala 26 px/m
  const W=2400,G=470; let s="";
  s+=`<defs><linearGradient id="skyA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9D2E4"/><stop offset="1" stop-color="#E7F2F1"/></linearGradient></defs>`;
  s+=`<rect width="${W}" height="600" fill="url(#skyA)"/>`;
  s+=`<g fill="#FFFFFF" opacity=".8"><ellipse cx="380" cy="90" rx="90" ry="22"/><ellipse cx="1500" cy="70" rx="120" ry="26"/><ellipse cx="2100" cy="120" rx="80" ry="18"/></g>`;
  // pepohonan jauh
  const r=rng(7); s+=`<g fill="#8DB283">`; for(let x=0;x<W;x+=60){s+=`<ellipse cx="${x}" cy="${G-8}" rx="${50+r()*30}" ry="${26+r()*18}"/>`} s+=`</g>`;
  // Gedung Kelas A
  s+=`<rect x="60" y="230" width="460" height="${G-230}" fill="#E8DDC6"/><polygon points="40,232 540,232 500,188 100,188" fill="#8E4E3B"/>`;
  for(let fl=0;fl<2;fl++)for(let i=0;i<5;i++){s+=`<rect x="${92+i*86}" y="${262+fl*96}" width="52" height="58" fill="#7FA2B2" stroke="#B8A888" stroke-width="5"/>`}
  s+=`<rect x="250" y="410" width="60" height="60" fill="#6B5A44"/><text x="290" y="222" font-family="Chakra Petch,sans-serif" font-size="20" font-weight="700" fill="#5A3A2E" text-anchor="middle">GEDUNG KELAS A</text>`;
  // pohon dekat
  [640,760,1520,1640].forEach((x,i)=>{s+=`<rect x="${x-6}" y="${G-70}" width="12" height="70" fill="#6E5235"/><circle cx="${x}" cy="${G-100}" r="${44+i%2*8}" fill="#5B8C50"/><circle cx="${x-26}" cy="${G-80}" r="30" fill="#4F7F45"/>`});
  // tanah & paving
  s+=`<rect x="0" y="${G}" width="${W}" height="${600-G}" fill="#D7D2C5"/>`;
  for(let x=0;x<W;x+=40){s+=`<line x1="${x}" y1="${G}" x2="${x-30}" y2="600" stroke="#C3BDAE" stroke-width="2"/>`}
  s+=`<line x1="0" y1="${G+40}" x2="${W}" y2="${G+40}" stroke="#C3BDAE" stroke-width="2"/><line x1="0" y1="${G+90}" x2="${W}" y2="${G+90}" stroke="#C3BDAE" stroke-width="2"/>`;
  // pagar & gerbang (tinggi 2 m = 52 px)
  s+=`<g stroke="#4F5B60" stroke-width="5">`; for(let x=1760;x<=2400;x+=36){if(x>2060&&x<2240)continue; s+=`<line x1="${x}" y1="${G-52}" x2="${x}" y2="${G}"/>`} s+=`</g>`;
  s+=`<rect x="1760" y="${G-50}" width="300" height="6" fill="#4F5B60"/><rect x="2240" y="${G-50}" width="160" height="6" fill="#4F5B60"/>`;
  s+=`<rect x="2050" y="${G-120}" width="26" height="120" fill="#B9AE98"/><rect x="2224" y="${G-120}" width="26" height="120" fill="#B9AE98"/><rect x="2040" y="${G-160}" width="220" height="40" rx="4" fill="#0E6B5B"/><text x="2150" y="${G-133}" font-family="Chakra Petch,sans-serif" font-size="20" font-weight="700" fill="#fff" text-anchor="middle">GERBANG SEKOLAH</text>`;
  // tiang bendera x=1300, tinggi 12,6 m
  const PX=1300, top=G-328;
  s+=`<rect x="${PX-30}" y="${G-14}" width="60" height="14" fill="#A49C8B"/><rect x="${PX-3}" y="${top}" width="6" height="${G-top}" fill="#C9CED2" stroke="#8C9399" stroke-width="1"/><circle cx="${PX}" cy="${top-4}" r="6" fill="#D9B44A"/>`;
  s+=`<rect x="${PX+3}" y="${top+6}" width="84" height="28" fill="#D7262E"/><rect x="${PX+3}" y="${top+34}" width="84" height="28" fill="#FAFAFA" stroke="#DDD" stroke-width="1"/>`;
  // siswa x=1040, tinggi 1,6 m, mata 1,5 m
  const SX=1040, eye=G-39;
  s+=`<rect x="${SX-5}" y="${G-14}" width="4" height="14" fill="#2B3445"/><rect x="${SX+1}" y="${G-14}" width="4" height="14" fill="#2B3445"/><rect x="${SX-6}" y="${G-30}" width="12" height="17" rx="3" fill="#2F7D6B"/><circle cx="${SX}" cy="${eye-1}" r="6" fill="#B07A52"/><rect x="${SX+4}" y="${eye-4}" width="12" height="6" fill="#F2B705" stroke="${INK}" stroke-width="1"/>`;
  // garis pandang & garis mendatar
  s+=`<line x1="${SX+8}" y1="${eye}" x2="${PX}" y2="${top}" stroke="#BF3A2B" stroke-width="2.5" stroke-dasharray="8 6"/><line x1="${SX+8}" y1="${eye}" x2="${PX}" y2="${eye}" stroke="#2A2200" stroke-width="1.5" stroke-dasharray="4 5" opacity=".6"/>`;
  // pita ukur di tanah
  s+=`<line x1="${SX}" y1="${G+8}" x2="${PX}" y2="${G+8}" stroke="#F2B705" stroke-width="7"/>`; for(let i=0;i<=10;i++){s+=`<line x1="${SX+i*26}" y1="${G+3}" x2="${SX+i*26}" y2="${G+13}" stroke="${INK}" stroke-width="1.5"/>`}
  const K=1.5;
  s+=tag(760,250,"Klinometer: 48°",SX+10,eye-1,K);
  s+=tag(670,330,"Tinggi mata siswa: 1,5 m",SX-2,eye,K);
  s+=tag(880,520,"Jarak siswa ke tiang: 10 m",1170,G+8,K);
  s+=tag(1790,310,"Tinggi pagar: 2 m",1832,G-52,K);
  s+=tag(1880,530,"Jarak tiang ke gerbang: 25 m",null,null,K);
  return svg(W,600,"Panorama lapangan upacara dengan tiang bendera",s);
}

function sceneShadow():string{ // panorama 2400x600, skala 28 px/m
  const W=2400,G=470,M=28,X0=900; let s="";
  s+=`<defs><linearGradient id="skyB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FCBE0"/><stop offset="1" stop-color="#EAF3F1"/></linearGradient></defs>`;
  s+=`<rect width="${W}" height="600" fill="url(#skyB)"/>`;
  s+=`<circle cx="150" cy="90" r="40" fill="#FFD54A"/><g stroke="#FFD54A" stroke-width="5" stroke-linecap="round">`; for(let a=0;a<12;a++){const t=a*Math.PI/6; s+=`<line x1="${150+Math.cos(t)*52}" y1="${90+Math.sin(t)*52}" x2="${150+Math.cos(t)*68}" y2="${90+Math.sin(t)*68}"/>`} s+=`</g>`;
  const r=rng(11); s+=`<g fill="#93B88A">`; for(let x=0;x<W;x+=70){s+=`<ellipse cx="${x}" cy="${G-6}" rx="${50+r()*30}" ry="${22+r()*16}"/>`} s+=`</g>`;
  // Gedung Kelas B (tinggi 12 m)
  const top=G-12*M;
  s+=`<rect x="300" y="${top}" width="600" height="${G-top}" fill="#DCE3E1"/><rect x="290" y="${top-10}" width="620" height="14" fill="#9BA9A5"/>`;
  for(let fl=0;fl<3;fl++)for(let i=0;i<6;i++){s+=`<rect x="${332+i*94}" y="${top+30+fl*108}" width="56" height="62" fill="#6F97A8" stroke="#A7B3AF" stroke-width="5"/>`}
  s+=`<text x="600" y="${top+20}" font-family="Chakra Petch,sans-serif" font-size="18" font-weight="700" fill="#3E4E4A" text-anchor="middle">GEDUNG KELAS B</text>`;
  // pohon & kantin jauh
  s+=`<rect x="1950" y="330" width="380" height="${G-330}" fill="#E7D9BF"/><polygon points="1930,332 2350,332 2310,300 1970,300" fill="#8E4E3B"/><text x="2140" y="380" font-family="Chakra Petch,sans-serif" font-size="20" font-weight="700" fill="#6B4A3A" text-anchor="middle">KANTIN</text>`;
  [1380,1500].forEach(x=>{s+=`<rect x="${x-6}" y="${G-60}" width="12" height="60" fill="#6E5235"/><circle cx="${x}" cy="${G-90}" r="42" fill="#5B8C50"/>`});
  // paving 80 cm = 22,4 px
  s+=`<rect x="0" y="${G}" width="${W}" height="${600-G}" fill="#CFC9BA"/><rect x="0" y="${G}" width="${W}" height="60" fill="#D9D4C7"/>`;
  const P=0.8*M; let k0=Math.ceil(-X0/P);
  for(let k=k0;X0+k*P<=W;k++){const x=X0+k*P; s+=`<line x1="${x.toFixed(1)}" y1="${G}" x2="${x.toFixed(1)}" y2="${G+60}" stroke="#ACA595" stroke-width="2"/>`}
  s+=`<line x1="0" y1="${G+60}" x2="${W}" y2="${G+60}" stroke="#ACA595" stroke-width="2"/>`;
  // bayangan gedung 9,6 m = 12 paving
  s+=`<rect x="${X0}" y="${G}" width="${(12*P).toFixed(1)}" height="60" fill="#1D2B33" opacity=".5"/>`;
  // tongkat 1 m di x=1700
  const TX=1700;
  s+=`<rect x="${TX-2}" y="${G-M}" width="4" height="${M}" fill="#7A4E2A"/><rect x="${TX}" y="${G}" width="${P}" height="8" fill="#1D2B33" opacity=".55"/>`;
  // lup pembesar
  const CX=1760, CY=230, R=120;
  s+=`<line x1="${TX}" y1="${G-M}" x2="${CX-60}" y2="${CY+105}" stroke="${INK}" stroke-width="2" stroke-dasharray="5 4"/>`;
  s+=`<circle cx="${CX}" cy="${CY}" r="${R}" fill="#F4F1E8" stroke="#2A2200" stroke-width="4"/>`;
  const gy=CY+70, sx=CX-40, sc=5*M*0.6; // 1 m = 84 px dalam lup
  s+=`<rect x="${CX-R+18}" y="${gy}" width="${2*R-36}" height="6" fill="#ACA595"/><rect x="${sx-3}" y="${gy-sc}" width="6" height="${sc}" fill="#7A4E2A"/><rect x="${sx}" y="${gy}" width="${sc*0.8}" height="7" fill="#1D2B33" opacity=".6"/>`;
  s+=`<text x="${sx-14}" y="${gy-sc/2}" font-family="JetBrains Mono,monospace" font-size="16" font-weight="700" fill="${INK}" text-anchor="end">1 m</text><text x="${sx+sc*0.4}" y="${gy+28}" font-family="JetBrains Mono,monospace" font-size="16" font-weight="700" fill="${INK}" text-anchor="middle">80 cm</text>`;
  s+=`<text x="${CX}" y="${CY-R+34}" font-family="JetBrains Mono,monospace" font-size="13" font-weight="700" fill="#566C65" text-anchor="middle">TONGKAT &amp; BAYANGANNYA</text>`;
  const K=1.5;
  s+=tag(930,350,"Bayangan gedung",1040,G+30,K);
  s+=tag(1200,540,"1 paving = 80 cm",1290,G+30,K);
  s+=tag(400,top-82,"Lebar gedung: 30 m",600,top-8,K);
  s+=tag(1930,80,"Waktu pengamatan: 14.30",null,null,K);
  return svg(W,600,"Panorama Gedung Kelas B dan bayangannya",s);
}

function sceneTandon():string{
  let s=`<defs><linearGradient id="skyC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BBDAE6"/><stop offset="1" stop-color="#E6F0EF"/></linearGradient></defs><rect width="800" height="500" fill="url(#skyC)"/>`;
  s+=`<rect x="0" y="140" width="800" height="260" fill="#E3D6BF"/>`; for(let y=166;y<400;y+=26){s+=`<line x1="0" y1="${y}" x2="800" y2="${y}" stroke="#D3C4A8" stroke-width="2"/>`}
  s+=`<rect x="0" y="128" width="800" height="14" fill="#B5A483"/><rect x="590" y="200" width="120" height="86" fill="#7E9AA6" stroke="#8C7B5E" stroke-width="6"/><line x1="650" y1="200" x2="650" y2="286" stroke="#8C7B5E" stroke-width="4"/>`;
  s+=`<rect x="0" y="400" width="800" height="22" fill="#C3BFB3"/><rect x="0" y="422" width="800" height="78" fill="#9DAA84"/>`;
  s+=`<path d="M378 172 V150 H700 V128" fill="none" stroke="#9AA3A8" stroke-width="10" stroke-linejoin="round"/>`;
  // tandon: r 60 cm, t 204 cm, skala 1,1 px/cm
  s+=`<rect x="264" y="176" width="132" height="224" fill="#2F6F8F"/><ellipse cx="330" cy="400" rx="66" ry="14" fill="#285F7A"/>`;
  [236,300,352].forEach(y=>{s+=`<path d="M264 ${y} A66 14 0 0 0 396 ${y}" fill="none" stroke="#235670" stroke-width="3"/>`});
  s+=`<rect x="282" y="186" width="14" height="206" fill="#FFFFFF" opacity=".14"/><ellipse cx="330" cy="176" rx="66" ry="14" fill="#3E86A8"/><ellipse cx="330" cy="171" rx="26" ry="7" fill="#285F7A"/>`;
  s+=`<path d="M264 272 A66 14 0 0 0 396 272" fill="none" stroke="#F2B705" stroke-width="7"/>`;
  // Pak Satpam 170 cm (187 px)
  s+=`<rect x="507" y="330" width="11" height="66" fill="#232B3A"/><rect x="522" y="330" width="11" height="66" fill="#232B3A"/><rect x="503" y="394" width="16" height="6" rx="2" fill="#111"/><rect x="521" y="394" width="16" height="6" rx="2" fill="#111"/>`;
  s+=`<rect x="489" y="250" width="11" height="70" rx="5" fill="#2F4A6E"/><rect x="540" y="250" width="11" height="70" rx="5" fill="#2F4A6E"/><circle cx="494" cy="322" r="6" fill="#C68B5E"/><circle cx="546" cy="322" r="6" fill="#C68B5E"/>`;
  s+=`<rect x="500" y="244" width="40" height="90" rx="8" fill="#2F4A6E"/><rect x="500" y="320" width="40" height="6" fill="#1A2233"/><rect x="526" y="258" width="8" height="10" fill="#F2B705"/><rect x="513" y="234" width="14" height="12" fill="#C68B5E"/><circle cx="520" cy="226" r="13" fill="#C68B5E"/>`;
  s+=`<path d="M506 222 Q520 204 534 222 Z" fill="#1F3050"/><rect x="504" y="218" width="36" height="5" rx="2" fill="#1F3050"/>`;
  s+=tag(26,300,"Keliling tandon: 377 cm",268,274);
  s+=tag(546,424,"Tinggi Pak Satpam: 170 cm",538,300);
  s+=tag(470,62,"Panjang pipa: 3 m",560,150);
  return svg(800,500,"Tandon air di belakang gudang dan Pak Satpam",s);
}

function sceneRamp():string{
  // skala 1,4 px/cm; alas 360 cm = 504 px; tinggi 30 cm = 42 px
  const F=400; let s=`<rect width="800" height="500" fill="#E6EEF0"/>`;
  s+=`<rect x="540" y="110" width="260" height="${F-42-110}" fill="#E8DDC6"/><rect x="530" y="98" width="280" height="14" fill="#8E4E3B"/><rect x="630" y="196" width="64" height="162" fill="#6B5A44"/>`;
  s+=`<rect x="716" y="170" width="54" height="54" rx="6" fill="#1F5FAE"/><circle cx="743" cy="184" r="5" fill="#fff"/><path d="M737 192 v14 h14 l6 10" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="740" cy="210" r="9" fill="none" stroke="#fff" stroke-width="3"/>`;
  s+=`<rect x="0" y="${F}" width="800" height="100" fill="#D3CFC4"/>`;
  // ubin 30 cm = 42 px, garis tepat di x=100 (awal ramp)
  for(let x=16;x<=800;x+=42){s+=`<line x1="${x}" y1="${F}" x2="${x}" y2="${F+46}" stroke="#A9A394" stroke-width="2"/>`}
  s+=`<line x1="0" y1="${F+46}" x2="800" y2="${F+46}" stroke="#A9A394" stroke-width="2"/>`;
  // teras & tangga (2 anak tangga × 15 cm = 21 px)
  s+=`<rect x="604" y="${F-42}" width="96" height="42" fill="#BDB8AC"/><rect x="700" y="${F-21}" width="42" height="21" fill="#C7C2B6"/><line x1="604" y1="${F-42}" x2="700" y2="${F-42}" stroke="#8D877A" stroke-width="2"/><path d="M700 ${F-42} V${F-21} H742 V${F}" fill="none" stroke="#8D877A" stroke-width="2"/>`;
  // ramp
  s+=`<polygon points="100,${F} 604,${F-42} 604,${F}" fill="#B3AEA1"/><line x1="100" y1="${F}" x2="604" y2="${F-42}" stroke="#7E786C" stroke-width="3"/>`;
  s+=`<g stroke="#5C6870" stroke-width="4"><line x1="110" y1="${F-56}" x2="604" y2="${F-98}"/>`; [130,300,470,594].forEach(x=>{const y=F-(x-100)*42/504; s+=`<line x1="${x}" y1="${y}" x2="${x}" y2="${y-50}"/>`}); s+=`</g>`;
  s+=`<g stroke="#2A2200" stroke-width="1.5" stroke-dasharray="3 3"><line x1="100" y1="${F-6}" x2="100" y2="${F+50}"/><line x1="604" y1="${F-48}" x2="604" y2="${F+50}"/></g>`;
  s+=tag(110,458,"Ubin lantai: 30 cm × 30 cm",184,F+24);
  s+=tag(470,250,"Tinggi tiap anak tangga: 15 cm",722,F-21);
  s+=tag(140,190,"Lebar ramp: 120 cm",300,F-60);
  return svg(800,500,"Ramp di pintu Gedung Kelas A, tampak samping",s);
}

function scenePot():string{
  // skala 5 px/cm: atas Ø70 = 350 px, alas Ø30 = 150 px, tinggi 40 = 200 px
  let s=`<rect width="800" height="500" fill="#E4EDE4"/><rect x="0" y="330" width="800" height="170" fill="#CFC9BA"/>`;
  for(let x=0;x<=800;x+=60){s+=`<line x1="${x}" y1="330" x2="${x-40}" y2="500" stroke="#B9B2A2" stroke-width="2"/>`}
  s+=`<line x1="0" y1="410" x2="800" y2="410" stroke="#B9B2A2" stroke-width="2"/>`;
  s+=`<ellipse cx="400" cy="334" rx="90" ry="10" fill="#000" opacity=".12"/>`;
  s+=`<polygon points="225,140 575,140 475,330 325,330" fill="#B8643E"/><polygon points="225,140 260,140 345,330 325,330" fill="#FFFFFF" opacity=".12"/>`;
  s+=`<rect x="215" y="126" width="370" height="18" rx="4" fill="#A65634"/><ellipse cx="400" cy="128" rx="178" ry="7" fill="#5A3B26"/>`;
  s+=`<path d="M400 126 C392 104 380 96 368 92 M400 126 C408 100 424 92 438 90" fill="none" stroke="#3E7A3A" stroke-width="5" stroke-linecap="round"/><ellipse cx="366" cy="92" rx="14" ry="7" fill="#4F8E45"/><ellipse cx="440" cy="90" rx="14" ry="7" fill="#4F8E45"/>`;
  // garis ukur
  s+=`<g stroke="${INK}" stroke-width="2"><line x1="225" y1="66" x2="575" y2="66"/><line x1="225" y1="58" x2="225" y2="74"/><line x1="575" y1="58" x2="575" y2="74"/><line x1="325" y1="358" x2="475" y2="358"/><line x1="325" y1="350" x2="325" y2="366"/><line x1="475" y1="350" x2="475" y2="366"/><line x1="640" y1="140" x2="640" y2="330"/><line x1="632" y1="140" x2="648" y2="140"/><line x1="632" y1="330" x2="648" y2="330"/></g>`;
  s+=`<g stroke="${INK}" stroke-width="1" stroke-dasharray="3 4" opacity=".6"><line x1="225" y1="74" x2="225" y2="140"/><line x1="575" y1="74" x2="575" y2="140"/><line x1="575" y1="140" x2="632" y2="140"/><line x1="475" y1="330" x2="632" y2="330"/></g>`;
  s+=tag(300,20,"Diameter atas: 70 cm");
  s+=tag(300,376,"Diameter alas: 30 cm");
  s+=tag(590,226,"Tinggi: 40 cm");
  s+=tag(24,230,"Berat pot kosong: 12 kg");
  return svg(800,500,"Pot tanaman berbentuk kerucut terpancung",s);
}

function sceneTaman():string{
  // tampak atas, skala 40 px/m
  let s=`<rect width="800" height="500" fill="#CFCBC0"/>`;
  for(let x=0;x<=800;x+=40){s+=`<line x1="${x}" y1="0" x2="${x}" y2="500" stroke="#BEB9AC" stroke-width="1.5"/>`}
  for(let y=10;y<=500;y+=40){s+=`<line x1="0" y1="${y}" x2="800" y2="${y}" stroke="#BEB9AC" stroke-width="1.5"/>`}
  s+=`<rect x="0" y="440" width="800" height="60" fill="#B9B3A3"/>`;
  s+=`<path d="M80 90 H560 A160 160 0 0 1 560 410 H80 Z" fill="#7FAE5A" stroke="#4E7D3A" stroke-width="8"/>`;
  const r=rng(23); s+=`<g stroke="#6A9A49" stroke-width="2" stroke-linecap="round">`;
  for(let i=0;i<420;i++){const x=90+r()*620,y=100+r()*300; const inside=(x<=560)||((x-560)**2+(y-250)**2<150**2); if(inside) s+=`<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x+3).toFixed(0)}" y2="${(y-6).toFixed(0)}"/>`}
  s+=`</g>`;
  [[200,180],[420,320],[600,230]].forEach(([x,y])=>{s+=`<circle cx="${x}" cy="${y}" r="10" fill="#E7647A"/><circle cx="${x+14}" cy="${y+8}" r="8" fill="#F2C14E"/>`});
  s+=`<rect x="300" y="452" width="120" height="30" rx="4" fill="#8A6A48"/><text x="360" y="472" font-family="Chakra Petch,sans-serif" font-size="13" font-weight="700" fill="#F4ECDD" text-anchor="middle">BANGKU</text>`;
  s+=`<g stroke="${INK}" stroke-width="2"><line x1="80" y1="58" x2="560" y2="58"/><line x1="80" y1="50" x2="80" y2="66"/><line x1="560" y1="50" x2="560" y2="66"/><line x1="44" y1="90" x2="44" y2="410"/><line x1="36" y1="90" x2="52" y2="90"/><line x1="36" y1="410" x2="52" y2="410"/></g>`;
  s+=`<rect x="288" y="44" width="64" height="28" rx="4" fill="#F7C948" stroke="${INK}" stroke-width="1.5"/><text x="320" y="64" font-family="JetBrains Mono,monospace" font-size="15" font-weight="700" fill="${INK}" text-anchor="middle">12 m</text>`;
  s+=`<rect x="12" y="236" width="64" height="28" rx="4" fill="#F7C948" stroke="${INK}" stroke-width="1.5"/><text x="44" y="256" font-family="JetBrains Mono,monospace" font-size="15" font-weight="700" fill="${INK}" text-anchor="middle">8 m</text>`;
  s+=tag(470,456,"Lebar jalan setapak: 1,5 m",620,470);
  s+=`<g transform="translate(748,40)"><circle r="22" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M0 -15 L6 4 L0 0 L-6 4 Z" fill="#BF3A2B"/><text y="16" font-family="JetBrains Mono,monospace" font-size="11" font-weight="700" fill="${INK}" text-anchor="middle">U</text></g>`;
  return svg(800,500,"Foto drone taman sekolah tampak atas",s);
}

/** Scene per post id. */
export const SCENES: Record<number, () => string> = {
  0: scenePole,
  1: sceneTandon,
  2: sceneRamp,
  3: sceneShadow,
  4: scenePot,
  5: sceneTaman,
};
