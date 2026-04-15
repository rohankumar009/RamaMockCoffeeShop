// Mobile navigation drawer toggle behavior
const menuToggle = document.querySelector(".menu-toggle");
const mobileDrawer = document.querySelector("#mobile-drawer");
const mobileLinks = mobileDrawer.querySelectorAll("a");

const setDrawerState = (isOpen) => {
  mobileDrawer.classList.toggle("open", isOpen);
  mobileDrawer.setAttribute("aria-hidden", String(!isOpen));
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  document.body.style.overflow = isOpen ? "hidden" : "";
};

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  setDrawerState(!isOpen);
});

mobileLinks.forEach((link) => {
  link.addEventListener("click", () => setDrawerState(false));
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    setDrawerState(false);
  }
});

document.addEventListener("click", (event) => {
  const clickedOutside = !mobileDrawer.contains(event.target) && !menuToggle.contains(event.target);
  const isOpen = mobileDrawer.classList.contains("open");

  if (clickedOutside && isOpen) {
    setDrawerState(false);
  }
});


// Intersection Observer fade-in animation for sections and cards on scroll
const observer = new IntersectionObserver(
  (entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.18,
    rootMargin: "0px 0px -40px 0px"
  }
);

document.querySelectorAll(".fade-in").forEach((element) => {
  observer.observe(element);
});

// Lightweight vanilla JS map using OpenStreetMap tiles with a fixed geographic marker
const customMap = document.querySelector("#custom-map");

if (customMap) {
  const tileLayer = document.querySelector("#map-tiles");
  const markerEl = document.querySelector(".map-marker");
  const tileSize = 256;
  const markerLat = Number(customMap.dataset.markerLat);
  const markerLng = Number(customMap.dataset.markerLng);
  const state = {
    lat: Number(customMap.dataset.lat),
    lng: Number(customMap.dataset.lng),
    zoom: Number(customMap.dataset.zoom || 16),
    width: 0,
    height: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    startWorldX: 0,
    startWorldY: 0
  };

  const clampLat = (lat) => Math.max(-85.05112878, Math.min(85.05112878, lat));
  const lngToWorldX = (lng, zoom) => ((lng + 180) / 360) * tileSize * 2 ** zoom;
  const latToWorldY = (lat, zoom) => {
    const safeLat = clampLat(lat);
    const radians = (safeLat * Math.PI) / 180;
    const mercator = Math.log(Math.tan(Math.PI / 4 + radians / 2));
    return ((1 - mercator / Math.PI) / 2) * tileSize * 2 ** zoom;
  };
  const worldXToLng = (worldX, zoom) => (worldX / (tileSize * 2 ** zoom)) * 360 - 180;
  const worldYToLat = (worldY, zoom) => {
    const n = Math.PI - (2 * Math.PI * worldY) / (tileSize * 2 ** zoom);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  };

  const renderMap = () => {
    state.width = customMap.clientWidth;
    state.height = customMap.clientHeight;

    const worldSize = tileSize * 2 ** state.zoom;
    const centerX = lngToWorldX(state.lng, state.zoom);
    const centerY = latToWorldY(state.lat, state.zoom);
    const originX = centerX - state.width / 2;
    const originY = centerY - state.height / 2;
    const startTileX = Math.floor(originX / tileSize);
    const endTileX = Math.floor((originX + state.width) / tileSize);
    const startTileY = Math.floor(originY / tileSize);
    const endTileY = Math.floor((originY + state.height) / tileSize);

    tileLayer.innerHTML = "";

    for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
      for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
        if (tileY < 0 || tileY >= 2 ** state.zoom) {
          continue;
        }

        const wrappedTileX = ((tileX % (2 ** state.zoom)) + 2 ** state.zoom) % (2 ** state.zoom);
        const tile = document.createElement("img");
        tile.className = "map-tile";
        tile.alt = "";
        tile.draggable = false;
        tile.src = `https://tile.openstreetmap.org/${state.zoom}/${wrappedTileX}/${tileY}.png`;
        tile.style.left = `${tileX * tileSize - originX}px`;
        tile.style.top = `${tileY * tileSize - originY}px`;
        tileLayer.appendChild(tile);
      }
    }

    state.lng = worldXToLng(((centerX % worldSize) + worldSize) % worldSize, state.zoom);

    // Position the marker at its fixed geographic coordinates
    if (markerEl) {
      const markerWorldX = lngToWorldX(markerLng, state.zoom);
      const markerWorldY = latToWorldY(markerLat, state.zoom);
      markerEl.style.left = `${markerWorldX - originX}px`;
      markerEl.style.top = `${markerWorldY - originY}px`;
    }
  };

  const startDrag = (clientX, clientY) => {
    state.isDragging = true;
    customMap.classList.add("is-dragging");
    state.startX = clientX;
    state.startY = clientY;
    state.startWorldX = lngToWorldX(state.lng, state.zoom);
    state.startWorldY = latToWorldY(state.lat, state.zoom);
  };

  const moveDrag = (clientX, clientY) => {
    if (!state.isDragging) {
      return;
    }

    const deltaX = clientX - state.startX;
    const deltaY = clientY - state.startY;
    const nextWorldX = state.startWorldX - deltaX;
    const nextWorldY = state.startWorldY - deltaY;
    state.lng = worldXToLng(nextWorldX, state.zoom);
    state.lat = worldYToLat(nextWorldY, state.zoom);
    renderMap();
  };

  const endDrag = () => {
    state.isDragging = false;
    customMap.classList.remove("is-dragging");
  };

  customMap.addEventListener("pointerdown", (event) => {
    startDrag(event.clientX, event.clientY);
    customMap.setPointerCapture(event.pointerId);
  });

  customMap.addEventListener("pointermove", (event) => {
    moveDrag(event.clientX, event.clientY);
  });

  customMap.addEventListener("pointerup", endDrag);
  customMap.addEventListener("pointercancel", endDrag);
  window.addEventListener("resize", renderMap);

  renderMap();
}
