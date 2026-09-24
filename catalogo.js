const BASE_URL =
  "https://back-semprivado-umg-h6fkf2bng2avgrgw.westus3-01.azurewebsites.net/api";

let allVideos = [];
let currentUser = null;
let videoModal = null;

document.addEventListener("DOMContentLoaded", () => {
  // Inicializar modal de Bootstrap
  const modalEl = document.getElementById("videoModal");
  if (modalEl) {
    videoModal = new bootstrap.Modal(modalEl);
  }

  checkUserSession();
  loadCategories();
  loadVideos();
  setupSearchFilter();
});

// Verificación de Usuario o Visitante
function checkUserSession() {
  const storedUser = localStorage.getItem('usuarioActivo');
  const userSection = document.getElementById('userSection');

  if (storedUser) {
    try {
      const parsedData = JSON.parse(storedUser);

      // Extraer el nombre desde la propiedad estudiante.nombre de la API
      let nombreMostrar = 'Usuario Registrado';

      if (parsedData.estudiante && parsedData.estudiante.nombre) {
        nombreMostrar = parsedData.estudiante.nombre;
      } else if (typeof parsedData.estudiante === 'string') {
        nombreMostrar = parsedData.estudiante;
      } else if (parsedData.usuario) {
        nombreMostrar = parsedData.usuario;
      }

      userSection.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-person-circle fs-5 text-primary"></i>
          <span class="fw-bold text-dark fs-6">${nombreMostrar}</span>
        </div>
        <button class="btn btn-outline-danger btn-sm rounded-pill px-3" onclick="logout()">Cerrar Sesión</button>
      `;
      currentUser = parsedData;
    } catch (e) {
      console.error('Error al leer datos de sesión:', e);
      renderVisitorBadge(userSection);
    }
  } else {
    currentUser = null;
    renderVisitorBadge(userSection);
  }
}

function renderVisitorBadge(container) {
  container.innerHTML = `
    <span class="badge bg-light text-secondary border px-3 py-2 rounded-pill">Modo Visitante</span>
    <a href="index.html" class="btn btn-primary btn-sm fw-bold rounded-pill px-3">Iniciar Sesión</a>
  `;
}

function logout() {
  localStorage.removeItem("usuarioActivo");
  localStorage.removeItem("userToken");
  window.location.href = "index.html";
}

// -------------------------------------------------------------
// OBTENER RECURSOS DE LA API
// -------------------------------------------------------------

// 1. Cargar Categorías
async function loadCategories() {
  try {
    const response = await fetch(`${BASE_URL}/videos/categorias`);
    if (!response.ok) throw new Error("Error al obtener categorías");

    const categories = await response.json();
    const container = document.getElementById("categoriesContainer");

    // Limpiar contenedor conservando el botón "Todas"
    container.innerHTML = `
      <button class="btn btn-category active" id="btnCategoryAll" onclick="resetCategories(this)">Todas</button>
    `;

    categories.forEach((cat) => {
      const catName =
        typeof cat === "string" ? cat : cat.nombre || cat.categoria || cat;
      const btn = document.createElement("button");
      btn.className = "btn btn-category";
      btn.textContent = catName;
      btn.onclick = () => filterByCategory(catName, btn);
      container.appendChild(btn);
    });
  } catch (error) {
    console.error("Error cargando categorías:", error);
  }
}

// Función para el botón "Todas"
function resetCategories(btnElement) {
  document
    .querySelectorAll(".btn-category")
    .forEach((b) => b.classList.remove("active"));
  btnElement.classList.add("active");
  renderVideos(allVideos);
}

// 2. Cargar Catálogo Completo
async function loadVideos() {
  try {
    const response = await fetch(`${BASE_URL}/videos`);
    if (!response.ok) throw new Error("Error al obtener videos");

    allVideos = await response.json();
    renderVideos(allVideos);
  } catch (error) {
    console.error("Error al cargar videos:", error);
    document.getElementById("videosContainer").innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="alert alert-danger d-inline-block">No se pudieron cargar los videos. Intenta más tarde.</div>
      </div>
    `;
  }
}

// Renderizar tarjetas en la galería
function renderVideos(videos) {
  const container = document.getElementById("videosContainer");

  if (!videos || videos.length === 0) {
    container.innerHTML = `<div class="col-12 text-center py-5 text-muted fs-5">No se encontraron videos disponibles.</div>`;
    return;
  }

  container.innerHTML = videos
    .map((video) => {
      const posterUrl =
        video.poster ||
        video.imagen ||
        video.thumbnail ||
        "https://via.placeholder.com/600x340?text=Video+Educativo";
      const titulo = video.titulo || "Sin título";
      const descripcion = video.descripcion || "";
      const duracion = video.duracion || "0:00";
      const categoria = video.categoria || "General";

      return `
      <div class="col-12 col-md-6 col-lg-4 d-flex align-items-stretch">
        <div class="card video-card w-100 border-0 shadow-sm rounded-4 overflow-hidden my-2" onclick="openVideoModal('${video.id || video._id}')">
          <div class="poster-container position-relative bg-dark">
            <img src="${posterUrl}" class="card-img-top poster-img" alt="${titulo}">
            <div class="play-overlay">
              <i class="bi bi-play-circle-fill text-white display-4"></i>
            </div>
            <span class="duration-badge"><i class="bi bi-clock me-1"></i>${duracion}</span>
          </div>
          <div class="card-body d-flex flex-column p-3">
            <div>
              <span class="badge bg-primary-subtle text-primary mb-2 fw-semibold px-2 py-1">${categoria}</span>
            </div>
            <h6 class="card-title fw-bold text-dark mb-1 text-truncate">${titulo}</h6>
            <p class="card-text text-secondary small text-truncate-2 mb-0">${descripcion}</p>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

// -------------------------------------------------------------
// FILTROS Y BÚSQUEDA
// -------------------------------------------------------------
async function filterByCategory(categoryName, element) {
  document
    .querySelectorAll(".btn-category")
    .forEach((b) => b.classList.remove("active"));
  element.classList.add("active");

  try {
    const response = await fetch(
      `${BASE_URL}/videos/categoria/${encodeURIComponent(categoryName)}`,
    );
    if (response.ok) {
      const filteredVideos = await response.json();
      renderVideos(filteredVideos);
    } else {
      // Si el endpoint de categoría falla, filtramos localmente en JS
      const filtered = allVideos.filter(
        (v) => (v.categoria || "").toLowerCase() === categoryName.toLowerCase(),
      );
      renderVideos(filtered);
    }
  } catch (error) {
    console.error("Error al filtrar:", error);
    const filtered = allVideos.filter(
      (v) => (v.categoria || "").toLowerCase() === categoryName.toLowerCase(),
    );
    renderVideos(filtered);
  }
}

function setupSearchFilter() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = allVideos.filter(
      (video) =>
        (video.titulo && video.titulo.toLowerCase().includes(term)) ||
        (video.descripcion && video.descripcion.toLowerCase().includes(term)),
    );
    renderVideos(filtered);
  });
}

// -------------------------------------------------------------
// REPRODUCTOR DE VIDEO Y ACCESO
// -------------------------------------------------------------
async function openVideoModal(videoId) {
  try {
    let video = allVideos.find((v) => (v.id || v._id) == videoId);

    if (!video) {
      const response = await fetch(`${BASE_URL}/videos/${videoId}`);
      if (response.ok) video = await response.json();
    }

    if (!video) return;

    document.getElementById("modalVideoTitle").textContent =
      video.titulo || "Video";
    document.getElementById("modalVideoDescription").textContent =
      video.descripcion || "Sin descripción disponible.";
    document.getElementById("modalVideoCategory").textContent =
      video.categoria || "General";

    const iframe = document.getElementById("modalVideoIframe");
    iframe.src =
      video.url ||
      video.videoUrl ||
      "https://www.youtube.com/embed/dQw4w9WgXcQ";

    setupInteractiveControls();
    if (videoModal) videoModal.show();
  } catch (error) {
    console.error("Error abriendo video:", error);
  }
}

// Limpiar reproductor al cerrar el modal
const modalEl = document.getElementById("videoModal");
if (modalEl) {
  modalEl.addEventListener("hidden.bs.modal", () => {
    document.getElementById("modalVideoIframe").src = "";
  });
}

function setupInteractiveControls() {
  const commentFormContainer = document.getElementById("commentFormContainer");

  if (!currentUser) {
    commentFormContainer.innerHTML = `
      <div class="restricted-banner">
        <i class="bi bi-lock-fill me-1"></i> Debe <a href="index.html" class="fw-bold text-decoration-underline">iniciar sesión</a> para comentar o dar me gusta.
      </div>
    `;
  } else {
    commentFormContainer.innerHTML = `
      <div class="input-group">
        <input type="text" id="inputComment" class="form-control" placeholder="Escribe un comentario...">
        <button class="btn btn-primary" type="button" onclick="postComment()">Comentar</button>
      </div>
    `;
  }
}

function handleInteractiveAction(actionType) {
  if (!currentUser) {
    alert("Esta funcionalidad está restringida a usuarios registrados.");
    window.location.href = "index.html";
    return;
  }

  if (actionType === "like") {
    alert('¡Gracias! Tu "Me gusta" ha sido registrado.');
  }
}

function postComment() {
  const commentInput = document.getElementById("inputComment");
  const text = commentInput ? commentInput.value.trim() : "";

  if (!text) return;

  const commentsList = document.getElementById("commentsList");
  const newComment = document.createElement("div");
  newComment.className = "p-2 bg-light rounded border mb-2";

  let autor = "Estudiante";
  if (typeof currentUser === "string") autor = currentUser;
  else if (currentUser)
    autor = currentUser.estudiante || currentUser.usuario || "Estudiante";

  newComment.innerHTML = `
    <strong class="d-block small text-primary">${autor}</strong>
    <span class="small">${text}</span>
  `;

  commentsList.prepend(newComment);
  commentInput.value = "";
}
