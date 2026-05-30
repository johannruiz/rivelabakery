// Reemplaza este número por el WhatsApp real de la pastelería, usando indicativo de país y sin signos.
    const WHATSAPP_NUMBER = '573155579910';

    const PRODUCTS_URL = 'data/products.json';
    const CUSTOMER_STORAGE_KEY = 'rivelaCustomerData';
    const CUSTOMER_FIELD_IDS = [
      'customerName',
      'customerPhone',
      'deliveryType',
      'address',
      'city',
      'zone',
      'payment',
      'hour'
    ];
    let products = [];

    const state = {
      filter:'all',
      cart: JSON.parse(localStorage.getItem('rivelaCart') || '{}'),
      activeProduct:null,
      detailQty:1
    };

    const productGrid = document.getElementById('productGrid');
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('productModal');
    const cartDrawer = document.getElementById('cartDrawer');
    const checkoutPanel = document.getElementById('checkoutPanel');
    const toast = document.getElementById('toast');
    const mapStatus = document.getElementById('mapStatus');
    const mapLink = document.getElementById('mapLink');
    const verifyAddressBtn = document.getElementById('verifyAddressBtn');

    const currency = new Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR' });
    const formatPrice = value => currency.format(value);
    const getProduct = id => products.find(product => product.id === id);
    const cartEntries = () => Object.entries(state.cart).map(([id, qty]) => ({ product:getProduct(id), qty })).filter(item => item.product && item.qty > 0);
    const cartTotal = () => cartEntries().reduce((sum, item) => sum + item.product.price * item.qty, 0);
    const cartUnits = () => cartEntries().reduce((sum, item) => sum + item.qty, 0);
    let checkoutMap = null;
    let checkoutMarker = null;
    let geocodeRequestId = 0;
    let deliveryLocation = null;
    const DEFAULT_MAP_CENTER = [7.0621, -73.0864];
    const DEFAULT_MAP_ZOOM = 13;

    async function loadProducts(){
      try{
        const response = await fetch(PRODUCTS_URL);
        if(!response.ok) throw new Error(`No se pudo leer ${PRODUCTS_URL}`);
        const data = await response.json();
        if(!Array.isArray(data)) throw new Error('El archivo de productos debe ser una lista.');
        products = data;
      }catch(error){
        productGrid.innerHTML = `
          <div class="cart-empty">
            No se pudieron cargar los productos.<br>
            Revisa el archivo <strong>${PRODUCTS_URL}</strong> o abre la web desde un servidor local.
          </div>
        `;
        console.error(error);
      }
    }

    function pastrySvg(type){
      const base = {
        cake:`<svg viewBox="0 0 220 180" aria-hidden="true"><path d="M38 122c42 30 110 31 148 0l-12 36c-36 23-94 24-124 2l-12-38z" fill="#fffaf0"/><path d="M45 116c34 26 104 28 136 0 9-31-5-56-35-68-40-16-84 2-99 34-4 9-5 21-2 34z" fill="#5b2426"/><path d="M59 109c35 17 79 21 111 0" fill="none" stroke="#f1a7ef" stroke-width="8" stroke-linecap="round"/><circle cx="82" cy="73" r="10" fill="#e8a2ca"/><circle cx="118" cy="60" r="8" fill="#e8a2ca"/><circle cx="146" cy="82" r="11" fill="#e8a2ca"/><path d="M50 133c39 22 91 24 138-3" fill="none" stroke="#431819" stroke-width="3" stroke-linecap="round" opacity=".42"/></svg>`,
        brownie:`<svg viewBox="0 0 220 180" aria-hidden="true"><path d="M46 70l118-21 29 47-121 28z" fill="#5b2426"/><path d="M72 124l121-28-19 42-112 27z" fill="#431819"/><path d="M46 70l26 54-10 41-28-59z" fill="#6a2b2d"/><path d="M71 90c24 12 70 8 94-12" fill="none" stroke="#f1a7ef" stroke-width="6" stroke-linecap="round"/><circle cx="102" cy="78" r="5" fill="#f5dfb5"/><circle cx="132" cy="71" r="5" fill="#f5dfb5"/><circle cx="154" cy="95" r="5" fill="#f5dfb5"/></svg>`,
        cheesecake:`<svg viewBox="0 0 220 180" aria-hidden="true"><path d="M43 130c37 30 108 31 144 0l-15 29c-35 19-88 19-116 0l-13-29z" fill="#d7a06f"/><path d="M41 125c35 28 111 29 148 0-2-36-32-62-74-62-45 0-72 27-74 62z" fill="#fffaf0"/><path d="M72 104c30 20 73 20 103-2" fill="none" stroke="#f1a7ef" stroke-width="7" stroke-linecap="round"/><path d="M124 61c18 7 32 21 40 39" fill="none" stroke="#431819" stroke-width="3" stroke-linecap="round" opacity=".35"/><circle cx="81" cy="93" r="9" fill="#e8a2ca"/><circle cx="102" cy="85" r="7" fill="#e8a2ca"/></svg>`,
        gugelhupf:`<svg viewBox="0 0 220 180" aria-hidden="true"><path d="M42 127c0-47 25-85 68-85s68 37 68 85c-33 27-105 28-136 0z" fill="#c08759"/><path d="M82 93c0-19 11-33 28-33s28 14 28 33c0 14-11 25-28 25s-28-11-28-25z" fill="#fffaf0"/><path d="M52 126c33 21 86 25 128-2" fill="none" stroke="#fffaf0" stroke-width="9" stroke-linecap="round"/><path d="M68 76c11-10 24-14 40-13" fill="none" stroke="#431819" stroke-width="4" stroke-linecap="round" opacity=".28"/><circle cx="148" cy="102" r="6" fill="#f1a7ef"/><circle cx="67" cy="115" r="5" fill="#f1a7ef"/></svg>`,
        box:`<svg viewBox="0 0 220 180" aria-hidden="true"><path d="M43 67h134v89H43z" rx="16" fill="#fffaf0"/><path d="M43 67h134v30H43z" fill="#f1a7ef"/><path d="M106 67h16v89h-16z" fill="#e8a2ca"/><path d="M42 67c30-17 103-18 136 0" fill="none" stroke="#431819" stroke-width="4" stroke-linecap="round" opacity=".36"/><text x="110" y="126" text-anchor="middle" font-family="Georgia, serif" font-size="28" font-weight="700" fill="#431819">Rivela</text><path d="M78 51c11-17 31-11 32 16-23 0-37-3-32-16z" fill="#f1a7ef"/><path d="M142 51c-11-17-31-11-32 16 23 0 37-3 32-16z" fill="#f1a7ef"/></svg>`,
        croissant:`<svg viewBox="0 0 220 180" aria-hidden="true"><path d="M41 103c18-41 53-63 82-43 25 17 12 58-21 66-28 6-51-4-61-23z" fill="#d79a57"/><path d="M115 61c35-20 66 9 72 50-20 14-54 17-80 4 26-17 31-38 8-54z" fill="#c88448"/><path d="M54 100c34 13 71 16 124 8" fill="none" stroke="#fffaf0" stroke-width="6" stroke-linecap="round" opacity=".66"/><path d="M81 73c15 20 14 40-1 57" fill="none" stroke="#431819" stroke-width="4" stroke-linecap="round" opacity=".22"/><path d="M130 68c-2 23-10 42-28 58" fill="none" stroke="#431819" stroke-width="4" stroke-linecap="round" opacity=".22"/></svg>`
      };
      return base[type] || base.cake;
    }

    function renderProducts(){
      const visible = products.filter(product => state.filter === 'all' || product.category === state.filter);
      productGrid.innerHTML = visible.map(product => `
        <article class="product-card">
          <button class="product-button" type="button" data-product-id="${product.id}" aria-label="Ver detalle de ${product.name}">
            <div class="product-media">${pastrySvg(product.visual)}</div>
            <div class="product-info">
              <span class="tag">${product.tag}</span>
              <div class="product-title-row">
                <h3>${product.name}</h3>
                <span class="price">${formatPrice(product.price)}</span>
              </div>
              <p>${product.short}</p>
              <div class="product-meta"><span>Bajo pedido</span><span>Empaque Rivela</span></div>
            </div>
          </button>
        </article>
      `).join('');
    }

    function openOverlay(){
      overlay.classList.add('is-open');
      document.body.classList.add('no-scroll');
    }

    function closeAll(){
      overlay.classList.remove('is-open');
      modal.classList.remove('is-open');
      cartDrawer.classList.remove('is-open');
      checkoutPanel.classList.remove('is-open');
      modal.setAttribute('aria-hidden','true');
      cartDrawer.setAttribute('aria-hidden','true');
      checkoutPanel.setAttribute('aria-hidden','true');
      document.body.classList.remove('no-scroll');
    }

    function openProduct(id){
      const product = getProduct(id);
      if(!product) return;
      cartDrawer.classList.remove('is-open');
      checkoutPanel.classList.remove('is-open');
      cartDrawer.setAttribute('aria-hidden','true');
      checkoutPanel.setAttribute('aria-hidden','true');
      state.activeProduct = product;
      state.detailQty = 1;
      document.getElementById('modalMedia').innerHTML = pastrySvg(product.visual);
      document.getElementById('modalTag').textContent = product.tag;
      document.getElementById('modalTitle').textContent = product.name;
      document.getElementById('modalPrice').textContent = formatPrice(product.price);
      document.getElementById('modalDescription').textContent = product.description;
      document.getElementById('modalDetails').innerHTML = product.details.map(detail => `<li>${detail}</li>`).join('');
      document.getElementById('detailQty').textContent = state.detailQty;
      openOverlay();
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden','false');
    }

    function persistCart(){
      localStorage.setItem('rivelaCart', JSON.stringify(state.cart));
    }

    function getCustomerFields(){
      return CUSTOMER_FIELD_IDS
        .map(id => document.getElementById(id))
        .filter(Boolean);
    }

    function loadCustomerData(){
      try{
        const savedData = JSON.parse(localStorage.getItem(CUSTOMER_STORAGE_KEY) || '{}');
        getCustomerFields().forEach(field => {
          if(savedData[field.id] !== undefined) field.value = savedData[field.id];
        });
      }catch(error){
        localStorage.removeItem(CUSTOMER_STORAGE_KEY);
      }
    }

    function saveCustomerData(){
      const customerData = {};
      getCustomerFields().forEach(field => {
        customerData[field.id] = field.value;
      });
      localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customerData));
    }

    function setMapStatus(message){
      if(mapStatus) mapStatus.textContent = message;
    }

    function escapeHtml(value){
      return String(value).replace(/[&<>"']/g, character => ({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#039;'
      })[character]);
    }

    function getAddressParts(){
      return {
        address:document.getElementById('address')?.value.trim() || '',
        zone:document.getElementById('zone')?.value.trim() || '',
        city:document.getElementById('city')?.value.trim() || ''
      };
    }

    function normalizeColombianAddress(value){
      return value
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\bcalle\b/ig, 'Cl.')
        .replace(/\bcarrera\b/ig, 'Cra.')
        .replace(/\bavenida\b/ig, 'Av.')
        .replace(/\btransversal\b/ig, 'Tv.')
        .replace(/\bdiagonal\b/ig, 'Dg.')
        .replace(/\s*#\s*/g, ' # ')
        .replace(/(\d+)\s+(\d+)/g, '$1 # $2');
    }

    function getAddressVariants(address){
      const normalized = normalizeColombianAddress(address);
      return [address, normalized]
        .filter(Boolean)
        .filter((item, index, list) => index === list.indexOf(item));
    }

    function getAddressSearchQueries(){
      const { address, zone, city } = getAddressParts();
      const baseQueries = [];

      getAddressVariants(address).forEach(addressVariant => {
        baseQueries.push([addressVariant, zone, city].filter(Boolean).join(', '));
        baseQueries.push([addressVariant, city].filter(Boolean).join(', '));
        baseQueries.push([addressVariant, zone].filter(Boolean).join(', '));
        baseQueries.push(`${addressVariant}, ${city}, Santander`);
      });

      if(zone && city) baseQueries.push([zone, city, 'Santander'].join(', '));
      if(city) baseQueries.push([city, 'Santander'].join(', '));

      const cleanQueries = baseQueries.filter(query => query.length >= 3);

      const expandedQueries = [];
      cleanQueries.forEach(query => {
        expandedQueries.push(query);
        if(!/colombia/i.test(query)) expandedQueries.push(`${query}, Colombia`);
      });

      return expandedQueries.filter((query, index, list) => index === list.indexOf(query)).slice(0, 12);
    }

    function clearDeliveryLocation(message){
      deliveryLocation = null;
      if(mapLink) mapLink.href = 'https://www.openstreetmap.org/';
      if(checkoutMarker){
        checkoutMarker.remove();
        checkoutMarker = null;
      }
      if(checkoutMap) checkoutMap.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
      setMapStatus(message);
    }

    function initCheckoutMap(){
      if(checkoutMap || !document.getElementById('checkoutMap')) return;

      if(!window.L){
        setMapStatus('No se pudo cargar el mapa. Revisa tu conexión a internet.');
        return;
      }

      checkoutMap = L.map('checkoutMap', {
        zoomControl:false,
        scrollWheelZoom:false
      }).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);

      L.control.zoom({ position:'bottomright' }).addTo(checkoutMap);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom:19,
        attribution:'&copy; OpenStreetMap'
      }).addTo(checkoutMap);
    }

    function updateMapLocation(location){
      if(!checkoutMap) return;

      deliveryLocation = location;
      const latLng = [location.lat, location.lon];
      checkoutMap.setView(latLng, location.zoom || 16);

      if(!checkoutMarker){
        checkoutMarker = L.marker(latLng).addTo(checkoutMap);
      }else{
        checkoutMarker.setLatLng(latLng);
      }

      checkoutMarker.bindPopup(location.label).openPopup();
      if(mapLink) mapLink.href = location.url;
      setMapStatus(`Ubicación seleccionada: ${location.label}`);
    }

    function normalizeNominatimLocation(result){
      const lat = Number(result.lat);
      const lon = Number(result.lon);
      const address = result.address || {};
      const road = [address.road || address.pedestrian || address.footway || address.neighbourhood || result.name, address.house_number].filter(Boolean).join(' ');
      const city = address.city || address.town || address.village || address.municipality || '';
      const zone = address.suburb || address.neighbourhood || address.city_district || address.quarter || '';
      return {
        lat,
        lon,
        zoom:17,
        label:result.display_name,
        mainText:road || result.display_name.split(',')[0],
        city,
        zone,
        type:result.type || result.class || 'Ubicación',
        url:`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`
      };
    }

    async function searchNominatim(query, limit = 5){
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${limit}&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { headers:{ 'Accept':'application/json' } });
      if(!response.ok) throw new Error('No se pudo consultar OpenStreetMap.');
      const results = await response.json();
      return results.map(normalizeNominatimLocation);
    }

    async function searchStructuredNominatim(limit = 5){
      const { address, city } = getAddressParts();
      const params = new URLSearchParams({
        format:'json',
        addressdetails:'1',
        limit:String(limit),
        street:normalizeColombianAddress(address),
        city,
        state:'Santander',
        country:'Colombia'
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers:{ 'Accept':'application/json' }
      });
      if(!response.ok) throw new Error('No se pudo consultar OpenStreetMap.');
      const results = await response.json();
      return results.map(normalizeNominatimLocation);
    }

    async function searchAddressLocation(queries, limit = 5){
      const locations = [];

      try{
        locations.push(...await searchStructuredNominatim(limit));
      }catch(error){}

      for(const query of queries){
        try{
          locations.push(...await searchNominatim(query, limit));
        }catch(error){}

        if(locations.length >= limit) break;
      }

      return locations
        .filter(location => Number.isFinite(location.lat) && Number.isFinite(location.lon))
        .filter((location, index, list) => index === list.findIndex(item => item.label === location.label))
        .slice(0, limit)[0] || null;
    }

    async function verifyAddress(){
      const queries = getAddressSearchQueries();
      const { address, city } = getAddressParts();

      if(!address || !city){
        clearDeliveryLocation('Completa al menos dirección y ciudad antes de verificar.');
        return;
      }

      if(!window.L) return;
      initCheckoutMap();
      const requestId = ++geocodeRequestId;
      clearDeliveryLocation('Verificando dirección en OpenStreetMap...');
      if(verifyAddressBtn) verifyAddressBtn.disabled = true;

      try{
        const location = await searchAddressLocation(queries, 5);
        if(requestId !== geocodeRequestId) return;

        if(!location){
          clearDeliveryLocation('No pudimos verificar la dirección. Prueba con una dirección más simple o agrega barrio/zona.');
          return;
        }

        updateMapLocation(location);
      }catch(error){
        clearDeliveryLocation('No se pudo consultar OpenStreetMap en este momento.');
      }finally{
        if(verifyAddressBtn) verifyAddressBtn.disabled = false;
      }
    }

    function addToCart(id, qty = 1){
      state.cart[id] = (state.cart[id] || 0) + qty;
      persistCart();
      renderCart();
      updateCartBadges();
      showToast('Producto agregado al carrito');
    }

    function setCartQty(id, qty){
      if(qty <= 0) delete state.cart[id];
      else state.cart[id] = qty;
      persistCart();
      renderCart();
      updateCartBadges();
    }

    function clearCart(){
      state.cart = {};
      persistCart();
      renderCart();
      updateCartBadges();
    }

    function openCart(){
      openOverlay();
      modal.classList.remove('is-open');
      checkoutPanel.classList.remove('is-open');
      modal.setAttribute('aria-hidden','true');
      checkoutPanel.setAttribute('aria-hidden','true');
      cartDrawer.classList.add('is-open');
      cartDrawer.setAttribute('aria-hidden','false');
      renderCart();
    }

    function openCheckout(){
      if(cartUnits() === 0){
        showToast('Agrega al menos un producto para continuar');
        return;
      }
      openOverlay();
      modal.classList.remove('is-open');
      cartDrawer.classList.remove('is-open');
      modal.setAttribute('aria-hidden','true');
      cartDrawer.setAttribute('aria-hidden','true');
      checkoutPanel.classList.add('is-open');
      checkoutPanel.setAttribute('aria-hidden','false');
      renderCheckoutSummary();
      initCheckoutMap();
      setTimeout(() => {
        if(checkoutMap) checkoutMap.invalidateSize();
      }, 260);
    }

    function renderCart(){
      const entries = cartEntries();
      const cartList = document.getElementById('cartList');
      document.getElementById('cartTotal').textContent = formatPrice(cartTotal());

      if(!entries.length){
        cartList.innerHTML = `<div class="cart-empty">Tu carrito está vacío.<br>Elige un producto del catálogo para iniciar tu pedido.</div>`;
        return;
      }

      cartList.innerHTML = entries.map(({product, qty}) => `
        <article class="cart-item">
          <div class="cart-thumb">${pastrySvg(product.visual)}</div>
          <div>
            <h3>${product.name}</h3>
            <p>${formatPrice(product.price)} · ${product.tag}</p>
            <div class="cart-row">
              <div class="qty-control">
                <button type="button" data-cart-minus="${product.id}" aria-label="Restar ${product.name}">−</button>
                <span class="qty-value">${qty}</span>
                <button type="button" data-cart-plus="${product.id}" aria-label="Sumar ${product.name}">+</button>
              </div>
              <div style="display:grid;gap:.22rem;text-align:right">
                <strong class="price">${formatPrice(product.price * qty)}</strong>
                <button class="remove-btn" type="button" data-cart-remove="${product.id}">Eliminar</button>
              </div>
            </div>
          </div>
        </article>
      `).join('');
    }

    function renderCheckoutSummary(){
      const entries = cartEntries();
      document.getElementById('checkoutSummary').innerHTML = entries.map(({product, qty}) => `
        <div class="summary-item"><span><b>${qty}×</b> ${product.name}</span><strong>${formatPrice(product.price * qty)}</strong></div>
      `).join('');
      document.getElementById('checkoutTotal').textContent = formatPrice(cartTotal());
    }

    function updateCartBadges(){
      const units = cartUnits();
      document.querySelectorAll('[data-cart-count]').forEach(item => item.textContent = units);
      const mobileText = document.querySelector('[data-mobile-cart-text]');
      mobileText.textContent = units ? `${units} producto${units === 1 ? '' : 's'} · ${formatPrice(cartTotal())}` : 'Tu pedido está vacío';
    }

    let toastTimeout;
    function showToast(message){
      toast.textContent = message;
      toast.classList.add('is-visible');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => toast.classList.remove('is-visible'), 1900);
    }

    function buildWhatsappMessage(form){
      const orderId = `RV-${Date.now().toString().slice(-6)}`;
      const entries = cartEntries();
      const productLines = entries.map(({product, qty}) => `• ${qty} x ${product.name} — ${formatPrice(product.price * qty)}`).join('\n');
      const formData = new FormData(form);
      const dataLines = [...formData.entries()]
        .filter(([, value]) => String(value).trim().length)
        .map(([key, value]) => `• ${key}: ${value}`)
        .join('\n');
      const mapLine = deliveryLocation ? `\n• Mapa: ${deliveryLocation.url}` : '';

      return `Hola Rivela, quiero hacer este pedido.\n\nPedido: ${orderId}\n\nProductos:\n${productLines}\n\nTotal estimado: ${formatPrice(cartTotal())}\n\nDatos del cliente y entrega:\n${dataLines}${mapLine}\n\nQuedo pendiente de confirmación de disponibilidad, domicilio y pago. Gracias.`;
    }

    document.addEventListener('click', event => {
      const productButton = event.target.closest('[data-product-id]');
      if(productButton){
        event.preventDefault();
        openProduct(productButton.dataset.productId);
        return;
      }

      const cartButton = event.target.closest('[data-open-cart]');
      if(cartButton){
        event.preventDefault();
        openCart();
        return;
      }

      const checkoutButton = event.target.closest('[data-open-checkout]');
      if(checkoutButton){
        event.preventDefault();
        openCheckout();
      }
    });

    document.querySelectorAll('[data-filter]').forEach(button => {
      button.addEventListener('click', () => {
        state.filter = button.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach(item => item.classList.remove('is-active'));
        button.classList.add('is-active');
        renderProducts();
      });
    });

    document.querySelectorAll('[data-close-all]').forEach(button => button.addEventListener('click', closeAll));
    overlay.addEventListener('click', closeAll);

    document.querySelector('[data-detail-minus]').addEventListener('click', () => {
      state.detailQty = Math.max(1, state.detailQty - 1);
      document.getElementById('detailQty').textContent = state.detailQty;
    });
    document.querySelector('[data-detail-plus]').addEventListener('click', () => {
      state.detailQty += 1;
      document.getElementById('detailQty').textContent = state.detailQty;
    });
    document.getElementById('addToCartBtn').addEventListener('click', () => {
      if(state.activeProduct){
        addToCart(state.activeProduct.id, state.detailQty);
        closeAll();
        openCart();
      }
    });
    document.getElementById('buyNowBtn').addEventListener('click', () => {
      if(state.activeProduct){
        addToCart(state.activeProduct.id, state.detailQty);
        openCheckout();
      }
    });

    document.getElementById('cartList').addEventListener('click', event => {
      const plus = event.target.closest('[data-cart-plus]');
      const minus = event.target.closest('[data-cart-minus]');
      const remove = event.target.closest('[data-cart-remove]');
      if(plus) setCartQty(plus.dataset.cartPlus, (state.cart[plus.dataset.cartPlus] || 0) + 1);
      if(minus) setCartQty(minus.dataset.cartMinus, (state.cart[minus.dataset.cartMinus] || 0) - 1);
      if(remove) setCartQty(remove.dataset.cartRemove, 0);
    });

    document.getElementById('clearCartBtn').addEventListener('click', clearCart);
    document.getElementById('checkoutBtn').addEventListener('click', openCheckout);

    document.getElementById('orderForm').addEventListener('input', saveCustomerData);
    document.getElementById('orderForm').addEventListener('change', saveCustomerData);
    ['address', 'city', 'zone'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        deliveryLocation = null;
        if(mapLink) mapLink.href = 'https://www.openstreetmap.org/';
        setMapStatus('Dirección editada. Presiona "Verificar dirección" para actualizar el mapa.');
      });
    });
    if(verifyAddressBtn) verifyAddressBtn.addEventListener('click', verifyAddress);
    document.getElementById('orderForm').addEventListener('submit', event => {
      event.preventDefault();
      if(cartUnits() === 0){
        showToast('El carrito está vacío');
        return;
      }
      saveCustomerData();
      const message = buildWhatsappMessage(event.currentTarget);
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });

    document.addEventListener('keydown', event => {
      if(event.key === 'Escape'){
        closeAll();
      }
    });

    async function init(){
      loadCustomerData();
      await loadProducts();
      if(products.length){
        renderProducts();
        renderCart();
        updateCartBadges();
      }
    }

    init();
