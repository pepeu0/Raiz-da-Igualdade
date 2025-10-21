let map;
let service;
let userMarker;
let searchMarker;
let markers = [];
let idleTimeout;

// Função de troca de páginas
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  const page = document.getElementById(id);
  if (!page) return;
  page.style.display = "block";

  // 🔥 Quando o mapa for mostrado, forçar atualização
  if (id === "mapa" && map) {
    setTimeout(() => {
      google.maps.event.trigger(map, "resize");
      if (userMarker) map.setCenter(userMarker.getPosition());
      buscarAdvogados(map.getCenter());
    }, 300);
  }
}

// Zoom da imagem do mapa mental
const imagem = document.getElementById("mapaMental");
if (imagem) {
  const overlay = document.getElementById("overlay");
  imagem.addEventListener("click", () => {
    imagem.classList.toggle("zoom-ativo");
    overlay.classList.toggle("overlay-ativo");
  });
}

// Inicialização do mapa
function initMap() {
  console.log("🗺️ Iniciando mapa...");
  if (!navigator.geolocation) {
    alert("Seu navegador não suporta geolocalização.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const userLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };

      map = new google.maps.Map(document.getElementById("map"), {
        center: userLocation,
        zoom: 14,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#0b253a" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#000000" }] },
        ],
      });

      userMarker = new google.maps.Marker({
        position: userLocation,
        map,
        title: "Você está aqui",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#00BFFF",
          fillOpacity: 1,
          strokeColor: "#002244",
          strokeWeight: 2,
        },
      });

      service = new google.maps.places.PlacesService(map);

      // Busca inicial automática
      buscarAdvogados(userLocation);

      // Atualiza escritórios quando o mapa parar de se mover
      google.maps.event.addListener(map, "idle", () => {
        clearTimeout(idleTimeout);
        idleTimeout = setTimeout(() => {
          buscarAdvogados(map.getCenter());
        }, 800);
      });

      // Campo de pesquisa
      const input = document.getElementById("search-input");
      if (input) {
        const autocomplete = new google.maps.places.Autocomplete(input);
        autocomplete.bindTo("bounds", map);
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) return;
          map.setCenter(place.geometry.location);
          map.setZoom(15);
          if (searchMarker) searchMarker.setMap(null);
          searchMarker = new google.maps.Marker({
            map,
            position: place.geometry.location,
            icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
            title: place.name,
          });
          buscarAdvogados(place.geometry.location);
        });
      }
    },
    (err) => {
      console.error(err);
      alert("Erro ao obter localização. Verifique as permissões de GPS.");
    }
  );
}

// Busca escritórios próximos
function buscarAdvogados(local) {
  if (!service || !local) return;

  markers.forEach(m => m.setMap(null));
  markers = [];

  const request = {
    location: local,
    radius: 4000,
    keyword: "escritório de advocacia OR advogado OR law office",
  };

  service.nearbySearch(request, (results, status) => {
    console.log("🔍 Status da busca:", status, "Resultados:", results?.length || 0);
    if (status !== google.maps.places.PlacesServiceStatus.OK) return;

    results.forEach((place) => {
      if (!place.geometry || !place.geometry.location) return;
      const marker = new google.maps.Marker({
        map,
        position: place.geometry.location,
        icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
        title: place.name,
      });
      const info = new google.maps.InfoWindow({
        content: `
          <strong>${place.name}</strong><br>
          ${place.vicinity || "Endereço não informado"}<br>
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}"
             target="_blank">Ver no Google Maps</a>
        `,
      });
      marker.addListener("click", () => info.open(map, marker));
      markers.push(marker);
    });
  });
}

// Busca por texto manual
function buscarPorTexto() {
  const termo = document.getElementById("search-input").value.trim();
  if (!termo) return alert("Digite um local ou tipo de advocacia.");
  const textService = new google.maps.places.PlacesService(map);
  textService.textSearch({ query: termo }, (results, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
      const local = results[0].geometry.location;
      map.setCenter(local);
      map.setZoom(15);
      if (searchMarker) searchMarker.setMap(null);
      searchMarker = new google.maps.Marker({
        map,
        position: local,
        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      });
      buscarAdvogados(local);
    } else {
      alert("Nenhum resultado encontrado.");
    }
  });
}

//News
const API_KEY = "b0a7ec63d51246ea985d9b85604d8c56"; // <-- Coloque sua chave aqui
const NEWS_URL = `https://newsapi.org/v2/everything?q=human%20rights&sortBy=publishedAt&apiKey=${API_KEY}`;

async function traduzirTexto(texto) {
  if (!texto) return "";
  try {
    const resp = await fetch(NEWS_URL);
    const data = await resp.json();
    return data.responseData.translatedText;
  } catch (e) {
    console.error("Erro ao traduzir:", e);
    return texto;
  }
}

async function carregarNoticias(forcarAtualizacao = false) {
  const container = document.getElementById("noticias");
  const ultimaAtualizacao = document.getElementById("ultimaAtualizacao");
  container.innerHTML = "🔄 Atualizando notícias...";

  try {
    const cache = localStorage.getItem("noticias_cache");
    const cacheTempo = localStorage.getItem("noticias_cache_tempo");
    const agora = Date.now();

    // se o cache for recente (menos de 30 min) e não for atualização forçada
    if (
      cache &&
      cacheTempo &&
      !forcarAtualizacao &&
      agora - cacheTempo < 30 * 60 * 1000
    ) {
      const dados = JSON.parse(cache);
      renderizarNoticias(dados);
      return;
    }

    // busca novas notícias da API
    const resposta = await fetch(URL);
    const dados = await resposta.json();

    // salva no cache
    localStorage.setItem("noticias_cache", JSON.stringify(dados));
    localStorage.setItem("noticias_cache_tempo", agora);

    renderizarNoticias(dados);
  } catch (error) {
    console.error(error);
    container.innerHTML = "<p>Erro ao carregar notícias.</p>";
  }
}

async function renderizarNoticias(dados) {
  const container = document.getElementById("noticias");
  const ultimaAtualizacao = document.getElementById("ultimaAtualizacao");
  container.innerHTML = "";

  if (!dados.articles || dados.articles.length === 0) {
    container.innerHTML = "<p>Nenhuma notícia encontrada.</p>";
    return;
  }

//para alterar o número de noticias alterar de 6 para a quantidade desejada
  for (const noticia of dados.articles.slice(0, 6)) {
    const tituloTraduzido = await traduzirTexto(noticia.title);
    const descricaoTraduzida = await traduzirTexto(noticia.description);

    const div = document.createElement("div");
    div.className = "noticia";
    div.innerHTML = `
      ${noticia.urlToImage ? `<img src="${noticia.urlToImage}" alt="Imagem da notícia">` : ""}
      <h2>${tituloTraduzido}</h2>
      <p>${descricaoTraduzida}</p>
      <a href="${noticia.url}" target="_blank">Ler mais →</a>
    `;
    container.appendChild(div);
  }

  const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  ultimaAtualizacao.textContent = `🕒 Última atualização: ${hora}`;
}

document.getElementById("atualizarBtn").addEventListener("click", () => carregarNoticias(true));


carregarNoticias();
