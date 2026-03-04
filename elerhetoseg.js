
      const currentUser = JSON.parse(localStorage.getItem("logged_in_user"));
      const authLink = document.getElementById("auth-link");
      const commentFormArea = document.getElementById("comment-form-area");
      const commentsList = document.getElementById("comments-list");

      
      if (currentUser) {
        authLink.innerText = "Kijelentkezés";
        authLink.href = "#";
        authLink.onclick = (e) => {
          e.preventDefault();
          localStorage.removeItem("logged_in_user");
          window.location.reload();
        };

        
        commentFormArea.innerHTML = `
          <div class="comment-form-container">
            <h3>Írja meg véleményét, ${currentUser.nev}!</h3>
            <form id="new-comment-form">
              <div class="form-group">
                <label for="rating">Értékelés (1-5 csillag)</label>
                <select id="rating" required>
                  <option value="5">⭐⭐⭐⭐⭐ (Kiváló)</option>
                  <option value="4">⭐⭐⭐⭐ (Jó)</option>
                  <option value="3">⭐⭐⭐ (Átlagos)</option>
                  <option value="2">⭐⭐ (Gyenge)</option>
                  <option value="1">⭐ (Rossz)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="comment-text">Az Ön véleménye</label>
                <textarea id="comment-text" rows="4" required placeholder="Ossza meg velünk tapasztalatait..."></textarea>
              </div>
              <button type="submit" class="btn btn-gold">Küldés</button>
            </form>
          </div>
        `;

        
        document.getElementById("new-comment-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          const text = document.getElementById("comment-text").value;
          const rating = parseInt(document.getElementById("rating").value);

          const newComment = {
            parfum_id: 0, 
            felhasznalo_nev: currentUser.nev,
            ertekeles: rating,
            szoveg: text
          };

          try {
            const response = await fetch("http://localhost:3000/kommentek", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newComment)
            });

            if (response.ok) {
              document.getElementById("comment-text").value = "";
              fetchComments(); 
            } else {
              throw new Error("Hiba a mentéskor");
            }
          } catch (error) {
            console.error("Hiba a komment elküldésekor:", error);
            alert("Sajnos nem sikerült elküldeni a véleményt.");
          }
        });

      } else {
        
        commentFormArea.innerHTML = `
          <div class="login-prompt">
            <p>Vélemény írásához kérjük, <a href="login.html" style="color: var(--color-gold); font-weight: bold;">jelentkezzen be</a> fiókjába!</p>
          </div>
        `;
      }

      
      async function fetchComments() {
        try {
          const response = await fetch("http://localhost:3000/kommentek");
          const comments = await response.json();
          renderComments(comments);
        } catch (error) {
          console.error("Hiba a kommentek letöltésekor:", error);
          commentsList.innerHTML = `<p style="text-align: center; color: #c62828;">Nem sikerült betölteni a véleményeket.</p>`;
        }
      }

      
      function renderComments(comments) {
        commentsList.innerHTML = "";

        if (comments.length === 0) {
          commentsList.innerHTML = `<p style="text-align: center; color: #888;">Még nincsenek vélemények. Legyen Ön az első!</p>`;
          return;
        }

        
        comments.reverse().forEach(comment => {
          
          const stars = "★".repeat(comment.ertekeles) + "☆".repeat(5 - comment.ertekeles);
          
          
          let deleteBtnHTML = "";
          if (currentUser && currentUser.nev === comment.felhasznalo_nev) {
            deleteBtnHTML = `
              <div class="delete-btn-container">
                <button class="btn btn-danger" onclick="deleteComment('${comment.id}')">
                  <i class="fas fa-trash"></i> Törlés
                </button>
              </div>
            `;
          }

          const commentHTML = `
            <div class="comment-card">
              <div class="comment-header">
                <span class="comment-author"><i class="fas fa-user-circle"></i> ${comment.felhasznalo_nev}</span>
                <span class="comment-rating">${stars}</span>
              </div>
              <p class="comment-text">${comment.szoveg}</p>
              ${deleteBtnHTML}
            </div>
          `;
          commentsList.insertAdjacentHTML("beforeend", commentHTML);
        });
      }

      
      async function deleteComment(commentId) {
        const confirmDelete = confirm("Biztosan törölni szeretné ezt a véleményt?");
        if (!confirmDelete) return;

        try {
          const response = await fetch(`http://localhost:3000/kommentek/${commentId}`, {
            method: "DELETE"
          });

          if (response.ok) {
            fetchComments(); // Frissítés törlés után
          } else {
            throw new Error("Nem sikerült törölni.");
          }
        } catch (error) {
          console.error("Hiba a törlés során:", error);
          alert("Hiba történt a törlés során.");
        }
      }

      
      document.addEventListener("DOMContentLoaded", fetchComments);
