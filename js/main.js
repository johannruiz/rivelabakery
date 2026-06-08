// Reemplaza este número por el WhatsApp real de la pastelería, usando indicativo de país y sin signos.
    const WHATSAPP_NUMBER = '573155579910';

    const PRODUCTS_URL = 'data/products.json';
    const CUSTOMER_STORAGE_KEY = 'rivelaCustomerData';
    const CUSTOM_PRODUCTS_STORAGE_KEY = 'rivelaCustomProducts';
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
    let storeSettings = {
      promoBanner:[
        { text:'Promo de temporada · ' },
        { text:'15% OFF', highlight:true },
        { text:' en cajas regalo y tartas seleccionadas · Pedidos por WhatsApp' }
      ],
      deliveryTypes:['Domicilio'],
      paymentMethods:['Transferencia bancaria', 'Nequi', 'Daviplata', 'Efectivo'],
      timeSlots:['9:00 a. m.', '9:30 a. m.', '10:00 a. m.', '10:30 a. m.', '11:00 a. m.', '11:30 a. m.', '12:00 p. m.', '12:30 p. m.', '1:00 p. m.', '1:30 p. m.', '2:00 p. m.', '2:30 p. m.', '3:00 p. m.', '3:30 p. m.', '4:00 p. m.', '4:30 p. m.', '5:00 p. m.', '5:30 p. m.', '6:00 p. m.'],
      cheesecakeBuilder:{
        name:'Cheesecake personalizado',
        tag:'Crea tu cheesecake',
        defaultVisual:'cheesecake',
        bases:[{ name:'Clasico', price:45000 }],
        flavors:[{ name:'Frutos rojos', price:8000 }, { name:'Ferrero', price:12000 }, { name:'Cookies & Cream', price:10000 }],
        toppings:[{ name:'Mix frutos rojos', price:6000 }, { name:'Oreo triturado', price:4000 }, { name:'Mani', price:3000 }, { name:'Ferrero', price:8000 }],
        combinationImages:[]
      }
    };
    let customProducts = JSON.parse(localStorage.getItem(CUSTOM_PRODUCTS_STORAGE_KEY) || '[]');

    const state = {
      filter:'all',
      cart: JSON.parse(localStorage.getItem('rivelaCart') || '{}'),
      activeProduct:null,
      detailQty:1,
      cheesecakeQty:1,
      editingCustomId:null
    };

    const productGrid = document.getElementById('productGrid');
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('productModal');
    const cheesecakeModal = document.getElementById('cheesecakeModal');
    const cartDrawer = document.getElementById('cartDrawer');
    const checkoutPanel = document.getElementById('checkoutPanel');
    const toast = document.getElementById('toast');
    const topPromo = document.querySelector('.top-promo');
    const siteHeader = document.querySelector('.site-header');
    const menuToggle = document.querySelector('[data-menu-toggle]');

    const formatPrice = value => `$${Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits:0 })}`;
    const getProduct = id => [...products, ...customProducts].find(product => product.id === id);
    const productPriceLabel = product => product.price > 0 ? formatPrice(product.price) : product.priceLabel || 'Precio por confirmar';
    const productLineTotal = (product, qty) => product.price > 0 ? formatPrice(product.price * qty) : product.priceLabel || 'Precio por confirmar';
    const cartEntries = () => Object.entries(state.cart).map(([id, qty]) => ({ product:getProduct(id), qty })).filter(item => item.product && item.qty > 0);
    const cartTotal = () => cartEntries().reduce((sum, item) => sum + item.product.price * item.qty, 0);
    const cartUnits = () => cartEntries().reduce((sum, item) => sum + item.qty, 0);

    async function loadProducts(){
      try{
        const response = await fetch(PRODUCTS_URL);
        if(!response.ok) throw new Error(`No se pudo leer ${PRODUCTS_URL}`);
        const data = await response.json();
        products = Array.isArray(data) ? data : data.products;
        storeSettings = Array.isArray(data) ? storeSettings : { ...storeSettings, ...(data.settings || {}) };
        if(!Array.isArray(products)) throw new Error('El archivo de productos debe incluir una lista en "products".');
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

    function fillSelect(id, options, placeholder){
      const select = document.getElementById(id);
      if(!select) return;

      const validOptions = (Array.isArray(options) ? options : [])
        .map(normalizePricedOption)
        .filter(option => option.name);

      select.innerHTML = [
        `<option value="">${escapeHtml(placeholder)}</option>`,
        ...validOptions.map(option => `<option value="${escapeHtml(option.name)}">${escapeHtml(formatOptionLabel(option))}</option>`)
      ].join('');
    }

    function normalizePricedOption(option){
      if(typeof option === 'string') return { name:option.trim(), price:0 };
      return {
        name:String(option?.name || '').trim(),
        price:Number(option?.price || 0)
      };
    }

    function getOptionByName(options, name){
      return (Array.isArray(options) ? options : [])
        .map(normalizePricedOption)
        .find(option => normalizeOption(option.name) === normalizeOption(name)) || { name, price:0 };
    }

    function formatOptionLabel(option){
      return option.price > 0 ? `${option.name} · ${formatPrice(option.price)}` : option.name;
    }

    function selectFirstOption(id){
      const select = document.getElementById(id);
      if(select && !select.value && select.options.length > 1){
        select.selectedIndex = 1;
      }
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

    function renderCheckoutOptions(){
      fillSelect('deliveryType', storeSettings.deliveryTypes, 'Selecciona entrega');
      fillSelect('payment', storeSettings.paymentMethods, 'Selecciona pago');
      fillSelect('hour', storeSettings.timeSlots, 'Selecciona horario');
    }

    function renderCheesecakeOptions(){
      const builder = getCheesecakeBuilder();
      fillSelect('cheesecakeBase', builder.bases, 'Selecciona base');
      fillSelect('cheesecakeFlavor', builder.flavors, 'Selecciona sabor');
      renderCheesecakeToppings();
      selectFirstOption('cheesecakeBase');
      selectFirstOption('cheesecakeFlavor');
      updateCheesecakePreview();
    }

    function renderCheesecakeToppings(selectedToppings = []){
      const container = document.getElementById('cheesecakeToppings');
      if(!container) return;

      const builder = getCheesecakeBuilder();
      const selectedByName = new Map(selectedToppings.map(item => [normalizeOption(item.name), Number(item.qty || 0)]));
      const toppings = (builder.toppings || []).map(normalizePricedOption).filter(option => option.name);

      container.innerHTML = toppings.map(option => {
        const qty = selectedByName.get(normalizeOption(option.name)) || 0;
        return `
          <div class="topping-option">
            <div>
              <strong>${escapeHtml(option.name)}</strong>
              <span>${option.price > 0 ? formatPrice(option.price) : 'Sin costo adicional'}</span>
            </div>
            <div class="qty-control topping-qty">
              <button type="button" data-topping-minus="${escapeHtml(option.name)}" aria-label="Restar ${escapeHtml(option.name)}">−</button>
              <span class="qty-value" data-topping-qty="${escapeHtml(option.name)}">${qty}</span>
              <button type="button" data-topping-plus="${escapeHtml(option.name)}" aria-label="Sumar ${escapeHtml(option.name)}">+</button>
            </div>
          </div>
        `;
      }).join('');
    }

    function renderPromoBanner(){
      if(!topPromo) return;

      const bannerParts = Array.isArray(storeSettings.promoBanner)
        ? storeSettings.promoBanner
        : [{ text:String(storeSettings.promoBanner || '') }];

      topPromo.innerHTML = bannerParts
        .map(part => {
          const text = escapeHtml(typeof part === 'string' ? part : part.text || '');
          return part.highlight ? `<strong>${text}</strong>` : text;
        })
        .join('');
    }

    function getTodayValue(){
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function formatDateExample(value){
      const [year, month, day] = String(value || '').split('-');
      return year && month && day ? `${day}/${month}/${year}` : 'dd/mm/aaaa';
    }

    function updateDatePlaceholder(){
      const deliveryDate = document.getElementById('deliveryDate');
      const dateField = deliveryDate?.closest('.date-field');
      if(!deliveryDate || !dateField) return;

      const placeholder = dateField.querySelector('.date-placeholder');
      if(placeholder) placeholder.textContent = `Ej. ${formatDateExample(deliveryDate.min || getTodayValue())}`;
      dateField.classList.toggle('is-empty', !deliveryDate.value);
    }

    function openDatePicker(){
      const deliveryDate = document.getElementById('deliveryDate');
      if(!deliveryDate || typeof deliveryDate.showPicker !== 'function') return;
      try{
        deliveryDate.showPicker();
      }catch(error){
        deliveryDate.focus();
      }
    }

    function handleDatePointer(event){
      if(event.pointerType !== 'mouse') return;
      event.preventDefault();
      openDatePicker();
    }

    function blockDateTyping(event){
      const allowedKeys = ['Tab', 'Escape', 'Enter', ' ', 'ArrowDown'];
      if(allowedKeys.includes(event.key)){
        if(event.key !== 'Tab' && event.key !== 'Escape'){
          event.preventDefault();
          openDatePicker();
        }
        return;
      }
      event.preventDefault();
    }

    function setMinimumDeliveryDate(){
      const deliveryDate = document.getElementById('deliveryDate');
      if(!deliveryDate) return;

      const todayValue = getTodayValue();
      deliveryDate.min = todayValue;
      if(deliveryDate.value && deliveryDate.value < todayValue) deliveryDate.value = todayValue;
      updateDatePlaceholder();
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

    function isImageVisual(visual){
      return /\.(avif|webp|png|jpe?g|gif|svg)$/i.test(String(visual || ''));
    }

    function productVisual(product){
      if(isImageVisual(product.visual)){
        const imagePath = `assets/images/${encodeURIComponent(product.visual)}`;
        return `<div class="product-photo-fallback">${pastrySvg('cheesecake')}</div><img class="product-photo" src="${imagePath}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.hidden=true" />`;
      }

      return pastrySvg(product.visual);
    }

    function getCheesecakeBuilder(){
      return storeSettings.cheesecakeBuilder || {};
    }

    function normalizeOption(value){
      return String(value || '').trim().toLowerCase();
    }

    function getCheesecakeSelection(){
      const builder = getCheesecakeBuilder();
      const baseName = document.getElementById('cheesecakeBase')?.value || '';
      const flavorName = document.getElementById('cheesecakeFlavor')?.value || '';
      const toppings = [...document.querySelectorAll('[data-topping-qty]')]
        .map(item => {
          const name = item.dataset.toppingQty;
          const qty = Number(item.textContent || 0);
          const option = getOptionByName(builder.toppings, name);
          return { name, qty, price:option.price };
        })
        .filter(item => item.qty > 0);

      return {
        base:baseName,
        flavor:flavorName,
        basePrice:getOptionByName(builder.bases, baseName).price,
        flavorPrice:getOptionByName(builder.flavors, flavorName).price,
        toppings
      };
    }

    function getCheesecakeTotal(selection = getCheesecakeSelection()){
      return Number(selection.basePrice || 0) +
        Number(selection.flavorPrice || 0) +
        selection.toppings.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
    }

    function getCheesecakeVisual(){
      const builder = getCheesecakeBuilder();
      const selection = getCheesecakeSelection();
      const match = (builder.combinationImages || []).find(item =>
        normalizeOption(item.base) === normalizeOption(selection.base) &&
        normalizeOption(item.flavor) === normalizeOption(selection.flavor) &&
        (!item.topping || selection.toppings.some(topping => normalizeOption(topping.name) === normalizeOption(item.topping)))
      );
      return match?.visual || builder.defaultVisual || 'cheesecake';
    }

    function updateCheesecakePreview(){
      const preview = document.getElementById('cheesecakePreview');
      if(!preview) return;

      const builder = getCheesecakeBuilder();
      const previewProduct = {
        name:builder.name || 'Cheesecake personalizado',
        visual:getCheesecakeVisual()
      };
      preview.innerHTML = productVisual(previewProduct);
      document.getElementById('cheesecakePrice').textContent = formatPrice(getCheesecakeTotal());
    }

    function persistCustomProducts(){
      localStorage.setItem(CUSTOM_PRODUCTS_STORAGE_KEY, JSON.stringify(customProducts));
    }

    function createCustomCheesecakeProduct(){
      const builder = getCheesecakeBuilder();
      const selection = getCheesecakeSelection();
      const toppingText = selection.toppings.length
        ? selection.toppings.map(item => `${item.qty}x ${item.name}`).join(', ')
        : 'sin toppings';
      const nameSuffix = `${selection.flavor} · ${toppingText}`;
      const id = state.editingCustomId || `cheesecake-personalizado-${Date.now()}`;
      return {
        id,
        category:'personalizados',
        tag:builder.tag || 'Crea tu cheesecake',
        name:`${builder.name || 'Cheesecake personalizado'} - ${nameSuffix}`,
        price:getCheesecakeTotal(selection),
        isCustom:true,
        customSelection:selection,
        short:`Base ${selection.base}, sabor ${selection.flavor}, toppings ${toppingText}.`,
        description:'Cheesecake personalizado creado desde la web de Rivela Bakery.',
        details:[
          `Base: ${selection.base} (${formatPrice(selection.basePrice)})`,
          `Sabor: ${selection.flavor} (${formatPrice(selection.flavorPrice)})`,
          `Toppings: ${toppingText}`,
          `Total unitario: ${formatPrice(getCheesecakeTotal(selection))}`
        ],
        visual:getCheesecakeVisual()
      };
    }

    function addCustomCheesecake(openCartAfter = false){
      const selection = getCheesecakeSelection();
      if(!selection.base || !selection.flavor){
        showToast('Completa base y sabor');
        return;
      }

      const wasEditing = Boolean(state.editingCustomId);
      const product = createCustomCheesecakeProduct();
      const existingIndex = customProducts.findIndex(item => item.id === product.id);
      if(existingIndex >= 0) customProducts[existingIndex] = product;
      else customProducts.push(product);
      persistCustomProducts();
      if(state.editingCustomId){
        state.cart[product.id] = state.cheesecakeQty;
        persistCart();
        renderCart();
        updateCartBadges();
        showToast('Cheesecake actualizado');
      }else{
        addToCart(product.id, state.cheesecakeQty);
      }
      state.editingCustomId = null;
      closeAll();
      if(openCartAfter || wasEditing) openCart();
    }

    function renderProducts(){
      const visible = products.filter(product => state.filter === 'all' || product.category === state.filter);
      productGrid.innerHTML = visible.map(product => `
        <article class="product-card">
          <button class="product-button" type="button" data-product-id="${product.id}" aria-label="Ver detalle de ${product.name}">
            <div class="product-media">${productVisual(product)}</div>
            <div class="product-info">
              <span class="tag">${product.tag}</span>
              <div class="product-title-row">
                <h3>${product.name}</h3>
                <span class="price">${productPriceLabel(product)}</span>
              </div>
              <p>${product.short}</p>
              <div class="product-meta"><span>Bajo pedido</span><span>Empaque Rivela</span></div>
            </div>
          </button>
        </article>
      `).join('');
    }

    function openOverlay(){
      closeMobileMenu();
      overlay.classList.add('is-open');
      document.body.classList.add('no-scroll');
    }

    function closeMobileMenu(){
      siteHeader?.classList.remove('is-menu-open');
      menuToggle?.setAttribute('aria-expanded', 'false');
    }

    function toggleMobileMenu(){
      const isOpen = siteHeader?.classList.toggle('is-menu-open');
      menuToggle?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    function closeAll(){
      overlay.classList.remove('is-open');
      modal.classList.remove('is-open');
      cheesecakeModal.classList.remove('is-open');
      cartDrawer.classList.remove('is-open');
      checkoutPanel.classList.remove('is-open');
      modal.setAttribute('aria-hidden','true');
      cheesecakeModal.setAttribute('aria-hidden','true');
      cartDrawer.setAttribute('aria-hidden','true');
      checkoutPanel.setAttribute('aria-hidden','true');
      document.body.classList.remove('no-scroll');
      state.editingCustomId = null;
    }

    function openProduct(id){
      const product = getProduct(id);
      if(!product) return;
      cartDrawer.classList.remove('is-open');
      checkoutPanel.classList.remove('is-open');
      cheesecakeModal.classList.remove('is-open');
      cartDrawer.setAttribute('aria-hidden','true');
      checkoutPanel.setAttribute('aria-hidden','true');
      cheesecakeModal.setAttribute('aria-hidden','true');
      state.activeProduct = product;
      state.detailQty = 1;
      document.getElementById('modalMedia').innerHTML = productVisual(product);
      document.getElementById('modalTag').textContent = product.tag;
      document.getElementById('modalTitle').textContent = product.name;
      document.getElementById('modalPrice').textContent = productPriceLabel(product);
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

    function setSelectValue(id, value){
      const select = document.getElementById(id);
      if(select) select.value = value || '';
    }

    function getToppingQtyElement(name){
      return [...document.querySelectorAll('[data-topping-qty]')]
        .find(item => item.dataset.toppingQty === name);
    }

    function setToppingQty(name, qty){
      const item = getToppingQtyElement(name);
      if(item) item.textContent = Math.max(0, Number(qty || 0));
    }

    function openCheesecakeModal(productId = null){
      const editingProduct = productId ? getProduct(productId) : null;
      state.editingCustomId = editingProduct?.isCustom ? productId : null;
      state.cheesecakeQty = state.editingCustomId ? (state.cart[productId] || 1) : 1;
      document.getElementById('cheesecakeQty').textContent = state.cheesecakeQty;
      renderCheesecakeOptions();

      if(editingProduct?.customSelection){
        setSelectValue('cheesecakeBase', editingProduct.customSelection.base);
        setSelectValue('cheesecakeFlavor', editingProduct.customSelection.flavor);
        renderCheesecakeToppings(editingProduct.customSelection.toppings || []);
        updateCheesecakePreview();
      }

      document.getElementById('addCustomCheesecakeBtn').textContent = state.editingCustomId ? 'Guardar cambios' : 'Agregar al carrito';
      document.getElementById('orderCustomCheesecakeBtn').textContent = state.editingCustomId ? 'Guardar y ver carrito' : 'Pedir ahora';
      openOverlay();
      modal.classList.remove('is-open');
      cartDrawer.classList.remove('is-open');
      checkoutPanel.classList.remove('is-open');
      modal.setAttribute('aria-hidden','true');
      cartDrawer.setAttribute('aria-hidden','true');
      checkoutPanel.setAttribute('aria-hidden','true');
      cheesecakeModal.classList.add('is-open');
      cheesecakeModal.setAttribute('aria-hidden','false');
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

    function validateDeliveryDate(){
      const deliveryDate = document.getElementById('deliveryDate');
      if(!deliveryDate) return true;

      const todayValue = getTodayValue();
      deliveryDate.min = todayValue;

      if(deliveryDate.value && deliveryDate.value < todayValue){
        deliveryDate.value = todayValue;
        showToast('La fecha debe ser hoy o una fecha posterior');
        deliveryDate.focus();
        return false;
      }

      return true;
    }

    function addToCart(id, qty = 1){
      state.cart[id] = (state.cart[id] || 0) + qty;
      persistCart();
      renderCart();
      updateCartBadges();
      showToast('Producto agregado al carrito');
    }

    function setCartQty(id, qty){
      if(qty <= 0){
        delete state.cart[id];
        customProducts = customProducts.filter(product => product.id !== id);
        persistCustomProducts();
      }else{
        state.cart[id] = qty;
      }
      persistCart();
      renderCart();
      updateCartBadges();
    }

    function clearCart(){
      state.cart = {};
      customProducts = [];
      persistCustomProducts();
      persistCart();
      renderCart();
      updateCartBadges();
    }

    function openCart(){
      openOverlay();
      modal.classList.remove('is-open');
      cheesecakeModal.classList.remove('is-open');
      checkoutPanel.classList.remove('is-open');
      modal.setAttribute('aria-hidden','true');
      cheesecakeModal.setAttribute('aria-hidden','true');
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
      cheesecakeModal.classList.remove('is-open');
      modal.setAttribute('aria-hidden','true');
      cartDrawer.setAttribute('aria-hidden','true');
      cheesecakeModal.setAttribute('aria-hidden','true');
      checkoutPanel.classList.add('is-open');
      checkoutPanel.setAttribute('aria-hidden','false');
      renderCheckoutSummary();
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
          <div class="cart-thumb">${productVisual(product)}</div>
          <div>
            <h3>${product.name}</h3>
            <p>${productPriceLabel(product)} · ${product.tag}</p>
            <div class="cart-row">
              <div class="qty-control">
                <button type="button" data-cart-minus="${product.id}" aria-label="Restar ${product.name}">−</button>
                <span class="qty-value">${qty}</span>
                <button type="button" data-cart-plus="${product.id}" aria-label="Sumar ${product.name}">+</button>
              </div>
              <div style="display:grid;gap:.22rem;text-align:right">
                <strong class="price">${productLineTotal(product, qty)}</strong>
                ${product.isCustom ? `<button class="remove-btn" type="button" data-cart-edit="${product.id}">Editar</button>` : ''}
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
        <div class="summary-item"><span><b>${qty}×</b> ${product.name}</span><strong>${productLineTotal(product, qty)}</strong></div>
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
      const productLines = entries.map(({product, qty}) => {
        const details = product.isCustom && product.details?.length ? `\n  ${product.details.join('\n  ')}` : '';
        return `• ${qty} x ${product.name} — ${productLineTotal(product, qty)}${details}`;
      }).join('\n');
      const formData = new FormData(form);
      const dataLines = [...formData.entries()]
        .filter(([, value]) => String(value).trim().length)
        .map(([key, value]) => `• ${key}: ${value}`)
        .join('\n');
      return `Hola Rivela, quiero hacer este pedido.\n\nPedido: ${orderId}\n\nProductos:\n${productLines}\n\nTotal estimado: ${formatPrice(cartTotal())}\n\nDatos del cliente y entrega:\n${dataLines}\n\nQuedo pendiente de confirmación de disponibilidad, domicilio y pago. Gracias.`;
    }

    document.addEventListener('click', event => {
      const menuButton = event.target.closest('[data-menu-toggle]');
      if(menuButton){
        event.preventDefault();
        toggleMobileMenu();
        return;
      }

      const mobileMenuLink = event.target.closest('.mobile-menu a');
      if(mobileMenuLink){
        closeMobileMenu();
        return;
      }

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
        return;
      }

      const cheesecakeButton = event.target.closest('[data-open-cheesecake]');
      if(cheesecakeButton){
        event.preventDefault();
        openCheesecakeModal();
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
      }
    });
    document.getElementById('buyNowBtn').addEventListener('click', () => {
      if(state.activeProduct){
        addToCart(state.activeProduct.id, state.detailQty);
        openCart();
      }
    });

    ['cheesecakeBase', 'cheesecakeFlavor'].forEach(id => {
      document.getElementById(id).addEventListener('change', updateCheesecakePreview);
    });
    document.getElementById('cheesecakeToppings').addEventListener('click', event => {
      const plus = event.target.closest('[data-topping-plus]');
      const minus = event.target.closest('[data-topping-minus]');
      const name = plus?.dataset.toppingPlus || minus?.dataset.toppingMinus;
      if(!name) return;

      const current = Number(getToppingQtyElement(name)?.textContent || 0);
      setToppingQty(name, plus ? current + 1 : Math.max(0, current - 1));
      updateCheesecakePreview();
    });
    document.getElementById('cheesecakeMinus').addEventListener('click', () => {
      state.cheesecakeQty = Math.max(1, state.cheesecakeQty - 1);
      document.getElementById('cheesecakeQty').textContent = state.cheesecakeQty;
    });
    document.getElementById('cheesecakePlus').addEventListener('click', () => {
      state.cheesecakeQty += 1;
      document.getElementById('cheesecakeQty').textContent = state.cheesecakeQty;
    });
    document.getElementById('addCustomCheesecakeBtn').addEventListener('click', () => addCustomCheesecake(false));
    document.getElementById('orderCustomCheesecakeBtn').addEventListener('click', () => addCustomCheesecake(true));

    document.getElementById('cartList').addEventListener('click', event => {
      const plus = event.target.closest('[data-cart-plus]');
      const minus = event.target.closest('[data-cart-minus]');
      const remove = event.target.closest('[data-cart-remove]');
      const edit = event.target.closest('[data-cart-edit]');
      if(plus) setCartQty(plus.dataset.cartPlus, (state.cart[plus.dataset.cartPlus] || 0) + 1);
      if(minus) setCartQty(minus.dataset.cartMinus, (state.cart[minus.dataset.cartMinus] || 0) - 1);
      if(remove) setCartQty(remove.dataset.cartRemove, 0);
      if(edit) openCheesecakeModal(edit.dataset.cartEdit);
    });

    document.getElementById('clearCartBtn').addEventListener('click', clearCart);
    document.getElementById('checkoutBtn').addEventListener('click', openCheckout);
    document.getElementById('deliveryDate').addEventListener('pointerdown', handleDatePointer);
    document.getElementById('deliveryDate').addEventListener('click', openDatePicker);
    document.getElementById('deliveryDate').addEventListener('keydown', blockDateTyping);
    document.getElementById('deliveryDate').addEventListener('beforeinput', event => event.preventDefault());
    document.getElementById('deliveryDate').addEventListener('paste', event => event.preventDefault());

    document.getElementById('orderForm').addEventListener('input', () => {
      saveCustomerData();
      updateDatePlaceholder();
    });
    document.getElementById('orderForm').addEventListener('change', () => {
      saveCustomerData();
      updateDatePlaceholder();
    });
    document.getElementById('orderForm').addEventListener('submit', event => {
      event.preventDefault();
      if(cartUnits() === 0){
        showToast('El carrito está vacío');
        return;
      }
      if(!validateDeliveryDate()) return;
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
      await loadProducts();
      renderPromoBanner();
      renderCheckoutOptions();
      renderCheesecakeOptions();
      setMinimumDeliveryDate();
      loadCustomerData();
      setMinimumDeliveryDate();
      if(products.length){
        renderProducts();
        renderCart();
        updateCartBadges();
      }
    }

    init();
