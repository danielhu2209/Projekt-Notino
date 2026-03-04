let allProducts = [];
      let cart = JSON.parse(localStorage.getItem("lessence_cart")) || [];

      const productGrid = document.getElementById("product-grid");
      const cartSidebar = document.getElementById("cart-sidebar");
      const cartOverlay = document.getElementById("cart-overlay");
      const cartItemsContainer = document.getElementById("cart-items-container");
      const cartBadge = document.getElementById("cart-badge");
      const cartTotalPrice = document.getElementById("cart-total-price");
      const authLink = document.getElementById("auth-link");

      
      const currentUser = JSON.parse(localStorage.getItem("logged_in_user"));
      if (currentUser) {
        authLink.innerText = "Kijelentkezés";
        authLink.href = "#";
        authLink.onclick = (e) => {
          e.preventDefault();
          localStorage.removeItem("logged_in_user");
          window.location.reload();
        };
      }

      
      async function fetchProducts() {
        try {
          const response = await fetch("http://localhost:3000/parfumok");
          allProducts = await response.json();
          applyFiltersAndSort();
          updateCartUI(); 
        } catch (error) {
          console.error("Hiba az adatbázissal:", error);
        }
      }

      
      function renderProducts(productsToRender) {
        productGrid.innerHTML = "";
        document.getElementById("product-count").innerText = productsToRender.length;

        productsToRender.forEach((product) => {
          const isAvailable = product.raktarkeszlet > 0;
          
          const btnHTML = isAvailable
            ? `<button class="btn btn-cart" onclick="addToCart('${product.id}')">Kosárba teszem</button>`
            : `<button class="btn btn-cart btn-disabled" disabled>Elfogyott</button>`;

          const cardHTML = `
            <div class="collection-card">
                <div class="img-container">
                    <img src="${product.kep_url}" onerror="this.src='https://via.placeholder.com/300x400?text=Kép'">
                </div>
                <h3>${product.nev}</h3>
                <p class="notes">${product.illatjegy}</p>
                <p class="price">${product.ar.toLocaleString("hu-HU")} Ft</p>
                <p class="stock-status ${isAvailable ? "in-stock" : "out-of-stock"}">
                    Raktáron: ${product.raktarkeszlet} db
                </p>
                ${btnHTML}
            </div>
          `;
          productGrid.insertAdjacentHTML("beforeend", cardHTML);
        });
      }

      
      function addToCart(productId) {
        const product = allProducts.find((p) => String(p.id) === String(productId));
        const existingItem = cart.find((item) => String(item.id) === String(productId));

        if (!product) return;

        if (existingItem) {
          if (existingItem.quantity < product.raktarkeszlet) {
            existingItem.quantity++;
          } else {
            alert("Ebből a termékből nincs több raktáron!");
            return;
          }
        } else {
          cart.push({
            id: product.id,
            nev: product.nev,
            ar: product.ar,
            kep_url: product.kep_url,
            quantity: 1,
          });
        }

        saveCart();
        updateCartUI();

        if (!cartSidebar.classList.contains("open")) {
          toggleCart();
        }
      }

      
      function changeQuantity(productId, delta) {
        const product = allProducts.find((p) => String(p.id) === String(productId));
        const item = cart.find((i) => String(i.id) === String(productId));

        if (!item || !product) return;

        const newQty = item.quantity + delta;

        if (newQty <= 0) {
          cart = cart.filter((i) => String(i.id) !== String(productId));
        } else if (newQty > product.raktarkeszlet) {
          alert("Nincs több raktáron!");
        } else {
          item.quantity = newQty;
        }

        saveCart();
        updateCartUI();
      }

      
      function updateCartUI() {
        cartItemsContainer.innerHTML = "";
        let total = 0;
        let itemCount = 0;

        if (cart.length === 0) {
          cartItemsContainer.innerHTML = '<p style="text-align:center; color:#888; margin-top:20px;">A kosarad jelenleg üres.</p>';
        }

        cart.forEach((item) => {
          total += item.ar * item.quantity;
          itemCount += item.quantity;

          const cartItemHTML = `
            <div class="cart-item">
                <img src="${item.kep_url}" onerror="this.src='https://via.placeholder.com/80?text=Kép'">
                <div class="cart-item-info">
                    <h4>${item.nev}</h4>
                    <p>${item.ar.toLocaleString("hu-HU")} Ft</p>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="changeQuantity('${item.id}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="changeQuantity('${item.id}', 1)">+</button>
                    </div>
                </div>
            </div>
          `;
          cartItemsContainer.insertAdjacentHTML("beforeend", cartItemHTML);
        });

        cartTotalPrice.innerText = `${total.toLocaleString("hu-HU")} Ft`;
        cartBadge.innerText = itemCount;
      }

      function saveCart() { localStorage.setItem("lessence_cart", JSON.stringify(cart)); }
      function toggleCart() { cartSidebar.classList.toggle("open"); cartOverlay.classList.toggle("active"); }

      
      async function checkout() {
        
        if (!currentUser) {
            alert("A vásárlás befejezéséhez kérlek jelentkezz be!");
            window.location.href = "login.html";
            return;
        }

        if (cart.length === 0) {
          alert("A kosarad üres!");
          return;
        }

        const checkoutBtn = document.querySelector(".btn-checkout");
        checkoutBtn.innerText = "Feldolgozás...";
        checkoutBtn.disabled = true;

        try {
          
          const response = await fetch("http://localhost:3000/parfumok");
          if (!response.ok) throw new Error("Nem sikerült lekérni a termékeket.");
          const currentProducts = await response.json();

          
          for (const item of cart) {
            const product = currentProducts.find((p) => String(p.id) === String(item.id));
            if (!product || product.raktarkeszlet < item.quantity) {
              alert(`Sajnáljuk, a(z) ${item.nev} termékből nincs elegendő készlet.`);
              checkoutBtn.innerText = "Fizetés és Megrendelés";
              checkoutBtn.disabled = false;
              return;
            }
          }

          
          for (const item of cart) {
            const product = currentProducts.find((p) => String(p.id) === String(item.id));
            
            
            const updatedProduct = {
                ...product, 
                raktarkeszlet: product.raktarkeszlet - item.quantity 
            };

            const putResponse = await fetch(`http://localhost:3000/parfumok/${item.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedProduct),
            });

            if (!putResponse.ok) {
              throw new Error(`Hiba a(z) ${item.nev} frissítésekor (PUT).`);
            }
          }

          
          alert("Köszönjük a rendelést! A tranzakció sikeres, a raktárkészlet frissült.");
          cart = [];
          saveCart();
          updateCartUI();
          toggleCart(); 
          await fetchProducts(); 
          
        } catch (error) {
          console.error("Hiba a fizetés során:", error);
          alert("Sajnáljuk, hiba történt a fizetés feldolgozása közben.");
        } finally {
          checkoutBtn.innerText = "Fizetés és Megrendelés";
          checkoutBtn.disabled = false;
        }
    }
      
      const searchInput = document.getElementById("search-input");
      const sortSelect = document.getElementById("sort-select");
      const checkboxes = document.querySelectorAll('.filter-label input[type="checkbox"]');

      function applyFiltersAndSort() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const checkedNotes = Array.from(checkboxes).filter((cb) => cb.checked).map((cb) => cb.value.toLowerCase());
        const sortBy = sortSelect.value;

        let filteredProducts = allProducts.filter((product) => {
          const matchesName = product.nev.toLowerCase().includes(searchTerm);
          let matchesNotes = true;
          if (checkedNotes.length > 0) {
            matchesNotes = checkedNotes.some((note) => product.illatjegy.toLowerCase().includes(note));
          }
          return matchesName && matchesNotes;
        });

        if (sortBy === "price-asc") filteredProducts.sort((a, b) => a.ar - b.ar);
        else if (sortBy === "price-desc") filteredProducts.sort((a, b) => b.ar - a.ar);
        else filteredProducts.sort((a, b) => a.id - b.id);

        renderProducts(filteredProducts);
      }

      searchInput.addEventListener("input", applyFiltersAndSort);
      sortSelect.addEventListener("change", applyFiltersAndSort);
      checkboxes.forEach((cb) => cb.addEventListener("change", applyFiltersAndSort));

      document.addEventListener("DOMContentLoaded", fetchProducts);