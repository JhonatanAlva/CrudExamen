const BASE_URL = 'https://back-semprivado-umg-h6fkf2bng2avgrgw.westus3-01.azurewebsites.net/api';

// Alternar pestañas entre Login y Registro
function switchTab(tab) {
  const btnLogin = document.getElementById('btnShowLogin');
  const btnRegister = document.getElementById('btnShowRegister');
  const formLogin = document.getElementById('loginForm');
  const formRegister = document.getElementById('registerForm');
  const alertContainer = document.getElementById('alertContainer');

  alertContainer.innerHTML = '';

  if (tab === 'login') {
    btnLogin.classList.add('active');
    btnRegister.classList.remove('active');
    formLogin.classList.add('active');
    formRegister.classList.remove('active');
  } else {
    btnRegister.classList.add('active');
    btnLogin.classList.remove('active');
    formRegister.classList.add('active');
    formLogin.classList.remove('active');
  }
}

// Alertas en pantalla
function showAlert(message, type = 'danger') {
  const alertContainer = document.getElementById('alertContainer');
  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show text-center py-2 px-3 mb-3" style="font-size: 0.85rem;" role="alert">
      ${message}
      <button type="button" class="btn-close py-2" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
}

// -------------------------------------------------------------
// REGISTRO
// -------------------------------------------------------------
document.getElementById('registerForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  const carneInput = document.getElementById('regCarne').value.trim();
  const estudianteInput = document.getElementById('regEstudiante').value.trim();
  const correoInput = document.getElementById('regCorreo').value.trim();
  const passwordInput = document.getElementById('regPassword').value.trim();

  const regexCarne = /^\d{4}-\d{2}-\d{5}$/;
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const regexPin = /^\d+$/;

  if (!carneInput || !estudianteInput || !correoInput || !passwordInput) {
    showAlert('Todos los campos son obligatorios.');
    return;
  }

  if (!regexCarne.test(carneInput)) {
    showAlert('El carné debe tener el formato estricto: 9999-99-99999.');
    return;
  }

  if (!regexEmail.test(correoInput)) {
    showAlert('Ingresa un correo electrónico válido.');
    return;
  }

  if (!regexPin.test(passwordInput)) {
    showAlert('La contraseña (PIN) debe ser estrictamente numérica.');
    return;
  }

  const payload = {
    carne: carneInput,
    estudiante: estudianteInput,
    correo: correoInput,
    password: passwordInput
  };

  try {
    const response = await fetch(`${BASE_URL}/estudiantes/registrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      showAlert('¡Registro completado! Puedes iniciar sesión.', 'success');
      this.reset();
      setTimeout(() => switchTab('login'), 1200);
    } else {
      const errorMsg = data.message || data.error || 'No se pudo realizar el registro.';
      showAlert(errorMsg, 'danger');
    }
  } catch (error) {
    console.error('Error en registro:', error);
    showAlert('Error de conexión con el servidor.', 'danger');
  }
});

// -------------------------------------------------------------
// INICIO DE SESIÓN Y REDIRECCIÓN A CATÁLOGO
// -------------------------------------------------------------
document.getElementById('loginForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  const usuarioInput = document.getElementById('loginUsuario').value.trim();
  const passwordInput = document.getElementById('loginPassword').value.trim();

  const regexPin = /^\d+$/;

  if (!usuarioInput || !passwordInput) {
    showAlert('Por favor llena todos los campos.');
    return;
  }

  if (!regexPin.test(passwordInput)) {
    showAlert('La contraseña (PIN) debe contener únicamente números.');
    return;
  }

  const payload = {
    usuario: usuarioInput,
    password: passwordInput
  };

  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      showAlert('¡Bienvenido! Redirigiendo al catálogo...', 'success');
      
      // Guardar datos de sesión activa en LocalStorage
      if (data.token) {
        localStorage.setItem('userToken', data.token);
      }
      localStorage.setItem('usuarioActivo', JSON.stringify({
        usuario: usuarioInput,
        ...data
      }));

      // REDIRECCIÓN A LA PÁGINA DEL CATÁLOGO
      setTimeout(() => {
        window.location.href = 'catalogo.html';
      }, 1000);

    } else {
      const errorMsg = data.message || data.error || 'Credenciales incorrectas.';
      showAlert(errorMsg, 'danger');
    }
  } catch (error) {
    console.error('Error en login:', error);
    showAlert('Error de conexión con el servidor.', 'danger');
  }
});