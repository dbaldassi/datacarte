
// ================= CONFIGURATION MAP =================
const map_config = {
    center: [46.2276, 2.2137],
    zoom: 6,
    minZoom: 5,
    maxBounds: [[41, -6], [52, 12]]
};

const pdl_layer = L.layerGroup();
const markers = L.markerClusterGroup();
const pdl_dc_line_layer = L.layerGroup();

// ================= INIT MAP =================

const osm = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>',
    maxZoom: 19
});

const map = L.map('map', {
    maxBounds: map_config.maxBounds,
    maxBoundsViscosity: 1.0,
    zoomControl: false,
    layers: [osm,markers]
}).setView(map_config.center, map_config.zoom);

const baseLayers = {
	'OpenStreetMap': osm,
};

const overlays = {
    'Datacenters': markers,
    'Point de livraison': pdl_layer,
    'Connexion PdL et DC': pdl_dc_line_layer
};

const layerControl = L.control.layers(baseLayers, overlays).addTo(map);

L.control.zoom({ position: 'bottomright' }).addTo(map);

var linear_index;

// ================= MASQUE FRANCE =================
async function load_france_mask() {
    try {
        const res = await fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries/FRA.geo.json');
        if (!res.ok) return;
        const data = await res.json();
        L.geoJSON(data.features ? data.features[0] : data, { style: { color: "#667eea", weight: 2, fillOpacity: 0 } }).addTo(map);
    } catch { console.warn("Masque France non chargé"); }
}

// ================= CHARGEMENT =================
async function fetch_route(route, opts) {
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port;

    try {
        const url = `${protocol}//${host}:${port}/${route}`;
        const response = await fetch(url, opts);
        if (!response.ok) throw new Error(`Could not fetch ${route}.`);

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
    }
}

function sidebar_display_naf(feature) {
    const naf = feature.properties.code_secteur_naf2;
    if(naf) {
        fetch_route(`naf/${naf}`).then((data) => {
            const badge = document.getElementById('naf-badge');
            badge.style.display = 'inline-block';
            badge.innerText = `NAF ${naf} : ${data["intitulé"]}`;
        });
    }
    else {
        const badge = document.getElementById('naf-badge');
        badge.style.display = 'none';
        badge.innerText = `Pas de code NAF`;
    }
}

function sidebar_display_enedis_history(feature) {
    document.getElementById('conso-section').classList.remove('hidden');
    document.getElementById('dc-conso').innerText = `${magnitude_order(feature.properties.conso, "M")}Wh`;

    const body = JSON.stringify({
        city: feature.properties["Nom commune"],
        address: feature.properties.Adresse,
        naf: feature.properties.code_secteur_naf2
    });

    fetch_route("history", { method: 'POST', body }).then((data) => {
        const thead = document.querySelector('table thead');
        if(thead) {
            thead.innerHTML = `<tr><th>Année</th><th style="text-align:right">Conso (MWh)</th><th style="text-align:right">Évolution</th></tr>`;
        }

        const tbody = document.getElementById('history-body');
        tbody.innerHTML = '';

        data.forEach((row, i) => {
            let trend = '-';
            if (i < data.length - 1) {
                const prev = data[i + 1].conso;
                const diff = row.conso - prev;
                const pct = ((diff / prev) * 100).toFixed(1);
                trend = diff > 0 ? `<span style='color:#E63946; font-weight:bold;'>+${pct}% ↗</span>` : `<span style='color:#00C896; font-weight:bold;'>${pct}% ↘</span>`;
            }
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>${row["Année"]}</strong></td><td style="text-align:right">${row.conso.toLocaleString('fr-FR')}</td><td style="text-align:right">${trend}</td>`;
            tbody.appendChild(tr);
        });
    })
}

function show_sidebar(feature) {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('hidden');
    
    const back = document.getElementById('sidebar-back-btn');
    back.classList.add('hidden');

    document.getElementById('dc-name').innerText = feature.properties.name ?? "Nom inconnu";
    document.getElementById('dc-address').innerText = feature.properties.Adresse ?? "Adresse inconnue";

    sidebar_display_naf(feature);

    if(is_enedis(feature)) sidebar_display_enedis_history(feature);
}

function magnitude_order(value, uniteInitiale) {
    const prefixes = ['_', 'K', 'M', 'G', 'T', 'P', 'E'];

    const initial_index = prefixes.indexOf(uniteInitiale.toUpperCase());
    if (initial_index === -1) {
        throw new Error("Unité initiale non supportée. Utilisez K, M, G, T, P, E.");
    }

    let raw_value = value * Math.pow(1000, initial_index);

    if (raw_value === 0) return "0 "; // Gestion du zéro

    let optimal_index = Math.floor(Math.log10(Math.abs(raw_value)) / 3);

    optimal_index = Math.max(0, Math.min(optimal_index, prefixes.length - 1));

    let final_value = raw_value / Math.pow(1000, optimal_index);
    final_value = Math.round(final_value * 1e12) / 1e12;

    const suffix = prefixes[optimal_index] === '_' ? '' : prefixes[optimal_index];

    return `${Math.round(final_value * 100) / 100} ${suffix}`;
}

function get_it_surface(area, height) {
    const num_floor = 1 + ((height ?? 0) / 6);
    const it = area * num_floor / 2;

    return Math.round(it);
}

function bind_feature_popup(feature, layer) {
    let properties = "<h2>Propriétés :</h2></br>";

    if(feature.properties.name) {
        properties += `<b>Nom</b>: ${feature.properties.name}<br/>`;
    }

    if(feature.properties.conso) {
        const conso = Math.round(feature.properties.conso, 0);
        properties += `<b>Consommation annuelle</b>: ${conso} MWh<br/>`;
    }

    if(feature.properties.power) {
        properties += `<b>Puissance installée</b>: ${feature.properties.power} kW<br/>`;
    }

    if(feature.properties.Superficie) {
        properties += `<b>Emprise au sol</b>: ${feature.properties.Superficie} m2<br/>`;
    }

    if(feature.properties.Hauteur) {
        properties += `<b>Hauteur</b>: ${feature.properties.Hauteur} m<br/>`;
    }

    if(feature.properties["ITSurface"]) {
        const surface = feature.properties["ITSurface"];
        properties += `<b>Surface IT</b>: ${surface} m2<br/>`;
    }
    else {
        if(feature.properties.Superficie) {
            const surface = get_it_surface(feature.properties.Superficie, feature.properties.Hauteur);
            properties += `<b>Surface IT (estimée)</b>: ${surface} m2<br/>`;
        }
    }

    if(feature.properties.code_secteur_naf2) {
        properties += `<b>NAF2</b>: ${feature.properties.code_secteur_naf2}<br/>`;
    }

    const popup = document.createElement('div');
    popup.innerHTML = properties;

    const button = document.createElement('button');
    button.innerText = "More";
    button.addEventListener("click", () => show_sidebar(feature));

    popup.appendChild(button);

    layer.bindPopup(popup);
}

function estimate_consumption(surface) {
    return surface * linear_index.slope + linear_index.origin;
}

function get_consumption_category(conso) {
    const gwh = conso / 1000;

    if(gwh > 100)      return "ultra";
    if(gwh > 10)       return "high";
    if(gwh > 1)        return "medium";
    if(gwh && gwh > 0) return "low";

    return "unknown";
}

function get_surface_category(surface) {
    if(surface > 10000) return "ultra";
    if(surface >= 5000) return "high";
    if(surface >= 1000) return "medium";
    if(surface >= 500)  return "low";
    if(surface >= 100)  return "tiny";

    return "micro";
}

function set_feature_style(feature) {
    const cat = get_consumption_category(feature.properties.conso);

    switch(cat) {
    case 'ultra':   return { color: "#000000" };
    case 'high':    return { color: "#ff0000" };
    case 'medium':  return { color: "#ff9800" };
    case 'low':     return { color: "#ddbb00" };
    case 'unknown': return { color: "#aaaaaa" };
    }

    return { color: "#ffffff" };
}

function filter_conso(feature) {
    const conso_filter = document.getElementById('filter-conso').value;
    const cat = get_consumption_category(feature.properties.conso);

    return conso_filter === "all" || cat === conso_filter;
}

function filter_surface(feature) {
    const filter = document.getElementById('filter-surface').value;
    const surface = feature.properties["ITSurface"] ?? get_it_surface(feature.properties.Superficie, feature.properties.Hauteur);
    const cat = get_surface_category(surface);

    return filter === "all" || cat === filter;
}

function is_enedis(feature) {
    return feature.properties.conso && feature.properties.Adresse && !feature.properties["Code IRIS"];
}

function is_rte(feature) {
    return feature.properties.conso && feature.properties["Code IRIS"] &&
        (feature.properties["Nom commune"] === "Marcoussis" || feature.properties["Nom commune"] === "Labruguière");
}

function is_likely_rte(feature) {
    return !is_rte(feature) && feature.properties.conso && feature.properties["Code IRIS"];
}

function filter_pdl(feature) {
    const pdl_filter = document.getElementById('filter-pdl').value;

    if(pdl_filter === "enedis")     return is_enedis(feature);
    if(pdl_filter === "rte")        return is_rte(feature);
    if(pdl_filter === "likely-rte") return is_likely_rte(feature);
    if(pdl_filter === "none")       return !is_enedis(feature) && !is_rte(feature) && !is_likely_rte(feature);

    return true;
}

function apply_filters(feature) {
    return filter_conso(feature) && filter_pdl(feature) && filter_surface(feature);
}

function add_enedis_connection(feature) {
    if(feature.properties["Enedis Latitude"]) {
        L.polyline([[feature.properties["Enedis Latitude"], feature.properties["Enedis Longitude"]],
                    feature.geometry.coordinates.toReversed()])
         .bindTooltip(`${feature.properties.Distance_m} m`)
         .addTo(pdl_dc_line_layer);
    }
}

function add_enedis_pdl(feature) {
    if(feature.properties["Enedis Latitude"]) {
        const popup_text = `<h2>Propriétés : </h2><br/>
<b>Consommation (2024)</b>: ${Math.round(feature.properties.conso)} MWh</br>
<b>Adresse</b>: ${feature.properties.Adresse}</br>
<b>Commune</b>: ${feature.properties["Nom commune"]}</br>
<b>Code NAF2</b>: ${feature.properties.code_secteur_naf2}
`;

        L.marker([feature.properties["Enedis Latitude"], feature.properties["Enedis Longitude"]])
         .bindPopup(popup_text)
         .addTo(pdl_layer);
    }
}

function add_rte_connection(feature) {
    if(feature.properties["Géo-point IRIS"]) {
        L.polyline([feature.properties["Géo-point IRIS"].split(','),
                    feature.geometry.coordinates.toReversed()])
         .bindTooltip(`${feature.properties.Distance_m} m`)
         .addTo(pdl_dc_line_layer);
    }
}

function add_rte_pdl(feature) {
    if(feature.properties["Géo-point IRIS"]) {
        const popup_text = `<h2>Propriétés : </h2><br/>
<b>Consommation (2023)</b>: ${Math.round(feature.properties.conso)} MWh</br>
<b>Commune</b>: ${feature.properties["Nom commune"]}</br>
`;

        L.marker(feature.properties["Géo-point IRIS"].split(','))
         .bindPopup(popup_text)
         .addTo(pdl_layer);
    }
}

function on_each_feature(feature, layer, metrics) {
    bind_feature_popup(feature, layer);

    const surface = feature.properties["ITSurface"] ?? get_it_surface(feature.properties.Superficie, feature.properties.Hauteur);

    if(is_enedis(feature)) {
        if(!metrics.conso_address.has(feature.properties.Adresse)) {
            metrics.conso_address.set(feature.properties.Adresse, feature.properties.conso);
            add_enedis_pdl(feature);
        }

        add_enedis_connection(feature);
    }
    else if(is_rte(feature)) {
        if(!metrics.conso_address.has(feature.properties["Code IRIS"])) {
            metrics.conso_iris.set(feature.properties["Code IRIS"], feature.properties.conso);
            add_rte_pdl(feature);
        }

        add_rte_connection(feature);
    }
    else {
        metrics.est_conso += estimate_consumption(surface);
    }

    metrics.num_dc += 1;
    metrics.surface_it_total += surface;
}

function redraw_markers(datacenters_geojson) {
    markers.clearLayers();
    pdl_layer.clearLayers();
    pdl_dc_line_layer.clearLayers();

    const metrics = {
        num_dc: 0,
        est_conso: 0,
        surface_it_total: 0,
        conso_address: new Map(),
        conso_iris: new Map()
    };

    const geojson = L.geoJSON(datacenters_geojson, {
        pointToLayer: (feature, latlng) => L.circleMarker(latlng),
        style: set_feature_style,
        filter: apply_filters,
        onEachFeature: (feature, layer) => on_each_feature(feature, layer, metrics)
    });

    const conso = metrics.conso_iris.values().reduce((a, b) => a + b, 0) +
          metrics.conso_address.values().reduce((a, b) => a + b, 0);

    document.getElementById('dc-count').innerText = metrics.num_dc;
    document.getElementById('total-conso-pdl').innerText = `${magnitude_order(conso, "M")}Wh`;
    document.getElementById('total-conso-est').innerText = `${magnitude_order(conso + metrics.est_conso, "M")}Wh`;
    document.getElementById('total-surface-it').innerText = `${metrics.surface_it_total} m2`;

    markers.addLayer(geojson);
}

async function init() {
    load_france_mask();

    try {
        linear_index = await fetch_route("linear_index");
        const datacenters_geojson = await fetch_route("datacenters");
        redraw_markers(datacenters_geojson);

        document.getElementById('filter-conso').addEventListener('change', () => redraw_markers(datacenters_geojson));
        document.getElementById('filter-pdl').addEventListener('change', () => redraw_markers(datacenters_geojson));
        document.getElementById('filter-surface').addEventListener('change', () => redraw_markers(datacenters_geojson));
        document.getElementById('close-sidebar').addEventListener('click', () => document.getElementById('sidebar').classList.add('hidden'));

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                renderRanking(e.target.dataset.filter);
            });
        });

    } catch (e) {
        console.error(e);
        document.getElementById('dc-count').innerText = "Err";
    }
}

document.addEventListener("DOMContentLoaded", () => init());
