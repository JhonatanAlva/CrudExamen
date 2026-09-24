const BASE_URL =
  "https://back-semprivado-umg-h6fkf2bng2avgrgw.westus3-01.azurewebsites.net/api";

let allVideos = [];
let currentUser = null;
let currentVideoId = null;
let videoModal = null;

document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("videoModal");
  if (modalEl) {
    videoModal = new bootstrap.Modal(modalEl);
  }

  checkUserSession();
  loadCategories();
  loadVideos();
  setupSearchFilter();
});

// -------------------------------------------------------------
// VERIFICACIÓN DE SESIÓN Y USUARIOS
// -------------------------------------------------------------
function checkUserSession() {
  const storedUser = localStorage.getItem("usuarioActivo");
  const userSection = document.getElementById("userSection");

  if (storedUser) {
    try {
      const parsedData = JSON.parse(storedUser);
      let nombreMostrar = "Usuario Registrado";

      if (parsedData.estudiante && typeof parsedData.estudiante === "object" && parsedData.estudiante.nombre) {
        nombreMostrar = parsedData.estudiante.nombre;
      } else if (typeof parsedData.estudiante === "string") {
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
      console.error("Error al leer datos de sesión:", e);
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

// Extrae el carné garantizando que nunca retorne un objeto
function getUserCarne() {
  if (!currentUser) return null;
  if (currentUser.estudiante) {
    if (typeof currentUser.estudiante === "object" && currentUser.estudiante.carne) {
      return currentUser.estudiante.carne;
    }
    if (typeof currentUser.estudiante === "string" && /^\d{4}-\d{2}-\d{5}$/.test(currentUser.estudiante)) {
      return currentUser.estudiante;
    }
  }
  if (currentUser.carne) return currentUser.carne;
  if (currentUser.usuario && /^\d{4}-\d{2}-\d{5}$/.test(currentUser.usuario)) {
    return currentUser.usuario;
  }
  return null;
}

// -------------------------------------------------------------
// OBTENER Y FILTRAR VIDEOS
// -------------------------------------------------------------
async function loadCategories() {
  try {
    const response = await fetch(`${BASE_URL}/videos/categorias`);
    if (!response.ok) throw new Error("Error al obtener categorías");

    const categories = await response.json();
    const container = document.getElementById("categoriesContainer");

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

function resetCategories(btnElement) {
  document
    .querySelectorAll(".btn-category")
    .forEach((b) => b.classList.remove("active"));
  btnElement.classList.add("active");
  renderVideos(allVideos);
}

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
      const videoId = video.id || video._id;

      return `
      <div class="col-12 col-md-6 col-lg-4 d-flex align-items-stretch">
        <div class="card video-card w-100 border-0 shadow-sm rounded-4 overflow-hidden my-2" onclick="openVideoModal('${videoId}')">
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

async function filterByCategory(categoryName, element) {
  document
    .querySelectorAll(".btn-category")
    .forEach((b) => b.classList.remove("active"));
  element.classList.add("active");

  try {
    const response = await fetch(
      `${BASE_URL}/videos/categoria/${encodeURIComponent(categoryName)}`
    );
    if (response.ok) {
      const filteredVideos = await response.json();
      renderVideos(filteredVideos);
    } else {
      const filtered = allVideos.filter(
        (v) => (v.categoria || "").toLowerCase() === categoryName.toLowerCase()
      );
      renderVideos(filtered);
    }
  } catch (error) {
    console.error("Error al filtrar:", error);
    const filtered = allVideos.filter(
      (v) => (v.categoria || "").toLowerCase() === categoryName.toLowerCase()
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
        (video.descripcion && video.descripcion.toLowerCase().includes(term))
    );
    renderVideos(filtered);
  });
}

// -------------------------------------------------------------
// REPRODUCTOR DE VIDEO Y MODAL
// -------------------------------------------------------------
async function openVideoModal(videoId) {
  currentVideoId = videoId;
  try {
    const response = await fetch(`${BASE_URL}/videos/${videoId}`);
    let video = response.ok
      ? await response.json()
      : allVideos.find((v) => (v.id || v._id) == videoId);

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

    const likesArray = video.likes || [];
    let count = 0;

    if (typeof video.likesCount === "number") {
      count = video.likesCount;
    } else if (typeof video.likes === "number") {
      count = video.likes;
    } else if (Array.isArray(likesArray)) {
      count = likesArray.length;
    }

    const myCarne = getUserCarne();
    let isLiked = false;

    if (Array.isArray(likesArray) && myCarne) {
      isLiked = likesArray.some(
        (item) =>
          item === myCarne ||
          (typeof item === "object" &&
            (item.carne === myCarne || item.usuario === myCarne))
      );
    } else if (typeof video.likedByCurrentUser === "boolean") {
      isLiked = video.likedByCurrentUser;
    }

    updateLikesUI(count, isLiked);
    setupInteractiveControls();
    loadComments(video.comentarios || []);

    if (videoModal) videoModal.show();
  } catch (error) {
    console.error("Error abriendo video:", error);
  }
}

const modalEl = document.getElementById("videoModal");
if (modalEl) {
  modalEl.addEventListener("hidden.bs.modal", () => {
    document.getElementById("modalVideoIframe").src = "";
    currentVideoId = null;
  });
}

async function refreshVideoModalData() {
  if (!currentVideoId) return;
  try {
    const response = await fetch(`${BASE_URL}/videos/${currentVideoId}`);
    if (response.ok) {
      const video = await response.json();
      const likesArray = video.likes || [];
      
      let count = 0;
      if (typeof video.likesCount === "number") count = video.likesCount;
      else if (typeof video.likes === "number") count = video.likes;
      else if (Array.isArray(likesArray)) count = likesArray.length;

      const myCarne = getUserCarne();
      let isLiked = false;
      if (Array.isArray(likesArray) && myCarne) {
        isLiked = likesArray.some(
          (item) =>
            item === myCarne ||
            (typeof item === "object" &&
              (item.carne === myCarne || item.usuario === myCarne))
        );
      }

      updateLikesUI(count, isLiked);
      loadComments(video.comentarios || []);
    }
  } catch (e) {
    console.error("Error de sincronización con la API:", e);
  }
}

// -------------------------------------------------------------
// SERIE III - 1. REACCIÓN ME GUSTA / QUITAR ME GUSTA (TOGGLE LIKE)
// -------------------------------------------------------------
function updateLikesUI(count, isLiked) {
  const btnLike = document.getElementById("btnLike");
  const likesCounter = document.getElementById("likesCount");

  if (likesCounter) likesCounter.textContent = count;
  if (btnLike) {
    btnLike.dataset.liked = isLiked ? "true" : "false";

    if (isLiked) {
      btnLike.classList.remove("btn-outline-primary");
      btnLike.classList.add("btn-primary");
    } else {
      btnLike.classList.remove("btn-primary");
      btnLike.classList.add("btn-outline-primary");
    }
  }
}

async function toggleLike() {
  if (!currentUser) {
    alert("Esta funcionalidad está restringida a usuarios registrados.");
    window.location.href = "index.html";
    return;
  }

  const carne = getUserCarne();
  if (!carne) {
    alert("Para dar Me Gusta debes haber iniciado sesión con tu Carné.");
    return;
  }

  const btnLike = document.getElementById("btnLike");
  if (!btnLike) return;

  btnLike.disabled = true;

  try {
    const response = await fetch(
      `${BASE_URL}/interaccionvideo/${currentVideoId}/like`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carne: carne }),
      }
    );

    if (response.ok) {
      await refreshVideoModalData();
    } else {
      const data = await response.json().catch(() => ({}));
      alert(data.message || "Error al procesar la reacción.");
    }
  } catch (error) {
    console.error("Error en toggle like:", error);
  } finally {
    btnLike.disabled = false;
  }
}

// -------------------------------------------------------------
// SERIE III - 2. PUBLICAR COMENTARIO PRINCIPAL
// -------------------------------------------------------------
function setupInteractiveControls() {
  const commentFormContainer = document.getElementById("commentFormContainer");

  if (!currentUser) {
    commentFormContainer.innerHTML = `
      <div class="restricted-banner">
        <i class="bi bi-lock-fill me-1"></i> Debe <a href="index.html" class="fw-bold text-decoration-underline">iniciar sesión</a> para comentar o dar Me Gusta.
      </div>
    `;
  } else {
    commentFormContainer.innerHTML = `
      <div class="input-group">
        <input type="text" id="inputComment" class="form-control" placeholder="Escribe un comentario...">
        <button class="btn btn-primary" type="button" onclick="postMainComment()"><i class="bi bi-send me-1"></i>Comentar</button>
      </div>
    `;
  }
}

async function postMainComment() {
  if (!currentUser) return;

  const commentInput = document.getElementById("inputComment");
  const texto = commentInput ? commentInput.value.trim() : "";
  const carne = getUserCarne();

  if (!texto) return;

  try {
    const response = await fetch(
      `${BASE_URL}/interaccionvideo/${currentVideoId}/comentario`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carne: carne, texto: texto }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      if (commentInput) commentInput.value = "";
      refreshVideoModalData();
    } else {
      alert(data.message || "Error al publicar el comentario.");
    }
  } catch (error) {
    console.error("Error al comentar:", error);
  }
}

// Helper para extraer un string de nombre válido de cualquier estructura de objeto
function parseAuthorName(entity) {
  if (!entity) return "Estudiante";
  if (typeof entity === "string") return entity;
  if (typeof entity === "object") {
    return entity.estudianteNombre || entity.nombre || entity.estudiante || entity.carne || "Estudiante";
  }
  return "Estudiante";
}

// Helper para extraer el carné en comentarios
function parseAuthorCarne(entity) {
  if (!entity) return null;
  if (typeof entity === "string") return entity;
  if (typeof entity === "object") {
    return entity.carne || entity.usuario || null;
  }
  return null;
}

// -------------------------------------------------------------
// SERIE III - 3 Y 4. RENDERIZADO DE COMENTARIOS, RESPUESTAS Y ELIMINACIÓN
// -------------------------------------------------------------
function loadComments(comentarios) {
  const commentsList = document.getElementById("commentsList");

  if (!comentarios || comentarios.length === 0) {
    commentsList.innerHTML = `<p class="text-muted small">No hay comentarios aún. ¡Sé el primero en opinar!</p>`;
    return;
  }

  const myCarne = getUserCarne();

  commentsList.innerHTML = comentarios
    .map((c) => {
      const comentarioId = c.id || c._id;
      const autorNombre = parseAuthorName(c.estudianteNombre || c.nombre || c.estudiante || c.carne);
      const comentarioCarne = c.carne || parseAuthorCarne(c.estudiante);
      const esMiComentario = myCarne && comentarioCarne === myCarne;

      // Mapeo de respuestas del 1er Nivel
      const respuestasHTML = (c.respuestas || [])
        .map((r) => {
          const respuestaId = r.id || r._id;
          const autorRespuesta = parseAuthorName(r.estudianteNombre || r.nombre || r.estudiante || r.carne);
          const respuestaCarne = r.carne || parseAuthorCarne(r.estudiante);
          const esMiRespuesta = myCarne && respuestaCarne === myCarne;

          return `
        <div class="bg-white p-2 rounded border-start border-3 border-primary ms-4 mt-2">
          <div class="d-flex justify-content-between align-items-center">
            <strong class="small text-primary">${autorRespuesta}</strong>
            ${
              esMiRespuesta
                ? `<button class="btn btn-link text-danger p-0 btn-sm" onclick="deleteComment('${respuestaId}')" title="Eliminar"><i class="bi bi-trash"></i></button>`
                : ""
            }
          </div>
          <p class="small mb-0 text-dark">${r.texto}</p>
        </div>
      `;
        })
        .join("");

      return `
      <div class="bg-light p-3 rounded-3 border mb-2">
        <div class="d-flex justify-content-between align-items-center">
          <strong class="text-dark small"><i class="bi bi-person-fill text-secondary me-1"></i>${autorNombre}</strong>
          ${
            esMiComentario
              ? `<button class="btn btn-link text-danger p-0 btn-sm" onclick="deleteComment('${comentarioId}')" title="Eliminar comentario"><i class="bi bi-trash fs-6"></i></button>`
              : ""
          }
        </div>
        <p class="small mb-2 mt-1 text-secondary">${c.texto}</p>
        
        ${
          currentUser
            ? `
          <button class="btn btn-link text-primary p-0 text-decoration-none small" onclick="toggleReplyBox('${comentarioId}')">
            <i class="bi bi-reply-fill me-1"></i>Responder
          </button>
          
          <div id="replyBox-${comentarioId}" class="mt-2 d-none">
            <div class="input-group input-group-sm">
              <input type="text" id="inputReply-${comentarioId}" class="form-control" placeholder="Escribe tu respuesta...">
              <button class="btn btn-primary" type="button" onclick="postReply('${comentarioId}')">Enviar</button>
            </div>
          </div>
        `
            : ""
        }

        <!-- Respuestas Anidadas (1 Nivel) -->
        <div class="replies-container">
          ${respuestasHTML}
        </div>
      </div>
    `;
    })
    .join("");
}

function toggleReplyBox(comentarioId) {
  const box = document.getElementById(`replyBox-${comentarioId}`);
  if (box) box.classList.toggle("d-none");
}

async function postReply(comentarioId) {
  if (!currentUser) return;

  const inputReply = document.getElementById(`inputReply-${comentarioId}`);
  const texto = inputReply ? inputReply.value.trim() : "";
  const carne = getUserCarne();

  if (!texto) return;

  try {
    const response = await fetch(
      `${BASE_URL}/interaccionvideo/comentario/${comentarioId}/responder`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carne: carne, texto: texto }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      refreshVideoModalData();
    } else {
      alert(data.message || "Error al responder el comentario.");
    }
  } catch (error) {
    console.error("Error al responder:", error);
  }
}

async function deleteComment(comentarioId) {
  const carne = getUserCarne();
  if (!carne) return;

  if (!confirm("¿Estás seguro de que deseas eliminar este comentario?")) return;

  try {
    const response = await fetch(
      `${BASE_URL}/interaccionvideo/comentario/${comentarioId}?carne=${encodeURIComponent(carne)}`,
      {
        method: "DELETE",
      }
    );

    if (response.ok) {
      refreshVideoModalData();
    } else if (response.status === 403) {
      alert(
        "Acceso denegado: Únicamente puedes eliminar tus propios comentarios."
      );
    } else {
      const data = await response.json().catch(() => ({}));
      alert(data.message || "No se pudo eliminar el comentario.");
    }
  } catch (error) {
    console.error("Error eliminando comentario:", error);
  }
}