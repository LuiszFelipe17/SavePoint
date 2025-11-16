(function () {
    async function getSession() {
      const r = await fetch('../api/me_v2.php', { credentials: 'same-origin' });
      try { return await r.json(); } catch { return { ok:false }; }
    }
  
    function getStoredUser() {
      try {
        const raw = localStorage.getItem('sp_user');
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    }
  
    function setUsername(name) {
      const el = document.getElementById('sp-username');
      if (el) el.textContent = name || 'Jogador';
    }
  
    function setAvatar(name, url) {
      const box = document.getElementById('sp-avatar');
      if (!box) return;
  
      if (url) {
        box.innerHTML = '';
        const img = document.createElement('img');
        img.alt = 'avatar';
        img.src = url;
        box.appendChild(img);
        return;
      }
      const initials = (name || 'J').trim().split(/\s+/).map(w => w[0]?.toUpperCase()).slice(0,2).join('') || 'J';
      box.textContent = initials;
    }
  
    async function ensureAuth() {
      const cached = getStoredUser();
      if (cached) {
        setUsername(cached.display_name || cached.username || cached.email || 'Jogador');
        setAvatar(cached.display_name || cached.username || cached.email, cached.avatar_url);
      }

      const me = await getSession();
      if (!me || me.ok !== true || me.authenticated !== true) {
        localStorage.removeItem('sp_user');
        window.location.href = '../login/';
        return;
      }

      // Atualizar com dados frescos da API
      const displayName = me.display_name || me.username || me.email || 'Jogador';
      setUsername(displayName);
      setAvatar(displayName, me.avatar_url);

      // Mostrar card de modo professor se for professor, ou card de ativar se não for
      if (me.is_teacher) {
        const teacherCard = document.getElementById('teacher-mode-card');
        if (teacherCard) {
          teacherCard.style.display = 'block';
        }
      } else {
        const becomeTeacherCard = document.getElementById('become-teacher-card');
        if (becomeTeacherCard) {
          becomeTeacherCard.style.display = 'block';
        }
      }

      // Salvar no localStorage para próxima vez
      try {
        localStorage.setItem('sp_user', JSON.stringify({
          user_id: me.user_id,
          username: me.username,
          display_name: me.display_name,
          avatar_url: me.avatar_url,
          is_teacher: me.is_teacher
        }));
      } catch(e) {}
    }
  
    function bindLogout() {
      const btn = document.getElementById('sp-logout');
      if (!btn) return;
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await fetch('../api/logout.php', { method: 'POST', credentials: 'same-origin' });
        } catch {}
        localStorage.removeItem('sp_user');
        window.location.href = '../login/';
      });
    }

    function bindActivateTeacher() {
      const btn = document.getElementById('activate-teacher-btn');
      if (!btn) return;

      btn.addEventListener('click', async () => {
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ativando...';

        try {
          const res = await fetch('../api/teacher/become_teacher.php', {
            method: 'POST',
            credentials: 'same-origin'
          });
          const data = await res.json();

          if (data.ok) {
            // Atualizar localStorage
            const stored = getStoredUser();
            if (stored) {
              stored.is_teacher = true;
              try {
                localStorage.setItem('sp_user', JSON.stringify(stored));
              } catch(e) {}
            }

            // Esconder card de ativar e mostrar card de professor
            const becomeCard = document.getElementById('become-teacher-card');
            const teacherCard = document.getElementById('teacher-mode-card');
            if (becomeCard) becomeCard.style.display = 'none';
            if (teacherCard) teacherCard.style.display = 'block';

            // Mostrar mensagem de sucesso
            showSuccessMessage('Modo Professor ativado com sucesso! Agora você pode criar turmas e gerenciar alunos.');
          } else {
            alert(data.error || 'Erro ao ativar modo professor');
            btn.disabled = false;
            btn.innerHTML = originalText;
          }
        } catch(err) {
          console.error('[Dashboard] Erro ao ativar modo professor:', err);
          alert('Erro ao ativar modo professor. Tente novamente.');
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      });
    }

    function showSuccessMessage(message) {
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 20px 30px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(16, 185, 129, 0.3);
        z-index: 10000;
        max-width: 400px;
        font-size: 15px;
        font-weight: 500;
        animation: slideInRight 0.4s ease;
      `;
      toast.innerHTML = `<i class="fas fa-check-circle" style="margin-right: 10px;"></i>${message}`;

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => toast.remove(), 400);
      }, 4000);
    }

    ensureAuth();
    bindLogout();
    bindActivateTeacher();
    loadStudentChallenges(); // FASE 4: Carregar desafios do aluno
  })();

// ============================================================================
// FASE 4: STUDENT CHALLENGES
// ============================================================================

let studentChallenges = [];

/**
 * Carregar desafios do aluno
 */
async function loadStudentChallenges() {
  try {
    const res = await fetch('../api/student/my_challenges.php', {
      credentials: 'same-origin'
    });
    const data = await res.json();

    if (!data.ok) {
      console.log('[Challenges] Não foi possível carregar desafios (esperado se não houver desafios)');
      return;
    }

    studentChallenges = data.challenges || [];

    // Atualizar card do dashboard
    updateChallengesCard();

  } catch (err) {
    console.error('[Challenges] Erro ao carregar desafios:', err);
  }
}

/**
 * Atualizar card de desafios no dashboard
 */
function updateChallengesCard() {
  const card = document.getElementById('my-challenges-card');
  const summary = document.getElementById('challenges-summary');

  if (!card || !summary) return;

  const pending = studentChallenges.filter(c => c.participation_status === 'invited').length;
  const active = studentChallenges.filter(c => c.can_play_now).length;
  const completed = studentChallenges.filter(c => c.participation_status === 'completed').length;

  if (studentChallenges.length === 0) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';

  let summaryText = '';
  if (pending > 0) {
    summaryText = `Você tem ${pending} convite${pending > 1 ? 's' : ''} pendente${pending > 1 ? 's' : ''}! `;
  }
  if (active > 0) {
    summaryText += `${active} desafio${active > 1 ? 's' : ''} ativo${active > 1 ? 's' : ''}. `;
  }
  if (completed > 0) {
    summaryText += `${completed} completado${completed > 1 ? 's' : ''}.`;
  }

  if (!summaryText) {
    summaryText = `Você tem ${studentChallenges.length} desafio${studentChallenges.length > 1 ? 's' : ''}.`;
  }

  summary.textContent = summaryText;
}

/**
 * Abrir modal de desafios
 */
function openChallengesModal() {
  const modal = document.getElementById('challenges-modal');
  modal.style.display = 'flex';

  renderStudentChallenges();
}

/**
 * Renderizar lista de desafios do estudante
 */
function renderStudentChallenges() {
  const container = document.getElementById('challenges-modal-body');

  if (studentChallenges.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #6b7280;">
        <i class="fas fa-trophy" style="font-size: 48px; margin-bottom: 15px;"></i>
        <p>Você ainda não tem desafios.</p>
      </div>
    `;
    return;
  }

  // Agrupar por status
  const invited = studentChallenges.filter(c => c.participation_status === 'invited');
  const accepted = studentChallenges.filter(c => c.participation_status === 'accepted' || c.can_play_now);
  const completed = studentChallenges.filter(c => c.participation_status === 'completed');
  const declined = studentChallenges.filter(c => c.participation_status === 'declined');

  let html = '';

  // Convites Pendentes
  if (invited.length > 0) {
    html += `
      <div style="margin-bottom: 30px;">
        <h3 style="font-size: 18px; color: #f59e0b; margin-bottom: 15px;">
          <i class="fas fa-envelope"></i> Convites Pendentes (${invited.length})
        </h3>
        <div style="display: grid; gap: 15px;">
          ${invited.map(c => renderChallengeCard(c, 'invited')).join('')}
        </div>
      </div>
    `;
  }

  // Desafios Ativos
  if (accepted.length > 0) {
    html += `
      <div style="margin-bottom: 30px;">
        <h3 style="font-size: 18px; color: #10b981; margin-bottom: 15px;">
          <i class="fas fa-play-circle"></i> Desafios Ativos (${accepted.length})
        </h3>
        <div style="display: grid; gap: 15px;">
          ${accepted.map(c => renderChallengeCard(c, 'active')).join('')}
        </div>
      </div>
    `;
  }

  // Desafios Completados
  if (completed.length > 0) {
    html += `
      <div style="margin-bottom: 30px;">
        <h3 style="font-size: 18px; color: #6b7280; margin-bottom: 15px;">
          <i class="fas fa-check-circle"></i> Completados (${completed.length})
        </h3>
        <div style="display: grid; gap: 15px;">
          ${completed.map(c => renderChallengeCard(c, 'completed')).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  // Bind event listeners
  studentChallenges.forEach(c => {
    const acceptBtn = document.getElementById(`accept-${c.id}`);
    const declineBtn = document.getElementById(`decline-${c.id}`);
    const playBtn = document.getElementById(`play-${c.id}`);

    if (acceptBtn) acceptBtn.addEventListener('click', () => acceptChallenge(c.id));
    if (declineBtn) declineBtn.addEventListener('click', () => declineChallenge(c.id));
    if (playBtn) playBtn.addEventListener('click', () => playChallenge(c));
  });
}

/**
 * Renderizar card de desafio individual
 */
function renderChallengeCard(challenge, type) {
  // BUG FIX #7: URLs removidas - não mais necessário, usa game_code dinamicamente
  let actionsHtml = '';

  if (type === 'invited') {
    actionsHtml = `
      <button id="accept-${challenge.id}" style="flex: 1; padding: 10px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
        <i class="fas fa-check"></i> Aceitar
      </button>
      <button id="decline-${challenge.id}" style="flex: 1; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
        <i class="fas fa-times"></i> Recusar
      </button>
    `;
  } else if (type === 'active' && challenge.can_play_now) {
    actionsHtml = `
      <button id="play-${challenge.id}" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 16px;">
        <i class="fas fa-gamepad"></i> Jogar Agora!
      </button>
    `;
  } else if (type === 'active') {
    actionsHtml = `
      <div style="padding: 10px; background: #dbeafe; color: #1e40af; border-radius: 8px; text-align: center; font-size: 14px;">
        <i class="fas fa-clock"></i> Aguardando início...
      </div>
    `;
  } else if (type === 'completed') {
    actionsHtml = `
      <div style="padding: 10px; background: #d1fae5; color: #065f46; border-radius: 8px; text-align: center; font-weight: 600;">
        <i class="fas fa-trophy"></i> Rank #${challenge.rank || '?'} • ${challenge.score || 0} pontos
      </div>
    `;
  }

  return `
    <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 5px solid ${type === 'invited' ? '#f59e0b' : type === 'active' ? '#10b981' : '#6b7280'};">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
        <div>
          <div style="font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 5px;">${escapeHtml(challenge.title)}</div>
          <div style="font-size: 14px; color: #6b7280;">
            <i class="fas fa-gamepad"></i> ${escapeHtml(challenge.game_name)} •
            <i class="fas fa-user"></i> ${escapeHtml(challenge.teacher_name)}
          </div>
        </div>
        ${challenge.difficulty ? `<span style="background: #e0e7ff; color: #3730a3; padding: 5px 12px; border-radius: 15px; font-size: 12px; font-weight: 600;">${challenge.difficulty.toUpperCase()}</span>` : ''}
      </div>

      <div style="display: flex; gap: 15px; margin-bottom: 15px; font-size: 14px; color: #6b7280;">
        <div><i class="fas fa-clock"></i> ${challenge.duration_minutes} min</div>
        <div><i class="fas fa-calendar"></i> ${challenge.starts_at_formatted}</div>
        ${challenge.class_name ? `<div><i class="fas fa-users"></i> ${escapeHtml(challenge.class_name)}</div>` : ''}
      </div>

      ${challenge.description ? `<p style="margin-bottom: 15px; color: #6b7280; font-size: 14px;">${escapeHtml(challenge.description)}</p>` : ''}

      <div style="display: flex; gap: 10px;">
        ${actionsHtml}
      </div>
    </div>
  `;
}

/**
 * Aceitar desafio
 */
async function acceptChallenge(challengeId) {
  try {
    const res = await fetch('../api/challenge/accept.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge_id: challengeId })
    });

    const data = await res.json();

    if (!data.ok) {
      alert('Erro: ' + (data.error || 'Não foi possível aceitar o desafio'));
      return;
    }

    alert('Desafio aceito! Prepare-se!');
    await loadStudentChallenges();
    renderStudentChallenges();
  } catch (err) {
    console.error('[Challenges] Erro ao aceitar desafio:', err);
    alert('Erro ao aceitar desafio. Tente novamente.');
  }
}

/**
 * Recusar desafio
 */
async function declineChallenge(challengeId) {
  if (!confirm('Tem certeza que deseja recusar este desafio?')) {
    return;
  }

  try {
    const res = await fetch('../api/challenge/decline.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge_id: challengeId })
    });

    const data = await res.json();

    if (!data.ok) {
      alert('Erro: ' + (data.error || 'Não foi possível recusar o desafio'));
      return;
    }

    alert('Desafio recusado');
    await loadStudentChallenges();
    renderStudentChallenges();
  } catch (err) {
    console.error('[Challenges] Erro ao recusar desafio:', err);
    alert('Erro ao recusar desafio. Tente novamente.');
  }
}

/**
 * Jogar desafio
 */
function playChallenge(challenge) {
  // Salvar desafio no localStorage para o jogo detectar
  localStorage.setItem('active_challenge', JSON.stringify({
    id: challenge.id,
    title: challenge.title,
    game_id: challenge.game_id,
    difficulty: challenge.difficulty,
    ends_at: challenge.ends_at
  }));

  // BUG FIX #7: Construir URL dinamicamente usando game_code da API
  if (challenge.game_code) {
    window.location.href = `../${challenge.game_code}/`;
  } else {
    alert('Erro: Código do jogo não encontrado');
    console.error('Challenge sem game_code:', challenge);
  }
}

/**
 * Escape HTML para segurança
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event Listeners
document.getElementById('view-challenges-btn')?.addEventListener('click', openChallengesModal);

document.getElementById('close-challenges-modal')?.addEventListener('click', () => {
  document.getElementById('challenges-modal').style.display = 'none';
});

// Fechar modal ao clicar no overlay
document.querySelector('#challenges-modal .modal-overlay')?.addEventListener('click', () => {
  document.getElementById('challenges-modal').style.display = 'none';
});
