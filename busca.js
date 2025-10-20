let map;
let service;
let userMarker;
let searchMarker;
let markers = [];

function irPara(pagina) {
  window.location.href = pagina;
}

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
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}" target="_blank">
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
