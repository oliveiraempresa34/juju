// Simple UI sound effects using Web Audio API
class SoundEffects {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API não suportado');
        this.enabled = false;
      }
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) {
    if (!this.enabled || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      console.warn('Erro ao reproduzir som:', e);
    }
  }

  // Click normal - som mais grave e opaco
  click() {
    this.playTone(300, 0.08, 'triangle', 0.08);
  }

  // Hover
  hover() {
    this.playTone(600, 0.03, 'sine', 0.05);
  }

  // Sucesso
  success() {
    if (!this.enabled || !this.audioContext) return;
    this.playTone(523, 0.08, 'sine', 0.1);
    setTimeout(() => this.playTone(659, 0.12, 'sine', 0.1), 80);
  }

  // Erro
  error() {
    if (!this.enabled || !this.audioContext) return;
    this.playTone(200, 0.1, 'square', 0.08);
    setTimeout(() => this.playTone(150, 0.15, 'square', 0.08), 100);
  }

  // Notificação
  notification() {
    if (!this.enabled || !this.audioContext) return;
    this.playTone(880, 0.08, 'sine', 0.08);
    setTimeout(() => this.playTone(1047, 0.08, 'sine', 0.08), 100);
  }

  // Abertura de modal/painel
  open() {
    this.playTone(440, 0.06, 'sine', 0.06);
    setTimeout(() => this.playTone(554, 0.06, 'sine', 0.06), 60);
  }

  // Fechamento de modal/painel
  close() {
    this.playTone(554, 0.06, 'sine', 0.06);
    setTimeout(() => this.playTone(440, 0.06, 'sine', 0.06), 60);
  }

  // Habilitar/desabilitar sons
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

export const soundEffects = new SoundEffects();
