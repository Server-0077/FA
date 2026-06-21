'use strict';

/* ===== Constantes ===== */
const WHATSAPP_NUMERO = '50379192998';
const STORAGE_KEY = 'finoArteCarrito';
const BANNER_INTERVAL = 3000;

/* ===== Estado ===== */
let productos = [];
let categoriaActiva = 'todos';
let productoDetalle = null;
let sliderIndex = 0;
let bannerIndex = 0;
let bannerTimer = null;

/* ===== DOM ===== */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const productosGrid = $('#productosGrid');
const catalogoError = $('#catalogoError');
const catalogoEmpty = $('#catalogoEmpty');
const catalogoCount = $('#catalogoCount');
const catalogoTitulo = $('#catalogoTitulo');
const cartCount = $('#cartCount');

/* ===== Utilidades ===== */
function formatearPrecio(precio) {
  return `$${precio.toFixed(2)}`;
}

function mostrarToast(mensaje) {
  let toast = $('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = mensaje;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function abrirModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }
}

function cerrarModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.hidden = true;
    document.body.style.overflow = '';
  }
}

function cerrarTodosModales() {
  $$('.modal:not([hidden])').forEach((m) => {
    m.hidden = true;
  });
  document.body.style.overflow = '';
}

/* ===== Carrito (localStorage) ===== */
function obtenerCarrito() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function guardarCarrito(carrito) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(carrito));
  } catch (err) {
    console.error('Error al guardar carrito:', err);
  }
}

function actualizarContadorCarrito() {
  const carrito = obtenerCarrito();
  const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  cartCount.textContent = total;
}

function agregarAlCarrito(producto) {
  try {
    const carrito = obtenerCarrito();
    const existente = carrito.find((item) => item.id === producto.id);

    if (existente) {
      existente.cantidad += 1;
    } else {
      carrito.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        imagen: producto.imagenes[0],
        cantidad: 1
      });
    }

    guardarCarrito(carrito);
    actualizarContadorCarrito();
    mostrarToast(`${producto.nombre} agregado al carrito`);
  } catch (err) {
    console.error('Error al agregar al carrito:', err);
    mostrarToast('No se pudo agregar el producto');
  }
}

function renderizarCarrito() {
  const carrito = obtenerCarrito();
  const lista = $('#carritoLista');
  const footer = $('#carritoFooter');
  const vacio = $('#carritoVacio');
  const totalEl = $('#carritoTotal');

  lista.innerHTML = '';

  if (carrito.length === 0) {
    footer.hidden = true;
    vacio.hidden = false;
    return;
  }

  vacio.hidden = true;
  footer.hidden = false;

  let total = 0;

  carrito.forEach((item) => {
    total += item.precio * item.cantidad;

    const li = document.createElement('li');
    li.className = 'carrito__item';
    li.innerHTML = `
      <img src="${item.imagen}" alt="${item.nombre}" class="carrito__item-img" loading="lazy">
      <div class="carrito__item-info">
        <p class="carrito__item-nombre">${item.nombre}</p>
        <p class="carrito__item-precio">${formatearPrecio(item.precio)}</p>
        <div class="carrito__item-qty">
          <button class="carrito__qty-btn" data-action="decrease" data-id="${item.id}" aria-label="Disminuir cantidad">−</button>
          <span class="carrito__qty-num">${item.cantidad}</span>
          <button class="carrito__qty-btn" data-action="increase" data-id="${item.id}" aria-label="Aumentar cantidad">+</button>
        </div>
      </div>
      <button class="carrito__item-remove" data-action="remove" data-id="${item.id}" aria-label="Eliminar">&times;</button>
    `;
    lista.appendChild(li);
  });

  totalEl.textContent = formatearPrecio(total);
}

function modificarCantidad(id, delta) {
  const carrito = obtenerCarrito();
  const item = carrito.find((i) => i.id === id);
  if (!item) return;

  item.cantidad += delta;

  if (item.cantidad <= 0) {
    const idx = carrito.indexOf(item);
    carrito.splice(idx, 1);
  }

  guardarCarrito(carrito);
  actualizarContadorCarrito();
  renderizarCarrito();
}

function eliminarDelCarrito(id) {
  const carrito = obtenerCarrito().filter((i) => i.id !== id);
  guardarCarrito(carrito);
  actualizarContadorCarrito();
  renderizarCarrito();
}

/* ===== Catálogo ===== */
async function cargarProductos() {
  try {
    const respuesta = await fetch('info/productos.json');

    if (!respuesta.ok) {
      throw new Error(`HTTP ${respuesta.status}`);
    }

    const data = await respuesta.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('El archivo de productos está vacío o tiene formato inválido');
    }

    productos = data.map((producto) => ({
      ...producto,
      imagenes: producto.imagenes.map((src, index) =>
        /^https?:\/\//.test(src)
          ? `img/producto-${producto.id}-${index + 1}.jpg`
          : src
      )
    }));
    renderizarCatalogo();
  } catch (err) {
    console.error('Error al cargar productos:', err);
    productosGrid.innerHTML = '';
    catalogoError.hidden = false;
  }
}

function filtrarProductos() {
  if (categoriaActiva === 'todos') return productos;
  return productos.filter((p) => p.categoria === categoriaActiva);
}

function renderizarCatalogo() {
  const filtrados = filtrarProductos();
  productosGrid.innerHTML = '';
  catalogoEmpty.hidden = true;
  catalogoError.hidden = true;

  const titulos = { todos: 'Catálogo', Hombre: 'Hombre', Mujer: 'Mujer' };
  catalogoTitulo.textContent = titulos[categoriaActiva] || 'Catálogo';
  catalogoCount.textContent = `${filtrados.length} pieza${filtrados.length !== 1 ? 's' : ''}`;

  if (filtrados.length === 0) {
    catalogoEmpty.hidden = false;
    return;
  }

  filtrados.forEach((producto) => {
    const card = document.createElement('article');
    card.className = 'producto-card';
    card.setAttribute('role', 'listitem');
    card.innerHTML = `
      <div class="producto-card__img-wrap">
        <img src="${producto.imagenes[0]}" alt="${producto.nombre}" class="producto-card__img" loading="lazy">
        <span class="producto-card__categoria">${producto.categoria}</span>
      </div>
      <div class="producto-card__body">
        <h3 class="producto-card__nombre">${producto.nombre}</h3>
        <p class="producto-card__precio">${formatearPrecio(producto.precio)}</p>
        <div class="producto-card__actions">
          <button class="btn btn--gold" data-action="agregar" data-id="${producto.id}">Agregar al carrito</button>
          <button class="btn btn--outline" data-action="detalle" data-id="${producto.id}">Detalle</button>
        </div>
      </div>
    `;
    productosGrid.appendChild(card);
  });
}

/* ===== Modal Detalle ===== */
function abrirDetalle(id) {
  productoDetalle = productos.find((p) => p.id === id);
  if (!productoDetalle) return;

  sliderIndex = 0;

  $('#modalDetalleTitulo').textContent = productoDetalle.nombre;
  $('#modalDetallePrecio').textContent = formatearPrecio(productoDetalle.precio);
  $('#modalDetalleInfo').textContent = productoDetalle.info;

  renderizarSlider();
  abrirModal('modalDetalle');
}

function renderizarSlider() {
  if (!productoDetalle) return;

  const container = $('#sliderImages');
  const dotsContainer = $('#sliderDots');
  container.innerHTML = '';
  dotsContainer.innerHTML = '';

  productoDetalle.imagenes.forEach((url, i) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = `${productoDetalle.nombre} — imagen ${i + 1}`;
    img.className = `modal-detalle__img${i === sliderIndex ? ' active' : ''}`;
    container.appendChild(img);

    const dot = document.createElement('button');
    dot.className = `modal-detalle__dot${i === sliderIndex ? ' active' : ''}`;
    dot.setAttribute('aria-label', `Imagen ${i + 1}`);
    dot.addEventListener('click', () => {
      sliderIndex = i;
      renderizarSlider();
    });
    dotsContainer.appendChild(dot);
  });
}

function sliderAnterior() {
  if (!productoDetalle) return;
  sliderIndex = (sliderIndex - 1 + productoDetalle.imagenes.length) % productoDetalle.imagenes.length;
  renderizarSlider();
}

function sliderSiguiente() {
  if (!productoDetalle) return;
  sliderIndex = (sliderIndex + 1) % productoDetalle.imagenes.length;
  renderizarSlider();
}

/* ===== Checkout / WhatsApp ===== */
function abrirCheckout() {
  const carrito = obtenerCarrito();
  if (carrito.length === 0) return;

  cerrarModal('modalCarrito');

  const resumen = $('#checkoutResumen');
  let total = 0;
  let html = '<strong>Resumen del pedido:</strong><br>';

  carrito.forEach((item) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;
    html += `• ${item.nombre} x${item.cantidad} — ${formatearPrecio(subtotal)}<br>`;
  });

  html += `<br><strong>Total: ${formatearPrecio(total)}</strong>`;
  resumen.innerHTML = html;

  $('#nombreCliente').value = '';
  $('#nombreError').textContent = '';
  $('#nombreCliente').classList.remove('error');

  abrirModal('modalCheckout');
}

function validarCheckout(e) {
  e.preventDefault();

  const input = $('#nombreCliente');
  const errorEl = $('#nombreError');
  const nombre = input.value.trim();

  try {
    if (!nombre) {
      input.classList.add('error');
      errorEl.textContent = 'Por favor, ingresa tu nombre.';
      input.focus();
      return;
    }

    if (nombre.length < 2) {
      input.classList.add('error');
      errorEl.textContent = 'El nombre debe tener al menos 2 caracteres.';
      input.focus();
      return;
    }

    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(nombre)) {
      input.classList.add('error');
      errorEl.textContent = 'El nombre solo puede contener letras.';
      input.focus();
      return;
    }

    input.classList.remove('error');
    errorEl.textContent = '';

    const carrito = obtenerCarrito();
    const listaProductos = carrito
      .map((item) => `${item.nombre} x${item.cantidad}`)
      .join(', ');

    const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

    const mensaje = `Hola, soy ${nombre}, quiero comprar: ${listaProductos}, Total: $${total.toFixed(2)}`;
    const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;

    window.open(url, '_blank');

    guardarCarrito([]);
    actualizarContadorCarrito();
    cerrarModal('modalCheckout');
    mostrarToast('Pedido enviado. ¡Gracias por tu compra!');
  } catch (err) {
    console.error('Error en checkout:', err);
    errorEl.textContent = 'Ocurrió un error. Intenta de nuevo.';
  }
}

/* ===== Banner Carrusel ===== */
function initBanner() {
  const slides = $$('.banner__slide');
  const dotsContainer = $('#bannerDots');

  if (slides.length === 0) return;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = `banner__dot${i === 0 ? ' active' : ''}`;
    dot.setAttribute('aria-label', `Slide ${i + 1}`);
    dot.addEventListener('click', () => irABanner(i));
    dotsContainer.appendChild(dot);
  });

  iniciarBannerAuto();
}

function irABanner(index) {
  const slides = $$('.banner__slide');
  const dots = $$('.banner__dot');

  slides[bannerIndex]?.classList.remove('active');
  dots[bannerIndex]?.classList.remove('active');

  bannerIndex = index;

  slides[bannerIndex]?.classList.add('active');
  dots[bannerIndex]?.classList.add('active');

  reiniciarBannerAuto();
}

function bannerSiguiente() {
  const slides = $$('.banner__slide');
  irABanner((bannerIndex + 1) % slides.length);
}

function iniciarBannerAuto() {
  bannerTimer = setInterval(bannerSiguiente, BANNER_INTERVAL);
}

function reiniciarBannerAuto() {
  clearInterval(bannerTimer);
  iniciarBannerAuto();
}

/* ===== Event Listeners ===== */
function initEventos() {
  $$('.navbar__cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.navbar__cat-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      categoriaActiva = btn.dataset.categoria;
      renderizarCatalogo();

      const nav = $('.navbar__nav');
      nav.classList.remove('open');
      $('#menuToggle').classList.remove('open');
      $('#menuToggle').setAttribute('aria-expanded', 'false');
    });
  });

  $('#menuToggle').addEventListener('click', () => {
    const toggle = $('#menuToggle');
    const nav = $('.navbar__nav');
    const isOpen = nav.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  $('#btnAbrirCarrito').addEventListener('click', () => {
    renderizarCarrito();
    abrirModal('modalCarrito');
  });

  productosGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const id = Number(btn.dataset.id);
    const producto = productos.find((p) => p.id === id);
    if (!producto) return;

    if (btn.dataset.action === 'agregar') {
      agregarAlCarrito(producto);
    } else if (btn.dataset.action === 'detalle') {
      abrirDetalle(id);
    }
  });

  $('#btnDetalleAgregar').addEventListener('click', () => {
    if (productoDetalle) {
      agregarAlCarrito(productoDetalle);
    }
  });

  $('#sliderPrev').addEventListener('click', sliderAnterior);
  $('#sliderNext').addEventListener('click', sliderSiguiente);

  $('#carritoLista').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const id = Number(btn.dataset.id);

    if (btn.dataset.action === 'increase') modificarCantidad(id, 1);
    else if (btn.dataset.action === 'decrease') modificarCantidad(id, -1);
    else if (btn.dataset.action === 'remove') eliminarDelCarrito(id);
  });

  $('#btnFinalizar').addEventListener('click', abrirCheckout);
  $('#checkoutForm').addEventListener('submit', validarCheckout);

  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) {
      cerrarModal(closeBtn.dataset.close);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarTodosModales();
  });
}

/* ===== Inicialización ===== */
document.addEventListener('DOMContentLoaded', () => {
  initEventos();
  initBanner();
  actualizarContadorCarrito();
  cargarProductos();
});
