let map;
let service;
let userMarker;
let searchMarker;
let markers = [];

function showPage(id) {
  document.querySelectorAll(".page").forEach((p) => (p.style.display = "none"));
  document.getElementById(id).style.display = "block";
}

// mapa mental zoom in - zoom out
const imagem = document.getElementById("mapaMental");
const overlay = document.getElementById("overlay");

// Função que gerencia o clique
function toggleZoom() {
  imagem.classList.toggle("zoom-ativo");
  overlay.classList.toggle("overlay-ativo");
}

imagem.addEventListener("click", toggleZoom);
imagem.addEventListener("click", toggleZoom);

function initMap() {
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
      });

      // marcador do usuário
      userMarker = new google.maps.Marker({
        position: userLocation,
        map,
        title: "Você está aqui",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#00BFFF",
          fillOpacity: 1,
          strokeColor: "#000A23",
          strokeWeight: 2,
        },
      });

      service = new google.maps.places.PlacesService(map);

      // 🔥 busca automática assim que abrir
      buscarAdvogados(userLocation);

      // campo de pesquisa
      const input = document.getElementById("search-input");
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
    },
    (err) => {
      alert("Erro ao obter localização. Ative o GPS e tente novamente.");
      console.error(err);
    }
  );
}

function buscarAdvogados(local) {
  // limpa marcadores antigos
  markers.forEach((m) => m.setMap(null));
  markers = [];

  const request = {
    location: local,
    radius: 5000,
    keyword: "escritório de advocacia OR advogado OR law office",
  };

  service.nearbySearch(request, (results, status) => {
    if (status !== google.maps.places.PlacesServiceStatus.OK) {
      console.warn("Status da busca:", status);
      alert("Nenhum escritório encontrado nas proximidades.");
      return;
    }

    results.forEach((place) => {
      const marker = new google.maps.Marker({
        map,
        position: place.geometry.location,
        icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
        title: place.name,
      });

      const infowindow = new google.maps.InfoWindow({
        content: `
          <strong>${place.name}</strong><br>
          ${place.vicinity || "Endereço indisponível"}<br>
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            place.name
          )}" target="_blank">
            Ver no Google Maps
          </a>
        `,
      });

      marker.addListener("click", () => infowindow.open(map, marker));
      markers.push(marker);
    });
  });
}

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
const URL = `https://newsapi.org/v2/everything?q=human%20rights&sortBy=publishedAt&apiKey=${API_KEY}`;

async function traduzirTexto(texto) {
  if (!texto) return "";
  try {
    const resp = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        texto
      )}&langpair=en|pt`
    );
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
