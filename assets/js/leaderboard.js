(function () {
  let currentGame = 'memory';
  let currentPage = 1;
  const limit = 50;

  const loadingContainer = document.getElementById('loading-container');
  const rankingContainer = document.getElementById('ranking-container');
  const errorMessage = document.getElementById('error-message');
  const gameNameElement = document.getElementById('game-name');
  const totalPlayersElement = document.getElementById('total-players');
  const rankingBody = document.getElementById('ranking-body');
  const paginationContainer = document.getElementById('pagination');
  const pageInfoElement = document.getElementById('page-info');
  const prevButton = document.getElementById('prev-page');
  const nextButton = document.getElementById('next-page');

  // Verificar autenticação
  async function checkAuth() {
    try {
      const res = await fetch('../api/game_auth.php', { credentials: 'same-origin' });
      const data = await res.json();

      if (!data || !data.authenticated) {
        window.location.href = '../login/';
        return false;
      }

      return true;
    } catch (err) {
      console.error('Erro ao verificar autenticação:', err);
      window.location.href = '../login/';
      return false;
    }
  }

  // Buscar ranking
  async function loadRanking(gameCode, page) {
    try {
      loadingContainer.classList.remove('hidden');
      rankingContainer.classList.add('hidden');
      errorMessage.classList.add('hidden');

      const res = await fetch(
        `../api/leaderboard.php?game_code=${gameCode}&page=${page}&limit=${limit}`,
        { credentials: 'same-origin' }
      );

      const data = await res.json();

      if (!data || !data.ok) {
        throw new Error(data.error || 'Erro ao carregar ranking');
      }

      displayRanking(data);

    } catch (err) {
      console.error('Erro ao carregar ranking:', err);
      loadingContainer.classList.add('hidden');
      errorMessage.classList.remove('hidden');
    }
  }

  // Exibir ranking
  function displayRanking(data) {
    loadingContainer.classList.add('hidden');
    rankingContainer.classList.remove('hidden');

    gameNameElement.textContent = data.game_name;
    totalPlayersElement.textContent = `${data.total_players} ${data.total_players === 1 ? 'jogador' : 'jogadores'}`;

    // Limpar tbody
    rankingBody.innerHTML = '';

    if (data.rankings.length === 0) {
      rankingBody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; padding: 40px; color: var(--muted);">
            Nenhum jogador encontrado ainda. Seja o primeiro!
          </td>
        </tr>
      `;
      paginationContainer.classList.add('hidden');
      return;
    }

    // Preencher tabela
    data.rankings.forEach(player => {
      const row = document.createElement('tr');

      // Coluna de posição
      const positionCell = document.createElement('td');
      positionCell.className = 'position-cell';

      if (player.position === 1) {
        positionCell.innerHTML = '<span class="position-medal">🥇</span>';
      } else if (player.position === 2) {
        positionCell.innerHTML = '<span class="position-medal">🥈</span>';
      } else if (player.position === 3) {
        positionCell.innerHTML = '<span class="position-medal">🥉</span>';
      } else {
        positionCell.textContent = player.position;
      }

      // Coluna de jogador
      const playerCell = document.createElement('td');
      playerCell.className = 'player-cell';

      const avatar = createAvatar(player);
      const playerInfo = document.createElement('div');
      playerInfo.className = 'player-info';

      const username = document.createElement('div');
      username.className = 'player-username';
      username.textContent = player.username;

      playerInfo.appendChild(username);

      if (player.display_name && player.display_name !== player.username) {
        const displayName = document.createElement('div');
        displayName.className = 'player-display';
        displayName.textContent = player.display_name;
        playerInfo.appendChild(displayName);
      }

      playerCell.appendChild(avatar);
      playerCell.appendChild(playerInfo);

      // Coluna de pontuação
      const scoreCell = document.createElement('td');
      scoreCell.className = 'score-cell';
      scoreCell.innerHTML = `
        <div>${player.total_score.toLocaleString('pt-BR')}</div>
        <div class="score-points">pontos</div>
      `;

      row.appendChild(positionCell);
      row.appendChild(playerCell);
      row.appendChild(scoreCell);

      rankingBody.appendChild(row);
    });

    // Atualizar paginação
    updatePagination(data);
  }

  // Criar avatar
  function createAvatar(player) {
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'player-avatar';

    if (player.avatar_url) {
      const img = document.createElement('img');
      img.src = player.avatar_url;
      img.alt = player.username;
      avatarDiv.appendChild(img);
    } else {
      // Iniciais do username
      const initials = getInitials(player.username);
      avatarDiv.textContent = initials;
    }

    return avatarDiv;
  }

  // Obter iniciais
  function getInitials(name) {
    if (!name) return 'SP';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Atualizar paginação
  function updatePagination(data) {
    if (data.total_pages <= 1) {
      paginationContainer.classList.add('hidden');
      return;
    }

    paginationContainer.classList.remove('hidden');
    pageInfoElement.textContent = `Página ${data.current_page} de ${data.total_pages}`;

    prevButton.disabled = data.current_page <= 1;
    nextButton.disabled = data.current_page >= data.total_pages;

    currentPage = data.current_page;
  }

  // Alternar entre jogos
  function switchGame(gameCode) {
    if (currentGame === gameCode) return;

    currentGame = gameCode;
    currentPage = 1;

    // Atualizar tabs
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.game === gameCode);
    });

    loadRanking(gameCode, currentPage);
  }

  // Bind events
  function bindEvents() {
    // Tabs
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', () => {
        switchGame(btn.dataset.game);
      });
    });

    // Paginação
    prevButton.addEventListener('click', () => {
      if (currentPage > 1) {
        loadRanking(currentGame, currentPage - 1);
      }
    });

    nextButton.addEventListener('click', () => {
      loadRanking(currentGame, currentPage + 1);
    });

    // Logout
    const logoutBtn = document.getElementById('sp-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        logoutBtn.disabled = true;
        try {
          await fetch('../api/logout.php', { method: 'POST', credentials: 'same-origin' });
        } catch (e) {}
        localStorage.removeItem('sp_user');
        window.location.href = '../login/';
      });
    }
  }

  // Inicialização
  (async function init() {
    const authenticated = await checkAuth();
    if (!authenticated) return;

    bindEvents();
    loadRanking(currentGame, currentPage);
  })();
})();
