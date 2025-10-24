/**
 * AudioManager - Gerenciador de sons para os jogos SavePoint
 * Controla volume, mute e carregamento de sons
 */

class AudioManager {
  constructor() {
    this.sounds = {};
    this.volume = this.loadVolume();
    this.muted = this.loadMuteState();
  }

  /**
   * Carregar um som
   * @param {string} name - Nome identificador do som
   * @param {string} path - Caminho do arquivo de áudio
   */
  loadSound(name, path) {
    try {
      this.sounds[name] = new Audio(path);
      this.sounds[name].volume = this.volume;
      this.sounds[name].preload = 'auto';
    } catch (err) {
      console.warn(`Erro ao carregar som "${name}":`, err);
    }
  }

  /**
   * Tocar um som
   * @param {string} name - Nome do som a tocar
   */
  play(name) {
    if (this.muted || !this.sounds[name]) {
      return;
    }

    try {
      const sound = this.sounds[name];
      sound.currentTime = 0; // Reinicia o som
      sound.play().catch(err => {
        // Silencioso - navegadores podem bloquear autoplay
        console.debug(`Áudio "${name}" não pôde ser reproduzido:`, err.message);
      });
    } catch (err) {
      console.warn(`Erro ao tocar som "${name}":`, err);
    }
  }

  /**
   * Definir volume (0.0 a 1.0)
   * @param {number} value - Volume entre 0 e 1
   */
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));

    // Atualizar volume de todos os sons carregados
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.volume;
    });

    // Salvar no localStorage
    localStorage.setItem('sp_audio_volume', this.volume.toString());
  }

  /**
   * Alternar mute/unmute
   * @returns {boolean} Novo estado (true = muted, false = unmuted)
   */
  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('sp_audio_muted', this.muted.toString());
    return this.muted;
  }

  /**
   * Definir mute manualmente
   * @param {boolean} value - true para mutar, false para desmutar
   */
  setMuted(value) {
    this.muted = Boolean(value);
    localStorage.setItem('sp_audio_muted', this.muted.toString());
  }

  /**
   * Obter estado atual do mute
   * @returns {boolean}
   */
  isMuted() {
    return this.muted;
  }

  /**
   * Obter volume atual
   * @returns {number}
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Carregar volume salvo do localStorage
   * @returns {number}
   */
  loadVolume() {
    const saved = localStorage.getItem('sp_audio_volume');
    return saved ? parseFloat(saved) : 0.7; // Default 70%
  }

  /**
   * Carregar estado de mute do localStorage
   * @returns {boolean}
   */
  loadMuteState() {
    const saved = localStorage.getItem('sp_audio_muted');
    return saved === 'true';
  }

  /**
   * Parar todos os sons
   */
  stopAll() {
    Object.values(this.sounds).forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
  }

  /**
   * Parar um som específico
   * @param {string} name - Nome do som
   */
  stop(name) {
    if (this.sounds[name]) {
      this.sounds[name].pause();
      this.sounds[name].currentTime = 0;
    }
  }
}
