class PokemonAPI {
  static BASE_URL = "https://pokeapi.co/api/v2/pokemon";

  static async fetchPokemon(id) {
    try {
      const response = await fetch(`${this.BASE_URL}/${id}`);
      if (!response.ok) throw new Error(`Failed to fetch Pokemon ${id}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching Pokemon ${id}:`, error);
      return null;
    }
  }

  static async fetchMultiplePokemon(start, end, onProgress = null) {
    const total = end - start + 1;
    const batchSize = 50;
    const results = [];

    for (let i = start; i <= end; i += batchSize) {
      const batchEnd = Math.min(i + batchSize - 1, end);
      const batchPromises = [];

      for (let j = i; j <= batchEnd; j++) {
        batchPromises.push(this.fetchPokemon(j));
      }

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (onProgress) {
        onProgress(results.length, total);
      }
    }

    return results;
  }
}

class PokemonData {
  static transform(rawPokemon) {
    if (!rawPokemon) return null;

    return {
      id: rawPokemon.id,
      name: rawPokemon.name,
      image:
        rawPokemon.sprites.other["official-artwork"].front_default ||
        rawPokemon.sprites.front_default,
      types: rawPokemon.types.map((type) => type.type.name),
      height: rawPokemon.height,
      weight: rawPokemon.weight,
      stats: rawPokemon.stats.map((stat) => ({
        name: stat.stat.name,
        value: stat.base_stat,
      })),
      abilities: rawPokemon.abilities.map((ability) => ability.ability.name),
      baseExperience: rawPokemon.base_experience,
    };
  }

  static formatStatName(statName) {
    const statMapping = {
      hp: "HP",
      attack: "Attack",
      defense: "Defense",
      "special-attack": "Sp. Atk",
      "special-defense": "Sp. Def",
      speed: "Speed",
    };
    return statMapping[statName] || statName;
  }

  static formatAbilityName(ability) {
    return ability
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
}

class PokemonCard {
  static create(pokemon) {
    const card = document.createElement("div");
    card.className = "pokemon-card";
    card.setAttribute("data-pokemon-id", pokemon.id);
    card.setAttribute("data-animate", "true");

    const primaryType = pokemon.types[0];
    const secondaryType = pokemon.types[1];

    card.innerHTML = `
      <div class="pokemon-image-container">
        <div class="pokemon-id">#${pokemon.id.toString().padStart(3, "0")}</div>
        <img
          src="${pokemon.image}"
          alt="${pokemon.name}"
          class="pokemon-image"
          loading="lazy"
          onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNmMWY1ZjkiLz48dGV4dCB4PSI2MCIgeT0iNjAiIGZpbGw9IiM2NDc0OGIiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'"
        >
      </div>
      <h3 class="pokemon-name">${pokemon.name}</h3>
      <div class="pokemon-types">
        <span class="type-badge type-${primaryType}">${primaryType}</span>
        ${secondaryType ? `<span class="type-badge type-${secondaryType}">${secondaryType}</span>` : ""}
      </div>
      <div class="pokemon-stats-preview">
        <div class="stat-item">
          <div class="stat-label">HP</div>
          <div class="stat-value">${pokemon.stats.find((s) => s.name === "hp").value}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">ATK</div>
          <div class="stat-value">${pokemon.stats.find((s) => s.name === "attack").value}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">DEF</div>
          <div class="stat-value">${pokemon.stats.find((s) => s.name === "defense").value}</div>
        </div>
      </div>
    `;

    return card;
  }
}

class PokemonModal {
  constructor() {
    this.backdrop = document.getElementById("modalBackdrop");
    this.container = document.getElementById("modalContainer");
    this.body = document.getElementById("modalBody");
    this.closeBtn = document.getElementById("modalClose");
    this.currentPokemon = null;

    this.bindEvents();
  }

  bindEvents() {
    this.closeBtn.addEventListener("click", () => this.close());
    this.backdrop.addEventListener("click", (e) => {
      if (e.target === this.backdrop) this.close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen()) this.close();
    });
  }

  isOpen() {
    return this.backdrop.classList.contains("active");
  }

  open(pokemon) {
    this.currentPokemon = pokemon;
    this.body.innerHTML = this.createContent(pokemon);
    this.backdrop.classList.add("active");
    document.body.style.overflow = "hidden";

    setTimeout(() => this.animateStats(), 300);
  }

  close() {
    this.backdrop.classList.remove("active");
    document.body.style.overflow = "";
    this.currentPokemon = null;
  }

  createContent(pokemon) {
    const primaryType = pokemon.types[0];
    const typesHtml = pokemon.types
      .map((type) => `<span class="type-badge type-${type}">${type}</span>`)
      .join("");

    const statsHtml = pokemon.stats
      .map((stat) => {
        const percentage = Math.min((stat.value / 200) * 100, 100);
        return `
          <div class="stat-bar">
            <div class="stat-name">${PokemonData.formatStatName(stat.name)}</div>
            <div class="stat-progress">
              <div class="stat-fill" data-width="${percentage}%"></div>
            </div>
            <div class="stat-number">${stat.value}</div>
          </div>
        `;
      })
      .join("");

    const abilitiesHtml = pokemon.abilities
      .map(
        (ability) =>
          `<span class="type-badge type-${primaryType}">${PokemonData.formatAbilityName(ability)}</span>`,
      )
      .join("");

    return `
      <div class="modal-pokemon-header">
        <img
          src="${pokemon.image}"
          alt="${pokemon.name}"
          class="modal-pokemon-image"
          onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMWY1ZjkiLz48dGV4dCB4PSIxMDAiIHk9IjEwMCIgZmlsbD0iIzY0NzQ4YiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='"
        >
        <h2 class="modal-pokemon-name">${pokemon.name}</h2>
        <div class="pokemon-types">${typesHtml}</div>
      </div>

      <div class="modal-pokemon-info">
        <div class="info-section">
          <h3><i class="fas fa-chart-bar"></i> Base Stats</h3>
          <div class="pokemon-stats">${statsHtml}</div>
        </div>

        <div class="info-section">
          <h3><i class="fas fa-info-circle"></i> Details</h3>
          <div class="pokemon-details">
            <div class="detail-item">
              <strong>Height:</strong> ${(pokemon.height / 10).toFixed(1)} m
            </div>
            <div class="detail-item">
              <strong>Weight:</strong> ${(pokemon.weight / 10).toFixed(1)} kg
            </div>
            <div class="detail-item">
              <strong>Base Experience:</strong> ${pokemon.baseExperience || "Unknown"}
            </div>
            <div class="detail-item">
              <strong>Abilities:</strong>
              <div class="abilities-container">
                ${abilitiesHtml}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  animateStats() {
    const statFills = this.body.querySelectorAll(".stat-fill");
    statFills.forEach((fill, index) => {
      setTimeout(() => {
        const width = fill.getAttribute("data-width");
        fill.style.width = width;
      }, index * 100);
    });
  }
}

class PokemonFilter {
  constructor(pokemon = []) {
    this.allPokemon = pokemon;
    this.filteredPokemon = [...pokemon];
    this.searchTerm = "";
    this.selectedType = "";
  }

  updatePokemon(pokemon) {
    this.allPokemon = pokemon;
    this.applyFilters();
  }

  setSearchTerm(term) {
    this.searchTerm = term.toLowerCase().trim();
    this.applyFilters();
  }

  setType(type) {
    this.selectedType = type;
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.allPokemon];

    if (this.searchTerm) {
      filtered = filtered.filter(
        (pokemon) =>
          pokemon.name.toLowerCase().includes(this.searchTerm) ||
          pokemon.id.toString().includes(this.searchTerm) ||
          pokemon.types.some((type) => type.toLowerCase().includes(this.searchTerm)),
      );
    }

    if (this.selectedType) {
      filtered = filtered.filter((pokemon) => pokemon.types.includes(this.selectedType));
    }

    this.filteredPokemon = filtered;
    return this.filteredPokemon;
  }

  getFiltered() {
    return this.filteredPokemon;
  }
}

class PokemonGrid {
  constructor(container) {
    this.container = container;
    this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
      threshold: 0.1,
      rootMargin: "50px",
    });
    this.itemsPerPage = 24;
    this.currentPage = 1;
    this.totalPages = 1;
    this.allPokemon = [];
    this.displayedItems = 0;
  }

  setPagination(pokemon) {
    this.allPokemon = pokemon;
    this.totalPages = Math.ceil(pokemon.length / this.itemsPerPage);
    this.currentPage = 1;
    this.displayedItems = 0;
  }

  render(pokemon) {
    this.setPagination(pokemon);
    this.displayedItems = 0;
    this.renderInitial();
  }

  renderInitial() {
    this.container.innerHTML = "";
    this.loadMore();
  }

  loadMore() {
    const startIndex = this.displayedItems;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.allPokemon.length);
    const newItems = this.allPokemon.slice(startIndex, endIndex);

    newItems.forEach((poke, index) => {
      const card = PokemonCard.create(poke);
      card.style.animationDelay = `${(this.displayedItems + index) * 0.02}s`;
      this.container.appendChild(card);
      this.observer.observe(card);
    });

    this.displayedItems = endIndex;
    return this.hasMoreItems();
  }

  hasMoreItems() {
    return this.displayedItems < this.allPokemon.length;
  }

  getLoadMoreInfo() {
    return {
      displayed: this.displayedItems,
      total: this.allPokemon.length,
      hasMore: this.hasMoreItems(),
    };
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.renderPage();
      return true;
    }
    return false;
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderPage();
      return true;
    }
    return false;
  }

  renderPage() {
    this.container.innerHTML = "";

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.allPokemon.length);
    const pageItems = this.allPokemon.slice(startIndex, endIndex);

    pageItems.forEach((poke, index) => {
      const card = PokemonCard.create(poke);
      card.style.animationDelay = `${index * 0.05}s`;
      this.container.appendChild(card);
      this.observer.observe(card);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  getCurrentPageInfo() {
    return {
      current: this.currentPage,
      total: this.totalPages,
      hasNext: this.currentPage < this.totalPages,
      hasPrev: this.currentPage > 1,
    };
  }

  handleIntersection(entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = "running";
        this.observer.unobserve(entry.target);
      }
    });
  }

  addClickListener(callback) {
    this.container.addEventListener("click", (e) => {
      const card = e.target.closest(".pokemon-card");
      if (card) {
        const pokemonId = parseInt(card.getAttribute("data-pokemon-id"));
        callback(pokemonId);

        card.style.transform = "scale(0.98)";
        setTimeout(() => {
          card.style.transform = "";
        }, 150);
      }
    });
  }
}

class LoadingManager {
  constructor() {
    this.container = document.getElementById("loadingContainer");
    this.progressFill = document.getElementById("progressFill");
    this.progressText = document.getElementById("progressText");
  }

  show() {
    this.container.classList.remove("hidden");
  }

  hide() {
    this.container.classList.add("hidden");
  }

  updateProgress(current, total) {
    const percentage = (current / total) * 100;
    this.progressFill.style.width = `${percentage}%`;
    this.progressText.textContent = `${current} / ${total}`;
  }
}

class LoadMoreManager {
  constructor() {
    this.container = document.getElementById("loadMoreContainer");
    this.btn = document.getElementById("loadMoreBtn");
    this.info = document.getElementById("loadMoreInfo");

    this.bindEvents();
  }

  bindEvents() {
    this.btn.addEventListener("click", () => {
      if (this.onLoadMore) this.onLoadMore();
    });
  }

  show() {
    this.container.classList.remove("hidden");
  }

  hide() {
    this.container.classList.add("hidden");
  }

  update(loadInfo) {
    this.info.textContent = `Showing ${loadInfo.displayed} of ${loadInfo.total}`;

    if (!loadInfo.hasMore) {
      this.hide();
    }
  }

  onLoadMore = null;
}

class Pokedex {
  constructor() {
    this.pokemon = [];
    this.filter = new PokemonFilter();
    this.modal = new PokemonModal();
    this.grid = new PokemonGrid(document.getElementById("pokemonGrid"));
    this.loading = new LoadingManager();
    this.loadMoreManager = new LoadMoreManager();

    this.searchInput = document.getElementById("searchInput");
    this.dropdownTrigger = document.getElementById("dropdownTrigger");
    this.dropdownMenu = document.getElementById("dropdownMenu");
    this.dropdownValue = this.dropdownTrigger.querySelector(".dropdown-value");

    this.init();
  }

  initCustomDropdown() {
    this.currentFocusIndex = -1;
    this.dropdownItems = this.dropdownMenu.querySelectorAll(".dropdown-item");

    this.dropdownTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    this.dropdownTrigger.addEventListener("keydown", (e) => {
      this.handleDropdownKeydown(e);
    });

    this.dropdownMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      const item = e.target.closest(".dropdown-item");
      if (item) {
        this.selectDropdownItem(item);
      }
    });

    this.dropdownMenu.addEventListener("keydown", (e) => {
      this.handleDropdownKeydown(e);
    });

    document.addEventListener("click", () => {
      this.closeDropdown();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeDropdown();
      }
    });

    this.dropdownTrigger.setAttribute("tabindex", "0");
    this.dropdownTrigger.setAttribute("role", "combobox");
    this.dropdownTrigger.setAttribute("aria-expanded", "false");
    this.dropdownTrigger.setAttribute("aria-haspopup", "listbox");
    this.dropdownMenu.setAttribute("role", "listbox");

    this.dropdownItems.forEach((item, index) => {
      item.setAttribute("role", "option");
      item.setAttribute("tabindex", "-1");
    });
  }

  toggleDropdown() {
    const isOpen = this.dropdownMenu.classList.contains("open");
    if (isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown() {
    this.dropdownMenu.classList.add("open");
    this.dropdownTrigger.classList.add("active");
    this.dropdownTrigger.setAttribute("aria-expanded", "true");
    this.currentFocusIndex = -1;
  }

  closeDropdown() {
    this.dropdownMenu.classList.remove("open");
    this.dropdownTrigger.classList.remove("active");
    this.dropdownTrigger.setAttribute("aria-expanded", "false");
    this.currentFocusIndex = -1;
    this.clearFocus();
  }

  selectDropdownItem(item) {
    const value = item.getAttribute("data-value");
    const text = item.textContent;

    this.dropdownMenu.querySelectorAll(".dropdown-item").forEach((el) => {
      el.classList.remove("active");
    });
    item.classList.add("active");

    this.dropdownValue.textContent = text;
    this.handleTypeFilter(value);
    this.closeDropdown();
  }

  handleDropdownKeydown(e) {
    const isOpen = this.dropdownMenu.classList.contains("open");

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (!isOpen) {
          this.openDropdown();
        } else if (this.currentFocusIndex >= 0) {
          this.selectDropdownItem(this.dropdownItems[this.currentFocusIndex]);
        }
        break;

      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          this.openDropdown();
        } else {
          this.focusNextItem();
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        if (isOpen) {
          this.focusPreviousItem();
        }
        break;

      case "Escape":
        if (isOpen) {
          e.preventDefault();
          this.closeDropdown();
          this.dropdownTrigger.focus();
        }
        break;

      case "Home":
        if (isOpen) {
          e.preventDefault();
          this.focusFirstItem();
        }
        break;

      case "End":
        if (isOpen) {
          e.preventDefault();
          this.focusLastItem();
        }
        break;
    }
  }

  focusNextItem() {
    this.currentFocusIndex = Math.min(this.currentFocusIndex + 1, this.dropdownItems.length - 1);
    this.updateFocus();
  }

  focusPreviousItem() {
    this.currentFocusIndex = Math.max(this.currentFocusIndex - 1, 0);
    this.updateFocus();
  }

  focusFirstItem() {
    this.currentFocusIndex = 0;
    this.updateFocus();
  }

  focusLastItem() {
    this.currentFocusIndex = this.dropdownItems.length - 1;
    this.updateFocus();
  }

  updateFocus() {
    this.clearFocus();
    if (this.currentFocusIndex >= 0 && this.currentFocusIndex < this.dropdownItems.length) {
      const focusedItem = this.dropdownItems[this.currentFocusIndex];
      focusedItem.classList.add("focused");
      focusedItem.setAttribute("aria-selected", "true");
      focusedItem.scrollIntoView({ block: "nearest" });
    }
  }

  clearFocus() {
    this.dropdownItems.forEach((item) => {
      item.classList.remove("focused");
      item.setAttribute("aria-selected", "false");
    });
  }

  async init() {
    this.bindEvents();
    this.loading.show();

    try {
      await this.loadPokemon();
      this.filter.updatePokemon(this.pokemon);
      this.renderGrid();
    } catch (error) {
      console.error("Failed to initialize Pokedex:", error);
      this.showError("Failed to load Pokemon data. Please refresh the page.");
    } finally {
      this.loading.hide();
    }
  }

  bindEvents() {
    this.searchInput.addEventListener(
      "input",
      this.debounce((e) => this.handleSearch(e.target.value), 300),
    );

    this.initCustomDropdown();

    this.grid.addClickListener((pokemonId) => {
      const pokemon = this.pokemon.find((p) => p.id === pokemonId);
      if (pokemon) this.modal.open(pokemon);
    });

    this.loadMoreManager.onLoadMore = () => {
      if (this.grid.loadMore()) {
        this.updateLoadMoreInfo();
      }
    };
  }

  async loadPokemon() {
    const rawPokemon = await PokemonAPI.fetchMultiplePokemon(1, 386, (current, total) => {
      this.loading.updateProgress(current, total);
    });

    this.pokemon = rawPokemon
      .map(PokemonData.transform)
      .filter((pokemon) => pokemon !== null)
      .sort((a, b) => a.id - b.id);
  }

  handleSearch(query) {
    this.filter.setSearchTerm(query);
    this.renderGrid();
  }

  handleTypeFilter(type) {
    this.filter.setType(type);
    this.renderGrid();
  }

  renderGrid() {
    const filtered = this.filter.getFiltered();
    this.grid.render(filtered);
    this.updateLoadMoreInfo();
  }

  updateLoadMoreInfo() {
    const loadInfo = this.grid.getLoadMoreInfo();
    this.loadMoreManager.update(loadInfo);

    if (loadInfo.hasMore) {
      this.loadMoreManager.show();
    }
  }

  showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.innerHTML = `
      <div style="text-align: center; padding: 40px; color: hsl(var(--muted-foreground));">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; color: hsl(var(--destructive));"></i>
        <p>${message}</p>
      </div>
    `;

    const container = document.getElementById("pokemonGrid");
    container.innerHTML = "";
    container.appendChild(errorDiv);
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new Pokedex();
});

window.addEventListener("beforeunload", () => {
  document.body.style.overflow = "";
});
