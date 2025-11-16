/**
 * SavePoint - Dashboard Professor
 *
 * Gerencia turmas e alunos
 */

let currentClassId = null;
let allClasses = []; // Armazena todas as turmas do professor

/**
 * Escapar HTML para prevenir XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Verificar se usuário é professor
 */
async function checkTeacher() {
    try {
        const res = await fetch('../api/me.php', { credentials: 'same-origin' });
        const data = await res.json();

        if (!data.ok || !data.authenticated) {
            window.location.href = '../login/';
            return false;
        }

        if (!data.is_teacher) {
            alert('Você não tem permissão para acessar esta página.');
            window.location.href = '../dashboard/';
            return false;
        }

        return true;
    } catch (err) {
        console.error('[Teacher] Erro ao verificar professor:', err);
        window.location.href = '../dashboard/';
        return false;
    }
}

/**
 * Carregar turmas do professor
 */
async function loadClasses() {
    const container = document.getElementById('classes-list');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando turmas...</div>';

    try {
        const res = await fetch('../api/teacher/get_classes.php', {
            credentials: 'same-origin'
        });

        const data = await res.json();

        if (data.ok) {
            // Armazenar turmas globalmente para uso nos modais
            allClasses = data.classes || [];

            if (allClasses.length > 0) {
                renderClasses(allClasses);
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users-slash"></i>
                        <h3>Nenhuma turma criada</h3>
                        <p>Crie sua primeira turma usando o formulário acima.</p>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error('[Teacher] Erro ao carregar turmas:', err);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar turmas</p></div>';
    }
}

/**
 * Renderizar turmas na tela
 */
function renderClasses(classes) {
    const container = document.getElementById('classes-list');

    const html = classes.map(cls => `
        <div class="class-card" onclick="openClassModal(${cls.id})">
            <h3><i class="fas fa-school"></i> ${cls.name}</h3>
            ${cls.description ? `<p>${cls.description}</p>` : ''}
            <div class="class-stats">
                <span><i class="fas fa-users"></i> ${cls.student_count} alunos</span>
                ${cls.pending_count > 0 ? `<span><i class="fas fa-clock"></i> ${cls.pending_count} pendentes</span>` : ''}
            </div>
            <div class="class-code">Código: ${cls.code}</div>
        </div>
    `).join('');

    container.innerHTML = html;
}

/**
 * Criar nova turma
 */
document.getElementById('create-class-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    // Desabilitar botão
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';

    const formData = {
        name: form.name.value.trim(),
        description: form.description.value.trim() || null,
        school_year: form.school_year.value.trim() || null
    };

    try {
        const res = await fetch('../api/teacher/create_class.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (data.ok) {
            showToast('Turma criada com sucesso!', 'success');
            form.reset();
            await loadClasses();
        } else {
            showToast(data.error || 'Erro ao criar turma', 'error');
        }
    } catch (err) {
        console.error('[Teacher] Erro ao criar turma:', err);
        showToast('Erro ao criar turma', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

/**
 * Abrir modal de detalhes da turma
 */
async function openClassModal(classId) {
    currentClassId = classId;

    const modal = document.getElementById('class-modal');
    modal.classList.add('active');

    // Carregar detalhes da turma
    await loadClassDetails(classId);
    await loadStudents(classId);
}

/**
 * Carregar detalhes da turma
 */
async function loadClassDetails(classId) {
    try {
        const res = await fetch(`../api/teacher/get_classes.php`, {
            credentials: 'same-origin'
        });

        const data = await res.json();

        if (data.ok) {
            const cls = data.classes.find(c => c.id === classId);
            if (cls) {
                document.getElementById('modal-class-name').textContent = cls.name;
                document.getElementById('modal-class-code').textContent = cls.code;
                document.getElementById('modal-student-count').textContent = cls.student_count;
                document.getElementById('modal-pending-count').textContent = cls.pending_count;
            }
        }
    } catch (err) {
        console.error('[Teacher] Erro ao carregar detalhes da turma:', err);
    }
}

/**
 * Carregar alunos da turma
 */
async function loadStudents(classId) {
    const container = document.getElementById('students-list');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando alunos...</div>';

    try {
        const res = await fetch(`../api/teacher/get_class_students.php?class_id=${classId}`, {
            credentials: 'same-origin'
        });

        const data = await res.json();

        if (data.ok && data.students.length > 0) {
            renderStudents(data.students);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-graduate"></i>
                    <h3>Nenhum aluno ainda</h3>
                    <p>Adicione alunos usando o formulário acima.</p>
                </div>
            `;
        }
    } catch (err) {
        console.error('[Teacher] Erro ao carregar alunos:', err);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar alunos</p></div>';
    }
}

/**
 * Renderizar tabela de alunos
 */
function renderStudents(students) {
    const container = document.getElementById('students-list');

    const html = `
        <table class="students-table">
            <thead>
                <tr>
                    <th>Aluno</th>
                    <th>Status</th>
                    <th>Jogos</th>
                    <th>Pontos</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${students.map(student => `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="student-avatar">
                                    ${student.avatar_url
                                        ? `<img src="${student.avatar_url}" alt="${student.username}">`
                                        : (student.display_name || student.username).charAt(0).toUpperCase()
                                    }
                                </div>
                                <div>
                                    <strong>${student.display_name || student.username}</strong><br>
                                    <small>@${student.username}</small>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span class="status-badge status-${student.status}">
                                ${student.status === 'active' ? 'Ativo' : 'Pendente'}
                            </span>
                        </td>
                        <td>${student.total_games}</td>
                        <td>${student.total_score}</td>
                        <td>
                            ${student.status === 'active'
                                ? `<button class="btn btn-primary btn-sm" onclick="openStudentModal(${student.student_id}, '${(student.display_name || student.username).replace(/'/g, "\\'")}', '${student.username}')" style="margin-right: 5px;">
                                    <i class="fas fa-chart-bar"></i> Detalhes
                                   </button>
                                   <button class="btn btn-danger btn-sm" onclick="removeStudent(${student.student_id})">
                                    <i class="fas fa-trash"></i> Remover
                                   </button>`
                                : '<small>Aguardando resposta</small>'
                            }
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

/**
 * Adicionar aluno à turma
 */
document.getElementById('add-student-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    const usernameInput = form.querySelector('#student-username');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Convidando...';

    const username = usernameInput.value.trim();

    try {
        const res = await fetch('../api/teacher/invite_student.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                class_id: currentClassId,
                username: username
            })
        });

        const data = await res.json();

        if (data.ok) {
            showToast(data.message, 'success');
            form.reset();
            await loadClassDetails(currentClassId);
            await loadStudents(currentClassId);
            await loadClasses(); // Atualizar lista principal
        } else {
            showToast(data.error || 'Erro ao convidar aluno', 'error');
        }
    } catch (err) {
        console.error('[Teacher] Erro ao convidar aluno:', err);
        showToast('Erro ao convidar aluno', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

/**
 * Remover aluno da turma
 */
async function removeStudent(studentId) {
    if (!confirm('Tem certeza que deseja remover este aluno da turma?')) {
        return;
    }

    try {
        const res = await fetch('../api/teacher/remove_student.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                class_id: currentClassId,
                student_id: studentId
            })
        });

        const data = await res.json();

        if (data.ok) {
            showToast(data.message, 'success');
            await loadClassDetails(currentClassId);
            await loadStudents(currentClassId);
            await loadClasses(); // Atualizar lista principal
        } else {
            showToast(data.error || 'Erro ao remover aluno', 'error');
        }
    } catch (err) {
        console.error('[Teacher] Erro ao remover aluno:', err);
        showToast('Erro ao remover aluno', 'error');
    }
}

/**
 * Fechar modal
 */
document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('class-modal').classList.remove('active');
    currentClassId = null;
});

document.querySelector('.modal-overlay').addEventListener('click', () => {
    document.getElementById('class-modal').classList.remove('active');
    currentClassId = null;
});

/**
 * Botão de atualizar turmas
 */
document.getElementById('refresh-classes').addEventListener('click', () => {
    loadClasses();
});

/**
 * Mostrar toast
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * =============================================================================
 * MODAL DE DETALHES DO ALUNO - FASE 2
 * =============================================================================
 */

let currentStudentId = null;
let evolutionChart = null;

/**
 * Abrir modal de detalhes do aluno
 */
async function openStudentModal(studentId, studentName, studentUsername) {
    currentStudentId = studentId;

    const modal = document.getElementById('student-modal');
    modal.classList.add('active');

    document.getElementById('student-modal-name').textContent = studentName || 'Aluno';
    document.getElementById('student-modal-username').textContent = '@' + studentUsername;

    // Ativar primeira aba
    switchTab('stats');

    // Carregar dados
    await loadStudentStats();
}

/**
 * Fechar modal de detalhes do aluno
 */
document.getElementById('close-student-modal').addEventListener('click', () => {
    document.getElementById('student-modal').classList.remove('active');
    currentStudentId = null;

    // Destruir gráfico se existir
    if (evolutionChart) {
        evolutionChart.destroy();
        evolutionChart = null;
    }
});

/**
 * Sistema de tabs
 */
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    // Atualizar botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Atualizar conteúdo
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === 'tab-' + tabName);
    });

    // Carregar dados da aba se necessário
    if (tabName === 'evolution' && !evolutionChart) {
        loadStudentEvolution();
    } else if (tabName === 'preferences') {
        loadStudentPreferences();
    }
}

/**
 * Carregar estatísticas do aluno
 */
async function loadStudentStats() {
    const container = document.getElementById('tab-stats');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando estatísticas...</div>';

    try {
        const res = await fetch(`../api/teacher/student_stats.php?student_id=${currentStudentId}&class_id=${currentClassId}`, {
            credentials: 'same-origin'
        });

        const data = await res.json();

        if (data.ok) {
            renderStudentStats(data);
        } else {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>' + (data.error || 'Erro ao carregar estatísticas') + '</p></div>';
        }
    } catch (err) {
        console.error('[Teacher] Erro ao carregar estatísticas:', err);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar estatísticas</p></div>';
    }
}

/**
 * Renderizar estatísticas do aluno
 */
function renderStudentStats(data) {
    const html = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-gamepad"></i></div>
                <div class="stat-value">${data.general.total_games}</div>
                <div class="stat-label">Jogos Jogados</div>
            </div>
            <div class="stat-card secondary">
                <div class="stat-icon"><i class="fas fa-trophy"></i></div>
                <div class="stat-value">${data.general.total_score.toLocaleString()}</div>
                <div class="stat-label">Pontuação Total</div>
            </div>
            <div class="stat-card tertiary">
                <div class="stat-icon"><i class="fas fa-star"></i></div>
                <div class="stat-value">${data.general.avg_score.toFixed(0)}</div>
                <div class="stat-label">Média por Jogo</div>
            </div>
            <div class="stat-card quaternary">
                <div class="stat-icon"><i class="fas fa-clock"></i></div>
                <div class="stat-value">${data.general.total_duration_formatted}</div>
                <div class="stat-label">Tempo Total</div>
            </div>
        </div>

        <h4 style="margin: 30px 0 15px 0; color: #374151;"><i class="fas fa-chart-pie"></i> Performance por Jogo</h4>
        <table class="game-stats-table">
            <thead>
                <tr>
                    <th>Jogo</th>
                    <th>Partidas</th>
                    <th>Pontuação Total</th>
                    <th>Média</th>
                    <th>Melhor</th>
                </tr>
            </thead>
            <tbody>
                ${data.by_game.map(game => `
                    <tr>
                        <td><strong>${game.game_name}</strong></td>
                        <td>${game.games_played}</td>
                        <td>${game.total_score.toLocaleString()}</td>
                        <td>${game.avg_score.toFixed(0)}</td>
                        <td>${game.best_score}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        ${data.difficulties.length > 0 ? `
            <h4 style="margin: 30px 0 15px 0; color: #374151;"><i class="fas fa-layer-group"></i> Dificuldades</h4>
            <div class="preference-bars">
                ${data.difficulties.map(diff => `
                    <div class="preference-bar-item">
                        <div class="preference-label">${capitalize(diff.difficulty)}</div>
                        <div class="preference-bar-container">
                            <div class="preference-bar-fill" style="width: ${Math.min((diff.count / data.general.total_games) * 100, 100)}%;">
                                <span class="preference-value">${diff.count} jogos</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;

    document.getElementById('tab-stats').innerHTML = html;
}

/**
 * Carregar evolução do aluno
 */
async function loadStudentEvolution() {
    const period = document.getElementById('evolution-period').value || 'day';
    const gameId = document.getElementById('evolution-game').value || '';

    try {
        let url = `../api/teacher/student_evolution.php?student_id=${currentStudentId}&class_id=${currentClassId}&period=${period}`;
        if (gameId) url += `&game_id=${gameId}`;

        const res = await fetch(url, { credentials: 'same-origin' });
        const data = await res.json();

        if (data.ok) {
            renderEvolutionChart(data.evolution);
        } else {
            showToast(data.error || 'Erro ao carregar evolução', 'error');
        }
    } catch (err) {
        console.error('[Teacher] Erro ao carregar evolução:', err);
        showToast('Erro ao carregar evolução', 'error');
    }
}

/**
 * Renderizar gráfico de evolução
 */
function renderEvolutionChart(evolutionData) {
    const canvas = document.getElementById('evolution-chart');
    const ctx = canvas.getContext('2d');

    // Destruir gráfico anterior se existir
    if (evolutionChart) {
        evolutionChart.destroy();
    }

    evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: evolutionData.map(d => d.period),
            datasets: [
                {
                    label: 'Pontuação Média',
                    data: evolutionData.map(d => d.avg_score),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Pontuação Máxima',
                    data: evolutionData.map(d => d.max_score),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: false,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            family: 'Fredoka',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        footer: function(tooltipItems) {
                            const index = tooltipItems[0].dataIndex;
                            return 'Jogos: ' + evolutionData[index].games_played;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            family: 'Fredoka'
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Fredoka'
                        }
                    }
                }
            }
        }
    });
}

// Event listeners para controles do gráfico
document.getElementById('evolution-period').addEventListener('change', loadStudentEvolution);
document.getElementById('evolution-game').addEventListener('change', loadStudentEvolution);

/**
 * Carregar preferências do aluno
 */
async function loadStudentPreferences() {
    const container = document.getElementById('tab-preferences');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando preferências...</div>';

    try {
        const res = await fetch(`../api/teacher/student_preferences.php?student_id=${currentStudentId}&class_id=${currentClassId}`, {
            credentials: 'same-origin'
        });

        const data = await res.json();

        if (data.ok) {
            renderStudentPreferences(data);
        } else {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>' + (data.error || 'Erro ao carregar preferências') + '</p></div>';
        }
    } catch (err) {
        console.error('[Teacher] Erro ao carregar preferências:', err);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar preferências</p></div>';
    }
}

/**
 * Renderizar preferências do aluno
 */
function renderStudentPreferences(data) {
    let html = '';

    // Dificuldades
    if (data.by_difficulty.length > 0) {
        html += `
            <div class="preferences-section">
                <h4><i class="fas fa-layer-group"></i> Distribuição de Dificuldades</h4>
                <div class="preference-bars">
                    ${data.by_difficulty.map(diff => `
                        <div class="preference-bar-item">
                            <div class="preference-label">${capitalize(diff.difficulty)}</div>
                            <div class="preference-bar-container">
                                <div class="preference-bar-fill" style="width: ${diff.percentage}%;">
                                    <span class="preference-value">${diff.percentage}%</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Temas favoritos
    if (data.favorite_themes.length > 0) {
        html += `
            <div class="preferences-section">
                <h4><i class="fas fa-palette"></i> Temas Favoritos (Jogo da Memória)</h4>
                <div class="preference-bars">
                    ${data.favorite_themes.slice(0, 5).map(theme => `
                        <div class="preference-bar-item">
                            <div class="preference-label">${capitalize(theme.theme)}</div>
                            <div class="preference-bar-container">
                                <div class="preference-bar-fill" style="width: ${Math.min((theme.games_played / data.favorite_themes[0].games_played) * 100, 100)}%;">
                                    <span class="preference-value">${theme.games_played} jogos</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Operações favoritas
    if (data.favorite_operations.length > 0) {
        html += `
            <div class="preferences-section">
                <h4><i class="fas fa-calculator"></i> Operações Favoritas (Matemática)</h4>
                <div class="preference-bars">
                    ${data.favorite_operations.slice(0, 5).map(op => `
                        <div class="preference-bar-item">
                            <div class="preference-label">${capitalize(op.operation)}</div>
                            <div class="preference-bar-container">
                                <div class="preference-bar-fill" style="width: ${Math.min((op.games_played / data.favorite_operations[0].games_played) * 100, 100)}%;">
                                    <span class="preference-value">${op.games_played} jogos</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Recomendações
    if (data.recommendations.length > 0) {
        html += `
            <div class="recommendations">
                <h4 style="margin-bottom: 15px; color: #374151;"><i class="fas fa-lightbulb"></i> Recomendações</h4>
                ${data.recommendations.map(rec => `
                    <div class="recommendation-card priority-${rec.priority}">
                        <div class="recommendation-icon">
                            ${getRecommendationIcon(rec.type)}
                        </div>
                        <div class="recommendation-content">
                            <div class="recommendation-type">${rec.type}</div>
                            <div class="recommendation-message">${rec.message}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (html === '') {
        html = '<div class="empty-state"><i class="fas fa-info-circle"></i><p>Dados insuficientes para análise de preferências</p></div>';
    }

    document.getElementById('tab-preferences').innerHTML = html;
}

/**
 * Exportar dados do aluno para CSV
 */
document.getElementById('export-student-data').addEventListener('click', async () => {
    if (!currentStudentId) return;

    try {
        const statsRes = await fetch(`../api/teacher/student_stats.php?student_id=${currentStudentId}&class_id=${currentClassId}`, {
            credentials: 'same-origin'
        });
        const statsData = await statsRes.json();

        if (!statsData.ok) {
            showToast('Erro ao exportar dados', 'error');
            return;
        }

        // Criar CSV
        let csv = 'SavePoint - Relatório do Aluno\n\n';
        csv += `Aluno,${statsData.student.display_name || statsData.student.username}\n`;
        csv += `Username,${statsData.student.username}\n`;
        csv += `Último Login,${statsData.student.last_login || 'N/A'}\n\n`;

        csv += 'ESTATÍSTICAS GERAIS\n';
        csv += `Total de Jogos,${statsData.general.total_games}\n`;
        csv += `Pontuação Total,${statsData.general.total_score}\n`;
        csv += `Pontuação Média,${statsData.general.avg_score}\n`;
        csv += `Melhor Pontuação,${statsData.general.best_score}\n`;
        csv += `Tempo Total,${statsData.general.total_duration_formatted}\n\n`;

        csv += 'PERFORMANCE POR JOGO\n';
        csv += 'Jogo,Partidas,Pontuação Total,Média,Melhor\n';
        statsData.by_game.forEach(game => {
            csv += `${game.game_name},${game.games_played},${game.total_score},${game.avg_score},${game.best_score}\n`;
        });

        // Download do CSV
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `savepoint_aluno_${statsData.student.username}_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Relatório exportado com sucesso!', 'success');
    } catch (err) {
        console.error('[Teacher] Erro ao exportar:', err);
        showToast('Erro ao exportar relatório', 'error');
    }
});

/**
 * Funções auxiliares
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getRecommendationIcon(type) {
    const icons = {
        'challenge': '<i class="fas fa-fire"></i>',
        'growth': '<i class="fas fa-seedling"></i>',
        'variety': '<i class="fas fa-random"></i>',
        'positive': '<i class="fas fa-thumbs-up"></i>'
    };
    return icons[type] || '<i class="fas fa-info-circle"></i>';
}

// ============================================================================
// FASE 4: SISTEMA DE DESAFIOS
// ============================================================================

let allChallenges = [];
let challengeCountdownIntervals = {};

/**
 * Carregar desafios do professor
 */
async function loadChallenges(statusFilter = '', classFilter = '') {
    try {
        let url = '../api/teacher/get_challenges.php?';
        if (statusFilter) url += `status=${statusFilter}&`;
        if (classFilter) url += `class_id=${classFilter}&`;

        const res = await fetch(url, { credentials: 'same-origin' });
        const data = await res.json();

        if (!data.ok) {
            console.error('[Challenges] Erro ao carregar:', data.error);
            return;
        }

        allChallenges = data.challenges || [];
        renderChallenges(allChallenges);

        console.log(`[Challenges] Carregados ${allChallenges.length} desafios`);
    } catch (err) {
        console.error('[Challenges] Erro ao carregar desafios:', err);
        document.getElementById('challenges-list').innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle"></i>
                Erro ao carregar desafios. Tente novamente.
            </div>
        `;
    }
}

/**
 * Renderizar lista de desafios
 */
function renderChallenges(challenges) {
    const container = document.getElementById('challenges-list');

    if (challenges.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-trophy"></i>
                <p>Nenhum desafio encontrado</p>
                <button class="btn btn-primary" id="create-first-challenge">
                    <i class="fas fa-plus"></i> Criar Primeiro Desafio
                </button>
            </div>
        `;

        document.getElementById('create-first-challenge')?.addEventListener('click', openCreateChallengeModal);
        return;
    }

    const html = `
        <div class="challenges-grid">
            ${challenges.map(challenge => renderChallengeCard(challenge)).join('')}
        </div>
    `;

    container.innerHTML = html;

    // Bind event listeners
    challenges.forEach(challenge => {
        const viewBtn = document.getElementById(`view-challenge-${challenge.id}`);
        const cancelBtn = document.getElementById(`cancel-challenge-${challenge.id}`);

        if (viewBtn) {
            viewBtn.addEventListener('click', () => openChallengeResults(challenge.id));
        }

        if (cancelBtn && challenge.can_cancel) {
            cancelBtn.addEventListener('click', () => cancelChallenge(challenge.id));
        }

        // Start countdown if pending
        if (challenge.status === 'pending' && challenge.seconds_until_start > 0) {
            startChallengeCountdown(challenge.id, challenge.seconds_until_start);
        }
    });
}

/**
 * Renderizar card de desafio
 */
function renderChallengeCard(challenge) {
    const statusLabels = {
        'pending': 'Aguardando',
        'active': 'Ativo',
        'completed': 'Concluído',
        'cancelled': 'Cancelado'
    };

    let countdownHtml = '';
    if (challenge.status === 'pending' && challenge.seconds_until_start > 0) {
        countdownHtml = `
            <div class="challenge-countdown" id="countdown-${challenge.id}">
                <i class="fas fa-clock"></i>
                Inicia em: <span id="countdown-text-${challenge.id}">calculando...</span>
            </div>
        `;
    } else if (challenge.status === 'active' && challenge.seconds_until_end > 0) {
        countdownHtml = `
            <div class="challenge-countdown" style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); color: #065f46;">
                <i class="fas fa-hourglass-half"></i>
                Termina em: <span>${formatTime(challenge.seconds_until_end)}</span>
            </div>
        `;
    }

    let actionsHtml = `
        <button class="btn btn-primary btn-sm" id="view-challenge-${challenge.id}">
            <i class="fas fa-chart-bar"></i> Ver Resultados
        </button>
    `;

    if (challenge.can_cancel) {
        actionsHtml += `
            <button class="btn btn-danger btn-sm" id="cancel-challenge-${challenge.id}">
                <i class="fas fa-times"></i> Cancelar
            </button>
        `;
    }

    return `
        <div class="challenge-card status-${challenge.status}">
            <div class="challenge-card-header">
                <div>
                    <div class="challenge-card-title">${escapeHtml(challenge.title)}</div>
                    <small style="color: #6b7280;">
                        <i class="fas fa-gamepad"></i> ${escapeHtml(challenge.game_name)}
                    </small>
                </div>
                <span class="challenge-status-badge ${challenge.status}">${statusLabels[challenge.status]}</span>
            </div>

            <div class="challenge-card-info">
                <div class="challenge-info-item">
                    <i class="fas fa-users"></i>
                    <span>${challenge.type === 'class' ? `Turma: ${escapeHtml(challenge.class_name || 'N/A')}` : 'Desafio Individual'}</span>
                </div>
                <div class="challenge-info-item">
                    <i class="fas fa-clock"></i>
                    <span>Duração: ${challenge.duration_minutes} minutos</span>
                </div>
                <div class="challenge-info-item">
                    <i class="fas fa-calendar"></i>
                    <span>Início: ${challenge.starts_at_formatted}</span>
                </div>
                ${challenge.difficulty ? `
                <div class="challenge-info-item">
                    <i class="fas fa-chart-line"></i>
                    <span>Dificuldade: ${capitalize(challenge.difficulty)}</span>
                </div>
                ` : ''}
            </div>

            ${countdownHtml}

            <div class="challenge-card-stats">
                <div class="challenge-stat">
                    <span class="challenge-stat-value">${challenge.total_participants}</span>
                    <span class="challenge-stat-label">Convidados</span>
                </div>
                <div class="challenge-stat">
                    <span class="challenge-stat-value">${challenge.accepted_count}</span>
                    <span class="challenge-stat-label">Aceitaram</span>
                </div>
                <div class="challenge-stat">
                    <span class="challenge-stat-value">${challenge.completed_count}</span>
                    <span class="challenge-stat-label">Completaram</span>
                </div>
            </div>

            <div class="challenge-card-actions">
                ${actionsHtml}
            </div>
        </div>
    `;
}

/**
 * Countdown para início do desafio
 */
function startChallengeCountdown(challengeId, secondsRemaining) {
    const elem = document.getElementById(`countdown-text-${challengeId}`);
    if (!elem) return;

    // Clear previous interval if exists
    if (challengeCountdownIntervals[challengeId]) {
        clearInterval(challengeCountdownIntervals[challengeId]);
    }

    let remaining = secondsRemaining;

    const update = () => {
        if (remaining <= 0) {
            elem.textContent = 'Iniciando...';
            clearInterval(challengeCountdownIntervals[challengeId]);
            // Reload challenges after a moment
            setTimeout(() => loadChallenges(), 2000);
            return;
        }

        elem.textContent = formatTime(remaining);
        remaining--;
    };

    update(); // Initial update
    challengeCountdownIntervals[challengeId] = setInterval(update, 1000);
}

/**
 * Formatar tempo (segundos -> MM:SS)
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Abrir modal de criar desafio
 */
function openCreateChallengeModal() {
    const modal = document.getElementById('create-challenge-modal');
    modal.classList.add('active');

    // Populate class selects
    populateClassSelects();

    // Reset form
    document.getElementById('create-challenge-form').reset();
    document.getElementById('challenge-type').value = 'class';
    updateChallengeTypeFields();
}

/**
 * Popular selects de turmas no modal de criar desafio
 */
function populateClassSelects() {
    const classSelect = document.getElementById('challenge-class');
    const classFilterSelect = document.getElementById('challenge-class-filter');
    const classForStudentsSelect = document.getElementById('challenge-class-for-students');

    // Opções com turmas que têm alunos
    const options = [
        '<option value="">Selecione uma turma</option>',
        ...allClasses.filter(c => c.student_count > 0).map(c =>
            `<option value="${c.id}">${escapeHtml(c.name)} (${c.student_count} alunos)</option>`
        )
    ].join('');

    // Se não houver turmas com alunos, mostrar mensagem
    if (allClasses.length > 0 && allClasses.filter(c => c.student_count > 0).length === 0) {
        const noStudentsOption = '<option value="">⚠️ Suas turmas não têm alunos ainda</option>';
        if (classSelect) classSelect.innerHTML = noStudentsOption;
        if (classForStudentsSelect) classForStudentsSelect.innerHTML = noStudentsOption;
    } else {
        if (classSelect) classSelect.innerHTML = options;
        if (classForStudentsSelect) classForStudentsSelect.innerHTML = options;
    }

    // Filter select (mostra todas as turmas)
    if (classFilterSelect) {
        classFilterSelect.innerHTML = [
            '<option value="">Todas as turmas</option>',
            ...allClasses.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
        ].join('');
    }
}

/**
 * Atualizar campos do formulário baseado no tipo de desafio
 */
function updateChallengeTypeFields() {
    const type = document.getElementById('challenge-type').value;
    const classGroup = document.getElementById('challenge-class-select-group');
    const studentsGroup = document.getElementById('challenge-students-select-group');

    if (type === 'class') {
        classGroup.style.display = 'block';
        studentsGroup.style.display = 'none';
    } else {
        classGroup.style.display = 'none';
        studentsGroup.style.display = 'block';
    }
}

/**
 * Carregar alunos de uma turma (para desafio individual)
 */
async function loadStudentsForChallenge(classId) {
    try {
        const res = await fetch(`../api/teacher/get_class.php?class_id=${classId}`, { credentials: 'same-origin' });
        const data = await res.json();

        if (!data.ok) {
            console.error('[Challenges] Erro ao carregar alunos:', data.error);
            return;
        }

        const activeStudents = data.students.filter(s => s.status === 'active');
        const container = document.getElementById('challenge-students-checkboxes');

        if (activeStudents.length === 0) {
            container.innerHTML = '<p class="text-muted">Esta turma não tem alunos ativos</p>';
            return;
        }

        container.innerHTML = activeStudents.map(s => `
            <div class="student-checkbox-item">
                <input type="checkbox" id="student-${s.id}" name="students" value="${s.id}">
                <label for="student-${s.id}">${escapeHtml(s.display_name || s.username)}</label>
            </div>
        `).join('');
    } catch (err) {
        console.error('[Challenges] Erro ao carregar alunos:', err);
    }
}

/**
 * Criar desafio
 */
async function createChallenge(formData) {
    try {
        const res = await fetch('../api/teacher/create_challenge.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (!data.ok) {
            alert('Erro ao criar desafio: ' + (data.error || 'Erro desconhecido'));
            return false;
        }

        alert(data.message || 'Desafio criado com sucesso!');

        // Close modal
        document.getElementById('create-challenge-modal').classList.remove('active');

        // Reload challenges
        await loadChallenges();

        return true;
    } catch (err) {
        console.error('[Challenges] Erro ao criar desafio:', err);
        alert('Erro ao criar desafio. Tente novamente.');
        return false;
    }
}

/**
 * Cancelar desafio
 */
async function cancelChallenge(challengeId) {
    if (!confirm('Tem certeza que deseja cancelar este desafio?')) {
        return;
    }

    try {
        const res = await fetch('../api/teacher/cancel_challenge.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challenge_id: challengeId })
        });

        const data = await res.json();

        if (!data.ok) {
            alert('Erro ao cancelar desafio: ' + (data.error || 'Erro desconhecido'));
            return;
        }

        alert('Desafio cancelado com sucesso!');
        await loadChallenges();
    } catch (err) {
        console.error('[Challenges] Erro ao cancelar desafio:', err);
        alert('Erro ao cancelar desafio. Tente novamente.');
    }
}

/**
 * Abrir modal de resultados do desafio
 */
async function openChallengeResults(challengeId) {
    const modal = document.getElementById('challenge-results-modal');
    modal.classList.add('active');

    // Load leaderboard
    await loadChallengeLeaderboard(challengeId);
}

/**
 * Carregar placar de resultados
 */
async function loadChallengeLeaderboard(challengeId) {
    try {
        const res = await fetch(`../api/teacher/challenge_leaderboard.php?challenge_id=${challengeId}`, {
            credentials: 'same-origin'
        });

        const data = await res.json();

        if (!data.ok) {
            alert('Erro ao carregar resultados: ' + (data.error || 'Erro desconhecido'));
            return;
        }

        renderChallengeResults(data);
    } catch (err) {
        console.error('[Challenges] Erro ao carregar resultados:', err);
        alert('Erro ao carregar resultados. Tente novamente.');
    }
}

/**
 * Renderizar resultados do desafio
 */
function renderChallengeResults(data) {
    const { challenge, leaderboard, stats } = data;

    // Update title
    document.getElementById('challenge-results-title').textContent = challenge.title;
    document.getElementById('challenge-results-subtitle').textContent = `${challenge.game_name} • ${challenge.starts_at_formatted}`;

    // Render challenge info
    const statusLabels = {
        'pending': 'Aguardando Início',
        'active': 'Em Andamento',
        'completed': 'Finalizado',
        'cancelled': 'Cancelado'
    };

    document.getElementById('challenge-info').innerHTML = `
        <div class="challenge-info-grid">
            <div class="challenge-info-item">
                <i class="fas fa-info-circle"></i>
                <div class="challenge-info-text">
                    <span class="challenge-info-label">Status</span>
                    <span class="challenge-info-value">${statusLabels[challenge.status]}</span>
                </div>
            </div>
            <div class="challenge-info-item">
                <i class="fas fa-clock"></i>
                <div class="challenge-info-text">
                    <span class="challenge-info-label">Duração</span>
                    <span class="challenge-info-value">${challenge.duration_minutes} min</span>
                </div>
            </div>
            <div class="challenge-info-item">
                <i class="fas fa-calendar"></i>
                <div class="challenge-info-text">
                    <span class="challenge-info-label">Término</span>
                    <span class="challenge-info-value">${challenge.ends_at_formatted}</span>
                </div>
            </div>
            ${challenge.difficulty ? `
            <div class="challenge-info-item">
                <i class="fas fa-chart-line"></i>
                <div class="challenge-info-text">
                    <span class="challenge-info-label">Dificuldade</span>
                    <span class="challenge-info-value">${capitalize(challenge.difficulty)}</span>
                </div>
            </div>
            ` : ''}
        </div>
    `;

    // Render stats
    document.getElementById('challenge-stats').innerHTML = `
        <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div class="stat-value">${stats.total_invited}</div>
            <div class="stat-label">Convidados</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
            <div class="stat-value">${stats.total_accepted}</div>
            <div class="stat-label">Aceitaram (${stats.participation_rate}%)</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
            <div class="stat-value">${stats.total_completed}</div>
            <div class="stat-label">Completaram (${stats.completion_rate}%)</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
            <div class="stat-value">${stats.avg_score > 0 ? Math.round(stats.avg_score) : '-'}</div>
            <div class="stat-label">Pontuação Média</div>
        </div>
    `;

    // Render leaderboard
    const leaderboardHtml = `
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Aluno</th>
                    <th>Pontuação</th>
                    <th>Tempo</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${leaderboard.map(p => renderLeaderboardRow(p)).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('challenge-leaderboard').innerHTML = leaderboardHtml;
}

/**
 * Renderizar linha da tabela de resultados
 */
function renderLeaderboardRow(participant) {
    let rankClass = 'rank-other';
    if (participant.rank === 1) rankClass = 'rank-1';
    else if (participant.rank === 2) rankClass = 'rank-2';
    else if (participant.rank === 3) rankClass = 'rank-3';

    const initial = (participant.display_name || participant.username).charAt(0).toUpperCase();

    return `
        <tr>
            <td>
                ${participant.rank ? `<span class="leaderboard-rank ${rankClass}">${participant.rank}</span>` : '-'}
            </td>
            <td>
                <div class="leaderboard-player">
                    <div class="leaderboard-avatar">${initial}</div>
                    <span>${escapeHtml(participant.display_name)}</span>
                </div>
            </td>
            <td><strong>${participant.score !== null ? participant.score : '-'}</strong></td>
            <td>${participant.duration_formatted || '-'}</td>
            <td><span class="leaderboard-status ${participant.status}">${participant.status_label}</span></td>
        </tr>
    `;
}

/**
 * Event Listeners - Challenges
 */

// Abrir modal de criar desafio
document.getElementById('create-challenge-btn')?.addEventListener('click', openCreateChallengeModal);

// Fechar modal de criar desafio
document.getElementById('close-create-challenge-modal')?.addEventListener('click', () => {
    document.getElementById('create-challenge-modal').classList.remove('active');
});

document.getElementById('cancel-create-challenge')?.addEventListener('click', () => {
    document.getElementById('create-challenge-modal').classList.remove('active');
});

// Fechar modal de resultados
document.getElementById('close-challenge-results-modal')?.addEventListener('click', () => {
    document.getElementById('challenge-results-modal').classList.remove('active');
});

// Trocar tipo de desafio
document.getElementById('challenge-type')?.addEventListener('change', updateChallengeTypeFields);

// Carregar alunos quando selecionar turma (desafio individual)
document.getElementById('challenge-class-for-students')?.addEventListener('change', (e) => {
    const classId = e.target.value;
    if (classId) {
        loadStudentsForChallenge(classId);
    } else {
        document.getElementById('challenge-students-checkboxes').innerHTML = '<p class="text-muted">Selecione uma turma para ver os alunos</p>';
    }
});

// Submit form de criar desafio
document.getElementById('create-challenge-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        title: document.getElementById('challenge-title').value.trim(),
        description: document.getElementById('challenge-description').value.trim() || null,
        game_id: parseInt(document.getElementById('challenge-game').value),
        difficulty: document.getElementById('challenge-difficulty').value || null,
        type: document.getElementById('challenge-type').value,
        duration_minutes: parseInt(document.getElementById('challenge-duration').value)
    };

    if (formData.type === 'class') {
        formData.class_id = parseInt(document.getElementById('challenge-class').value);

        if (!formData.class_id) {
            alert('Por favor, selecione uma turma');
            return;
        }
    } else {
        // Individual challenge - get selected students
        const checkboxes = document.querySelectorAll('#challenge-students-checkboxes input[type="checkbox"]:checked');
        formData.student_ids = Array.from(checkboxes).map(cb => parseInt(cb.value));

        if (formData.student_ids.length === 0) {
            alert('Por favor, selecione pelo menos um aluno');
            return;
        }
    }

    // Show loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';

    await createChallenge(formData);

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
});

// Filtros de desafios
document.getElementById('challenge-status-filter')?.addEventListener('change', (e) => {
    const statusFilter = e.target.value;
    const classFilter = document.getElementById('challenge-class-filter').value;
    loadChallenges(statusFilter, classFilter);
});

document.getElementById('challenge-class-filter')?.addEventListener('change', (e) => {
    const classFilter = e.target.value;
    const statusFilter = document.getElementById('challenge-status-filter').value;
    loadChallenges(statusFilter, classFilter);
});

// Refresh challenges
document.getElementById('refresh-challenges')?.addEventListener('click', () => loadChallenges());

/**
 * Inicialização
 */
(async function init() {
    const isTeacher = await checkTeacher();
    if (!isTeacher) return;

    await loadClasses();
    await loadChallenges();

    console.log('[Teacher] Dashboard inicializado');
})();
