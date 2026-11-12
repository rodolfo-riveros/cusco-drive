// HTML del mapa (Leaflet + OpenStreetMap). Se carga dentro de un WebView (Android/iOS) o un iframe (web).
// Recibe el estado por window.__update(state) y avisa toques/arrastres con postMessage.
import { mdiRickshaw, mdiTaxi, mdiTruckFlatbed, mdiTruckDelivery } from '@mdi/js';
import { C } from '../theme';

const ICONS = { mototaxi: mdiRickshaw, taxi: mdiTaxi, motocarga: mdiTruckFlatbed, mudanza: mdiTruckDelivery };

export function buildMapHtml() {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{margin:0;height:100%;width:100%;background:${C.mapBg};font-family:-apple-system,Roboto,sans-serif}
  .leaflet-control-attribution{font-size:9px}
  .cd-me{width:22px;height:22px;border-radius:50%;background:${C.navy};border:4px solid #fff;box-sizing:border-box;box-shadow:0 0 0 10px rgba(18,40,92,.15)}
  .cd-origin{width:22px;height:22px;border-radius:50%;background:${C.navy};border:4px solid #fff;box-sizing:border-box;box-shadow:0 2px 8px rgba(0,0,0,.35)}
  .cd-dest{width:22px;height:22px;border-radius:5px;background:${C.gold};border:4px solid #fff;box-sizing:border-box;box-shadow:0 2px 8px rgba(0,0,0,.35)}
  .cd-veh{width:38px;height:38px;border-radius:12px;background:${C.green};border:3px solid #fff;box-sizing:border-box;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.3)}
  .cd-veh.off{background:#A3ADBF}
  .cd-veh svg{width:24px;height:24px;fill:#fff}
  .cd-drag{cursor:grab}
  .leaflet-tooltip.cd-tip{background:#fff;border:1px solid ${C.border};border-radius:8px;color:${C.navy};font-weight:800;font-size:11px;padding:3px 8px;box-shadow:0 2px 6px rgba(0,0,0,.15)}
  .leaflet-tooltip.cd-tip:before{display:none}
</style></head><body><div id="map"></div>
<script>
  var ICONS = ${JSON.stringify(ICONS)};
  function send(m){ m = JSON.stringify(m);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m); else if (window.parent) window.parent.postMessage(m, '*'); }
  var map = L.map('map', { zoomControl:false, attributionControl:true }).setView([-13.3048,-72.116], 15);
  // Mapa base: OpenStreetMap. Si sus teselas fallan (bloqueo o sin red), cambia a Esri World Street Map.
  var base = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution:'&copy; OpenStreetMap' }).addTo(map);
  var fails = 0, switched = false;
  base.on('tileerror', function(){
    if (switched || ++fails < 4) return;
    switched = true; map.removeLayer(base);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution:'Tiles &copy; Esri &middot; OpenStreetMap' }).addTo(map);
  });
  var layers = {}, routeLine = null, routeBg = null, area = null, lastFit = null, lastCenter = null;
  map.on('click', function(e){ send({ type:'press', latitude:e.latlng.lat, longitude:e.latlng.lng }); });
  function icon(m){
    var html, size = [22,22];
    if (m.kind === 'vehicle') { html = '<div class="cd-veh'+(m.active===false?' off':'')+'"><svg viewBox="0 0 24 24"><path d="'+(ICONS[m.category]||ICONS.mototaxi)+'"/></svg></div>'; size=[38,38]; }
    else html = '<div class="cd-'+(m.kind||'origin')+(m.draggable?' cd-drag':'')+'"></div>';
    return L.divIcon({ html: html, className: '', iconSize: size, iconAnchor: [size[0]/2, size[1]/2] });
  }
  window.__update = function(s){
    var seen = {};
    (s.markers||[]).forEach(function(m){
      seen[m.key] = 1;
      var sig = m.kind+'|'+m.category+'|'+m.active+'|'+m.draggable+'|'+(m.label||'');
      var l = layers[m.key];
      if (l && l._sig !== sig) { map.removeLayer(l); l = null; }
      if (!l) {
        l = L.marker([m.latitude, m.longitude], { icon: icon(m), draggable: !!m.draggable, zIndexOffset: m.kind==='vehicle'?500:(m.draggable?800:0) }).addTo(map);
        l._sig = sig; l._key = m.key;
        if (m.label) l.bindTooltip(m.label, { permanent:true, direction:'top', offset:[0,-14], className:'cd-tip' });
        if (m.draggable) {
          l.on('dragstart', function(ev){ ev.target._isDragging = true; });
          l.on('dragend', function(ev){ ev.target._isDragging = false; var p = ev.target.getLatLng(); send({ type:'drag', key: ev.target._key, latitude:p.lat, longitude:p.lng }); });
        }
        layers[m.key] = l;
      } else if (!l._isDragging) {
        l.setLatLng([m.latitude, m.longitude]);
      }
    });
    Object.keys(layers).forEach(function(k){ if(!seen[k]){ map.removeLayer(layers[k]); delete layers[k]; } });
    if (routeLine) { map.removeLayer(routeLine); map.removeLayer(routeBg); routeLine = null; }
    if (s.route && s.route.length > 1) {
      var pts = s.route.map(function(p){ return [p.latitude, p.longitude]; });
      routeBg = L.polyline(pts, { color:'#ffffff', weight:9, opacity:.9 }).addTo(map);
      routeLine = L.polyline(pts, { color: s.routeColor || '${C.navy}', weight:5, opacity:1, dashArray: s.routeDashed ? '2 10' : null, lineCap:'round' }).addTo(map);
    }
    if (area) { map.removeLayer(area); area = null; }
    if (s.area) area = L.circle([s.area.latitude, s.area.longitude], { radius: s.area.radius, color:'rgba(18,40,92,.45)', weight:2, fillColor:'${C.gold}', fillOpacity:.06, dashArray:'6 6', interactive:false }).addTo(map);
    if (s.fitKey && s.fitKey !== lastFit && s.fit && s.fit.length) {
      lastFit = s.fitKey;
      if (s.fit.length === 1) {
        // Centra el punto en la parte visible (encima del panel inferior)
        var z = s.zoom || 16, pt = map.project([s.fit[0].latitude, s.fit[0].longitude], z);
        pt = pt.add([0, ((s.padBottom||40) - (s.padTop||40)) / 2]);
        map.setView(map.unproject(pt, z), z, { animate:true });
      }
      else map.fitBounds(s.fit.map(function(p){ return [p.latitude, p.longitude]; }), { padding:[40,40], paddingBottomRight:[40, s.padBottom||40], paddingTopLeft:[40, s.padTop||40], maxZoom:17, animate:true });
    }
  };
  window.addEventListener('message', function(e){ try { var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; if (d && d.__cd) window.__update(d.state); } catch(err){} });
  send({ type:'ready' });
</script></body></html>`;
}
