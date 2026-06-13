#!/usr/bin/env python3
"""Bake the app's actual rendered frames into a self-contained looping HTML player.

This is the "before" artifact for the demo: it shows the engine output as-played
(overshoot/twitch and all), not the clean stepped poses in anxious-jump.html. Frames
are captured live from the running app (poseForFrame for every frame) and passed in as
a JSON tool-result file.

Run: python3 demos/build-before-video.py <captured-frames.json> <out.html> "<title>" "<caption>"
"""
import json, sys, os

src, out = sys.argv[1], sys.argv[2]
title = sys.argv[3] if len(sys.argv) > 3 else "Animation playback"
caption = sys.argv[4] if len(sys.argv) > 4 else ""

raw = json.load(open(src))
# tool-result wrapper: [{"type":"text","text":"<json>"}] — or a bare object
if isinstance(raw, list) and raw and isinstance(raw[0], dict) and "text" in raw[0]:
    data = json.loads(raw[0]["text"])
else:
    data = raw
frames = data["frames"]
fps = 12

FRAMES_JS = json.dumps([{ "f": fr["f"], "anchor": fr["anchor"], "pose": fr["pose"] } for fr in frames])

TEMPLATE = r"""<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><title>__TITLE__</title>
<style>
  :root { --stage:#f7fbff; --red:#ef4444; --ink:#172033; --grid:#e7eef8; --grid2:#cfe0f6; --lab:#5b6b82; --key:#7c3aed; }
  body { margin:0; background:#fff; font-family: ui-sans-serif, system-ui, sans-serif; color:var(--ink); }
  h2 { font-size:18px; font-weight:600; margin:14px 16px 2px; }
  .cap { margin:0 16px 8px; color:var(--lab); font-size:13px; max-width:640px; }
  #play-wrap { padding:0 16px 6px; }
  svg.play { width:460px; background:var(--stage); border:1px solid #dbe7f5; border-radius:10px; display:block; }
  #frame-tag { font-size:14px; color:var(--lab); margin:6px 0 0; font-variant-numeric:tabular-nums; }
  #sheet { display:flex; flex-wrap:wrap; gap:6px; padding:6px 16px 24px; }
  .cell { width:130px; }
  .cell h3 { font-size:11px; font-weight:500; margin:0 0 2px; color:var(--lab); }
  .cell.key h3 { color:var(--key); font-weight:700; }
  svg.mini { width:130px; background:var(--stage); border:1px solid #dbe7f5; border-radius:6px; display:block; }
  svg.mini.key { border-color:var(--key); border-width:2px; }
  .gl { stroke:var(--grid); stroke-width:0.7; } .gl.maj { stroke:var(--grid2); stroke-width:1; }
  .glab { fill:var(--lab); font-size:13px; }
  .limb { fill: rgba(255,255,255,0.5); stroke:var(--red); stroke-width:2; stroke-linejoin:round; }
  .bone { stroke:#334155; stroke-width:1.6; stroke-linecap:round; }
</style></head>
<body>
<h2>__TITLE__</h2>
<p class="cap">__CAPTION__</p>
<div id="play-wrap">
  <svg class="play" id="play" viewBox="0 0 900 720" xmlns="http://www.w3.org/2000/svg"></svg>
  <p id="frame-tag"></p>
</div>
<h2>Every frame (purple = director keyframe)</h2>
<div id="sheet"></div>
<script>
const f=(n)=>Number(n.toFixed(1));
const dist=(a,b)=>Math.max(1,Math.hypot(b.x-a.x,b.y-a.y));
const unit=(a,b)=>{const l=dist(a,b);return{x:(b.x-a.x)/l,y:(b.y-a.y)/l};};
const add=(p,v,s)=>({x:p.x+v.x*s,y:p.y+v.y*s});
const off=(p,x,y)=>({x:p.x+x,y:p.y+y});
const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const S=(arr)=>arr.map(p=>`${f(p.x)},${f(p.y)}`).join(" ");
function limb(s,e,sw,ew){const ax=unit(s,e),n={x:-ax.y,y:ax.x},c=mid(s,e),hd=(sw+ew)/4;
  return S([add(s,n,sw/2),add(c,n,hd),add(e,n,ew/2),add(e,n,-ew/2),add(c,n,-hd),add(s,n,-sw/2)]);}
function torso(p){const t={ls:off(p.leftShoulder,-13,-8),rs:off(p.rightShoulder,16,-8),rr:off(p.chest,43,12),
  rw:off(p.stomach,27,20),rh:off(p.rightHip,30,23),pt:off(p.hips,0,54),lh:off(p.leftHip,-30,23),
  lw:off(p.stomach,-27,20),lr:off(p.chest,-43,12)};return S([t.ls,t.rs,t.rr,t.rw,t.rh,t.pt,t.lh,t.lw,t.lr]);}
const neck=(p)=>S([off(p.neck,-15,-4),off(p.neck,15,-4),off(p.neck,12,26),off(p.neck,-12,26)]);
const head=(h)=>S([off(h,-33,-48),off(h,30,-42),off(h,42,-5),off(h,6,47),off(h,-41,10)]);
function hand(el,h){const ax=unit(el,h),n={x:-ax.y,y:ax.x};
  return S([add(add(h,ax,-12),n,10),add(add(h,ax,6),n,16),add(add(h,ax,25),n,1),add(add(h,ax,6),n,-16),add(add(h,ax,-12),n,-11)]);}
function foot(kn,ft,d){const ax=unit(kn,ft),n={x:-ax.y,y:ax.x},fw=unit(ft,{x:ft.x+d*48,y:ft.y+8}),tb=add(ft,fw,28),tt=add(ft,fw,43);
  return S([add(add(ft,ax,-14),n,11),add(tt,n,5),add(tt,n,-8),add(tb,n,-14),add(add(ft,ax,-18),n,-4)]);}
function polys(p){return [
  limb(p.leftShoulder,p.leftElbow,24,18),limb(p.leftElbow,p.leftHand,18,13),
  limb(p.leftHip,p.leftKnee,28,21),limb(p.leftKnee,p.leftFoot,21,15),
  limb(p.rightShoulder,p.rightElbow,25,18),limb(p.rightHip,p.rightKnee,29,21),
  torso(p),neck(p),head(p.head),limb(p.rightElbow,p.rightHand,18,13),
  hand(p.leftElbow,p.leftHand),hand(p.rightElbow,p.rightHand),
  limb(p.rightKnee,p.rightFoot,21,15),foot(p.leftKnee,p.leftFoot,-1),foot(p.rightKnee,p.rightFoot,1)];}
const EDGES=[["head","neck"],["neck","chest"],["chest","stomach"],["stomach","hips"],["neck","leftShoulder"],["neck","rightShoulder"],["leftShoulder","leftElbow"],["leftElbow","leftHand"],["rightShoulder","rightElbow"],["rightElbow","rightHand"],["hips","leftHip"],["hips","rightHip"],["leftHip","leftKnee"],["leftKnee","leftFoot"],["rightHip","rightKnee"],["rightKnee","rightFoot"]];
const NODES=["head","neck","chest","stomach","hips","leftShoulder","rightShoulder","leftElbow","rightElbow","leftHand","rightHand","leftHip","rightHip","leftKnee","rightKnee","leftFoot","rightFoot"];
function grid(W,H,labels){let g="";for(let x=0;x<=W;x+=50){const m=x%100===0;g+=`<line class="gl ${m?'maj':''}" x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;if(m&&labels)g+=`<text class="glab" x="${x+2}" y="14">${x}</text>`;}
  for(let y=0;y<=H;y+=50){const m=y%100===0;g+=`<line class="gl ${m?'maj':''}" x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;if(m&&labels&&y>0)g+=`<text class="glab" x="3" y="${y-3}">${y}</text>`;}return g;}
function figure(p){return polys(p).map(pp=>`<polygon class="limb" points="${pp}"/>`).join("")
  +EDGES.map(([a,b])=>`<line class="bone" x1="${p[a].x}" y1="${p[a].y}" x2="${p[b].x}" y2="${p[b].y}"/>`).join("")
  +NODES.map(k=>`<circle cx="${p[k].x}" cy="${p[k].y}" r="4" fill="#334155"/>`).join("");}

const FRAMES = __FRAMES__;
const FPS = __FPS__;

document.getElementById("sheet").innerHTML = FRAMES.map(fr=>
  `<div class="cell ${fr.anchor?'key':''}"><h3>f${fr.f}${fr.anchor?' ◆ key':''}</h3>`+
  `<svg class="mini ${fr.anchor?'key':''}" viewBox="0 0 900 720">${grid(900,720,false)}${figure(fr.pose)}</svg></div>`
).join("");

const play=document.getElementById("play"), tag=document.getElementById("frame-tag");
const gridLayer=grid(900,720,false);
let i=0;
function step(){
  const fr=FRAMES[i];
  play.innerHTML=gridLayer+figure(fr.pose);
  tag.textContent=`frame ${fr.f} / ${FRAMES.length-1}${fr.anchor?'   ◆ director keyframe':''}`;
  i=(i+1)%FRAMES.length;
  setTimeout(step, 1000/FPS);
}
step();
</script>
</body></html>
"""

html = (TEMPLATE
        .replace("__FRAMES__", FRAMES_JS)
        .replace("__FPS__", str(fps))
        .replace("__TITLE__", title)
        .replace("__CAPTION__", caption))
with open(out, "w") as fh:
    fh.write(html)
print(f"Wrote {out}: {len(frames)} frames @ {fps}fps")
